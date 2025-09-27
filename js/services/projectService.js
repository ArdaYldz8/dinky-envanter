// Project Management Service
// Proje Yönetim Servisi

import { supabase } from './supabaseClient.js';

export const projectService = {
    // ============================================================================
    // PROJECTS - Ana Projeler
    // ============================================================================

    // Tüm projeleri getir
    async getAllProjects() {
        try {
            const { data, error } = await supabase
                .from('projects')
                .select(`
                    *,
                    customers(customer_name, company_name),
                    employees:project_manager_id(full_name)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Projeler getirilirken hata:', error);
            return { success: false, error: error.message };
        }
    },

    // Proje detayını getir
    async getProjectById(projectId) {
        try {
            const { data, error } = await supabase
                .from('projects')
                .select(`
                    *,
                    customers(*),
                    employees:project_manager_id(*)
                `)
                .eq('id', projectId)
                .single();

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Proje detayı getirilirken hata:', error);
            return { success: false, error: error.message };
        }
    },

    // Proje oluştur
    async createProject(projectData) {
        try {
            const { data, error } = await supabase
                .from('projects')
                .insert([projectData])
                .select()
                .single();

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Proje oluşturulurken hata:', error);
            return { success: false, error: error.message };
        }
    },

    // Proje güncelle
    async updateProject(projectId, updateData) {
        try {
            const { data, error } = await supabase
                .from('projects')
                .update(updateData)
                .eq('id', projectId)
                .select()
                .single();

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Proje güncellenirken hata:', error);
            return { success: false, error: error.message };
        }
    },

    // Proje sil
    async deleteProject(projectId) {
        try {
            const { error } = await supabase
                .from('projects')
                .delete()
                .eq('id', projectId);

            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Proje silinirken hata:', error);
            return { success: false, error: error.message };
        }
    },

    // Proje overview'u getir
    async getProjectOverview() {
        try {
            const { data, error } = await supabase
                .from('project_overview')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Proje overview getirilirken hata:', error);
            return { success: false, error: error.message };
        }
    },

    // ============================================================================
    // PROJECT PHASES - Proje Aşamaları
    // ============================================================================

    // Projenin aşamalarını getir
    async getProjectPhases(projectId) {
        try {
            const { data, error } = await supabase
                .from('project_phases')
                .select('*')
                .eq('project_id', projectId)
                .order('order_number', { ascending: true });

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Proje aşamaları getirilirken hata:', error);
            return { success: false, error: error.message };
        }
    },

    // Aşama oluştur
    async createPhase(phaseData) {
        try {
            const { data, error } = await supabase
                .from('project_phases')
                .insert([phaseData])
                .select()
                .single();

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Aşama oluşturulurken hata:', error);
            return { success: false, error: error.message };
        }
    },

    // Aşama güncelle
    async updatePhase(phaseId, updateData) {
        try {
            const { data, error } = await supabase
                .from('project_phases')
                .update(updateData)
                .eq('id', phaseId)
                .select()
                .single();

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Aşama güncellenirken hata:', error);
            return { success: false, error: error.message };
        }
    },

    // Aşama sil
    async deletePhase(phaseId) {
        try {
            const { error } = await supabase
                .from('project_phases')
                .delete()
                .eq('id', phaseId);

            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Aşama silinirken hata:', error);
            return { success: false, error: error.message };
        }
    },

    // ============================================================================
    // PROJECT TASKS - Proje Görevleri
    // ============================================================================

    // Aşamanın görevlerini getir
    async getPhaseTasks(phaseId) {
        try {
            const { data, error } = await supabase
                .from('project_tasks')
                .select(`
                    *,
                    employees:assigned_to(full_name, job_title),
                    project_phases(phase_name, project_id)
                `)
                .eq('phase_id', phaseId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Aşama görevleri getirilirken hata:', error);
            return { success: false, error: error.message };
        }
    },

    // Projenin tüm görevlerini getir
    async getProjectTasks(projectId) {
        try {
            const { data, error } = await supabase
                .from('task_detail_view')
                .select('*')
                .eq('project_id', projectId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Proje görevleri getirilirken hata:', error);
            return { success: false, error: error.message };
        }
    },

    // Görev oluştur
    async createTask(taskData) {
        try {
            const { data, error } = await supabase
                .from('project_tasks')
                .insert([taskData])
                .select()
                .single();

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Görev oluşturulurken hata:', error);
            return { success: false, error: error.message };
        }
    },

    // Görev güncelle
    async updateTask(taskId, updateData) {
        try {
            const { data, error } = await supabase
                .from('project_tasks')
                .update(updateData)
                .eq('id', taskId)
                .select()
                .single();

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Görev güncellenirken hata:', error);
            return { success: false, error: error.message };
        }
    },

    // Görev sil
    async deleteTask(taskId) {
        try {
            const { error } = await supabase
                .from('project_tasks')
                .delete()
                .eq('id', taskId);

            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Görev silinirken hata:', error);
            return { success: false, error: error.message };
        }
    },

    // Görev durumu güncelle
    async updateTaskStatus(taskId, status, progress = null) {
        try {
            const updateData = { status };
            if (progress !== null) {
                updateData.progress = progress;
            }

            // Duruma göre tarih güncelleme
            if (status === 'Başlatıldı' || status === 'Devam Ediyor') {
                updateData.actual_start_date = new Date().toISOString();
            } else if (status === 'Tamamlandı') {
                updateData.actual_end_date = new Date().toISOString();
                updateData.progress = 100;
            }

            const { data, error } = await supabase
                .from('project_tasks')
                .update(updateData)
                .eq('id', taskId)
                .select()
                .single();

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Görev durumu güncellenirken hata:', error);
            return { success: false, error: error.message };
        }
    },

    // ============================================================================
    // PROJECT MATERIALS - Proje Malzemeleri
    // ============================================================================

    // Proje malzemelerini getir
    async getProjectMaterials(projectId) {
        try {
            const { data, error } = await supabase
                .from('project_materials')
                .select(`
                    *,
                    products(product_name, product_code, unit, unit_price),
                    project_phases(phase_name),
                    project_tasks(task_name)
                `)
                .eq('project_id', projectId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Proje malzemeleri getirilirken hata:', error);
            return { success: false, error: error.message };
        }
    },

    // Malzeme özeti getir
    async getProjectMaterialsSummary(projectId) {
        try {
            const { data, error } = await supabase
                .from('project_materials_summary')
                .select('*')
                .eq('project_id', projectId);

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Malzeme özeti getirilirken hata:', error);
            return { success: false, error: error.message };
        }
    },

    // Malzeme ekle
    async addProjectMaterial(materialData) {
        try {
            const { data, error } = await supabase
                .from('project_materials')
                .insert([materialData])
                .select()
                .single();

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Malzeme eklenirken hata:', error);
            return { success: false, error: error.message };
        }
    },

    // Malzeme güncelle
    async updateProjectMaterial(materialId, updateData) {
        try {
            const { data, error } = await supabase
                .from('project_materials')
                .update(updateData)
                .eq('id', materialId)
                .select()
                .single();

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Malzeme güncellenirken hata:', error);
            return { success: false, error: error.message };
        }
    },

    // ============================================================================
    // PROJECT MILESTONES - Dönüm Noktaları
    // ============================================================================

    // Proje dönüm noktalarını getir
    async getProjectMilestones(projectId) {
        try {
            const { data, error } = await supabase
                .from('project_milestones')
                .select('*')
                .eq('project_id', projectId)
                .order('target_date', { ascending: true });

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Dönüm noktaları getirilirken hata:', error);
            return { success: false, error: error.message };
        }
    },

    // Dönüm noktası oluştur
    async createMilestone(milestoneData) {
        try {
            const { data, error } = await supabase
                .from('project_milestones')
                .insert([milestoneData])
                .select()
                .single();

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Dönüm noktası oluşturulurken hata:', error);
            return { success: false, error: error.message };
        }
    },

    // ============================================================================
    // PROJECT COMMENTS - Proje Yorumları
    // ============================================================================

    // Proje yorumlarını getir
    async getProjectComments(projectId, phaseId = null, taskId = null) {
        try {
            let query = supabase
                .from('project_comments')
                .select(`
                    *,
                    employees:author_id(full_name, job_title)
                `)
                .eq('project_id', projectId);

            if (phaseId) query = query.eq('phase_id', phaseId);
            if (taskId) query = query.eq('task_id', taskId);

            const { data, error } = await query
                .order('created_at', { ascending: false });

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Yorumlar getirilirken hata:', error);
            return { success: false, error: error.message };
        }
    },

    // Yorum ekle
    async addComment(commentData) {
        try {
            const { data, error } = await supabase
                .from('project_comments')
                .insert([commentData])
                .select(`
                    *,
                    employees:author_id(full_name, job_title)
                `)
                .single();

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Yorum eklenirken hata:', error);
            return { success: false, error: error.message };
        }
    },

    // ============================================================================
    // DASHBOARD & STATS - Dashboard ve İstatistikler
    // ============================================================================

    // Dashboard için proje istatistikleri
    async getProjectStats() {
        try {
            const [totalProjects, activeProjects, completedProjects, delayedProjects] = await Promise.all([
                // Toplam proje sayısı
                supabase.from('projects').select('id', { count: 'exact', head: true }),

                // Aktif projeler
                supabase.from('projects').select('id', { count: 'exact', head: true })
                    .in('status', ['Başlatıldı', 'Devam Ediyor']),

                // Tamamlanan projeler
                supabase.from('projects').select('id', { count: 'exact', head: true })
                    .eq('status', 'Tamamlandı'),

                // Geciken projeler (planlanmış bitiş tarihi geçmiş)
                supabase.from('projects').select('id', { count: 'exact', head: true })
                    .lt('planned_end_date', new Date().toISOString().split('T')[0])
                    .not('status', 'in', '(Tamamlandı,İptal Edildi)')
            ]);

            return {
                success: true,
                data: {
                    total: totalProjects.count || 0,
                    active: activeProjects.count || 0,
                    completed: completedProjects.count || 0,
                    delayed: delayedProjects.count || 0
                }
            };
        } catch (error) {
            console.error('Proje istatistikleri getirilirken hata:', error);
            return { success: false, error: error.message };
        }
    },

    // Son aktiviteler
    async getRecentActivities(limit = 10) {
        try {
            const { data, error } = await supabase
                .from('project_comments')
                .select(`
                    id,
                    comment_text,
                    comment_type,
                    created_at,
                    projects(project_name),
                    employees:author_id(full_name)
                `)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Son aktiviteler getirilirken hata:', error);
            return { success: false, error: error.message };
        }
    },

    // ============================================================================
    // UTILITY FUNCTIONS - Yardımcı Fonksiyonlar
    // ============================================================================

    // Proje kodunu otomatik oluştur
    generateProjectCode(year = new Date().getFullYear()) {
        const randomNum = Math.floor(Math.random() * 900) + 100; // 100-999 arası
        return `PRJ.${year}.${randomNum}`;
    },

    // Proje durumu rengini getir
    getStatusColor(status) {
        const statusColors = {
            'Planlanıyor': '#6B7280',
            'Başlatıldı': '#3B82F6',
            'Devam Ediyor': '#10B981',
            'Beklemede': '#F59E0B',
            'Tamamlandı': '#059669',
            'İptal Edildi': '#EF4444',
            'Ertelendi': '#8B5CF6'
        };
        return statusColors[status] || '#6B7280';
    },

    // Öncelik rengini getir
    getPriorityColor(priority) {
        const priorityColors = {
            'Düşük': '#10B981',
            'Orta': '#F59E0B',
            'Yüksek': '#EF4444',
            'Kritik': '#DC2626'
        };
        return priorityColors[priority] || '#6B7280';
    },

    // Proje ilerleme yüzdesini hesapla
    calculateProjectProgress(phases) {
        if (!phases || phases.length === 0) return 0;

        const totalProgress = phases.reduce((sum, phase) => sum + (phase.progress || 0), 0);
        return Math.round(totalProgress / phases.length);
    }
};