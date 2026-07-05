import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { findFlips, lastQuota } from './flipFinder.js';

const app = express();
const PORT = 3001;

app.use(cors({ origin: 'http://localhost:3000' }));
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

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

const server = app.listen(PORT, () =>
  console.log(`Stackd API running on http://localhost:${PORT}`)
);

server.keepAliveTimeout = 120000;
server.headersTimeout = 125000;
