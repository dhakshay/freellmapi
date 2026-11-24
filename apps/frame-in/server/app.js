import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import Database from 'better-sqlite3';
import { storeConfig } from './store.js';
import { createMailer } from './mail.js';
import { renderPage, SLUGS } from './pages.js';
import { PRODUCTS, LENS_OPTIONS, SHIPPING, COUPONS, seedQty } from './products.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const byId = new Map(PRODUCTS.map((p) => [p.id, p]));

const hmac = (secret, data) => crypto.createHmac('sha256', secret).update(data).digest('hex');
function safeEqual(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}
const clean = (v, max) => String(v ?? '').trim().slice(0, max);

export function validateItems(items) {
  const errors = [], lines = [];
  const list = Array.isArray(items) ? items : [];
  if (!list.length || list.length > 20) errors.push('Cart must have 1 to 20 lines.');
  for (const it of list) {
    const p = byId.get(Number(it?.id));
    const qty = Number(it?.qty);
    if (!p) { errors.push('Unknown product.'); continue; }
    if (!p.colors.includes(it?.color)) { errors.push(`Color not available for ${p.name}.`); continue; }
    if (!Number.isInteger(qty) || qty < 1 || qty > 10) { errors.push(`Quantity for ${p.name} must be 1 to 10.`); continue; }
    const opts = LENS_OPTIONS[p.type];
    const lens = opts.find((o) => o.id === (it?.lens ?? opts[0].id));
    if (!lens) { errors.push(`Lens option not available for ${p.name}.`); continue; }
    lines.push({ id: p.id, name: p.name, color: it.color, qty, lens: lens.id, lensName: lens.name, rx: lens.rx ? clean(it?.rx, 240) : '', unit: p.price + lens.price });
  }
  return { errors, lines };
}

export function quote(lines, code) {
  const subtotal = lines.reduce((s, l) => s + l.unit * l.qty, 0);
  let discount = 0, coupon = null, couponError = null;
  const c = String(code || '').trim().toUpperCase();
  if (c) {
    const def = COUPONS[c];
    if (!def) couponError = 'That code is not valid.';
    else if (def.min && subtotal < def.min) couponError = `Add ₹${def.min - subtotal} more to use ${c}.`;
    else { discount = def.pct ? Math.floor((subtotal * def.pct) / 100) : def.flat; coupon = { code: c, label: def.label }; }
  }
  const after = subtotal - discount;
  const shipping = after >= SHIPPING.freeOver ? 0 : SHIPPING.fee;
  return { subtotal, discount, shipping, total: after + shipping, coupon, couponError, freeShippingAway: Math.max(0, SHIPPING.freeOver - after) };
}

export function validateOrder(body) {
  const { errors, lines } = validateItems(body?.items);
  const c = body?.customer ?? {};
  const customer = {
    name: clean(c.name, 80), phone: clean(c.phone, 10), email: clean(c.email, 120),
    address: clean(c.address, 240), city: clean(c.city, 60), pincode: clean(c.pincode, 6),
  };
  if (customer.name.length < 2) errors.push('Enter your name.');
  if (!/^[6-9]\d{9}$/.test(customer.phone)) errors.push('Enter a 10-digit mobile number.');
  if (customer.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(customer.email)) errors.push('Enter a valid email.');
  if (customer.address.length < 6) errors.push('Enter your full address.');
  if (customer.city.length < 2) errors.push('Enter your city.');
  if (!/^[1-9]\d{5}$/.test(customer.pincode)) errors.push('Enter a 6-digit pincode.');
  const method = body?.method;
  if (method !== 'cod' && method !== 'online') errors.push('Choose a payment method.');
  return { errors, lines, customer, method };
}

export function createApp({ dbPath = ':memory:', env = process.env, fetchImpl = globalThis.fetch, mailer } = {}) {
  const store = storeConfig(env);
  mailer = mailer || createMailer(env, store);
  const notify = (kind, id) => { const o = db.prepare('SELECT * FROM orders WHERE id = ?').get(id); if (o) mailer.send(kind, { ...publicOrder(o), customer: JSON.parse(o.customer) }); };
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.exec(`CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY, token TEXT NOT NULL, status TEXT NOT NULL, method TEXT NOT NULL,
    total INTEGER NOT NULL, items TEXT NOT NULL, customer TEXT NOT NULL,
    rzp_order_id TEXT, rzp_payment_id TEXT, pricing TEXT NOT NULL DEFAULT '{}', tracking TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`);
  db.exec('CREATE TABLE IF NOT EXISTS stock (product_id INTEGER NOT NULL, color TEXT NOT NULL, qty INTEGER NOT NULL, PRIMARY KEY (product_id, color))');
  const seed = db.prepare('INSERT OR IGNORE INTO stock (product_id, color, qty) VALUES (?, ?, ?)');
  PRODUCTS.forEach((p) => p.colors.forEach((c, i) => seed.run(p.id, c, seedQty(p.id, i))));
  const stockRow = db.prepare('SELECT qty FROM stock WHERE product_id = ? AND color = ?');
  const takeStock = db.prepare('UPDATE stock SET qty = qty - ? WHERE product_id = ? AND color = ?');
  const giveStock = db.prepare('UPDATE stock SET qty = qty + ? WHERE product_id = ? AND color = ?');
  const need = (lines) => { const m = new Map(); for (const l of lines) m.set(`${l.id}|${l.color}`, (m.get(`${l.id}|${l.color}`) || 0) + l.qty); return m; };
  const reserve = db.transaction((lines) => {
    for (const [k, q] of need(lines)) {
      const [id, color] = k.split('|');
      const row = stockRow.get(Number(id), color);
      if (!row || row.qty < q) throw Object.assign(new Error(`${byId.get(Number(id)).name} in ${color} is ${row && row.qty > 0 ? `down to ${row.qty}` : 'sold out'}.`), { stock: true });
    }
    for (const [k, q] of need(lines)) { const [id, color] = k.split('|'); takeStock.run(q, Number(id), color); }
  });
  const release = db.transaction((lines) => { for (const [k, q] of need(lines)) { const [id, color] = k.split('|'); giveStock.run(q, Number(id), color); } });
  const cancelStmt = db.prepare("UPDATE orders SET status = 'cancelled', updated_at = ? WHERE id = ?");
  // Unpaid online orders hold stock for 30 minutes, then the stock is released.
  function expireUnpaid() {
    const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    for (const o of db.prepare("SELECT * FROM orders WHERE status = 'pending_payment' AND created_at < ?").all(cutoff)) {
      cancelStmt.run(new Date().toISOString(), o.id); release(JSON.parse(o.items));
    }
  }
  db.exec('CREATE INDEX IF NOT EXISTS orders_rzp ON orders(rzp_order_id)');

  const keyId = env.RAZORPAY_KEY_ID, keySecret = env.RAZORPAY_KEY_SECRET;
  const online = Boolean(keyId && keySecret);
  const rzpBase = env.RAZORPAY_API_BASE || 'https://api.razorpay.com';
  const adminToken = env.ADMIN_TOKEN;
  const now = () => new Date().toISOString();
  const getOrder = db.prepare('SELECT * FROM orders WHERE id = ?');
  const publicOrder = (o) => ({
    id: o.id, status: o.status, method: o.method, total: o.total, items: JSON.parse(o.items), pricing: JSON.parse(o.pricing),
    tracking: o.tracking, city: JSON.parse(o.customer).city, created_at: o.created_at,
  });
  const setStatus = db.prepare('UPDATE orders SET status = ?, rzp_payment_id = COALESCE(?, rzp_payment_id), updated_at = ? WHERE id = ?');

  const hits = new Map();
  function limit(max) {
    return (req, res, next) => {
      const k = `${req.ip}:${req.path}`, t = Date.now();
      const arr = (hits.get(k) || []).filter((x) => t - x < 60000);
      if (arr.length >= max) return res.status(429).json({ error: 'Too many requests. Try again in a minute.' });
      arr.push(t); hits.set(k, arr); next();
    };
  }

  const app = express();
  app.disable('x-powered-by');
  if (env.TRUST_PROXY) app.set('trust proxy', env.TRUST_PROXY === 'true' ? 1 : Number(env.TRUST_PROXY) || env.TRUST_PROXY);
  app.use((req, res, next) => {
    res.set({ 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin', 'X-Frame-Options': 'DENY' });
    next();
  });

  // Razorpay webhook needs the raw body for signature checking, so it is mounted before express.json().
  app.post('/api/razorpay/webhook', express.raw({ type: '*/*', limit: '1mb' }), (req, res) => {
    const secret = env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) return res.status(404).json({ error: 'Webhook not configured.' });
    const raw = req.body instanceof Buffer ? req.body : Buffer.from('');
    if (!safeEqual(req.get('x-razorpay-signature') || '', hmac(secret, raw))) return res.status(400).json({ error: 'Bad signature.' });
    let ev; try { ev = JSON.parse(raw.toString('utf8')); } catch { return res.status(400).json({ error: 'Bad JSON.' }); }
    if (ev.event === 'payment.captured' || ev.event === 'order.paid') {
      const pay = ev.payload?.payment?.entity, rid = pay?.order_id || ev.payload?.order?.entity?.id;
      const o = rid && db.prepare('SELECT * FROM orders WHERE rzp_order_id = ?').get(rid);
      const amount = pay?.amount ?? ev.payload?.order?.entity?.amount_paid;
      if (o && o.status === 'pending_payment' && amount === o.total * 100) { setStatus.run('paid', pay?.id ?? null, now(), o.id); notify('placed', o.id); }
    }
    res.json({ ok: true });
  });

  app.use(express.json({ limit: '50kb' }));

  app.get('/api/config', (req, res) => res.json({ online, keyId: online ? keyId : null, currency: 'INR', lenses: LENS_OPTIONS, shipping: SHIPPING, store: { name: store.name, email: store.email, phone: store.phone } }));
  app.get('/api/products', (req, res) => {
    expireUnpaid();
    const rows = db.prepare('SELECT product_id, color, qty FROM stock').all();
    res.json(PRODUCTS.map((p) => ({ ...p, stock: Object.fromEntries(rows.filter((r) => r.product_id === p.id).map((r) => [r.color, r.qty])) })));
  });

  app.post('/api/quote', limit(120), (req, res) => {
    const { errors, lines } = validateItems(req.body?.items);
    if (errors.length) return res.status(400).json({ error: errors[0] });
    res.json({ ...quote(lines, req.body?.coupon), lines });
  });

  app.post('/api/orders', limit(20), (req, res) => {
    const { errors, lines, customer, method } = validateOrder(req.body);
    if (method === 'online' && !online) errors.push('Online payment is not enabled on this store.');
    if (errors.length) return res.status(400).json({ error: errors[0], errors });
    const q = quote(lines, req.body?.coupon);
    if (req.body?.coupon && q.couponError) return res.status(400).json({ error: q.couponError });
    const id = 'FI-' + crypto.randomBytes(4).toString('hex').toUpperCase();
    const token = crypto.randomBytes(16).toString('hex');
    const status = method === 'cod' ? 'placed' : 'pending_payment';
    try {
      expireUnpaid();
      db.transaction(() => {
        reserve(lines);
        db.prepare('INSERT INTO orders (id, token, status, method, total, items, customer, pricing, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)')
          .run(id, token, status, method, q.total, JSON.stringify(lines), JSON.stringify(customer), JSON.stringify(q), now(), now());
      })();
    } catch (e) {
      if (e.stock) return res.status(409).json({ error: e.message });
      throw e;
    }
    if (method === 'cod') notify('placed', id);
    res.status(201).json({ orderId: id, token, status, total: q.total });
  });

  app.post('/api/track', limit(20), (req, res) => {
    const o = getOrder.get(clean(req.body?.orderId, 20).toUpperCase());
    const phone = o && JSON.parse(o.customer).phone;
    if (!o || !safeEqual(clean(req.body?.phone, 10), phone)) return res.status(404).json({ error: 'We could not find that order. Check the order number and mobile number.' });
    res.json(publicOrder(o));
  });

  function authedOrder(req, res) {
    const o = getOrder.get(req.params.id);
    if (!o || !safeEqual(req.query.token || req.body?.token || '', o.token)) { res.status(404).json({ error: 'Order not found.' }); return null; }
    return o;
  }

  app.post('/api/orders/:id/pay', limit(20), async (req, res) => {
    if (!online) return res.status(400).json({ error: 'Online payment is not enabled.' });
    const o = authedOrder(req, res); if (!o) return;
    if (o.method !== 'online' || o.status !== 'pending_payment') return res.status(409).json({ error: 'This order is not awaiting payment.' });
    if (o.rzp_order_id) return res.json({ keyId, rzpOrderId: o.rzp_order_id, amount: o.total * 100 });
    try {
      const r = await fetchImpl(`${rzpBase}/v1/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64') },
        body: JSON.stringify({ amount: o.total * 100, currency: 'INR', receipt: o.id }),
      });
      const j = await r.json();
      if (!r.ok || !j.id) throw new Error(j?.error?.description || `Razorpay HTTP ${r.status}`);
      db.prepare('UPDATE orders SET rzp_order_id = ?, updated_at = ? WHERE id = ?').run(j.id, now(), o.id);
      res.json({ keyId, rzpOrderId: j.id, amount: o.total * 100 });
    } catch (e) {
      console.error('razorpay order failed:', e.message);
      res.status(502).json({ error: 'Could not start the payment. Please try again.' });
    }
  });

  app.post('/api/payments/verify', limit(30), (req, res) => {
    const { orderId, razorpay_order_id: rid, razorpay_payment_id: pid, razorpay_signature: sig } = req.body ?? {};
    const o = online && getOrder.get(String(orderId));
    if (!o || !safeEqual(req.body?.token || '', o.token) || !o.rzp_order_id || o.rzp_order_id !== rid) return res.status(400).json({ error: 'Payment could not be verified.' });
    if (!pid || !safeEqual(sig || '', hmac(keySecret, `${rid}|${pid}`))) return res.status(400).json({ error: 'Payment could not be verified.' });
    if (o.status === 'cancelled') return res.status(409).json({ error: `Order ${o.id} expired before payment arrived. Contact support with payment ${pid} for a refund.` });
    if (o.status === 'pending_payment') { setStatus.run('paid', String(pid), now(), o.id); notify('placed', o.id); }
    res.json({ ok: true, order: publicOrder(getOrder.get(o.id)) });
  });

  app.get('/api/orders/:id', (req, res) => {
    const o = authedOrder(req, res); if (!o) return;
    res.json(publicOrder(o));
  });

  const admin = (req, res, next) => {
    if (!adminToken) return res.status(404).json({ error: 'Admin is disabled.' });
    if (!safeEqual((req.get('authorization') || '').replace(/^Bearer /, ''), adminToken)) return res.status(401).json({ error: 'Unauthorized.' });
    next();
  };
  app.get('/api/admin/orders', admin, (req, res) => {
    expireUnpaid();
    res.json(db.prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT 200').all()
      .map((o) => ({ ...publicOrder(o), customer: JSON.parse(o.customer), rzp_payment_id: o.rzp_payment_id })));
  });
  app.patch('/api/admin/orders/:id', admin, (req, res) => {
    const o = getOrder.get(req.params.id);
    if (!o) return res.status(404).json({ error: 'Order not found.' });
    const allowed = ['placed', 'paid', 'shipped', 'delivered', 'cancelled'];
    const s = req.body?.status ?? o.status;
    if (!allowed.includes(s) && s !== 'pending_payment') return res.status(400).json({ error: 'Status must be one of ' + allowed.join(', ') });
    if (o.status === 'cancelled' && s !== 'cancelled') return res.status(400).json({ error: 'A cancelled order cannot be reopened. Create a new order.' });
    const tracking = req.body?.tracking === undefined ? o.tracking : clean(req.body.tracking, 120);
    db.transaction(() => {
      if (s === 'cancelled' && o.status !== 'cancelled') release(JSON.parse(o.items));
      db.prepare('UPDATE orders SET status = ?, tracking = ?, updated_at = ? WHERE id = ?').run(s, tracking, now(), o.id);
    })();
    if (s === 'shipped' && o.status !== 'shipped') notify('shipped', o.id);
    res.json({ ok: true });
  });
  app.get('/api/admin/stock', admin, (req, res) => res.json(db.prepare('SELECT product_id, color, qty FROM stock ORDER BY product_id, color').all().map((r) => ({ ...r, name: byId.get(r.product_id).name }))));
  app.put('/api/admin/stock', admin, (req, res) => {
    const { product_id: id, color, qty } = req.body ?? {};
    if (!Number.isInteger(qty) || qty < 0 || qty > 100000) return res.status(400).json({ error: 'Quantity must be a whole number from 0 to 100000.' });
    const r = db.prepare('UPDATE stock SET qty = ? WHERE product_id = ? AND color = ?').run(qty, Number(id), String(color));
    res.status(r.changes ? 200 : 404).json(r.changes ? { ok: true } : { error: 'No such product or color.' });
  });

  app.get('/healthz', (req, res) => { try { db.prepare('SELECT 1').get(); res.json({ ok: true }); } catch { res.status(503).json({ ok: false }); } });
  app.get('/p/:slug', (req, res) => {
    const html = renderPage(req.params.slug, store, SHIPPING);
    if (!html) return res.status(404).send('Page not found');
    res.type('html').send(html);
  });
  app.get('/robots.txt', (req, res) => res.type('text').send(`User-agent: *\nDisallow: /admin.html\nDisallow: /api/\n${store.baseUrl ? `Sitemap: ${store.baseUrl}/sitemap.xml\n` : ''}`));
  app.get('/sitemap.xml', (req, res) => {
    if (!store.baseUrl) return res.status(404).end();
    const urls = ['/', ...SLUGS.map((x) => `/p/${x}`)].map((u) => `<url><loc>${store.baseUrl}${u}</loc></url>`).join('');
    res.type('xml').send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`);
  });
  app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));
  app.use(express.static(path.join(here, '..', 'public')));
  app.use((err, req, res, next) => {
    if (err?.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON.' });
    console.error(err); res.status(500).json({ error: 'Something went wrong.' });
  });
  app.close = () => db.close();
  return app;
}
