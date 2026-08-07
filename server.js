import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findFlips, lastQuota } from './flipFinder.js';
import { stripe, getUserFromToken, getOrCreateCustomer, syncSubscriptionToProfile, priceForPlan, billingConfig } from './subscriptions.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;   // hosts (Render, etc.) inject PORT

// In production the frontend is served same-origin, so CORS isn't needed; in dev
// the Vite server on :3000 calls the API cross-origin.
app.use(cors({ origin: process.env.NODE_ENV === 'production' ? true : 'http://localhost:3000' }));
app.set('trust proxy', 1);   // correct client IPs behind the host's proxy (rate limits)

// ── Stripe webhook ── MUST come before express.json(): Stripe signs the RAW
// body, so it can't be pre-parsed. This is how "someone paid" reaches our DB.
app.post('/api/stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('[Stripe] webhook signature failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  try {
    if (event.type === 'checkout.session.completed') {
      const s = event.data.object;
      if (s.subscription) await syncSubscriptionToProfile(await stripe.subscriptions.retrieve(s.subscription));
    } else if (event.type.startsWith('customer.subscription.')) {
      await syncSubscriptionToProfile(event.data.object);
    }
    res.json({ received: true });
  } catch (err) {
    console.error('[Stripe] webhook handler error:', err.message);
    res.status(500).json({ error: err.message });
  }
});
app.use(express.json({ limit: '10kb' })); // reject oversized payloads

// ── Rate limiters ──────────────────────────────────────────────
// Flip scan: max 5 per 15 min per IP — prevents API bill attacks
const flipLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many scans — wait 15 minutes and try again.' },
});

// General API: 60 req/min per IP
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests.' },
});

app.use('/api/', generalLimiter);

// ── Global daily scan cap ──────────────────────────────────────
// Per-IP limits don't stop many different visitors from collectively burning
// the API budget. This is a hard ceiling on TOTAL scans/day across everyone —
// a cost circuit-breaker. Resets at UTC midnight; also resets on restart.
// Tune with env DAILY_SCAN_LIMIT (default 100).
const DAILY_SCAN_LIMIT = Number(process.env.DAILY_SCAN_LIMIT) || 100;
let scanDay = new Date().getUTCDate();
let scanCount = 0;
function underDailyCap() {
  const today = new Date().getUTCDate();
  if (today !== scanDay) { scanDay = today; scanCount = 0; }   // new day → reset
  if (scanCount >= DAILY_SCAN_LIMIT) return false;
  scanCount++;
  return true;
}

// ── Input validation ───────────────────────────────────────────
const VALID_CATEGORIES = ['Sneakers','Streetwear','Electronics','Sports Cards','Video Games','Vintage','Watches','Trading Cards'];
const VALID_PLATFORMS  = ['eBay','Facebook Marketplace','StockX','Depop','Poshmark'];

function validateFlipRequest(body) {
  const { categories = [], maxBudget = 100, platforms = [], sizes = [] } = body;

  if (!Array.isArray(categories) || categories.some(c => !VALID_CATEGORIES.includes(c)))
    return 'Invalid categories';
  if (typeof maxBudget !== 'number' || maxBudget < 10 || maxBudget > 2000)
    return 'Budget must be between $10 and $2000';
  if (!Array.isArray(platforms) || platforms.some(p => !VALID_PLATFORMS.includes(p)))
    return 'Invalid platforms';
  if (!Array.isArray(sizes) || sizes.length > 10)
    return 'Invalid sizes';

  return null; // valid
}

/* ── Flip scan ── */
app.post('/api/flips', flipLimiter, async (req, res) => {
  req.setTimeout(120000);
  res.setTimeout(120000);

  const validationError = validateFlipRequest(req.body);
  if (validationError) return res.status(400).json({ error: validationError });

  // Cost circuit-breaker: hard stop once the whole site hits its daily budget.
  if (!underDailyCap()) {
    console.warn(`[Stackd] 🛑 Global daily scan cap (${DAILY_SCAN_LIMIT}) reached — blocking scans until UTC midnight`);
    return res.status(429).json({ error: 'Stackd hit its daily scan limit — check back tomorrow!' });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set in environment' });
  }

  const { categories = [], maxBudget = 100, platforms = [], sizes = [] } = req.body;
  console.log(`[Stackd] Scanning: ${categories.join(', ')} | budget $${maxBudget} | ${platforms.join(', ')}${sizes.length ? ` | sizes ${sizes.join(', ')}` : ''}`);

  try {
    const flips = await findFlips(categories, maxBudget, platforms, sizes);
    console.log(`[Stackd] Found ${flips.length} flips`);
    if (lastQuota.sneaker !== null && lastQuota.sneaker <= 5) {
      console.warn(`[Stackd] ⚠️ Sneaker API quota low: ${lastQuota.sneaker} left`);
    }
    res.json({ flips, quota: lastQuota });
  } catch (err) {
    console.error('[Stackd] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ── Stripe: start a subscription checkout (web only) ──
   The logged-in app sends its Supabase token; we tie the Stripe subscription to
   that user so the webhook can unlock Pro for them. */
app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const user = await getUserFromToken(req.headers.authorization);
    if (!user) return res.status(401).json({ error: 'Please log in first.' });

    const price = priceForPlan(req.body?.plan);
    if (!price) return res.status(400).json({ error: 'Unknown plan.' });

    const customer = await getOrCreateCustomer(user);
    const APP_URL = process.env.APP_URL || 'https://stackd-ypim.onrender.com';
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer,
      line_items: [{ price, quantity: 1 }],
      allow_promotion_codes: true,
      metadata: { supabase_user_id: user.id, plan: req.body.plan },
      success_url: `${APP_URL}/success?session_id={CHECKOUT_SESSION_ID}&plan=${req.body.plan}`,
      cancel_url: `${APP_URL}/cancel`,
    });
    res.json({ url: session.url });
  } catch (err) {
    console.error('[Stripe] checkout error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ── Stripe: confirm a completed checkout (used by the success screen) ── */
app.get('/api/verify-session', async (req, res) => {
  try {
    if (!req.query.session_id) return res.status(400).json({ error: 'Missing session_id' });
    const session = await stripe.checkout.sessions.retrieve(req.query.session_id);
    res.json({ paid: session.payment_status === 'paid', plan: session.metadata?.plan || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── Product image proxy (bypasses hotlink/CORS block) ──
   Each item has a fallback chain — first upstream that returns
   200 wins and is cached in memory. */
const SX = '?fit=fill&bg=FFFFFF&w=700&h=500&fm=webp&auto=compress&q=90&dpr=2&trim=color';
const PRODUCT_IMAGES = {
  jordan: [
    `https://images.stockx.com/images/Air-Jordan-1-Retro-High-OG-Chicago-2015.jpg${SX}`,
    `https://images.stockx.com/images/Air-Jordan-1-Retro-High-OG-Chicago-Lost-and-Found.jpg${SX}`,
    'https://upload.wikimedia.org/wikipedia/commons/thumb/6/62/2023_Buty_Nike_Air_Jordan.jpg/960px-2023_Buty_Nike_Air_Jordan.jpg',
  ],
  rolex: [
    'https://content.rolex.com/dam/2022/upright-bba-with-shadow/m126610ln-0001.png',
    `https://images.stockx.com/images/Rolex-Submariner-Date-116610LN.jpg${SX}`,
  ],
  supreme: [
    `https://images.stockx.com/images/Supreme-Box-Logo-Hooded-Sweatshirt-FW23-Black.jpg${SX}`,
  ],
  dunk: [
    `https://images.stockx.com/images/Nike-Dunk-Low-Retro-White-Black-2021-Product.jpg${SX}`,
    `https://images.stockx.com/images/Nike-Dunk-Low-Retro-White-Black-2021.jpg${SX}`,
  ],
};

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
  'Referer': 'https://stockx.com/',
  'Accept': 'image/avif,image/webp,image/*,*/*;q=0.8',
};

const imageCache = {};

app.get('/api/product-image/:item', async (req, res) => {
  const chain = PRODUCT_IMAGES[req.params.item];
  if (!chain) return res.status(404).send('Unknown item');

  if (imageCache[req.params.item]) {
    res.set('Content-Type', imageCache[req.params.item].type);
    res.set('Cache-Control', 'public, max-age=86400');
    res.set('Access-Control-Allow-Origin', '*');
    return res.send(imageCache[req.params.item].buf);
  }

  for (const url of chain) {
    try {
      const r = await fetch(url, { headers: FETCH_HEADERS });
      if (!r.ok) continue;
      const type = r.headers.get('content-type') || 'image/webp';
      if (!type.startsWith('image/')) continue;
      const buf = Buffer.from(await r.arrayBuffer());
      imageCache[req.params.item] = { buf, type };
      res.set('Content-Type', type);
      res.set('Cache-Control', 'public, max-age=86400');
      res.set('Access-Control-Allow-Origin', '*');
      return res.send(buf);
    } catch { /* try next in chain */ }
  }
  console.error(`[Stackd] Image proxy: all upstreams failed for ${req.params.item}`);
  res.status(502).send('Image unavailable');
});

app.get('/api/health', (_req, res) => res.json({ status: 'ok', billing: billingConfig, supabase: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY), webhook: Boolean(process.env.STRIPE_WEBHOOK_SECRET) }));

// ── Serve the built React frontend (production) ────────────────
// Everything that isn't an /api route falls through to the SPA so the domain
// serves the app itself, same-origin (no CORS, relative /api calls just work).
const clientDist = path.join(__dirname, 'client', 'dist');
app.use(express.static(clientDist));
app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));

const server = app.listen(PORT, () =>
  console.log(`Stackd API running on http://localhost:${PORT}`)
);

server.keepAliveTimeout = 120000;
server.headersTimeout = 125000;
