# Frame In

An eyewear store: a static storefront (`public/`) served by a small Node backend (`server/`) with SQLite orders and Razorpay checkout.

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
| `POST /api/orders` | `{items:[{id,color,qty}], customer, method:"cod"\|"online"}`. The server prices the order; client prices are ignored. Returns `orderId` and a secret `token` |
| `POST /api/orders/:id/pay?token=` | Creates the Razorpay order |
| `POST /api/payments/verify` | Checks Razorpay's HMAC signature, then marks the order paid |
| `GET /api/orders/:id?token=` | Order status |
| `POST /api/razorpay/webhook` | Signed Razorpay events |
| `GET /api/admin/orders`, `PATCH /api/admin/orders/:id` | `Authorization: Bearer ADMIN_TOKEN`; statuses: placed, paid, shipped, delivered, cancelled |

## Before going live
- Serve over HTTPS (a reverse proxy such as Caddy or nginx, or a host that terminates TLS).
- Edit `server/products.js` for your real catalog; add real photos if you want them instead of the drawn frames.
- Publish a privacy policy, terms, and refund policy; Razorpay requires them.
- Add order emails/SMS, inventory counts, and shipping charges as needed. These are not built.
- Back up the SQLite file. For several servers or heavy traffic, move to Postgres.
- Orders are kept per customer by a random token held in the browser session of the confirmation page. There are no customer accounts.
