// Stock Management Page
import { productService, inventoryService, employeeService, projectService, barcodeService } from '../services/supabaseService.js';
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
    return user ? user.id : '';
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
                            <th>Ürün Kodu</th>
                            <th>Ürün Adı</th>
                            <th>Barkod</th>
                            <th>Birim</th>
                            <th>Mevcut Stok</th>
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
            tbody.innerHTML = products.map(product => `
                <tr data-id="${product.id}">
                    <td>${product.product_code || '-'}</td>
                    <td><strong>${product.product_name}</strong></td>
                    <td><span class="barcode-cell">${product.barcode || '-'}</span></td>
                    <td>${product.unit}</td>
                    <td>${formatter.stock(product.current_stock)} ${product.unit}</td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="window.openStockMovementModal('${product.id}')" title="Stok Hareketi">
                            <i class="fas fa-exchange-alt"></i>
                        </button>
                        ${product.barcode ? 
                            `<button class="btn btn-sm btn-success" onclick="window.openBarcodeModal('${product.id}')" title="Barkod İşlemi">
                                <i class="fas fa-barcode"></i>
                            </button>` :
                            ''
                        }
                        <button class="btn btn-sm btn-info" onclick="window.viewProductMovements('${product.id}')" title="Hareket Geçmişi">
                            <i class="fas fa-history"></i>
                        </button>
                        <button class="btn btn-sm btn-warning" onclick="window.editProduct('${product.id}')" title="Düzenle">
                            <i class="fas fa-edit"></i>
                        </button>
                    </td>
                </tr>
            `).join('');
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
                
                <div class="form-group">
                    <label>Barkod Numarası</label>
                    <input type="text" id="productBarcode" class="form-control">
                </div>
                
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
        document.getElementById('productBarcode').value = product.barcode || '';
        document.getElementById('unit').value = product.unit;
    } catch (error) {
        Toast.error('Ürün bilgileri yüklenirken hata oluştu');
    }
}

async function saveProduct(productId, modal) {
    try {
        const productData = {
            product_name: document.getElementById('productName').value,
            product_code: document.getElementById('productCode').value || null,
            barcode: document.getElementById('productBarcode').value || null,
            unit: document.getElementById('unit').value,
            min_stock_level: 0
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
                                        <th>Personel</th>
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
                                                <td>${mov.employees?.full_name || '-'}</td>
                                                <td>${mov.projects?.project_name || '-'}</td>
                                                <td>${mov.description || '-'}</td>
                                            </tr>
                                        `).join('') : '<tr><td colspan="6">Hareket kaydı yok</td></tr>'
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
                                <input type="hidden" id="movementEmployeeId" value="${getCurrentUserId()}">
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
        const employeeId = document.getElementById('movementEmployeeId').value || null;
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
            created_by: getCurrentUserId() || null
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