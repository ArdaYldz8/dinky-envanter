-- Dinky Metal ERP - Test Data Cleanup
-- Bu script tüm test/mockup verilerini temizler

-- 1. Önce ilişkili tablolardaki verileri temizle (foreign key constraints)

-- Attendance records'ı temizle
DELETE FROM attendance_records;

-- Transactions (avans/kesinti) temizle  
DELETE FROM transactions;

-- Inventory movements'ı temizle
DELETE FROM inventory_movements;

-- 2. Ana tablolardaki test verilerini temizle

-- Tüm test personellerini sil
DELETE FROM employees;

-- Tüm test projelerini sil
DELETE FROM projects;

-- 3. ID sequence'lerini sıfırla (opsiyonel)
-- Yeni kayıtlar 1'den başlasın istiyorsanız
ALTER SEQUENCE employees_id_seq RESTART WITH 1;
ALTER SEQUENCE projects_id_seq RESTART WITH 1;
ALTER SEQUENCE attendance_records_id_seq RESTART WITH 1;
ALTER SEQUENCE transactions_id_seq RESTART WITH 1;
ALTER SEQUENCE inventory_movements_id_seq RESTART WITH 1;

-- NOT: Products tablosunu temizlemiyoruz çünkü gerçek stok verileri yüklendi
-- Sadece test personel ve proje verilerini temizliyoruz

-- Temizlik sonrası kontrol
SELECT 'Employees count:' as table_name, COUNT(*) as count FROM employees
UNION ALL
SELECT 'Projects count:', COUNT(*) FROM projects
UNION ALL
SELECT 'Attendance records count:', COUNT(*) FROM attendance_records
UNION ALL
SELECT 'Transactions count:', COUNT(*) FROM transactions
UNION ALL
SELECT 'Inventory movements count:', COUNT(*) FROM inventory_movements
UNION ALL
SELECT 'Products count (korundu):', COUNT(*) FROM products;