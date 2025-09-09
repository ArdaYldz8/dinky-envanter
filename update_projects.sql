-- Clear existing projects and add new ones
DELETE FROM public.projects;

-- Insert new projects
INSERT INTO public.projects (project_name, status, created_at) VALUES
('İLHAN PROJESİ', 'Aktif', NOW()),
('HÜSEYİN KURU PROJESİ', 'Aktif', NOW()),
('SÜLEYMAN ARSLAN PROJESİ', 'Aktif', NOW()),
('HASAN BAL PROJESİ', 'Aktif', NOW()),
('TEKDEMİR PROJESİ', 'Aktif', NOW()),
('ARGUZ PROJESİ', 'Aktif', NOW()),
('AS MAKİNA', 'Aktif', NOW()),
('HARUN PROJESİ', 'Aktif', NOW()),
('ŞİMŞEK PROJESİ', 'Aktif', NOW()),
('DURSUN PROJESİ', 'Aktif', NOW()),
('KEMAL COFFEE', 'Aktif', NOW()),
('AĞABEYLİ PROJESİ', 'Aktif', NOW());