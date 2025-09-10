-- Activity Logs System for Admin Monitoring
-- Bu sistem tüm kullanıcı işlemlerini kaydeder

-- Activity logs tablosu oluştur
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    user_name TEXT NOT NULL,
    user_role TEXT NOT NULL,
    action_type TEXT NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT'
    table_name TEXT, -- Hangi tablo etkilendi
    record_id UUID, -- Etkilenen kaydın ID'si
    old_values JSONB, -- Eski değerler
    new_values JSONB, -- Yeni değerler
    description TEXT NOT NULL, -- İşlem açıklaması
    ip_address INET, -- Kullanıcının IP adresi
    user_agent TEXT, -- Browser bilgisi
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index'ler
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_role ON activity_logs(user_role);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action_type ON activity_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_table_name ON activity_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);

-- RLS (Row Level Security) politikaları
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Sadece admin'ler activity logs'u görebilir
CREATE POLICY "Admin can view all activity logs" ON activity_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.user_id = auth.uid() 
            AND user_profiles.role = 'admin'
        )
    );

-- Sadece sistem activity log ekleyebilir (trigger'lar için)
CREATE POLICY "System can insert activity logs" ON activity_logs
    FOR INSERT WITH CHECK (true);

-- Activity log ekleme fonksiyonu
CREATE OR REPLACE FUNCTION log_activity(
    p_user_id UUID,
    p_user_name TEXT,
    p_user_role TEXT,
    p_action_type TEXT,
    p_table_name TEXT,
    p_record_id UUID,
    p_old_values JSONB,
    p_new_values JSONB,
    p_description TEXT,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO activity_logs (
        user_id, user_name, user_role, action_type, table_name,
        record_id, old_values, new_values, description,
        ip_address, user_agent
    ) VALUES (
        p_user_id, p_user_name, p_user_role, p_action_type, p_table_name,
        p_record_id, p_old_values, p_new_values, p_description,
        p_ip_address, p_user_agent
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Products tablosu için trigger
CREATE OR REPLACE FUNCTION products_activity_trigger() 
RETURNS TRIGGER AS $$
DECLARE
    current_user_name TEXT;
    current_user_role TEXT;
    action_desc TEXT;
BEGIN
    -- Kullanıcı bilgilerini al
    SELECT name, role INTO current_user_name, current_user_role
    FROM user_profiles WHERE user_id = auth.uid();
    
    IF current_user_name IS NULL THEN
        current_user_name := 'Sistem';
        current_user_role := 'system';
    END IF;

    IF TG_OP = 'INSERT' THEN
        action_desc := 'Yeni ürün eklendi: ' || NEW.product_name;
        PERFORM log_activity(
            auth.uid(), current_user_name, current_user_role,
            'CREATE', 'products', NEW.id,
            NULL, to_jsonb(NEW), action_desc
        );
        RETURN NEW;
    END IF;

    IF TG_OP = 'UPDATE' THEN
        action_desc := 'Ürün güncellendi: ' || NEW.product_name;
        PERFORM log_activity(
            auth.uid(), current_user_name, current_user_role,
            'UPDATE', 'products', NEW.id,
            to_jsonb(OLD), to_jsonb(NEW), action_desc
        );
        RETURN NEW;
    END IF;

    IF TG_OP = 'DELETE' THEN
        action_desc := 'Ürün silindi: ' || OLD.product_name;
        PERFORM log_activity(
            auth.uid(), current_user_name, current_user_role,
            'DELETE', 'products', OLD.id,
            to_jsonb(OLD), NULL, action_desc
        );
        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Products trigger'ını oluştur
DROP TRIGGER IF EXISTS products_activity_log ON products;
CREATE TRIGGER products_activity_log
    AFTER INSERT OR UPDATE OR DELETE ON products
    FOR EACH ROW EXECUTE FUNCTION products_activity_trigger();

-- Employees tablosu için trigger
CREATE OR REPLACE FUNCTION employees_activity_trigger() 
RETURNS TRIGGER AS $$
DECLARE
    current_user_name TEXT;
    current_user_role TEXT;
    action_desc TEXT;
BEGIN
    SELECT name, role INTO current_user_name, current_user_role
    FROM user_profiles WHERE user_id = auth.uid();
    
    IF current_user_name IS NULL THEN
        current_user_name := 'Sistem';
        current_user_role := 'system';
    END IF;

    IF TG_OP = 'INSERT' THEN
        action_desc := 'Yeni personel eklendi: ' || NEW.full_name;
        PERFORM log_activity(
            auth.uid(), current_user_name, current_user_role,
            'CREATE', 'employees', NEW.id,
            NULL, to_jsonb(NEW), action_desc
        );
        RETURN NEW;
    END IF;

    IF TG_OP = 'UPDATE' THEN
        action_desc := 'Personel güncellendi: ' || NEW.full_name;
        PERFORM log_activity(
            auth.uid(), current_user_name, current_user_role,
            'UPDATE', 'employees', NEW.id,
            to_jsonb(OLD), to_jsonb(NEW), action_desc
        );
        RETURN NEW;
    END IF;

    IF TG_OP = 'DELETE' THEN
        action_desc := 'Personel silindi: ' || OLD.full_name;
        PERFORM log_activity(
            auth.uid(), current_user_name, current_user_role,
            'DELETE', 'employees', OLD.id,
            to_jsonb(OLD), NULL, action_desc
        );
        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Employees trigger'ını oluştur
DROP TRIGGER IF EXISTS employees_activity_log ON employees;
CREATE TRIGGER employees_activity_log
    AFTER INSERT OR UPDATE OR DELETE ON employees
    FOR EACH ROW EXECUTE FUNCTION employees_activity_trigger();

-- Attendance tablosu için trigger
CREATE OR REPLACE FUNCTION attendance_activity_trigger() 
RETURNS TRIGGER AS $$
DECLARE
    current_user_name TEXT;
    current_user_role TEXT;
    employee_name TEXT;
    action_desc TEXT;
BEGIN
    SELECT name, role INTO current_user_name, current_user_role
    FROM user_profiles WHERE user_id = auth.uid();
    
    IF current_user_name IS NULL THEN
        current_user_name := 'Sistem';
        current_user_role := 'system';
    END IF;

    IF TG_OP = 'INSERT' THEN
        SELECT full_name INTO employee_name FROM employees WHERE id = NEW.employee_id;
        action_desc := 'Puantaj kaydı eklendi: ' || COALESCE(employee_name, 'Bilinmeyen') || ' - ' || to_char(NEW.date, 'DD/MM/YYYY');
        PERFORM log_activity(
            auth.uid(), current_user_name, current_user_role,
            'CREATE', 'attendance', NEW.id,
            NULL, to_jsonb(NEW), action_desc
        );
        RETURN NEW;
    END IF;

    IF TG_OP = 'UPDATE' THEN
        SELECT full_name INTO employee_name FROM employees WHERE id = NEW.employee_id;
        action_desc := 'Puantaj kaydı güncellendi: ' || COALESCE(employee_name, 'Bilinmeyen') || ' - ' || to_char(NEW.date, 'DD/MM/YYYY');
        PERFORM log_activity(
            auth.uid(), current_user_name, current_user_role,
            'UPDATE', 'attendance', NEW.id,
            to_jsonb(OLD), to_jsonb(NEW), action_desc
        );
        RETURN NEW;
    END IF;

    IF TG_OP = 'DELETE' THEN
        SELECT full_name INTO employee_name FROM employees WHERE id = OLD.employee_id;
        action_desc := 'Puantaj kaydı silindi: ' || COALESCE(employee_name, 'Bilinmeyen') || ' - ' || to_char(OLD.date, 'DD/MM/YYYY');
        PERFORM log_activity(
            auth.uid(), current_user_name, current_user_role,
            'DELETE', 'attendance', OLD.id,
            to_jsonb(OLD), NULL, action_desc
        );
        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attendance trigger'ını oluştur
DROP TRIGGER IF EXISTS attendance_activity_log ON attendance;
CREATE TRIGGER attendance_activity_log
    AFTER INSERT OR UPDATE OR DELETE ON attendance
    FOR EACH ROW EXECUTE FUNCTION attendance_activity_trigger();

-- Inventory movements için trigger
CREATE OR REPLACE FUNCTION inventory_activity_trigger() 
RETURNS TRIGGER AS $$
DECLARE
    current_user_name TEXT;
    current_user_role TEXT;
    product_name TEXT;
    action_desc TEXT;
BEGIN
    SELECT name, role INTO current_user_name, current_user_role
    FROM user_profiles WHERE user_id = auth.uid();
    
    IF current_user_name IS NULL THEN
        current_user_name := 'Sistem';
        current_user_role := 'system';
    END IF;

    IF TG_OP = 'INSERT' THEN
        SELECT product_name INTO product_name FROM products WHERE id = NEW.product_id;
        action_desc := 'Stok hareketi: ' || COALESCE(product_name, 'Bilinmeyen') || ' - ' || NEW.movement_type || ' (' || NEW.quantity || ')';
        PERFORM log_activity(
            auth.uid(), current_user_name, current_user_role,
            'CREATE', 'inventory_movements', NEW.id,
            NULL, to_jsonb(NEW), action_desc
        );
        RETURN NEW;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Inventory movements trigger'ını oluştur
DROP TRIGGER IF EXISTS inventory_activity_log ON inventory_movements;
CREATE TRIGGER inventory_activity_log
    AFTER INSERT ON inventory_movements
    FOR EACH ROW EXECUTE FUNCTION inventory_activity_trigger();

-- Admin için activity logs view fonksiyonu
CREATE OR REPLACE FUNCTION get_activity_logs(
    limit_count INTEGER DEFAULT 50,
    offset_count INTEGER DEFAULT 0,
    filter_user_role TEXT DEFAULT NULL,
    filter_action_type TEXT DEFAULT NULL,
    filter_table_name TEXT DEFAULT NULL,
    start_date TIMESTAMPTZ DEFAULT NULL,
    end_date TIMESTAMPTZ DEFAULT NULL
) RETURNS TABLE (
    id UUID,
    user_name TEXT,
    user_role TEXT,
    action_type TEXT,
    table_name TEXT,
    description TEXT,
    created_at TIMESTAMPTZ,
    old_values JSONB,
    new_values JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        al.id,
        al.user_name,
        al.user_role,
        al.action_type,
        al.table_name,
        al.description,
        al.created_at,
        al.old_values,
        al.new_values
    FROM activity_logs al
    WHERE 
        (filter_user_role IS NULL OR al.user_role = filter_user_role)
        AND (filter_action_type IS NULL OR al.action_type = filter_action_type)
        AND (filter_table_name IS NULL OR al.table_name = filter_table_name)
        AND (start_date IS NULL OR al.created_at >= start_date)
        AND (end_date IS NULL OR al.created_at <= end_date)
    ORDER BY al.created_at DESC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Activity summary için fonksiyon
CREATE OR REPLACE FUNCTION get_activity_summary(
    days_back INTEGER DEFAULT 7
) RETURNS TABLE (
    total_activities BIGINT,
    admin_activities BIGINT,
    warehouse_activities BIGINT,
    accounting_activities BIGINT,
    today_activities BIGINT,
    most_active_user TEXT,
    most_active_table TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM activity_logs WHERE created_at >= now() - interval '1 day' * days_back) as total_activities,
        (SELECT COUNT(*) FROM activity_logs WHERE user_role = 'admin' AND created_at >= now() - interval '1 day' * days_back) as admin_activities,
        (SELECT COUNT(*) FROM activity_logs WHERE user_role = 'warehouse' AND created_at >= now() - interval '1 day' * days_back) as warehouse_activities,
        (SELECT COUNT(*) FROM activity_logs WHERE user_role = 'accounting' AND created_at >= now() - interval '1 day' * days_back) as accounting_activities,
        (SELECT COUNT(*) FROM activity_logs WHERE DATE(created_at) = CURRENT_DATE) as today_activities,
        (SELECT user_name FROM activity_logs WHERE created_at >= now() - interval '1 day' * days_back GROUP BY user_name ORDER BY COUNT(*) DESC LIMIT 1) as most_active_user,
        (SELECT table_name FROM activity_logs WHERE created_at >= now() - interval '1 day' * days_back AND table_name IS NOT NULL GROUP BY table_name ORDER BY COUNT(*) DESC LIMIT 1) as most_active_table;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;