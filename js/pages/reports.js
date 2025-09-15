// Reports Page
import { payrollService, supabase } from '../services/supabaseService.js';
import { formatter } from '../utils/formatter.js';
import { Toast } from '../utils/toast.js';

export async function loadReports() {
    const content = document.getElementById('mainContent');
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const todayDate = new Date().toISOString().split('T')[0];
    
    content.innerHTML = `
        <div class="page-header">
            <h1><i class="fas fa-chart-bar"></i> Raporlar</h1>
        </div>
        
        <div class="page-content">
            <!-- Report Type Tabs -->
            <div class="report-tabs">
                <button class="tab-btn active" onclick="window.switchReportTab('daily')">
                    <i class="fas fa-calendar-day"></i> Günlük Rapor
                </button>
                <button class="tab-btn" onclick="window.switchReportTab('weekly')">
                    <i class="fas fa-calendar-week"></i> Haftalık Rapor
                </button>
                <button class="tab-btn" onclick="window.switchReportTab('monthly')">
                    <i class="fas fa-calendar-alt"></i> Aylık Bordro
                </button>
                <button class="tab-btn" onclick="window.switchReportTab('employee')">
                    <i class="fas fa-user-check"></i> Personel Bazlı Rapor
                </button>
            </div>
            
            <!-- Daily Report Tab -->
            <div id="dailyReportTab" class="report-tab-content active">
                <div class="report-filters">
                    <input type="date" id="dailyDate" class="form-control" value="${todayDate}">
                    <button class="btn btn-primary" onclick="window.generateDailyReport()">
                        <i class="fas fa-search"></i> Rapor Oluştur
                    </button>
                    <button class="btn btn-success" onclick="window.exportDailyReport()" style="display:none;" id="exportDailyBtn">
                        <i class="fas fa-file-excel"></i> Excel
                    </button>
                    <button class="btn btn-info" onclick="window.printDailyReport()" style="display:none;" id="printDailyBtn">
                        <i class="fas fa-print"></i> Yazdır
                    </button>
                </div>
                <div id="dailyReportContent" class="report-container">
                    <div class="info-message">
                        <i class="fas fa-info-circle"></i>
                        <p>Günlük raporu görüntülemek için tarih seçip "Rapor Oluştur" butonuna tıklayın.</p>
                    </div>
                </div>
            </div>
            
            <!-- Weekly Report Tab -->
            <div id="weeklyReportTab" class="report-tab-content" style="display:none;">
                <div class="report-filters">
                    <input type="week" id="weeklyDate" class="form-control">
                    <button class="btn btn-primary" onclick="window.generateWeeklyReport()">
                        <i class="fas fa-search"></i> Rapor Oluştur
                    </button>
                    <button class="btn btn-success" onclick="window.exportWeeklyReport()" style="display:none;" id="exportWeeklyBtn">
                        <i class="fas fa-file-excel"></i> Excel
                    </button>
                    <button class="btn btn-info" onclick="window.printWeeklyReport()" style="display:none;" id="printWeeklyBtn">
                        <i class="fas fa-print"></i> Yazdır
                    </button>
                </div>
                <div id="weeklyReportContent" class="report-container">
                    <div class="info-message">
                        <i class="fas fa-info-circle"></i>
                        <p>Haftalık raporu görüntülemek için hafta seçip "Rapor Oluştur" butonuna tıklayın.</p>
                    </div>
                </div>
            </div>
            
            <!-- Monthly Report Tab -->
            <div id="monthlyReportTab" class="report-tab-content" style="display:none;">
                <div class="report-filters">
                    <select id="reportMonth" class="form-control">
                        ${Array.from({length: 12}, (_, i) => i + 1).map(month => `
                            <option value="${month}" ${month === currentMonth ? 'selected' : ''}>
                                ${formatter.monthName(month)}
                            </option>
                        `).join('')}
                    </select>
                    <select id="reportYear" class="form-control">
                        ${Array.from({length: 3}, (_, i) => currentYear - i).map(year => `
                            <option value="${year}">${year}</option>
                        `).join('')}
                    </select>
                    <button class="btn btn-primary" onclick="window.generatePayroll()">
                        <i class="fas fa-file-invoice"></i> Bordro Oluştur
                    </button>
                    <button class="btn btn-success" onclick="window.exportPayroll()" style="display:none;" id="exportBtn">
                        <i class="fas fa-file-excel"></i> Excel
                    </button>
                    <button class="btn btn-info" onclick="window.printPayroll()" style="display:none;" id="printBtn">
                        <i class="fas fa-print"></i> Yazdır
                    </button>
                </div>
                <div id="payrollReport" class="report-container">
                    <div class="info-message">
                        <i class="fas fa-info-circle"></i>
                        <p>Bordro raporu oluşturmak için ay ve yıl seçip "Bordro Oluştur" butonuna tıklayın.</p>
                    </div>
                </div>
            </div>

            <!-- Employee Report Tab -->
            <div id="employeeReportTab" class="report-tab-content" style="display:none;">
                <div class="report-filters">
                    <select id="employeeSelect" class="form-control">
                        <option value="">Personel Seçiniz...</option>
                    </select>
                    <input type="date" id="employeeStartDate" class="form-control">
                    <input type="date" id="employeeEndDate" class="form-control">
                    <button class="btn btn-primary" onclick="window.generateEmployeeReport()">
                        <i class="fas fa-search"></i> Rapor Oluştur
                    </button>
                    <button class="btn btn-success" onclick="window.exportEmployeeReport()" style="display:none;" id="exportEmployeeBtn">
                        <i class="fas fa-file-excel"></i> Excel
                    </button>
                    <button class="btn btn-info" onclick="window.printEmployeeReport()" style="display:none;" id="printEmployeeBtn">
                        <i class="fas fa-print"></i> Yazdır
                    </button>
                </div>
                <div id="employeeReportContent" class="report-container">
                    <div class="info-message">
                        <i class="fas fa-info-circle"></i>
                        <p>Personel bazlı puantaj raporu için personel ve tarih aralığı seçip "Rapor Oluştur" butonuna tıklayın.</p>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Load employee list for employee report
    loadEmployeeList();

    // Set default dates for employee report
    const currentDate = new Date();
    const oneMonthAgo = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, currentDate.getDate());
    document.getElementById('employeeStartDate').value = oneMonthAgo.toISOString().split('T')[0];
    document.getElementById('employeeEndDate').value = currentDate.toISOString().split('T')[0];
}

async function loadEmployeeList() {
    try {
        const { data: employees, error } = await supabase
            .from('employees')
            .select('*')
            .eq('is_active', true)
            .order('full_name');

        if (error) throw error;

        const select = document.getElementById('employeeSelect');
        if (select && employees) {
            employees.forEach(emp => {
                const option = document.createElement('option');
                option.value = emp.id;
                option.textContent = emp.full_name;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Personel listesi yüklenirken hata:', error);
    }
}

window.generatePayroll = async function() {
    const month = document.getElementById('reportMonth').value;
    const year = document.getElementById('reportYear').value;
    
    const reportContainer = document.getElementById('payrollReport');
    reportContainer.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Bordro hesaplanıyor...</div>';
    
    try {
        const { data: payroll, error } = await payrollService.getMonthlyPayroll(year, month);
        
        if (error) throw error;
        
        if (payroll && payroll.length > 0) {
            const totalGross = payroll.reduce((sum, p) => sum + p.grossSalary, 0);
            const totalAdvances = payroll.reduce((sum, p) => sum + p.advances, 0);
            const totalDeductions = payroll.reduce((sum, p) => sum + p.deductions, 0);
            const totalNet = payroll.reduce((sum, p) => sum + p.netSalary, 0);
            
            reportContainer.innerHTML = `
                <div class="report-header">
                    <h2>Aylık Bordro Raporu</h2>
                    <p>${formatter.monthName(month)} ${year}</p>
                </div>
                
                <div class="table-responsive">
                    <table class="table report-table" id="payrollTable">
                        <thead>
                            <tr>
                                <th>Personel</th>
                                <th>Günlük Ücret</th>
                                <th>Tam Gün</th>
                                <th>Yarım Gün</th>
                                <th>Gelmedi</th>
                                <th>Toplam Gün</th>
                                <th>Ek Mesai</th>
                                <th>Ek Mesai Ücreti</th>
                                <th>Brüt Maaş</th>
                                <th>Avanslar</th>
                                <th>Kesintiler</th>
                                <th>Net Maaş</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${payroll.map(emp => `
                                <tr>
                                    <td><strong>${emp.employee}</strong></td>
                                    <td>${formatter.currency(emp.dailyWage)}</td>
                                    <td>${emp.fullDays}</td>
                                    <td>${emp.halfDays}</td>
                                    <td>${emp.absentDays}</td>
                                    <td>${formatter.number(emp.totalDays, 1)}</td>
                                    <td>${emp.overtimeHours || '0'}</td>
                                    <td>${formatter.currency(emp.overtimePayment || 0)}</td>
                                    <td>${formatter.currency(emp.grossSalary)}</td>
                                    <td>${formatter.currency(emp.advances)}</td>
                                    <td>${formatter.currency(emp.deductions)}</td>
                                    <td><strong>${formatter.currency(emp.netSalary)}</strong></td>
                                </tr>
                            `).join('')}
                        </tbody>
                        <tfoot>
                            <tr class="total-row">
                                <td colspan="6"><strong>TOPLAM</strong></td>
                                <td><strong>${payroll.reduce((sum, p) => sum + (p.overtimeHours || 0), 0)}</strong></td>
                                <td><strong>${formatter.currency(payroll.reduce((sum, p) => sum + (p.overtimePayment || 0), 0))}</strong></td>
                                <td><strong>${formatter.currency(totalGross)}</strong></td>
                                <td><strong>${formatter.currency(totalAdvances)}</strong></td>
                                <td><strong>${formatter.currency(totalDeductions)}</strong></td>
                                <td><strong>${formatter.currency(totalNet)}</strong></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
                
                <div class="report-footer">
                    <p>Rapor Tarihi: ${formatter.date(new Date())}</p>
                </div>
            `;
            
            // Show export and print buttons
            document.getElementById('exportBtn').style.display = 'inline-block';
            document.getElementById('printBtn').style.display = 'inline-block';
            
            // Store payroll data for export
            window.currentPayrollData = {
                month: formatter.monthName(month),
                year: year,
                data: payroll
            };
            
        } else {
            reportContainer.innerHTML = `
                <div class="alert alert-warning">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Seçilen dönem için bordro verisi bulunamadı.</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Bordro oluşturulurken hata:', error);
        Toast.error('Bordro raporu oluşturulurken hata oluştu');
        reportContainer.innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-circle"></i>
                <p>Bordro raporu oluşturulurken bir hata oluştu.</p>
            </div>
        `;
    }
};

window.exportPayroll = function() {
    if (!window.currentPayrollData) return;
    
    const { month, year, data } = window.currentPayrollData;
    
    // Create CSV content
    let csv = 'Personel,Günlük Ücret,Tam Gün,Yarım Gün,Gelmedi,Toplam Gün,Brüt Maaş,Avanslar,Kesintiler,Net Maaş\n';
    
    data.forEach(emp => {
        csv += `"${emp.employee}",${emp.dailyWage},${emp.fullDays},${emp.halfDays},${emp.absentDays},${emp.totalDays},${emp.grossSalary},${emp.advances},${emp.deductions},${emp.netSalary}\n`;
    });
    
    // Add totals
    const totalGross = data.reduce((sum, p) => sum + p.grossSalary, 0);
    const totalAdvances = data.reduce((sum, p) => sum + p.advances, 0);
    const totalDeductions = data.reduce((sum, p) => sum + p.deductions, 0);
    const totalNet = data.reduce((sum, p) => sum + p.netSalary, 0);
    
    csv += `"TOPLAM","","","","","",${totalGross},${totalAdvances},${totalDeductions},${totalNet}\n`;
    
    // Download CSV
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Bordro_${month}_${year}.csv`;
    link.click();
    
    Toast.success('Bordro raporu Excel formatında indirildi');
};

window.printPayroll = function() {
    const printWindow = window.open('', '_blank');
    const reportContent = document.getElementById('payrollReport').innerHTML;
    
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Bordro Raporu</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    margin: 20px;
                }
                .report-header {
                    text-align: center;
                    margin-bottom: 20px;
                    border-bottom: 2px solid #333;
                    padding-bottom: 10px;
                }
                .report-header h2 {
                    margin: 0;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 20px;
                }
                th, td {
                    border: 1px solid #ddd;
                    padding: 8px;
                    text-align: left;
                }
                th {
                    background-color: #f2f2f2;
                    font-weight: bold;
                }
                .total-row {
                    font-weight: bold;
                    background-color: #f9f9f9;
                }
                .report-footer {
                    margin-top: 20px;
                    text-align: right;
                    font-style: italic;
                }
                @media print {
                    .no-print {
                        display: none;
                    }
                }
            </style>
        </head>
        <body>
            ${reportContent}
            <script>
                window.onload = function() {
                    window.print();
                    window.onafterprint = function() {
                        window.close();
                    }
                }
            </script>
        </body>
        </html>
    `);
    
    printWindow.document.close();
};

// Tab switching function
window.switchReportTab = function(tabName) {
    // Hide all tabs
    document.querySelectorAll('.report-tab-content').forEach(tab => {
        tab.style.display = 'none';
    });

    // Remove active class from all buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Show selected tab - handle special case for employee report
    const tabId = tabName === 'employee' ? 'employeeReportTab' : tabName + 'ReportTab';
    const selectedTab = document.getElementById(tabId);
    if (selectedTab) {
        selectedTab.style.display = 'block';
    }

    // Add active class to clicked button
    if (event && event.target) {
        const btn = event.target.closest('.tab-btn');
        if (btn) {
            btn.classList.add('active');
        }
    }
};

// Daily Report Functions
window.generateDailyReport = async function() {
    const date = document.getElementById('dailyDate').value;
    if (!date) {
        Toast.error('Lütfen tarih seçiniz');
        return;
    }
    
    const reportContainer = document.getElementById('dailyReportContent');
    reportContainer.innerHTML = '<div class="loading">Rapor yükleniyor...</div>';
    
    try {
        // Fetch attendance data for selected date
        const { data: attendance, error } = await supabase
            .from('attendance_records')
            .select(`
                id,
                work_date,
                status,
                overtime_hours,
                employee:employees(full_name, daily_wage),
                project:projects(project_name)
            `)
            .eq('work_date', date)
            .order('work_date');
            
        if (error) throw error;
        
        if (attendance && attendance.length > 0) {
            const totalPresent = attendance.filter(a => a.status === 'Tam Gün').length;
            const totalAbsent = attendance.filter(a => a.status === 'Gelmedi').length;
            const totalHalfDay = attendance.filter(a => a.status === 'Yarım Gün').length;
            const totalOvertime = attendance.reduce((sum, a) => sum + (a.overtime_hours || 0), 0);
            
            reportContainer.innerHTML = `
                <div class="report-header">
                    <h2>Günlük Puantaj Raporu</h2>
                    <p class="report-date">Tarih: ${new Date(date + 'T12:00:00').toLocaleDateString('tr-TR')}</p>
                </div>
                
                <div class="report-summary">
                    <div class="summary-card">
                        <span class="summary-label">Toplam Personel</span>
                        <span class="summary-value">${attendance.length}</span>
                    </div>
                    <div class="summary-card success">
                        <span class="summary-label">Gelen</span>
                        <span class="summary-value">${totalPresent}</span>
                    </div>
                    <div class="summary-card warning">
                        <span class="summary-label">Yarım Gün</span>
                        <span class="summary-value">${totalHalfDay}</span>
                    </div>
                    <div class="summary-card danger">
                        <span class="summary-label">Gelmedi</span>
                        <span class="summary-value">${totalAbsent}</span>
                    </div>
                    <div class="summary-card info">
                        <span class="summary-label">Toplam Mesai</span>
                        <span class="summary-value">${totalOvertime} Saat</span>
                    </div>
                </div>
                
                <table class="report-table">
                    <thead>
                        <tr>
                            <th>Personel</th>
                            <th>Proje</th>
                            <th>Durum</th>
                            <th>Mesai (Saat)</th>
                            <th>Günlük Ücret</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${attendance.map(record => `
                            <tr>
                                <td>${record.employee.full_name}</td>
                                <td>${record.project ? record.project.project_name : '-'}</td>
                                <td>
                                    <span class="status-badge ${
                                        record.status === 'Tam Gün' ? 'status-success' :
                                        record.status === 'Yarım Gün' ? 'status-warning' :
                                        record.status === 'Serbest Saat' ? 'status-info' :
                                        'status-danger'
                                    }">
                                        ${record.status}${record.status === 'Serbest Saat' ? ` (${record.custom_hours || 0}h)` : ''}
                                    </span>
                                </td>
                                <td>${record.overtime_hours || 0}</td>
                                <td>${formatter.currency(record.employee.daily_wage)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
            
            // Show export buttons
            document.getElementById('exportDailyBtn').style.display = 'inline-block';
            document.getElementById('printDailyBtn').style.display = 'inline-block';
            
            // Store data for export
            window.currentDailyReportData = {
                date: date,
                data: attendance
            };
        } else {
            reportContainer.innerHTML = `
                <div class="alert alert-warning">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Seçilen tarih için kayıt bulunamadı.</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Günlük rapor hatası:', error);
        Toast.error('Rapor oluşturulurken hata oluştu');
    }
};

// Weekly Report Functions
window.generateWeeklyReport = async function() {
    const weekInput = document.getElementById('weeklyDate').value;
    if (!weekInput) {
        Toast.error('Lütfen hafta seçiniz');
        return;
    }
    
    // Parse week input (format: 2024-W35)
    const [year, weekNum] = weekInput.split('-W');
    const startDate = getDateOfWeek(parseInt(weekNum), parseInt(year));
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);
    
    const reportContainer = document.getElementById('weeklyReportContent');
    reportContainer.innerHTML = '<div class="loading">Rapor yükleniyor...</div>';
    
    try {
        // Fetch attendance data for selected week
        const { data: attendance, error } = await supabase
            .from('attendance_records')
            .select(`
                id,
                work_date,
                status,
                overtime_hours,
                employee:employees(id, full_name, daily_wage),
                project:projects(project_name)
            `)
            .gte('work_date', startDate.toISOString().split('T')[0])
            .lte('work_date', endDate.toISOString().split('T')[0])
            .order('work_date')
            .order('work_date');
            
        if (error) throw error;
        
        if (attendance && attendance.length > 0) {
            // Group by employee
            const employeeData = {};
            attendance.forEach(record => {
                const empId = record.employee.id;
                if (!employeeData[empId]) {
                    employeeData[empId] = {
                        name: record.employee.full_name,
                        daily_wage: record.employee.daily_wage,
                        days: {},
                        totalDays: 0,
                        totalOvertime: 0,
                        totalEarnings: 0
                    };
                }
                
                const dayNum = new Date(record.work_date + 'T12:00:00').getDay();
                employeeData[empId].days[dayNum] = {
                    status: record.status,
                    overtime: record.overtime_hours || 0
                };
                
                if (record.status === 'Tam Gün') {
                    employeeData[empId].totalDays += 1;
                    employeeData[empId].totalEarnings += record.employee.daily_wage;
                } else if (record.status === 'Yarım Gün') {
                    employeeData[empId].totalDays += 0.5;
                    employeeData[empId].totalEarnings += record.employee.daily_wage / 2;
                } else if (record.status === 'Serbest Saat') {
                    const customHours = record.custom_hours || 0;
                    const workDays = customHours / 9; // 9 saatlik gün standardına göre
                    employeeData[empId].totalDays += workDays;
                    employeeData[empId].totalEarnings += (record.employee.daily_wage / 9) * customHours;
                }
                
                employeeData[empId].totalOvertime += record.overtime_hours || 0;
                employeeData[empId].totalEarnings += (record.overtime_hours || 0) * (record.employee.daily_wage / 9);
            });
            
            const weekDays = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
            
            reportContainer.innerHTML = `
                <div class="report-header">
                    <h2>Haftalık Puantaj Raporu</h2>
                    <p class="report-date">
                        ${startDate.toLocaleDateString('tr-TR')} - ${endDate.toLocaleDateString('tr-TR')}
                    </p>
                </div>
                
                <div class="weekly-report-table-container">
                    <table class="report-table weekly-table">
                        <thead>
                            <tr>
                                <th>Personel</th>
                                ${weekDays.map(day => `<th>${day.substr(0, 3)}</th>`).join('')}
                                <th>Toplam Gün</th>
                                <th>Mesai</th>
                                <th>Kazanç</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${Object.values(employeeData).map(emp => `
                                <tr>
                                    <td class="emp-name">${emp.name}</td>
                                    ${weekDays.map((_, idx) => {
                                        const day = emp.days[idx];
                                        if (!day) return '<td>-</td>';
                                        const statusClass = day.status === 'Tam Gün' ? 'status-present' : 
                                                          day.status === 'Yarım Gün' ? 'status-half' : 'status-absent';
                                        const statusSymbol = day.status === 'Tam Gün' ? '✓' : 
                                                           day.status === 'Yarım Gün' ? '½' : 'X';
                                        return `<td class="${statusClass}">${statusSymbol}${day.overtime ? ` +${day.overtime}` : ''}</td>`;
                                    }).join('')}
                                    <td class="text-center">${emp.totalDays}</td>
                                    <td class="text-center">${emp.totalOvertime}</td>
                                    <td class="text-right">${formatter.currency(emp.totalEarnings)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
            
            // Show export buttons
            document.getElementById('exportWeeklyBtn').style.display = 'inline-block';
            document.getElementById('printWeeklyBtn').style.display = 'inline-block';
            
            // Store data for export
            window.currentWeeklyReportData = {
                startDate: startDate.toISOString().split('T')[0],
                endDate: endDate.toISOString().split('T')[0],
                data: employeeData
            };
        } else {
            reportContainer.innerHTML = `
                <div class="alert alert-warning">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Seçilen hafta için kayıt bulunamadı.</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Haftalık rapor hatası:', error);
        Toast.error('Rapor oluşturulurken hata oluştu');
    }
};

// Helper function to get date from week number
function getDateOfWeek(weekNum, year) {
    const january = new Date(year, 0, 1);
    const daysToMonday = (january.getDay() === 0 ? 6 : january.getDay() - 1);
    const firstMonday = new Date(year, 0, january.getDate() - daysToMonday);
    return new Date(firstMonday.getTime() + (weekNum - 1) * 7 * 24 * 60 * 60 * 1000);
}

// Export functions
window.exportDailyReport = function() {
    if (!window.currentDailyReportData) return;
    
    const { date, data } = window.currentDailyReportData;
    
    let csv = 'Personel,Proje,Durum,Mesai,Günlük Ücret\n';
    data.forEach(record => {
        csv += `"${record.employee.full_name}","${record.project ? record.project.project_name : '-'}","${record.status}",${record.overtime_hours || 0},${record.employee.daily_wage}\n`;
    });
    
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `gunluk_rapor_${date}.csv`;
    link.click();
};

window.exportWeeklyReport = function() {
    if (!window.currentWeeklyReportData) return;
    
    const { startDate, endDate, data } = window.currentWeeklyReportData;
    
    let csv = 'Personel,Pazartesi,Salı,Çarşamba,Perşembe,Cuma,Cumartesi,Pazar,Toplam Gün,Mesai,Kazanç\n';
    Object.values(data).forEach(emp => {
        const days = [];
        for (let i = 1; i <= 7; i++) {
            const dayIdx = i % 7;
            const day = emp.days[dayIdx];
            days.push(day ? day.status : '-');
        }
        csv += `"${emp.name}",${days.join(',')},${emp.totalDays},${emp.totalOvertime},${emp.totalEarnings}\n`;
    });
    
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `haftalik_rapor_${startDate}_${endDate}.csv`;
    link.click();
};

window.printDailyReport = function() {
    window.print();
};

window.printWeeklyReport = function() {
    window.print();
};

// Employee Based Report Functions
window.generateEmployeeReport = async function() {
    const employeeId = document.getElementById('employeeSelect').value;
    const startDate = document.getElementById('employeeStartDate').value;
    const endDate = document.getElementById('employeeEndDate').value;

    if (!employeeId) {
        Toast.error('Lütfen personel seçiniz');
        return;
    }

    if (!startDate || !endDate) {
        Toast.error('Lütfen tarih aralığı seçiniz');
        return;
    }

    const reportContainer = document.getElementById('employeeReportContent');
    reportContainer.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Rapor yükleniyor...</div>';

    try {
        // Get employee info
        const { data: employee, error: empError } = await supabase
            .from('employees')
            .select('*')
            .eq('id', employeeId)
            .single();

        if (empError) throw empError;

        // Get attendance records
        const { data: attendance, error: attError } = await supabase
            .from('attendance_records')
            .select(`
                *,
                project:projects(project_name)
            `)
            .eq('employee_id', employeeId)
            .gte('work_date', startDate)
            .lte('work_date', endDate)
            .order('work_date', { ascending: false });

        if (attError) throw attError;

        // Get transactions (advances and deductions)
        const { data: transactions, error: transError } = await supabase
            .from('transactions')
            .select('*')
            .eq('employee_id', employeeId)
            .gte('transaction_date', startDate)
            .lte('transaction_date', endDate)
            .order('transaction_date', { ascending: false });

        if (transError) throw transError;

        // Calculate statistics
        let totalDays = 0;
        let fullDays = 0;
        let halfDays = 0;
        let absentDays = 0;
        let totalOvertime = 0;
        let projectStats = {};

        attendance.forEach(record => {
            if (record.status === 'Tam Gün') {
                fullDays++;
                totalDays += 1;
            } else if (record.status === 'Yarım Gün') {
                halfDays++;
                totalDays += 0.5;
            } else if (record.status === 'Gelmedi') {
                absentDays++;
            }

            totalOvertime += record.overtime_hours || 0;

            // Project statistics
            if (record.project) {
                const projectName = record.project.project_name;
                if (!projectStats[projectName]) {
                    projectStats[projectName] = { days: 0, overtime: 0 };
                }
                projectStats[projectName].days += record.status === 'Tam Gün' ? 1 :
                                                   record.status === 'Yarım Gün' ? 0.5 :
                                                   record.status === 'Serbest Saat' ? (record.custom_hours || 0) / 9 : 0;
                projectStats[projectName].overtime += record.overtime_hours || 0;
            }
        });

        // Calculate financial summary
        const dailyWage = employee.daily_wage;
        const totalEarnings = totalDays * dailyWage;
        const overtimeEarnings = totalOvertime * (dailyWage / 9);
        const grossEarnings = totalEarnings + overtimeEarnings;

        let totalAdvances = 0;
        let totalDeductions = 0;
        transactions.forEach(trans => {
            if (trans.type === 'Avans') {
                totalAdvances += trans.amount;
            } else if (trans.type === 'Kesinti') {
                totalDeductions += trans.amount;
            }
        });

        const netEarnings = grossEarnings - totalAdvances - totalDeductions;

        reportContainer.innerHTML = `
            <div class="professional-report">
                <div class="report-header-professional">
                    <div class="company-logo">
                        <h3>DİNKY METAL ERP</h3>
                        <span class="report-type">PERSONEL PUANTAJ RAPORU</span>
                    </div>
                    <div class="report-meta">
                        <table class="meta-table">
                            <tr>
                                <td class="meta-label">Rapor Tarihi:</td>
                                <td class="meta-value">${new Date().toLocaleDateString('tr-TR')}</td>
                            </tr>
                            <tr>
                                <td class="meta-label">Dönem:</td>
                                <td class="meta-value">${new Date(startDate).toLocaleDateString('tr-TR')} - ${new Date(endDate).toLocaleDateString('tr-TR')}</td>
                            </tr>
                        </table>
                    </div>
                </div>

                <div class="employee-section">
                    <div class="section-title">PERSONEL BİLGİLERİ</div>
                    <table class="info-table">
                        <tr>
                            <td class="label-col">Ad Soyad:</td>
                            <td class="value-col"><strong>${employee.full_name}</strong></td>
                            <td class="label-col">Departman:</td>
                            <td class="value-col">${employee.department || '-'}</td>
                        </tr>
                        <tr>
                            <td class="label-col">Günlük Ücret:</td>
                            <td class="value-col">${formatter.currency(dailyWage)}</td>
                            <td class="label-col">Aylık Maaş:</td>
                            <td class="value-col">${formatter.currency(employee.monthly_salary)}</td>
                        </tr>
                    </table>
                </div>

                <div class="attendance-section">
                    <div class="section-title">DEVAM DURUMU</div>
                    <table class="summary-table">
                        <thead>
                            <tr>
                                <th>Tam Gün</th>
                                <th>Yarım Gün</th>
                                <th>Gelmedi</th>
                                <th>Toplam Çalışılan</th>
                                <th>Mesai (Saat)</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td class="text-center">${fullDays}</td>
                                <td class="text-center">${halfDays}</td>
                                <td class="text-center">${absentDays}</td>
                                <td class="text-center"><strong>${totalDays}</strong></td>
                                <td class="text-center">${totalOvertime}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                ${Object.keys(projectStats).length > 0 ? `
                <div class="project-section">
                    <div class="section-title">PROJE BAZLI ÇALIŞMA</div>
                    <table class="detail-table">
                        <thead>
                            <tr>
                                <th>Proje Adı</th>
                                <th class="text-center">Çalışılan Gün</th>
                                <th class="text-center">Mesai (Saat)</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${Object.entries(projectStats).map(([project, stats]) => `
                                <tr>
                                    <td>${project}</td>
                                    <td class="text-center">${stats.days}</td>
                                    <td class="text-center">${stats.overtime}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                ` : ''}

                <div class="financial-section">
                    <div class="section-title">MALİ ÖZET</div>
                    <table class="financial-table">
                        <tbody>
                            <tr>
                                <td class="desc-col">Çalışma Ücreti</td>
                                <td class="calc-col">${totalDays} gün x ${formatter.currency(dailyWage)}</td>
                                <td class="amount-col">${formatter.currency(totalEarnings)}</td>
                            </tr>
                            <tr>
                                <td class="desc-col">Mesai Ücreti</td>
                                <td class="calc-col">${totalOvertime} saat x ${formatter.currency(dailyWage/9)}</td>
                                <td class="amount-col">${formatter.currency(overtimeEarnings)}</td>
                            </tr>
                            <tr class="subtotal-row">
                                <td colspan="2" class="desc-col"><strong>BRÜT KAZANÇ</strong></td>
                                <td class="amount-col"><strong>${formatter.currency(grossEarnings)}</strong></td>
                            </tr>
                            ${totalAdvances > 0 ? `
                            <tr>
                                <td class="desc-col">Avanslar</td>
                                <td class="calc-col"></td>
                                <td class="amount-col negative">-${formatter.currency(totalAdvances)}</td>
                            </tr>
                            ` : ''}
                            ${totalDeductions > 0 ? `
                            <tr>
                                <td class="desc-col">Kesintiler</td>
                                <td class="calc-col"></td>
                                <td class="amount-col negative">-${formatter.currency(totalDeductions)}</td>
                            </tr>
                            ` : ''}
                            <tr class="total-row">
                                <td colspan="2" class="desc-col"><strong>NET ÖDEME</strong></td>
                                <td class="amount-col"><strong class="net-amount">${formatter.currency(netEarnings)}</strong></td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div class="detail-section">
                    <div class="section-title">PUANTAJ DETAYLARI</div>
                    <table class="detail-table">
                        <thead>
                            <tr>
                                <th>Tarih</th>
                                <th>Gün</th>
                                <th>Durum</th>
                                <th>Proje</th>
                                <th class="text-center">Mesai</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${attendance.map(record => {
                                const date = new Date(record.work_date + 'T12:00:00');
                                const dayNames = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
                                const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                                return `
                                    <tr class="${isWeekend ? 'weekend-row' : ''}">
                                        <td>${date.toLocaleDateString('tr-TR')}</td>
                                        <td>${dayNames[date.getDay()]}</td>
                                        <td class="text-center">
                                            <span class="status-indicator ${
                                                record.status === 'Tam Gün' ? 'status-full' :
                                                record.status === 'Yarım Gün' ? 'status-half' :
                                                'status-absent'
                                            }">
                                                ${record.status === 'Tam Gün' ? '●' :
                                                  record.status === 'Yarım Gün' ? '◐' : '○'}
                                            </span>
                                        </td>
                                        <td>${record.project ? record.project.project_name : '-'}</td>
                                        <td class="text-center">${record.overtime_hours || '-'}</td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>

                ${transactions.length > 0 ? `
                <div class="transaction-section">
                    <div class="section-title">AVANS VE KESİNTİLER</div>
                    <table class="detail-table">
                        <thead>
                            <tr>
                                <th>Tarih</th>
                                <th>İşlem Tipi</th>
                                <th>Açıklama</th>
                                <th class="text-right">Tutar</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${transactions.map(trans => `
                                <tr>
                                    <td>${new Date(trans.transaction_date).toLocaleDateString('tr-TR')}</td>
                                    <td>
                                        <span class="transaction-type ${trans.type === 'Avans' ? 'type-advance' : 'type-deduction'}">
                                            ${trans.type}
                                        </span>
                                    </td>
                                    <td>${trans.description || '-'}</td>
                                    <td class="text-right">${formatter.currency(trans.amount)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                ` : ''}

                <div class="report-footer-professional">
                    <div class="signature-section">
                        <div class="signature-box">
                            <p>Hazırlayan</p>
                            <div class="signature-line"></div>
                        </div>
                        <div class="signature-box">
                            <p>Onaylayan</p>
                            <div class="signature-line"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Show export buttons
        document.getElementById('exportEmployeeBtn').style.display = 'inline-block';
        document.getElementById('printEmployeeBtn').style.display = 'inline-block';

        // Store data for export
        window.currentEmployeeReportData = {
            employee,
            attendance,
            transactions,
            statistics: {
                fullDays,
                halfDays,
                absentDays,
                totalDays,
                totalOvertime,
                grossEarnings,
                totalAdvances,
                totalDeductions,
                netEarnings
            },
            startDate,
            endDate
        };

    } catch (error) {
        console.error('Personel raporu hatası:', error);
        Toast.error('Rapor oluşturulurken hata oluştu');
        reportContainer.innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-circle"></i>
                <p>Rapor oluşturulurken bir hata oluştu.</p>
            </div>
        `;
    }
};

window.exportEmployeeReport = function() {
    if (!window.currentEmployeeReportData) return;

    const { employee, attendance, transactions, statistics, startDate, endDate } = window.currentEmployeeReportData;
    const reportDate = new Date().toLocaleDateString('tr-TR');
    const dailyWage = employee.daily_wage;
    const overtimeRate = dailyWage / 9;

    let csv = '\ufeff';

    // Professional Header
    csv += '=======================================================\n';
    csv += 'DİNKY METAL ERP - PERSONEL PUANTAJ RAPORU\n';
    csv += '=======================================================\n\n';

    // Report Information
    csv += 'RAPOR BİLGİLERİ\n';
    csv += '-------------------\n';
    csv += `Rapor Tarihi:,${reportDate}\n`;
    csv += `Rapor Dönemi:,${new Date(startDate).toLocaleDateString('tr-TR')} - ${new Date(endDate).toLocaleDateString('tr-TR')}\n`;
    csv += `Rapor Türü:,Personel Bazlı Puantaj Raporu\n\n`;

    // Employee Information
    csv += 'PERSONEL BİLGİLERİ\n';
    csv += '-------------------\n';
    csv += `Ad Soyad:,${employee.full_name}\n`;
    csv += `Departman:,${employee.department || 'Belirtilmemiş'}\n`;
    csv += `Günlük Ücret:,${formatter.currency(dailyWage)}\n`;
    csv += `Aylık Maaş:,${formatter.currency(employee.monthly_salary)}\n`;
    csv += `İşe Başlama:,${formatter.date(employee.start_date)}\n\n`;

    // Summary Statistics
    csv += 'DEVAM DURUMU ÖZETİ\n';
    csv += '-------------------\n';
    csv += 'Açıklama,Gün Sayısı,Oran (%)\n';
    const totalDaysIncludingAbsent = statistics.fullDays + statistics.halfDays + statistics.absentDays;
    csv += `Tam Gün Çalışma,${statistics.fullDays},${totalDaysIncludingAbsent > 0 ? (statistics.fullDays / totalDaysIncludingAbsent * 100).toFixed(1) : 0}%\n`;
    csv += `Yarım Gün Çalışma,${statistics.halfDays},${totalDaysIncludingAbsent > 0 ? (statistics.halfDays / totalDaysIncludingAbsent * 100).toFixed(1) : 0}%\n`;
    csv += `Devamsızlık,${statistics.absentDays},${totalDaysIncludingAbsent > 0 ? (statistics.absentDays / totalDaysIncludingAbsent * 100).toFixed(1) : 0}%\n`;
    csv += `Toplam Çalışılan Gün,${statistics.totalDays},-\n`;
    csv += `Toplam Mesai (Saat),${statistics.totalOvertime},-\n\n`;

    // Financial Summary
    csv += 'MALİ ÖZET\n';
    csv += '-------------------\n';
    csv += 'Açıklama,Hesaplama,Tutar\n';
    csv += `Çalışma Ücreti,"${statistics.totalDays} gün × ${formatter.currency(dailyWage)}",${formatter.currency(statistics.totalDays * dailyWage)}\n`;
    csv += `Mesai Ücreti,"${statistics.totalOvertime} saat × ${formatter.currency(overtimeRate)}",${formatter.currency(statistics.totalOvertime * overtimeRate)}\n`;
    csv += `BRÜT KAZANÇ,-,${formatter.currency(statistics.grossEarnings)}\n`;
    if (statistics.totalAdvances > 0) {
        csv += `Kesinti - Avanslar,-,"(${formatter.currency(statistics.totalAdvances)})"\n`;
    }
    if (statistics.totalDeductions > 0) {
        csv += `Kesinti - Diğer,-,"(${formatter.currency(statistics.totalDeductions)})"\n`;
    }
    csv += `NET ÖDEME,-,${formatter.currency(statistics.netEarnings)}\n\n`;

    // Detailed Attendance
    csv += 'PUANTAJ DETAYLARI\n';
    csv += '-------------------\n';
    csv += 'Tarih,Gün,Durum,Proje,Mesai (Saat),Günlük Kazanç\n';

    attendance.forEach(record => {
        const date = new Date(record.work_date + 'T12:00:00');
        const dayNames = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
        const dayEarning = record.status === 'Tam Gün' ? dailyWage :
                          record.status === 'Yarım Gün' ? dailyWage / 2 :
                          record.status === 'Serbest Saat' ? (dailyWage / 9) * (record.custom_hours || 0) : 0;
        const overtimeEarning = (record.overtime_hours || 0) * overtimeRate;
        const totalDayEarning = dayEarning + overtimeEarning;

        csv += `${date.toLocaleDateString('tr-TR')},${dayNames[date.getDay()]},${record.status},${record.project ? record.project.project_name : 'Atanmamış'},${record.overtime_hours || 0},${formatter.currency(totalDayEarning)}\n`;
    });

    // Project Summary if exists
    const projectStats = {};
    attendance.forEach(record => {
        if (record.project) {
            const projectName = record.project.project_name;
            if (!projectStats[projectName]) {
                projectStats[projectName] = { days: 0, overtime: 0 };
            }
            projectStats[projectName].days += record.status === 'Tam Gün' ? 1 :
                                               record.status === 'Yarım Gün' ? 0.5 :
                                               record.status === 'Serbest Saat' ? (record.custom_hours || 0) / 9 : 0;
            projectStats[projectName].overtime += record.overtime_hours || 0;
        }
    });

    if (Object.keys(projectStats).length > 0) {
        csv += '\nPROJE BAZLI ÇALIŞMA\n';
        csv += '-------------------\n';
        csv += 'Proje Adı,Çalışılan Gün,Mesai (Saat),Proje Kazancı\n';
        Object.entries(projectStats).forEach(([project, stats]) => {
            const projectEarnings = (stats.days * dailyWage) + (stats.overtime * overtimeRate);
            csv += `${project},${stats.days},${stats.overtime},${formatter.currency(projectEarnings)}\n`;
        });
    }

    // Transactions if exists
    if (transactions.length > 0) {
        csv += '\nAVANS VE KESİNTİLER\n';
        csv += '-------------------\n';
        csv += 'Tarih,İşlem Türü,Açıklama,Tutar,Kümülatif Bakiye\n';

        let cumulativeBalance = 0;
        transactions.forEach(trans => {
            const amount = trans.type === 'Avans' ? -trans.amount : -trans.amount;
            cumulativeBalance += amount;
            csv += `${new Date(trans.transaction_date).toLocaleDateString('tr-TR')},${trans.type},${trans.description || 'Açıklama yok'},${formatter.currency(trans.amount)},${formatter.currency(cumulativeBalance)}\n`;
        });
    }

    // Footer
    csv += '\n=======================================================\n';
    csv += `Rapor Oluşturma: ${new Date().toLocaleString('tr-TR')}\n`;
    csv += 'Bu rapor Dinky Metal ERP sistemi tarafından otomatik oluşturulmuştur.\n';
    csv += '=======================================================\n';

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);

    const fileName = `DinkyMetal_PersonelRapor_${employee.full_name.replace(/\s+/g, '_')}_${startDate}_${endDate}_${new Date().getTime()}.csv`;
    link.download = fileName;
    link.click();

    Toast.success('Profesyonel personel raporu Excel formatında indirildi');
};

window.printEmployeeReport = function() {
    const printWindow = window.open('', '_blank');
    const reportContent = document.getElementById('employeeReportContent').innerHTML;

    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Personel Puantaj Raporu</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    margin: 20px;
                    font-size: 12px;
                }
                .report-header {
                    text-align: center;
                    margin-bottom: 20px;
                    border-bottom: 2px solid #333;
                    padding-bottom: 10px;
                }
                .report-header h2 {
                    margin: 0;
                }
                .report-header h3 {
                    margin: 5px 0;
                    color: #666;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 15px 0;
                }
                th, td {
                    border: 1px solid #ddd;
                    padding: 6px;
                    text-align: left;
                }
                th {
                    background-color: #f2f2f2;
                    font-weight: bold;
                }
                .total-row {
                    font-weight: bold;
                    background-color: #f9f9f9;
                }
                .text-right {
                    text-align: right;
                }
                .text-danger {
                    color: #d9534f;
                }
                .badge {
                    padding: 2px 6px;
                    border-radius: 3px;
                    font-size: 11px;
                }
                .badge-success {
                    background: #5cb85c;
                    color: white;
                }
                .badge-warning {
                    background: #f0ad4e;
                    color: white;
                }
                .badge-danger {
                    background: #d9534f;
                    color: white;
                }
                .summary-row {
                    display: flex;
                    gap: 10px;
                    margin: 15px 0;
                }
                .summary-card {
                    flex: 1;
                    border: 1px solid #ddd;
                    padding: 10px;
                    text-align: center;
                }
                h3 {
                    margin-top: 20px;
                    margin-bottom: 10px;
                    color: #333;
                }
                @media print {
                    .no-print {
                        display: none;
                    }
                }
            </style>
        </head>
        <body>
            ${reportContent}
            <script>
                window.onload = function() {
                    window.print();
                    window.onafterprint = function() {
                        window.close();
                    }
                }
            </script>
        </body>
        </html>
    `);

    printWindow.document.close();
};