import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { createApp } from './app.js';

const customer = { name: 'Asha Rao', phone: '9876543210', email: 'a@b.co', address: '12 MG Road', city: 'Pune', pincode: '411001' };
const items = [{ id: 0, color: 'black', qty: 2 }, { id: 2, color: 'gold', qty: 1 }]; // 1499*2 + 1899

async function boot(env = {}, fetchImpl) {
  const app = createApp({ env, fetchImpl });
  const server = await new Promise((ok) => { const s = app.listen(0, () => ok(s)); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = async (path, { method = 'GET', body, headers = {} } = {}) => {
    const r = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...headers }, body: body && JSON.stringify(body) });
    return { status: r.status, json: await r.json() };
  };
  return { call, close: () => { server.close(); app.close(); } };
}
const rzpEnv = { RAZORPAY_KEY_ID: 'rzp_test_x', RAZORPAY_KEY_SECRET: 'secret123', ADMIN_TOKEN: 'adm' };
const fakeRzp = async () => ({ ok: true, status: 200, json: async () => ({ id: 'order_ABC' }) });

test('catalog and config', async () => {
  const s = await boot();
  assert.equal((await s.call('/api/products')).json.length, 16);
  assert.equal((await s.call('/api/config')).json.online, false);
  s.close();
});

test('COD order is priced by the server, ignoring client prices', async () => {
  const s = await boot();
  const r = await s.call('/api/orders', { method: 'POST', body: { items: items.map((i) => ({ ...i, price: 1 })), customer, method: 'cod', total: 1 } });
  assert.equal(r.status, 201);
  assert.equal(r.json.total, 1499 * 2 + 1899);
  assert.equal(r.json.status, 'placed');
  const g = await s.call(`/api/orders/${r.json.orderId}?token=${r.json.token}`);
  assert.equal(g.json.total, 4897);
  assert.equal((await s.call(`/api/orders/${r.json.orderId}?token=wrong`)).status, 404);
  s.close();
});

test('rejects bad input', async () => {
  const s = await boot();
  const bad = async (patch) => (await s.call('/api/orders', { method: 'POST', body: { items, customer, method: 'cod', ...patch } })).status;
  assert.equal(await bad({ items: [] }), 400);
  assert.equal(await bad({ items: [{ id: 999, color: 'black', qty: 1 }] }), 400);
  assert.equal(await bad({ items: [{ id: 0, color: 'red', qty: 1 }] }), 400);
  assert.equal(await bad({ items: [{ id: 0, color: 'black', qty: -1 }] }), 400);
  assert.equal(await bad({ customer: { ...customer, phone: '123' } }), 400);
  assert.equal(await bad({ customer: { ...customer, pincode: 'abc' } }), 400);
  assert.equal(await bad({ method: 'online' }), 400); // online disabled without keys
  s.close();
});

test('online flow: create, pay, verify signature', async () => {
  const s = await boot(rzpEnv, fakeRzp);
  const o = (await s.call('/api/orders', { method: 'POST', body: { items, customer, method: 'online' } })).json;
  assert.equal(o.status, 'pending_payment');
  const pay = await s.call(`/api/orders/${o.orderId}/pay?token=${o.token}`, { method: 'POST', body: {} });
  assert.equal(pay.json.amount, 489700);
  assert.equal(pay.json.rzpOrderId, 'order_ABC');
  const verify = (sig) => s.call('/api/payments/verify', { method: 'POST', body: { orderId: o.orderId, token: o.token, razorpay_order_id: 'order_ABC', razorpay_payment_id: 'pay_1', razorpay_signature: sig } });
  assert.equal((await verify('deadbeef')).status, 400);
  assert.equal((await s.call(`/api/orders/${o.orderId}?token=${o.token}`)).json.status, 'pending_payment');
  const good = crypto.createHmac('sha256', 'secret123').update('order_ABC|pay_1').digest('hex');
  const ok = await verify(good);
  assert.equal(ok.status, 200);
  assert.equal(ok.json.order.status, 'paid');
  s.close();
});

test('webhook marks paid only with a valid signature and matching amount', async () => {
  const s = await boot({ ...rzpEnv, RAZORPAY_WEBHOOK_SECRET: 'whsec' }, fakeRzp);
  const o = (await s.call('/api/orders', { method: 'POST', body: { items, customer, method: 'online' } })).json;
  await s.call(`/api/orders/${o.orderId}/pay?token=${o.token}`, { method: 'POST', body: {} });
  const send = (amount, secret) => {
    const raw = JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { id: 'pay_9', order_id: 'order_ABC', amount } } } });
    return s.call('/api/razorpay/webhook', { method: 'POST', body: JSON.parse(raw), headers: { 'x-razorpay-signature': crypto.createHmac('sha256', secret).update(raw).digest('hex') } });
  };
  assert.equal((await send(489700, 'wrong')).status, 400);
  await send(100, 'whsec');
  assert.equal((await s.call(`/api/orders/${o.orderId}?token=${o.token}`)).json.status, 'pending_payment');
  await send(489700, 'whsec');
  assert.equal((await s.call(`/api/orders/${o.orderId}?token=${o.token}`)).json.status, 'paid');
  s.close();
});

test('admin endpoints need the token', async () => {
  const s = await boot(rzpEnv, fakeRzp);
  const o = (await s.call('/api/orders', { method: 'POST', body: { items, customer, method: 'cod' } })).json;
  assert.equal((await s.call('/api/admin/orders')).status, 401);
  const h = { Authorization: 'Bearer adm' };
  assert.equal((await s.call('/api/admin/orders', { headers: h })).json.length, 1);
  assert.equal((await s.call(`/api/admin/orders/${o.orderId}`, { method: 'PATCH', headers: h, body: { status: 'shipped' } })).status, 200);
  assert.equal((await s.call(`/api/orders/${o.orderId}?token=${o.token}`)).json.status, 'shipped');
  s.close();
  const off = await boot();
  assert.equal((await off.call('/api/admin/orders')).status, 404);
  off.close();
});

test('lens options, shipping fee, coupons', async () => {
  const s = await boot();
  const q = (body) => s.call('/api/quote', { method: 'POST', body });
  const low = (await q({ items: [{ id: 6, color: 'navy', qty: 1 }] })).json; // 999, shipping applies
  assert.deepEqual([low.subtotal, low.shipping, low.total], [999, 79, 1078]);
  const lens = (await q({ items: [{ id: 0, color: 'black', qty: 1, lens: 'prog' }] })).json; // 1499 + 1299
  assert.equal(lens.subtotal, 2798);
  assert.equal((await q({ items: [{ id: 0, color: 'black', qty: 1, lens: 'polar' }] })).status, 400);
  const c = (await q({ items: [{ id: 0, color: 'black', qty: 1, lens: 'prog' }], coupon: 'welcome10' })).json;
  assert.equal(c.discount, 279);
  assert.equal(c.total, 2798 - 279);
  const bad = (await q({ items: [{ id: 6, color: 'navy', qty: 1 }], coupon: 'NOPE' })).json;
  assert.equal(bad.couponError, 'That code is not valid.');
  assert.equal(bad.discount, 0);
  s.close();
});

test('stock is reserved, blocks overselling, and is released on cancel', async () => {
  const s = await boot({ ADMIN_TOKEN: 'adm' });
  const h = { Authorization: 'Bearer adm' };
  const stock = async () => (await s.call('/api/products')).json[6].stock.black;
  assert.equal(await stock(), 2);
  const place = (qty) => s.call('/api/orders', { method: 'POST', body: { items: [{ id: 6, color: 'black', qty }], customer, method: 'cod' } });
  assert.equal((await place(3)).status, 409);
  const ok = await place(2);
  assert.equal(ok.status, 201);
  assert.equal(await stock(), 0);
  assert.equal((await place(1)).status, 409);
  await s.call(`/api/admin/orders/${ok.json.orderId}`, { method: 'PATCH', headers: h, body: { status: 'cancelled' } });
  assert.equal(await stock(), 2);
  assert.equal((await s.call(`/api/admin/orders/${ok.json.orderId}`, { method: 'PATCH', headers: h, body: { status: 'placed' } })).status, 400);
  assert.equal((await s.call('/api/admin/stock', { method: 'PUT', headers: h, body: { product_id: 6, color: 'black', qty: 9 } })).status, 200);
  assert.equal(await stock(), 9);
  const sold = (await s.call('/api/orders', { method: 'POST', body: { items: [{ id: 8, color: 'red', qty: 1 }], customer, method: 'cod' } }));
  assert.equal(sold.status, 409);
  s.close();
});

test('order tracking needs order number and mobile number', async () => {
  const s = await boot({ ADMIN_TOKEN: 'adm' });
  const o = (await s.call('/api/orders', { method: 'POST', body: { items, customer, method: 'cod', coupon: 'CALM200' } })).json;
  assert.equal(o.total, 4897 - 200);
  await s.call(`/api/admin/orders/${o.orderId}`, { method: 'PATCH', headers: { Authorization: 'Bearer adm' }, body: { status: 'shipped', tracking: 'Delhivery 12345' } });
  const t = await s.call('/api/track', { method: 'POST', body: { orderId: o.orderId.toLowerCase(), phone: customer.phone } });
  assert.equal(t.json.status, 'shipped');
  assert.equal(t.json.tracking, 'Delhivery 12345');
  assert.equal((await s.call('/api/track', { method: 'POST', body: { orderId: o.orderId, phone: '9000000000' } })).status, 404);
  s.close();
});
