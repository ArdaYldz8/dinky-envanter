-- Row Level Security (RLS) Policies for Dinky ERP
-- Bu dosya Supabase'de çalıştırılmalıdır

-- ====================================
-- 1. ENABLE RLS ON ALL TABLES
-- ====================================

-- Enable RLS on employees table
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- Enable RLS on products table
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Enable RLS on inventory_movements table
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;

-- Enable RLS on customers table
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Enable RLS on attendance table
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- Enable RLS on tasks table
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Enable RLS on barcode_scans table
ALTER TABLE barcode_scans ENABLE ROW LEVEL SECURITY;

-- Enable RLS on user_activity_logs table
ALTER TABLE user_activity_logs ENABLE ROW LEVEL SECURITY;

-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- ====================================
-- 2. CREATE HELPER FUNCTIONS
-- ====================================

-- Function to get current user role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
BEGIN
    RETURN COALESCE(
        current_setting('request.jwt.claims', true)::json->>'role',
        'anon'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current user id
CREATE OR REPLACE FUNCTION get_user_id()
RETURNS UUID AS $$
BEGIN
    RETURN COALESCE(
        (current_setting('request.jwt.claims', true)::json->>'sub')::uuid,
        NULL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN get_user_role() = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is warehouse
CREATE OR REPLACE FUNCTION is_warehouse()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN get_user_role() IN ('admin', 'warehouse');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is accounting
CREATE OR REPLACE FUNCTION is_accounting()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN get_user_role() IN ('admin', 'accounting');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================================
-- 3. EMPLOYEES TABLE POLICIES
-- ====================================

-- Admin can do everything
CREATE POLICY "admin_all_employees" ON employees
    FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());

-- Accounting can view and edit employees
CREATE POLICY "accounting_manage_employees" ON employees
    FOR ALL
    USING (is_accounting())
    WITH CHECK (is_accounting());

-- Warehouse can only view active employees
CREATE POLICY "warehouse_view_employees" ON employees
    FOR SELECT
    USING (is_warehouse() AND is_active = true);

-- ====================================
-- 4. PRODUCTS TABLE POLICIES
-- ====================================

-- Admin can do everything
CREATE POLICY "admin_all_products" ON products
    FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());

-- Warehouse can manage products
CREATE POLICY "warehouse_manage_products" ON products
    FOR ALL
    USING (is_warehouse())
    WITH CHECK (is_warehouse());

-- Accounting can only view products
CREATE POLICY "accounting_view_products" ON products
    FOR SELECT
    USING (is_accounting());

-- ====================================
-- 5. INVENTORY MOVEMENTS POLICIES
-- ====================================

-- Admin can do everything
CREATE POLICY "admin_all_inventory" ON inventory_movements
    FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());

-- Warehouse can create and view inventory movements
CREATE POLICY "warehouse_manage_inventory" ON inventory_movements
    FOR ALL
    USING (is_warehouse())
    WITH CHECK (is_warehouse());

-- Accounting can only view inventory movements
CREATE POLICY "accounting_view_inventory" ON inventory_movements
    FOR SELECT
    USING (is_accounting());

-- ====================================
-- 6. CUSTOMERS TABLE POLICIES
-- ====================================

-- Admin can do everything
CREATE POLICY "admin_all_customers" ON customers
    FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());

-- Accounting can manage customers
CREATE POLICY "accounting_manage_customers" ON customers
    FOR ALL
    USING (is_accounting())
    WITH CHECK (is_accounting());

-- Warehouse can only view customers
CREATE POLICY "warehouse_view_customers" ON customers
    FOR SELECT
    USING (is_warehouse());

-- ====================================
-- 7. ATTENDANCE TABLE POLICIES
-- ====================================

-- Admin can do everything
CREATE POLICY "admin_all_attendance" ON attendance
    FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());

-- Accounting can manage attendance
CREATE POLICY "accounting_manage_attendance" ON attendance
    FOR ALL
    USING (is_accounting())
    WITH CHECK (is_accounting());

-- Employees can view their own attendance
CREATE POLICY "employee_view_own_attendance" ON attendance
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM employees
            WHERE employees.id = attendance.employee_id
            AND employees.user_id = get_user_id()
        )
    );

-- ====================================
-- 8. TASKS TABLE POLICIES
-- ====================================

-- Admin can do everything
CREATE POLICY "admin_all_tasks" ON tasks
    FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());

-- Users can view tasks assigned to them
CREATE POLICY "user_view_assigned_tasks" ON tasks
    FOR SELECT
    USING (assigned_to = get_user_id() OR created_by = get_user_id());

-- Users can update their assigned tasks
CREATE POLICY "user_update_assigned_tasks" ON tasks
    FOR UPDATE
    USING (assigned_to = get_user_id())
    WITH CHECK (assigned_to = get_user_id());

-- ====================================
-- 9. BARCODE SCANS POLICIES
-- ====================================

-- Admin can do everything
CREATE POLICY "admin_all_barcode_scans" ON barcode_scans
    FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());

-- Warehouse can manage barcode scans
CREATE POLICY "warehouse_manage_barcode_scans" ON barcode_scans
    FOR ALL
    USING (is_warehouse())
    WITH CHECK (is_warehouse());

-- ====================================
-- 10. USER ACTIVITY LOGS POLICIES
-- ====================================

-- Admin can view all logs
CREATE POLICY "admin_view_logs" ON user_activity_logs
    FOR SELECT
    USING (is_admin());

-- Users can view their own activity logs
CREATE POLICY "user_view_own_logs" ON user_activity_logs
    FOR SELECT
    USING (user_id = get_user_id());

-- System can insert logs (through functions)
CREATE POLICY "system_insert_logs" ON user_activity_logs
    FOR INSERT
    WITH CHECK (true);

-- ====================================
-- 11. USERS TABLE POLICIES
-- ====================================

-- Admin can do everything
CREATE POLICY "admin_all_users" ON users
    FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());

-- Users can view and update their own profile
CREATE POLICY "user_view_own_profile" ON users
    FOR SELECT
    USING (id = get_user_id());

CREATE POLICY "user_update_own_profile" ON users
    FOR UPDATE
    USING (id = get_user_id())
    WITH CHECK (
        id = get_user_id()
        AND role = (SELECT role FROM users WHERE id = get_user_id())
    ); -- Prevent role escalation

-- ====================================
-- 12. GRANT NECESSARY PERMISSIONS
-- ====================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Grant select on all tables to authenticated users
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;

-- Grant specific permissions based on needs
GRANT INSERT, UPDATE ON employees TO authenticated;
GRANT INSERT, UPDATE ON products TO authenticated;
GRANT INSERT ON inventory_movements TO authenticated;
GRANT INSERT, UPDATE ON customers TO authenticated;
GRANT INSERT, UPDATE ON attendance TO authenticated;
GRANT INSERT, UPDATE ON tasks TO authenticated;
GRANT INSERT ON barcode_scans TO authenticated;
GRANT INSERT ON user_activity_logs TO authenticated;
GRANT UPDATE ON users TO authenticated;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION get_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_id() TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION is_warehouse() TO authenticated;
GRANT EXECUTE ON FUNCTION is_accounting() TO authenticated;

-- ====================================
-- 13. CREATE INDEXES FOR PERFORMANCE
-- ====================================

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Index for employee lookups
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees(user_id);
CREATE INDEX IF NOT EXISTS idx_employees_is_active ON employees(is_active);

-- Index for inventory movements
CREATE INDEX IF NOT EXISTS idx_inventory_product_id ON inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movement_date ON inventory_movements(movement_date);

-- Index for attendance
CREATE INDEX IF NOT EXISTS idx_attendance_employee_id ON attendance(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(check_in_time);

-- Index for tasks
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

-- Index for activity logs
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON user_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp ON user_activity_logs(timestamp);

-- ====================================
-- 14. TESTING QUERIES
-- ====================================

-- Test if RLS is enabled
/*
SELECT
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
*/

-- View all policies
/*
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
*/

-- ====================================
-- IMPORTANT NOTES:
-- ====================================
-- 1. Bu script'i Supabase SQL Editor'de çalıştırın
-- 2. RLS'yi etkinleştirdikten sonra, service_role key kullanmadan
--    hiçbir veri görüntülenemez (anon key ile)
-- 3. Tüm API çağrıları authentication header'ı içermelidir
-- 4. Test ederken farklı roller ile giriş yaparak doğrulayın
-- 5. Production'a geçmeden önce tüm politikaları test edin