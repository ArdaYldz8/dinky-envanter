-- ====================================
-- STEP 4: Create Performance Indexes
-- Run this after creating policies
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

-- Check all indexes
SELECT
    tablename,
    indexname
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;