-- Puantaj Kayıtları Temizleme Script
-- Sadece 15.09.2025 ve 16.09.2025 tarihli kayıtları tutar, diğerlerini siler

-- Önce mevcut kayıtları görelim
SELECT work_date, COUNT(*) as kayit_sayisi
FROM attendance_records
GROUP BY work_date
ORDER BY work_date DESC;

-- Silinecek kayıtların sayısını görelim
SELECT COUNT(*) as silinecek_kayit_sayisi
FROM attendance_records
WHERE work_date NOT IN ('2025-09-15', '2025-09-16');

-- 15.09 ve 16.09 dışındaki tüm kayıtları sil
DELETE FROM attendance_records
WHERE work_date NOT IN ('2025-09-15', '2025-09-16');

-- Sonuç kontrolü
SELECT work_date, COUNT(*) as kalan_kayit_sayisi
FROM attendance_records
GROUP BY work_date
ORDER BY work_date;

-- Detaylı kontrol
SELECT
    e.full_name as personel_adi,
    ar.work_date as tarih,
    ar.status as durum,
    ar.overtime_hours as mesai_saati,
    p.project_name as proje
FROM attendance_records ar
LEFT JOIN employees e ON ar.employee_id = e.id
LEFT JOIN projects p ON ar.project_id = p.id
ORDER BY ar.work_date, e.full_name;