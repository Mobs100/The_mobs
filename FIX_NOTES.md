# THE MOBS — Order/Admin Fix

## What was fixed
- Admin Orders can open/view an order reliably.
- Admin can edit customer name, phone, address and delivery instructions.
- Admin can assign/unassign an approved driver.
- Admin can update order status, including `Arrived`.
- Admin order details now read `order_items` with `product_price`.
- Admin-created order items now always send `product_price` so NOT NULL errors do not occur.
- Added explicit Supabase RLS policies for admin access to `orders` and `order_items`.
- Added a safe backfill for missing historical `product_price` values from `unit_price` or the product price.
- Admin login now has an `is_mobs_admin()` fallback to the `admin_users` row if the RPC is missing from an older deployment.
- JavaScript syntax was checked for Admin, Customer and Delivery apps.

## IMPORTANT: run the SQL migration
Open Supabase SQL Editor and run the complete `supabase-migration.sql` from this package.

The important new section is:
`ADMIN ORDER ACCESS / ORDER ITEM INTEGRITY`

This is required for the Admin View/Edit buttons to work when Row Level Security is enabled.

## Deploy
From the project root:

```bash
npm install
npm run build
git add .
git commit -m "Fix admin order view editing and order item price"
git push
```

Vercel should build from the source files and regenerate `dist` during deployment.
