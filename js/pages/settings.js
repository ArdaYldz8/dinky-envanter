// Settings Page
import { projectService, productService, supabase } from '../services/supabaseService.js';
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
                    <li class="tab-item" data-tab="products">
                        <i class="fas fa-box"></i> Ürünler
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
                    
                    <div class="tab-pane" id="productsTab">
                        <div class="section-header">
                            <h2>Ürün Tanımları</h2>
                            <button class="btn btn-primary" onclick="window.openProductSettingsModal()">
                                <i class="fas fa-plus"></i> Yeni Ürün
                            </button>
                        </div>
                        
                        <div class="table-responsive">
                            <table class="table">
                                <thead>
                                    <tr>
                                        <th>Ürün Kodu</th>
                                        <th>Ürün Adı</th>
                                        <th>Birim</th>
                                        <th>Min. Stok</th>
                                        <th>İşlemler</th>
                                    </tr>
                                </thead>
                                <tbody id="productsTableBody">
                                    <tr>
                                        <td colspan="5" class="text-center">Yükleniyor...</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                    
                    ${isAdmin() ? `
                    <div class="tab-pane" id="activityTab">
                        <div class="section-header">
                            <h2><i class="fas fa-shield-alt"></i> Aktivite İzleme (Admin)</h2>
                            <p class="text-muted">Tüm kullanıcı işlemlerini buradan takip edebilirsiniz.</p>
                        </div>
                        
                        <!-- Activity Summary Cards -->
                        <div class="row mb-4" id="activitySummary">
                            <div class="col-md-3">
                                <div class="card bg-primary text-white">
                                    <div class="card-body">
                                        <div class="d-flex justify-content-between">
                                            <div>
                                                <h3 class="card-title" id="totalActivities">-</h3>
                                                <p class="card-text">Toplam Aktivite (7 gün)</p>
                                            </div>
                                            <i class="fas fa-chart-line fa-2x"></i>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-3">
                                <div class="card bg-success text-white">
                                    <div class="card-body">
                                        <div class="d-flex justify-content-between">
                                            <div>
                                                <h3 class="card-title" id="todayActivities">-</h3>
                                                <p class="card-text">Bugünkü Aktivite</p>
                                            </div>
                                            <i class="fas fa-calendar-day fa-2x"></i>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-3">
                                <div class="card bg-warning text-white">
                                    <div class="card-body">
                                        <div class="d-flex justify-content-between">
                                            <div>
                                                <h6 class="card-title" id="mostActiveUser">-</h6>
                                                <p class="card-text">En Aktif Kullanıcı</p>
                                            </div>
                                            <i class="fas fa-user-star fa-2x"></i>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-3">
                                <div class="card bg-info text-white">
                                    <div class="card-body">
                                        <div class="d-flex justify-content-between">
                                            <div>
                                                <h6 class="card-title" id="mostActiveTable">-</h6>
                                                <p class="card-text">En Çok Kullanılan Modül</p>
                                            </div>
                                            <i class="fas fa-database fa-2x"></i>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Activity Filters -->
                        <div class="card mb-4">
                            <div class="card-header">
                                <h5><i class="fas fa-filter"></i> Filtreler</h5>
                            </div>
                            <div class="card-body">
                                <div class="row">
                                    <div class="col-md-3">
                                        <label>Kullanıcı Rolü</label>
                                        <select class="form-control" id="filterUserRole">
                                            <option value="">Tümü</option>
                                            <option value="admin">Admin</option>
                                            <option value="warehouse">Depocu</option>
                                            <option value="accounting">Muhasebeci</option>
                                        </select>
                                    </div>
                                    <div class="col-md-3">
                                        <label>İşlem Tipi</label>
                                        <select class="form-control" id="filterActionType">
                                            <option value="">Tümü</option>
                                            <option value="CREATE">Ekleme</option>
                                            <option value="UPDATE">Güncelleme</option>
                                            <option value="DELETE">Silme</option>
                                            <option value="LOGIN">Giriş</option>
                                        </select>
                                    </div>
                                    <div class="col-md-3">
                                        <label>Modül</label>
                                        <select class="form-control" id="filterTableName">
                                            <option value="">Tümü</option>
                                            <option value="products">Ürünler</option>
                                            <option value="employees">Personel</option>
                                            <option value="attendance">Puantaj</option>
                                            <option value="inventory_movements">Stok Hareketleri</option>
                                        </select>
                                    </div>
                                    <div class="col-md-3">
                                        <label>Tarih Aralığı</label>
                                        <select class="form-control" id="filterDateRange">
                                            <option value="1">Son 1 gün</option>
                                            <option value="7" selected>Son 7 gün</option>
                                            <option value="30">Son 30 gün</option>
                                            <option value="90">Son 90 gün</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="row mt-3">
                                    <div class="col-md-12">
                                        <button class="btn btn-primary" onclick="window.loadActivityLogs()">
                                            <i class="fas fa-search"></i> Filtrele
                                        </button>
                                        <button class="btn btn-secondary ml-2" onclick="window.resetActivityFilters()">
                                            <i class="fas fa-undo"></i> Temizle
                                        </button>
                                        <button class="btn btn-success ml-2" onclick="window.exportActivityLogs()">
                                            <i class="fas fa-download"></i> Excel'e Aktar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Activity Logs Table -->
                        <div class="card">
                            <div class="card-header">
                                <h5><i class="fas fa-list"></i> Aktivite Kayıtları</h5>
                                <div class="float-right">
                                    <button class="btn btn-sm btn-primary" onclick="window.loadActivityLogs()">
                                        <i class="fas fa-sync"></i> Yenile
                                    </button>
                                </div>
                            </div>
                            <div class="card-body">
                                <div class="table-responsive">
                                    <table class="table table-striped table-sm">
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
                                                <td colspan="7" class="text-center">
                                                    <i class="fas fa-spinner fa-spin"></i> Yükleniyor...
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                                
                                <!-- Pagination -->
                                <div class="d-flex justify-content-between align-items-center mt-3">
                                    <div>
                                        <small class="text-muted" id="activityPaginationInfo">-</small>
                                    </div>
                                    <div>
                                        <button class="btn btn-sm btn-secondary" onclick="window.loadActivityLogsPage('prev')" id="prevActivityBtn" disabled>
                                            <i class="fas fa-chevron-left"></i> Önceki
                                        </button>
                                        <button class="btn btn-sm btn-secondary ml-2" onclick="window.loadActivityLogsPage('next')" id="nextActivityBtn">
                                            Sonraki <i class="fas fa-chevron-right"></i>
                                        </button>
                                    </div>
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
    await loadProductsSettings();
    
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
        item.addEventListener('click', () => {
            // Remove active class from all
            tabItems.forEach(t => t.classList.remove('active'));
            tabPanes.forEach(p => p.classList.remove('active'));
            
            // Add active class to clicked
            item.classList.add('active');
            const tabId = item.dataset.tab;
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

async function loadProductsSettings() {
    try {
        const { data: products, error } = await productService.getAll();
        
        if (error) throw error;
        
        const tbody = document.getElementById('productsTableBody');
        
        if (products && products.length > 0) {
            tbody.innerHTML = products.map(product => `
                <tr data-id="${product.id}">
                    <td>${product.product_code || '-'}</td>
                    <td><strong>${product.product_name}</strong></td>
                    <td>${product.unit}</td>
                    <td>${formatter.number(product.min_stock_level, 2)}</td>
                    <td>
                        <button class="btn btn-sm btn-warning" onclick="window.editProductSettings('${product.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="window.deleteProduct('${product.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">Ürün bulunamadı.</td></tr>';
        }
    } catch (error) {
        console.error('Ürünler yüklenirken hata:', error);
        Toast.error('Ürün listesi yüklenirken hata oluştu');
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

// Product Settings Modal
window.openProductSettingsModal = function(productId = null) {
    const isEdit = !!productId;
    const modal = new Modal({
        title: isEdit ? 'Ürün Düzenle' : 'Yeni Ürün Ekle',
        content: `
            <form id="productSettingsForm">
                <div class="form-group">
                    <label>Ürün Adı <span class="required">*</span></label>
                    <input type="text" id="productName" class="form-control" required>
                </div>
                
                <div class="form-group">
                    <label>Ürün Kodu</label>
                    <input type="text" id="productCode" class="form-control">
                </div>
                
                <div class="form-group">
                    <label>Birim <span class="required">*</span></label>
                    <select id="productUnit" class="form-control" required>
                        <option value="Adet">Adet</option>
                        <option value="Kg">Kg</option>
                        <option value="Metre">Metre</option>
                        <option value="M2">M2</option>
                        <option value="M3">M3</option>
                        <option value="Litre">Litre</option>
                        <option value="Paket">Paket</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Minimum Stok Seviyesi</label>
                    <input type="number" id="minStock" class="form-control" min="0" step="0.01" value="0">
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

    const form = document.getElementById('productSettingsForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveProductSettings(productId, modal);
    });

    if (isEdit) {
        loadProductSettingsData(productId);
    }
};

async function loadProductSettingsData(productId) {
    try {
        const { data: product, error } = await productService.getById(productId);
        if (error) throw error;
        
        document.getElementById('productName').value = product.product_name;
        document.getElementById('productCode').value = product.product_code || '';
        document.getElementById('productUnit').value = product.unit;
        document.getElementById('minStock').value = product.min_stock_level;
    } catch (error) {
        Toast.error('Ürün bilgileri yüklenirken hata oluştu');
    }
}

async function saveProductSettings(productId, modal) {
    try {
        const productData = {
            product_name: document.getElementById('productName').value,
            product_code: document.getElementById('productCode').value || null,
            unit: document.getElementById('productUnit').value,
            min_stock_level: parseFloat(document.getElementById('minStock').value) || 0
        };

        if (!productId) {
            productData.current_stock = 0;
        }

        let result;
        if (productId) {
            result = await productService.update(productId, productData);
        } else {
            result = await productService.create(productData);
        }

        if (result.error) throw result.error;

        Toast.success(productId ? 'Ürün güncellendi' : 'Ürün eklendi');
        modal.close();
        await loadProductsSettings();
    } catch (error) {
        console.error('Ürün kaydedilirken hata:', error);
        Toast.error('Ürün kaydedilirken bir hata oluştu');
    }
}

// Edit functions
window.editProject = function(projectId) {
    window.openProjectModal(projectId);
};

window.editProductSettings = function(productId) {
    window.openProductSettingsModal(productId);
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

// Delete product
window.deleteProduct = async function(productId) {
    const confirmed = await Modal.confirm(
        'Bu ürünü silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.',
        'Ürün Sil'
    );

    if (confirmed) {
        try {
            const { error } = await productService.delete(productId);
            if (error) throw error;
            
            Toast.success('Ürün silindi');
            await loadProductsSettings();
        } catch (error) {
            Toast.error('Ürün silinirken hata oluştu. Ürün kullanımda olabilir.');
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
        const daysBack = parseInt(document.getElementById('filterDateRange')?.value || '7');
        
        const { data, error } = await supabase.rpc('get_activity_summary', {
            days_back: daysBack
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
        const daysBack = parseInt(document.getElementById('filterDateRange')?.value || '7');
        
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysBack);
        
        const { data, error } = await supabase.rpc('get_activity_logs', {
            limit_count: activityPageSize,
            offset_count: page * activityPageSize,
            filter_user_role: filterUserRole,
            filter_action_type: filterActionType,
            filter_table_name: filterTableName,
            start_date: startDate.toISOString()
        });
        
        if (error) throw error;
        
        const tbody = document.getElementById('activityLogsTableBody');
        
        if (data && data.length > 0) {
            tbody.innerHTML = data.map(log => `
                <tr>
                    <td>
                        <small>${formatDateTime(log.created_at)}</small>
                    </td>
                    <td>
                        <strong>${log.user_name}</strong>
                    </td>
                    <td>
                        <span class="badge ${getRoleBadgeClass(log.user_role)}">
                            ${getRoleDisplayName(log.user_role)}
                        </span>
                    </td>
                    <td>
                        <span class="badge ${getActionBadgeClass(log.action_type)}">
                            ${getActionDisplayName(log.action_type)}
                        </span>
                    </td>
                    <td>
                        ${getTableDisplayName(log.table_name)}
                    </td>
                    <td>
                        <small>${log.description}</small>
                    </td>
                    <td>
                        ${log.old_values || log.new_values ? 
                            `<button class="btn btn-sm btn-info" onclick="window.showActivityDetail('${log.id}', '${log.description}', '${JSON.stringify(log.old_values || {})}', '${JSON.stringify(log.new_values || {})}')">
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
                    <td colspan="7" class="text-center text-muted">
                        <i class="fas fa-info-circle"></i> Kayıt bulunamadı
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
        case 'admin': return 'badge-danger';
        case 'warehouse': return 'badge-primary';
        case 'accounting': return 'badge-success';
        default: return 'badge-secondary';
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
        case 'CREATE': return 'badge-success';
        case 'UPDATE': return 'badge-warning';
        case 'DELETE': return 'badge-danger';
        case 'LOGIN': return 'badge-info';
        default: return 'badge-secondary';
    }
}

function getActionDisplayName(action) {
    switch(action) {
        case 'CREATE': return 'Ekleme';
        case 'UPDATE': return 'Güncelleme';
        case 'DELETE': return 'Silme';
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
        case 'inventory_movements': return 'Stok Hareketleri';
        case 'projects': return 'Projeler';
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
    document.getElementById('filterUserRole').value = '';
    document.getElementById('filterActionType').value = '';
    document.getElementById('filterTableName').value = '';
    document.getElementById('filterDateRange').value = '7';
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
        const daysBack = parseInt(document.getElementById('filterDateRange')?.value || '7');
        
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysBack);
        
        const { data, error } = await supabase.rpc('get_activity_logs', {
            limit_count: 1000, // Excel için maksimum kayıt
            offset_count: 0,
            filter_user_role: filterUserRole,
            filter_action_type: filterActionType,
            filter_table_name: filterTableName,
            start_date: startDate.toISOString()
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