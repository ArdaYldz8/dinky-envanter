// Stock Management Page
import { productService, inventoryService, employeeService, projectService, barcodeService, supabase } from '../services/supabaseService.js';
import { formatter } from '../utils/formatter.js';
import { Toast } from '../utils/toast.js';
import { Modal } from '../components/Modal.js';

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
            <p>Ürün tanımları, stok durumu görüntüleme ve stok giriş/çıkış işlemleri.</p>
            <div class="page-actions">
                <a href="#barcode" class="btn btn-primary nav-link">
                    <i class="fas fa-barcode"></i> Barkod İşlemleri
                </a>
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
                            <th>Birim</th>
                            <th>Stok</th>
                            <th>Ana Grup</th>
                            <th>Barkod</th>
                            <th>İşlemler</th>
                        </tr>
                    </thead>
                    <tbody id="stockTableBody">
                        <tr>
                            <td colspan="6" class="text-center">Yükleniyor...</td>
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
                <tr data-id="${product.id}">
                    <td><strong>${product.product_name}</strong></td>
                    <td>${product.unit}</td>
                    <td>${formatter.number(product.current_stock || 0, 0)}</td>
                    <td><span class="badge badge-primary">${product.category || '-'}</span></td>
                    <td><span class="barcode-cell">-</span></td>
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
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">Ürün bulunamadı.</td></tr>';
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
                    <input type="text" id="productName" class="form-control" required>
                </div>
                
                <div class="form-group">
                    <label>Ürün Kodu</label>
                    <input type="text" id="productCode" class="form-control">
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
                    <input type="number" id="unitWeight" class="form-control" min="0" step="0.01" placeholder="0.00">
                </div>
                
                <div class="form-group">
                    <label>Ana Kategori</label>
                    <select id="productCategory" class="form-control">
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
                    <input type="text" id="productSubcategory" class="form-control" placeholder="Alt kategori (opsiyonel)">
                </div>
                
                ${!isEdit ? `
                    <div class="form-group">
                        <label>Başlangıç Stok Miktarı</label>
                        <input type="number" id="initialStock" class="form-control" min="0" step="0.01" value="0">
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
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveProduct(productId, modal);
    });

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

async function saveProduct(productId, modal) {
    try {
        const productData = {
            product_name: document.getElementById('productName').value,
            product_code: document.getElementById('productCode').value || null,
            // barcode: document.getElementById('productBarcode').value || null,
            unit: document.getElementById('unit').value,
            unit_weight: parseFloat(document.getElementById('unitWeight').value) || 0,
            min_stock_level: 0,
            category: document.getElementById('productCategory').value || null,
            subcategory: document.getElementById('productSubcategory').value || null
        };

        if (!productId) {
            productData.current_stock = parseFloat(document.getElementById('initialStock')?.value) || 0;
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

// View Product Movements
window.viewProductMovements = async function(productId) {
    try {
        const { data: product, error: prodError } = await productService.getById(productId);
        if (prodError) throw prodError;

        const { data: movements, error: movError } = await inventoryService.getByProduct(productId);
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
                        <h4>Son Hareketler</h4>
                        <div class="table-responsive">
                            <table class="table table-sm">
                                <thead>
                                    <tr>
                                        <th>Tarih</th>
                                        <th>Tip</th>
                                        <th>Miktar</th>
                                        <th>Proje</th>
                                        <th>Açıklama</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${movements && movements.length > 0 ?
                                        movements.map(mov => `
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
                                        `).join('') : '<tr><td colspan="5">Hareket kaydı yok</td></tr>'
                                    }
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `,
            size: 'large'
        });

        modal.show();
    } catch (error) {
        console.error('Hareket geçmişi yüklenirken hata:', error);
        Toast.error('Hareket geçmişi yüklenirken hata oluştu');
    }
};

// Edit Product
window.editProduct = function(productId) {
    window.openProductModal(productId);
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
                                    <option value="Giriş">Stok Girişi</option>
                                    <option value="Çıkış">Stok Çıkışı</option>
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
                                        <option value="Giriş">Stok Girişi</option>
                                        <option value="Çıkış">Stok Çıkışı</option>
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