# TODO: Fix Shopping Cart Functionality

## Completed Tasks
- [x] Unified localStorage key to 'productos-en-carrito' in js/carrito.js
- [x] Updated tienda.html navbar to include cart badge (numerito)
- [x] Replaced inline cart script in tienda.html with js/carrito.js
- [x] Ensured TiendaPage.init() handles add-to-cart buttons correctly

## Summary of Changes
- Changed CONFIG.STORAGE_KEY in js/carrito.js from 'tartufo_cart' to 'productos-en-carrito' to match main.js
- Modified tienda.html to use the unified CartManager system instead of custom inline script
- Added cart item count badge to tienda.html navbar for consistency

## Testing
- Products added from tienda.html should now appear in carrito.html
- Cart count should update in navbar badges
- All cart operations (add, remove, update quantity) should work consistently across pages
