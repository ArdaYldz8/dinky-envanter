// Barcode Scanner Page
import { barcodeService, employeeService, projectService } from '../services/secureServices.js';
import { formatter } from '../utils/formatter.js';
import { Toast } from '../utils/toast.js';
import { BarcodeScanner, ManualBarcodeInput } from '../components/BarcodeScanner.js';

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

let scanner = null;
let manualInput = null;
let currentProduct = null;

export async function loadBarcode() {
    const content = document.getElementById('mainContent');
    
    content.innerHTML = `
        <div class="page-header">
            <h1><i class="fas fa-barcode"></i> Barkod ile Stok İşlemi</h1>
            <p>Tüm satın alım/satış işlemleri bu sayfadan barkod ile yapılır. Kamera veya manuel giriş seçenekleri mevcut.</p>
        </div>
        
        <div class="barcode-container">
            <!-- Scanner Toggle Buttons -->
            <div class="scanner-controls">
                <button class="btn btn-primary" id="startCamera" onclick="window.startCameraScanner()">
                    <i class="fas fa-camera"></i> Kamera Aç
                </button>
                <button class="btn btn-secondary" id="stopCamera" onclick="window.stopCameraScanner()" style="display:none;">
                    <i class="fas fa-stop"></i> Kamera Kapat
                </button>
                <button class="btn btn-info" id="manualMode" onclick="window.switchToManualMode()">
                    <i class="fas fa-keyboard"></i> Manuel Giriş
                </button>
            </div>
            
            <!-- Camera Scanner Section -->
            <div class="scanner-section" id="cameraSection" style="display:none;">
                <div class="scanner-wrapper">
                    <div id="barcode-scanner"></div>
                    <div class="scanner-overlay">
                        <div class="scan-line"></div>
                        <p>Barkodu kamera karşısına getirin</p>
                    </div>
                </div>
            </div>
            
            <!-- Manual Input Section -->
            <div class="manual-section" id="manualSection">
                <div class="manual-input-wrapper">
                    <label for="barcodeInput">Barkod Numarası:</label>
                    <input type="text" id="barcodeInput" class="form-control barcode-input" 
                           placeholder="Barkodu okutun veya yazın..." autofocus>
                    <small class="form-text">Barkodu okuttuktan sonra Enter tuşuna basın</small>
                </div>
            </div>
            
            <!-- Product Info Section -->
            <div class="product-info-section" id="productSection" style="display:none;">
                <div class="product-card">
                    <h3>Bulunan Ürün</h3>
                    <div class="product-details" id="productDetails">
                        <!-- Product details will be populated here -->
                    </div>
                </div>
                
                <!-- Stock Movement Form -->
                <div class="movement-form">
                    <h3>Stok İşlemi</h3>
                    <div class="form-row">
                        <div class="form-group">
                            <label>İşlem Tipi <span class="required">*</span></label>
                            <select id="movementType" class="form-control" required>
                                <option value="Giriş">Satın Alım</option>
                                <option value="Çıkış">Satış</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label>Miktar <span class="required">*</span></label>
                            <input type="number" id="quantity" class="form-control" min="0" step="0.01" required>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label>İşlemi Yapan</label>
                            <input type="text" id="performedBy" class="form-control" 
                                   value="${getCurrentUserName()}" readonly style="background: #f8f9fa;">
                            <input type="hidden" id="employeeId" value="${getCurrentUserId()}">
                        </div>
                        
                        <div class="form-group" id="projectGroup" style="display:none;">
                            <label>Proje <span class="required">*</span></label>
                            <select id="projectId" class="form-control">
                                <option value="">Seçiniz...</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>Açıklama</label>
                        <input type="text" id="description" class="form-control" placeholder="İsteğe bağlı açıklama">
                    </div>
                    
                    <div class="form-actions">
                        <button class="btn btn-success" onclick="window.processMovement()">
                            <i class="fas fa-check"></i> İşlemi Kaydet
                        </button>
                        <button class="btn btn-secondary" onclick="window.resetForm()">
                            <i class="fas fa-redo"></i> Yeni İşlem
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- Recent Transactions -->
            <div class="recent-transactions">
                <h3>Son İşlemler</h3>
                <div id="recentTransactions" class="transaction-list">
                    <!-- Recent transactions will be populated here -->
                </div>
            </div>
        </div>
    `;

    await initializeBarcodeSystem();
}

async function initializeBarcodeSystem() {
    // Load dropdown options
    await loadEmployees();
    await loadProjects();
    
    // Setup manual barcode input
    const barcodeInput = document.getElementById('barcodeInput');
    manualInput = new ManualBarcodeInput(barcodeInput, handleBarcodeDetected);
    
    // Setup movement type change handler
    document.getElementById('movementType').addEventListener('change', (e) => {
        const projectGroup = document.getElementById('projectGroup');
        const projectSelect = document.getElementById('projectId');
        
        if (e.target.value === 'Çıkış') {
            projectGroup.style.display = 'block';
            projectSelect.required = true;
        } else {
            projectGroup.style.display = 'none';
            projectSelect.required = false;
            projectSelect.value = '';
        }
    });
    
    // Focus on barcode input
    barcodeInput.focus();
}

async function loadEmployees() {
    try {
        const { data: employees, error } = await employeeService.getActive();
        if (!error && employees) {
            const select = document.getElementById('employeeId');
            employees.forEach(emp => {
                const option = document.createElement('option');
                option.value = emp.id;
                option.textContent = emp.full_name;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading employees:', error);
    }
}

async function loadProjects() {
    try {
        const { data: projects, error } = await projectService.getActive();
        if (!error && projects) {
            const select = document.getElementById('projectId');
            projects.forEach(proj => {
                const option = document.createElement('option');
                option.value = proj.id;
                option.textContent = proj.project_name;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading projects:', error);
    }
}

async function handleBarcodeDetected(barcode) {
    console.log('Barcode detected:', barcode);
    
    try {
        const { data: product, error } = await barcodeService.findProductByBarcode(barcode);
        
        if (error) {
            Toast.error('Barkod arama hatası: ' + error.message);
            return;
        }
        
        if (!product) {
            Toast.warning('Bu barkoda ait ürün bulunamadı: ' + barcode);
            return;
        }
        
        displayProduct(product);
        currentProduct = product;
        
    } catch (error) {
        console.error('Barcode lookup error:', error);
        Toast.error('Barkod okuma sırasında hata oluştu');
    }
}

function displayProduct(product) {
    const productDetails = document.getElementById('productDetails');
    const productSection = document.getElementById('productSection');
    
    productDetails.innerHTML = `
        <div class="product-info">
            <div class="product-main">
                <h4>${product.product_name}</h4>
                <p><strong>Ürün Kodu:</strong> ${product.product_code || '-'}</p>
                <p><strong>Barkod:</strong> ${product.barcode}</p>
                <p><strong>Mevcut Stok:</strong> ${formatter.stock(product.current_stock)} ${product.unit}</p>
            </div>
            <div class="barcode-display">
                <svg id="product-barcode"></svg>
            </div>
        </div>
    `;
    
    productSection.style.display = 'block';
    document.getElementById('quantity').focus();
    
    // Generate barcode image
    loadBarcodeDisplay(product.barcode);
}

async function loadBarcodeDisplay(barcode) {
    try {
        // Dynamically load JsBarcode if needed
        if (!window.JsBarcode) {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js';
            await new Promise((resolve) => {
                script.onload = resolve;
                document.head.appendChild(script);
            });
        }
        
        // Generate barcode
        window.JsBarcode("#product-barcode", barcode, {
            format: "CODE128",
            width: 1.5,
            height: 40,
            displayValue: true,
            fontSize: 10
        });
    } catch (error) {
        console.error('Barcode display error:', error);
    }
}

// Global functions for UI interaction
window.startCameraScanner = async function() {
    const cameraSection = document.getElementById('cameraSection');
    const startBtn = document.getElementById('startCamera');
    const stopBtn = document.getElementById('stopCamera');
    const manualSection = document.getElementById('manualSection');
    
    try {
        if (!scanner) {
            scanner = new BarcodeScanner({
                targetElementId: 'barcode-scanner',
                onDetected: handleBarcodeDetected,
                onError: (error) => {
                    Toast.error('Kamera hatası: ' + error.message);
                }
            });
            await scanner.init();
        }
        
        cameraSection.style.display = 'block';
        manualSection.style.display = 'none';
        startBtn.style.display = 'none';
        stopBtn.style.display = 'inline-block';
        
        scanner.start();
        Toast.info('Kamera açıldı - barkodu kameraya gösterin');
        
    } catch (error) {
        Toast.error('Kamera başlatılamadı: ' + error.message);
    }
};

window.stopCameraScanner = function() {
    const cameraSection = document.getElementById('cameraSection');
    const startBtn = document.getElementById('startCamera');
    const stopBtn = document.getElementById('stopCamera');
    
    if (scanner) {
        scanner.stop();
    }
    
    cameraSection.style.display = 'none';
    startBtn.style.display = 'inline-block';
    stopBtn.style.display = 'none';
    
    Toast.info('Kamera kapatıldı');
};

window.switchToManualMode = function() {
    const cameraSection = document.getElementById('cameraSection');
    const manualSection = document.getElementById('manualSection');
    
    if (scanner) {
        scanner.stop();
    }
    
    cameraSection.style.display = 'none';
    manualSection.style.display = 'block';
    
    document.getElementById('startCamera').style.display = 'inline-block';
    document.getElementById('stopCamera').style.display = 'none';
    
    document.getElementById('barcodeInput').focus();
};

window.processMovement = async function() {
    if (!currentProduct) {
        Toast.error('Önce bir ürün seçmelisiniz');
        return;
    }
    
    const type = document.getElementById('movementType').value;
    const quantity = parseFloat(document.getElementById('quantity').value);
    const employeeId = document.getElementById('employeeId').value || null;
    const projectId = document.getElementById('projectId').value || null;
    const description = document.getElementById('description').value || null;
    
    if (!quantity || quantity <= 0) {
        Toast.error('Geçerli bir miktar giriniz');
        return;
    }
    
    if (type === 'Çıkış' && !projectId) {
        Toast.error('Çıkış işlemi için proje seçimi zorunludur');
        return;
    }
    
    try {
        const { data, error } = await barcodeService.addMovementByBarcode(
            currentProduct.barcode, type, quantity, employeeId, projectId, description
        );
        
        if (error) {
            Toast.error('İşlem hatası: ' + error.message);
            return;
        }
        
        if (data && data.success) {
            Toast.success(`${data.type} işlemi başarılı: ${data.product_name} - ${quantity} ${currentProduct.unit}`);
            resetForm();
        } else {
            Toast.error(data?.error || 'İşlem başarısız');
        }
        
    } catch (error) {
        console.error('Movement processing error:', error);
        Toast.error('İşlem kaydedilirken hata oluştu');
    }
};

window.resetForm = function() {
    currentProduct = null;
    document.getElementById('productSection').style.display = 'none';
    document.getElementById('quantity').value = '';
    document.getElementById('description').value = '';
    document.getElementById('movementType').value = 'Giriş';
    document.getElementById('projectGroup').style.display = 'none';
    document.getElementById('barcodeInput').value = '';
    document.getElementById('barcodeInput').focus();
};