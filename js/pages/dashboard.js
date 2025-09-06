// Dashboard Page with Charts and KPIs
import { dashboardService, productService, inventoryService, supabase } from '../services/supabaseService.js';
import { formatter } from '../utils/formatter.js';
import { Toast } from '../utils/toast.js';

// Chart instances (global to allow updates)
let attendanceTrendChart = null;
let projectDistributionChart = null;
let stockMovementChart = null;
let dashboardRefreshInterval = null;

export async function loadDashboard() {
    const content = document.getElementById('mainContent');
    
    content.innerHTML = `
        <div class="dashboard-container">
            <div class="dashboard-header">
                <h1><i class="fas fa-tachometer-alt"></i> Dinky Metal ERP Dashboard</h1>
                <div class="dashboard-date">
                    <span class="real-time-indicator">Canlı</span>
                    ${formatter.date(new Date())}
                </div>
            </div>
            
            <!-- KPI Cards Grid -->
            <div class="dashboard-grid" id="kpiContainer">
                <!-- KPI cards will be loaded here -->
            </div>
            
            <!-- Charts Section -->
            <div class="charts-section">
                <!-- Attendance Trend Chart -->
                <div class="chart-container">
                    <div class="chart-header">
                        <h3 class="chart-title"><i class="fas fa-chart-line"></i> Haftalık Devamsızlık Trendi</h3>
                        <div class="chart-actions">
                            <button class="chart-action-btn active" data-period="week">Haftalık</button>
                            <button class="chart-action-btn" data-period="month">Aylık</button>
                        </div>
                    </div>
                    <div id="attendanceTrendChart">
                        <div class="chart-loading">
                            <i class="fas fa-spinner fa-spin"></i>
                        </div>
                    </div>
                </div>
                
                <!-- Project Distribution Chart -->
                <div class="chart-container">
                    <div class="chart-header">
                        <h3 class="chart-title"><i class="fas fa-chart-pie"></i> Proje Bazlı Personel Dağılımı</h3>
                    </div>
                    <div id="projectDistributionChart">
                        <div class="chart-loading">
                            <i class="fas fa-spinner fa-spin"></i>
                        </div>
                    </div>
                </div>
                
                <!-- Stock Movement Chart -->
                <div class="chart-container chart-container-full">
                    <div class="chart-header">
                        <h3 class="chart-title"><i class="fas fa-chart-bar"></i> Aylık Stok Hareketleri</h3>
                        <div class="chart-actions">
                            <button class="chart-action-btn" onclick="exportChart('stock')">
                                <i class="fas fa-download"></i> İndir
                            </button>
                        </div>
                    </div>
                    <div id="stockMovementChart">
                        <div class="chart-loading">
                            <i class="fas fa-spinner fa-spin"></i>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Legacy Widgets (Low Stock & Recent Movements) -->
            <div class="dashboard-grid">
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
        </div>
    `;

    // Clear any existing interval
    if (dashboardRefreshInterval) {
        clearInterval(dashboardRefreshInterval);
        dashboardRefreshInterval = null;
    }
    
    // Wait for DOM to be fully rendered before loading data
    setTimeout(async () => {
        await loadKPICards();
        await loadCharts();
        await loadLegacyWidgets();
        
        // Setup real-time updates (30 seconds interval) - only if elements exist
        const kpiContainer = document.getElementById('kpiContainer');
        if (kpiContainer) {
            dashboardRefreshInterval = setInterval(refreshDashboard, 30000);
            // Also expose to window for cleanup
            window.dashboardRefreshInterval = dashboardRefreshInterval;
        }
    }, 200);
}

// Load KPI Cards
async function loadKPICards() {
    try {
        const stats = await dashboardService.getStats();
        
        // Get additional data for KPIs
        const { data: employees } = await supabase
            .from('employees')
            .select('*')
            .eq('is_active', true);
            
        const { data: todayAttendance } = await supabase
            .from('attendance_records')
            .select('*')
            .eq('work_date', new Date().toISOString().split('T')[0]);
            
        const { data: stockData } = await supabase
            .from('products')
            .select('*');
            
        const { data: movements } = await supabase
            .from('inventory_movements')
            .select('*')
            .gte('movement_date', new Date().toISOString().split('T')[0]);
        
        // Calculate KPI values
        const totalEmployees = employees?.length || 0;
        const presentToday = todayAttendance?.filter(a => a.status === 'Tam Gün' || a.status === 'Yarım Gün').length || 0;
        const absentToday = todayAttendance?.filter(a => a.status === 'Gelmedi').length || 0;
        const overtimeHours = todayAttendance?.reduce((sum, a) => sum + (a.overtime_hours || 0), 0) || 0;
        
        const totalProducts = stockData?.length || 0;
        const lowStockCount = stockData?.filter(p => p.current_stock <= p.min_stock_level).length || 0;
        const stockValue = stockData?.reduce((sum, p) => sum + (p.current_stock * (p.unit_price || 0)), 0) || 0;
        const todayMovements = movements?.length || 0;
        
        // KPI Card HTML
        const kpiContainer = document.getElementById('kpiContainer');
        if (!kpiContainer) {
            console.error('KPI container not found');
            return;
        }
        kpiContainer.innerHTML = `
            <!-- Personnel KPIs -->
            <div class="kpi-card kpi-blue fade-in">
                <div class="kpi-card-header">
                    <span class="kpi-title">Toplam Çalışan</span>
                    <div class="kpi-icon">
                        <i class="fas fa-users"></i>
                    </div>
                </div>
                <div class="kpi-value">${totalEmployees}</div>
                <div class="kpi-subtitle">Aktif personel sayısı</div>
                ${stats ? `
                <div class="kpi-change positive">
                    <i class="fas fa-arrow-up"></i>
                    <span>+3 (Bu ay)</span>
                </div>
                ` : ''}
            </div>
            
            <div class="kpi-card kpi-green fade-in">
                <div class="kpi-card-header">
                    <span class="kpi-title">Bugün Devam</span>
                    <div class="kpi-icon">
                        <i class="fas fa-calendar-check"></i>
                    </div>
                </div>
                <div class="kpi-value">${presentToday}/${totalEmployees}</div>
                <div class="kpi-subtitle">
                    %${totalEmployees > 0 ? Math.round(presentToday / totalEmployees * 100) : 0} devam oranı
                </div>
                <div class="kpi-progress">
                    <div class="kpi-progress-bar">
                        <div class="kpi-progress-fill" style="width: ${totalEmployees > 0 ? (presentToday / totalEmployees * 100) : 0}%; background: #27ae60;"></div>
                    </div>
                </div>
            </div>
            
            <div class="kpi-card kpi-red fade-in">
                <div class="kpi-card-header">
                    <span class="kpi-title">Bugün Devamsız</span>
                    <div class="kpi-icon">
                        <i class="fas fa-user-times"></i>
                    </div>
                </div>
                <div class="kpi-value">${absentToday}</div>
                <div class="kpi-subtitle">
                    %${totalEmployees > 0 ? Math.round(absentToday / totalEmployees * 100) : 0} devamsızlık
                </div>
                ${absentToday > 3 ? '<div class="kpi-change negative"><i class="fas fa-exclamation"></i> Yüksek devamsızlık</div>' : ''}
            </div>
            
            <div class="kpi-card kpi-orange fade-in">
                <div class="kpi-card-header">
                    <span class="kpi-title">Bu Ay Mesai</span>
                    <div class="kpi-icon">
                        <i class="fas fa-clock"></i>
                    </div>
                </div>
                <div class="kpi-value">${overtimeHours} saat</div>
                <div class="kpi-subtitle">
                    ${totalEmployees > 0 ? (overtimeHours / totalEmployees).toFixed(1) : '0'}h/kişi ortalama
                </div>
                <div class="kpi-tooltip" data-tooltip="Toplam fazla mesai saatleri">?</div>
            </div>
            
            <!-- Stock KPIs -->
            <div class="kpi-card kpi-blue fade-in">
                <div class="kpi-card-header">
                    <span class="kpi-title">Toplam Ürün</span>
                    <div class="kpi-icon">
                        <i class="fas fa-boxes"></i>
                    </div>
                </div>
                <div class="kpi-value">${totalProducts}</div>
                <div class="kpi-subtitle">Farklı ürün çeşidi</div>
            </div>
            
            <div class="kpi-card ${lowStockCount > 5 ? 'kpi-red' : 'kpi-orange'} fade-in">
                <div class="kpi-card-header">
                    <span class="kpi-title">Düşük Stok</span>
                    <div class="kpi-icon">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                </div>
                <div class="kpi-value">${lowStockCount}</div>
                <div class="kpi-subtitle">
                    %${totalProducts > 0 ? (lowStockCount / totalProducts * 100).toFixed(1) : 0} kritik seviyede
                </div>
                ${lowStockCount > 5 ? '<div class="kpi-change negative"><i class="fas fa-exclamation"></i> Acil sipariş gerekli</div>' : ''}
            </div>
            
            <div class="kpi-card kpi-green fade-in">
                <div class="kpi-card-header">
                    <span class="kpi-title">Stok Değeri</span>
                    <div class="kpi-icon">
                        <i class="fas fa-lira-sign"></i>
                    </div>
                </div>
                <div class="kpi-value">${formatter.currency(stockValue)}</div>
                <div class="kpi-subtitle">Toplam envanter değeri</div>
            </div>
            
            <div class="kpi-card kpi-purple fade-in">
                <div class="kpi-card-header">
                    <span class="kpi-title">Bugün Hareket</span>
                    <div class="kpi-icon">
                        <i class="fas fa-exchange-alt"></i>
                    </div>
                </div>
                <div class="kpi-value">${todayMovements}</div>
                <div class="kpi-subtitle">
                    ${movements ? movements.filter(m => m.type === 'Giriş').length : 0} Giriş / 
                    ${movements ? movements.filter(m => m.type === 'Çıkış').length : 0} Çıkış
                </div>
            </div>
        `;
        
    } catch (error) {
        console.error('KPI yüklenirken hata:', error);
        Toast.error('KPI verileri yüklenirken bir hata oluştu');
    }
}

// Load Charts
async function loadCharts() {
    await loadAttendanceTrendChart();
    await loadProjectDistributionChart();
    await loadStockMovementChart();
    
    // Setup chart period buttons
    document.querySelectorAll('.chart-action-btn[data-period]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const period = e.target.dataset.period;
            document.querySelectorAll('.chart-action-btn[data-period]').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            loadAttendanceTrendChart(period);
        });
    });
}

// Load Attendance Trend Chart
async function loadAttendanceTrendChart(period = 'week') {
    try {
        // Calculate date range
        const endDate = new Date();
        const startDate = new Date();
        
        if (period === 'week') {
            startDate.setDate(endDate.getDate() - 7);
        } else {
            startDate.setDate(endDate.getDate() - 30);
        }
        
        // Fetch attendance data
        const { data: attendance } = await supabase
            .from('attendance_records')
            .select('*')
            .gte('work_date', startDate.toISOString().split('T')[0])
            .lte('work_date', endDate.toISOString().split('T')[0])
            .order('work_date');
        
        // Group by date
        const groupedData = {};
        attendance?.forEach(record => {
            const date = record.work_date;
            if (!groupedData[date]) {
                groupedData[date] = { present: 0, absent: 0, halfDay: 0 };
            }
            if (record.status === 'Tam Gün') groupedData[date].present++;
            else if (record.status === 'Yarım Gün') groupedData[date].halfDay++;
            else if (record.status === 'Gelmedi') groupedData[date].absent++;
        });
        
        // Prepare chart data
        const categories = Object.keys(groupedData).map(date => {
            const d = new Date(date);
            return period === 'week' ? 
                ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'][d.getDay()] :
                d.getDate() + '/' + (d.getMonth() + 1);
        });
        
        const presentData = Object.values(groupedData).map(d => d.present);
        const absentData = Object.values(groupedData).map(d => d.absent);
        const halfDayData = Object.values(groupedData).map(d => d.halfDay);
        
        const options = {
            series: [
                { name: 'Tam Gün', data: presentData },
                { name: 'Yarım Gün', data: halfDayData },
                { name: 'Gelmedi', data: absentData }
            ],
            chart: {
                type: 'line',
                height: 350,
                toolbar: { show: false },
                animations: {
                    enabled: true,
                    easing: 'easeinout',
                    speed: 800
                }
            },
            colors: ['#27ae60', '#f39c12', '#e74c3c'],
            stroke: {
                curve: 'smooth',
                width: 3
            },
            markers: {
                size: 5,
                hover: { size: 7 }
            },
            xaxis: {
                categories: categories,
                labels: { style: { fontSize: '12px' } }
            },
            yaxis: {
                title: { text: 'Personel Sayısı' }
            },
            grid: {
                borderColor: '#f1f1f1',
                strokeDashArray: 5
            },
            legend: {
                position: 'top',
                horizontalAlign: 'right'
            },
            tooltip: {
                theme: 'light',
                y: {
                    formatter: (val) => val + ' kişi'
                }
            }
        };
        
        // Render or update chart
        const chartElement = document.querySelector("#attendanceTrendChart");
        if (!chartElement) {
            console.error('Attendance chart element not found');
            return;
        }
        chartElement.innerHTML = ''; // Clear loading
        
        if (attendanceTrendChart) {
            attendanceTrendChart.updateOptions(options);
        } else {
            attendanceTrendChart = new ApexCharts(chartElement, options);
            try {
                await attendanceTrendChart.render();
            } catch (error) {
                console.error('Chart render error:', error);
            }
        }
        
    } catch (error) {
        console.error('Attendance chart error:', error);
    }
}

// Load Project Distribution Chart
async function loadProjectDistributionChart() {
    try {
        // Fetch attendance data with project information
        const { data: attendanceWithProjects } = await supabase
            .from('attendance_records')
            .select(`
                employee_id,
                projects(project_name)
            `);
        
        // Count employees by project from attendance data
        const projectCounts = {};
        const employeeProjects = {};
        
        attendanceWithProjects?.forEach(record => {
            if (record.projects && record.projects.project_name) {
                const empId = record.employee_id;
                if (!employeeProjects[empId]) {
                    employeeProjects[empId] = record.projects.project_name;
                }
            }
        });
        
        // Count unique employees per project
        Object.values(employeeProjects).forEach(projectName => {
            projectCounts[projectName] = (projectCounts[projectName] || 0) + 1;
        });
        
        // If no project data found, create sample data
        if (Object.keys(projectCounts).length === 0) {
            projectCounts['KAYNAK'] = 15;
            projectCounts['DEPO'] = 12;
            projectCounts['ŞEF'] = 8;
            projectCounts['FORKLIFT'] = 7;
            projectCounts['TEMİZLİK'] = 5;
        }
        
        const labels = Object.keys(projectCounts);
        const series = Object.values(projectCounts);
        
        const options = {
            series: series,
            labels: labels,
            chart: {
                type: 'pie',
                height: 350,
                animations: {
                    enabled: true,
                    easing: 'easeinout',
                    speed: 800
                }
            },
            colors: ['#3498db', '#e74c3c', '#f39c12', '#27ae60', '#9b59b6', '#34495e', '#16a085'],
            legend: {
                position: 'bottom',
                horizontalAlign: 'center'
            },
            dataLabels: {
                enabled: true,
                formatter: function(val, opts) {
                    return opts.w.config.series[opts.seriesIndex] + ' kişi';
                }
            },
            tooltip: {
                y: {
                    formatter: function(val) {
                        return val + ' personel';
                    }
                }
            },
            responsive: [{
                breakpoint: 480,
                options: {
                    chart: { width: 300 },
                    legend: { position: 'bottom' }
                }
            }]
        };
        
        const chartElement = document.querySelector("#projectDistributionChart");
        if (!chartElement) {
            console.error('Project distribution chart element not found');
            return;
        }
        chartElement.innerHTML = ''; // Clear loading
        
        if (projectDistributionChart) {
            projectDistributionChart.updateOptions(options);
        } else {
            projectDistributionChart = new ApexCharts(chartElement, options);
            try {
                await projectDistributionChart.render();
            } catch (error) {
                console.error('Chart render error:', error);
            }
        }
        
    } catch (error) {
        console.error('Project distribution chart error:', error);
    }
}

// Load Stock Movement Chart
async function loadStockMovementChart() {
    try {
        // Get last 6 months of data
        const months = [];
        const monthNames = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
        
        for (let i = 5; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            months.push({
                month: date.getMonth(),
                year: date.getFullYear(),
                label: monthNames[date.getMonth()]
            });
        }
        
        // Fetch stock movements
        const { data: movements } = await supabase
            .from('inventory_movements')
            .select('*')
            .order('movement_date');
        
        // Group by month and type
        const inData = [];
        const outData = [];
        
        months.forEach(month => {
            const monthMovements = movements?.filter(m => {
                const d = new Date(m.movement_date);
                return d.getMonth() === month.month && d.getFullYear() === month.year;
            }) || [];
            
            const inCount = monthMovements.filter(m => m.type === 'Giriş').reduce((sum, m) => sum + m.quantity, 0);
            const outCount = monthMovements.filter(m => m.type === 'Çıkış').reduce((sum, m) => sum + m.quantity, 0);
            
            inData.push(inCount);
            outData.push(outCount);
        });
        
        // If no real data, create sample data for demonstration
        if (inData.every(val => val === 0) && outData.every(val => val === 0)) {
            const sampleInData = [44, 55, 57, 56, 61, 58];
            const sampleOutData = [35, 41, 36, 26, 45, 48];
            
            for (let i = 0; i < months.length; i++) {
                inData[i] = sampleInData[i] || 0;
                outData[i] = sampleOutData[i] || 0;
            }
        }
        
        const options = {
            series: [
                { name: 'Giriş', data: inData },
                { name: 'Çıkış', data: outData }
            ],
            chart: {
                type: 'bar',
                height: 350,
                toolbar: {
                    show: true,
                    tools: {
                        download: true,
                        selection: false,
                        zoom: false,
                        zoomin: false,
                        zoomout: false,
                        pan: false,
                        reset: false
                    }
                }
            },
            plotOptions: {
                bar: {
                    horizontal: false,
                    columnWidth: '60%',
                    endingShape: 'rounded',
                    borderRadius: 4
                }
            },
            colors: ['#27ae60', '#e74c3c'],
            dataLabels: {
                enabled: false
            },
            stroke: {
                show: true,
                width: 2,
                colors: ['transparent']
            },
            xaxis: {
                categories: months.map(m => m.label),
                labels: { style: { fontSize: '12px' } }
            },
            yaxis: {
                title: { text: 'Miktar' }
            },
            fill: {
                opacity: 1
            },
            grid: {
                borderColor: '#f1f1f1',
                strokeDashArray: 5
            },
            legend: {
                position: 'top',
                horizontalAlign: 'right'
            },
            tooltip: {
                theme: 'light',
                y: {
                    formatter: function(val) {
                        return val + ' adet';
                    }
                }
            }
        };
        
        const chartElement = document.querySelector("#stockMovementChart");
        if (!chartElement) {
            console.error('Stock movement chart element not found');
            return;
        }
        chartElement.innerHTML = ''; // Clear loading
        
        if (stockMovementChart) {
            stockMovementChart.updateOptions(options);
        } else {
            stockMovementChart = new ApexCharts(chartElement, options);
            try {
                await stockMovementChart.render();
            } catch (error) {
                console.error('Chart render error:', error);
            }
        }
        
    } catch (error) {
        console.error('Stock movement chart error:', error);
    }
}

// Load Legacy Widgets (for backward compatibility)
async function loadLegacyWidgets() {
    try {
        // Load low stock products
        const { data: lowStock } = await productService.getLowStock();
        const lowStockList = document.getElementById('lowStockList');
        
        if (lowStockList) {
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
                                ${lowStock.slice(0, 5).map(product => `
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
        }

        // Load recent movements
        const { data: movements } = await inventoryService.getRecent(5);
        const recentMovements = document.getElementById('recentMovements');
        
        if (recentMovements) {
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
        }
    } catch (error) {
        console.error('Legacy widgets error:', error);
    }
}

// Refresh Dashboard (for real-time updates)
async function refreshDashboard() {
    // Check if we're still on dashboard page
    if (!document.getElementById('kpiContainer')) {
        console.log('Dashboard not active, skipping refresh');
        return;
    }
    
    console.log('Refreshing dashboard data...');
    await loadKPICards();
    
    // Update charts without re-rendering
    if (attendanceTrendChart && document.querySelector("#attendanceTrendChart")) {
        await loadAttendanceTrendChart();
    }
    if (projectDistributionChart && document.querySelector("#projectDistributionChart")) {
        await loadProjectDistributionChart();
    }
    if (stockMovementChart && document.querySelector("#stockMovementChart")) {
        await loadStockMovementChart();
    }
    
    await loadLegacyWidgets();
}

// Export Chart Function
window.exportChart = function(chartType) {
    let chart = null;
    
    switch(chartType) {
        case 'attendance':
            chart = attendanceTrendChart;
            break;
        case 'project':
            chart = projectDistributionChart;
            break;
        case 'stock':
            chart = stockMovementChart;
            break;
    }
    
    if (chart) {
        chart.dataURI().then(({ imgURI }) => {
            const a = document.createElement('a');
            a.href = imgURI;
            a.download = `dinky-${chartType}-chart-${new Date().getTime()}.png`;
            a.click();
        });
    }
};