-- ========================================
-- DEMO PUBLIC ACCESS POLICIES
-- ========================================
--
-- WARNING: These policies allow PUBLIC read/write access
-- This is for DEMO purposes with localStorage-based authentication
--
-- For PRODUCTION with real Supabase Auth:
-- 1. Remove these policies
-- 2. Use the role-based policies from 03_create_policies.sql
-- 3. Populate user_profiles table with real users
-- ========================================

-- PUBLIC READ POLICIES (SELECT)
-- ========================================

CREATE POLICY "public_read_employees" ON employees
    FOR SELECT USING (true);

CREATE POLICY "public_read_products" ON products
    FOR SELECT USING (true);

CREATE POLICY "public_read_projects" ON projects
    FOR SELECT USING (true);

CREATE POLICY "public_read_attendance" ON attendance_records
    FOR SELECT USING (true);

CREATE POLICY "public_read_inventory" ON inventory_movements
    FOR SELECT USING (true);

CREATE POLICY "public_read_logs" ON activity_logs
    FOR SELECT USING (true);

CREATE POLICY "public_read_customers" ON customers
    FOR SELECT USING (true);

CREATE POLICY "public_read_customer_transactions" ON customer_transactions
    FOR SELECT USING (true);

CREATE POLICY "public_read_transactions" ON transactions
    FOR SELECT USING (true);

CREATE POLICY "public_read_tasks" ON tasks
    FOR SELECT USING (true);

-- PUBLIC WRITE POLICIES (INSERT, UPDATE, DELETE)
-- ========================================

-- Employees
CREATE POLICY "public_insert_employees" ON employees
    FOR INSERT WITH CHECK (true);
CREATE POLICY "public_update_employees" ON employees
    FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "public_delete_employees" ON employees
    FOR DELETE USING (true);

-- Products
CREATE POLICY "public_insert_products" ON products
    FOR INSERT WITH CHECK (true);
CREATE POLICY "public_update_products" ON products
    FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "public_delete_products" ON products
    FOR DELETE USING (true);

-- Projects
CREATE POLICY "public_insert_projects" ON projects
    FOR INSERT WITH CHECK (true);
CREATE POLICY "public_update_projects" ON projects
    FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "public_delete_projects" ON projects
    FOR DELETE USING (true);

-- Attendance Records
CREATE POLICY "public_insert_attendance" ON attendance_records
    FOR INSERT WITH CHECK (true);
CREATE POLICY "public_update_attendance" ON attendance_records
    FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "public_delete_attendance" ON attendance_records
    FOR DELETE USING (true);

-- Inventory Movements
CREATE POLICY "public_insert_inventory" ON inventory_movements
    FOR INSERT WITH CHECK (true);
CREATE POLICY "public_update_inventory" ON inventory_movements
    FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "public_delete_inventory" ON inventory_movements
    FOR DELETE USING (true);

-- Activity Logs (INSERT only - no updates/deletes for audit trail)
CREATE POLICY "public_insert_logs" ON activity_logs
    FOR INSERT WITH CHECK (true);

-- Customers
CREATE POLICY "public_insert_customers" ON customers
    FOR INSERT WITH CHECK (true);
CREATE POLICY "public_update_customers" ON customers
    FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "public_delete_customers" ON customers
    FOR DELETE USING (true);

-- Customer Transactions
CREATE POLICY "public_insert_customer_transactions" ON customer_transactions
    FOR INSERT WITH CHECK (true);
CREATE POLICY "public_update_customer_transactions" ON customer_transactions
    FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "public_delete_customer_transactions" ON customer_transactions
    FOR DELETE USING (true);

-- Transactions
CREATE POLICY "public_insert_transactions" ON transactions
    FOR INSERT WITH CHECK (true);
CREATE POLICY "public_update_transactions" ON transactions
    FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "public_delete_transactions" ON transactions
    FOR DELETE USING (true);

-- Tasks
CREATE POLICY "public_insert_tasks" ON tasks
    FOR INSERT WITH CHECK (true);
CREATE POLICY "public_update_tasks" ON tasks
    FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "public_delete_tasks" ON tasks
    FOR DELETE USING (true);

-- ========================================
-- MIGRATION TO PRODUCTION AUTH
-- ========================================
--
-- When ready for production with real Supabase Auth:
--
-- 1. Drop all public policies:
--    DROP POLICY IF EXISTS public_read_employees ON employees;
--    DROP POLICY IF EXISTS public_insert_employees ON employees;
--    ... (repeat for all tables)
--
-- 2. Create Supabase Auth users
--
-- 3. Populate user_profiles table:
--    INSERT INTO user_profiles (user_id, name, email, role)
--    VALUES (auth.uid(), 'Admin User', 'admin@dinky.com', 'admin');
--
-- 4. The role-based policies from 03_create_policies.sql will then work
-- ========================================