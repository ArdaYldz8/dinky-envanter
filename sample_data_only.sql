-- Sample data insertion only (run this if tables are empty)

-- Sample projects
INSERT INTO projects (project_name, status) VALUES
    ('Ana Üretim Hattı', 'Aktif'),
    ('Bakım ve Onarım', 'Aktif'),
    ('Özel Sipariş - A Firması', 'Aktif'),
    ('Tamamlanan Proje Örneği', 'Tamamlandı')
ON CONFLICT (project_name) DO NOTHING;

-- Sample employees
INSERT INTO employees (full_name, daily_wage, start_date) VALUES
    ('Ahmet Yılmaz', 500.00, '2023-01-15'),
    ('Mehmet Kaya', 450.00, '2023-03-20'),
    ('Ali Demir', 550.00, '2022-11-10'),
    ('Fatma Özkan', 480.00, '2023-02-05'),
    ('Hasan Çelik', 520.00, '2022-12-01')
ON CONFLICT DO NOTHING;

-- Sample products (some with low stock)
INSERT INTO products (product_name, product_code, unit, current_stock, min_stock_level) VALUES
    ('Paslanmaz Çelik Levha 2mm', 'PCL-2MM', 'Adet', 150, 50),
    ('Alüminyum Profil 40x40', 'ALP-4040', 'Metre', 200, 75),
    ('Kaynak Teli 2.5mm', 'KT-25', 'Kg', 80, 30),
    ('Tornada 8mm', 'TOR-8', 'Adet', 25, 50), -- Bu kritik stok seviyesinde
    ('Civata M8x20', 'CIV-M8-20', 'Paket', 45, 20),
    ('Boya Sprey Siyah', 'BOYA-SYH', 'Adet', 8, 10) -- Bu da kritik seviyede
ON CONFLICT (product_name) DO NOTHING;

-- Sample recent inventory movements
INSERT INTO inventory_movements (product_id, type, quantity, movement_date, description, employee_id)
SELECT 
    p.id,
    'Giriş',
    50,
    CURRENT_DATE - INTERVAL '2 days',
    'Tedarikçiden geldi',
    (SELECT id FROM employees LIMIT 1)
FROM products p
WHERE p.product_name = 'Paslanmaz Çelik Levha 2mm'
ON CONFLICT DO NOTHING;

INSERT INTO inventory_movements (product_id, type, quantity, movement_date, description, employee_id, project_id)
SELECT 
    p.id,
    'Çıkış',
    15,
    CURRENT_DATE - INTERVAL '1 day',
    'Ana üretim için kullanıldı',
    (SELECT id FROM employees LIMIT 1),
    (SELECT id FROM projects WHERE status = 'Aktif' LIMIT 1)
FROM products p
WHERE p.product_name = 'Kaynak Teli 2.5mm'
ON CONFLICT DO NOTHING;

-- Sample attendance records for last 5 days
INSERT INTO attendance_records (employee_id, work_date, status, project_id)
SELECT 
    e.id,
    CURRENT_DATE - i,
    CASE 
        WHEN RANDOM() > 0.1 THEN 'Tam Gün'
        WHEN RANDOM() > 0.05 THEN 'Yarım Gün'
        ELSE 'Gelmedi'
    END,
    (SELECT id FROM projects WHERE status = 'Aktif' ORDER BY RANDOM() LIMIT 1)
FROM employees e
CROSS JOIN generate_series(0, 4) i
WHERE e.is_active = true
ON CONFLICT (employee_id, work_date) DO NOTHING;

-- Sample transactions (advances)
INSERT INTO transactions (employee_id, type, amount, transaction_date, description)
SELECT 
    id,
    'Avans',
    daily_wage * 2,
    CURRENT_DATE - INTERVAL '5 days',
    'Aylık avans'
FROM employees
WHERE is_active = true AND RANDOM() > 0.5
ON CONFLICT DO NOTHING;