# Frontend Split Map

Active frontend scripts now load in this order from `public/index.html`:

1. `app-core.js`
   State, constants, API helpers, image selection helpers, shared utilities, bootstrap definition.
2. `app-shell.js`
   Auth screens, customer header, hero, marketing sections, shared storefront blocks.
3. `app-views.js`
   Customer, catalog, cart, orders, profile, vendor, and admin page markup.
4. `app-actions.js`
   Render function, event handlers, mutations, and the final `bootstrap()` call.

The old monolithic `app.js` has been removed. The browser now runs only the split files above.
