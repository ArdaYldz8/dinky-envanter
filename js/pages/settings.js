// Settings Page
import { projectService, productService } from '../services/supabaseService.js';
import { formatter } from '../utils/formatter.js';
import { Toast } from '../utils/toast.js';
import { Modal } from '../components/Modal.js';

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
                </div>
            </div>
        </div>
    `;

    setupTabs();
    await loadProjects();
    await loadProductsSettings();
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