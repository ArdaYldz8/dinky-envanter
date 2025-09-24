-- Row Level Security (RLS) Policies for Dinky ERP
-- Updated for existing table structure
-- Bu dosya Supabase SQL Editor'de çalıştırılmalıdır

-- ====================================
-- 1. ENABLE RLS ON ALL EXISTING TABLES
-- ====================================

-- Enable RLS on core tables
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- ====================================
-- 2. CREATE HELPER FUNCTIONS
-- ====================================

-- Function to get current user's profile
CREATE OR REPLACE FUNCTION get_user_profile()
RETURNS JSONB AS $$
DECLARE
    profile JSONB;
BEGIN
    SELECT to_jsonb(user_profiles.*) INTO profile
    FROM user_profiles
    WHERE user_id = auth.uid();

    RETURN COALESCE(profile, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current user role from profile
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
BEGIN
    RETURN COALESCE(
        (SELECT role FROM user_profiles WHERE user_id = auth.uid()),
        'anon'
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

-- Function to check if user has warehouse access
CREATE OR REPLACE FUNCTION is_warehouse()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN get_user_role() IN ('admin', 'warehouse');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has accounting access
CREATE OR REPLACE FUNCTION is_accounting()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN get_user_role() IN ('admin', 'accounting');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================================
-- 3. USER PROFILES TABLE POLICIES
-- ====================================

-- Users can view their own profile
CREATE POLICY "users_view_own_profile" ON user_profiles
    FOR SELECT
    USING (auth.uid() = user_id);

-- Admin can view all profiles
CREATE POLICY "admin_view_all_profiles" ON user_profiles
    FOR SELECT
    USING (is_admin());

-- Admin can manage all profiles
CREATE POLICY "admin_manage_profiles" ON user_profiles
    FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());

-- Users can update their own profile (except role)
CREATE POLICY "users_update_own_profile" ON user_profiles
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (
        auth.uid() = user_id
        AND role = (SELECT role FROM user_profiles WHERE user_id = auth.uid())
    );

-- ====================================
-- 4. EMPLOYEES TABLE POLICIES
-- ====================================

-- Admin can do everything
CREATE POLICY "admin_all_employees" ON employees
    FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());

-- Accounting can manage employees
CREATE POLICY "accounting_manage_employees" ON employees
    FOR ALL
    USING (is_accounting())
    WITH CHECK (is_accounting());

-- Warehouse can view active employees
CREATE POLICY "warehouse_view_employees" ON employees
    FOR SELECT
    USING (is_warehouse() AND is_active = true);

-- ====================================
-- 5. PRODUCTS TABLE POLICIES
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

-- Accounting can view products
CREATE POLICY "accounting_view_products" ON products
    FOR SELECT
    USING (is_accounting());

-- ====================================
-- 6. INVENTORY MOVEMENTS POLICIES
-- ====================================

-- Admin can do everything
CREATE POLICY "admin_all_inventory" ON inventory_movements
    FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());

-- Warehouse can manage inventory movements
CREATE POLICY "warehouse_manage_inventory" ON inventory_movements
    FOR ALL
    USING (is_warehouse())
    WITH CHECK (is_warehouse());

-- Accounting can view inventory movements
CREATE POLICY "accounting_view_inventory" ON inventory_movements
    FOR SELECT
    USING (is_accounting());

-- ====================================
-- 7. CUSTOMERS TABLE POLICIES
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

-- Warehouse can view customers
CREATE POLICY "warehouse_view_customers" ON customers
    FOR SELECT
    USING (is_warehouse());

-- ====================================
-- 8. CUSTOMER TRANSACTIONS POLICIES
-- ====================================

-- Admin can do everything
CREATE POLICY "admin_all_customer_transactions" ON customer_transactions
    FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());

-- Accounting can manage customer transactions
CREATE POLICY "accounting_manage_customer_transactions" ON customer_transactions
    FOR ALL
    USING (is_accounting())
    WITH CHECK (is_accounting());

-- Warehouse can view customer transactions
CREATE POLICY "warehouse_view_customer_transactions" ON customer_transactions
    FOR SELECT
    USING (is_warehouse());

-- ====================================
-- 9. ATTENDANCE RECORDS POLICIES
-- ====================================

-- Admin can do everything
CREATE POLICY "admin_all_attendance" ON attendance_records
    FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());

-- Accounting can manage attendance
CREATE POLICY "accounting_manage_attendance" ON attendance_records
    FOR ALL
    USING (is_accounting())
    WITH CHECK (is_accounting());

-- Warehouse supervisors can view attendance
CREATE POLICY "warehouse_view_attendance" ON attendance_records
    FOR SELECT
    USING (is_warehouse());

-- ====================================
-- 10. PROJECTS TABLE POLICIES
-- ====================================

-- Admin can do everything
CREATE POLICY "admin_all_projects" ON projects
    FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());

-- All authenticated users can view projects
CREATE POLICY "authenticated_view_projects" ON projects
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- Admin and accounting can manage projects
CREATE POLICY "accounting_manage_projects" ON projects
    FOR INSERT, UPDATE, DELETE
    USING (is_accounting())
    WITH CHECK (is_accounting());

-- ====================================
-- 11. TASKS TABLE POLICIES
-- ====================================

-- Admin can do everything
CREATE POLICY "admin_all_tasks" ON tasks
    FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());

-- Users can view tasks assigned to them
CREATE POLICY "employee_view_assigned_tasks" ON tasks
    FOR SELECT
    USING (
        assigned_to_id IN (
            SELECT id FROM employees
            WHERE employees.id = assigned_to_id
        )
    );

-- Users can update their assigned tasks
CREATE POLICY "employee_update_assigned_tasks" ON tasks
    FOR UPDATE
    USING (
        assigned_to_id IN (
            SELECT id FROM employees
            WHERE employees.id = assigned_to_id
        )
    )
    WITH CHECK (
        assigned_to_id IN (
            SELECT id FROM employees
            WHERE employees.id = assigned_to_id
        )
    );

-- Accounting can manage all tasks
CREATE POLICY "accounting_manage_tasks" ON tasks
    FOR ALL
    USING (is_accounting())
    WITH CHECK (is_accounting());

-- ====================================
-- 12. TRANSACTIONS TABLE POLICIES
-- ====================================

-- Admin can do everything
CREATE POLICY "admin_all_transactions" ON transactions
    FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());

-- Accounting can manage all transactions
CREATE POLICY "accounting_manage_transactions" ON transactions
    FOR ALL
    USING (is_accounting())
    WITH CHECK (is_accounting());

-- ====================================
-- 13. ACTIVITY LOGS POLICIES
-- ====================================

-- Admin can view all logs
CREATE POLICY "admin_view_activity_logs" ON activity_logs
    FOR SELECT
    USING (is_admin());

-- Accounting can view logs related to their actions
CREATE POLICY "accounting_view_activity_logs" ON activity_logs
    FOR SELECT
    USING (is_accounting());

-- System can insert logs (no restriction on insert)
CREATE POLICY "system_insert_logs" ON activity_logs
    FOR INSERT
    WITH CHECK (true);

-- Users can view their own activity logs
CREATE POLICY "user_view_own_logs" ON activity_logs
    FOR SELECT
    USING (
        user_id = auth.uid()
        OR user_name = (SELECT name FROM user_profiles WHERE user_id = auth.uid())
    );

-- ====================================
-- 14. GRANT NECESSARY PERMISSIONS
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

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION get_user_profile() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION is_warehouse() TO authenticated;
GRANT EXECUTE ON FUNCTION is_accounting() TO authenticated;

-- ====================================
-- 15. CREATE INDEXES FOR PERFORMANCE
-- ====================================

-- User profiles indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);

-- Employee indexes
CREATE INDEX IF NOT EXISTS idx_employees_is_active ON employees(is_active);
CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department);

-- Product indexes
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_barkod ON products(barkod);
CREATE INDEX IF NOT EXISTS idx_products_product_code ON products(product_code);

-- Inventory movement indexes
CREATE INDEX IF NOT EXISTS idx_inventory_product_id ON inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_project_id ON inventory_movements(project_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movement_date ON inventory_movements(movement_date);
CREATE INDEX IF NOT EXISTS idx_inventory_type ON inventory_movements(type);

-- Customer indexes
CREATE INDEX IF NOT EXISTS idx_customers_is_active ON customers(is_active);
CREATE INDEX IF NOT EXISTS idx_customers_customer_type ON customers(customer_type);
CREATE INDEX IF NOT EXISTS idx_customers_customer_code ON customers(customer_code);

-- Customer transactions indexes
CREATE INDEX IF NOT EXISTS idx_customer_trans_customer_id ON customer_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_trans_type ON customer_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_customer_trans_date ON customer_transactions(transaction_date);

-- Attendance indexes
CREATE INDEX IF NOT EXISTS idx_attendance_employee_id ON attendance_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_project_id ON attendance_records(project_id);
CREATE INDEX IF NOT EXISTS idx_attendance_work_date ON attendance_records(work_date);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendance_records(status);

-- Task indexes
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_tasks_is_completed ON tasks(is_completed);

-- Transaction indexes
CREATE INDEX IF NOT EXISTS idx_transactions_employee_id ON transactions(employee_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);

-- Activity log indexes
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_activity_logs_table_name ON activity_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action_type ON activity_logs(action_type);

-- Project indexes
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

-- ====================================
-- 16. TESTING QUERIES
-- ====================================

-- Check if RLS is enabled on all tables
/*
SELECT
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
    'employees', 'products', 'inventory_movements',
    'customers', 'customer_transactions', 'attendance_records',
    'projects', 'tasks', 'transactions', 'activity_logs',
    'user_profiles'
)
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

-- Test user role function
/*
SELECT get_user_role();
SELECT is_admin();
SELECT is_warehouse();
SELECT is_accounting();
*/

-- ====================================
-- IMPORTANT NOTES:
-- ====================================
-- 1. Bu script'i Supabase SQL Editor'de çalıştırın
-- 2. auth.uid() fonksiyonu Supabase'in authentication sistemini kullanır
-- 3. user_profiles tablosu auth.users ile ilişkilidir
-- 4. RLS'yi etkinleştirdikten sonra, authentication olmadan veri görüntülenemez
-- 5. Tüm API çağrıları JWT token ile authentication header'ı içermelidir
-- 6. Test ederken farklı roller ile giriş yaparak doğrulayın
-- 7. Production'a geçmeden önce tüm politikaları test edin