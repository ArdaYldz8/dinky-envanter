// Settings Page
import { projectService, supabase } from '../services/supabaseService.js';
import { formatter } from '../utils/formatter.js';
import { Toast } from '../utils/toast.js';
import { Modal } from '../components/Modal.js';

// Helper functions for current user
function getCurrentUser() {
    const userStr = localStorage.getItem('dinky_user');
    return userStr ? JSON.parse(userStr) : null;
}

function isAdmin() {
    const user = getCurrentUser();
    return user && user.role === 'admin';
}

export async function loadSettings() {
    const content = document.getElementById('mainContent');
    
    content.innerHTML = `
        <div class="page-header">
            <h1><i class="fas fa-cog"></i> Ayarlar</h1>
        </div>
        
        <div class="page-content">
            <div class="tabs">
                <ul class="tab-nav">
                    <li class="tab-item active" data-tab="projects">
                        <i class="fas fa-project-diagram"></i> Projeler
                    </li>
                    ${isAdmin() ? `
                    <li class="tab-item" data-tab="activity">
                        <i class="fas fa-history"></i> Aktivite İzleme
                    </li>
                    ` : ''}
                </ul>
                
                <div class="tab-content">
                    <div class="tab-pane active" id="projectsTab">
                        <div class="section-header">
                            <h2>Proje Yönetimi</h2>
                            <button class="btn btn-primary" onclick="window.openProjectModal()">
                                <i class="fas fa-plus"></i> Yeni Proje
                            </button>
                        </div>
                        
                        <div class="table-responsive">
                            <table class="table">
                                <thead>
                                    <tr>
                                        <th>Proje Adı</th>
                                        <th>Durum</th>
                                        <th>Oluşturma Tarihi</th>
                                        <th>İşlemler</th>
                                    </tr>
                                </thead>
                                <tbody id="projectsTableBody">
                                    <tr>
                                        <td colspan="4" class="text-center">Yükleniyor...</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                    
                    ${isAdmin() ? `
                    <div class="tab-pane activity-monitoring" id="activityTab">
                        <div class="activity-section-header">
                            <h2><i class="fas fa-shield-alt"></i> Aktivite İzleme</h2>
                            <p>Tüm kullanıcı işlemlerini buradan takip edebilirsiniz. Sistem genelinde yapılan tüm değişiklikler kayıt altına alınır.</p>
                        </div>
                        
                        <!-- Activity Summary Cards -->
                        <div class="activity-stats-grid" id="activitySummary">
                            <div class="activity-stat-card primary">
                                <div class="stat-card-content">
                                    <div class="stat-card-info">
                                        <h3 id="totalActivities">-</h3>
                                        <p>Toplam Aktivite (7 gün)</p>
                                    </div>
                                    <div class="stat-card-icon primary">
                                        <i class="fas fa-chart-line"></i>
                                    </div>
                                </div>
                            </div>
                            <div class="activity-stat-card success">
                                <div class="stat-card-content">
                                    <div class="stat-card-info">
                                        <h3 id="todayActivities">-</h3>
                                        <p>Bugünkü Aktivite</p>
                                    </div>
                                    <div class="stat-card-icon success">
                                        <i class="fas fa-calendar-day"></i>
                                    </div>
                                </div>
                            </div>
                            <div class="activity-stat-card warning">
                                <div class="stat-card-content">
                                    <div class="stat-card-info">
                                        <h3 id="mostActiveUser">-</h3>
                                        <p>En Aktif Kullanıcı</p>
                                    </div>
                                    <div class="stat-card-icon warning">
                                        <i class="fas fa-user-star"></i>
                                    </div>
                                </div>
                            </div>
                            <div class="activity-stat-card info">
                                <div class="stat-card-content">
                                    <div class="stat-card-info">
                                        <h3 id="mostActiveTable">-</h3>
                                        <p>En Çok Kullanılan Modül</p>
                                    </div>
                                    <div class="stat-card-icon info">
                                        <i class="fas fa-database"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Activity Filters -->
                        <div class="activity-filters">
                            <h5><i class="fas fa-filter"></i> Filtreler</h5>
                            <div class="filter-grid">
                                <div class="filter-group">
                                    <label>Kullanıcı Rolü</label>
                                    <select class="filter-control" id="filterUserRole">
                                        <option value="">Tümü</option>
                                        <option value="admin">Admin</option>
                                        <option value="warehouse">Depocu</option>
                                        <option value="accounting">Muhasebeci</option>
                                    </select>
                                </div>
                                <div class="filter-group">
                                    <label>İşlem Tipi</label>
                                    <select class="filter-control" id="filterActionType">
                                        <option value="">Tümü</option>
                                        <option value="CREATE">Ekleme</option>
                                        <option value="UPDATE">Güncelleme</option>
                                        <option value="DELETE">Silme</option>
                                        <option value="STOCK_IN">Satın Alım</option>
                                        <option value="STOCK_OUT">Satış</option>
                                    </select>
                                </div>
                                <div class="filter-group">
                                    <label>Modül</label>
                                    <select class="filter-control" id="filterTableName">
                                        <option value="">Tümü</option>
                                        <option value="products">Ürünler</option>
                                        <option value="employees">Personel</option>
                                        <option value="attendance_records">Puantaj</option>
                                        <option value="inventory_movements">Stok Hareketleri</option>
                                        <option value="projects">Projeler</option>
                                        <option value="tasks">Görevler</option>
                                        <option value="transactions">İşlemler</option>
                                    </select>
                                </div>
                                <div class="filter-group">
                                    <label>Başlangıç Tarihi</label>
                                    <input type="date" class="filter-control" id="filterStartDate" value="${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}">
                                </div>
                                <div class="filter-group">
                                    <label>Bitiş Tarihi</label>
                                    <input type="date" class="filter-control" id="filterEndDate" value="${new Date().toISOString().split('T')[0]}">
                                </div>
                            </div>
                            <div class="filter-actions">
                                <button class="activity-btn activity-btn-primary" onclick="window.loadActivityLogs()">
                                    <i class="fas fa-search"></i> Filtrele
                                </button>
                                <button class="activity-btn activity-btn-secondary" onclick="window.resetActivityFilters()">
                                    <i class="fas fa-undo"></i> Temizle
                                </button>
                                <button class="activity-btn activity-btn-success" onclick="window.exportActivityLogs()">
                                    <i class="fas fa-download"></i> Excel'e Aktar
                                </button>
                            </div>
                        </div>
                        
                        <!-- Activity Logs Table -->
                        <div class="activity-logs-container">
                            <div class="activity-table-header">
                                <h5><i class="fas fa-list"></i> Aktivite Kayıtları</h5>
                                <button class="activity-btn activity-btn-primary" onclick="window.loadActivityLogs()">
                                    <i class="fas fa-sync"></i> Yenile
                                </button>
                            </div>
                            <div class="table-responsive">
                                <table class="activity-table">
                                    <thead>
                                        <tr>
                                            <th>Tarih/Saat</th>
                                            <th>Kullanıcı</th>
                                            <th>Rol</th>
                                            <th>İşlem</th>
                                            <th>Modül</th>
                                            <th>Açıklama</th>
                                            <th>Detay</th>
                                        </tr>
                                    </thead>
                                    <tbody id="activityLogsTableBody">
                                        <tr>
                                            <td colspan="7" class="activity-loading">
                                                <i class="fas fa-spinner activity-loading-spinner"></i> Yükleniyor...
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            
                            <!-- Pagination -->
                            <div class="activity-pagination">
                                <div class="activity-pagination-info" id="activityPaginationInfo">-</div>
                                <div class="activity-pagination-controls">
                                    <button class="pagination-btn" onclick="window.loadActivityLogsPage('prev')" id="prevActivityBtn" disabled>
                                        <i class="fas fa-chevron-left"></i> Önceki
                                    </button>
                                    <button class="pagination-btn" onclick="window.loadActivityLogsPage('next')" id="nextActivityBtn">
                                        Sonraki <i class="fas fa-chevron-right"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    ` : ''}
                </div>
            </div>
        </div>
    `;

    setupTabs();
    await loadProjects();
    
    // Load activity monitoring if admin
    if (isAdmin()) {
        await loadActivitySummary();
        await loadActivityLogs();
    }
}

function setupTabs() {
    const tabItems = document.querySelectorAll('.tab-item');
    const tabPanes = document.querySelectorAll('.tab-pane');
    
    tabItems.forEach(item => {
        item.addEventListener('click', async () => {
            const tabId = item.dataset.tab;

            // Special security check for activity monitoring
            if (tabId === 'activity' && isAdmin()) {
                const hasAccess = await verifyActivityAccess();
                if (!hasAccess) {
                    return; // Access denied, don't switch tabs
                }
            }

            // Remove active class from all
            tabItems.forEach(t => t.classList.remove('active'));
            tabPanes.forEach(p => p.classList.remove('active'));

            // Add active class to clicked
            item.classList.add('active');
            document.getElementById(`${tabId}Tab`).classList.add('active');

            // Load activity data when activity tab is activated
            if (tabId === 'activity' && isAdmin()) {
                loadActivitySummary();
                loadActivityLogs();
            }
        });
    });
}

async function loadProjects() {
    try {
        const { data: projects, error } = await projectService.getAll();
        
        if (error) throw error;
        
        const tbody = document.getElementById('projectsTableBody');
        
        if (projects && projects.length > 0) {
            tbody.innerHTML = projects.map(project => `
                <tr data-id="${project.id}">
                    <td><strong>${project.project_name}</strong></td>
                    <td>
                        <span class="badge ${project.status === 'Aktif' ? 'badge-success' : 'badge-secondary'}">
                            ${project.status}
                        </span>
                    </td>
                    <td>${formatter.date(project.created_at)}</td>
                    <td>
                        <button class="btn btn-sm btn-warning" onclick="window.editProject('${project.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm ${project.status === 'Aktif' ? 'btn-danger' : 'btn-success'}" 
                                onclick="window.toggleProjectStatus('${project.id}', '${project.status}')">
                            <i class="fas fa-${project.status === 'Aktif' ? 'stop' : 'play'}"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="window.deleteProject('${project.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center">Proje bulunamadı.</td></tr>';
        }
    } catch (error) {
        console.error('Projeler yüklenirken hata:', error);
        Toast.error('Proje listesi yüklenirken hata oluştu');
    }
}


// Project Modal
window.openProjectModal = function(projectId = null) {
    const isEdit = !!projectId;
    const modal = new Modal({
        title: isEdit ? 'Proje Düzenle' : 'Yeni Proje Ekle',
        content: `
            <form id="projectForm">
                <div class="form-group">
                    <label>Proje Adı <span class="required">*</span></label>
                    <input type="text" id="projectName" class="form-control" required>
                </div>
                
                <div class="form-group">
                    <label>Durum <span class="required">*</span></label>
                    <select id="projectStatus" class="form-control" required>
                        <option value="Aktif">Aktif</option>
                        <option value="Tamamlandı">Tamamlandı</option>
                    </select>
                </div>
                
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').querySelector('.modal-close').click()">
                        İptal
                    </button>
                    <button type="submit" class="btn btn-primary">
                        ${isEdit ? 'Güncelle' : 'Kaydet'}
                    </button>
                </div>
            </form>
        `,
        size: 'medium'
    });

    modal.show();

    const form = document.getElementById('projectForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveProject(projectId, modal);
    });

    if (isEdit) {
        loadProjectData(projectId);
    }
};

async function loadProjectData(projectId) {
    try {
        const { data: projects, error } = await projectService.getAll();
        if (error) throw error;
        
        const project = projects.find(p => p.id === projectId);
        if (project) {
            document.getElementById('projectName').value = project.project_name;
            document.getElementById('projectStatus').value = project.status;
        }
    } catch (error) {
        Toast.error('Proje bilgileri yüklenirken hata oluştu');
    }
}

async function saveProject(projectId, modal) {
    try {
        const projectData = {
            project_name: document.getElementById('projectName').value,
            status: document.getElementById('projectStatus').value
        };

        let result;
        if (projectId) {
            result = await projectService.update(projectId, projectData);
        } else {
            result = await projectService.create(projectData);
        }

        if (result.error) throw result.error;

        Toast.success(projectId ? 'Proje güncellendi' : 'Proje eklendi');
        modal.close();
        await loadProjects();
    } catch (error) {
        console.error('Proje kaydedilirken hata:', error);
        Toast.error('Proje kaydedilirken bir hata oluştu');
    }
}


// Edit functions
window.editProject = function(projectId) {
    window.openProjectModal(projectId);
};

// Toggle project status
window.toggleProjectStatus = async function(projectId, currentStatus) {
    const newStatus = currentStatus === 'Aktif' ? 'Tamamlandı' : 'Aktif';
    const confirmed = await Modal.confirm(
        `Proje durumunu "${newStatus}" olarak değiştirmek istediğinizden emin misiniz?`,
        'Durum Değiştir'
    );

    if (confirmed) {
        try {
            const { error } = await projectService.update(projectId, { status: newStatus });
            if (error) throw error;
            
            Toast.success('Proje durumu güncellendi');
            await loadProjects();
        } catch (error) {
            Toast.error('Durum güncellenirken hata oluştu');
        }
    }
};

// Delete project
window.deleteProject = async function(projectId) {
    const confirmed = await Modal.confirm(
        'Bu projeyi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.',
        'Proje Sil'
    );

    if (confirmed) {
        try {
            const { error } = await projectService.delete(projectId);
            if (error) throw error;
            
            Toast.success('Proje silindi');
            await loadProjects();
        } catch (error) {
            Toast.error('Proje silinirken hata oluştu. Proje kullanımda olabilir.');
        }
    }
};


// ================================
// ACTIVITY MONITORING FUNCTIONS
// ================================

let currentActivityPage = 0;
const activityPageSize = 25;

// Activity Summary yükleme
async function loadActivitySummary() {
    if (!isAdmin()) return;
    
    try {
        const startDate = document.getElementById('filterStartDate')?.value;
        const endDate = document.getElementById('filterEndDate')?.value;
        
        if (!startDate || !endDate) return;
        
        const daysDiff = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1;
        
        const { data, error } = await supabase.rpc('get_activity_summary', {
            days_back: daysDiff
        });
        
        if (error) throw error;
        
        if (data && data.length > 0) {
            const summary = data[0];
            document.getElementById('totalActivities').textContent = summary.total_activities || '0';
            document.getElementById('todayActivities').textContent = summary.today_activities || '0';
            document.getElementById('mostActiveUser').textContent = summary.most_active_user || 'Yok';
            document.getElementById('mostActiveTable').textContent = getTableDisplayName(summary.most_active_table) || 'Yok';
        }
    } catch (error) {
        console.error('Activity summary yükleme hatası:', error);
        Toast.error('Aktivite özeti yüklenirken hata oluştu');
    }
}

// Activity Logs yükleme
async function loadActivityLogs(page = 0) {
    if (!isAdmin()) return;
    
    try {
        currentActivityPage = page;
        
        // Filtreleri al
        const filterUserRole = document.getElementById('filterUserRole')?.value || null;
        const filterActionType = document.getElementById('filterActionType')?.value || null;
        const filterTableName = document.getElementById('filterTableName')?.value || null;
        const startDateStr = document.getElementById('filterStartDate')?.value;
        const endDateStr = document.getElementById('filterEndDate')?.value;
        
        if (!startDateStr || !endDateStr) {
            Toast.error('Lütfen başlangıç ve bitiş tarihi seçin');
            return;
        }
        
        const startDate = new Date(startDateStr + 'T00:00:00');
        const endDate = new Date(endDateStr + 'T23:59:59');
        
        const { data, error } = await supabase.rpc('get_activity_logs', {
            limit_count: activityPageSize,
            offset_count: page * activityPageSize,
            filter_user_role: filterUserRole,
            filter_action_type: filterActionType,
            filter_table_name: filterTableName,
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString()
        });
        
        if (error) throw error;
        
        const tbody = document.getElementById('activityLogsTableBody');
        
        if (data && data.length > 0) {
            tbody.innerHTML = data.map(log => `
                <tr>
                    <td>
                        <div class="activity-datetime">${formatDateTime(log.created_at)}</div>
                    </td>
                    <td>
                        <div class="activity-user-name">${log.user_name}</div>
                    </td>
                    <td>
                        <span class="activity-badge ${getRoleBadgeClass(log.user_role)}">
                            ${getRoleDisplayName(log.user_role)}
                        </span>
                    </td>
                    <td>
                        <span class="activity-badge ${getActionBadgeClass(log.action_type)}">
                            ${getActionDisplayName(log.action_type)}
                        </span>
                    </td>
                    <td>
                        ${getTableDisplayName(log.table_name)}
                    </td>
                    <td>
                        <div class="activity-description">${log.description}</div>
                    </td>
                    <td>
                        ${log.old_values || log.new_values ? 
                            `<button class="activity-action-btn" onclick="window.showActivityDetail('${log.id}', '${log.description}', '${JSON.stringify(log.old_values || {})}', '${JSON.stringify(log.new_values || {})}')">
                                <i class="fas fa-eye"></i>
                            </button>` : 
                            '<span class="text-muted">-</span>'
                        }
                    </td>
                </tr>
            `).join('');
            
            // Pagination güncelle
            updateActivityPagination(data.length);
        } else {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="activity-empty-state">
                        <div class="activity-empty-state-icon">
                            <i class="fas fa-info-circle"></i>
                        </div>
                        <h6>Kayıt bulunamadı</h6>
                        <p>Seçilen filtreler için herhangi bir aktivite kaydı bulunmuyor.</p>
                    </td>
                </tr>
            `;
            updateActivityPagination(0);
        }
        
    } catch (error) {
        console.error('Activity logs yükleme hatası:', error);
        document.getElementById('activityLogsTableBody').innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-danger">
                    <i class="fas fa-exclamation-triangle"></i> Aktivite kayıtları yüklenirken hata oluştu
                </td>
            </tr>
        `;
        Toast.error('Aktivite kayıtları yüklenirken hata oluştu');
    }
}

// Pagination güncelleme
function updateActivityPagination(recordCount) {
    const info = document.getElementById('activityPaginationInfo');
    const prevBtn = document.getElementById('prevActivityBtn');
    const nextBtn = document.getElementById('nextActivityBtn');
    
    const startRecord = (currentActivityPage * activityPageSize) + 1;
    const endRecord = (currentActivityPage * activityPageSize) + recordCount;
    
    info.textContent = `${startRecord}-${endRecord} kayıt gösteriliyor (Sayfa ${currentActivityPage + 1})`;
    
    prevBtn.disabled = currentActivityPage === 0;
    nextBtn.disabled = recordCount < activityPageSize;
}

// Helper functions
function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('tr-TR', {
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getRoleBadgeClass(role) {
    switch(role) {
        case 'admin': return 'activity-badge-danger';
        case 'warehouse': return 'activity-badge-primary';
        case 'accounting': return 'activity-badge-success';
        default: return 'activity-badge-secondary';
    }
}

function getRoleDisplayName(role) {
    switch(role) {
        case 'admin': return 'Admin';
        case 'warehouse': return 'Depocu';
        case 'accounting': return 'Muhasebeci';
        default: return role || 'Sistem';
    }
}

function getActionBadgeClass(action) {
    switch(action) {
        case 'CREATE': return 'activity-badge-success';
        case 'UPDATE': return 'activity-badge-warning';
        case 'DELETE': return 'activity-badge-danger';
        case 'STOCK_IN': return 'activity-badge-success';
        case 'STOCK_OUT': return 'activity-badge-warning';
        case 'LOGIN': return 'activity-badge-info';
        default: return 'activity-badge-secondary';
    }
}

function getActionDisplayName(action) {
    switch(action) {
        case 'CREATE': return 'Ekleme';
        case 'UPDATE': return 'Güncelleme';
        case 'DELETE': return 'Silme';
        case 'STOCK_IN': return 'Satın Alım';
        case 'STOCK_OUT': return 'Satış';
        case 'LOGIN': return 'Giriş';
        case 'LOGOUT': return 'Çıkış';
        default: return action || 'Bilinmiyor';
    }
}

function getTableDisplayName(table) {
    switch(table) {
        case 'products': return 'Ürünler';
        case 'employees': return 'Personel';
        case 'attendance': return 'Puantaj';
        case 'attendance_records': return 'Puantaj Kayıtları';
        case 'inventory_movements': return 'Stok Hareketleri';
        case 'projects': return 'Projeler';
        case 'tasks': return 'Görevler';
        case 'transactions': return 'İşlemler';
        case 'task_personnel': return 'Görev Personeli';
        default: return table || '-';
    }
}

// Global window functions
window.loadActivityLogs = function() {
    loadActivityLogs(0);
    loadActivitySummary();
};

window.loadActivityLogsPage = function(direction) {
    if (direction === 'next') {
        loadActivityLogs(currentActivityPage + 1);
    } else if (direction === 'prev' && currentActivityPage > 0) {
        loadActivityLogs(currentActivityPage - 1);
    }
};

window.resetActivityFilters = function() {
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    document.getElementById('filterUserRole').value = '';
    document.getElementById('filterActionType').value = '';
    document.getElementById('filterTableName').value = '';
    document.getElementById('filterStartDate').value = weekAgo;
    document.getElementById('filterEndDate').value = today;
    loadActivityLogs(0);
    loadActivitySummary();
};

window.showActivityDetail = function(logId, description, oldValues, newValues) {
    try {
        const old = JSON.parse(oldValues);
        const newVal = JSON.parse(newValues);
        
        let detailContent = `<h6>İşlem: ${description}</h6><hr>`;
        
        if (Object.keys(old).length > 0) {
            detailContent += `<h6>Eski Değerler:</h6>`;
            detailContent += `<pre class="bg-light p-2 rounded"><code>${JSON.stringify(old, null, 2)}</code></pre>`;
        }
        
        if (Object.keys(newVal).length > 0) {
            detailContent += `<h6>Yeni Değerler:</h6>`;
            detailContent += `<pre class="bg-light p-2 rounded"><code>${JSON.stringify(newVal, null, 2)}</code></pre>`;
        }
        
        Modal.show({
            title: 'Aktivite Detayları',
            content: detailContent,
            size: 'lg'
        });
        
    } catch (error) {
        Toast.error('Detay gösterilirken hata oluştu');
    }
};

window.exportActivityLogs = async function() {
    try {
        Toast.info('Excel dosyası hazırlanıyor...');
        
        // Filtreleri al
        const filterUserRole = document.getElementById('filterUserRole')?.value || null;
        const filterActionType = document.getElementById('filterActionType')?.value || null;
        const filterTableName = document.getElementById('filterTableName')?.value || null;
        const startDateStr = document.getElementById('filterStartDate')?.value;
        const endDateStr = document.getElementById('filterEndDate')?.value;
        
        if (!startDateStr || !endDateStr) {
            Toast.error('Lütfen başlangıç ve bitiş tarihi seçin');
            return;
        }
        
        const startDate = new Date(startDateStr + 'T00:00:00');
        const endDate = new Date(endDateStr + 'T23:59:59');
        
        const { data, error } = await supabase.rpc('get_activity_logs', {
            limit_count: 1000, // Excel için maksimum kayıt
            offset_count: 0,
            filter_user_role: filterUserRole,
            filter_action_type: filterActionType,
            filter_table_name: filterTableName,
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString()
        });
        
        if (error) throw error;
        
        if (!data || data.length === 0) {
            Toast.warning('Dışa aktarılacak kayıt bulunamadı');
            return;
        }
        
        // CSV formatında hazırla
        const headers = ['Tarih/Saat', 'Kullanıcı', 'Rol', 'İşlem', 'Modül', 'Açıklama'];
        const csvContent = [
            headers.join(','),
            ...data.map(log => [
                formatDateTime(log.created_at),
                log.user_name,
                getRoleDisplayName(log.user_role),
                getActionDisplayName(log.action_type),
                getTableDisplayName(log.table_name),
                `"${log.description.replace(/"/g, '""')}"`
            ].join(','))
        ].join('\\n');
        
        // Dosyayı indir
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `aktivite_kayitlari_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        Toast.success('Excel dosyası indirildi');

    } catch (error) {
        console.error('Excel export hatası:', error);
        Toast.error('Excel dosyası hazırlanırken hata oluştu');
    }
};

// ================================
// ACTIVITY MONITORING SECURITY
// ================================

// Security password verification for activity monitoring access
async function verifyActivityAccess() {
    return new Promise((resolve) => {
        const modal = new Modal({
            title: '🔒 Aktivite İzleme - Güvenlik Doğrulaması',
            content: `
                <div class="security-verification">
                    <div class="alert alert-warning">
                        <i class="fas fa-shield-alt"></i>
                        <strong>Güvenlik Uyarısı:</strong> Aktivite izleme hassas veriler içerir.
                        Erişim için ek güvenlik doğrulaması gereklidir.
                    </div>
                    <form id="securityForm">
                        <div class="form-group">
                            <label for="securityPassword">
                                <i class="fas fa-key"></i> Güvenlik Şifresi
                            </label>
                            <input type="password"
                                   id="securityPassword"
                                   class="form-control"
                                   placeholder="Aktivite izleme şifresini girin"
                                   required
                                   autocomplete="off">
                            <small class="text-muted">
                                Bu şifre sistem yöneticisi tarafından belirlenmiştir.
                            </small>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').querySelector('.modal-close').click()">
                                <i class="fas fa-times"></i> İptal
                            </button>
                            <button type="submit" class="btn btn-danger">
                                <i class="fas fa-unlock"></i> Doğrula ve Erişim Ver
                            </button>
                        </div>
                    </form>
                </div>

                <style>
                .security-verification {
                    padding: 10px 0;
                }
                .security-verification .alert {
                    margin-bottom: 20px;
                    padding: 15px;
                    border-radius: 8px;
                    border-left: 4px solid #ff9800;
                }
                .security-verification .form-group label {
                    font-weight: 600;
                    color: #333;
                    margin-bottom: 8px;
                }
                .security-verification .form-control {
                    border: 2px solid #e9ecef;
                    border-radius: 6px;
                    padding: 10px 12px;
                    font-size: 14px;
                }
                .security-verification .form-control:focus {
                    border-color: #dc3545;
                    box-shadow: 0 0 0 3px rgba(220, 53, 69, 0.15);
                    outline: none;
                }
                .security-verification .modal-footer {
                    margin-top: 20px;
                    padding-top: 15px;
                    border-top: 1px solid #dee2e6;
                    display: flex;
                    justify-content: flex-end;
                    gap: 10px;
                }
                </style>
            `,
            size: 'medium',
            onShow: () => {
                // Focus on password input
                setTimeout(() => {
                    document.getElementById('securityPassword').focus();
                }, 100);
            }
        });

        modal.show();

        // Handle form submission
        document.getElementById('securityForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const password = document.getElementById('securityPassword').value;

            // Security password - you can change this to your desired password
            const ACTIVITY_SECURITY_PASSWORD = 'admin123'; // Change this password

            if (password === ACTIVITY_SECURITY_PASSWORD) {
                modal.close();
                Toast.success('🔓 Aktivite izleme erişimi onaylandı');
                resolve(true);
            } else {
                // Shake animation for wrong password
                const passwordInput = document.getElementById('securityPassword');
                passwordInput.style.border = '2px solid #dc3545';
                passwordInput.style.animation = 'shake 0.5s ease-in-out';

                setTimeout(() => {
                    passwordInput.style.animation = '';
                    passwordInput.style.border = '2px solid #e9ecef';
                }, 500);

                passwordInput.value = '';
                passwordInput.focus();
                Toast.error('❌ Geçersiz güvenlik şifresi!');
            }
        });

        // Handle modal close without verification
        modal.onClose = () => {
            resolve(false);
        };

        // Add shake animation CSS
        if (!document.getElementById('shake-animation')) {
            const style = document.createElement('style');
            style.id = 'shake-animation';
            style.textContent = `
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-5px); }
                    75% { transform: translateX(5px); }
                }
            `;
            document.head.appendChild(style);
        }
    });
}