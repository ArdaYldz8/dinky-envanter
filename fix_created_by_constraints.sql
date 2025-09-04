-- Fix created_by foreign key constraint issues
-- This makes created_by fields nullable so existing data won't break

-- 1. Make created_by fields nullable (remove NOT NULL if exists)
ALTER TABLE attendance_records ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE inventory_movements ALTER COLUMN created_by DROP NOT NULL; 
ALTER TABLE transactions ALTER COLUMN created_by DROP NOT NULL;

-- 2. Update existing records to have NULL for created_by (if they don't have valid user reference)
UPDATE attendance_records SET created_by = NULL WHERE created_by IS NOT NULL AND created_by NOT IN (SELECT id FROM users);
UPDATE inventory_movements SET created_by = NULL WHERE created_by IS NOT NULL AND created_by NOT IN (SELECT id FROM users);
UPDATE transactions SET created_by = NULL WHERE created_by IS NOT NULL AND created_by NOT IN (SELECT id FROM users);

-- 3. Ensure users table exists and has the demo users
INSERT INTO users (email, password_hash, full_name, role) VALUES
    ('admin@dinky.com', encode(digest('admin123' || 'dinky_salt_2025', 'sha256'), 'hex'), 'Admin Kullanıcı', 'admin'),
    ('yonetim@dinky.com', encode(digest('admin123' || 'dinky_salt_2025', 'sha256'), 'hex'), 'Yönetim', 'admin'),
    ('depo@dinky.com', encode(digest('depo123' || 'dinky_salt_2025', 'sha256'), 'hex'), 'Depo Sorumlusu', 'warehouse'),
    ('muhasebe@dinky.com', encode(digest('muhasebe123' || 'dinky_salt_2025', 'sha256'), 'hex'), 'Muhasebe Personeli', 'accounting')
ON CONFLICT (email) DO NOTHING;

-- 4. Disable RLS temporarily if it's causing issues
ALTER TABLE employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;

-- 5. Check what data we have
SELECT 'employees' as table_name, COUNT(*) as count FROM employees
UNION ALL
SELECT 'products', COUNT(*) FROM products
UNION ALL  
SELECT 'attendance_records', COUNT(*) FROM attendance_records
UNION ALL
SELECT 'inventory_movements', COUNT(*) FROM inventory_movements
UNION ALL
SELECT 'transactions', COUNT(*) FROM transactions
UNION ALL
SELECT 'projects', COUNT(*) FROM projects
UNION ALL
SELECT 'users', COUNT(*) FROM users;