-- Fix missing columns in database tables

-- 1. Add barcode column to products table if not exists
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS barcode TEXT;

-- 2. Add unit_weight column to products table if not exists  
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS unit_weight DECIMAL(10, 2) DEFAULT 0;

-- 3. Ensure inventory_movements has all required columns
ALTER TABLE inventory_movements
ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES products(id),
ADD COLUMN IF NOT EXISTS type VARCHAR(20),
ADD COLUMN IF NOT EXISTS quantity DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES employees(id),
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id),
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS movement_date DATE,
ADD COLUMN IF NOT EXISTS created_by UUID,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- 4. Create inventory_movements table if it doesn't exist
CREATE TABLE IF NOT EXISTS inventory_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('Giriş', 'Çıkış')),
    quantity DECIMAL(10, 2) NOT NULL CHECK (quantity > 0),
    employee_id UUID REFERENCES employees(id),
    project_id UUID REFERENCES projects(id),
    description TEXT,
    movement_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Create index for better performance
CREATE INDEX IF NOT EXISTS idx_inventory_movements_product_id ON inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_movement_date ON inventory_movements(movement_date);

-- 6. Grant permissions
GRANT ALL ON inventory_movements TO authenticated;
GRANT ALL ON inventory_movements TO anon;