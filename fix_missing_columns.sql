-- Fix missing columns and constraints

-- 1. Add barcode column to products if missing
ALTER TABLE products ADD COLUMN IF NOT EXISTS barcode text UNIQUE;

-- 2. Make full_name unique in employees table (if not already)
ALTER TABLE employees ADD CONSTRAINT employees_full_name_unique UNIQUE (full_name);

-- 3. Check current schema
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('employees', 'products', 'attendance_records', 'projects')
ORDER BY table_name, ordinal_position;