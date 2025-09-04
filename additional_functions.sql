-- Additional database functions to fix application issues

-- Function to get low stock products
CREATE OR REPLACE FUNCTION get_low_stock_products()
RETURNS TABLE (
    id UUID,
    product_name TEXT,
    product_code TEXT,
    unit TEXT,
    current_stock NUMERIC,
    min_stock_level NUMERIC,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.product_name,
        p.product_code,
        p.unit,
        p.current_stock,
        p.min_stock_level,
        p.created_at
    FROM products p
    WHERE p.current_stock <= p.min_stock_level
    ORDER BY p.product_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;