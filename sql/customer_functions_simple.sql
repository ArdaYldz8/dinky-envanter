-- Customer Transactions Table (Simplified)
CREATE TABLE IF NOT EXISTS customer_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('Satış', 'Alış', 'Tahsilat', 'Ödeme', 'Borç', 'Alacak')),
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
    document_number VARCHAR(100),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_customer_transactions_customer_id ON customer_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_transactions_date ON customer_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_customer_transactions_type ON customer_transactions(transaction_type);

-- Get customer balance function
CREATE OR REPLACE FUNCTION get_customer_balance(p_customer_id UUID)
RETURNS TABLE(balance DECIMAL(15,2)) AS $$
BEGIN
    RETURN QUERY
    SELECT COALESCE(SUM(
        CASE
            WHEN transaction_type IN ('Satış', 'Alacak', 'Tahsilat') THEN amount
            WHEN transaction_type IN ('Alış', 'Borç', 'Ödeme') THEN -amount
            ELSE 0
        END
    ), 0) as balance
    FROM customer_transactions
    WHERE customer_id = p_customer_id;
END;
$$ LANGUAGE plpgsql;

-- Get customer statement function
CREATE OR REPLACE FUNCTION get_customer_statement(
    p_customer_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE(
    id UUID,
    transaction_date DATE,
    transaction_type VARCHAR(50),
    amount DECIMAL(15,2),
    document_number VARCHAR(100),
    description TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ct.id,
        ct.transaction_date,
        ct.transaction_type,
        ct.amount,
        ct.document_number,
        ct.description
    FROM customer_transactions ct
    WHERE ct.customer_id = p_customer_id
        AND ct.transaction_date >= p_start_date
        AND ct.transaction_date <= p_end_date
    ORDER BY ct.transaction_date DESC, ct.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Get aging report function
CREATE OR REPLACE FUNCTION get_aging_report(p_customer_id UUID DEFAULT NULL)
RETURNS TABLE(
    customer_id UUID,
    company_name VARCHAR(255),
    current_amount DECIMAL(15,2),
    days_30 DECIMAL(15,2),
    days_60 DECIMAL(15,2),
    days_90 DECIMAL(15,2),
    days_over_90 DECIMAL(15,2),
    total DECIMAL(15,2)
) AS $$
BEGIN
    RETURN QUERY
    WITH customer_balances AS (
        SELECT
            c.id as customer_id,
            c.company_name,
            ct.transaction_date,
            CASE
                WHEN ct.transaction_type IN ('Satış', 'Alacak') THEN ct.amount
                WHEN ct.transaction_type IN ('Tahsilat') THEN -ct.amount
                WHEN ct.transaction_type IN ('Alış', 'Borç') THEN -ct.amount
                WHEN ct.transaction_type IN ('Ödeme') THEN ct.amount
                ELSE 0
            END as balance_amount,
            CURRENT_DATE - ct.transaction_date as days_old
        FROM customers c
        LEFT JOIN customer_transactions ct ON c.id = ct.customer_id
        WHERE (p_customer_id IS NULL OR c.id = p_customer_id)
            AND ct.id IS NOT NULL
    ),
    aging_summary AS (
        SELECT
            cb.customer_id,
            cb.company_name,
            SUM(CASE WHEN cb.days_old <= 0 THEN cb.balance_amount ELSE 0 END) as current_amount,
            SUM(CASE WHEN cb.days_old BETWEEN 1 AND 30 THEN cb.balance_amount ELSE 0 END) as days_30,
            SUM(CASE WHEN cb.days_old BETWEEN 31 AND 60 THEN cb.balance_amount ELSE 0 END) as days_60,
            SUM(CASE WHEN cb.days_old BETWEEN 61 AND 90 THEN cb.balance_amount ELSE 0 END) as days_90,
            SUM(CASE WHEN cb.days_old > 90 THEN cb.balance_amount ELSE 0 END) as days_over_90
        FROM customer_balances cb
        GROUP BY cb.customer_id, cb.company_name
    )
    SELECT
        as_data.customer_id,
        as_data.company_name,
        COALESCE(as_data.current_amount, 0) as current_amount,
        COALESCE(as_data.days_30, 0) as days_30,
        COALESCE(as_data.days_60, 0) as days_60,
        COALESCE(as_data.days_90, 0) as days_90,
        COALESCE(as_data.days_over_90, 0) as days_over_90,
        COALESCE(as_data.current_amount, 0) +
        COALESCE(as_data.days_30, 0) +
        COALESCE(as_data.days_60, 0) +
        COALESCE(as_data.days_90, 0) +
        COALESCE(as_data.days_over_90, 0) as total
    FROM aging_summary as_data
    WHERE (
        COALESCE(as_data.current_amount, 0) +
        COALESCE(as_data.days_30, 0) +
        COALESCE(as_data.days_60, 0) +
        COALESCE(as_data.days_90, 0) +
        COALESCE(as_data.days_over_90, 0)
    ) != 0
    ORDER BY as_data.company_name;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS (Row Level Security)
ALTER TABLE customer_transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Enable all access for authenticated users" ON customer_transactions
    FOR ALL USING (auth.role() = 'authenticated');

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_customer_transactions_updated_at
    BEFORE UPDATE ON customer_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL ON customer_transactions TO authenticated;
GRANT EXECUTE ON FUNCTION get_customer_balance TO authenticated;
GRANT EXECUTE ON FUNCTION get_customer_statement TO authenticated;
GRANT EXECUTE ON FUNCTION get_aging_report TO authenticated;