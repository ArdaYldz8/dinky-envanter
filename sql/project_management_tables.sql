-- Proje Takip Sistemi Veritabanı Şeması
-- Project Management System Database Schema

-- Ana Projeler Tablosu
-- Main Projects Table
CREATE TABLE IF NOT EXISTS projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_code VARCHAR(50) UNIQUE NOT NULL, -- H.K.1, H.K.2 gibi kodlar
    project_name VARCHAR(255) NOT NULL,
    description TEXT,
    customer_id UUID REFERENCES customers(id),
    project_manager_id UUID REFERENCES employees(id),

    -- Durum ve öncelik
    status VARCHAR(50) DEFAULT 'Planlanıyor' CHECK (status IN (
        'Planlanıyor', 'Başlatıldı', 'Devam Ediyor', 'Beklemede',
        'Tamamlandı', 'İptal Edildi', 'Ertelendi'
    )),
    priority VARCHAR(20) DEFAULT 'Orta' CHECK (priority IN ('Düşük', 'Orta', 'Yüksek', 'Kritik')),

    -- Tarih bilgileri
    planned_start_date DATE,
    planned_end_date DATE,
    actual_start_date DATE,
    actual_end_date DATE,

    -- Mali bilgiler
    estimated_budget DECIMAL(15,2),
    actual_cost DECIMAL(15,2) DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'TRY',

    -- İlerleme
    overall_progress INTEGER DEFAULT 0 CHECK (overall_progress >= 0 AND overall_progress <= 100),

    -- Meta veriler
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES employees(id),

    -- Ekstra JSON alanı gelecek özellikler için
    metadata JSONB DEFAULT '{}'::JSONB
);

-- Proje Aşamaları Tablosu (Ana aşamalar: H.K.1, H.K.2, H.K.3)
-- Project Phases Table (Main phases: H.K.1, H.K.2, H.K.3)
CREATE TABLE IF NOT EXISTS project_phases (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    phase_code VARCHAR(50) NOT NULL, -- H.K.1, H.K.2, H.K.3
    phase_name VARCHAR(255) NOT NULL,
    description TEXT,

    -- Sıralama ve hiyerarşi
    order_number INTEGER NOT NULL,
    parent_phase_id UUID REFERENCES project_phases(id), -- Alt aşamalar için
    depth_level INTEGER DEFAULT 0, -- 0: ana aşama, 1: alt aşama

    -- Durum
    status VARCHAR(50) DEFAULT 'Planlanıyor' CHECK (status IN (
        'Planlanıyor', 'Başlatıldı', 'Devam Ediyor', 'Beklemede',
        'Tamamlandı', 'İptal Edildi'
    )),

    -- Tarih bilgileri
    planned_start_date DATE,
    planned_end_date DATE,
    actual_start_date DATE,
    actual_end_date DATE,

    -- İlerleme
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),

    -- Bağımlılık
    depends_on_phase_id UUID REFERENCES project_phases(id),

    -- Meta veriler
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Unique constraint
    UNIQUE(project_id, phase_code)
);

-- Proje Görevleri Tablosu (Detaylı işler: H.K.3-1, H.K.3-2)
-- Project Tasks Table (Detailed tasks: H.K.3-1, H.K.3-2)
CREATE TABLE IF NOT EXISTS project_tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    phase_id UUID REFERENCES project_phases(id) ON DELETE CASCADE,
    task_code VARCHAR(50) NOT NULL, -- H.K.3-1, H.K.3-2
    task_name VARCHAR(255) NOT NULL,
    description TEXT,

    -- Görev detayları
    task_type VARCHAR(50) DEFAULT 'İmalat' CHECK (task_type IN (
        'İmalat', 'Montaj', 'Kaplama', 'Kontrol', 'Test', 'Sevkiyat', 'Diğer'
    )),
    estimated_duration_hours INTEGER, -- Tahmini süre (saat)
    actual_duration_hours INTEGER DEFAULT 0, -- Gerçek süre

    -- Atamalar
    assigned_to UUID REFERENCES employees(id),
    assigned_team JSONB, -- Ekip üyeleri array'i

    -- Durum
    status VARCHAR(50) DEFAULT 'Atanmadı' CHECK (status IN (
        'Atanmadı', 'Atandı', 'Başlatıldı', 'Devam Ediyor', 'Beklemede',
        'Kalite Kontrolde', 'Tamamlandı', 'İptal Edildi'
    )),

    -- Tarih bilgileri
    planned_start_date DATE,
    planned_end_date DATE,
    actual_start_date TIMESTAMP WITH TIME ZONE,
    actual_end_date TIMESTAMP WITH TIME ZONE,

    -- İlerleme
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),

    -- Bağımlılık
    depends_on_task_id UUID REFERENCES project_tasks(id),

    -- Öncelik
    priority VARCHAR(20) DEFAULT 'Orta' CHECK (priority IN ('Düşük', 'Orta', 'Yüksek', 'Kritik')),

    -- Meta veriler
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT,

    -- Unique constraint
    UNIQUE(phase_id, task_code)
);

-- Proje Malzemeleri Tablosu
-- Project Materials Table
CREATE TABLE IF NOT EXISTS project_materials (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    phase_id UUID REFERENCES project_phases(id),
    task_id UUID REFERENCES project_tasks(id),
    product_id UUID REFERENCES products(id),

    -- Miktar bilgileri
    required_quantity DECIMAL(10,3) NOT NULL, -- Gerekli miktar
    reserved_quantity DECIMAL(10,3) DEFAULT 0, -- Rezerve edilen
    used_quantity DECIMAL(10,3) DEFAULT 0, -- Kullanılan
    returned_quantity DECIMAL(10,3) DEFAULT 0, -- İade edilen

    -- Maliyet
    estimated_unit_cost DECIMAL(12,2),
    actual_unit_cost DECIMAL(12,2),

    -- Durum
    status VARCHAR(50) DEFAULT 'Planlandı' CHECK (status IN (
        'Planlandı', 'Rezerve Edildi', 'Teslim Alındı', 'Kullanımda', 'Tamamlandı', 'İade Edildi'
    )),

    -- Tedarik bilgileri
    supplier VARCHAR(255),
    ordered_date DATE,
    delivery_date DATE,

    -- Meta veriler
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT
);

-- Proje Zaman Çizelgesi / Milestone'lar
-- Project Timeline / Milestones
CREATE TABLE IF NOT EXISTS project_milestones (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    milestone_name VARCHAR(255) NOT NULL,
    description TEXT,

    -- Tarih bilgileri
    target_date DATE NOT NULL,
    actual_date DATE,

    -- Durum
    status VARCHAR(50) DEFAULT 'Planlandı' CHECK (status IN (
        'Planlandı', 'Risk Altında', 'Tamamlandı', 'Gecikti', 'İptal Edildi'
    )),

    -- Önem derecesi
    is_critical BOOLEAN DEFAULT FALSE,
    milestone_type VARCHAR(50) DEFAULT 'Genel' CHECK (milestone_type IN (
        'Başlangıç', 'Aşama Tamamlama', 'Kalite Kontrol', 'Teslimat', 'Genel'
    )),

    -- Meta veriler
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Proje Notları ve Yorumları
-- Project Notes and Comments
CREATE TABLE IF NOT EXISTS project_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    phase_id UUID REFERENCES project_phases(id) ON DELETE CASCADE,
    task_id UUID REFERENCES project_tasks(id) ON DELETE CASCADE,

    -- Yorum detayları
    comment_text TEXT NOT NULL,
    comment_type VARCHAR(50) DEFAULT 'Genel' CHECK (comment_type IN (
        'Genel', 'Problem', 'Çözüm', 'Değişiklik', 'Onay', 'Risk'
    )),

    -- Yazar bilgileri
    author_id UUID REFERENCES employees(id),

    -- Meta veriler
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_important BOOLEAN DEFAULT FALSE,

    -- Dosya ekleri (gelecekte)
    attachments JSONB DEFAULT '[]'::JSONB
);

-- Proje Dosyaları / Ekleri
-- Project Files / Attachments
CREATE TABLE IF NOT EXISTS project_files (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    phase_id UUID REFERENCES project_phases(id),
    task_id UUID REFERENCES project_tasks(id),

    -- Dosya bilgileri
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(50), -- 'image', 'document', 'drawing', 'other'
    file_path TEXT, -- Supabase storage path
    file_size INTEGER, -- bytes
    mime_type VARCHAR(100),

    -- Kategoriler
    category VARCHAR(50) DEFAULT 'Genel' CHECK (category IN (
        'Çizim', 'Fotoğraf', 'Dokuman', 'Sertifika', 'Rapor', 'Genel'
    )),

    -- Meta veriler
    uploaded_by UUID REFERENCES employees(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    description TEXT
);

-- İndeksler (Performance)
-- Indexes (Performance)
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_customer ON projects(customer_id);
CREATE INDEX IF NOT EXISTS idx_projects_manager ON projects(project_manager_id);
CREATE INDEX IF NOT EXISTS idx_projects_dates ON projects(planned_start_date, planned_end_date);

CREATE INDEX IF NOT EXISTS idx_phases_project ON project_phases(project_id);
CREATE INDEX IF NOT EXISTS idx_phases_order ON project_phases(project_id, order_number);
CREATE INDEX IF NOT EXISTS idx_phases_status ON project_phases(status);
CREATE INDEX IF NOT EXISTS idx_phases_parent ON project_phases(parent_phase_id);

CREATE INDEX IF NOT EXISTS idx_tasks_phase ON project_tasks(phase_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON project_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON project_tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_dates ON project_tasks(planned_start_date, planned_end_date);

CREATE INDEX IF NOT EXISTS idx_materials_project ON project_materials(project_id);
CREATE INDEX IF NOT EXISTS idx_materials_product ON project_materials(product_id);
CREATE INDEX IF NOT EXISTS idx_materials_task ON project_materials(task_id);

CREATE INDEX IF NOT EXISTS idx_milestones_project ON project_milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_milestones_date ON project_milestones(target_date);

CREATE INDEX IF NOT EXISTS idx_comments_project ON project_comments(project_id);
CREATE INDEX IF NOT EXISTS idx_comments_author ON project_comments(author_id);
CREATE INDEX IF NOT EXISTS idx_comments_created ON project_comments(created_at);

-- Updated_at trigger'ları
-- Updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_phases_updated_at
    BEFORE UPDATE ON project_phases
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_tasks_updated_at
    BEFORE UPDATE ON project_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_materials_updated_at
    BEFORE UPDATE ON project_materials
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security) Politikaları
-- RLS (Row Level Security) Policies
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_files ENABLE ROW LEVEL SECURITY;

-- Tüm kullanıcılar tüm projeleri görebilir (şimdilik)
-- All users can see all projects (for now)
CREATE POLICY "Everyone can view projects" ON projects FOR SELECT USING (true);
CREATE POLICY "Everyone can insert projects" ON projects FOR INSERT WITH CHECK (true);
CREATE POLICY "Everyone can update projects" ON projects FOR UPDATE USING (true);
CREATE POLICY "Everyone can delete projects" ON projects FOR DELETE USING (true);

CREATE POLICY "Everyone can view project_phases" ON project_phases FOR SELECT USING (true);
CREATE POLICY "Everyone can insert project_phases" ON project_phases FOR INSERT WITH CHECK (true);
CREATE POLICY "Everyone can update project_phases" ON project_phases FOR UPDATE USING (true);
CREATE POLICY "Everyone can delete project_phases" ON project_phases FOR DELETE USING (true);

CREATE POLICY "Everyone can view project_tasks" ON project_tasks FOR SELECT USING (true);
CREATE POLICY "Everyone can insert project_tasks" ON project_tasks FOR INSERT WITH CHECK (true);
CREATE POLICY "Everyone can update project_tasks" ON project_tasks FOR UPDATE USING (true);
CREATE POLICY "Everyone can delete project_tasks" ON project_tasks FOR DELETE USING (true);

CREATE POLICY "Everyone can view project_materials" ON project_materials FOR SELECT USING (true);
CREATE POLICY "Everyone can insert project_materials" ON project_materials FOR INSERT WITH CHECK (true);
CREATE POLICY "Everyone can update project_materials" ON project_materials FOR UPDATE USING (true);
CREATE POLICY "Everyone can delete project_materials" ON project_materials FOR DELETE USING (true);

CREATE POLICY "Everyone can view project_milestones" ON project_milestones FOR SELECT USING (true);
CREATE POLICY "Everyone can insert project_milestones" ON project_milestones FOR INSERT WITH CHECK (true);
CREATE POLICY "Everyone can update project_milestones" ON project_milestones FOR UPDATE USING (true);
CREATE POLICY "Everyone can delete project_milestones" ON project_milestones FOR DELETE USING (true);

CREATE POLICY "Everyone can view project_comments" ON project_comments FOR SELECT USING (true);
CREATE POLICY "Everyone can insert project_comments" ON project_comments FOR INSERT WITH CHECK (true);
CREATE POLICY "Everyone can update project_comments" ON project_comments FOR UPDATE USING (true);
CREATE POLICY "Everyone can delete project_comments" ON project_comments FOR DELETE USING (true);

CREATE POLICY "Everyone can view project_files" ON project_files FOR SELECT USING (true);
CREATE POLICY "Everyone can insert project_files" ON project_files FOR INSERT WITH CHECK (true);
CREATE POLICY "Everyone can update project_files" ON project_files FOR UPDATE USING (true);
CREATE POLICY "Everyone can delete project_files" ON project_files FOR DELETE USING (true);

-- İstatistik ve Analiz için View'lar
-- Views for Statistics and Analysis

-- Proje Genel Bakış View'u
CREATE OR REPLACE VIEW project_overview AS
SELECT
    p.id,
    p.project_code,
    p.project_name,
    p.status,
    p.priority,
    p.overall_progress,
    p.planned_start_date,
    p.planned_end_date,
    p.actual_start_date,
    p.actual_end_date,
    p.estimated_budget,
    p.actual_cost,
    c.customer_name,
    e.full_name AS project_manager_name,

    -- Aşama sayıları
    (SELECT COUNT(*) FROM project_phases ph WHERE ph.project_id = p.id) AS total_phases,
    (SELECT COUNT(*) FROM project_phases ph WHERE ph.project_id = p.id AND ph.status = 'Tamamlandı') AS completed_phases,

    -- Görev sayıları
    (SELECT COUNT(*) FROM project_tasks t
     JOIN project_phases ph ON t.phase_id = ph.id
     WHERE ph.project_id = p.id) AS total_tasks,
    (SELECT COUNT(*) FROM project_tasks t
     JOIN project_phases ph ON t.phase_id = ph.id
     WHERE ph.project_id = p.id AND t.status = 'Tamamlandı') AS completed_tasks,

    -- Gecikme durumu
    CASE
        WHEN p.planned_end_date < CURRENT_DATE AND p.status NOT IN ('Tamamlandı', 'İptal Edildi')
        THEN 'Gecikmiş'
        WHEN p.planned_end_date <= CURRENT_DATE + INTERVAL '7 days' AND p.status NOT IN ('Tamamlandı', 'İptal Edildi')
        THEN 'Risk Altında'
        ELSE 'Normal'
    END AS delay_status,

    p.created_at,
    p.updated_at
FROM projects p
LEFT JOIN customers c ON p.customer_id = c.id
LEFT JOIN employees e ON p.project_manager_id = e.id;

-- Görev Detay View'u
CREATE OR REPLACE VIEW task_detail_view AS
SELECT
    t.id,
    t.task_code,
    t.task_name,
    t.description,
    t.task_type,
    t.status,
    t.priority,
    t.progress,
    t.estimated_duration_hours,
    t.actual_duration_hours,
    t.planned_start_date,
    t.planned_end_date,
    t.actual_start_date,
    t.actual_end_date,

    -- Proje bilgileri
    p.project_code,
    p.project_name,

    -- Aşama bilgileri
    ph.phase_code,
    ph.phase_name,

    -- Atanan kişi
    e.full_name AS assigned_person_name,
    e.job_title AS assigned_person_title,

    -- Gecikme durumu
    CASE
        WHEN t.planned_end_date < CURRENT_DATE AND t.status NOT IN ('Tamamlandı', 'İptal Edildi')
        THEN 'Gecikmiş'
        WHEN t.planned_end_date <= CURRENT_DATE + INTERVAL '3 days' AND t.status NOT IN ('Tamamlandı', 'İptal Edildi')
        THEN 'Risk Altında'
        ELSE 'Normal'
    END AS delay_status,

    t.created_at,
    t.updated_at
FROM project_tasks t
JOIN project_phases ph ON t.phase_id = ph.id
JOIN projects p ON ph.project_id = p.id
LEFT JOIN employees e ON t.assigned_to = e.id;

-- Malzeme Özet View'u
CREATE OR REPLACE VIEW project_materials_summary AS
SELECT
    pm.project_id,
    p.project_code,
    p.project_name,
    pr.product_name,
    pr.product_code,
    pr.unit,
    SUM(pm.required_quantity) AS total_required,
    SUM(pm.reserved_quantity) AS total_reserved,
    SUM(pm.used_quantity) AS total_used,
    SUM(pm.returned_quantity) AS total_returned,
    SUM(pm.required_quantity) - SUM(pm.used_quantity) - SUM(pm.returned_quantity) AS remaining_needed,
    AVG(pm.estimated_unit_cost) AS avg_estimated_cost,
    AVG(pm.actual_unit_cost) AS avg_actual_cost
FROM project_materials pm
JOIN projects p ON pm.project_id = p.id
JOIN products pr ON pm.product_id = pr.id
GROUP BY pm.project_id, p.project_code, p.project_name, pr.id, pr.product_name, pr.product_code, pr.unit;

COMMENT ON TABLE projects IS 'Ana projeler tablosu - H.K.1, H.K.2 gibi ana projeleri tutar';
COMMENT ON TABLE project_phases IS 'Proje aşamaları - Ana projerin alt kırılımları (H.K.1-1, H.K.1-2)';
COMMENT ON TABLE project_tasks IS 'Detaylı görevler - Her aşamanın altındaki spesifik işler';
COMMENT ON TABLE project_materials IS 'Proje malzeme takibi - Hangi proje/aşama/görevde hangi malzemeler kullanılıyor';
COMMENT ON TABLE project_milestones IS 'Proje dönüm noktaları - Önemli tarihler ve hedefler';
COMMENT ON TABLE project_comments IS 'Proje notları ve yorumları - İletişim ve takip notları';
COMMENT ON TABLE project_files IS 'Proje dosyaları - Çizimler, fotoğraflar, dokümantasyon';