-- Quality Control System Database Tables
-- Kalite Kontrol Sistemi Veritabanı Tabloları

-- 1. Quality Issues Table - Ana hata takip tablosu
CREATE TABLE quality_issues (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    issue_title VARCHAR(255) NOT NULL,
    issue_description TEXT NOT NULL,
    issue_location VARCHAR(255), -- Şantiye/lokasyon bilgisi
    priority_level VARCHAR(20) DEFAULT 'medium' CHECK (priority_level IN ('low', 'medium', 'high', 'critical')),
    status VARCHAR(20) DEFAULT 'reported' CHECK (status IN ('reported', 'assigned', 'in_progress', 'fixed', 'review', 'approved', 'rejected')),

    -- Reporter (Rapor Eden Kişi)
    reporter_id UUID REFERENCES employees(id),
    reporter_notes TEXT,

    -- Assigned Worker (Atanan Usta)
    assigned_to UUID REFERENCES employees(id),
    assigned_date TIMESTAMP,

    -- Supervisor (Kontrol Eden)
    supervisor_id UUID REFERENCES employees(id),

    -- Before/After Photos
    before_photo_url TEXT,
    after_photo_url TEXT,

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    started_at TIMESTAMP, -- İş başlangıç zamanı
    completed_at TIMESTAMP, -- İş bitiş zamanı
    reviewed_at TIMESTAMP, -- Kontrol zamanı
    approved_at TIMESTAMP, -- Onay zamanı

    -- Metadata
    estimated_fix_time INTEGER, -- Tahmini çözüm süresi (dakika)
    actual_fix_time INTEGER, -- Gerçek çözüm süresi (dakika)
    created_by UUID REFERENCES employees(id),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Issue Comments - Hata yorumları ve notları
CREATE TABLE issue_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    issue_id UUID REFERENCES quality_issues(id) ON DELETE CASCADE,
    user_id UUID REFERENCES employees(id),
    comment_text TEXT NOT NULL,
    comment_type VARCHAR(20) DEFAULT 'general' CHECK (comment_type IN ('general', 'progress', 'solution', 'review')),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Issue History - Durum değişiklik geçmişi
CREATE TABLE issue_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    issue_id UUID REFERENCES quality_issues(id) ON DELETE CASCADE,
    user_id UUID REFERENCES employees(id),
    old_status VARCHAR(20),
    new_status VARCHAR(20),
    change_reason TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 4. Issue Categories - Hata kategorileri
CREATE TABLE issue_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    category_name VARCHAR(100) NOT NULL UNIQUE,
    category_description TEXT,
    color_code VARCHAR(7) DEFAULT '#808080', -- Hex color
    created_at TIMESTAMP DEFAULT NOW()
);

-- 5. Issue-Category İlişki tablosu
CREATE TABLE issue_category_mapping (
    issue_id UUID REFERENCES quality_issues(id) ON DELETE CASCADE,
    category_id UUID REFERENCES issue_categories(id) ON DELETE CASCADE,
    PRIMARY KEY (issue_id, category_id)
);

-- 6. Quality Metrics - Kalite metrikleri
CREATE TABLE quality_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE DEFAULT CURRENT_DATE,
    total_issues INTEGER DEFAULT 0,
    resolved_issues INTEGER DEFAULT 0,
    avg_resolution_time NUMERIC(10,2), -- Ortalama çözüm süresi (saat)
    pending_reviews INTEGER DEFAULT 0,
    approved_issues INTEGER DEFAULT 0,
    rejected_issues INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- İndeksler (Performance için)
CREATE INDEX idx_quality_issues_status ON quality_issues(status);
CREATE INDEX idx_quality_issues_assigned_to ON quality_issues(assigned_to);
CREATE INDEX idx_quality_issues_reporter_id ON quality_issues(reporter_id);
CREATE INDEX idx_quality_issues_created_at ON quality_issues(created_at);
CREATE INDEX idx_quality_issues_priority ON quality_issues(priority_level);
CREATE INDEX idx_issue_comments_issue_id ON issue_comments(issue_id);
CREATE INDEX idx_issue_history_issue_id ON issue_history(issue_id);

-- Trigger: Update updated_at otomatik olarak
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_quality_issues_updated_at
    BEFORE UPDATE ON quality_issues
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Varsayılan kategoriler ekle
INSERT INTO issue_categories (category_name, category_description, color_code) VALUES
('Yapısal Hata', 'Yapısal entegrite ile ilgili hatalar', '#FF4444'),
('Elektrik', 'Elektrik sistemi hataları', '#FFD700'),
('Su Tesisatı', 'Su ve tesisat ile ilgili hatalar', '#4169E1'),
('Boyama/Kaplama', 'Boyama ve kaplama hataları', '#32CD32'),
('Güvenlik', 'İş güvenliği ile ilgili hatalar', '#FF8C00'),
('Temizlik', 'Temizlik ve hijyen hataları', '#20B2AA'),
('Diğer', 'Kategorize edilmemiş hatalar', '#808080');

COMMENT ON TABLE quality_issues IS 'Ana kalite kontrol hata takip tablosu';
COMMENT ON TABLE issue_comments IS 'Hata raporları için yorum sistemi';
COMMENT ON TABLE issue_history IS 'Hata durumu değişiklik geçmişi';
COMMENT ON TABLE issue_categories IS 'Hata kategorileri tanımları';
COMMENT ON TABLE quality_metrics IS 'Günlük kalite metrikleri';