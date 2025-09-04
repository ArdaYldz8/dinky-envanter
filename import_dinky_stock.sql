-- DINKY DEPO - Gerçek Stok Verileri Import
-- Önce mevcut placeholder verileri temizle
DELETE FROM inventory_movements;
DELETE FROM products;

-- Gerçek DINKY depo verilerini yükle
-- CSV'den çıkarılan veriler: KALAN miktarı current_stock olarak, min_stock_level 10 olarak ayarlandı

INSERT INTO products (product_name, product_code, unit, current_stock, min_stock_level) VALUES
('İŞÇİ ELDİVENİ', 'DİNKY-001', 'Adet', 57, 20),
('EPOXY SİLİKON', 'DİNKY-002', 'Adet', 4, 5),
('DYSON SİLİKON BEYAZ', 'DİNKY-003', 'Adet', 51, 10),
('ANTRASİT GRİ MASTİK', 'DİNKY-004', 'Adet', 17, 5),
('AS KAYNAK 205 KAYNAK MAKİNASİ', 'DİNKY-005', 'Adet', 1, 1),
('PROJEKTÖR 100W', 'DİNKY-006', 'Adet', 5, 2),
('ELEKTRİK PANOSU', 'DİNKY-007', 'Adet', 1, 1),
('GAZ ALTI KAYNAK HORTUMU', 'DİNKY-008', 'Adet', 5, 2),
('350 LİK KESME TAŞI', 'DİNKY-009', 'Adet', 3, 5),
('NİVO NIN CETVELİ', 'DİNKY-010', 'Adet', 1, 1),
('ATİKER ISITICI GAZ ALTI', 'DİNKY-011', 'Adet', 2, 1),
('ŞARJLI MATKAP SETİ', 'DİNKY-012', 'Adet', 1, 1),
('GAZ ALTI KAYNAK PASTASI', 'DİNKY-013', 'Adet', 43, 10),
('HİLTİ BÜYÜK', 'DİNKY-014', 'Adet', 1, 1),
('CRWN MATKAP VİDALAMA', 'DİNKY-015', 'Adet', 2, 1),
('MAKİDA MATKAP VİDALAMA', 'DİNKY-016', 'Adet', 1, 1),
('LAMBA ANAHTARI', 'DİNKY-017', 'Adet', 5, 3),
('PİRİZ', 'DİNKY-018', 'Adet', 2, 2),
('2X75 LİK ZİL KABLOSU', 'DİNKY-019', 'Adet', 1, 1),
('İŞÇİ AYAKKABISI 45 NUMARA', 'DİNKY-020', 'Adet', 2, 2),
('MAKİDA MATKAP VİDALAMA (İKİNCİ)', 'DİNKY-021', 'Adet', 1, 1),
('KORUCU MASKE', 'DİNKY-022', 'Adet', 3, 5),
('İŞÇİ ÖNLÜĞÜ', 'DİNKY-023', 'Adet', 2, 3),
('SARI YELEK', 'DİNKY-024', 'Adet', 50, 20),
('75 LİK BURGU ZIMPARA', 'DİNKY-025', 'Adet', 30, 15),
('100 LÜK BURGU ZIMPARA', 'DİNKY-026', 'Adet', 22, 15),
('75 LİK SAÇAKLI ZIMPARA', 'DİNKY-027', 'Adet', 10, 10),
('65 LİK SAÇAKLI ZIMPARA', 'DİNKY-028', 'Adet', 10, 10),
('180 LİK KESİCİ TAŞ', 'DİNKY-029', 'Adet', 116, 50),
('180 LİK TAŞLAMA TAŞ', 'DİNKY-030', 'Adet', 21, 15),
('115 LİK TAŞLAMA TAŞ', 'DİNKY-031', 'Adet', 32, 20),
('115 LİK 1MM KESME TAŞ', 'DİNKY-032', 'Adet', 200, 50),
('FLAP DİSK ZIMPARA', 'DİNKY-033', 'Adet', 61, 30),
('5 MT LİK METRE', 'DİNKY-034', 'Adet', 7, 10),
('10MT LİK METRE', 'DİNKY-035', 'Adet', 1, 2),
('SPRER BOYA GÖKMAVİSİ', 'DİNKY-036', 'Adet', 3, 5),
('SPRER BOYA PARLAK MAVİ', 'DİNKY-037', 'Adet', 1, 3),
('SPRER BOYA TRAFİK SARI', 'DİNKY-038', 'Adet', 3, 5),
('SPRER BOYA SARI PARLAK', 'DİNKY-039', 'Adet', 2, 3),
('KORUCU GÖZLÜK', 'DİNKY-040', 'Adet', 6, 10),
('110X80M KAYNAK MASKE CAMI', 'DİNKY-041', 'Adet', 96, 50),
('BOYACI MASKESİ FİTRELLİ', 'DİNKY-042', 'Adet', 22, 15),
('İNCE UCULU YILDIZ UCU', 'DİNKY-043', 'Adet', 14, 10),
('KALIN UCULU YILDIZ UCU', 'DİNKY-044', 'Adet', 60, 30),
('UZUN UCULU YILDIZ UCU', 'DİNKY-045', 'Adet', 5, 5),
('MAKET BICAĞI AĞIZ', 'DİNKY-046', 'Adet', 7, 10),
('8MM LOKMA UCU', 'DİNKY-047', 'Adet', 21, 15),
('GAZALTI SERMİK DAĞITICI', 'DİNKY-048', 'Adet', 29, 15),
('1.2 GAZALTI MEME', 'DİNKY-049', 'Adet', 72, 30),
('7.5 GAZALTI MEME', 'DİNKY-050', 'Adet', 7, 5),
('GAZ DAĞITICI SARI BAŞLIK', 'DİNKY-051', 'Adet', 5, 5),
('OKSİJEN MEME', 'DİNKY-052', 'Adet', 3, 3),
('TEL FIRÇA KÜÇÜK', 'DİNKY-053', 'Adet', 4, 5),
('30CM YÖNGE', 'DİNKY-054', 'Adet', 6, 5),
('KELEPÇE 10 LÜK', 'DİNKY-055', 'Adet', 14, 10),
('KADEMELİ MAKTAP UCU', 'DİNKY-056', 'Adet', 1, 2),
('PLASTİK ELDİVEN', 'DİNKY-057', 'Adet', 4, 10),
('230 LÜK AHŞAP TESTERE', 'DİNKY-058', 'Adet', 1, 1),
('RUTİLİ ELEKTROT 3.25 MAGMAWED', 'DİNKY-059', 'Kg', 57, 20),
('ASKAYNAK RUTİLİ ELEKTROT 3.25', 'DİNKY-060', 'Kg', 89, 30),
('GEKA BAZİK ELEKTROT 3.25', 'DİNKY-061', 'Kg', 100, 30),
('ŞEFFAF SİLİKON', 'DİNKY-062', 'Adet', 67, 20),
('DYSON SİLİKON SİYAH', 'DİNKY-063', 'Adet', 25, 10),
('PANEL VİDASI YARIM DİŞ KÜÇÜK', 'DİNKY-064', 'Adet', 5, 10),
('PANEL VİDASI TAM DİŞ', 'DİNKY-065', 'Adet', 18, 15),
('230 LUK KESME TAŞI', 'DİNKY-066', 'Adet', 2335, 100),
('KAĞIT BANT', 'DİNKY-067', 'Adet', 9, 10),
('STRENÇ', 'DİNKY-068', 'Adet', 3, 3),
('GAZALTI TELLİ 1.2', 'DİNKY-069', 'Kg', 89, 30),
('EMLİYET KEMERİ', 'DİNKY-070', 'Adet', 3, 5),
('HALAT', 'DİNKY-071', 'Metre', 30, 10),
('OKSİT ASTAR KIRMIZI', 'DİNKY-072', 'Litre', 16, 5),
('PARLAK KIRMIZI', 'DİNKY-073', 'Litre', 2, 3),
('GRİ ANTİPAS', 'DİNKY-074', 'Litre', 5, 3),
('PARLAK BEYAZ', 'DİNKY-075', 'Litre', 3, 3),
('7016 BOYA', 'DİNKY-076', 'Litre', 19, 5),
('TİNER SELOZİK', 'DİNKY-077', 'Litre', 19, 5),
('20M TİJ 1 MT', 'DİNKY-078', 'Adet', 7, 5),
('22M TİJ 1 MT', 'DİNKY-079', 'Adet', 4, 5),
('24M TİJ 1 MT', 'DİNKY-080', 'Adet', 8, 5),
('SEMER SİYAH', 'DİNKY-081', 'Adet', 73, 30),
('SEMER BEYAZ', 'DİNKY-082', 'Adet', 550, 100),
('ASKAYNAK PLASMA MAKİNE', 'DİNKY-083', 'Adet', 1, 1),
('BARET SARI', 'DİNKY-084', 'Adet', 10, 10);

-- Kritik stok seviyesindeki ürünler (current_stock <= min_stock_level):
-- EPOXY SİLİKON (4 <= 5)
-- 350 LİK KESME TAŞI (3 <= 5) 
-- KORUCU MASKE (3 <= 5)
-- 5 MT LİK METRE (7 <= 10) - yakın
-- SPRER BOYA PARLAK MAVİ (1 <= 3)
-- PLASTİK ELDİVEN (4 <= 10)
-- PANEL VİDASI YARIM DİŞ KÜÇÜK (5 <= 10)

COMMENT ON TABLE products IS 'DINKY Metal gerçek depo stok verileri - 2025-09-03 itibariyle';