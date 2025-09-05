// Reports Page
import { payrollService, supabase } from '../services/supabaseService.js';
import { formatter } from '../utils/formatter.js';
import { Toast } from '../utils/toast.js';

export async function loadReports() {
    const content = document.getElementById('mainContent');
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const today = new Date().toISOString().split('T')[0];
    
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
            </div>
            
            <!-- Daily Report Tab -->
            <div id="dailyReportTab" class="report-tab-content active">
                <div class="report-filters">
                    <input type="date" id="dailyDate" class="form-control" value="${today}">
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
        </div>
    `;
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
};// Tab switching function
window.switchReportTab = function(tabName) {
    // Hide all tabs
    document.querySelectorAll('.report-tab-content').forEach(tab => {
        tab.style.display = 'none';
    });
    
    // Remove active class from all buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(tabName + 'ReportTab').style.display = 'block';
    
    // Add active class to clicked button
    event.target.closest('.tab-btn').classList.add('active');
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
                                    <span class="status-badge ${record.status === 'Tam Gün' ? 'status-success' : record.status === 'Yarım Gün' ? 'status-warning' : 'status-danger'}">
                                        ${record.status}
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
                }
                
                employeeData[empId].totalOvertime += record.overtime_hours || 0;
                employeeData[empId].totalEarnings += (record.overtime_hours || 0) * (record.employee.daily_wage / 8) * 1.5;
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