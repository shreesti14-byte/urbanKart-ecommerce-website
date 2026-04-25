# UrbanKart

Multi-vendor e-commerce platform built with HTML, CSS, JavaScript, Node.js, Express, and MongoDB.

## Features

- JWT-based authentication with `admin`, `vendor`, and `customer` roles
- Responsive storefront with category browsing, filtering, sorting, and product details
- Wishlist, cart, checkout, and order tracking for customers
- Product and inventory management dashboard for vendors
- User, vendor, product, and order oversight for admins
- Modular backend with REST APIs, Mongoose models, and starter seed data

## Setup

1. Copy `.env.example` to `.env`
2. Add your MongoDB connection string and JWT secret
3. Install dependencies:

```bash
npm install
```

4. Seed demo data:

```bash
npm run seed
```

5. Start the server:

```bash
npm run dev
```

The app will be available at `http://localhost:5000`.

## Demo Accounts

- Admin: `admin@example.com` / `admin123`
- Vendor: `vendor@example.com` / `vendor123`
- Customer: `customer@example.com` / `customer123`
