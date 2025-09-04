-- Barkod Sistemi için Veritabanı Güncellemeleri

-- Products tablosuna barkod alanı ekle
ALTER TABLE products ADD COLUMN IF NOT EXISTS barcode TEXT UNIQUE;

-- Barkod alanına index ekle (hızlı arama için)
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);

-- Mevcut ürünlere örnek barkodlar ata (gerçekte sizin barkodlarınızı kullanacaksınız)
-- DİNKY ürün kodlarına dayalı örnek barkodlar
UPDATE products SET barcode = '2' || LPAD(SUBSTRING(product_code FROM 'DİNKY-(.*)'), 10, '0') || '5'
WHERE barcode IS NULL AND product_code IS NOT NULL;

-- Barkod arama fonksiyonu
CREATE OR REPLACE FUNCTION find_product_by_barcode(barcode_input TEXT)
RETURNS TABLE (
    id UUID,
    product_name TEXT,
    product_code TEXT,
    barcode TEXT,
    unit TEXT,
    current_stock NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.product_name,
        p.product_code,
        p.barcode,
        p.unit,
        p.current_stock
    FROM products p
    WHERE p.barcode = barcode_input
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Barkod ile stok hareketi eklemek için fonksiyon
CREATE OR REPLACE FUNCTION add_stock_movement_by_barcode(
    barcode_input TEXT,
    movement_type TEXT,
    quantity_input NUMERIC,
    employee_id_input UUID DEFAULT NULL,
    project_id_input UUID DEFAULT NULL,
    description_input TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    product_record RECORD;
    movement_id UUID;
    result JSON;
BEGIN
    -- Barkod ile ürünü bul
    SELECT p.id, p.product_name, p.current_stock, p.unit
    INTO product_record
    FROM products p
    WHERE p.barcode = barcode_input;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Barkod bulunamadı: ' || barcode_input
        );
    END IF;
    
    -- Çıkış için yeterli stok kontrolü
    IF movement_type = 'Çıkış' AND product_record.current_stock < quantity_input THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Yetersiz stok. Mevcut: ' || product_record.current_stock || ' ' || product_record.unit
        );
    END IF;
    
    -- Stok hareketi ekle
    INSERT INTO inventory_movements (
        product_id, type, quantity, employee_id, project_id, description
    ) VALUES (
        product_record.id, movement_type, quantity_input, 
        employee_id_input, project_id_input, description_input
    ) RETURNING id INTO movement_id;
    
    RETURN json_build_object(
        'success', true,
        'movement_id', movement_id,
        'product_name', product_record.product_name,
        'quantity', quantity_input,
        'type', movement_type
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON COLUMN products.barcode IS 'Ürün barkod numarası - benzersiz tanımlayıcı';
COMMENT ON FUNCTION find_product_by_barcode IS 'Barkod ile ürün arama fonksiyonu';
COMMENT ON FUNCTION add_stock_movement_by_barcode IS 'Barkod ile stok hareketi ekleme fonksiyonu';