// Stock Management Page
import { productService, inventoryService, employeeService, projectService, barcodeService, supabase } from '../services/supabaseService.js';
import { formatter } from '../utils/formatter.js';
import { Toast } from '../utils/toast.js';
import { Modal } from '../components/Modal.js';
import { escapeHtml } from '../utils/security.js';
import { validateInput, addRealTimeValidation, validateFormOnSubmit } from '../utils/enhancedValidation.js';
import { getValidationRule, createCustomRule } from '../utils/validationRules.js';

// Helper functions for current user
function getCurrentUser() {
    const userStr = localStorage.getItem('dinky_user');
    return userStr ? JSON.parse(userStr) : null;
}

function getCurrentUserName() {
    const user = getCurrentUser();
    return user ? user.name : 'Bilinmiyor';
}

function getCurrentUserId() {
    const user = getCurrentUser();
    // Return null instead of string for UUID fields
    return user && user.id && user.id.includes('-') ? user.id : null;
}


export async function loadStock() {
    const content = document.getElementById('mainContent');
    
    content.innerHTML = `
        <div class="page-header">
            <h1><i class="fas fa-boxes"></i> Stok Yönetimi</h1>
            <p>Ürün tanımları, stok durumu görüntüleme ve satın alım/satış işlemleri.</p>
            <div class="page-actions">
                <a href="#barcode" class="btn btn-primary nav-link">
                    <i class="fas fa-barcode"></i> Barkod İşlemleri
                </a>
                <button class="btn btn-success" onclick="window.openExcelUploadModal()">
                    <i class="fas fa-file-excel"></i> Excel ile Yükle
                </button>
                <button class="btn btn-secondary" onclick="window.openProductModal()">
                    <i class="fas fa-plus"></i> Yeni Ürün
                </button>
            </div>
        </div>
        
        <div class="page-content">
            <div class="search-bar">
                <input type="text" id="productSearch" placeholder="Ürün ara..." class="form-control">
            </div>
            
            <div class="table-responsive">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Ürün Adı</th>
                            <th>Ürün Kodu</th>
                            <th>Birim</th>
                            <th>Stok</th>
                            <th>Ana Grup</th>
                            <th>Alt Kategori</th>
                            <th>Barkod</th>
                            <th>İşlemler</th>
                        </tr>
                    </thead>
                    <tbody id="stockTableBody">
                        <tr>
                            <td colspan="8" class="text-center">Yükleniyor...</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    await loadProducts();
    setupProductSearch();
}

async function loadProducts() {
    try {
        const { data: products, error } = await productService.getAll();
        
        if (error) throw error;
        
        const tbody = document.getElementById('stockTableBody');
        
        if (products && products.length > 0) {
            tbody.innerHTML = products.map(product => {
                const unitWeight = product.unit_weight || 0;
                const totalWeight = (product.current_stock || 0) * unitWeight;
                return `
                <tr data-id="${escapeHtml(product.id)}">
                    <td><strong>${escapeHtml(product.product_name)}</strong></td>
                    <td><span class="text-muted">${escapeHtml(product.product_code || '-')}</span></td>
                    <td>${escapeHtml(product.unit)}</td>
                    <td>${formatter.number(product.current_stock || 0, 0)}</td>
                    <td><span class="badge badge-primary">${escapeHtml(product.category || '-')}</span></td>
                    <td><span class="badge badge-secondary">${escapeHtml(product.subcategory || '-')}</span></td>
                    <td><span class="barcode-cell text-muted">-</span></td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="window.openStockMovementModal('${product.id}')" title="Stok Hareketi">
                            <i class="fas fa-exchange-alt"></i>
                        </button>
                        <!-- Barcode button disabled until database column is added
                        ${false ?
                            `<button class="btn btn-sm btn-success" onclick="window.openBarcodeModal('${product.id}')" title="Barkod İşlemi">
                                <i class="fas fa-barcode"></i>
                            </button>` :
                            ''
                        }
                        -->
                        <button class="btn btn-sm btn-info" onclick="window.viewProductMovements('${product.id}')" title="Hareket Geçmişi">
                            <i class="fas fa-history"></i>
                        </button>
                        <button class="btn btn-sm btn-warning" onclick="window.editProduct('${product.id}')" title="Düzenle">
                            <i class="fas fa-edit"></i>
                        </button>
                    </td>
                </tr>
            `}).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center">Ürün bulunamadı.</td></tr>';
        }
    } catch (error) {
        console.error('Ürünler yüklenirken hata:', error);
        Toast.error('Ürün listesi yüklenirken bir hata oluştu');
    }
}

function setupProductSearch() {
    const searchInput = document.getElementById('productSearch');
    if (!searchInput) return;
    
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const rows = document.querySelectorAll('#stockTableBody tr');
        
        rows.forEach(row => {
            const productName = row.querySelector('td:nth-child(2)')?.textContent.toLowerCase() || '';
            const productCode = row.querySelector('td:first-child')?.textContent.toLowerCase() || '';
            row.style.display = (productName.includes(searchTerm) || productCode.includes(searchTerm)) ? '' : 'none';
        });
    });
}

// NOT: Manuel stok hareketi kaldırıldı - sadece barkod ile işlem yapılır

// Product Modal
window.openProductModal = function(productId = null) {
    const isEdit = !!productId;
    const modal = new Modal({
        title: isEdit ? 'Ürün Düzenle' : 'Yeni Ürün Ekle',
        content: `
            <form id="productForm">
                <div class="form-group">
                    <label>Ürün Adı <span class="required">*</span></label>
                    <input type="text" name="product_name" id="productName" class="form-control" required>
                </div>

                <div class="form-group">
                    <label>Ürün Kodu</label>
                    <input type="text" name="product_code" id="productCode" class="form-control">
                </div>
                
                <!-- Barcode field temporarily disabled until database column is added
                <div class="form-group">
                    <label>Barkod Numarası</label>
                    <input type="text" id="productBarcode" class="form-control">
                </div>
                -->
                
                <div class="form-group">
                    <label>Birim <span class="required">*</span></label>
                    <select id="unit" class="form-control" required>
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
                    <label>Birim Ağırlık (kg)</label>
                    <input type="number" name="unit_weight" id="unitWeight" class="form-control" min="0" step="0.01" placeholder="0.00">
                </div>

                <div class="form-group">
                    <label>Ana Kategori</label>
                    <select name="category" id="productCategory" class="form-control">
                        <option value="">Kategori Seçiniz...</option>
                        <option value="VİDA">VİDA</option>
                        <option value="BOYA">BOYA</option>
                        <option value="ELEKTROD">ELEKTROD</option>
                        <option value="TAŞ">TAŞ</option>
                        <option value="ELDİVEN">ELDİVEN</option>
                        <option value="SİLİKON">SİLİKON</option>
                        <option value="TİNER">TİNER</option>
                        <option value="DİĞER">DİĞER</option>
                        <option value="HIRDAVAT">HIRDAVAT</option>
                    </select>
                </div>

                <div class="form-group">
                    <label>Alt Kategori</label>
                    <input type="text" name="subcategory" id="productSubcategory" class="form-control" placeholder="Alt kategori (opsiyonel)">
                </div>

                ${!isEdit ? `
                    <div class="form-group">
                        <label>Başlangıç Stok Miktarı</label>
                        <input type="number" name="initial_stock" id="initialStock" class="form-control" min="0" step="0.01" value="0">
                    </div>
                ` : ''}
                
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

    const form = document.getElementById('productForm');

    // Add validation
    const validationRules = {
        product_name: { ...getValidationRule('text'), required: true, minLength: 2, maxLength: 200 },
        product_code: { ...getValidationRule('productCode'), maxLength: 20 },
        unit_weight: { ...getValidationRule('weight'), min: 0, max: 999999 },
        subcategory: { ...getValidationRule('text'), maxLength: 100 }
    };

    if (!isEdit) {
        validationRules.initial_stock = { ...getValidationRule('quantity'), min: 0, max: 999999 };
    }

    addRealTimeValidation(form, validationRules);

    validateFormOnSubmit(form, validationRules,
        async (sanitizedData) => {
            await saveProduct(productId, modal, sanitizedData);
        },
        () => {
            Toast.error('Lütfen formu eksiksiz doldurun');
        }
    );

    if (isEdit) {
        loadProductData(productId);
    }
};

async function loadProductData(productId) {
    try {
        const { data: product, error } = await productService.getById(productId);
        if (error) throw error;
        
        document.getElementById('productName').value = product.product_name;
        document.getElementById('productCode').value = product.product_code || '';
        // document.getElementById('productBarcode').value = product.barcode || '';
        document.getElementById('unit').value = product.unit;
        document.getElementById('unitWeight').value = product.unit_weight || '';
        document.getElementById('productCategory').value = product.category || '';
        document.getElementById('productSubcategory').value = product.subcategory || '';
    } catch (error) {
        Toast.error('Ürün bilgileri yüklenirken hata oluştu');
    }
}

async function saveProduct(productId, modal, sanitizedData = null) {
    try {
        const productData = sanitizedData ? {
            product_name: sanitizedData.product_name,
            product_code: sanitizedData.product_code || null,
            unit: document.getElementById('unit').value,
            unit_weight: parseFloat(sanitizedData.unit_weight) || 0,
            min_stock_level: 0,
            category: document.getElementById('productCategory').value || null,
            subcategory: sanitizedData.subcategory || null
        } : {
            product_name: document.getElementById('productName').value,
            product_code: document.getElementById('productCode').value || null,
            unit: document.getElementById('unit').value,
            unit_weight: parseFloat(document.getElementById('unitWeight').value) || 0,
            min_stock_level: 0,
            category: document.getElementById('productCategory').value || null,
            subcategory: document.getElementById('productSubcategory').value || null
        };

        if (!productId) {
            productData.current_stock = sanitizedData ?
                parseFloat(sanitizedData.initial_stock) || 0 :
                parseFloat(document.getElementById('initialStock')?.value) || 0;
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
        await loadProducts();
    } catch (error) {
        console.error('Ürün kaydedilirken hata:', error);
        Toast.error('Ürün kaydedilirken bir hata oluştu');
    }
}

// View Product Movements with Simple Column Filtering
window.viewProductMovements = async function(productId) {
    try {
        const { data: product, error: prodError } = await productService.getById(productId);
        if (prodError) throw prodError;

        // Get all movements for this product
        const { data: allMovements, error: movError } = await inventoryService.getByProduct(productId);
        if (movError) throw movError;

        const modal = new Modal({
            title: `${product.product_name} - Hareket Geçmişi`,
            content: `
                <div class="movement-history">
                    <div class="detail-section">
                        <h4>Ürün Bilgileri</h4>
                        <p><strong>Ürün Kodu:</strong> ${product.product_code || '-'}</p>
                        <p><strong>Birim:</strong> ${product.unit}</p>
                        <p><strong>Mevcut Stok:</strong> ${formatter.stock(product.current_stock)} ${product.unit}</p>
                    </div>

                    <div class="detail-section">
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <h4>Hareketler <span id="movementCount" class="badge badge-info"></span></h4>
                            <small class="text-muted">
                                <i class="fas fa-info-circle"></i> Filtrelemek için kolon başlıklarına tıklayın
                            </small>
                        </div>
                        <div class="table-responsive">
                            <table class="table table-sm table-hover">
                                <thead>
                                    <tr>
                                        <th class="filterable-header" data-column="date">
                                            <span class="header-content">
                                                <span class="header-text">Tarih</span>
                                                <i class="fas fa-sort header-icon"></i>
                                            </span>
                                        </th>
                                        <th class="filterable-header" data-column="type">
                                            <span class="header-content">
                                                <span class="header-text">Tip</span>
                                                <i class="fas fa-filter header-icon"></i>
                                            </span>
                                        </th>
                                        <th>Miktar</th>
                                        <th class="filterable-header" data-column="project">
                                            <span class="header-content">
                                                <span class="header-text">Proje</span>
                                                <i class="fas fa-filter header-icon"></i>
                                            </span>
                                        </th>
                                        <th>Açıklama</th>
                                    </tr>
                                </thead>
                                <tbody id="movementsTableBody">
                                    <!-- Dynamic content will be loaded here -->
                                </tbody>
                            </table>
                        </div>

                        <div id="activeFilters" class="mt-2" style="display: none;">
                            <small class="text-muted">Aktif filtreler: </small>
                            <div id="filterBadges" class="d-inline"></div>
                            <button id="clearAllFilters" class="btn btn-sm btn-outline-secondary ml-2">
                                <i class="fas fa-times"></i> Tümünü Temizle
                            </button>
                        </div>
                    </div>
                </div>
            `,
            size: 'large'
        });

        modal.show();

        // Setup simple column filtering
        setupSimpleColumnFiltering(allMovements, product);

    } catch (error) {
        console.error('Hareket geçmişi yüklenirken hata:', error);
        Toast.error('Hareket geçmişi yüklenirken hata oluştu');
    }
};

// Modern table filtering with proper event delegation
function setupSimpleColumnFiltering(allMovements, product) {
    // Wait for modal content to be fully rendered
    setTimeout(() => {
        const tableBody = document.getElementById('movementsTableBody');
        const countBadge = document.getElementById('movementCount');
        const activeFiltersDiv = document.getElementById('activeFilters');
        const filterBadgesDiv = document.getElementById('filterBadges');
        const clearAllBtn = document.getElementById('clearAllFilters');

        if (!tableBody || !countBadge) {
            console.error('Table elements not found');
            return;
        }

        let activeFilters = {};
        let sortOrder = null;
        let currentFilterMenu = null;

        // Render movements in table
        function renderMovements(movements) {
            if (movements && movements.length > 0) {
                tableBody.innerHTML = movements.map(mov => `
                    <tr>
                        <td>${formatter.date(mov.movement_date)}</td>
                        <td>
                            <span class="badge ${mov.type === 'Giriş' ? 'badge-success' : 'badge-warning'}">
                                ${mov.type}
                            </span>
                        </td>
                        <td>${formatter.stock(mov.quantity)} ${product.unit}</td>
                        <td>${mov.projects?.project_name || '-'}</td>
                        <td>${mov.description || '-'}</td>
                    </tr>
                `).join('');
            } else {
                tableBody.innerHTML = '<tr><td colspan="5" class="text-center">Bu filtreye uygun hareket bulunamadı</td></tr>';
            }
            countBadge.textContent = movements ? movements.length : 0;
        }

        // Update filter badges display
        function updateFilterBadges() {
            const filterCount = Object.keys(activeFilters).length;

            if (filterCount > 0) {
                activeFiltersDiv.style.display = 'block';
                filterBadgesDiv.innerHTML = Object.entries(activeFilters).map(([key, value]) => {
                    const filterName = key === 'type' ? 'Tip' : key === 'project' ? 'Proje' : key;
                    return `<span class="badge badge-primary mr-1" data-filter-badge="${key}">
                        ${filterName}: ${value}
                        <i class="fas fa-times ml-1" style="cursor: pointer;"></i>
                    </span>`;
                }).join('');
            } else {
                activeFiltersDiv.style.display = 'none';
            }
        }

        // Apply filters and sorting
        function applyFilters() {
            let filteredMovements = [...allMovements];

            if (activeFilters.type) {
                filteredMovements = filteredMovements.filter(mov => mov.type === activeFilters.type);
            }

            if (activeFilters.project) {
                filteredMovements = filteredMovements.filter(mov =>
                    (mov.projects?.project_name || '-') === activeFilters.project
                );
            }

            if (sortOrder) {
                filteredMovements.sort((a, b) => {
                    const dateA = new Date(a.movement_date);
                    const dateB = new Date(b.movement_date);
                    return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
                });
            }

            renderMovements(filteredMovements);
            updateFilterBadges();
        }

        // Close any open menu
        function closeMenu() {
            if (currentFilterMenu) {
                currentFilterMenu.remove();
                currentFilterMenu = null;
            }
        }

        // Create and show filter menu
        function showFilterMenu(column, event) {
            // Prevent event bubbling to avoid immediate closure
            event.stopPropagation();
            event.preventDefault();

            closeMenu();

            const menu = document.createElement('div');
            menu.className = 'dropdown-menu show';
            menu.style.cssText = `
                position: fixed;
                left: ${event.clientX}px;
                top: ${event.clientY}px;
                z-index: 10000;
                min-width: 180px;
                max-width: 250px;
                background: #ffffff;
                border: 1px solid #e1e5e9;
                border-radius: 8px;
                box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15), 0 2px 8px rgba(0, 0, 0, 0.1);
                display: block !important;
                opacity: 1;
                visibility: visible;
                transform: none;
                padding: 8px 0;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 14px;
                line-height: 1.4;
                animation: fadeIn 0.15s ease-out;
            `;

            // Add CSS animation keyframes if not already added
            if (!document.getElementById('filter-menu-styles')) {
                const style = document.createElement('style');
                style.id = 'filter-menu-styles';
                style.textContent = `
                    @keyframes fadeIn {
                        from { opacity: 0; transform: translateY(-4px); }
                        to { opacity: 1; transform: translateY(0); }
                    }

                    .filter-dropdown-menu .dropdown-item {
                        padding: 8px 16px;
                        margin: 0 4px;
                        border-radius: 4px;
                        transition: all 0.15s ease;
                        color: #374151;
                        font-weight: 500;
                        border: none;
                        background: none;
                        width: calc(100% - 8px);
                        text-align: left;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    }

                    .filter-dropdown-menu .dropdown-item:hover {
                        background: #f3f4f6;
                        color: #111827;
                        transform: translateX(2px);
                    }

                    .filter-dropdown-menu .dropdown-item.active {
                        background: #3b82f6;
                        color: white;
                        font-weight: 600;
                    }

                    .filter-dropdown-menu .dropdown-item.active:hover {
                        background: #2563eb;
                        transform: translateX(0);
                    }

                    .filter-dropdown-menu .dropdown-divider {
                        margin: 8px 0;
                        border-top: 1px solid #e5e7eb;
                    }

                    .filter-dropdown-menu .dropdown-item.text-muted {
                        color: #6b7280 !important;
                        font-weight: 400;
                        font-size: 13px;
                    }

                    .filter-dropdown-menu .dropdown-item.text-muted:hover {
                        background: #fef2f2;
                        color: #dc2626 !important;
                    }

                    .filter-dropdown-menu .dropdown-item i {
                        width: 16px;
                        text-align: center;
                    }

                    /* Professional table header styles */
                    .filterable-header {
                        cursor: pointer;
                        user-select: none;
                        background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
                        border-bottom: 2px solid #dee2e6 !important;
                        position: relative;
                        transition: all 0.2s ease;
                    }

                    .filterable-header:hover {
                        background: linear-gradient(135deg, #e9ecef 0%, #dee2e6 100%);
                        transform: translateY(-1px);
                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    }

                    .filterable-header .header-content {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        padding: 2px;
                        gap: 8px;
                    }

                    .filterable-header .header-text {
                        font-weight: 600;
                        color: #495057;
                        font-size: 13px;
                        letter-spacing: 0.5px;
                    }

                    .filterable-header .header-icon {
                        font-size: 11px;
                        color: #6c757d;
                        transition: all 0.2s ease;
                        opacity: 0.7;
                    }

                    .filterable-header:hover .header-icon {
                        color: #495057;
                        opacity: 1;
                        transform: scale(1.1);
                    }

                    .filterable-header.active .header-icon {
                        color: #007bff;
                        opacity: 1;
                    }

                    /* Active filter badges professional styling */
                    #activeFilters {
                        background: #f8f9fa;
                        border: 1px solid #e9ecef;
                        border-radius: 8px;
                        padding: 12px 16px;
                    }

                    #activeFilters .badge {
                        background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
                        border: none;
                        padding: 6px 12px;
                        border-radius: 20px;
                        font-weight: 500;
                        font-size: 12px;
                        box-shadow: 0 2px 4px rgba(0,123,255,0.3);
                        transition: all 0.2s ease;
                    }

                    #activeFilters .badge:hover {
                        transform: translateY(-1px);
                        box-shadow: 0 4px 8px rgba(0,123,255,0.4);
                    }

                    #activeFilters .badge i {
                        transition: transform 0.2s ease;
                    }

                    #activeFilters .badge:hover i {
                        transform: scale(1.2);
                    }

                    #clearAllFilters {
                        border-radius: 20px;
                        padding: 4px 12px;
                        font-size: 12px;
                        font-weight: 500;
                        transition: all 0.2s ease;
                    }

                    #clearAllFilters:hover {
                        transform: translateY(-1px);
                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    }
                `;
                document.head.appendChild(style);
            }

            menu.classList.add('filter-dropdown-menu');

            let menuContent = '';

            if (column === 'date') {
                menuContent = `
                    <button class="dropdown-item" data-sort="asc">
                        <i class="fas fa-sort-amount-up"></i> Eskiden Yeniye
                    </button>
                    <button class="dropdown-item" data-sort="desc">
                        <i class="fas fa-sort-amount-down"></i> Yeniden Eskiye
                    </button>
                    ${sortOrder ? '<div class="dropdown-divider"></div><button class="dropdown-item text-muted" data-sort="clear"><i class="fas fa-times"></i> Sıralamayı Kaldır</button>' : ''}
                `;
            } else if (column === 'type') {
                const types = [...new Set(allMovements.map(mov => mov.type))];
                menuContent = types.map(type => `
                    <button class="dropdown-item ${activeFilters.type === type ? 'active bg-primary text-white' : ''}"
                            data-filter="type" data-value="${type}">
                        ${type}
                    </button>
                `).join('') + (activeFilters.type ?
                    '<div class="dropdown-divider"></div><button class="dropdown-item text-muted" data-clear="type"><i class="fas fa-times"></i> Filtreyi Kaldır</button>' : ''
                );
            } else if (column === 'project') {
                const projects = [...new Set(allMovements.map(mov => mov.projects?.project_name || '-'))];
                menuContent = projects.map(project => `
                    <button class="dropdown-item ${activeFilters.project === project ? 'active bg-primary text-white' : ''}"
                            data-filter="project" data-value="${project}">
                        ${project}
                    </button>
                `).join('') + (activeFilters.project ?
                    '<div class="dropdown-divider"></div><button class="dropdown-item text-muted" data-clear="project"><i class="fas fa-times"></i> Filtreyi Kaldır</button>' : ''
                );
            }

            menu.innerHTML = menuContent;
            document.body.appendChild(menu);
            currentFilterMenu = menu;

            // Position menu if it goes off screen
            const rect = menu.getBoundingClientRect();
            if (rect.right > window.innerWidth) {
                menu.style.left = (event.clientX - rect.width) + 'px';
            }
            if (rect.bottom > window.innerHeight) {
                menu.style.top = (event.clientY - rect.height) + 'px';
            }
        }

        // Event delegation for table clicks - attach to table itself
        const tableElement = document.querySelector('#movementsTableBody').closest('table');
        if (!tableElement) {
            console.error('Table element not found');
            return;
        }

        // Add click handler to table headers
        const tableHeaders = document.querySelectorAll('[data-column]');

        tableHeaders.forEach(header => {
            header.addEventListener('click', (e) => {
                const column = header.getAttribute('data-column');
                showFilterMenu(column, e);
            });
        });

        // Handle menu clicks and other interactions
        const handleDocumentClick = (e) => {
            // Filter menu clicks
            if (currentFilterMenu && currentFilterMenu.contains(e.target)) {
                const button = e.target.closest('button');
                if (!button) return;

                // Sort actions
                const sortAction = button.getAttribute('data-sort');
                if (sortAction) {
                    if (sortAction === 'clear') {
                        sortOrder = null;
                        const dateIcon = document.querySelector('[data-column="date"] i');
                        if (dateIcon) dateIcon.className = 'fas fa-sort text-muted';
                    } else {
                        sortOrder = sortAction;
                        const dateIcon = document.querySelector('[data-column="date"] i');
                        if (dateIcon) {
                            dateIcon.className = sortAction === 'asc' ? 'fas fa-sort-up text-primary' : 'fas fa-sort-down text-primary';
                        }
                    }
                    closeMenu();
                    applyFilters();
                    return;
                }

                // Filter actions
                const filterType = button.getAttribute('data-filter');
                const filterValue = button.getAttribute('data-value');
                if (filterType && filterValue) {
                    if (activeFilters[filterType] === filterValue) {
                        delete activeFilters[filterType];
                    } else {
                        activeFilters[filterType] = filterValue;
                    }
                    closeMenu();
                    applyFilters();
                    return;
                }

                // Clear filter actions
                const clearFilter = button.getAttribute('data-clear');
                if (clearFilter) {
                    delete activeFilters[clearFilter];
                    closeMenu();
                    applyFilters();
                    return;
                }
                return;
            }

            // Filter badge removal clicks
            const filterBadge = e.target.closest('[data-filter-badge]');
            if (filterBadge && e.target.classList.contains('fa-times')) {
                const filterKey = filterBadge.getAttribute('data-filter-badge');
                delete activeFilters[filterKey];
                applyFilters();
                return;
            }

            // Clear all filters button
            if (e.target.closest('#clearAllFilters')) {
                activeFilters = {};
                sortOrder = null;
                const dateIcon = document.querySelector('[data-column="date"] i');
                if (dateIcon) dateIcon.className = 'fas fa-sort text-muted';
                applyFilters();
                return;
            }

            // Close menu on any other click
            closeMenu();
        };

        // Add document click handler with small delay to avoid immediate closure
        setTimeout(() => {
            document.addEventListener('click', handleDocumentClick);
        }, 100);

        // Initial render
        renderMovements(allMovements);

    }, 100); // Small delay to ensure DOM is ready
}

// Edit Product
window.editProduct = function(productId) {
    window.openProductModal(productId);
};

// Excel Upload Modal
window.openExcelUploadModal = function() {
    const modal = new Modal({
        title: 'Excel ile Ürün Yükleme',
        content: `
            <style>
                .excel-upload-modal {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                }

                .upload-header {
                    background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
                    color: white;
                    padding: 20px;
                    margin: -20px -20px 30px -20px;
                    border-radius: 8px 8px 0 0;
                    text-align: center;
                }

                .upload-header h4 {
                    margin: 0;
                    font-weight: 600;
                    font-size: 18px;
                }

                .upload-header p {
                    margin: 8px 0 0 0;
                    opacity: 0.9;
                    font-size: 14px;
                }

                .format-info-card {
                    background: #f8f9fa;
                    border: 1px solid #e9ecef;
                    border-radius: 12px;
                    padding: 20px;
                    margin-bottom: 25px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
                }

                .format-info-header {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin-bottom: 15px;
                    color: #495057;
                }

                .format-info-header i {
                    background: linear-gradient(135deg, #007bff, #0056b3);
                    color: white;
                    padding: 8px;
                    border-radius: 50%;
                    font-size: 14px;
                    width: 32px;
                    height: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .format-info-header h6 {
                    margin: 0;
                    font-weight: 600;
                    font-size: 16px;
                }

                .columns-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 12px;
                    margin-bottom: 20px;
                }

                .column-item {
                    background: white;
                    border: 1px solid #dee2e6;
                    border-radius: 8px;
                    padding: 12px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    transition: all 0.2s ease;
                }

                .column-item:hover {
                    border-color: #007bff;
                    box-shadow: 0 2px 8px rgba(0,123,255,0.15);
                    transform: translateY(-1px);
                }

                .column-item i {
                    color: #007bff;
                    width: 16px;
                }

                .column-text {
                    flex: 1;
                }

                .column-name {
                    font-weight: 600;
                    color: #495057;
                    font-size: 13px;
                }

                .column-desc {
                    color: #6c757d;
                    font-size: 11px;
                    margin-top: 2px;
                }

                .required-badge {
                    background: #dc3545;
                    color: white;
                    font-size: 10px;
                    padding: 2px 6px;
                    border-radius: 10px;
                    font-weight: 500;
                }

                .optional-badge {
                    background: #6c757d;
                    color: white;
                    font-size: 10px;
                    padding: 2px 6px;
                    border-radius: 10px;
                    font-weight: 500;
                }

                .template-download {
                    background: linear-gradient(135deg, #17a2b8, #138496);
                    color: white;
                    padding: 12px 20px;
                    border-radius: 10px;
                    text-decoration: none;
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    font-weight: 500;
                    transition: all 0.2s ease;
                    border: none;
                    cursor: pointer;
                }

                .template-download:hover {
                    color: white;
                    text-decoration: none;
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(23,162,184,0.3);
                }

                .upload-section {
                    background: white;
                    border: 2px dashed #dee2e6;
                    border-radius: 12px;
                    padding: 25px;
                    margin-bottom: 25px;
                    text-align: center;
                    transition: all 0.2s ease;
                }

                .upload-section.drag-over {
                    border-color: #007bff;
                    background: #f8f9fa;
                }

                .upload-section:hover {
                    border-color: #007bff;
                    background: #f8f9fa;
                }

                .file-input-wrapper {
                    position: relative;
                    overflow: hidden;
                    display: inline-block;
                }

                .file-input-styled {
                    background: linear-gradient(135deg, #007bff, #0056b3);
                    color: white;
                    padding: 12px 24px;
                    border-radius: 8px;
                    border: none;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .file-input-styled:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(0,123,255,0.3);
                }

                .file-input-real {
                    position: absolute;
                    left: 0;
                    top: 0;
                    opacity: 0;
                    cursor: pointer;
                    width: 100%;
                    height: 100%;
                }

                .selected-file {
                    margin-top: 15px;
                    padding: 10px 15px;
                    background: #d4edda;
                    border: 1px solid #c3e6cb;
                    border-radius: 8px;
                    color: #155724;
                    display: none;
                }

                .options-section {
                    background: #f8f9fa;
                    border: 1px solid #e9ecef;
                    border-radius: 12px;
                    padding: 20px;
                    margin-bottom: 25px;
                }

                .options-title {
                    color: #495057;
                    font-weight: 600;
                    margin-bottom: 15px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .custom-checkbox-modern {
                    margin-bottom: 12px;
                }

                .custom-checkbox-modern .custom-control-label {
                    font-weight: 500;
                    color: #495057;
                    cursor: pointer;
                    padding-left: 8px;
                }

                .custom-checkbox-modern .custom-control-label::before {
                    border-radius: 6px;
                    border: 2px solid #dee2e6;
                    transition: all 0.2s ease;
                }

                .custom-checkbox-modern .custom-control-input:checked ~ .custom-control-label::before {
                    background: linear-gradient(135deg, #28a745, #20c997);
                    border-color: #28a745;
                }

                .progress-section {
                    background: #f8f9fa;
                    border: 1px solid #e9ecef;
                    border-radius: 12px;
                    padding: 20px;
                    margin-bottom: 20px;
                }

                .progress-modern {
                    height: 10px;
                    border-radius: 10px;
                    background: #e9ecef;
                    overflow: hidden;
                    margin-bottom: 10px;
                }

                .progress-bar-modern {
                    height: 100%;
                    background: linear-gradient(90deg, #28a745, #20c997);
                    border-radius: 10px;
                    transition: width 0.3s ease;
                    position: relative;
                    overflow: hidden;
                }

                .progress-bar-modern::after {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    bottom: 0;
                    right: 0;
                    background: linear-gradient(
                        90deg,
                        transparent,
                        rgba(255,255,255,0.2),
                        transparent
                    );
                    animation: shimmer 2s infinite;
                }

                @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }

                .modal-footer-modern {
                    border-top: 1px solid #e9ecef;
                    padding-top: 20px;
                    margin-top: 30px;
                    display: flex;
                    gap: 12px;
                    justify-content: flex-end;
                }

                .btn-modern-cancel {
                    background: #6c757d;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 8px;
                    font-weight: 500;
                    transition: all 0.2s ease;
                }

                .btn-modern-cancel:hover {
                    background: #545b62;
                    transform: translateY(-1px);
                }

                .btn-modern-submit {
                    background: linear-gradient(135deg, #28a745, #20c997);
                    color: white;
                    border: none;
                    padding: 10px 24px;
                    border-radius: 8px;
                    font-weight: 500;
                    transition: all 0.2s ease;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .btn-modern-submit:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(40,167,69,0.3);
                }

                .btn-modern-submit:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                    transform: none;
                }
            </style>

            <div class="excel-upload-modal">
                <div class="upload-header">
                    <h4><i class="fas fa-file-excel"></i> Excel ile Toplu Ürün Yükleme</h4>
                    <p>Envanterinizi hızlı ve kolay bir şekilde güncelleyin</p>
                </div>

                <div class="format-info-card">
                    <div class="format-info-header">
                        <i class="fas fa-table"></i>
                        <h6>Excel Dosyası Format Bilgileri</h6>
                    </div>

                    <div class="columns-grid">
                        <div class="column-item">
                            <i class="fas fa-asterisk"></i>
                            <div class="column-text">
                                <div class="column-name">Ürün Adı</div>
                                <div class="column-desc">Ürün ismi</div>
                            </div>
                            <span class="required-badge">Zorunlu</span>
                        </div>

                        <div class="column-item">
                            <i class="fas fa-barcode"></i>
                            <div class="column-text">
                                <div class="column-name">Ürün Kodu</div>
                                <div class="column-desc">Benzersiz kod</div>
                            </div>
                            <span class="optional-badge">İsteğe bağlı</span>
                        </div>

                        <div class="column-item">
                            <i class="fas fa-ruler"></i>
                            <div class="column-text">
                                <div class="column-name">Birim</div>
                                <div class="column-desc">Adet, Kg, Metre vb.</div>
                            </div>
                            <span class="optional-badge">İsteğe bağlı</span>
                        </div>

                        <div class="column-item">
                            <i class="fas fa-cubes"></i>
                            <div class="column-text">
                                <div class="column-name">Stok Miktarı</div>
                                <div class="column-desc">Mevcut miktar</div>
                            </div>
                            <span class="optional-badge">İsteğe bağlı</span>
                        </div>

                        <div class="column-item">
                            <i class="fas fa-tags"></i>
                            <div class="column-text">
                                <div class="column-name">Ana Kategori</div>
                                <div class="column-desc">VİDA, BOYA vb.</div>
                            </div>
                            <span class="optional-badge">İsteğe bağlı</span>
                        </div>

                        <div class="column-item">
                            <i class="fas fa-tag"></i>
                            <div class="column-text">
                                <div class="column-name">Alt Kategori</div>
                                <div class="column-desc">Detay kategori</div>
                            </div>
                            <span class="optional-badge">İsteğe bağlı</span>
                        </div>
                    </div>

                    <div style="text-align: center;">
                        <button onclick="downloadExcelTemplate()" class="template-download">
                            <i class="fas fa-download"></i>
                            Örnek Excel Şablonunu İndir
                        </button>
                    </div>
                </div>

                <form id="excelUploadForm">
                    <div class="upload-section">
                        <div class="file-input-wrapper">
                            <button type="button" class="file-input-styled">
                                <i class="fas fa-cloud-upload-alt"></i>
                                Excel Dosyası Seçin
                            </button>
                            <input type="file" id="excelFile" class="file-input-real" accept=".xlsx,.xls" required>
                        </div>
                        <div class="selected-file" id="selectedFile">
                            <i class="fas fa-file-excel"></i>
                            <span id="fileName"></span>
                        </div>
                        <small class="text-muted mt-2">Desteklenen formatlar: .xlsx, .xls (Maksimum 10MB)</small>
                    </div>

                    <div class="options-section">
                        <div class="options-title">
                            <i class="fas fa-cogs"></i>
                            İşlem Seçenekleri
                        </div>

                        <div class="custom-checkbox-modern">
                            <div class="custom-control custom-checkbox">
                                <input type="checkbox" class="custom-control-input" id="updateExisting">
                                <label class="custom-control-label" for="updateExisting">
                                    <i class="fas fa-sync-alt"></i> Mevcut ürünleri güncelle (Ürün kodu eşleşmesi ile)
                                </label>
                            </div>
                        </div>

                        <div class="custom-checkbox-modern">
                            <div class="custom-control custom-checkbox">
                                <input type="checkbox" class="custom-control-input" id="addMissingProducts" checked>
                                <label class="custom-control-label" for="addMissingProducts">
                                    <i class="fas fa-plus-circle"></i> Yeni ürünleri sisteme ekle
                                </label>
                            </div>
                        </div>
                    </div>

                    <div id="uploadProgress" class="progress-section" style="display: none;">
                        <div class="progress-modern">
                            <div id="progressBar" class="progress-bar-modern" style="width: 0%"></div>
                        </div>
                        <div style="text-align: center;">
                            <small id="progressText" class="text-muted">Hazırlanıyor...</small>
                        </div>
                    </div>

                    <div id="uploadResults" style="display: none;" class="mt-3">
                        <!-- Sonuçlar buraya gelecek -->
                    </div>

                    <div class="modal-footer-modern">
                        <button type="button" class="btn-modern-cancel" onclick="this.closest('.modal').querySelector('.modal-close').click()">
                            İptal
                        </button>
                        <button type="submit" class="btn-modern-submit">
                            <i class="fas fa-upload"></i>
                            Yükle ve İşle
                        </button>
                    </div>
                </form>
            </div>
        `,
        size: 'large'
    });

    modal.show();

    // Setup form handler
    const form = document.getElementById('excelUploadForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await processExcelUpload();
    });
};

// Excel Processing Functions
async function loadSheetJS() {
    if (window.XLSX) return; // Already loaded

    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

async function processExcelUpload() {
    try {
        const fileInput = document.getElementById('excelFile');
        const updateExisting = document.getElementById('updateExisting').checked;
        const addMissingProducts = document.getElementById('addMissingProducts').checked;
        const progressDiv = document.getElementById('uploadProgress');
        const progressBar = document.getElementById('progressBar');
        const progressText = document.getElementById('progressText');
        const resultsDiv = document.getElementById('uploadResults');

        if (!fileInput.files.length) {
            Toast.error('Lütfen bir Excel dosyası seçin');
            return;
        }

        const file = fileInput.files[0];

        // Show progress
        progressDiv.style.display = 'block';
        progressText.textContent = 'SheetJS kütüphanesi yükleniyor...';
        progressBar.style.width = '10%';

        // Load SheetJS library
        await loadSheetJS();

        progressText.textContent = 'Excel dosyası okunuyor...';
        progressBar.style.width = '30%';

        // Read Excel file
        const data = await readExcelFile(file);

        progressText.textContent = 'Veriler işleniyor...';
        progressBar.style.width = '50%';

        // Parse and validate data
        const parsedData = parseExcelData(data);

        if (parsedData.length === 0) {
            throw new Error('Excel dosyasında geçerli veri bulunamadı');
        }

        progressText.textContent = 'Ürünler veritabanına işleniyor...';
        progressBar.style.width = '70%';

        // Process products
        const results = await processProducts(parsedData, updateExisting, addMissingProducts, (progress) => {
            const currentProgress = 70 + (progress * 30 / 100);
            progressBar.style.width = currentProgress + '%';
            progressText.textContent = `Ürünler işleniyor... (${Math.round(progress)}%)`;
        });

        progressBar.style.width = '100%';
        progressText.textContent = 'İşlem tamamlandı!';

        // Show results
        showUploadResults(results);

        // Refresh product list
        await loadProducts();

        Toast.success(`İşlem tamamlandı! ${results.success} ürün başarıyla işlendi.`);

    } catch (error) {
        console.error('Excel yükleme hatası:', error);
        Toast.error('Excel dosyası işlenirken hata oluştu: ' + error.message);

        const resultsDiv = document.getElementById('uploadResults');
        resultsDiv.style.display = 'block';
        resultsDiv.innerHTML = `
            <div class="alert alert-danger">
                <h5><i class="fas fa-exclamation-triangle"></i> Hata</h5>
                <p>${error.message}</p>
            </div>
        `;
    }
}

function readExcelFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });

                if (workbook.SheetNames.length === 0) {
                    reject(new Error('Excel dosyasında sayfa bulunamadı'));
                    return;
                }

                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                resolve(jsonData);
            } catch (error) {
                reject(new Error('Excel dosyası okunamadı: ' + error.message));
            }
        };
        reader.onerror = () => reject(new Error('Dosya okuma hatası'));
        reader.readAsArrayBuffer(file);
    });
}

function parseExcelData(rawData) {
    if (rawData.length < 2) {
        throw new Error('Excel dosyasında yeterli veri yok (en az başlık satırı + 1 veri satırı gerekli)');
    }

    const headers = rawData[0].map(h => h ? h.toString().toLowerCase().trim() : '');
    const rows = rawData.slice(1);

    // Find column indices
    const columnMap = {
        name: findColumnIndex(headers, ['ürün adı', 'urun adi', 'name', 'product name']),
        code: findColumnIndex(headers, ['ürün kodu', 'urun kodu', 'code', 'product code']),
        unit: findColumnIndex(headers, ['birim', 'unit']),
        stock: findColumnIndex(headers, ['stok', 'stok miktarı', 'stock', 'quantity']),
        category: findColumnIndex(headers, ['ana kategori', 'kategori', 'category']),
        subcategory: findColumnIndex(headers, ['alt kategori', 'subcategory']),
        weight: findColumnIndex(headers, ['birim ağırlık', 'ağırlık', 'weight'])
    };

    if (columnMap.name === -1) {
        throw new Error('Excel dosyasında "Ürün Adı" kolonu bulunamadı');
    }

    const parsedProducts = [];

    rows.forEach((row, index) => {
        if (!row || row.length === 0 || !row[columnMap.name]) return;

        try {
            const product = {
                product_name: cleanString(row[columnMap.name]),
                product_code: columnMap.code !== -1 ? cleanString(row[columnMap.code]) : null,
                unit: columnMap.unit !== -1 ? cleanString(row[columnMap.unit]) || 'Adet' : 'Adet',
                current_stock: columnMap.stock !== -1 ? parseFloat(row[columnMap.stock]) || 0 : 0,
                category: columnMap.category !== -1 ? cleanString(row[columnMap.category]) : null,
                subcategory: columnMap.subcategory !== -1 ? cleanString(row[columnMap.subcategory]) : null,
                unit_weight: columnMap.weight !== -1 ? parseFloat(row[columnMap.weight]) || 0 : 0,
                min_stock_level: 0,
                row_number: index + 2 // Excel row number (1-based + header)
            };

            // Validate required fields
            if (!product.product_name.trim()) {
                console.warn(`Satır ${product.row_number}: Ürün adı boş, atlanıyor`);
                return;
            }

            // Validate unit
            const validUnits = ['Adet', 'Kg', 'Metre', 'M2', 'M3', 'Litre', 'Paket'];
            if (!validUnits.includes(product.unit)) {
                console.warn(`Satır ${product.row_number}: Geçersiz birim "${product.unit}", "Adet" olarak ayarlanıyor`);
                product.unit = 'Adet';
            }

            parsedProducts.push(product);

        } catch (error) {
            console.warn(`Satır ${index + 2}: Parse hatası - ${error.message}`);
        }
    });

    return parsedProducts;
}

function findColumnIndex(headers, possibleNames) {
    for (const name of possibleNames) {
        const index = headers.findIndex(h => h.includes(name.toLowerCase()));
        if (index !== -1) return index;
    }
    return -1;
}

function cleanString(value) {
    if (value === null || value === undefined) return '';
    return value.toString().trim();
}

async function processProducts(products, updateExisting, addMissingProducts, progressCallback) {
    const results = {
        success: 0,
        updated: 0,
        added: 0,
        skipped: 0,
        errors: [],
        processed: []
    };

    // Get existing products if update is enabled
    let existingProducts = [];
    if (updateExisting) {
        const { data, error } = await productService.getAll();
        if (!error && data) {
            existingProducts = data;
        }
    }

    for (let i = 0; i < products.length; i++) {
        const product = products[i];

        try {
            let existingProduct = null;
            if (updateExisting && product.product_code) {
                existingProduct = existingProducts.find(p => p.product_code === product.product_code);
            }

            if (existingProduct) {
                // Update existing product
                const { error } = await productService.update(existingProduct.id, product);
                if (error) {
                    throw error;
                }
                results.updated++;
                results.success++;
                results.processed.push({ ...product, action: 'updated', id: existingProduct.id });
            } else if (addMissingProducts) {
                // Add new product
                const { data, error } = await productService.create(product);
                if (error) {
                    throw error;
                }
                results.added++;
                results.success++;
                results.processed.push({ ...product, action: 'added', id: data.id });
            } else {
                results.skipped++;
                results.processed.push({ ...product, action: 'skipped' });
            }

        } catch (error) {
            results.errors.push({
                row: product.row_number,
                product: product.product_name,
                error: error.message
            });
        }

        // Update progress
        const progress = ((i + 1) / products.length) * 100;
        progressCallback(progress);

        // Small delay to prevent overwhelming the database
        if (i % 10 === 0) {
            await new Promise(resolve => setTimeout(resolve, 50));
        }
    }

    return results;
}

function showUploadResults(results) {
    const resultsDiv = document.getElementById('uploadResults');
    resultsDiv.style.display = 'block';

    let html = `
        <div class="alert alert-success">
            <h5><i class="fas fa-check-circle"></i> İşlem Tamamlandı</h5>
            <div class="row">
                <div class="col-md-3">
                    <strong>Toplam İşlenen:</strong><br>
                    <span class="badge badge-primary">${results.success + results.errors.length}</span>
                </div>
                <div class="col-md-3">
                    <strong>Başarılı:</strong><br>
                    <span class="badge badge-success">${results.success}</span>
                </div>
                <div class="col-md-3">
                    <strong>Eklenen:</strong><br>
                    <span class="badge badge-info">${results.added}</span>
                </div>
                <div class="col-md-3">
                    <strong>Güncellenen:</strong><br>
                    <span class="badge badge-warning">${results.updated}</span>
                </div>
            </div>
        </div>
    `;

    if (results.errors.length > 0) {
        html += `
            <div class="alert alert-warning">
                <h6><i class="fas fa-exclamation-triangle"></i> Hatalar (${results.errors.length})</h6>
                <div style="max-height: 200px; overflow-y: auto;">
                    ${results.errors.map(err =>
                        `<small>Satır ${err.row} - ${err.product}: ${err.error}</small>`
                    ).join('<br>')}
                </div>
            </div>
        `;
    }

    resultsDiv.innerHTML = html;
}

// Download Excel Template
window.downloadExcelTemplate = async function() {
    // Ensure XLSX library is loaded
    if (typeof XLSX === 'undefined') {
        try {
            await loadSheetJS();
        } catch (error) {
            console.error('XLSX kütüphanesi yüklenemedi:', error);
            alert('Excel kütüphanesi yüklenemedi. Lütfen sayfayı yenileyin.');
            return;
        }
    }

    const templateData = [
        ['Ürün Adı', 'Ürün Kodu', 'Birim', 'Stok Miktarı', 'Ana Kategori', 'Alt Kategori', 'Birim Ağırlık'],
        ['Örnek Vida M8x20', 'VID-001', 'Adet', 100, 'VİDA', 'M8', 0.05],
        ['Örnek Boya Beyaz', 'BOY-001', 'Litre', 25, 'BOYA', 'Duvar Boyası', 1.2],
        ['Örnek Elektrod', 'ELK-001', 'Kg', 50, 'ELEKTROD', 'Özçelik', 1.0]
    ];

    try {
        // Create workbook with proper formatting
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(templateData);

        // Set column widths for better readability
        const wscols = [
            { wch: 20 }, // Ürün Adı
            { wch: 12 }, // Ürün Kodu
            { wch: 8 },  // Birim
            { wch: 12 }, // Stok Miktarı
            { wch: 15 }, // Ana Kategori
            { wch: 15 }, // Alt Kategori
            { wch: 12 }  // Birim Ağırlık
        ];
        ws['!cols'] = wscols;

        // Format header row
        const headerRange = XLSX.utils.decode_range(ws['!ref']);
        for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
            const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
            if (!ws[cellAddress]) continue;
            ws[cellAddress].s = {
                font: { bold: true, sz: 12 },
                fill: { fgColor: { rgb: "E6E6FA" } },
                alignment: { horizontal: "center" }
            };
        }

        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(wb, ws, 'Urunler');

        // Create proper Excel file with correct MIME type
        const wbout = XLSX.write(wb, {
            bookType: 'xlsx',
            type: 'array',
            compression: true
        });

        // Create blob and download
        const blob = new Blob([wbout], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });

        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.download = 'urun_sablonu.xlsx';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        console.log('Excel şablonu başarıyla oluşturuldu');
    } catch (error) {
        console.error('Excel şablonu oluşturulamadı:', error);
        alert('Excel şablonu oluşturulamadı. Hata: ' + error.message);
    }
};

// Manual Stock Movement Modal
window.openStockMovementModal = async function(productId) {
    try {
        const { data: product, error } = await productService.getById(productId);
        if (error) throw error;
        
        // Get employees and projects for dropdowns
        const { data: employees } = await employeeService.getActive();
        const { data: projects } = await projectService.getActive();
        
        const modal = new Modal({
            title: `Stok Hareketi - ${product.product_name}`,
            content: `
                <div class="stock-movement-modal">
                    <div class="product-info-summary">
                        <h4>${product.product_name}</h4>
                        <p><strong>Ürün Kodu:</strong> ${product.product_code || '-'}</p>
                        <p><strong>Mevcut Stok:</strong> <span class="badge badge-primary">${formatter.stock(product.current_stock)} ${product.unit}</span></p>
                    </div>
                    
                    <form id="stockMovementForm">
                        <div class="form-row">
                            <div class="form-group col-md-6">
                                <label>İşlem Tipi <span class="required">*</span></label>
                                <select id="movementType" class="form-control" required>
                                    <option value="Giriş">Satın Alım</option>
                                    <option value="Çıkış">Satış</option>
                                </select>
                            </div>
                            
                            <div class="form-group col-md-6">
                                <label>Miktar <span class="required">*</span></label>
                                <div class="input-group">
                                    <input type="number" id="movementQuantity" class="form-control" 
                                           min="0.01" step="0.01" placeholder="0" required>
                                    <div class="input-group-append">
                                        <span class="input-group-text">${product.unit}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group col-md-6">
                                <label>İşlemi Yapan</label>
                                <input type="text" id="movementPerformedBy" class="form-control" 
                                       value="${getCurrentUserName()}" readonly style="background: #f8f9fa;">
                                <small class="text-muted">İşlem kaydında otomatik olarak kaydedilecek</small>
                            </div>
                            
                            <div class="form-group col-md-6" id="movementProjectGroup" style="display:none;">
                                <label>Proje <span class="required">*</span></label>
                                <select id="movementProjectId" class="form-control">
                                    <option value="">Seçiniz...</option>
                                    ${projects ? projects.map(proj => 
                                        `<option value="${proj.id}">${proj.project_name}</option>`
                                    ).join('') : ''}
                                </select>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label>Açıklama</label>
                            <textarea id="movementDescription" class="form-control" rows="2" 
                                      placeholder="İşlem açıklaması (isteğe bağlı)"></textarea>
                        </div>
                        
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').querySelector('.modal-close').click()">
                                İptal
                            </button>
                            <button type="submit" class="btn btn-primary">
                                <i class="fas fa-save"></i> İşlemi Kaydet
                            </button>
                        </div>
                    </form>
                </div>
            `,
            size: 'medium'
        });
        
        modal.show();
        
        // Setup form handlers
        const form = document.getElementById('stockMovementForm');
        const typeSelect = document.getElementById('movementType');
        const projectGroup = document.getElementById('movementProjectGroup');
        const projectSelect = document.getElementById('movementProjectId');
        
        // Show/hide project field for stock out
        typeSelect.addEventListener('change', (e) => {
            if (e.target.value === 'Çıkış') {
                projectGroup.style.display = 'block';
                projectSelect.required = true;
            } else {
                projectGroup.style.display = 'none';
                projectSelect.required = false;
                projectSelect.value = '';
            }
        });
        
        // Form submit handler
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await processStockMovement(product, modal);
        });
        
    } catch (error) {
        console.error('Stok hareketi modal yüklenirken hata:', error);
        Toast.error('İşlem penceresi açılırken hata oluştu');
    }
};

// Process manual stock movement
async function processStockMovement(product, modal) {
    try {
        const type = document.getElementById('movementType').value;
        const quantity = parseFloat(document.getElementById('movementQuantity').value);
        // Don't use employeeId from the form as it's not a valid UUID
        const employeeId = null; // Set to null for now
        const projectId = document.getElementById('movementProjectId').value || null;
        const description = document.getElementById('movementDescription').value || null;
        
        // Validation
        if (!quantity || quantity <= 0) {
            Toast.error('Geçerli bir miktar giriniz');
            return;
        }
        
        if (type === 'Çıkış') {
            if (!projectId) {
                Toast.error('Çıkış işlemi için proje seçimi zorunludur');
                return;
            }
            
            if (quantity > product.current_stock) {
                Toast.error(`Yetersiz stok. Mevcut: ${formatter.stock(product.current_stock)} ${product.unit}`);
                return;
            }
        }
        
        // Save movement
        const { data, error } = await inventoryService.create({
            product_id: product.id,
            type: type,
            quantity: quantity,
            employee_id: employeeId,
            project_id: projectId,
            description: description,
            movement_date: new Date().toISOString().split('T')[0],
            // created_by will be set automatically by inventory service
        });
        
        if (error) {
            Toast.error('İşlem hatası: ' + error.message);
            return;
        }
        
        Toast.success(`${type} işlemi başarılı: ${quantity} ${product.unit}`);
        modal.close();
        
        // Refresh product list
        await loadProducts();
        
    } catch (error) {
        console.error('Stok hareketi işlemi hatası:', error);
        Toast.error('İşlem kaydedilirken hata oluştu');
    }
}

// Barcode Operation Modal
window.openBarcodeModal = async function(productId) {
    try {
        // Get product details
        const { data: product, error } = await productService.getById(productId);
        if (error) throw error;
        
        if (!product.barcode) {
            Toast.warning('Bu ürünün barkod numarası tanımlanmamış. Önce ürünü düzenleyip barkod ekleyin.');
            return;
        }

        const modal = new Modal({
            title: `Barkod İşlemi - ${product.product_name}`,
            content: `
                <div class="barcode-operation-modal">
                    <div class="product-summary">
                        <div class="product-info-grid">
                            <div class="product-details">
                                <h4>${product.product_name}</h4>
                                <p><strong>Ürün Kodu:</strong> ${product.product_code || '-'}</p>
                                <p><strong>Barkod:</strong> <span class="barcode-cell">${product.barcode}</span></p>
                                <p><strong>Mevcut Stok:</strong> <strong>${formatter.stock(product.current_stock)} ${product.unit}</strong></p>
                            </div>
                            <div class="barcode-visual">
                                <svg id="modal-barcode-display"></svg>
                            </div>
                        </div>
                    </div>
                    
                    <div class="operation-form">
                        <form id="barcodeOperationForm">
                            <div class="form-row">
                                <div class="form-group">
                                    <label>İşlem Tipi <span class="required">*</span></label>
                                    <select id="barcodeMovementType" class="form-control" required>
                                        <option value="Giriş">Satın Alım</option>
                                        <option value="Çıkış">Satış</option>
                                    </select>
                                </div>
                                
                                <div class="form-group">
                                    <label>Miktar <span class="required">*</span></label>
                                    <input type="number" id="barcodeQuantity" class="form-control" 
                                           min="0" step="0.01" placeholder="0" required autofocus>
                                </div>
                            </div>
                            
                            <div class="form-row">
                                <div class="form-group">
                                    <label>İşlemi Yapan</label>
                                    <select id="barcodeEmployeeId" class="form-control">
                                        <option value="">Seçiniz...</option>
                                    </select>
                                </div>
                                
                                <div class="form-group" id="barcodeProjectGroup" style="display:none;">
                                    <label>Proje <span class="required">*</span></label>
                                    <select id="barcodeProjectId" class="form-control">
                                        <option value="">Seçiniz...</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label>Açıklama</label>
                                <input type="text" id="barcodeDescription" class="form-control" 
                                       placeholder="İsteğe bağlı açıklama">
                            </div>
                            
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').querySelector('.modal-close').click()">
                                    İptal
                                </button>
                                <button type="submit" class="btn btn-success">
                                    <i class="fas fa-barcode"></i> İşlemi Kaydet
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            `,
            size: 'large'
        });

        modal.show();

        // Load dropdown options
        await loadBarcodeModalOptions();
        
        // Generate barcode visual
        await generateBarcodeVisual(product.barcode, 'modal-barcode-display');

        // Setup form handlers
        setupBarcodeModalHandlers(product);

    } catch (error) {
        console.error('Barkod modal yüklenirken hata:', error);
        Toast.error('Barkod işlemi açılırken hata oluştu');
    }
};

async function loadBarcodeModalOptions() {
    try {
        // Load employees
        const { data: employees, error: empError } = await employeeService.getActive();
        if (!empError && employees) {
            const select = document.getElementById('barcodeEmployeeId');
            employees.forEach(emp => {
                const option = document.createElement('option');
                option.value = emp.id;
                option.textContent = emp.full_name;
                select.appendChild(option);
            });
        }

        // Load projects
        const { data: projects, error: projError } = await projectService.getActive();
        if (!projError && projects) {
            const select = document.getElementById('barcodeProjectId');
            projects.forEach(proj => {
                const option = document.createElement('option');
                option.value = proj.id;
                option.textContent = proj.project_name;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Modal seçenekleri yüklenirken hata:', error);
    }
}

async function generateBarcodeVisual(barcodeValue, elementId) {
    try {
        // Load JsBarcode library if not loaded
        if (!window.JsBarcode) {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js';
            await new Promise((resolve, reject) => {
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
        }
        
        // Generate barcode
        setTimeout(() => {
            if (document.getElementById(elementId)) {
                window.JsBarcode(`#${elementId}`, barcodeValue, {
                    format: "CODE128",
                    width: 1.5,
                    height: 50,
                    displayValue: true,
                    fontSize: 12
                });
            }
        }, 100);
    } catch (error) {
        console.error('Barkod görseli oluşturulurken hata:', error);
    }
}

function setupBarcodeModalHandlers(product) {
    const form = document.getElementById('barcodeOperationForm');
    const typeSelect = document.getElementById('barcodeMovementType');
    const projectGroup = document.getElementById('barcodeProjectGroup');
    const projectSelect = document.getElementById('barcodeProjectId');
    
    // Movement type change handler
    typeSelect.addEventListener('change', (e) => {
        if (e.target.value === 'Çıkış') {
            projectGroup.style.display = 'block';
            projectSelect.required = true;
        } else {
            projectGroup.style.display = 'none';
            projectSelect.required = false;
            projectSelect.value = '';
        }
    });
    
    // Form submit handler
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await processBarcodeOperation(product);
    });
    
    // Focus quantity input
    document.getElementById('barcodeQuantity').focus();
}

async function processBarcodeOperation(product) {
    try {
        const type = document.getElementById('barcodeMovementType').value;
        const quantity = parseFloat(document.getElementById('barcodeQuantity').value);
        const employeeId = document.getElementById('barcodeEmployeeId').value || null;
        const projectId = document.getElementById('barcodeProjectId').value || null;
        const description = document.getElementById('barcodeDescription').value || null;
        
        if (!quantity || quantity <= 0) {
            Toast.error('Geçerli bir miktar giriniz');
            return;
        }
        
        if (type === 'Çıkış') {
            if (!projectId) {
                Toast.error('Çıkış işlemi için proje seçimi zorunludur');
                return;
            }
            
            if (quantity > product.current_stock) {
                Toast.error(`Yetersiz stok. Mevcut: ${formatter.stock(product.current_stock)} ${product.unit}`);
                return;
            }
        }
        
        // Use barcode service to process movement
        const { data, error } = await barcodeService.addMovementByBarcode(
            product.barcode, type, quantity, employeeId, projectId, description
        );
        
        if (error) {
            Toast.error('İşlem hatası: ' + error.message);
            return;
        }
        
        if (data && data.success) {
            Toast.success(`${data.type} işlemi başarılı: ${quantity} ${product.unit} - ${data.product_name}`);
            
            // Close modal
            document.querySelector('.modal .modal-close').click();
            
            // Refresh product list to show updated stock
            await loadProducts();
        } else {
            Toast.error(data?.error || 'İşlem başarısız');
        }
        
    } catch (error) {
        console.error('Barkod işlemi hatası:', error);
        Toast.error('İşlem kaydedilirken hata oluştu');
    }
}

// Tüm stok verilerini temizle - Düzeltilmiş versiyon
window.clearAllStockData = async function() {
    const confirmMessage = `TÜM STOK VERİLERİ SİLİNECEK!

Bu işlem şunları silecek:
• Tüm ürünler (products)
• Tüm stok hareketleri (inventory_movements)  
• Tüm stok seviyeleri (stock_levels)
• Tüm barkod kayıtları

BU İŞLEM GERİ ALINAMAZ!

Devam etmek istediğinizden emin misiniz?`;

    if (!confirm(confirmMessage)) {
        return;
    }
    
    // İkinci onay
    if (!confirm('SON UYARI: Tüm stok verileri kalıcı olarak silinecek. Gerçekten devam etmek istiyor musunuz?')) {
        return;
    }
    
    try {
        Toast.info('Stok verileri temizleniyor...');
        console.log('=== STOK TEMİZLEME BAŞLADI ===');
        
        let totalDeleted = 0;

        // 1. Önce stock_levels tablosunu temizle (foreign key bağlantıları için)
        try {
            console.log('1. Stock levels siliniyor...');
            const { data: deletedStockLevels, error: stockLevelsError } = await supabase
                .from('stock_levels')
                .delete()
                .neq('id', '00000000-0000-0000-0000-000000000000'); // Tümünü sil
            
            if (stockLevelsError) {
                console.error('Stock levels silme hatası:', stockLevelsError);
            } else {
                console.log('Stock levels silindi');
                totalDeleted += deletedStockLevels?.length || 0;
            }
        } catch (err) {
            console.log('Stock levels tablosu bulunamadı veya hata:', err);
        }

        // 2. Inventory movements'i sil
        try {
            console.log('2. Inventory movements siliniyor...');
            const { data: deletedMovements, error: movementsError } = await supabase
                .from('inventory_movements')
                .delete()
                .neq('id', '00000000-0000-0000-0000-000000000000'); // Tümünü sil
            
            if (movementsError) {
                console.error('Inventory movements silme hatası:', movementsError);
            } else {
                console.log('Inventory movements silindi');
                totalDeleted += deletedMovements?.length || 0;
            }
        } catch (err) {
            console.log('Inventory movements tablosu bulunamadı veya hata:', err);
        }

        // 3. Products tablosunu sil
        try {
            console.log('3. Products siliniyor...');
            const { data: deletedProducts, error: productsError } = await supabase
                .from('products')
                .delete()
                .neq('id', '00000000-0000-0000-0000-000000000000'); // Tümünü sil
            
            if (productsError) {
                console.error('Products silme hatası:', productsError);
            } else {
                console.log('Products silindi');
                totalDeleted += deletedProducts?.length || 0;
            }
        } catch (err) {
            console.log('Products tablosu bulunamadı veya hata:', err);
        }

        // 4. Barcode verilerini sil (varsa)
        try {
            console.log('4. Barcode data siliniyor...');
            const { data: deletedBarcodes, error: barcodeError } = await supabase
                .from('barcodes')
                .delete()
                .neq('id', '00000000-0000-0000-0000-000000000000'); // Tümünü sil
                
            if (barcodeError) {
                console.log('Barcode silme hatası (normal olabilir):', barcodeError);
            } else {
                console.log('Barcode data silindi');
                totalDeleted += deletedBarcodes?.length || 0;
            }
        } catch (err) {
            console.log('Barcode tablosu bulunamadı (normal):', err);
        }

        // 5. Categories tablosunu da temizle (varsa)
        try {
            console.log('5. Categories siliniyor...');
            const { data: deletedCategories, error: categoriesError } = await supabase
                .from('categories')
                .delete()
                .neq('id', '00000000-0000-0000-0000-000000000000'); // Tümünü sil
                
            if (categoriesError) {
                console.log('Categories silme hatası (normal olabilir):', categoriesError);
            } else {
                console.log('Categories silindi');
                totalDeleted += deletedCategories?.length || 0;
            }
        } catch (err) {
            console.log('Categories tablosu bulunamadı (normal):', err);
        }
        
        console.log('=== STOK TEMİZLEME TAMAMLANDI ===');
        console.log(`Toplam silinen kayıt: ${totalDeleted}`);
        
        Toast.success(`Stok temizleme tamamlandı! Tüm stok verileri silindi.`);
        
        // Sayfa yenile
        await loadStock();
        
    } catch (error) {
        console.error('Stok temizleme hatası:', error);
        Toast.error('Temizlik işlemi sırasında hata oluştu: ' + error.message);
    }
};

// Hırdavat stok verilerini içe aktar
window.importHirdavatStock = async function() {
    const confirmMessage = `HIRDAVAT STOK VERİLERİ İÇE AKTARILACAK!

Bu işlem PDF'den çıkartılan tüm ürünleri stok sistemine ekleyecek:
• Yaklaşık 100+ ürün eklenecek
• Mevcut stok adetleri ile birlikte
• HRD- prefix ile ürün kodları
• Ana ve alt kategori bilgileri

Devam etmek istiyor musunuz?`;

    if (!confirm(confirmMessage)) {
        return;
    }

    try {
        Toast.info('Hırdavat stokları içe aktarılıyor...');
        console.log('=== HIRDAVAT STOK İÇE AKTARIMI BAŞLADI ===');
        
        // First check if category and subcategory columns exist
        try {
            const { data: columnCheck, error: columnError } = await supabase
                .from('products')
                .select('category, subcategory, barkod')
                .limit(1);
            
            if (columnError && columnError.code === '42703') {
                // Columns don't exist, create them
                Toast.info('Veritabanı şeması güncelleniyor...');
                console.log('Adding category and subcategory columns...');
                
                const { error: alterError } = await supabase.rpc('add_product_columns');
                if (alterError) {
                    console.error('Column addition error:', alterError);
                    throw new Error('Veritabanı şeması güncellenirken hata oluştu: ' + alterError.message);
                }
            }
        } catch (error) {
            console.error('Column check error:', error);
            // Continue anyway
        }

        // PDF'den çıkartılan ürün verisi - corrected stock values
        const hirdavatProducts = [
            { name: 'Civata', unit: 'ADET', stock: 149, category: 'VİDA', subcategory: 'VİDA' },
            { name: 'Kaynak Kablo Soketi Dişi', unit: 'ADET', stock: 20, category: 'DİĞER', subcategory: 'DİĞER' },
            { name: 'Elektrod Askaynak 2.5 Rotille', unit: 'ADET', stock: 12, category: 'ELEKTROD', subcategory: 'ELEKTROD' },
            { name: 'Özen Gdc 501 Vs Y.v Gazaltı Kaynak', unit: 'ADET', stock: 2, category: 'DİĞER', subcategory: 'DİĞER' },
            { name: 'Boya 15litre', unit: 'ADET', stock: 1, category: 'BOYA', subcategory: 'BOYA' },
            { name: 'Sprey Boya Parlak Mavi', unit: 'ADET', stock: 1, category: 'BOYA', subcategory: 'BOYA' },
            { name: 'Metre 5 Mt Soft Arj', unit: 'ADET', stock: 1, category: 'DİĞER', subcategory: 'DİĞER' },
            { name: 'Su Terazisi Miknatisli Sari 50cm B.h.d', unit: 'ADET', stock: 1, category: 'DİĞER', subcategory: 'DİĞER' },
            { name: 'Kademeli Matkap Uç Seti', unit: 'ADET', stock: 1, category: 'DİĞER', subcategory: 'DİĞER' },
            { name: 'Astro Boya Tabancasi', unit: 'ADET', stock: 1, category: 'DİĞER', subcategory: 'DİĞER' },
            { name: 'Eltos Zimba Keski Seti', unit: 'ADET', stock: 1, category: 'DİĞER', subcategory: 'DİĞER' },
            { name: 'Yıldız Argün Saati', unit: 'ADET', stock: 1, category: 'DİĞER', subcategory: 'DİĞER' },
            { name: 'Somun Sökme Makinesi', unit: 'ADET', stock: 1, category: 'DİĞER', subcategory: 'DİĞER' },
            { name: 'Epoxy Tabanca Metal', unit: 'ADET', stock: 1, category: 'DİĞER', subcategory: 'DİĞER' },
            { name: 'Kompresür Şarteli', unit: 'ADET', stock: 1, category: 'DİĞER', subcategory: 'DİĞER' },
            { name: '11/2 Boru Anahtarı', unit: 'ADET', stock: 1, category: 'DİĞER', subcategory: 'DİĞER' },
            { name: 'İzeltaç 5mm', unit: 'ADET', stock: 1, category: 'DİĞER', subcategory: 'DİĞER' },
            { name: 'Vidalı İnvertörlü Hava Kompresörü 37 Kw', unit: 'ADET', stock: 1, category: 'DİĞER', subcategory: 'DİĞER' },
            { name: 'Hava Kurutucusu', unit: 'ADET', stock: 1, category: 'DİĞER', subcategory: 'DİĞER' },
            { name: '1000 Lt Hava Tankı', unit: 'ADET', stock: 1, category: 'DİĞER', subcategory: 'DİĞER' },
            { name: 'Şerit Metre 10mt', unit: 'ADET', stock: 1, category: 'DİĞER', subcategory: 'DİĞER' },
            { name: 'Haşçelik 4*4mm Ttr Kablo Beyaz', unit: 'ADET', stock: 1, category: 'DİĞER', subcategory: 'DİĞER' },
            { name: 'Hubzug Cariskal 1,5ton*1,5mt', unit: 'ADET', stock: 1, category: 'DİĞER', subcategory: 'DİĞER' },
            { name: 'Yeşil Boya 15 Lt', unit: 'ADET', stock: 1, category: 'BOYA', subcategory: 'BOYA' },
            { name: 'Boya B.kirmizi 15lt', unit: 'ADET', stock: 1, category: 'BOYA', subcategory: 'BOYA' },
            { name: 'Beyaz Boya 15 Lt', unit: 'ADET', stock: 1, category: 'BOYA', subcategory: 'BOYA' },
            { name: 'Trapez Vida 5,5*32 Std', unit: 'KUTU', stock: 1, category: 'VİDA', subcategory: 'VİDA' },
            { name: 'Plastik Saplı Tel Firça', unit: 'ADET', stock: 2, category: 'DİĞER', subcategory: 'DİĞER' },
            { name: '10cm İnve Rullo', unit: 'ADET', stock: 2, category: 'DİĞER', subcategory: 'DİĞER' },
            { name: 'Pul 27mm', unit: 'KG', stock: 2, category: 'DİĞER', subcategory: 'DİĞER' },
            { name: 'Konza 3*25 3lü Grup Prizi Tk213', unit: 'ADET', stock: 2, category: 'DİĞER', subcategory: 'DİĞER' },
            { name: 'Hava Diş Jak', unit: 'ADET', stock: 2, category: 'DİĞER', subcategory: 'DİĞER' },
            { name: 'Sprey Boya Parlak Sarı', unit: 'ADET', stock: 2, category: 'BOYA', subcategory: 'BOYA' },
            { name: 'Tij 20mm', unit: 'ADET', stock: 3, category: 'VİDA', subcategory: 'VİDA' },
            { name: 'Boyaci 25cm Kalın Rolu', unit: 'ADET', stock: 3, category: 'DİĞER', subcategory: 'DİĞER' },
            { name: 'Sprey Boya Parlak Trafik Sarı', unit: 'ADET', stock: 3, category: 'BOYA', subcategory: 'BOYA' },
            { name: 'Gazaltı Meme 7,5mm', unit: 'ADET', stock: 3, category: 'DİĞER', subcategory: 'DİĞER' },
            { name: 'Gazalti Dağitici Bakir Ucu', unit: 'ADET', stock: 3, category: 'DİĞER', subcategory: 'DİĞER' },
            { name: 'Oksijen Kesme Lüle Takim', unit: 'ADET', stock: 3, category: 'DİĞER', subcategory: 'DİĞER' },
            { name: '25 Cm Boya Rolosu', unit: 'ADET', stock: 3, category: 'DİĞER', subcategory: 'DİĞER' },
            { name: '18mm Pul', unit: 'KG', stock: 3, category: 'DİĞER', subcategory: 'DİĞER' },
            { name: 'İzole Bant', unit: 'ADET', stock: 3, category: 'DİĞER', subcategory: 'DİĞER' },
            { name: 'Sprey Boya Parlak Gök Mavısı', unit: 'ADET', stock: 3, category: 'BOYA', subcategory: 'BOYA' },
            { name: 'Keseci Taş 350 Lik', unit: 'ADET', stock: 3, category: 'TAŞ', subcategory: 'TAŞ' },
            { name: 'Strenç', unit: 'ADET', stock: 4, category: 'DİĞER', subcategory: 'DİĞER' },
            { name: 'Boyacı Endüstriyel Eldiven', unit: 'ADET', stock: 4, category: 'ELDİVEN', subcategory: 'ELDİVEN' },
            { name: 'Eldiven Sarı (std 350 Beydi ) Sze 10x1', unit: 'ADET', stock: 4, category: 'ELDİVEN', subcategory: 'ELDİVEN' },
            { name: 'Oksit Kirmızı', unit: 'ADET', stock: 4, category: 'BOYA', subcategory: 'BOYA' },
            { name: '14mm Pul', unit: 'KG', stock: 5, category: 'DİĞER', subcategory: 'DİĞER' }
        ];

        // İkinci sayfa ürünleri
        hirdavatProducts.push(
            { name: 'Torj 501 Amp', unit: 'ADET', stock: 5, category: 'DİĞER', subcategory: 'DİĞER' },
            { name: 'Gönye', unit: 'ADET', stock: 5, category: 'DİĞER', subcategory: 'DİĞER' },
            { name: 'Hava Erkek Jak', unit: 'ADET', stock: 5, category: 'DİĞER', subcategory: 'DİĞER' },
            { name: 'Oksijen Gazı', unit: 'ADET', stock: 5, category: 'BOYA', subcategory: 'BOYA' },
            { name: 'Boya Antipas Kirmızı 15lt', unit: 'ADET', stock: 5, category: 'BOYA', subcategory: 'BOYA' },
            { name: 'Gfb Maket Bıçağı Yedek', unit: 'ADET', stock: 6, category: 'DİĞER', subcategory: 'DİĞER' },
            { name: 'Eldiven Siyah (demir Safety Dz,04)sze 10x1', unit: 'ADET', stock: 8, category: 'ELDİVEN', subcategory: 'ELDİVEN' },
            { name: '75 Lik Şaçaklı Çanak Zimpara', unit: 'ADET', stock: 9, category: 'TAŞ', subcategory: 'TAŞ' },
            { name: '10 Lük Kepepçe', unit: 'ADET', stock: 9, category: 'DİĞER', subcategory: 'DİĞER' },
            { name: 'Boyalı Koruyucu Maske', unit: 'ADET', stock: 10, category: 'DİĞER', subcategory: 'DİĞER' },
            { name: '65 Lik Şaçaklı Çanak Zimpara', unit: 'ADET', stock: 10, category: 'TAŞ', subcategory: 'TAŞ' },
            { name: 'Epoxi Özel Parlak Antransit', unit: 'ADET', stock: 10, category: 'BOYA', subcategory: 'BOYA' },
            { name: 'Epoxı Yüzey Dirrençil Sertleştirci', unit: 'ADET', stock: 10, category: 'BOYA', subcategory: 'BOYA' },
            { name: 'Silikon Dayson', unit: 'ADET', stock: 10, category: 'SİLİKON', subcategory: 'SİLİKON' },
            { name: 'Oksit Astra Kirmizi Boya 15 Lt', unit: 'ADET', stock: 11, category: 'BOYA', subcategory: 'BOYA' },
            { name: '22mm Pul', unit: 'KG', stock: 12, category: 'DİĞER', subcategory: 'DİĞER' },
            { name: 'Gazaltı Seramik Taş', unit: 'ADET', stock: 13, category: 'DİĞER', subcategory: 'DİĞER' },
            { name: 'Ph1 X50mm Yıldız Ucu', unit: 'ADET', stock: 13, category: 'DİĞER', subcategory: 'DİĞER' },
            { name: 'Koruyucu Gözlük Şeffaf', unit: 'ADET', stock: 15, category: 'DİĞER', subcategory: 'DİĞER' },
            { name: 'Cv-180*8 Taşlama Taşi', unit: 'ADET', stock: 15, category: 'TAŞ', subcategory: 'TAŞ' },
            { name: '115*6 Taşlama Taşi', unit: 'ADET', stock: 16, category: 'TAŞ', subcategory: 'TAŞ' },
            { name: 'Sesil Mastik Antsak Grı 21', unit: 'ADET', stock: 17, category: 'DİĞER', subcategory: 'DİĞER' },
            { name: 'Pullu Vida 5*5*25 Tm Diş', unit: 'ADET', stock: 17, category: 'VİDA', subcategory: 'VİDA' },
            { name: 'Tij 24mm', unit: 'ADET', stock: 19, category: 'VİDA', subcategory: 'VİDA' },
            { name: 'Çin-8*45mm Manyetık Somun Lokmasi', unit: 'ADET', stock: 20, category: 'DİĞER', subcategory: 'DİĞER' },
            { name: 'Selsin Pu Mastik Siyah', unit: 'ADET', stock: 25, category: 'DİĞER', subcategory: 'DİĞER' },
            { name: 'Üntel H01n2-d 1*35 Kaynak Kablosu Siyah', unit: 'ADET', stock: 25, category: 'DİĞER', subcategory: 'DİĞER' },
            { name: '75mm Burgulu Çanak Firça', unit: 'ADET', stock: 27, category: 'DİĞER', subcategory: 'DİĞER' },
            { name: '7016 Boya 15 Lt', unit: 'ADET', stock: 32, category: 'BOYA', subcategory: 'BOYA' },
            { name: 'Gri Antipas Boya 15 Lt', unit: 'ADET', stock: 32, category: 'BOYA', subcategory: 'BOYA' },
            { name: 'Kaynak Maskesi', unit: 'ADET', stock: 33, category: 'ELEKTROD', subcategory: 'ELEKTROD' },
            { name: 'M8*1,2mm Kontak Meme', unit: 'ADET', stock: 35, category: 'DİĞER', subcategory: 'DİĞER' },
            { name: 'Kaynak Pasta', unit: 'ADET', stock: 37, category: 'ELEKTROD', subcategory: 'ELEKTROD' },
            { name: '20mm Pul', unit: 'KG', stock: 41, category: 'DİĞER', subcategory: 'DİĞER' },
            { name: '24mm Somun', unit: 'ADET', stock: 45, category: 'DİĞER', subcategory: 'DİĞER' },
            { name: '24*60mm Civata', unit: 'ADET', stock: 45, category: 'VİDA', subcategory: 'VİDA' },
            { name: '18*40mm Civata', unit: 'ADET', stock: 45, category: 'VİDA', subcategory: 'VİDA' },
            { name: 'Selulozik Tiner Mk Ms 15 Litre', unit: 'ADET', stock: 47, category: 'TİNER', subcategory: 'TİNER' },
            { name: 'Selsin Pu Mastik Beyaz', unit: 'ADET', stock: 50, category: 'DİĞER', subcategory: 'DİĞER' },
            { name: 'Ph-2 50mm Yıldız Tornavida Ucu', unit: 'ADET', stock: 54, category: 'VİDA', subcategory: 'VİDA' },
            { name: 'Tel Gaztli 1,2mm', unit: 'ADET', stock: 55, category: 'DİĞER', subcategory: 'DİĞER' },
            { name: 'Kaynak Korucu Cam', unit: 'ADET', stock: 57, category: 'DİĞER', subcategory: 'DİĞER' },
            { name: 'Flap Disk Zimpara', unit: 'ADET', stock: 61, category: 'TAŞ', subcategory: 'TAŞ' },
            { name: 'Soudal Silikon Şeffaf 280 Gr', unit: 'ADET', stock: 69, category: 'DİĞER', subcategory: 'DİĞER' },
            { name: 'Hırdavat Malzeme', unit: 'ADET', stock: 76, category: 'DİĞER', subcategory: 'DİĞER' },
            { name: '18*50 Civata', unit: 'ADET', stock: 80, category: 'VİDA', subcategory: 'VİDA' },
            { name: 'Epoxy', unit: 'ADET', stock: 84, category: 'DİĞER', subcategory: 'DİĞER' },
            { name: '3,2*350 Lazer B47 Bazik Elektrod', unit: 'ADET', stock: 86, category: 'ELEKTROD', subcategory: 'ELEKTROD' },
            { name: 'Keseci Tas 180lik', unit: 'ADET', stock: 116, category: 'TAŞ', subcategory: 'TAŞ' },
            { name: 'Elektrod Askaynak 3,8 Rotille', unit: 'ADET', stock: 120, category: 'ELEKTROD', subcategory: 'ELEKTROD' }
        );

        // Üçüncü sayfa ürünleri
        hirdavatProducts.push(
            { name: 'Eldiven Siyah (( Demir Safety Dz,04 )) Size : 10 Xl', unit: 'ADET', stock: 166, category: 'ELDİVEN', subcategory: 'ELDİVEN' },
            { name: '16*50mm Civata', unit: 'ADET', stock: 180, category: 'VİDA', subcategory: 'VİDA' },
            { name: 'Kesecı Taş 115lik', unit: 'ADET', stock: 192, category: 'TAŞ', subcategory: 'TAŞ' },
            { name: '12*40 Somun', unit: 'ADET', stock: 200, category: 'DİĞER', subcategory: 'DİĞER' },
            { name: '18mm Somun', unit: 'ADET', stock: 250, category: 'DİĞER', subcategory: 'DİĞER' },
            { name: '20*50mm Civata', unit: 'ADET', stock: 275, category: 'VİDA', subcategory: 'VİDA' },
            { name: 'Semeri Panel Beyaz', unit: 'ADET', stock: 550, category: 'DİĞER', subcategory: 'DİĞER' },
            { name: '12*50mm Civata', unit: 'ADET', stock: 630, category: 'VİDA', subcategory: 'VİDA' },
            { name: 'Somun 20mm', unit: 'ADET', stock: 766, category: 'DİĞER', subcategory: 'DİĞER' },
            { name: '12mm Somun', unit: 'ADET', stock: 900, category: 'DİĞER', subcategory: 'DİĞER' },
            { name: 'Keseci Taş 230lik', unit: 'ADET', stock: 2249, category: 'TAŞ', subcategory: 'TAŞ' }
        );

        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < hirdavatProducts.length; i++) {
            const product = hirdavatProducts[i];
            try {
                const currentDate = new Date();
                const dateString = currentDate.toISOString().replace(/[-:\.]/g, '').substr(0, 14);
                const barkodId = String(i + 1).padStart(3, '0');
                
                const productData = {
                    product_name: product.name,
                    product_code: `HRD-${String(i + 1).padStart(3, '0')}`, // HRD-001 formatında kod
                    unit: product.unit,
                    current_stock: Math.abs(product.stock), // Negatif stokları pozitif yap
                    min_stock_level: 5, // Minimum stok seviyesi
                    unit_weight: product.unit === 'KG' ? 1 : 0.1, // KG ise 1kg, diğerleri 100gr
                    category: product.category || 'DİĞER',
                    subcategory: product.subcategory || 'DİĞER',
                    barkod: `HRD${dateString}${barkodId}`
                };

                const { data, error } = await productService.create(productData);
                
                if (error) {
                    console.error(`Ürün ekleme hatası (${product.name}):`, error);
                    errorCount++;
                } else {
                    console.log(`✓ Eklendi: ${product.name} (${product.stock} ${product.unit})`);
                    successCount++;
                }
                
                // Her 10 üründe bir kısa bekleme
                if ((successCount + errorCount) % 10 === 0) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
                
            } catch (err) {
                console.error(`Ürün işleme hatası (${product.name}):`, err);
                errorCount++;
            }
        }

        console.log('=== HIRDAVAT STOK İÇE AKTARIMI TAMAMLANDI ===');
        console.log(`Başarıyla eklenen: ${successCount}`);
        console.log(`Hata olan: ${errorCount}`);
        console.log(`Toplam işlenen: ${hirdavatProducts.length}`);

        if (successCount > 0) {
            Toast.success(`Hırdavat stok içe aktarımı tamamlandı! ${successCount} ürün başarıyla eklendi.`);
        } else {
            Toast.error('Hiçbir ürün eklenemedi. Hataları kontrol ediniz.');
        }

        // Sayfa yenile
        await loadStock();
        
    } catch (error) {
        console.error('Hırdavat stok içe aktarım hatası:', error);
        Toast.error('İçe aktarım işlemi sırasında hata oluştu: ' + error.message);
    }
};