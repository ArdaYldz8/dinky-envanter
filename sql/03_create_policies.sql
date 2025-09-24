-- ====================================
-- STEP 3: Create RLS Policies (FIXED)
-- Run this after creating functions
-- FOR ALL policies split into individual operations
-- ====================================

-- ====================================
-- USER PROFILES POLICIES
-- ====================================

CREATE POLICY "users_view_own_profile" ON user_profiles
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "admin_select_profiles" ON user_profiles
    FOR SELECT
    USING (is_admin());

CREATE POLICY "admin_insert_profiles" ON user_profiles
    FOR INSERT
    WITH CHECK (is_admin());

CREATE POLICY "admin_update_profiles" ON user_profiles
    FOR UPDATE
    USING (is_admin())
    WITH CHECK (is_admin());

CREATE POLICY "admin_delete_profiles" ON user_profiles
    FOR DELETE
    USING (is_admin());

CREATE POLICY "users_update_own_profile" ON user_profiles
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (
        auth.uid() = user_id
        AND role = (SELECT role FROM user_profiles WHERE user_id = auth.uid())
    );

-- ====================================
-- EMPLOYEES POLICIES
-- ====================================

CREATE POLICY "admin_select_employees" ON employees
    FOR SELECT
    USING (is_admin());

CREATE POLICY "admin_insert_employees" ON employees
    FOR INSERT
    WITH CHECK (is_admin());

CREATE POLICY "admin_update_employees" ON employees
    FOR UPDATE
    USING (is_admin())
    WITH CHECK (is_admin());

CREATE POLICY "admin_delete_employees" ON employees
    FOR DELETE
    USING (is_admin());

CREATE POLICY "accounting_select_employees" ON employees
    FOR SELECT
    USING (is_accounting());

CREATE POLICY "accounting_insert_employees" ON employees
    FOR INSERT
    WITH CHECK (is_accounting());

CREATE POLICY "accounting_update_employees" ON employees
    FOR UPDATE
    USING (is_accounting())
    WITH CHECK (is_accounting());

CREATE POLICY "accounting_delete_employees" ON employees
    FOR DELETE
    USING (is_accounting());

CREATE POLICY "warehouse_view_employees" ON employees
    FOR SELECT
    USING (is_warehouse() AND is_active = true);

-- ====================================
-- PRODUCTS POLICIES
-- ====================================

CREATE POLICY "admin_select_products" ON products
    FOR SELECT
    USING (is_admin());

CREATE POLICY "admin_insert_products" ON products
    FOR INSERT
    WITH CHECK (is_admin());

CREATE POLICY "admin_update_products" ON products
    FOR UPDATE
    USING (is_admin())
    WITH CHECK (is_admin());

CREATE POLICY "admin_delete_products" ON products
    FOR DELETE
    USING (is_admin());

CREATE POLICY "warehouse_select_products" ON products
    FOR SELECT
    USING (is_warehouse());

CREATE POLICY "warehouse_insert_products" ON products
    FOR INSERT
    WITH CHECK (is_warehouse());

CREATE POLICY "warehouse_update_products" ON products
    FOR UPDATE
    USING (is_warehouse())
    WITH CHECK (is_warehouse());

CREATE POLICY "warehouse_delete_products" ON products
    FOR DELETE
    USING (is_warehouse());

CREATE POLICY "accounting_view_products" ON products
    FOR SELECT
    USING (is_accounting());

-- ====================================
-- INVENTORY MOVEMENTS POLICIES
-- ====================================

CREATE POLICY "admin_select_inventory" ON inventory_movements
    FOR SELECT
    USING (is_admin());

CREATE POLICY "admin_insert_inventory" ON inventory_movements
    FOR INSERT
    WITH CHECK (is_admin());

CREATE POLICY "admin_update_inventory" ON inventory_movements
    FOR UPDATE
    USING (is_admin())
    WITH CHECK (is_admin());

CREATE POLICY "admin_delete_inventory" ON inventory_movements
    FOR DELETE
    USING (is_admin());

CREATE POLICY "warehouse_select_inventory" ON inventory_movements
    FOR SELECT
    USING (is_warehouse());

CREATE POLICY "warehouse_insert_inventory" ON inventory_movements
    FOR INSERT
    WITH CHECK (is_warehouse());

CREATE POLICY "warehouse_update_inventory" ON inventory_movements
    FOR UPDATE
    USING (is_warehouse())
    WITH CHECK (is_warehouse());

CREATE POLICY "warehouse_delete_inventory" ON inventory_movements
    FOR DELETE
    USING (is_warehouse());

CREATE POLICY "accounting_view_inventory" ON inventory_movements
    FOR SELECT
    USING (is_accounting());

-- ====================================
-- CUSTOMERS POLICIES
-- ====================================

CREATE POLICY "admin_select_customers" ON customers
    FOR SELECT
    USING (is_admin());

CREATE POLICY "admin_insert_customers" ON customers
    FOR INSERT
    WITH CHECK (is_admin());

CREATE POLICY "admin_update_customers" ON customers
    FOR UPDATE
    USING (is_admin())
    WITH CHECK (is_admin());

CREATE POLICY "admin_delete_customers" ON customers
    FOR DELETE
    USING (is_admin());

CREATE POLICY "accounting_select_customers" ON customers
    FOR SELECT
    USING (is_accounting());

CREATE POLICY "accounting_insert_customers" ON customers
    FOR INSERT
    WITH CHECK (is_accounting());

CREATE POLICY "accounting_update_customers" ON customers
    FOR UPDATE
    USING (is_accounting())
    WITH CHECK (is_accounting());

CREATE POLICY "accounting_delete_customers" ON customers
    FOR DELETE
    USING (is_accounting());

CREATE POLICY "warehouse_view_customers" ON customers
    FOR SELECT
    USING (is_warehouse());

-- ====================================
-- CUSTOMER TRANSACTIONS POLICIES
-- ====================================

CREATE POLICY "admin_select_customer_trans" ON customer_transactions
    FOR SELECT
    USING (is_admin());

CREATE POLICY "admin_insert_customer_trans" ON customer_transactions
    FOR INSERT
    WITH CHECK (is_admin());

CREATE POLICY "admin_update_customer_trans" ON customer_transactions
    FOR UPDATE
    USING (is_admin())
    WITH CHECK (is_admin());

CREATE POLICY "admin_delete_customer_trans" ON customer_transactions
    FOR DELETE
    USING (is_admin());

CREATE POLICY "accounting_select_customer_trans" ON customer_transactions
    FOR SELECT
    USING (is_accounting());

CREATE POLICY "accounting_insert_customer_trans" ON customer_transactions
    FOR INSERT
    WITH CHECK (is_accounting());

CREATE POLICY "accounting_update_customer_trans" ON customer_transactions
    FOR UPDATE
    USING (is_accounting())
    WITH CHECK (is_accounting());

CREATE POLICY "accounting_delete_customer_trans" ON customer_transactions
    FOR DELETE
    USING (is_accounting());

CREATE POLICY "warehouse_view_customer_trans" ON customer_transactions
    FOR SELECT
    USING (is_warehouse());

-- ====================================
-- ATTENDANCE RECORDS POLICIES
-- ====================================

CREATE POLICY "admin_select_attendance" ON attendance_records
    FOR SELECT
    USING (is_admin());

CREATE POLICY "admin_insert_attendance" ON attendance_records
    FOR INSERT
    WITH CHECK (is_admin());

CREATE POLICY "admin_update_attendance" ON attendance_records
    FOR UPDATE
    USING (is_admin())
    WITH CHECK (is_admin());

CREATE POLICY "admin_delete_attendance" ON attendance_records
    FOR DELETE
    USING (is_admin());

CREATE POLICY "accounting_select_attendance" ON attendance_records
    FOR SELECT
    USING (is_accounting());

CREATE POLICY "accounting_insert_attendance" ON attendance_records
    FOR INSERT
    WITH CHECK (is_accounting());

CREATE POLICY "accounting_update_attendance" ON attendance_records
    FOR UPDATE
    USING (is_accounting())
    WITH CHECK (is_accounting());

CREATE POLICY "accounting_delete_attendance" ON attendance_records
    FOR DELETE
    USING (is_accounting());

CREATE POLICY "warehouse_view_attendance" ON attendance_records
    FOR SELECT
    USING (is_warehouse());

-- ====================================
-- PROJECTS POLICIES
-- ====================================

CREATE POLICY "admin_select_projects" ON projects
    FOR SELECT
    USING (is_admin());

CREATE POLICY "admin_insert_projects" ON projects
    FOR INSERT
    WITH CHECK (is_admin());

CREATE POLICY "admin_update_projects" ON projects
    FOR UPDATE
    USING (is_admin())
    WITH CHECK (is_admin());

CREATE POLICY "admin_delete_projects" ON projects
    FOR DELETE
    USING (is_admin());

CREATE POLICY "authenticated_view_projects" ON projects
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "accounting_insert_projects" ON projects
    FOR INSERT
    WITH CHECK (is_accounting());

CREATE POLICY "accounting_update_projects" ON projects
    FOR UPDATE
    USING (is_accounting())
    WITH CHECK (is_accounting());

CREATE POLICY "accounting_delete_projects" ON projects
    FOR DELETE
    USING (is_accounting());

-- ====================================
-- TASKS POLICIES
-- ====================================

CREATE POLICY "admin_select_tasks" ON tasks
    FOR SELECT
    USING (is_admin());

CREATE POLICY "admin_insert_tasks" ON tasks
    FOR INSERT
    WITH CHECK (is_admin());

CREATE POLICY "admin_update_tasks" ON tasks
    FOR UPDATE
    USING (is_admin())
    WITH CHECK (is_admin());

CREATE POLICY "admin_delete_tasks" ON tasks
    FOR DELETE
    USING (is_admin());

CREATE POLICY "accounting_select_tasks" ON tasks
    FOR SELECT
    USING (is_accounting());

CREATE POLICY "accounting_insert_tasks" ON tasks
    FOR INSERT
    WITH CHECK (is_accounting());

CREATE POLICY "accounting_update_tasks" ON tasks
    FOR UPDATE
    USING (is_accounting())
    WITH CHECK (is_accounting());

CREATE POLICY "accounting_delete_tasks" ON tasks
    FOR DELETE
    USING (is_accounting());

CREATE POLICY "employee_view_assigned_tasks" ON tasks
    FOR SELECT
    USING (
        assigned_to_id IN (
            SELECT id FROM employees
        )
    );

CREATE POLICY "employee_update_assigned_tasks" ON tasks
    FOR UPDATE
    USING (
        assigned_to_id IN (
            SELECT id FROM employees
        )
    )
    WITH CHECK (
        assigned_to_id IN (
            SELECT id FROM employees
        )
    );

-- ====================================
-- TRANSACTIONS POLICIES
-- ====================================

CREATE POLICY "admin_select_transactions" ON transactions
    FOR SELECT
    USING (is_admin());

CREATE POLICY "admin_insert_transactions" ON transactions
    FOR INSERT
    WITH CHECK (is_admin());

CREATE POLICY "admin_update_transactions" ON transactions
    FOR UPDATE
    USING (is_admin())
    WITH CHECK (is_admin());

CREATE POLICY "admin_delete_transactions" ON transactions
    FOR DELETE
    USING (is_admin());

CREATE POLICY "accounting_select_transactions" ON transactions
    FOR SELECT
    USING (is_accounting());

CREATE POLICY "accounting_insert_transactions" ON transactions
    FOR INSERT
    WITH CHECK (is_accounting());

CREATE POLICY "accounting_update_transactions" ON transactions
    FOR UPDATE
    USING (is_accounting())
    WITH CHECK (is_accounting());

CREATE POLICY "accounting_delete_transactions" ON transactions
    FOR DELETE
    USING (is_accounting());

-- ====================================
-- ACTIVITY LOGS POLICIES
-- ====================================

CREATE POLICY "admin_view_activity_logs" ON activity_logs
    FOR SELECT
    USING (is_admin());

CREATE POLICY "accounting_view_activity_logs" ON activity_logs
    FOR SELECT
    USING (is_accounting());

CREATE POLICY "system_insert_logs" ON activity_logs
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "user_view_own_logs" ON activity_logs
    FOR SELECT
    USING (
        user_id = auth.uid()
        OR user_name = (SELECT name FROM user_profiles WHERE user_id = auth.uid())
    );

-- ====================================
-- VERIFY POLICIES
-- ====================================

-- Check all policies created
SELECT
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;