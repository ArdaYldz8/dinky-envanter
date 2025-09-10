// Modern Dashboard Page
import { employeeService, projectService, productService, attendanceService, inventoryService } from '../services/supabaseService.js';
import { formatter } from '../utils/formatter.js';
import { Toast } from '../utils/toast.js';

// Global chart instances
let attendanceTrendChart = null;
let projectDensityChart = null;

export async function loadDashboard() {
    const main = document.getElementById('mainContent');
    
    // Create HTML skeleton
    main.innerHTML = `
        <div class="dashboard">
            <!-- Dashboard Header -->
            <div class="dashboard__header">
                <div class="dashboard__title">
                    <h1><i class="fas fa-tachometer-alt"></i> Dashboard</h1>
                    <p class="dashboard__subtitle">Dinky Metal ERP Kontrol Paneli</p>
                </div>
                <div class="dashboard__date">
                    <div class="date-filter">
                        <span class="current-date">${formatter.date(new Date())}</span>
                        <span class="live-indicator">
                            <i class="fas fa-circle"></i> Canlı
                        </span>
                    </div>
                </div>
            </div>

            <!-- 2-Column Grid Layout -->
            <div class="dashboard__grid">
                <!-- Main Column (Left) -->
                <div class="dashboard__main">
                    <!-- KPI Cards Container -->
                    <div id="kpi-cards-container" class="kpi-cards-grid">
                        <div class="loading-skeleton">Yükleniyor...</div>
                    </div>

                    <!-- Trend Chart Container -->
                    <div id="trend-chart-container" class="chart-widget">
                        <div class="chart-widget__header">
                            <h3><i class="fas fa-chart-line"></i> Son 30 Günlük Personel Devam Trendi</h3>
                        </div>
                        <div class="chart-widget__body">
                            <div class="chart-loading">
                                <i class="fas fa-spinner fa-spin"></i>
                                <span>Grafik yükleniyor...</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Sidebar Column (Right) -->
                <div class="dashboard__sidebar">
                    <!-- Stock Movements Container -->
                    <div id="stock-list-container" class="sidebar-widget">
                        <div class="sidebar-widget__header">
                            <h3><i class="fas fa-exchange-alt"></i> Son Stok Hareketleri</h3>
                        </div>
                        <div class="sidebar-widget__body">
                            <div class="loading-skeleton">Yükleniyor...</div>
                        </div>
                    </div>

                    <!-- Project Chart Container -->
                    <div id="project-chart-container" class="sidebar-widget">
                        <div class="sidebar-widget__header">
                            <h3><i class="fas fa-chart-bar"></i> Proje Bazlı Personel Yoğunluğu</h3>
                        </div>
                        <div class="sidebar-widget__body">
                            <div class="chart-loading">
                                <i class="fas fa-spinner fa-spin"></i>
                                <span>Grafik yükleniyor...</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Load dashboard components
    await Promise.all([
        renderKpiCards(),
        renderAttendanceChart(),
        renderStockMovements(),
        renderProjectDensityChart()
    ]);
}

// Render KPI Cards
async function renderKpiCards() {
    try {
        const container = document.getElementById('kpi-cards-container');
        if (!container) return;

        // Fetch data in parallel
        const [
            employeesResult,
            todayAttendanceResult,
            productsResult,
            movementsResult
        ] = await Promise.all([
            employeeService.getAll(),
            attendanceService.getTodayAttendance(),
            productService.getAll(),
            inventoryService.getRecent(10)
        ]);

        const employees = employeesResult.data || [];
        const todayAttendance = todayAttendanceResult.data || [];
        const products = productsResult.data || [];
        const todayMovements = movementsResult.data || [];

        // Calculate KPI values
        const totalEmployees = employees.filter(emp => emp.is_active).length;
        const presentToday = todayAttendance.filter(att => att.status === 'Tam Gün' || att.status === 'Yarım Gün').length;
        const criticalStockCount = products.filter(product => product.current_stock <= product.min_stock_level).length;
        const totalOvertimeHours = todayAttendance.reduce((sum, att) => sum + (att.overtime_hours || 0), 0);

        // Generate KPI Cards HTML
        container.innerHTML = `
            <div class="kpi-card kpi-card--primary">
                <h5 class="kpi-card__title">Aktif Personel</h5>
                <p class="kpi-card__value">${totalEmployees}</p>
                <div class="kpi-card__change">
                    <i class="fas fa-users"></i>
                    <span>Toplam personel sayısı</span>
                </div>
            </div>

            <div class="kpi-card kpi-card--success">
                <h5 class="kpi-card__title">Bugün Devam Durumu</h5>
                <p class="kpi-card__value">${presentToday} / ${totalEmployees}</p>
                <div class="kpi-card__change">
                    <i class="fas fa-calendar-check"></i>
                    <span>%${totalEmployees > 0 ? Math.round((presentToday / totalEmployees) * 100) : 0} devam oranı</span>
                </div>
            </div>

            <div class="kpi-card kpi-card--warning">
                <h5 class="kpi-card__title">Kritik Seviye Stok</h5>
                <p class="kpi-card__value">${criticalStockCount}</p>
                <div class="kpi-card__change">
                    <i class="fas fa-exclamation-triangle"></i>
                    <span>Ürün kritik seviyede</span>
                </div>
            </div>

            <div class="kpi-card kpi-card--info">
                <h5 class="kpi-card__title">Bugünkü Toplam Mesai</h5>
                <p class="kpi-card__value">${totalOvertimeHours} saat</p>
                <div class="kpi-card__change">
                    <i class="fas fa-clock"></i>
                    <span>Toplam ek mesai saati</span>
                </div>
            </div>
        `;

    } catch (error) {
        console.error('KPI kartları yüklenirken hata:', error);
        const container = document.getElementById('kpi-cards-container');
        if (container) {
            container.innerHTML = '<div class="error-message">KPI verileri yüklenirken hata oluştu</div>';
        }
    }
}

// Render Attendance Chart
async function renderAttendanceChart() {
    try {
        const container = document.getElementById('trend-chart-container');
        if (!container) return;

        // Calculate last 30 days
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - 30);

        // Fetch attendance data
        const { data: attendanceData } = await attendanceService.getByDateRange(
            startDate.toISOString().split('T')[0],
            endDate.toISOString().split('T')[0]
        );

        // Process data for chart
        const last30Days = [];
        const presentData = [];
        const absentData = [];

        for (let i = 29; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            
            last30Days.push(date.getDate() + '/' + (date.getMonth() + 1));
            
            const dayAttendance = attendanceData?.filter(att => att.work_date === dateStr) || [];
            const present = dayAttendance.filter(att => att.status === 'Tam Gün' || att.status === 'Yarım Gün').length;
            const absent = dayAttendance.filter(att => att.status === 'Gelmedi').length;
            
            presentData.push(present);
            absentData.push(absent);
        }

        // Chart options
        const chartOptions = {
            series: [
                { name: 'Devam Eden', data: presentData },
                { name: 'Devam Etmeyen', data: absentData }
            ],
            chart: {
                type: 'line',
                height: 350,
                toolbar: { show: false },
                animations: { enabled: true, easing: 'easeinout', speed: 800 }
            },
            colors: ['#28a745', '#dc3545'],
            stroke: { curve: 'smooth', width: 3 },
            markers: { size: 4, hover: { size: 6 } },
            xaxis: {
                categories: last30Days,
                labels: { style: { fontSize: '12px' } }
            },
            yaxis: { title: { text: 'Personel Sayısı' } },
            grid: { borderColor: '#e9ecef', strokeDashArray: 5 },
            legend: { position: 'top', horizontalAlign: 'right' },
            tooltip: {
                theme: 'light',
                y: { formatter: (val) => val + ' kişi' }
            }
        };

        // Render chart
        const chartElement = container.querySelector('.chart-widget__body');
        if (!chartElement) {
            console.error('Chart element not found for attendance chart');
            return;
        }
        
        chartElement.innerHTML = '';
        
        // Check if ApexCharts is available
        if (typeof ApexCharts === 'undefined') {
            console.error('ApexCharts not loaded');
            chartElement.innerHTML = '<div class="error-message">Grafik kütüphanesi yüklenemedi</div>';
            return;
        }
        
        attendanceTrendChart = new ApexCharts(chartElement, chartOptions);
        await attendanceTrendChart.render();

    } catch (error) {
        console.error('Devam trendi grafiği yüklenirken hata:', error);
        const container = document.getElementById('trend-chart-container');
        if (container) {
            const chartBody = container.querySelector('.chart-widget__body');
            if (chartBody) {
                chartBody.innerHTML = '<div class="error-message">Grafik yüklenirken hata oluştu</div>';
            }
        }
    }
}

// Render Stock Movements
async function renderStockMovements() {
    try {
        const container = document.getElementById('stock-list-container');
        if (!container) return;

        // Fetch recent stock movements
        const { data: movements } = await inventoryService.getRecent(5);

        const bodyElement = container.querySelector('.sidebar-widget__body');
        
        if (movements && movements.length > 0) {
            bodyElement.innerHTML = `
                <ul class="stock-movements-list">
                    ${movements.map(movement => `
                        <li class="stock-movement-item log--${movement.type === 'Giriş' ? 'in' : 'out'}">
                            <div class="movement-info">
                                <span class="movement-product">${movement.products?.product_name || 'Bilinmeyen Ürün'}</span>
                                <span class="movement-type ${movement.type === 'Giriş' ? 'movement--in' : 'movement--out'}">
                                    ${movement.type}
                                </span>
                            </div>
                            <div class="movement-details">
                                <span class="movement-quantity">${movement.quantity} ${movement.products?.unit || 'adet'}</span>
                                <span class="movement-date">${formatter.date(movement.movement_date)}</span>
                            </div>
                        </li>
                    `).join('')}
                </ul>
            `;
        } else {
            bodyElement.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <p>Henüz stok hareketi bulunmuyor</p>
                </div>
            `;
        }

    } catch (error) {
        console.error('Stok hareketleri yüklenirken hata:', error);
        const container = document.getElementById('stock-list-container');
        if (container) {
            const bodyElement = container.querySelector('.sidebar-widget__body');
            if (bodyElement) {
                bodyElement.innerHTML = '<div class="error-message">Stok hareketleri yüklenirken hata oluştu</div>';
            }
        }
    }
}

// Render Project Density Chart
async function renderProjectDensityChart() {
    try {
        const container = document.getElementById('project-chart-container');
        if (!container) return;

        // Fetch project and attendance data
        const [projectsResult, attendanceResult] = await Promise.all([
            projectService.getAll(),
            attendanceService.getAll()
        ]);

        const projects = projectsResult.data || [];
        const attendance = attendanceResult.data || [];

        // Calculate personnel count per project
        const projectPersonnelCount = {};
        
        projects.forEach(project => {
            const projectAttendance = attendance.filter(att => att.project_id === project.id);
            const uniqueEmployees = [...new Set(projectAttendance.map(att => att.employee_id))];
            projectPersonnelCount[project.project_name] = uniqueEmployees.length;
        });

        // Prepare chart data
        const projectNames = Object.keys(projectPersonnelCount);
        const personnelCounts = Object.values(projectPersonnelCount);

        // Chart options
        const chartOptions = {
            series: [{
                name: 'Personel Sayısı',
                data: personnelCounts
            }],
            chart: {
                type: 'bar',
                height: 300,
                toolbar: { show: false }
            },
            plotOptions: {
                bar: {
                    horizontal: true,
                    borderRadius: 4,
                    barHeight: '60%'
                }
            },
            colors: ['#007bff'],
            xaxis: {
                categories: projectNames,
                labels: { style: { fontSize: '12px' } }
            },
            yaxis: { title: { text: 'Personel Sayısı' } },
            grid: { borderColor: '#e9ecef' },
            tooltip: {
                theme: 'light',
                y: { formatter: (val) => val + ' personel' }
            }
        };

        // Render chart
        const chartElement = container.querySelector('.sidebar-widget__body');
        if (!chartElement) {
            console.error('Chart element not found for project density chart');
            return;
        }
        
        chartElement.innerHTML = '';
        
        if (projectNames.length > 0) {
            // Check if ApexCharts is available
            if (typeof ApexCharts === 'undefined') {
                console.error('ApexCharts not loaded');
                chartElement.innerHTML = '<div class="error-message">Grafik kütüphanesi yüklenemedi</div>';
                return;
            }
            
            projectDensityChart = new ApexCharts(chartElement, chartOptions);
            await projectDensityChart.render();
        } else {
            chartElement.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-project-diagram"></i>
                    <p>Proje verisi bulunmuyor</p>
                </div>
            `;
        }

    } catch (error) {
        console.error('Proje yoğunluk grafiği yüklenirken hata:', error);
        const container = document.getElementById('project-chart-container');
        if (container) {
            const chartElement = container.querySelector('.sidebar-widget__body');
            if (chartElement) {
                chartElement.innerHTML = '<div class="error-message">Proje grafiği yüklenirken hata oluştu</div>';
            }
        }
    }
}