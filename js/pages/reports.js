// Reports Page
import { payrollService } from '../services/supabaseService.js';
import { formatter } from '../utils/formatter.js';
import { Toast } from '../utils/toast.js';

export async function loadReports() {
    const content = document.getElementById('mainContent');
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    
    content.innerHTML = `
        <div class="page-header">
            <h1><i class="fas fa-chart-bar"></i> Raporlar</h1>
            <div class="page-actions">
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
                    <i class="fas fa-file-excel"></i> Excel'e Aktar
                </button>
                <button class="btn btn-info" onclick="window.printPayroll()" style="display:none;" id="printBtn">
                    <i class="fas fa-print"></i> Yazdır
                </button>
            </div>
        </div>
        
        <div class="page-content">
            <div id="payrollReport" class="report-container">
                <div class="info-message">
                    <i class="fas fa-info-circle"></i>
                    <p>Bordro raporu oluşturmak için ay ve yıl seçip "Bordro Oluştur" butonuna tıklayın.</p>
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
};