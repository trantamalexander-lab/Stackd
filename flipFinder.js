import 'dotenv/config';
import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';

const client = new Anthropic();

// ── CONFIG ────────────────────────────────────────────────────
const CACHE_FILE     = './cache.json';
const CACHE_MAX_HOURS = 24;
const MIN_MARGIN     = 15;   // lenient — we'd rather return 3 modest flips than 0
const MIN_PROFIT     = 10;

function log(msg) {
  console.log(`[${new Date().toLocaleTimeString()}] ${msg}`);
}

// ── CACHE ─────────────────────────────────────────────────────
function cacheKey(cats, budget, plats, sizes = []) {
  return `${[...cats].sort().join(',')}|${budget}|${[...plats].sort().join(',')}|${[...sizes].sort().join(',')}`;
}
function readCache() {
  try { return fs.existsSync(CACHE_FILE) ? JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')) : {}; }
  catch { return {}; }
}
function writeCache(key, data) {
  try {
    const c = readCache();
    c[key] = { data, ts: Date.now() };
    fs.writeFileSync(CACHE_FILE, JSON.stringify(c, null, 2));
  } catch {}
}
function getCached(key) {
  const entry = readCache()[key];
  if (!entry) return null;
  if ((Date.now() - entry.ts) / 36e5 > CACHE_MAX_HOURS) return null;
  log('📦 Cache hit — free run');
  return entry.data;
}

// ── EBAY AUTH ─────────────────────────────────────────────────
let _token = null;
let _tokenExp = 0;

async function getEbayToken() {
  if (_token && Date.now() < _tokenExp) return _token;

  const creds = Buffer.from(
    `${process.env.EBAY_CLIENT_ID}:${process.env.EBAY_CLIENT_SECRET}`
  ).toString('base64');

  const res = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${creds}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials&scope=https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope',
  });

  const data = await res.json();
  if (!data.access_token) throw new Error(`eBay auth failed: ${JSON.stringify(data)}`);

  _token    = data.access_token;
  _tokenExp = Date.now() + (data.expires_in - 300) * 1000;
  log('🔑 eBay token refreshed');
  return _token;
}

// ── SIZE MATCHING ─────────────────────────────────────────────
// Resale value swings hard on sneaker size, so when the user picks sizes we
// both bias the eBay query and post-filter listings whose title names a size.
// We require a size keyword (size/sz/us) OR a decimal (e.g. "10.5") to avoid
// matching stray numbers like a year ("2010") or a model number.
function titleMatchesSize(title, sizes) {
  if (!sizes.length) return true;
  const t = title.toLowerCase();
  return sizes.some(s => {
    const esc = s.replace('.', '\\.');
    const keyword = new RegExp(`\\b(?:size|sz|us)\\s*${esc}\\b`, 'i');
    if (keyword.test(t)) return true;
    if (s.includes('.')) return new RegExp(`\\b${esc}\\b`).test(t); // bare decimal is safe
    return false;
  });
}

// ── EBAY BROWSE API ───────────────────────────────────────────
async function searchEbay(query, maxPrice, limit = 12, sizes = []) {
  const token    = await getEbayToken();
  const minPrice = Math.max(5, Math.floor(maxPrice * 0.2));

  // Single size → bake it into the query so eBay ranks size-matched listings
  // first. Multiple sizes stay broad and are narrowed by the post-filter below.
  const q = sizes.length === 1 ? `${query} size ${sizes[0]}` : query;

  const params = new URLSearchParams({
    q,
    filter:      `price:[${minPrice}..${maxPrice}],buyingOptions:{FIXED_PRICE}`,
    sort:        'price',
    limit:       String(limit),
  });

  const res = await fetch(
    `https://api.ebay.com/buy/browse/v1/item_summary/search?${params}`,
    {
      headers: {
        Authorization:             `Bearer ${token}`,
        'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
      },
    }
  );

  if (!res.ok) {
    log(`   ⚠️ eBay ${res.status} on "${query}"`);
    return [];
  }

  const data  = await res.json();
  let items   = data.itemSummaries || [];

  // Narrow to size-matched listings; fall back to all if nothing matches so a
  // strict filter never wipes out an otherwise-good target.
  if (sizes.length) {
    const matched = items.filter(it => titleMatchesSize(it.title || '', sizes));
    if (matched.length) {
      items = matched;
    } else {
      log(`   ⚠️ No listings matched sizes ${sizes.join('/')} — showing all`);
    }
  }
  log(`   📦 eBay: ${items.length} listings for "${query}"${sizes.length ? ` (sizes ${sizes.join('/')})` : ''}`);

  return items.map(item => {
    const shipCost = item.shippingOptions?.[0]?.shippingCost?.value;
    return {
      title:         item.title,
      price:         parseFloat(item.price?.value || 0),
      url:           item.itemWebUrl,
      condition:     item.condition || 'Used',
      sellerName:    item.seller?.username || 'unknown',
      sellerRating:  `${item.seller?.feedbackPercentage ?? '?'}%`,
      sellerScore:   parseInt(item.seller?.feedbackScore || 0),
      shipping:      (!shipCost || shipCost === '0.00') ? 'Free' : `$${shipCost}`,
      itemId:        item.itemId,
    };
  });
}

// ── EBAY LIVE-LISTING CHECK (#3) ──────────────────────────────
// Good flips sell in minutes — by the time a user clicks, the listing may be
// gone. Re-validate via the Browse getItem endpoint (free, no quota) so we never
// hand someone a dead link. Returns true only if the item is still purchasable.
async function verifyEbayLive(itemId) {
  if (!itemId) return false;
  try {
    const token = await getEbayToken();
    const res = await fetch(`https://api.ebay.com/buy/browse/v1/item/${encodeURIComponent(itemId)}`, {
      headers: { Authorization: `Bearer ${token}`, 'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US' },
    });
    if (!res.ok) return false;                                    // 404 = ended/removed
    const d = await res.json();
    if (d.itemEndDate && new Date(d.itemEndDate) < new Date()) return false;
    const avail = d.estimatedAvailabilities?.[0]?.estimatedAvailabilityStatus;
    if (avail && avail === 'OUT_OF_STOCK') return false;
    return true;
  } catch { return false; }
}

// ── SERPAPI SOLD COMPS ────────────────────────────────────────
// eBay sold/completed listings carry the subtitle "US M 10 · Nike · ..." —
// the most reliable size signal we get, so we match sizes off it.
function subtitleSize(subtitle = '') {
  const m = subtitle.match(/US\s+(M|W|Y|GS|Kids)\s*(\d+(?:\.5)?)/i);
  return m ? `${m[1].toUpperCase()} ${m[2]}` : null;
}
function subtitleMatchesSize(subtitle = '', sizes) {
  if (!sizes.length) return true;
  // Treat the user's numbers as US men's sizes.
  return sizes.some(s => new RegExp(`US\\s+M\\s*${s.replace('.', '\\.')}\\b`, 'i').test(subtitle));
}

// Real, deterministic stats from actual sold prices — never LLM-generated.
function computeCompStats(comps) {
  const prices = comps.map(c => c.soldPrice).filter(p => p > 5).sort((a, b) => a - b);
  if (!prices.length) return null;
  const mid    = Math.floor(prices.length / 2);
  const median = prices.length % 2 ? prices[mid] : Math.round((prices[mid - 1] + prices[mid]) / 2);
  return {
    count:  prices.length,
    median: Math.round(median),
    low:    Math.round(prices[0]),
    high:   Math.round(prices[prices.length - 1]),
  };
}

// Returns { comps, stats } where comps are REAL sold listings (price, condition,
// size, link) pulled live, and stats are computed from those real prices.
// Note: eBay/SerpAPI does not expose a per-sale date, so we label recency by the
// completed-listings window (last ~90 days) rather than inventing dates.
async function getSoldComps(query, sizes = []) {
  if (!process.env.SERPAPI_KEY) return { comps: [], stats: null };
  try {
    const p = new URLSearchParams({
      engine:      'ebay',
      _nkw:        sizes.length === 1 ? `${query} size ${sizes[0]}` : query,
      LH_Sold:     '1',
      LH_Complete: '1',
      api_key:     process.env.SERPAPI_KEY,
    });
    const res  = await fetch(`https://serpapi.com/search?${p}`);
    const data = await res.json();

    let raw = (data.organic_results || []).filter(it => parseFloat(it.price?.extracted || 0) > 5);

    // Narrow to size-matched sold listings; only keep the filter if it leaves
    // enough comps to be statistically meaningful, else fall back to all.
    if (sizes.length) {
      const matched = raw.filter(it => subtitleMatchesSize(it.subtitle || '', sizes));
      if (matched.length >= 3) raw = matched;
    }

    const comps = raw.slice(0, 12).map(it => ({
      title:     it.title,
      soldPrice: Math.round(parseFloat(it.price.extracted)),
      condition: it.condition || 'Unspecified',
      size:      subtitleSize(it.subtitle || ''),
      url:       it.link,
    }));

    const stats = computeCompStats(comps);
    log(`   📊 Sold comps: ${comps.length} real sales${stats ? ` | median $${stats.median} (range $${stats.low}–$${stats.high})` : ''}`);
    return { comps, stats };
  } catch (err) {
    log(`   ⚠️ SerpAPI: ${err.message}`);
    return { comps: [], stats: null };
  }
}

// ── RAPIDAPI: SNEAKER MARKET PRICE (StockX/GOAT) ──────────────
// Sneaker resale value is best taken from StockX/GOAT, not eBay. We use the
// "Sneaker Database - StockX" RapidAPI product-price endpoint, which returns
// lowestResellPrice + per-size StockX prices. The free plan is only ~40
// req/month, so we cache aggressively and self-gate on styleId (Claude supplies
// the official SKU, so non-sneakers never trigger an API call).
const PRICE_CACHE_FILE  = './price-cache.json';
const PRICE_CACHE_HOURS = 12;
function readPriceCache() { try { return fs.existsSync(PRICE_CACHE_FILE) ? JSON.parse(fs.readFileSync(PRICE_CACHE_FILE, 'utf8')) : {}; } catch { return {}; } }
function getPriceCached(k) { const e = readPriceCache()[k]; if (!e) return null; if ((Date.now() - e.ts) / 36e5 > PRICE_CACHE_HOURS) return null; return e.data; }
function writePriceCache(k, data) { try { const c = readPriceCache(); c[k] = { data, ts: Date.now() }; fs.writeFileSync(PRICE_CACHE_FILE, JSON.stringify(c, null, 2)); } catch {} }

// Surfaced so the API layer can warn the user when quota is nearly gone.
export let lastQuota = { sneaker: null, pricecharting: null };

// ── MATCHING / CONDITION HELPERS ──────────────────────────────
// Used to (1) verify a Claude-supplied SKU actually maps to the target shoe, and
// (2) recognise a used buy listing so we don't price it at deadstock value.
const USED_DISCOUNT = 0.78;   // a used pair realistically sells ~22% below deadstock
const NAME_STOP = new Set(['the','retro','high','low','mid','og','mens','womens','men','women','shoe','shoes','sneaker','sneakers','us','size','new','pair','adidas','nike','jordan','air']);
function nameTokens(s) {
  return [...new Set((s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(t => t && !NAME_STOP.has(t)))];
}
// Lenient: true when two product names share enough distinctive tokens. Returns
// true when we can't judge (empty tokens) so we never block on missing data.
function nameMatch(a, b) {
  const ta = nameTokens(a), tb = nameTokens(b);
  if (!ta.length || !tb.length) return true;
  const shared = ta.filter(t => tb.includes(t)).length;
  return shared >= 2 && shared / Math.min(ta.length, tb.length) >= 0.34;
}
function isUsedCondition(c = '') {
  return /pre-?owned|used|fair|acceptable/i.test(c) && !/new/i.test(c);
}

async function getSneakerPrice(styleId, sizes = [], expectedName = '') {
  if (!styleId || !process.env.RAPIDAPI_KEY) return null;   // self-gates: no SKU → no call
  const host = process.env.SNEAKER_API_HOST || 'sneaker-database-stockx.p.rapidapi.com';
  const size = sizes.length === 1 ? String(sizes[0]) : null;
  const cacheK = `sneaker|${styleId}|${size || 'any'}`;

  const cached = getPriceCached(cacheK);
  if (cached) { log(`   💾 StockX price cache hit (${styleId})`); return cached; }

  try {
    const res = await fetch(`https://${host}/productprice?styleId=${encodeURIComponent(styleId)}`, {
      headers: { 'x-rapidapi-host': host, 'x-rapidapi-key': process.env.RAPIDAPI_KEY },
    });
    const remaining = res.headers.get('x-ratelimit-requests-remaining');
    if (remaining !== null) {
      lastQuota.sneaker = Number(remaining);
      log(`   🎟️ Sneaker API quota: ${remaining} left`);
      if (Number(remaining) <= 5) log(`   ⚠️ LOW SNEAKER API QUOTA (${remaining} left) — top up the RapidAPI plan`);
    }
    if (!res.ok) { log(`   ⚠️ Sneaker API ${res.status} for ${styleId} — falling back to eBay comps`); return null; }

    const d  = await res.json();

    // #1 SKU-MATCH GUARD: a hallucinated/wrong SKU returns a real price for the
    // WRONG shoe. Reject if the API's shoeName doesn't match the target name, so
    // we fall back to eBay comps rather than attach a confidently-wrong price.
    if (expectedName && d.shoeName && !nameMatch(expectedName, d.shoeName)) {
      log(`   ⚠️ SKU ${styleId} → "${d.shoeName}" ≠ target "${expectedName}" — rejecting, falling back to eBay comps`);
      return null;
    }

    const lr = d.lowestResellPrice || {};
    const perSize = size ? d.resellPrices?.stockX?.[size] : null;
    const stockX  = perSize || lr.stockX || null;
    const sellPrice = stockX || lr.goat || null;
    if (!sellPrice) { log(`   ⚠️ Sneaker API: no resale price for ${styleId}`); return null; }

    const data = {
      source:      perSize ? `StockX · size ${size}` : 'StockX (lowest ask)',
      sellPrice:   Math.round(sellPrice),
      stockX:      lr.stockX ?? null,
      goat:        lr.goat ?? null,
      perSize:     perSize ?? null,
      size:        size,
      lastSale:    d.lastSale ?? null,
      lowestAsk:   d.lowestAsk ?? null,
      retailPrice: d.retailPrice ?? null,
      shoeName:    d.shoeName ?? null,
      colorway:    d.colorway ?? null,
      styleId,
      links:       d.resellLinks || {},
    };
    writePriceCache(cacheK, data);
    log(`   👟 StockX $${data.stockX ?? '?'} | GOAT $${data.goat ?? '?'}${perSize ? ` | size ${size}: $${perSize}` : ''} (${styleId})`);
    return data;
  } catch (err) {
    log(`   ⚠️ Sneaker API: ${err.message} — falling back to eBay comps`);
    return null;
  }
}

// ── RAPIDAPI: CARD / GAME MARKET PRICE (PriceCharting) ────────
// PriceCharting's RapidAPI exposes ONLY url-based endpoints (no search), and as
// of 2026-06-14 the product endpoint returns no data even for its own documented
// example — i.e. it's broken upstream. So this path is DISABLED by default
// (set PRICECHARTING_ENABLED=true in .env to re-enable once the provider fixes
// it). Cards/games fall back to the verified eBay sold-comps pipeline meanwhile.
const PRICECHARTING_ENABLED = process.env.PRICECHARTING_ENABLED === 'true';

// Resolve "Charizard Base Set" → a real pricecharting.com product URL by scraping
// their public site search (free, no quota). Returns null if nothing matches.
async function resolvePriceChartingUrl(query) {
  try {
    const res = await fetch(`https://www.pricecharting.com/search-products?q=${encodeURIComponent(query)}&type=prices`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36' },
    });
    if (!res.ok) return null;
    const html  = await res.text();
    const match = html.match(/\/game\/[a-z0-9-]+\/[a-z0-9-]+/i);   // first product result
    return match ? `https://www.pricecharting.com${match[0]}` : null;
  } catch { return null; }
}

async function getCardGamePrice(query) {
  if (!PRICECHARTING_ENABLED || !process.env.RAPIDAPI_KEY) return null;
  const host = process.env.PRICECHARTING_HOST || 'pricecharting-api.p.rapidapi.com';
  const cacheK = `card|${query.toLowerCase()}`;
  const cached = getPriceCached(cacheK);
  if (cached) { log(`   💾 PriceCharting cache hit (${query})`); return cached; }

  const url = await resolvePriceChartingUrl(query);
  if (!url) { log(`   ⚠️ PriceCharting: no product URL for "${query}" — falling back`); return null; }

  try {
    const res = await fetch(`https://${host}/scrapers/api/pricecharting/product/get-by-url`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'x-rapidapi-host': host, 'x-rapidapi-key': process.env.RAPIDAPI_KEY },
      body:    JSON.stringify({ url }),
      signal:  AbortSignal.timeout(110000),   // API self-reports ~76s latency
    });
    const remaining = res.headers.get('x-ratelimit-requests-remaining');
    if (remaining !== null) {
      lastQuota.pricecharting = Number(remaining);
      log(`   🎟️ PriceCharting quota: ${remaining} left`);
      if (Number(remaining) <= 10) log(`   ⚠️ LOW PRICECHARTING QUOTA (${remaining} left)`);
    }
    const d = await res.json();
    const p = Array.isArray(d.data) ? d.data[0] : null;
    if (!p) { log(`   ⚠️ PriceCharting: no data for "${query}" (${d.message || 'empty'}) — falling back`); return null; }

    const guide = Object.fromEntries((p.full_prices_guide || []).map(g => [g.label, g.price_amount]));
    const ungraded = guide['Ungraded'];
    if (!ungraded) { log(`   ⚠️ PriceCharting: no ungraded price for "${query}" — falling back`); return null; }

    // Real recent completed eBay sales from PriceCharting (these DO carry dates).
    const recentSales = (p.price_comparison || [])
      .flatMap(c => c.data || [])
      .filter(s => s.price_amount && s.date)
      .sort((a, b) => (b.date > a.date ? 1 : -1))
      .slice(0, 5)
      .map(s => ({ price: s.price_amount, date: s.date, title: (s.title || '').split('\n')[0].trim(), url: s.url }));

    const data = {
      source:    'PriceCharting (ungraded)',
      sellPrice: Math.round(ungraded),
      sellVenue: 'eBay',                       // raw cards/games typically resell on eBay
      evidence:  `PriceCharting ungraded $${Math.round(ungraded)}`
        + (guide['Grade 9'] ? ` · PSA/Grade 9 $${guide['Grade 9']}` : '')
        + (guide['PSA 10'] ? ` · PSA 10 $${guide['PSA 10']}` : ''),
      marketData: {
        type: 'card', productName: p.product_name, ungraded: Math.round(ungraded),
        grade9: guide['Grade 9'] ?? null, psa10: guide['PSA 10'] ?? null, recentSales,
      },
      links: { sell: url },
    };
    writePriceCache(cacheK, data);
    log(`   🃏 PriceCharting ungraded $${data.sellPrice} (${p.product_name})`);
    return data;
  } catch (err) {
    log(`   ⚠️ PriceCharting: ${err.message} — falling back to eBay comps`);
    return null;
  }
}

// ── Fashion Resale API (Depop listing lookup) ─────────────────
// Given a Depop listing slug (e.g. "retroranch-vintage-levis-501-jeans-9a2b"),
// returns price + condition data or null if unavailable.
export async function getDepopListing(slug) {
  if (!slug || !process.env.RAPIDAPI_KEY) return null;
  const host = process.env.FASHION_RESALE_HOST || 'fashion-resale-api.p.rapidapi.com';
  try {
    const r = await fetch(`https://${host}/listing/depop/${encodeURIComponent(slug)}`, {
      headers: {
        'x-rapidapi-host': host,
        'x-rapidapi-key': process.env.RAPIDAPI_KEY,
      },
    });
    if (!r.ok) return null;
    const data = await r.json();
    return data;
  } catch {
    return null;
  }
}

// ── Normalized market-price dispatcher ────────────────────────
// Returns { source, sellPrice, sellVenue, evidence, marketData, links } or null.
// Sneakers use Claude's SKU (StockX); cards/games use PriceCharting (when enabled).
async function getMarketPrice(target, sizes = []) {
  if (target.styleId) {
    const s = await getSneakerPrice(target.styleId, sizes, target.stockxQuery || target.searchQuery);
    if (!s) return null;
    return {
      source:    s.source,
      sellPrice: s.sellPrice,
      sellVenue: 'StockX',
      evidence:  `Live ${s.source} $${s.sellPrice}`
        + (s.lastSale ? ` · last sale $${s.lastSale}` : '')
        + (s.goat ? ` · GOAT $${s.goat}` : '')
        + (s.retailPrice ? ` · retail $${s.retailPrice}` : ''),
      marketData: {
        type: 'sneaker', stockX: s.stockX, goat: s.goat, perSize: s.perSize,
        size: s.size, lastSale: s.lastSale, retailPrice: s.retailPrice,
      },
      links: { sell: s.links?.stockX || null },
    };
  }
  if (/card|game/i.test(target.category || '')) {
    return await getCardGamePrice(target.searchQuery);
  }
  return null;
}

// ── STEP 1: Claude picks search targets ───────────────────────
async function getSearchTargets(categories, maxBudget, sizes = []) {
  log('🧠 Claude picking targets...');

  const safeSell = Math.round(maxBudget * 1.6);
  const sizeNote = sizes.length
    ? `\nTARGET SNEAKER SIZE(S): US men's ${sizes.join(', ')}. expectedSellMin MUST reflect the resale value for THESE sizes specifically — common sizes (8-11) resell for more than outliers (under 7 or over 12). Do not quote a size-15 price for a size-10 buyer.`
    : '';

  const res = await client.messages.create({
    model:      'claude-sonnet-4-6',
    max_tokens: 1500,
    system:     'You are a resale expert. Return ONLY a valid JSON array. No markdown, no explanation.',
    messages: [{
      role:    'user',
      content: `Return 5 specific items that are frequently underpriced on eBay and can be flipped for profit.

Categories: ${categories.join(', ')}
Max buy budget: $${maxBudget}${sizeNote}

STRICT RULES:
- Items must be WEARABLE clothing or footwear only — no keychains, posters, novelty items, accessories, or collectibles
- searchQuery must only match adult-sized wearable items (2-5 words, no size info)
- expectedBuyMax must be at least $20 and at most $${maxBudget}
- expectedSellMin must be realistic based on actual recent resale data
- Mix sell platforms across the 5 items (StockX, eBay, GOAT, Poshmark, Depop)
- whyUnderpriced: 1 sentence, specific reason sellers misprice this
- authChecks: 1 sentence, key authentication point for this exact item
- styleId: for SNEAKERS ONLY, the official manufacturer style code / SKU (e.g. "DD1391-100" for Nike Dunk Low Panda, "555088-101" for Jordan 1 Chicago). This must be the real, exact SKU — it is used to look up the live StockX price. Use null for non-sneakers OR if you are not certain of the exact SKU. NEVER guess a SKU.

Return ONLY this JSON array (5 objects):
[
  {
    "searchQuery": "Nike Dunk Low Panda",
    "stockxQuery": "Nike Dunk Low White Black",
    "category": "Sneakers",
    "styleId": "DD1391-100",
    "expectedBuyMax": ${Math.min(maxBudget, 90)},
    "expectedSellMin": ${Math.min(safeSell, 140)},
    "sellPlatform": "StockX",
    "whyUnderpriced": "Sellers list without checking StockX market price",
    "authChecks": "Check heel tab font and toe box shape"
  }
]`,
    }],
  });

  const text  = res.content[0].text.trim().replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  const start = text.indexOf('[');
  const end   = text.lastIndexOf(']');
  if (start === -1 || end === -1) throw new Error('No targets array from Claude');
  return JSON.parse(text.slice(start, end + 1));
}

// ── STEP 2: Claude analyzes real data and picks best flip ──────
async function analyzeListings(target, listings, soldComps, sizes = [], market = null) {
  if (!listings.length) return null;
  log(`🧠 Analyzing "${target.searchQuery}"...`);

  const sizeNote = sizes.length
    ? `\nTARGET SIZE(S): US men's ${sizes.join(', ')}. Prefer listings whose title names one of these sizes. The sell price and sold comps must reflect THIS size — value varies widely by size.`
    : '';

  // `soldComps` is { comps, stats } from REAL eBay sold listings (median computed
  // in code). `market` is a live StockX/GOAT price (or null).
  const comps = soldComps.comps || [];
  const stats = soldComps.stats;
  const ebayVerified = stats !== null;

  // Price basis priority: live market (StockX/PriceCharting) > eBay sold median
  // > estimate. `market` is a normalized object: { source, sellPrice, sellVenue,
  // evidence, marketData, links }.
  let sellPrice, verified, priceSource, priceEvidence;
  if (market) {
    sellPrice     = market.sellPrice;
    verified      = true;
    priceSource   = market.source;
    priceEvidence = market.evidence;
  } else if (ebayVerified) {
    sellPrice     = stats.median;
    verified      = true;
    priceSource   = 'eBay sold comps';
    priceEvidence = `${stats.count} real eBay sales · median $${stats.median} · range $${stats.low}–$${stats.high}`;
  } else {
    sellPrice     = target.expectedSellMin;
    verified      = false;
    priceSource   = 'estimate';
    priceEvidence = 'No verified market data — sell price is an estimate, not confirmed.';
  }

  // Sell venue follows the price source. (May change after the condition check.)
  let sellVenue = market ? market.sellVenue : target.sellPlatform;
  let fees = sellVenue === 'StockX'
    ? Math.round(sellPrice * 0.095 + 5)
    : Math.round(sellPrice * 0.13);

  const res = await client.messages.create({
    model:      'claude-sonnet-4-6',
    max_tokens: 1500,
    system:     'You are a resale analyst. Return ONLY a valid JSON object. No markdown, no explanation.',
    messages: [{
      role:    'user',
      content: `Pick the single best flip opportunity from these real eBay listings.

ITEM: ${target.searchQuery}${sizeNote}
SELL ON: ${sellVenue}
PLATFORM FEES: $${fees}
WHY UNDERPRICED: ${target.whyUnderpriced}
AUTH CHECKS: ${target.authChecks}

VERIFIED SELL PRICE — SOURCE: ${priceSource}
${priceEvidence}
Use $${sellPrice} as the sell price. Do NOT invent a different number.

LIVE EBAY LISTINGS (sorted cheapest first):
${JSON.stringify(listings.slice(0, 8), null, 2)}

REAL SOLD COMPS (actual completed sales):
${comps.length ? JSON.stringify(comps.slice(0, 6), null, 2) : 'None available'}

Instructions:
- Pick the listing with the best combo of low price + good seller rating (prefer >95%)
- Avoid "Fair" condition unless price is exceptionally low
- directBuyUrl MUST be the exact url field from the listing you chose
- sellPrice MUST equal $${sellPrice} (the verified price above)
- profit = sellPrice - buyPrice - fees
- margin = Math.round((profit / buyPrice) * 100)
- Include the result even if margin is only 15% — modest is fine
- confidence: "high" if margin >35%, "medium" if 22-35%, "low" if 15-22%
- CRITICAL: never invent specific prices or dates. The sell price and evidence are fixed from the source above.

Return ONLY this JSON object:
{
  "name": "specific item with model and colorway",
  "category": "${target.category}",
  "buyPrice": 0,
  "sellPrice": ${sellPrice},
  "estimatedFees": ${fees},
  "profit": 0,
  "margin": 0,
  "condition": "Pre-owned - Good",
  "whereToBuy": "eBay",
  "whereToSell": "${sellVenue}",
  "timeToSell": "3-7 days",
  "directBuyUrl": "https://www.ebay.com/itm/EXACT-ID-FROM-LISTINGS-ABOVE",
  "sellerRating": "99.2%",
  "shippingCost": "Free",
  "soldCompsEvidence": "${priceEvidence.replace(/"/g, "'")}",
  "feesBreakdown": "${sellVenue} fees: $${fees}",
  "steps": [
    "Find and purchase this exact listing — underpriced listings sell fast",
    "Inspect upon arrival: ${target.authChecks}",
    "Clean and photograph the item with good lighting",
    "List on ${sellVenue} at $5 below current lowest ask",
    "Ship promptly using the platform prepaid label"
  ],
  "proTip": "${target.whyUnderpriced}",
  "redFlags": "key risks to watch for on this specific item",
  "confidence": "medium"
}`,
    }],
  });

  const text  = res.content[0].text.trim().replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  const start = text.indexOf('{');
  const end   = text.lastIndexOf('}');
  if (start === -1 || end === -1) return null;

  const flip = JSON.parse(text.slice(start, end + 1));
  const q    = encodeURIComponent(target.searchQuery);

  // Identify which listing the model actually chose (by url, else closest price).
  let buyPriceNum = Number(flip.buyPrice) || 0;
  let chosen = listings.find(l => l.url && l.url === flip.directBuyUrl)
            || listings.find(l => Math.abs(l.price - buyPriceNum) < 0.5)
            || listings[0];

  // ── #3 LIVE-LISTING CHECK ──────────────────────────────────────────────
  // Verify the chosen listing is still purchasable; if not, swap to the
  // cheapest still-live listing (cap the checks to bound latency). If nothing
  // is live, drop the flip rather than show a dead link.
  if (!(await verifyEbayLive(chosen?.itemId))) {
    log(`   🔁 Chosen listing ended — finding a live one...`);
    let replaced = false;
    for (const alt of [...listings].sort((a, b) => a.price - b.price).slice(0, 4)) {
      if (alt.itemId === chosen?.itemId) continue;
      if (await verifyEbayLive(alt.itemId)) { chosen = alt; replaced = true; break; }
    }
    if (!replaced) { log(`   ⚠️ No live listing for "${target.searchQuery}" — skipping`); return null; }
    // Re-point the flip at the live listing.
    flip.directBuyUrl = chosen.url;
    flip.buyPrice     = chosen.price;
    flip.condition    = chosen.condition;
    flip.sellerRating = chosen.sellerRating;
    flip.shippingCost = chosen.shipping;
    buyPriceNum       = chosen.price;
    log(`   ✅ Live listing @ $${chosen.price} (${chosen.condition})`);
  }

  // ── #2 CONDITION GUARD ─────────────────────────────────────────────────
  // A deadstock StockX price assumes a NEW pair. If the buy listing is used,
  // that sell price is unrealistic — prefer the eBay sold median (mixed
  // condition), else discount the market price. Sell a used pair on eBay.
  let suppressMarketUI = false;
  if (market && isUsedCondition(chosen?.condition || flip.condition || '')) {
    const cond = (chosen?.condition || flip.condition || 'used').toLowerCase();
    sellVenue = 'eBay';
    suppressMarketUI = true;   // hide deadstock panel; eBay comps panel matches the price
    if (ebayVerified) {
      sellPrice     = stats.median;
      priceSource   = 'eBay sold comps (used buy)';
      priceEvidence = `Buy listing is ${cond}; deadstock ${market.source} ($${market.sellPrice}) doesn't apply. Using ${stats.count} real eBay sales · median $${stats.median}.`;
    } else {
      sellPrice     = Math.round(market.sellPrice * USED_DISCOUNT);
      priceSource   = `${market.source} (used −${Math.round((1 - USED_DISCOUNT) * 100)}%)`;
      priceEvidence = `Buy listing is ${cond}; discounted deadstock ${market.source} by ${Math.round((1 - USED_DISCOUNT) * 100)}% → $${sellPrice}.`;
    }
    fees = Math.round(sellPrice * 0.13);
    log(`   🩹 Used buy detected (${cond}) → sell $${sellPrice} via eBay`);
  }

  // ── Pin the verifiable fields to REAL data so the model can't drift ──
  // Sell price, source and evidence are authoritative from the resolved price
  // basis, not whatever the model echoed back. Recompute profit/margin to match.
  flip.sellPrice         = sellPrice;
  flip.verified          = verified;
  flip.priceSource       = priceSource;
  flip.soldCompsEvidence = priceEvidence;
  flip.whereToSell       = sellVenue;
  flip.compStats         = stats;                            // real eBay {count, median, low, high} or null
  flip.compsPeriod       = 'Recent eBay completed sales (last ~90 days)';
  flip.soldComps         = comps.slice(0, 8);                 // real per-sale comps for the UI
  flip.marketData        = (market && !suppressMarketUI) ? market.marketData : null; // live market snapshot for the UI
  flip.estimatedFees     = fees;

  buyPriceNum = Number(flip.buyPrice) || 0;
  flip.profit = Math.round(sellPrice - buyPriceNum - fees);
  flip.margin = buyPriceNum ? Math.round((flip.profit / buyPriceNum) * 100) : 0;

  // Attach buy/sell links
  flip.buyLinks = [
    {
      platform: 'eBay — Direct Listing',
      url:      flip.directBuyUrl,
      label:    'Buy this exact listing',
    },
    {
      platform: 'eBay Search',
      url:      `https://www.ebay.com/sch/i.html?_nkw=${q}&LH_BIN=1&_udhi=${target.expectedBuyMax}&_sop=10`,
      label:    `All eBay listings under $${target.expectedBuyMax}`,
    },
  ];

  const sellUrl = market?.links?.sell
    || (sellVenue === 'StockX'
          ? `https://stockx.com/search?s=${encodeURIComponent(target.stockxQuery)}`
          : `https://www.ebay.com/sch/i.html?_nkw=${q}&LH_Sold=1&LH_Complete=1`);
  flip.sellLinks = [
    {
      platform: sellVenue,
      url:      sellUrl,
      label:    `Sell on ${sellVenue}`,
    },
    {
      platform: 'eBay Sold Comps',
      url:      `https://www.ebay.com/sch/i.html?_nkw=${q}&LH_Sold=1&LH_Complete=1&_sop=13`,
      label:    'Verify sold prices',
    },
  ];

  return flip;
}

// ── NORMALIZE for frontend ────────────────────────────────────
function normalize(flip, i, categories) {
  const margin = Number(flip.margin) || 0;
  return {
    id:                `flip-${Date.now()}-${i}`,
    name:              flip.name              || 'Unknown Item',
    description:       flip.soldCompsEvidence || '',
    buyPrice:          Number(flip.buyPrice)  || 0,
    sellPrice:         Number(flip.sellPrice) || 0,
    profit:            Number(flip.profit)    || 0,
    margin,
    buyPlatform:       'eBay',
    sellPlatform:      flip.whereToSell       || 'eBay',
    category:          flip.category          || categories[0] || 'General',
    timeToSell:        flip.timeToSell        || '1-2 weeks',
    difficulty:        margin > 40 ? 'Easy' : margin > 25 ? 'Medium' : 'Hard',
    condition:         flip.condition         || 'Used',
    sellerRating:      flip.sellerRating      || '?',
    steps:             Array.isArray(flip.steps) ? flip.steps : [],
    proTip:            flip.proTip            || '',
    redFlags:          Array.isArray(flip.redFlags) ? flip.redFlags : flip.redFlags ? [flip.redFlags] : [],
    buyLinks:          flip.buyLinks          || [],
    sellLinks:         flip.sellLinks         || [],
    confidence:        flip.confidence        || 'medium',
    soldCompsEvidence: flip.soldCompsEvidence || '',
    feesBreakdown:     flip.feesBreakdown     || '',
    directBuyUrl:      flip.directBuyUrl      || '',
    verified:          flip.verified === true,
    priceSource:       flip.priceSource       || '',
    compStats:         flip.compStats         || null,
    compsPeriod:       flip.compsPeriod        || '',
    soldComps:         Array.isArray(flip.soldComps) ? flip.soldComps : [],
    marketData:        flip.marketData        || null,
  };
}

// ── MAIN ──────────────────────────────────────────────────────
export async function findFlips(categories = [], maxBudget = 100, platforms = ['eBay'], sizes = []) {
  log(`\n🚀 STACKD — scanning for flips`);
  log(`   Categories: ${categories.join(', ')} | Budget: $${maxBudget}${sizes.length ? ` | Sizes: ${sizes.join(', ')}` : ''}\n`);

  const key    = cacheKey(categories, maxBudget, platforms, sizes);
  const cached = getCached(key);
  if (cached) return cached;

  // Step 1: Claude picks 5 targets
  const targets = await getSearchTargets(categories, maxBudget, sizes);
  log(`✅ ${targets.length} targets identified\n`);

  // Step 2: For each target, fetch eBay listings + sold comps, then analyze
  const results = [];

  for (const target of targets) {
    try {
      log(`🔍 ${target.searchQuery}`);
      // Size filtering only makes sense for footwear targets.
      const tSizes = /sneaker|shoe|footwear/i.test(target.category || '') ? sizes : [];
      // getMarketPrice dispatches by category and self-gates (sneakers need a
      // styleId; cards/games need PriceCharting enabled) → no wasted API calls.
      const [listings, soldComps, market] = await Promise.all([
        searchEbay(target.searchQuery, target.expectedBuyMax, 12, tSizes),
        getSoldComps(target.searchQuery, tSizes),
        getMarketPrice(target, tSizes),
      ]);

      if (!listings.length) {
        log(`   ⚠️ No eBay listings — skipping`);
        continue;
      }

      const flip = await analyzeListings(target, listings, soldComps, tSizes, market);
      if (!flip) { log(`   ⚠️ Claude returned no result`); continue; }

      const profit   = Number(flip.profit);
      const margin   = Number(flip.margin);
      const buyPrice = Number(flip.buyPrice);

      if (buyPrice < 10) {
        log(`   ⚠️ Buy price $${buyPrice} too low — likely damaged/novelty, skipping`);
        continue;
      }
      if (profit < MIN_PROFIT || margin < MIN_MARGIN) {
        log(`   ⚠️ Margin too low (${margin}%) — skipping`);
        continue;
      }

      results.push(flip);
      log(`   ✅ $${profit} profit | ${margin}% margin | ${flip.confidence} confidence`);
    } catch (err) {
      log(`   ❌ Error: ${err.message}`);
    }
  }

  // Sort best margin first
  results.sort((a, b) => Number(b.margin) - Number(a.margin));

  const normalized = results.map((f, i) => normalize(f, i, categories));

  log(`\n💾 Caching ${normalized.length} results for 24h`);
  writeCache(key, normalized);
  log(`✅ Done — ${normalized.length} flip opportunities\n`);

  return normalized;
}

export function printFlips(flips) {
  if (!flips.length) { console.log('\n⚠️  No flips returned.\n'); return; }
  flips.forEach((flip, i) => {
    console.log(`\n${'━'.repeat(52)}`);
    console.log(`FLIP #${i + 1}: ${flip.name}`);
    console.log(`${'━'.repeat(52)}`);
    console.log(`💸 Buy:    $${flip.buyPrice} on eBay  (${flip.condition})`);
    console.log(`💰 Sell:   $${flip.sellPrice} on ${flip.sellPlatform}`);
    console.log(`📈 Profit: $${flip.profit} (${flip.margin}% margin)`);
    console.log(`⭐ Seller: ${flip.sellerRating}`);
    console.log(`🎯 Confidence: ${flip.confidence}`);
    console.log(`📊 Evidence: ${flip.soldCompsEvidence}`);
    console.log(`🔗 Buy link: ${flip.directBuyUrl}`);
    console.log(`\n📋 Steps:`);
    flip.steps.forEach((s, j) => console.log(`   ${j + 1}. ${s}`));
    console.log(`\n💡 Pro tip: ${flip.proTip}`);
    console.log(`⚠️  Red flags: ${flip.redFlags}`);
  });
  console.log(`\n${'━'.repeat(52)}\n`);
}
