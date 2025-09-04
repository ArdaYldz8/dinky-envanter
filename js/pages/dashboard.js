// Dashboard Page
import { dashboardService, productService, inventoryService } from '../services/supabaseService.js';
import { formatter } from '../utils/formatter.js';
import { Toast } from '../utils/toast.js';

export async function loadDashboard() {
    const content = document.getElementById('mainContent');
    
    content.innerHTML = `
        <div class="page-header">
            <h1><i class="fas fa-home"></i> Ana Sayfa</h1>
            <p>Sistem Özeti ve Hızlı Erişim</p>
        </div>
        
        <div class="dashboard-grid">
            <!-- KPI Cards -->
            <div class="dashboard-row">
                <div class="kpi-card" id="activeEmployeesCard">
                    <div class="kpi-icon">
                        <i class="fas fa-users"></i>
                    </div>
                    <div class="kpi-content">
                        <h3>Aktif Personel</h3>
                        <p class="kpi-value">-</p>
                    </div>
                </div>
                
                <div class="kpi-card" id="productVarietyCard">
                    <div class="kpi-icon">
                        <i class="fas fa-boxes"></i>
                    </div>
                    <div class="kpi-content">
                        <h3>Ürün Çeşidi</h3>
                        <p class="kpi-value">-</p>
                    </div>
                </div>
                
                <div class="kpi-card" id="monthlyAdvancesCard">
                    <div class="kpi-icon">
                        <i class="fas fa-money-bill-wave"></i>
                    </div>
                    <div class="kpi-content">
                        <h3>Bu Ay Verilen Avans</h3>
                        <p class="kpi-value">-</p>
                    </div>
                </div>
                
                <div class="kpi-card" id="todayAttendanceCard">
                    <div class="kpi-icon">
                        <i class="fas fa-calendar-check"></i>
                    </div>
                    <div class="kpi-content">
                        <h3>Bugünkü Durum</h3>
                        <p class="kpi-value">-</p>
                    </div>
                </div>
            </div>
            
            <!-- Critical Stock Alert -->
            <div class="dashboard-widget">
                <div class="widget-header">
                    <h2><i class="fas fa-exclamation-triangle"></i> Kritik Stok Seviyeleri</h2>
                </div>
                <div class="widget-body">
                    <div id="lowStockList" class="alert-list">
                        <p class="text-muted">Yükleniyor...</p>
                    </div>
                </div>
            </div>
            
            <!-- Recent Stock Movements -->
            <div class="dashboard-widget">
                <div class="widget-header">
                    <h2><i class="fas fa-exchange-alt"></i> Son Stok Hareketleri</h2>
                </div>
                <div class="widget-body">
                    <div id="recentMovements" class="movement-list">
                        <p class="text-muted">Yükleniyor...</p>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Wait for DOM to be fully rendered before loading data
    setTimeout(async () => {
        await loadDashboardData();
    }, 100);
}

async function loadDashboardData() {
    try {
        // Load statistics
        const stats = await dashboardService.getStats();
        if (stats) {
            const activeEmployeesEl = document.querySelector('#activeEmployeesCard .kpi-value');
            const productVarietyEl = document.querySelector('#productVarietyCard .kpi-value');
            const monthlyAdvancesEl = document.querySelector('#monthlyAdvancesCard .kpi-value');
            const todayAttendanceEl = document.querySelector('#todayAttendanceCard .kpi-value');
            
            if (activeEmployeesEl) activeEmployeesEl.textContent = stats.activeEmployees;
            if (productVarietyEl) productVarietyEl.textContent = stats.productVariety;
            if (monthlyAdvancesEl) monthlyAdvancesEl.textContent = formatter.currency(stats.monthlyAdvances);
            if (todayAttendanceEl) todayAttendanceEl.innerHTML = `
                <span class="text-success">${stats.todayAttendance.present} Geldi</span> / 
                <span class="text-danger">${stats.todayAttendance.absent} Gelmedi</span>
            `;
        }

        // Load low stock products
        const { data: lowStock, error: lowStockError } = await productService.getLowStock();
        const lowStockList = document.getElementById('lowStockList');
        
        if (!lowStockList) {
            console.error('lowStockList element not found');
            return;
        }
        
        if (lowStock && lowStock.length > 0) {
            lowStockList.innerHTML = `
                <div class="table-responsive">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Ürün</th>
                                <th>Mevcut Stok</th>
                                <th>Durum</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${lowStock.map(product => `
                                <tr class="alert-row">
                                    <td>${product.product_name}</td>
                                    <td>${formatter.stock(product.current_stock)} ${product.unit}</td>
                                    <td>
                                        <span class="badge badge-warning">
                                            Düşük Stok
                                        </span>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        } else {
            lowStockList.innerHTML = '<p class="text-success"><i class="fas fa-check-circle"></i> Tüm ürünler güvenli stok seviyesinde.</p>';
        }

        // Load recent movements
        const { data: movements, error: movError } = await inventoryService.getRecent(5);
        const recentMovements = document.getElementById('recentMovements');
        
        if (!recentMovements) {
            console.error('recentMovements element not found');
            return;
        }
        
        if (movements && movements.length > 0) {
            recentMovements.innerHTML = `
                <div class="table-responsive">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Tarih</th>
                                <th>Ürün</th>
                                <th>İşlem</th>
                                <th>Miktar</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${movements.map(movement => `
                                <tr>
                                    <td>${formatter.date(movement.movement_date)}</td>
                                    <td>${movement.products?.product_name || '-'}</td>
                                    <td>
                                        <span class="badge ${movement.type === 'Giriş' ? 'badge-success' : 'badge-warning'}">
                                            ${movement.type}
                                        </span>
                                    </td>
                                    <td>${formatter.stock(movement.quantity)} ${movement.products?.unit || ''}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        } else {
            recentMovements.innerHTML = '<p class="text-muted">Henüz stok hareketi bulunmuyor.</p>';
        }

    } catch (error) {
        console.error('Dashboard yüklenirken hata:', error);
        Toast.error('Dashboard verileri yüklenirken bir hata oluştu');
    }
}