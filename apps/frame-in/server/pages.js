// Server-rendered information pages. The wording is a starting template. Review it against your real business and local law before launch.
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export const SLUGS = ['returns', 'shipping', 'privacy', 'terms', 'faq', 'contact', 'about'];

const contactLine = (s) => [s.email && `Email: <a href="mailto:${esc(s.email)}">${esc(s.email)}</a>`, s.phone && `Phone: ${esc(s.phone)}`, s.address && `Address: ${esc(s.address)}`].filter(Boolean).join('<br>')
  || 'Contact details have not been set yet. The store owner can add them with SUPPORT_EMAIL, SUPPORT_PHONE and STORE_ADDRESS.';

function body(slug, s, ship) {
  const n = esc(s.name);
  switch (slug) {
    case 'about': return ['About ' + n, `<p>${n} sells eyeglasses, sunglasses, screen glasses and kids' frames. Choose a frame, choose your lenses, and we deliver to your door.</p><p>Every frame shows what is in stock, and you can follow your order any time with your order number and mobile number.</p>`];
    case 'shipping': return ['Shipping', `<p>Orders above ₹${ship.freeOver} ship free. Below that, shipping is ₹${ship.fee}.</p><p>Frames with plain or blue-light lenses are prepared first. Prescription lenses take extra time because they are made to your prescription.</p><p>Once your order ships, the order status changes to Shipped and any courier details appear on the Track order screen. We deliver within India.</p>`];
    case 'returns': return ['Returns and refunds', `<p>If your frame is not right for you, contact us within <b>${s.returnDays} days</b> of delivery and we will help you return or exchange it.</p><p>Frames must be unused and in their original packaging. Lenses made to your prescription are custom made, so they can be returned only if they are faulty or do not match the prescription you gave us.</p><p>Refunds go back to the original payment method. For cash on delivery orders we will arrange a bank or UPI transfer.</p><p>To start a return, quote your order number. ${contactLine(s) ? '<br>' + contactLine(s) : ''}</p>`];
    case 'privacy': return ['Privacy', `<p>We collect only what we need to take and deliver your order: your name, mobile number, address, optional email, and any prescription details you give us.</p><p>We use these details to process, ship and support your order. We share them only with the courier who delivers it and, for online payments, with the payment provider (Razorpay), which handles your card or UPI details. We never see or store your card number.</p><p>Your cart and saved frames stay in your own browser. You can ask us to delete your order details by writing to us.</p><p>${contactLine(s)}</p>`];
    case 'terms': return ['Terms of sale', `<p>By placing an order you agree to these terms. Prices are in Indian rupees. We may cancel an order if an item turns out to be unavailable or a price was shown in error, and we will refund anything you have paid.</p><p>Online orders that are not paid within 30 minutes are cancelled and their stock is released.</p><p>Product pictures are illustrations. Frame colors may look slightly different on your screen.</p><p>Eyewear is not medical advice. For an eye test or a prescription, see a qualified eye care professional.</p><p>${contactLine(s)}</p>`];
    case 'faq': return ['Questions', `<h3>Can I order without a prescription?</h3><p>Yes. Choose clear or blue-light lenses with no power, or buy a frame for your own lenses.</p><h3>Can I add my prescription later?</h3><p>Yes. Pick a prescription lens option and leave the prescription box empty. We will ask you for it after you order.</p><h3>How do I track my order?</h3><p>Use Track order with your order number and the mobile number you gave at checkout.</p><h3>What payment methods do you accept?</h3><p>Cash on delivery, and online payment by UPI, cards and netbanking where enabled.</p><h3>How long is an unpaid online order held?</h3><p>30 minutes. After that it is cancelled and the stock is released.</p>`];
    case 'contact': return ['Contact us', `<p>We are happy to help with orders, lenses and returns. Please include your order number.</p><p>${contactLine(s)}</p>`];
    default: return null;
  }
}

export function renderPage(slug, store, ship) {
  const b = body(slug, store, ship);
  if (!b) return null;
  const links = SLUGS.map((x) => `<a href="/p/${x}">${esc({ returns: 'Returns', shipping: 'Shipping', privacy: 'Privacy', terms: 'Terms', faq: 'FAQ', contact: 'Contact', about: 'About' }[x])}</a>`).join(' · ');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(b[0])} · ${esc(store.name)}</title>
<style>:root{--bg:#eef2ef;--panel:#fafbfa;--ink:#1b2a27;--muted:#5f706b;--line:#d3dcd8;--accent:#4a7a6b}
@media (prefers-color-scheme:dark){:root{--bg:#0e1715;--panel:#15211e;--ink:#e8efec;--muted:#94a7a1;--line:#243430;--accent:#7fb3a2;color-scheme:dark}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.7 "Hanken Grotesk",system-ui,sans-serif;padding:24px max(16px,env(safe-area-inset-left,0px))}
main{max-width:720px;margin:0 auto}a{color:var(--accent)}header a.logo{font:400 1.5rem system-ui;text-decoration:none;color:var(--ink)}
article{background:var(--panel);border:1px solid var(--line);border-radius:22px;padding:clamp(20px,4vw,40px);margin:20px 0}
h1{font-weight:300;margin:0 0 12px;font-size:2rem;line-height:1.15}h3{margin:20px 0 4px;font-weight:500}p{margin:0 0 12px}
footer{color:var(--muted);font-size:.9rem}</style></head><body><main><header><a class="logo" href="/">← ${esc(store.name)}</a></header>
<article><h1>${esc(b[0])}</h1>${b[1]}</article><footer>${links}</footer></main></body></html>`;
}
