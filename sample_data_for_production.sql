-- Sample Data for Production Environment
-- Run this in Supabase SQL Editor after main schema

-- 1. Insert Projects (if not exists)
INSERT INTO projects (project_name, status) VALUES
    ('Ana Üretim Hattı', 'Aktif'),
    ('Bakım ve Onarım', 'Aktif'),
    ('Özel Sipariş - A Firması', 'Aktif'),
    ('Metal İşleme', 'Aktif'),
    ('Kalite Kontrol', 'Aktif'),
    ('Tamamlanan Proje Örneği', 'Tamamlandı')
ON CONFLICT (project_name) DO NOTHING;

-- 2. Insert Sample Employees
INSERT INTO employees (full_name, daily_wage, start_date) VALUES
    ('Ali Veli', 350.00, '2024-01-15'),
    ('Ayşe Yılmaz', 320.00, '2024-02-01'),
    ('Mehmet Kaya', 380.00, '2023-11-10'),
    ('Fatma Demir', 340.00, '2024-03-05'),
    ('Ahmet Öztürk', 360.00, '2024-01-20'),
    ('Zeynep Aktaş', 330.00, '2024-02-15'),
    ('Mustafa Çelik', 370.00, '2023-12-01'),
    ('Elif Arslan', 325.00, '2024-03-10'),
    ('Osman Kara', 385.00, '2023-10-15'),
    ('Meryem Polat', 345.00, '2024-02-28')
ON CONFLICT (full_name) DO NOTHING;

-- 3. Insert Sample Products with Barcodes
INSERT INTO products (product_name, product_code, unit, current_stock, min_stock_level, barcode) VALUES
    ('Çelik Profil 40x40', 'PRF-001', 'Metre', 150.5, 50.0, '8699123001001'),
    ('Alüminyum Levha 2mm', 'LEV-002', 'Adet', 45, 20, '8699123001002'),
    ('Paslanmaz Çubuk 12mm', 'CUB-003', 'Metre', 89.2, 25.0, '8699123001003'),
    ('Demir Boru 32mm', 'BOR-004', 'Metre', 203.8, 75.0, '8699123001004'),
    ('Kaynak Elektrodu 3.25', 'KAY-005', 'Kg', 12.5, 5.0, '8699123001005'),
    ('Metal Kesici Disk', 'KES-006', 'Adet', 28, 15, '8699123001006'),
    ('Çelik Tel 4mm', 'TEL-007', 'Kg', 67.3, 20.0, '8699123001007'),
    ('Alüminyum Profil L', 'PRF-008', 'Metre', 134.6, 40.0, '8699123001008'),
    ('Galvaniz Levha', 'LEV-009', 'Adet', 33, 12, '8699123001009'),
    ('Metal Boyası', 'BOY-010', 'Litre', 18.5, 8.0, '8699123001010')
ON CONFLICT (product_name) DO NOTHING;

-- 4. Insert Sample Attendance Records (last 7 days)
WITH sample_attendance AS (
    SELECT 
        e.id as employee_id,
        (CURRENT_DATE - INTERVAL '1 day' * generate_series(0, 6)) as work_date,
        CASE 
            WHEN random() > 0.15 THEN 'Tam Gün'
            WHEN random() > 0.05 THEN 'Yarım Gün'
            ELSE 'Gelmedi'
        END as status,
        CASE 
            WHEN random() > 0.7 THEN (random() * 4)::numeric(4,2)
            ELSE 0
        END as overtime_hours,
        (SELECT id FROM projects WHERE status = 'Aktif' ORDER BY random() LIMIT 1) as project_id
    FROM employees e
    CROSS JOIN generate_series(0, 6) day_offset
    WHERE e.is_active = true
)
INSERT INTO attendance_records (employee_id, work_date, status, overtime_hours, project_id)
SELECT employee_id, work_date, status, overtime_hours, project_id
FROM sample_attendance
ON CONFLICT (employee_id, work_date) DO NOTHING;

-- 5. Insert Sample Inventory Movements
WITH sample_movements AS (
    SELECT 
        p.id as product_id,
        (SELECT id FROM employees ORDER BY random() LIMIT 1) as employee_id,
        (SELECT id FROM projects WHERE status = 'Aktif' ORDER BY random() LIMIT 1) as project_id,
        (CURRENT_DATE - INTERVAL '1 day' * (random() * 30)::int) as movement_date,
        CASE WHEN random() > 0.5 THEN 'Giriş' ELSE 'Çıkış' END as type,
        (random() * 50 + 1)::numeric(8,2) as quantity,
        CASE 
            WHEN random() > 0.5 THEN 'Satın alma'
            WHEN random() > 0.3 THEN 'Üretim için kullanım'
            ELSE 'Transfer'
        END as description
    FROM products p
    CROSS JOIN generate_series(1, 3) -- Each product gets 3 movements
)
INSERT INTO inventory_movements (product_id, employee_id, project_id, movement_date, type, quantity, description)
SELECT product_id, employee_id, project_id, movement_date, type, quantity, description
FROM sample_movements;

-- 6. Insert Sample Transactions (Advances and Deductions)
WITH sample_transactions AS (
    SELECT 
        e.id as employee_id,
        (CURRENT_DATE - INTERVAL '1 day' * (random() * 30)::int) as transaction_date,
        CASE 
            WHEN random() > 0.6 THEN (random() * 1000 + 100)::numeric(10,2)
            ELSE (random() * 300 + 50)::numeric(10,2)
        END as amount,
        CASE WHEN random() > 0.7 THEN 'Avans' ELSE 'Kesinti' END as type,
        CASE 
            WHEN random() > 0.7 THEN 'Maaş avansı'
            WHEN random() > 0.5 THEN 'SGK kesintisi'
            WHEN random() > 0.3 THEN 'Vergi kesintisi'
            ELSE 'Diğer'
        END as description
    FROM employees e
    WHERE e.is_active = true AND random() > 0.3 -- 70% of employees get transactions
)
INSERT INTO transactions (employee_id, transaction_date, amount, type, description)
SELECT employee_id, transaction_date, amount, type, description
FROM sample_transactions;

-- 7. Update product stocks based on movements (simulate realistic stock levels)
UPDATE products SET current_stock = GREATEST(0, 
    current_stock + (
        SELECT COALESCE(
            SUM(CASE WHEN type = 'Giriş' THEN quantity ELSE -quantity END), 0
        )
        FROM inventory_movements 
        WHERE product_id = products.id
    )
);

-- 8. Display summary
SELECT 
    'Data inserted successfully!' as message,
    (SELECT COUNT(*) FROM employees) as employees_count,
    (SELECT COUNT(*) FROM products) as products_count,
    (SELECT COUNT(*) FROM projects) as projects_count,
    (SELECT COUNT(*) FROM attendance_records) as attendance_count,
    (SELECT COUNT(*) FROM inventory_movements) as movements_count,
    (SELECT COUNT(*) FROM transactions) as transactions_count;