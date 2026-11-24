# Frame In

A calm, premium eyewear store: a storefront (`public/`) served by a Node backend (`server/`) with SQLite, stock control, lens and prescription options, coupons, shipping rules, order tracking, an admin screen, and Razorpay or cash-on-delivery checkout.

## What's in it
- **Storefront** (`/`): browse by category and shape, search and sort, color swatches, wishlist, product dialog with lens choice and prescription note, cart with coupon and free-shipping progress, checkout, and order tracking.
- **Stock:** each frame color has a count. Orders reserve stock, cancelled orders return it, unpaid online orders are released after 30 minutes, and sold-out colors can't be bought.
- **Lenses:** options and prices per product type (clear, blue-light, polarised, prescription single vision, progressive). The server prices them.
- **Pricing rules:** free shipping above ₹1,499 (otherwise ₹79); coupons `WELCOME10` (10% off) and `CALM200` (₹200 off above ₹1,999). Edit these in `server/products.js`.
- **Tracking** (`Track order`): order number plus the mobile number used at checkout.
- **Admin** (`/admin.html`): sign in with `ADMIN_TOKEN` to update order status and courier details, and to edit stock.

## Run
```bash
cd apps/frame-in
npm install
npm start            # http://localhost:3000
npm test
```
Cash on delivery works with no configuration. Orders are stored in `frame-in.db` (override with `DB_PATH`).

## Online payments (Razorpay)
1. Create a Razorpay account and copy the **test** key id and secret from the dashboard.
2. Start with the keys: `RAZORPAY_KEY_ID=rzp_test_xxx RAZORPAY_KEY_SECRET=xxx npm start`
3. The checkout then offers "Pay online". Use Razorpay's test cards/UPI to try it.
4. Recommended: add a webhook in Razorpay pointing to `https://YOUR-DOMAIN/api/razorpay/webhook` for the events `payment.captured` and `order.paid`, and set `RAZORPAY_WEBHOOK_SECRET` to its secret. This marks orders paid even if the customer closes the tab after paying.
5. Switch to live keys only after Razorpay approves your account (KYC).

## Environment variables
| Name | Purpose |
| --- | --- |
| `PORT` | HTTP port (default 3000) |
| `DB_PATH` | SQLite file (default `frame-in.db`) |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Enable online payments |
| `RAZORPAY_WEBHOOK_SECRET` | Enable the webhook endpoint |
| `ADMIN_TOKEN` | Enable the admin API (unset = disabled) |

## API
| Route | Notes |
| --- | --- |
| `GET /api/products`, `GET /api/config` | Catalog and payment config |
| `POST /api/quote` | `{items, coupon}` returns subtotal, discount, shipping and total |
| `POST /api/track` | `{orderId, phone}` returns order status and courier details |
| `GET/PUT /api/admin/stock` | Admin only: view and set stock per product and color |
| `POST /api/orders` | `{items:[{id,color,qty,lens,rx}], coupon, customer, method:"cod"\|"online"}`. The server prices the order; client prices are ignored. Returns `orderId` and a secret `token` |
| `POST /api/orders/:id/pay?token=` | Creates the Razorpay order |
| `POST /api/payments/verify` | Checks Razorpay's HMAC signature, then marks the order paid |
| `GET /api/orders/:id?token=` | Order status |
| `POST /api/razorpay/webhook` | Signed Razorpay events |
| `GET /api/admin/orders`, `PATCH /api/admin/orders/:id` | `Authorization: Bearer ADMIN_TOKEN`; statuses: placed, paid, shipped, delivered, cancelled |

## Before going live
- Serve over HTTPS (a reverse proxy such as Caddy or nginx, or a host that terminates TLS).
- Edit `server/products.js` for your real catalog; add real photos if you want them instead of the drawn frames.
- Publish a privacy policy, terms, and refund policy; Razorpay requires them.
- Order emails or SMS are not built. Check the admin screen for new orders, or add an email provider.
- Back up the SQLite file. For several servers or heavy traffic, move to Postgres.
- Orders are kept per customer by a random token held in the browser session of the confirmation page. There are no customer accounts.
