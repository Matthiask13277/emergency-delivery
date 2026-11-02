-- Emergency Delivery: read-only preflight for a controlled test-data reset.
-- Safe to run in the blitz.cloud SQL query editor: SELECT statements only.
-- This script DOES NOT delete or update any data.

-- 1) Foreign-key relationships, including tables that may depend on customer/order/trip data.
SELECT
  child.relname AS child_table,
  parent.relname AS referenced_table,
  con.conname AS constraint_name,
  pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint con
JOIN pg_class child ON child.oid = con.conrelid
JOIN pg_namespace child_ns ON child_ns.oid = child.relnamespace
JOIN pg_class parent ON parent.oid = con.confrelid
WHERE con.contype = 'f'
  AND child_ns.nspname = 'public'
ORDER BY parent.relname, child.relname, con.conname;

-- 2) Exact counts for the key tables discussed so far.
-- These are separate SELECTs intentionally, so the editor can run them read-only.
SELECT 'users' AS table_name, COUNT(*) AS row_count FROM users
UNION ALL SELECT 'customers', COUNT(*) FROM customers
UNION ALL SELECT 'orders', COUNT(*) FROM orders
UNION ALL SELECT 'trips', COUNT(*) FROM trips
UNION ALL SELECT 'trip_stops', COUNT(*) FROM trip_stops
UNION ALL SELECT 'delivery_documents', COUNT(*) FROM delivery_documents
UNION ALL SELECT 'gps_points', COUNT(*) FROM gps_points
UNION ALL SELECT 'invoices', COUNT(*) FROM invoices
UNION ALL SELECT 'notification_inbox', COUNT(*) FROM notification_inbox
UNION ALL SELECT 'audit_log', COUNT(*) FROM audit_log
ORDER BY table_name;

-- 3) List all public tables, including finance and employee-related tables,
-- so a deletion allowlist can be reviewed before any destructive operation.
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;
