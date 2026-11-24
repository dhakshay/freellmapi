import nodemailer from 'nodemailer';

const money = (n) => '₹' + Number(n).toLocaleString('en-IN');
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// Returns an async send(kind, order) function, or a no-op when SMTP is not configured.
export function createMailer(env = process.env, store) {
  if (!env.SMTP_HOST) return { enabled: false, send: async () => {} };
  const tx = nodemailer.createTransport({
    host: env.SMTP_HOST, port: Number(env.SMTP_PORT) || 587, secure: Number(env.SMTP_PORT) === 465,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
  });
  const from = env.MAIL_FROM || store.email || env.SMTP_USER;
  return {
    enabled: true,
    async send(kind, order) {
      try {
        const to = order.customer?.email;
        if (to) await tx.sendMail({ from, to, ...buildMail(kind, order, store) });
        if (kind === 'placed' && env.ORDER_ALERT_EMAIL) await tx.sendMail({ from, to: env.ORDER_ALERT_EMAIL, ...buildMail('alert', order, store) });
      } catch (e) { console.error('email failed:', e.message); }
    },
  };
}

export function buildMail(kind, o, store) {
  const items = o.items.map((l) => `${l.qty} × ${l.name} (${l.color}, ${l.lensName})`);
  const lines = items.map((t) => `<li>${esc(t)}</li>`).join('');
  const pay = o.method === 'cod' ? `Cash on delivery: ${money(o.total)}` : `Paid online: ${money(o.total)}`;
  const track = o.tracking ? `<p>Courier: ${esc(o.tracking)}</p>` : '';
  const head = { placed: `Your ${store.name} order ${o.id} is confirmed`, shipped: `Your ${store.name} order ${o.id} has shipped`, alert: `New order ${o.id} (${money(o.total)})` }[kind];
  const lead = { placed: 'Thank you for your order. We are getting it ready.', shipped: 'Good news, your order is on its way.', alert: `${esc(o.customer.name)}, ${esc(o.customer.phone)}, ${esc(o.customer.city)}` }[kind];
  const html = `<div style="font-family:system-ui,sans-serif;max-width:520px"><h2 style="font-weight:400">${esc(store.name)}</h2><p>${lead}</p><p><b>Order ${esc(o.id)}</b></p><ul>${lines}</ul><p>${esc(pay)}</p>${track}` +
    (kind === 'alert' ? '' : `<p style="color:#666">Track your order any time with your order number and mobile number${store.baseUrl ? ` at ${esc(store.baseUrl)}` : ''}.${store.email ? ` Questions? Write to ${esc(store.email)}.` : ''}</p>`) + '</div>';
  return { subject: head, html, text: `${head}\n\n${items.join('\n')}\n${pay}${o.tracking ? `\nCourier: ${o.tracking}` : ''}` };
}
