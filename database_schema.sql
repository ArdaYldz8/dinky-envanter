-- Dinky Metal ERP Database Schema
-- Supabase PostgreSQL Database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Employees Table (Personeller)
CREATE TABLE IF NOT EXISTS employees (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    full_name TEXT NOT NULL,
    daily_wage NUMERIC(10,2) NOT NULL CHECK (daily_wage >= 0),
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Projects Table (Projeler)
CREATE TABLE IF NOT EXISTS projects (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_name TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL CHECK (status IN ('Aktif', 'Tamamlandı')) DEFAULT 'Aktif',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Attendance Records Table (Günlük Puantaj Kayıtları)
CREATE TABLE IF NOT EXISTS attendance_records (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    work_date DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('Tam Gün', 'Yarım Gün', 'Gelmedi')) DEFAULT 'Tam Gün',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(employee_id, work_date)
);

-- Financial Transactions Table (Finansal İşlemler - Avans/Kesinti)
CREATE TABLE IF NOT EXISTS transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
    type TEXT NOT NULL CHECK (type IN ('Avans', 'Kesinti')),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Products Table (Ürünler / Stok Kartları)
CREATE TABLE IF NOT EXISTS products (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    product_name TEXT NOT NULL UNIQUE,
    product_code TEXT UNIQUE,
    unit TEXT NOT NULL DEFAULT 'Adet',
    current_stock NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
    min_stock_level NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (min_stock_level >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Inventory Movements Table (Stok Hareketleri)
CREATE TABLE IF NOT EXISTS inventory_movements (
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

-- Indexes for better performance
CREATE INDEX idx_attendance_date ON attendance_records(work_date);
CREATE INDEX idx_attendance_employee ON attendance_records(employee_id);
CREATE INDEX idx_transactions_employee ON transactions(employee_id);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);
CREATE INDEX idx_inventory_product ON inventory_movements(product_id);
CREATE INDEX idx_inventory_date ON inventory_movements(movement_date);

-- Trigger to update product stock on inventory movement
CREATE OR REPLACE FUNCTION update_product_stock() RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.type = 'Giriş' THEN
            UPDATE products 
            SET current_stock = current_stock + NEW.quantity 
            WHERE id = NEW.product_id;
        ELSIF NEW.type = 'Çıkış' THEN
            UPDATE products 
            SET current_stock = current_stock - NEW.quantity 
            WHERE id = NEW.product_id;
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Reverse old movement
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
            UPDATE products 
            SET current_stock = current_stock - NEW.quantity 
            WHERE id = NEW.product_id;
        END IF;
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
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_product_stock
AFTER INSERT OR UPDATE OR DELETE ON inventory_movements
FOR EACH ROW EXECUTE FUNCTION update_product_stock();

-- Sample data for testing
INSERT INTO projects (project_name, status) VALUES
    ('Ana Üretim Hattı', 'Aktif'),
    ('Bakım ve Onarım', 'Aktif'),
    ('Özel Sipariş - A Firması', 'Aktif')
ON CONFLICT DO NOTHING;

INSERT INTO employees (full_name, daily_wage, start_date) VALUES
    ('Ahmet Yılmaz', 500.00, '2023-01-15'),
    ('Mehmet Kaya', 450.00, '2023-03-20'),
    ('Ali Demir', 550.00, '2022-11-10')
ON CONFLICT DO NOTHING;

INSERT INTO products (product_name, product_code, unit, current_stock, min_stock_level) VALUES
    ('Paslanmaz Çelik Levha 2mm', 'PCL-2MM', 'Adet', 150, 50),
    ('Alüminyum Profil 40x40', 'ALP-4040', 'Metre', 200, 75),
    ('Kaynak Teli 2.5mm', 'KT-25', 'Kg', 80, 30)
ON CONFLICT DO NOTHING;