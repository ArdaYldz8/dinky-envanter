// Modern Dashboard Page
import { employeeService, projectService, productService, attendanceService, inventoryService, taskService } from '../services/supabaseService2.js';
import { formatter } from '../utils/formatter.js';
import { Toast } from '../utils/toast.js';
import { ExcelExporter } from '../utils/excelExporter.js';

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
                <div class="dashboard__actions">
                    <div class="quick-reports">
                        <button class="btn btn-sm btn-success" onclick="window.exportQuickStockReport()">
                            <i class="fas fa-file-excel"></i> Stok Raporu
                        </button>
                        <button class="btn btn-sm btn-info" onclick="window.exportQuickAttendanceReport()">
                            <i class="fas fa-file-excel"></i> Devam Raporu
                        </button>
                        <button class="btn btn-sm btn-warning" onclick="window.exportQuickFinancialReport()">
                            <i class="fas fa-file-excel"></i> Mali Rapor
                        </button>
                    </div>
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
                            <h3><i class="fas fa-chart-bar"></i> Proje Bazlı Personel (Son 30 Gün)</h3>
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

    // Wait for DOM to be fully rendered
    await new Promise(resolve => setTimeout(resolve, 200));

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

        // Get today's completed and pending tasks
        const todayTasks = await getTasksForToday();
        const completedTasksToday = todayTasks.completed || 0;
        const pendingTasksToday = todayTasks.pending || 0;

        // Get monthly financial summary
        const monthlyFinancial = await getMonthlyFinancialSummary();
        const totalStockValue = products.reduce((sum, product) => sum + (product.current_stock * (product.unit_price || 0)), 0);

        // Generate KPI Cards HTML
        container.innerHTML = `
            <div class="kpi-card kpi-card--primary">
                <h5 class="kpi-card__title">Bugünkü İşler</h5>
                <p class="kpi-card__value">${completedTasksToday} / ${completedTasksToday + pendingTasksToday}</p>
                <div class="kpi-card__change">
                    <i class="fas fa-tasks"></i>
                    <span>${pendingTasksToday} iş bekliyor, ${completedTasksToday} iş tamamlandı</span>
                </div>
            </div>

            <div class="kpi-card kpi-card--success">
                <h5 class="kpi-card__title">Personel Durumu</h5>
                <p class="kpi-card__value">${presentToday} / ${totalEmployees}</p>
                <div class="kpi-card__change">
                    <i class="fas fa-users"></i>
                    <span>%${totalEmployees > 0 ? Math.round((presentToday / totalEmployees) * 100) : 0} bugün işte</span>
                </div>
            </div>

            <div class="kpi-card ${criticalStockCount > 0 ? 'kpi-card--danger' : 'kpi-card--success'}">
                <h5 class="kpi-card__title">Stok Durumu</h5>
                <p class="kpi-card__value">${criticalStockCount}</p>
                <div class="kpi-card__change">
                    <i class="fas fa-${criticalStockCount > 0 ? 'exclamation-triangle' : 'check-circle'}"></i>
                    <span>${criticalStockCount > 0 ? criticalStockCount + ' ürün kritik seviyede!' : 'Stoklar normal seviyede'}</span>
                </div>
            </div>

            <div class="kpi-card kpi-card--info">
                <h5 class="kpi-card__title">Toplam Stok Değeri</h5>
                <p class="kpi-card__value">${formatter.currency(totalStockValue)}</p>
                <div class="kpi-card__change">
                    <i class="fas fa-warehouse"></i>
                    <span>Depodaki toplam değer</span>
                </div>
            </div>

            <div class="kpi-card kpi-card--warning">
                <h5 class="kpi-card__title">Bu Ay Mali</h5>
                <p class="kpi-card__value">${formatter.currency(monthlyFinancial.net || 0)}</p>
                <div class="kpi-card__change">
                    <i class="fas fa-chart-line"></i>
                    <span>Gelir: ${formatter.currency(monthlyFinancial.income || 0)} | Gider: ${formatter.currency(monthlyFinancial.expense || 0)}</span>
                </div>
            </div>

            <div class="kpi-card kpi-card--secondary">
                <h5 class="kpi-card__title">Mesai Durumu</h5>
                <p class="kpi-card__value">${totalOvertimeHours} saat</p>
                <div class="kpi-card__change">
                    <i class="fas fa-clock"></i>
                    <span>Bugünkü toplam ek mesai</span>
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
            console.error('Container found:', container);
            console.error('Available children:', container.children);
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

        // Filter attendance to last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const recentAttendance = attendance.filter(att => {
            const attDate = new Date(att.work_date);
            return attDate >= thirtyDaysAgo;
        });

        // Fetch employee data for names
        const employeesResult = await employeeService.getAll();
        const employees = employeesResult.data || [];
        const employeeMap = {};
        employees.forEach(emp => {
            employeeMap[emp.id] = emp.full_name;
        });

        // Calculate unique personnel count per project with details
        const projectPersonnelCount = {};
        const projectPersonnelDetails = {};

        projects.forEach(project => {
            const projectAttendance = recentAttendance.filter(att => att.project_id === project.id);

            // Count days per employee
            const employeeDays = {};
            projectAttendance.forEach(att => {
                if (!employeeDays[att.employee_id]) {
                    employeeDays[att.employee_id] = 0;
                }
                employeeDays[att.employee_id]++;
            });

            const uniqueEmployees = Object.keys(employeeDays);
            projectPersonnelCount[project.project_name] = uniqueEmployees.length;

            // Store details for tooltip
            projectPersonnelDetails[project.project_name] = Object.entries(employeeDays)
                .map(([empId, days]) => ({
                    name: employeeMap[empId] || 'Bilinmeyen',
                    days: days
                }))
                .sort((a, b) => b.days - a.days); // Sort by days descending
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
                toolbar: { show: false },
                events: {
                    dataPointSelection: function(event, chartContext, config) {
                        const projectName = config.w.globals.labels[config.dataPointIndex];
                        const details = projectPersonnelDetails[projectName] || [];
                        showProjectPersonnelModal(projectName, details);
                    }
                }
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
                enabled: true,
                theme: 'light',
                y: {
                    formatter: (val) => val + ' personel (tıklayarak detayları görün)'
                }
            }
        };

        // Render chart
        const chartElement = container.querySelector('.sidebar-widget__body');
        if (!chartElement) {
            console.error('Chart element not found for project density chart');
            console.error('Container found:', container);
            console.error('Available children:', container.children);
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

// Show Project Personnel Details Modal
function showProjectPersonnelModal(projectName, personnelDetails) {
    // Create modal overlay
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay';
    modalOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    `;

    // Create modal content
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: white;
        border-radius: 8px;
        padding: 24px;
        max-width: 500px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
    `;

    // Build personnel list
    let personnelHTML = '';
    if (personnelDetails.length > 0) {
        personnelHTML = personnelDetails.map((emp, idx) => `
            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e9ecef;">
                <span style="color: #495057;">${idx + 1}. ${emp.name}</span>
                <span style="color: #007bff; font-weight: 500;">${emp.days} gün</span>
            </div>
        `).join('');
    } else {
        personnelHTML = '<p style="color: #6c757d; text-align: center;">Personel kaydı bulunamadı</p>';
    }

    modalContent.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h3 style="margin: 0; color: #007bff;">
                <i class="fas fa-users"></i> ${projectName}
            </h3>
            <button class="close-modal-btn" style="
                background: none;
                border: none;
                font-size: 24px;
                color: #6c757d;
                cursor: pointer;
                padding: 0;
                width: 30px;
                height: 30px;
            ">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div style="margin-bottom: 16px;">
            <strong>Toplam Personel:</strong> ${personnelDetails.length} kişi
        </div>
        <div style="margin-top: 16px;">
            ${personnelHTML}
        </div>
    `;

    // Append to overlay
    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);

    // Close handlers
    const closeModal = () => {
        document.body.removeChild(modalOverlay);
    };

    modalOverlay.querySelector('.close-modal-btn').addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            closeModal();
        }
    });

    // Close on ESC key
    const escHandler = (e) => {
        if (e.key === 'Escape') {
            closeModal();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
}

// Get today's tasks summary
async function getTasksForToday() {
    try {
        const today = new Date().toISOString().split('T')[0];
        const { data: tasks } = await taskService.getTasksWithPersonnel();

        if (!tasks) return { completed: 0, pending: 0 };

        // Filter today's tasks (created today or due today)
        const todayTasks = tasks.filter(task => {
            const createdDate = task.created_at ? task.created_at.split('T')[0] : null;
            const dueDate = task.due_date ? task.due_date.split('T')[0] : null;
            return createdDate === today || dueDate === today;
        });

        const completed = todayTasks.filter(task => task.status === 'Tamamlandı').length;
        const pending = todayTasks.filter(task => task.status !== 'Tamamlandı').length;

        return { completed, pending };
    } catch (error) {
        console.error('Günlük görevler alınırken hata:', error);
        return { completed: 0, pending: 0 };
    }
}

// Get monthly financial summary
async function getMonthlyFinancialSummary() {
    try {
        // This is a simplified calculation - in real app you'd have actual financial data
        // For now, we'll estimate from inventory movements and costs

        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
        const { data: movements } = await inventoryService.getAll();

        if (!movements) return { income: 0, expense: 0, net: 0 };

        // Filter this month's movements
        const thisMonthMovements = movements.filter(movement =>
            movement.movement_date && movement.movement_date.startsWith(currentMonth)
        );

        // Rough calculation based on inventory movements
        let estimatedIncome = 0;
        let estimatedExpense = 0;

        thisMonthMovements.forEach(movement => {
            const value = (movement.quantity || 0) * (movement.products?.unit_price || 0);
            if (movement.type === 'Çıkış') {
                estimatedIncome += value * 1.3; // Assume 30% markup on sales
            } else if (movement.type === 'Giriş') {
                estimatedExpense += value;
            }
        });

        return {
            income: estimatedIncome,
            expense: estimatedExpense,
            net: estimatedIncome - estimatedExpense
        };
    } catch (error) {
        console.error('Aylık mali özet alınırken hata:', error);
        return { income: 0, expense: 0, net: 0 };
    }
}

// Global Excel Export Functions (accessible from dashboard buttons)
window.exportQuickStockReport = async function() {
    try {
        Toast.info('Stok raporu hazırlanıyor...');
        const { data: products } = await productService.getAll();

        if (!products || products.length === 0) {
            Toast.warning('Stok verisi bulunamadı');
            return;
        }

        await ExcelExporter.exportStockReport(products, 'Hizli_Stok_Raporu');
        Toast.success('Stok raporu başarıyla indirildi!');
    } catch (error) {
        console.error('Stok raporu export hatası:', error);
        Toast.error('Stok raporu oluşturulurken hata oluştu');
    }
};

window.exportQuickAttendanceReport = async function() {
    try {
        Toast.info('Devam raporu hazırlanıyor...');

        // Get last 30 days attendance
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - 30);

        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];

        const { data: attendanceData } = await attendanceService.getByDateRange(startDateStr, endDateStr);

        if (!attendanceData || attendanceData.length === 0) {
            Toast.warning('Son 30 günde devam verisi bulunamadı');
            return;
        }

        await ExcelExporter.exportAttendanceReport(
            attendanceData,
            startDateStr,
            endDateStr,
            'Hizli_Devam_Raporu'
        );
        Toast.success('Devam raporu başarıyla indirildi!');
    } catch (error) {
        console.error('Devam raporu export hatası:', error);
        Toast.error('Devam raporu oluşturulurken hata oluştu');
    }
};

window.exportQuickFinancialReport = async function() {
    try {
        Toast.info('Mali rapor hazırlanıyor...');

        // Get current month's financial summary
        const monthlyFinancial = await getMonthlyFinancialSummary();
        const { data: products } = await productService.getAll();

        const totalStockValue = products?.reduce((sum, product) =>
            sum + (product.current_stock * (product.unit_price || 0)), 0) || 0;

        const financialData = {
            totalStockValue: totalStockValue,
            estimatedIncome: monthlyFinancial.income || 0,
            estimatedExpense: monthlyFinancial.expense || 0
        };

        const currentMonth = new Date().toLocaleDateString('tr-TR', { year: 'numeric', month: 'long' });

        await ExcelExporter.exportFinancialSummary(
            financialData,
            currentMonth,
            'Hizli_Mali_Rapor'
        );
        Toast.success('Mali rapor başarıyla indirildi!');
    } catch (error) {
        console.error('Mali rapor export hatası:', error);
        Toast.error('Mali rapor oluşturulurken hata oluştu');
    }
};