// Quality Control Service
// Kalite Kontrol Sistemi Servisi

import { supabase } from './supabaseClient.js';

class QualityControlService {

    // 📋 ISSUE MANAGEMENT - Hata Yönetimi

    /**
     * Yeni kalite hatası oluştur
     */
    async createIssue(issueData) {
        try {
            const { data, error } = await supabase
                .from('quality_issues')
                .insert({
                    issue_title: issueData.title,
                    issue_description: issueData.description,
                    issue_location: issueData.location,
                    priority_level: issueData.priority || 'medium',
                    reporter_id: issueData.reporterId,
                    reporter_notes: issueData.reporterNotes,
                    before_photo_url: issueData.beforePhotoUrl,
                    assigned_to: issueData.assignedTo,
                    supervisor_id: issueData.supervisorId,
                    created_by: issueData.reporterId,
                    estimated_fix_time: issueData.estimatedFixTime
                })
                .select()
                .single();

            if (error) throw error;

            // History kaydı ekle
            await this.addHistoryRecord(data.id, issueData.reporterId, null, 'reported', 'Yeni hata raporu oluşturuldu');

            return { success: true, data };
        } catch (error) {
            console.error('Hata oluşturma hatası:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Hata durumunu güncelle
     */
    async updateIssueStatus(issueId, newStatus, userId, reason = null) {
        try {
            // Mevcut durumu al
            const { data: currentIssue } = await supabase
                .from('quality_issues')
                .select('status')
                .eq('id', issueId)
                .single();

            const updateData = {
                status: newStatus,
                updated_at: new Date().toISOString()
            };

            // Status'a göre timestamp'leri güncelle
            switch (newStatus) {
                case 'in_progress':
                    updateData.started_at = new Date().toISOString();
                    break;
                case 'fixed':
                    updateData.completed_at = new Date().toISOString();
                    break;
                case 'review':
                    // Review aşamasında fiili çözüm süresini hesapla
                    const { data: issueWithStart } = await supabase
                        .from('quality_issues')
                        .select('started_at')
                        .eq('id', issueId)
                        .single();

                    if (issueWithStart?.started_at) {
                        const startTime = new Date(issueWithStart.started_at);
                        const endTime = new Date();
                        const actualTime = Math.round((endTime - startTime) / (1000 * 60)); // dakika
                        updateData.actual_fix_time = actualTime;
                    }
                    break;
                case 'approved':
                    updateData.approved_at = new Date().toISOString();
                    updateData.reviewed_at = new Date().toISOString();
                    break;
            }

            const { data, error } = await supabase
                .from('quality_issues')
                .update(updateData)
                .eq('id', issueId)
                .select()
                .single();

            if (error) throw error;

            // History kaydı ekle
            await this.addHistoryRecord(issueId, userId, currentIssue?.status, newStatus, reason);

            return { success: true, data };
        } catch (error) {
            console.error('Durum güncelleme hatası:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Çözüm fotoğrafı ekle
     */
    async addAfterPhoto(issueId, photoUrl, workerId, solutionNotes = null) {
        try {
            const { data, error } = await supabase
                .from('quality_issues')
                .update({
                    after_photo_url: photoUrl,
                    status: 'fixed',
                    completed_at: new Date().toISOString()
                })
                .eq('id', issueId)
                .select()
                .single();

            if (error) throw error;

            // Çözüm notu ekle
            if (solutionNotes) {
                await this.addComment(issueId, workerId, solutionNotes, 'solution');
            }

            // History kaydı
            await this.addHistoryRecord(issueId, workerId, 'in_progress', 'fixed', 'Çözüm fotoğrafı eklendi');

            return { success: true, data };
        } catch (error) {
            console.error('Fotoğraf ekleme hatası:', error);
            return { success: false, error: error.message };
        }
    }

    // 📝 COMMENTS - Yorumlar

    /**
     * Hata raporu yorumu ekle
     */
    async addComment(issueId, userId, commentText, commentType = 'general') {
        try {
            const { data, error } = await supabase
                .from('issue_comments')
                .insert({
                    issue_id: issueId,
                    user_id: userId,
                    comment_text: commentText,
                    comment_type: commentType
                })
                .select(`
                    *,
                    employees:user_id (full_name, department)
                `)
                .single();

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Yorum ekleme hatası:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Hata yorumlarını getir
     */
    async getIssueComments(issueId) {
        try {
            const { data, error } = await supabase
                .from('issue_comments')
                .select(`
                    *,
                    employees:user_id (full_name, department)
                `)
                .eq('issue_id', issueId)
                .order('created_at', { ascending: true });

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Yorumları getirme hatası:', error);
            return { success: false, error: error.message };
        }
    }

    // 📊 QUERIES - Sorgular

    /**
     * Tüm hataları getir (filtreleme ile)
     */
    async getIssues(filters = {}) {
        try {
            let query = supabase
                .from('quality_issues')
                .select(`
                    *,
                    reporter:reporter_id (full_name, department),
                    assigned_worker:assigned_to (full_name, department),
                    supervisor:supervisor_id (full_name, department)
                `);

            // Filtreler
            if (filters.status) {
                query = query.eq('status', filters.status);
            }
            if (filters.priority) {
                query = query.eq('priority_level', filters.priority);
            }
            if (filters.assignedTo) {
                query = query.eq('assigned_to', filters.assignedTo);
            }
            if (filters.reporterId) {
                query = query.eq('reporter_id', filters.reporterId);
            }
            if (filters.dateFrom) {
                query = query.gte('created_at', filters.dateFrom);
            }
            if (filters.dateTo) {
                query = query.lte('created_at', filters.dateTo);
            }

            const { data, error } = await query.order('created_at', { ascending: false });

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Hataları getirme hatası:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Tek hata detayını getir
     */
    async getIssueById(issueId) {
        try {
            const { data, error } = await supabase
                .from('quality_issues')
                .select(`
                    *,
                    reporter:reporter_id (full_name, department),
                    assigned_worker:assigned_to (full_name, department),
                    supervisor:supervisor_id (full_name, department)
                `)
                .eq('id', issueId)
                .single();

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Hata detayı getirme hatası:', error);
            return { success: false, error: error.message };
        }
    }

    // 📈 STATISTICS - İstatistikler

    /**
     * Dashboard istatistiklerini getir
     */
    async getDashboardStats() {
        try {
            // Genel sayılar
            const [totalResult, openResult, todayResult] = await Promise.all([
                supabase.from('quality_issues').select('count', { count: 'exact', head: true }),
                supabase.from('quality_issues').select('count', { count: 'exact', head: true }).neq('status', 'approved'),
                supabase.from('quality_issues').select('count', { count: 'exact', head: true }).gte('created_at', new Date().toISOString().split('T')[0])
            ]);

            // Durum dağılımı
            const { data: statusData } = await supabase
                .from('quality_issues')
                .select('status');

            // Öncelik dağılımı
            const { data: priorityData } = await supabase
                .from('quality_issues')
                .select('priority_level');

            // Ortalama çözüm süresi
            const { data: avgTimeData } = await supabase
                .from('quality_issues')
                .select('actual_fix_time')
                .not('actual_fix_time', 'is', null);

            const avgFixTime = avgTimeData?.length > 0
                ? avgTimeData.reduce((sum, item) => sum + item.actual_fix_time, 0) / avgTimeData.length
                : 0;

            return {
                success: true,
                data: {
                    totalIssues: totalResult.count || 0,
                    openIssues: openResult.count || 0,
                    todayIssues: todayResult.count || 0,
                    avgFixTime: Math.round(avgFixTime),
                    statusDistribution: this.groupBy(statusData, 'status'),
                    priorityDistribution: this.groupBy(priorityData, 'priority_level')
                }
            };
        } catch (error) {
            console.error('İstatistik getirme hatası:', error);
            return { success: false, error: error.message };
        }
    }

    // 👥 EMPLOYEE MANAGEMENT - Çalışan Yönetimi

    /**
     * Tüm çalışanları getir (işçi atama için)
     */
    async getEmployees() {
        try {
            const { data, error } = await supabase
                .from('employees')
                .select('id, full_name, department')
                .order('full_name');

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Çalışan listesi getirme hatası:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * İşçi atama
     */
    async assignWorkerToIssue(issueId, workerId, assignedBy) {
        try {
            const { data, error } = await supabase
                .from('quality_issues')
                .update({
                    assigned_to: workerId,
                    assigned_date: new Date().toISOString(),
                    status: 'assigned',
                    updated_at: new Date().toISOString()
                })
                .eq('id', issueId)
                .select()
                .single();

            if (error) throw error;

            // History kaydı ekle
            await this.addHistoryRecord(issueId, assignedBy, 'reported', 'assigned', 'İşçi atandı');

            return { success: true, data };
        } catch (error) {
            console.error('İşçi atama hatası:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Hata güncelle
     */
    async updateIssue(issueId, updateData, userId) {
        try {
            const { data, error } = await supabase
                .from('quality_issues')
                .update({
                    ...updateData,
                    updated_at: new Date().toISOString()
                })
                .eq('id', issueId)
                .select()
                .single();

            if (error) throw error;

            // History kaydı ekle
            await this.addHistoryRecord(issueId, userId, null, 'updated', 'Hata güncellendi');

            return { success: true, data };
        } catch (error) {
            console.error('Hata güncelleme hatası:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Hata sil
     */
    async deleteIssue(issueId, userId) {
        try {
            // History kaydı ekle
            await this.addHistoryRecord(issueId, userId, null, 'deleted', 'Hata silindi');

            const { error } = await supabase
                .from('quality_issues')
                .delete()
                .eq('id', issueId);

            if (error) throw error;

            return { success: true };
        } catch (error) {
            console.error('Hata silme hatası:', error);
            return { success: false, error: error.message };
        }
    }

    // 🔧 UTILITY FUNCTIONS - Yardımcı Fonksiyonlar

    /**
     * History kaydı ekle
     */
    async addHistoryRecord(issueId, userId, oldStatus, newStatus, reason = null) {
        try {
            await supabase
                .from('issue_history')
                .insert({
                    issue_id: issueId,
                    user_id: userId,
                    old_status: oldStatus,
                    new_status: newStatus,
                    change_reason: reason
                });
        } catch (error) {
            console.error('History ekleme hatası:', error);
        }
    }

    /**
     * Array groupBy utility
     */
    groupBy(array, key) {
        if (!array) return {};
        return array.reduce((result, item) => {
            const group = item[key] || 'undefined';
            result[group] = (result[group] || 0) + 1;
            return result;
        }, {});
    }

    /**
     * Dosya yükleme (Base64 string olarak)
     */
    async uploadPhoto(file, folder = 'quality-issues') {
        try {
            // File size check (5MB limit)
            const maxSize = 5 * 1024 * 1024; // 5MB
            if (file.size > maxSize) {
                throw new Error('Dosya boyutu 5MB\'dan büyük olamaz');
            }

            // Convert to base64
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => {
                    const base64String = reader.result;

                    // Create metadata
                    const metadata = {
                        fileName: file.name,
                        fileSize: file.size,
                        fileType: file.type,
                        uploadDate: new Date().toISOString()
                    };

                    resolve({
                        success: true,
                        url: base64String,
                        metadata: metadata,
                        path: `${folder}/${Date.now()}-${file.name}`
                    });
                };
                reader.onerror = () => {
                    reject(new Error('Dosya okuma hatası'));
                };
                reader.readAsDataURL(file);
            });

        } catch (error) {
            console.error('Fotoğraf yükleme hatası:', error);
            return { success: false, error: error.message };
        }
    }
}

// Singleton instance export
export const qualityControlService = new QualityControlService();