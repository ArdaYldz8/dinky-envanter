-- User Authentication and Authorization System
-- Create users table and role-based access control

-- 1. Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'warehouse', 'accounting')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE
);

-- 2. Add user_id to relevant tables for audit trail
ALTER TABLE attendance_records 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);

ALTER TABLE inventory_movements 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);

ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);

-- 3. Create function to hash passwords
CREATE OR REPLACE FUNCTION hash_password(password TEXT)
RETURNS TEXT AS $$
BEGIN
    -- Simple hash for demo - in production use proper bcrypt
    RETURN encode(digest(password || 'dinky_salt_2025', 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql;

-- 4. Create function to verify login
CREATE OR REPLACE FUNCTION verify_user_login(
    user_email TEXT,
    user_password TEXT
)
RETURNS TABLE (
    user_id UUID,
    user_name TEXT,
    user_role TEXT,
    login_success BOOLEAN
) AS $$
DECLARE
    stored_hash TEXT;
    input_hash TEXT;
    v_user_id UUID;
    v_user_name TEXT;
    v_user_role TEXT;
BEGIN
    -- Get user info
    SELECT id, full_name, role, password_hash 
    INTO v_user_id, v_user_name, v_user_role, stored_hash
    FROM users 
    WHERE email = user_email AND is_active = true;
    
    IF v_user_id IS NULL THEN
        RETURN QUERY SELECT 
            NULL::UUID, 
            NULL::TEXT, 
            NULL::TEXT, 
            false;
        RETURN;
    END IF;
    
    -- Verify password
    input_hash := hash_password(user_password);
    
    IF input_hash = stored_hash THEN
        -- Update last login
        UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = v_user_id;
        
        RETURN QUERY SELECT 
            v_user_id,
            v_user_name,
            v_user_role,
            true;
    ELSE
        RETURN QUERY SELECT 
            NULL::UUID,
            NULL::TEXT,
            NULL::TEXT,
            false;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 5. Insert default users
INSERT INTO users (email, password_hash, full_name, role) VALUES
    -- Admin accounts (password: admin123)
    ('admin@dinky.com', hash_password('admin123'), 'Admin Kullanıcı', 'admin'),
    ('yonetim@dinky.com', hash_password('admin123'), 'Yönetim', 'admin'),
    
    -- Warehouse account (password: depo123)
    ('depo@dinky.com', hash_password('depo123'), 'Depo Sorumlusu', 'warehouse'),
    
    -- Accounting account (password: muhasebe123)
    ('muhasebe@dinky.com', hash_password('muhasebe123'), 'Muhasebe Personeli', 'accounting')
ON CONFLICT (email) DO NOTHING;

-- 6. Create view for role permissions
CREATE OR REPLACE VIEW user_permissions AS
SELECT 
    role,
    CASE role
        WHEN 'admin' THEN ARRAY[
            'dashboard.view', 'dashboard.edit',
            'personnel.view', 'personnel.edit', 
            'attendance.view', 'attendance.edit',
            'stock.view', 'stock.edit',
            'reports.view', 'reports.edit',
            'settings.view', 'settings.edit',
            'barcode.view', 'barcode.edit'
        ]
        WHEN 'warehouse' THEN ARRAY[
            'dashboard.view',
            'stock.view', 'stock.edit',
            'barcode.view', 'barcode.edit'
        ]
        WHEN 'accounting' THEN ARRAY[
            'dashboard.view',
            'personnel.view',
            'attendance.view', 'attendance.edit',
            'reports.view', 'reports.edit',
            'transactions.view', 'transactions.edit'
        ]
    END as permissions
FROM (SELECT DISTINCT role FROM users) r;

-- Display created users
SELECT email, full_name, role, 
    CASE role
        WHEN 'admin' THEN 'Tüm yetkiler'
        WHEN 'warehouse' THEN 'Stok ve barkod işlemleri'
        WHEN 'accounting' THEN 'Muhasebe, personel ve raporlama'
    END as yetki_aciklama
FROM users
ORDER BY role, email;