# SG Mobiles — MERN E-commerce Store

A full mobile-accessories store (customer site + admin panel) built with **MongoDB, Express, React (Vite) and Node.js**.

```
sg-mobiles/
├── server/   Express + Mongoose REST API (JWT auth, image uploads, seed data)
└── client/   React storefront + admin panel (/admin)
```

## Quick start

Requires Node 18+.

```bash
# 1. API
cd server
npm install
cp .env.example .env        # then edit values (see below)
npm run dev                 # http://localhost:5000

# 2. Client (new terminal)
cd client
npm install
npm run dev                 # http://localhost:5173
```

On first start the database is seeded automatically (categories, 22 products, banners, coupons and an admin user) if it is empty.

**Admin login:** `admin@sgmobiles.com` / `admin123` (change via `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `.env` before first run) → open http://localhost:5173/admin

### Environment (`server/.env`)

| Key | Description |
| --- | --- |
| `MONGO_URI` | MongoDB connection string (local or Atlas). Set to `memory` to use a throwaway in-memory DB (no install needed, data resets on restart). |
| `JWT_SECRET` | Long random string used to sign login tokens. |
| `CLIENT_URL` | Allowed CORS origin (the React dev URL). |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Credentials for the seeded admin. |
| `PORT` | API port (default 5000). |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Enables the **Pay Online** option (UPI / cards / netbanking). Use test keys from the Razorpay dashboard first. Leave empty for pay-on-delivery only. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | Sends order confirmations, shipping updates and password-reset emails. If `SMTP_HOST` is empty, emails are printed in the server console instead. |

`npm run seed` (in `server/`) wipes and re-seeds the configured database.

### Production

```bash
cd client && npm run build      # outputs client/dist
cd ../server && npm start       # serves the API *and* the built site on :5000
```

## Features

**Customer side**
- Top bar, sticky shrinking header, category search, "Browse Categories" menu with sub-menus, hover dropdowns, mobile off-canvas menu
- Auto-playing hero slider (fade + staggered text, floating image, progress bar, arrows, dots, swipe)
- Today's Deal tiles with shine effect, category chips, product tabs (Featured / Best Sellers / New), promo banner with live countdown, "coming soon" product, brand marquee, testimonials, newsletter
- Product cards with hover zoom, wishlist & quick-view buttons, slide-up Add to Cart
- Shop page: category / price / brand / stock filters, sorting, pagination
- Product page: image gallery with hover zoom, stock status, reviews & ratings, related products
- Slide-in cart drawer with free-shipping progress bar, cart page, checkout with coupons (`SALE35`, `WELCOME100`), COD / UPI
- Accounts: register, login, profile, saved address, password change, order history, cancel order, wishlist
- Public order tracking (order no. + phone) with a status timeline
- Contact form, policy pages, FAQ, 404 page, back-to-top, toasts, scroll-reveal animations (respects reduced-motion)
- Product variants (colour / model / storage, each with own price, stock and image), specifications, SKU & warranty
- Pincode delivery check with estimated delivery date, COD availability and return window
- Live search suggestions, recently viewed products, category-wise product rows on the homepage, category banners
- Online payment via Razorpay (UPI / cards / netbanking) with retry, plus pay-on-delivery
- Courier tracking on orders, return / replacement requests, printable GST invoice
- Forgot / reset password by email, WhatsApp chat button, per-page titles

**Admin side** (`/admin`, admin role only)
- Dashboard: revenue, orders, products, customers, 7-day revenue chart, orders by status, recent orders, low stock, pending returns, unpaid online orders
- Products CRUD with multi-image upload, variants, specs, sale price, stock, homepage tags, coming-soon & visibility toggles, duplicate, CSV import/export
- Categories (with sub-categories, image, banner, "show in menu" / "show on homepage"), customers (role, block)
- Orders: status workflow incl. Out for Delivery, courier + tracking details, notes, returns (approve / reject / received), invoice, CSV export by date
- Coupons with usage limits (total and per customer), homepage banners (hero / deal / promo) with live preview, contact messages
- Store settings: contact, GSTIN, WhatsApp, shipping fee & free-shipping threshold, delivery days, serviceable pincodes, COD on/off / fee / limit, return days, low-stock threshold, social links

## Delivery & order lifecycle

1. Customer checks their pincode on the product page / checkout. Serviceable pincodes, delivery days, COD on/off, COD fee and COD order limit are set in **Admin → Settings**.
2. Order is placed → stock is reserved per product/variant, coupon usage counted, confirmation email sent.
3. Admin moves it through **Pending → Processing → Shipped → Out for Delivery → Delivered**, adding courier, tracking ID/link and expected date. The customer gets an email at each step and sees it on *My Orders* and *Track Order*.
4. Pay-on-delivery orders are marked paid on delivery. Unpaid online orders auto-cancel after 30 minutes and release stock.
5. Within the return window (default 7 days) the customer can request a return/replacement; admin approves → marks received (stock goes back) or rejects.
6. Printable GST invoice for every order (customer and admin).

## Bulk products (CSV)

Admin → Products → **Import CSV**. Columns: `name, category, brand, sku, price, salePrice, stock, image, tags, description, active` (category = slug or name; multiple images/tags separated by `|`). Rows matching an existing SKU (or name) are updated, others are created. **Export CSV** downloads all products; orders can also be exported by date range.

## API overview

| Route | Purpose |
| --- | --- |
| `POST /api/auth/register`, `/login`, `GET/PUT /api/auth/me` | Auth & profile |
| `GET/POST /api/auth/wishlist[/:id]` | Wishlist |
| `GET /api/products` | List (`category`, `q`, `min`, `max`, `brand`, `tag`, `inStock`, `sort`, `page`) |
| `GET /api/products/:slug` | Product + related |
| `POST /api/orders`, `GET /api/orders/mine`, `GET /api/orders/track/:no` | Orders |
| `POST /api/coupons/apply` | Validate coupon |
| `GET /api/banners`, `GET /api/categories`, `GET /api/settings`, `POST /api/contact` | Site content |
| `/api/admin/*` and write routes on the above | Admin only |

Prices, discounts and stock are always recalculated on the server when an order is placed.
