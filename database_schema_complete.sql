-- Dinky Metal ERP - Complete Database Schema
-- This is the complete schema that should be executed in order

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS inventory_movements CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS attendance_records CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS employees CASCADE;

-- Drop existing functions and triggers
DROP FUNCTION IF EXISTS update_product_stock() CASCADE;

-- Create tables in correct order (dependencies first)

-- 1. Employees Table (no dependencies)
CREATE TABLE employees (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    full_name TEXT NOT NULL,
    daily_wage NUMERIC(10,2) NOT NULL CHECK (daily_wage >= 0),
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Projects Table (no dependencies)
CREATE TABLE projects (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_name TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL CHECK (status IN ('Aktif', 'Tamamlandı')) DEFAULT 'Aktif',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Products Table (no dependencies)
CREATE TABLE products (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    product_name TEXT NOT NULL UNIQUE,
    product_code TEXT UNIQUE,
    unit TEXT NOT NULL DEFAULT 'Adet',
    current_stock NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
    min_stock_level NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (min_stock_level >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Attendance Records Table (depends on employees, projects)
CREATE TABLE attendance_records (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    work_date DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('Tam Gün', 'Yarım Gün', 'Gelmedi')) DEFAULT 'Tam Gün',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(employee_id, work_date)
);

-- 5. Transactions Table (depends on employees)
CREATE TABLE transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
    type TEXT NOT NULL CHECK (type IN ('Avans', 'Kesinti')),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Inventory Movements Table (depends on products, employees, projects)
CREATE TABLE inventory_movements (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    movement_date DATE NOT NULL DEFAULT CURRENT_DATE,
    type TEXT NOT NULL CHECK (type IN ('Giriş', 'Çıkış')),
    quantity NUMERIC(10,2) NOT NULL CHECK (quantity > 0),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_project_on_exit CHECK (
        (type = 'Giriş' AND project_id IS NULL) OR 
        (type = 'Çıkış')
    )
);

-- Create Indexes for better performance
CREATE INDEX idx_attendance_date ON attendance_records(work_date);
CREATE INDEX idx_attendance_employee ON attendance_records(employee_id);
CREATE INDEX idx_transactions_employee ON transactions(employee_id);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);
CREATE INDEX idx_inventory_product ON inventory_movements(product_id);
CREATE INDEX idx_inventory_date ON inventory_movements(movement_date);
CREATE INDEX idx_inventory_type ON inventory_movements(type);
CREATE INDEX idx_employees_active ON employees(is_active);
CREATE INDEX idx_products_stock_level ON products(current_stock, min_stock_level);

-- Create function to update product stock automatically
CREATE OR REPLACE FUNCTION update_product_stock() RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.type = 'Giriş' THEN
            UPDATE products 
            SET current_stock = current_stock + NEW.quantity 
            WHERE id = NEW.product_id;
        ELSIF NEW.type = 'Çıkış' THEN
            -- Check if sufficient stock exists
            IF (SELECT current_stock FROM products WHERE id = NEW.product_id) < NEW.quantity THEN
                RAISE EXCEPTION 'Yetersiz stok: % adet mevcut, % adet talep edildi', 
                    (SELECT current_stock FROM products WHERE id = NEW.product_id), 
                    NEW.quantity;
            END IF;
            UPDATE products 
            SET current_stock = current_stock - NEW.quantity 
            WHERE id = NEW.product_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Reverse old movement first
        IF OLD.type = 'Giriş' THEN
            UPDATE products 
            SET current_stock = current_stock - OLD.quantity 
            WHERE id = OLD.product_id;
        ELSIF OLD.type = 'Çıkış' THEN
            UPDATE products 
            SET current_stock = current_stock + OLD.quantity 
            WHERE id = OLD.product_id;
        END IF;
        
        -- Apply new movement
        IF NEW.type = 'Giriş' THEN
            UPDATE products 
            SET current_stock = current_stock + NEW.quantity 
            WHERE id = NEW.product_id;
        ELSIF NEW.type = 'Çıkış' THEN
            -- Check if sufficient stock exists after reversal
            IF (SELECT current_stock FROM products WHERE id = NEW.product_id) < NEW.quantity THEN
                RAISE EXCEPTION 'Yetersiz stok: % adet mevcut, % adet talep edildi', 
                    (SELECT current_stock FROM products WHERE id = NEW.product_id), 
                    NEW.quantity;
            END IF;
            UPDATE products 
            SET current_stock = current_stock - NEW.quantity 
            WHERE id = NEW.product_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Reverse movement on delete
        IF OLD.type = 'Giriş' THEN
            UPDATE products 
            SET current_stock = current_stock - OLD.quantity 
            WHERE id = OLD.product_id;
        ELSIF OLD.type = 'Çıkış' THEN
            UPDATE products 
            SET current_stock = current_stock + OLD.quantity 
            WHERE id = OLD.product_id;
        END IF;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update stock
CREATE TRIGGER trigger_update_product_stock
    AFTER INSERT OR UPDATE OR DELETE ON inventory_movements
    FOR EACH ROW EXECUTE FUNCTION update_product_stock();

-- Row Level Security (RLS) Policies (optional - can be enabled later)
-- ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE products ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;

-- Sample data for testing
INSERT INTO projects (project_name, status) VALUES
    ('Ana Üretim Hattı', 'Aktif'),
    ('Bakım ve Onarım', 'Aktif'),
    ('Özel Sipariş - A Firması', 'Aktif'),
    ('Tamamlanan Proje Örneği', 'Tamamlandı')
ON CONFLICT (project_name) DO NOTHING;

INSERT INTO employees (full_name, daily_wage, start_date) VALUES
    ('Ahmet Yılmaz', 500.00, '2023-01-15'),
    ('Mehmet Kaya', 450.00, '2023-03-20'),
    ('Ali Demir', 550.00, '2022-11-10'),
    ('Fatma Özkan', 480.00, '2023-02-05'),
    ('Hasan Çelik', 520.00, '2022-12-01')
ON CONFLICT DO NOTHING;

INSERT INTO products (product_name, product_code, unit, current_stock, min_stock_level) VALUES
    ('Paslanmaz Çelik Levha 2mm', 'PCL-2MM', 'Adet', 150, 50),
    ('Alüminyum Profil 40x40', 'ALP-4040', 'Metre', 200, 75),
    ('Kaynak Teli 2.5mm', 'KT-25', 'Kg', 80, 30),
    ('Tornada 8mm', 'TOR-8', 'Adet', 25, 50), -- Bu kritik stok seviyesinde
    ('Civata M8x20', 'CIV-M8-20', 'Paket', 45, 20),
    ('Boya Sprey Siyah', 'BOYA-SYH', 'Adet', 15, 10)
ON CONFLICT (product_name) DO NOTHING;

-- Sample attendance records for current month
INSERT INTO attendance_records (employee_id, work_date, status, project_id)
SELECT 
    e.id,
    CURRENT_DATE - INTERVAL '5 days' + (i || ' days')::INTERVAL,
    CASE 
        WHEN RANDOM() > 0.1 THEN 'Tam Gün'
        WHEN RANDOM() > 0.05 THEN 'Yarım Gün'
        ELSE 'Gelmedi'
    END,
    (SELECT id FROM projects WHERE status = 'Aktif' ORDER BY RANDOM() LIMIT 1)
FROM employees e, generate_series(0, 4) i
WHERE e.is_active = true
ON CONFLICT (employee_id, work_date) DO NOTHING;

-- Sample transactions (advances and deductions)
INSERT INTO transactions (employee_id, type, amount, transaction_date, description)
SELECT 
    id,
    'Avans',
    daily_wage * (1 + RANDOM()),
    CURRENT_DATE - INTERVAL '10 days' + (RANDOM() * 10 || ' days')::INTERVAL,
    'Aylık avans'
FROM employees
WHERE is_active = true AND RANDOM() > 0.3;

-- Grant permissions (adjust as needed for your setup)
-- GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
-- GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- View for easy stock status checking
CREATE VIEW stock_status AS
SELECT 
    p.id,
    p.product_name,
    p.product_code,
    p.unit,
    p.current_stock,
    p.min_stock_level,
    CASE 
        WHEN p.current_stock <= p.min_stock_level THEN 'Kritik'
        WHEN p.current_stock <= p.min_stock_level * 1.5 THEN 'Düşük'
        ELSE 'Normal'
    END as stock_status,
    p.current_stock - p.min_stock_level as stock_difference
FROM products p
ORDER BY stock_difference ASC, p.product_name;

-- View for employee summary
CREATE VIEW employee_summary AS
SELECT 
    e.id,
    e.full_name,
    e.daily_wage,
    e.start_date,
    e.is_active,
    COUNT(DISTINCT ar.work_date) as total_work_days,
    COALESCE(SUM(CASE WHEN t.type = 'Avans' THEN t.amount ELSE 0 END), 0) as total_advances,
    COALESCE(SUM(CASE WHEN t.type = 'Kesinti' THEN t.amount ELSE 0 END), 0) as total_deductions
FROM employees e
LEFT JOIN attendance_records ar ON e.id = ar.employee_id 
    AND ar.status != 'Gelmedi'
    AND ar.work_date >= DATE_TRUNC('month', CURRENT_DATE)
LEFT JOIN transactions t ON e.id = t.employee_id 
    AND t.transaction_date >= DATE_TRUNC('month', CURRENT_DATE)
GROUP BY e.id, e.full_name, e.daily_wage, e.start_date, e.is_active
ORDER BY e.full_name;

COMMENT ON TABLE employees IS 'Personel bilgileri tablosu';
COMMENT ON TABLE projects IS 'Proje tanımları tablosu';
COMMENT ON TABLE products IS 'Ürün/stok kartları tablosu';
COMMENT ON TABLE attendance_records IS 'Günlük puantaj kayıtları';
COMMENT ON TABLE transactions IS 'Finansal işlemler (avans/kesinti)';
COMMENT ON TABLE inventory_movements IS 'Stok hareket kayıtları';
COMMENT ON FUNCTION update_product_stock() IS 'Stok hareketlerinde otomatik stok güncelleme fonksiyonu';