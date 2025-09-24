-- ====================================
-- STEP 5: Grant Permissions
-- Run this last
-- ====================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Grant select on all tables to authenticated users
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;

-- Grant specific permissions based on tables
GRANT INSERT, UPDATE, DELETE ON employees TO authenticated;
GRANT INSERT, UPDATE, DELETE ON products TO authenticated;
GRANT INSERT, UPDATE, DELETE ON inventory_movements TO authenticated;
GRANT INSERT, UPDATE, DELETE ON customers TO authenticated;
GRANT INSERT, UPDATE, DELETE ON customer_transactions TO authenticated;
GRANT INSERT, UPDATE, DELETE ON attendance_records TO authenticated;
GRANT INSERT, UPDATE, DELETE ON projects TO authenticated;
GRANT INSERT, UPDATE, DELETE ON tasks TO authenticated;
GRANT INSERT, UPDATE, DELETE ON transactions TO authenticated;
GRANT INSERT ON activity_logs TO authenticated;
GRANT UPDATE ON user_profiles TO authenticated;

-- Grant sequence permissions for auto-increment
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Verify permissions
SELECT
    grantee,
    table_schema,
    table_name,
    privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public'
AND grantee IN ('anon', 'authenticated')
ORDER BY table_name, privilege_type;