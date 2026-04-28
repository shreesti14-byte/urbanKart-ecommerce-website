# UrbanKart

UrbanKart is a multi-vendor e-commerce platform built with vanilla frontend code, Node.js, Express, and MongoDB.

## Features

- JWT-based authentication with `admin`, `vendor`, and `customer` roles
- Customer storefront with wishlist, cart, checkout, and order tracking
- Refreshed checkout flow with coupons, GST-aware billing, and direct "Buy now" ordering
- Vendor dashboard for product and inventory management
- Admin dashboard for users, vendors, products, and orders
- Product reviews plus per-category GST defaults for catalog items
- Seeded demo catalog with custom catalog image support
- Split frontend structure for easier maintenance

## Project Structure

- `public/js/app-core.js` - shared state, API helpers, utilities, image mapping
- `public/js/app-shell.js` - auth, header, hero, and storefront sections
- `public/js/app-views.js` - customer, catalog, cart, profile, vendor, and admin views
- `public/js/app-actions.js` - render pipeline, handlers, mutations, bootstrap
- `src/config/billing.js` - coupon rules, GST defaults, and shared order bill calculations
- `public/images/catalog/custom/` - custom product images that should be committed

## Setup

1. Copy `.env.example` to `.env`
2. Add your own MongoDB connection string and JWT secret
3. Install dependencies:

```bash
npm install
```

4. Seed demo data when needed:

```bash
npm run seed
```

This also regenerates the catalog SVG assets under `public/images/catalog/`. Only the files in `public/images/catalog/custom/` are meant to be committed.

5. Run validation checks before pushing:

```bash
npm run check
```

6. Start the server:

```bash
npm start
```

For local development with auto-reload:

```bash
npm run dev
```

The app runs on `http://localhost:5002` by default, or on the `PORT` value from your `.env`.

## Demo Accounts

- Admin: `admin@example.com` / `admin123`
- Vendor: `vendor@example.com` / `vendor123`
- Customer: `customer@example.com` / `customer123`
