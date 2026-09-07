# THE MOBS — Unified Supabase V4

This version restores the full original Customer, Admin and Delivery interfaces while keeping the Supabase-backed logic.

## Apps
- `/customer/` Customer ordering experience
- `/admin/` Admin console (single admin account)
- `/delivery/` Driver login + application + delivery workflow
- `/` THE MOBS brand landing / MOBS WORLD

## Important
1. Do not commit `node_modules`.
2. Run the migration only after reviewing it against the existing database.
3. Supabase Auth email confirmation must be disabled for the internal driver username-login flow used here.
4. Admin must be present in `public.admin_users`.
