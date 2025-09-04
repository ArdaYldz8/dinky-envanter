-- Clear existing stock data
DELETE FROM inventory_movements;
DELETE FROM products;

-- Reset sequences if needed
-- Note: This will remove all existing stock data and movements