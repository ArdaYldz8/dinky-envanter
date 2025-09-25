// Excel Export Utilities
import { formatter } from './formatter.js';

export class ExcelExporter {
    /**
     * Export stock report to Excel
     */
    static async exportStockReport(products, fileName = 'Stok_Raporu') {
        if (!products || products.length === 0) {
            throw new Error('Stok verileri bulunamadı');
        }

        // Prepare data for Excel
        const data = products.map((product, index) => ({
            'Sıra': index + 1,
            'Ürün Adı': product.product_name || '',
            'Kategori': product.category || '',
            'Mevcut Stok': product.current_stock || 0,
            'Birim': product.unit || '',
            'Min. Seviye': product.min_stock_level || 0,
            'Birim Fiyat': product.unit_price || 0,
            'Toplam Değer': (product.current_stock || 0) * (product.unit_price || 0),
            'Durum': (product.current_stock || 0) <= (product.min_stock_level || 0) ? 'KRİTİK' : 'NORMAL',
            'Son Güncelleme': product.updated_at ? new Date(product.updated_at).toLocaleDateString('tr-TR') : ''
        }));

        // Create workbook and worksheet
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(data);

        // Set column widths
        const colWidths = [
            { wch: 8 },   // Sıra
            { wch: 30 },  // Ürün Adı
            { wch: 15 },  // Kategori
            { wch: 12 },  // Mevcut Stok
            { wch: 8 },   // Birim
            { wch: 12 },  // Min. Seviye
            { wch: 12 },  // Birim Fiyat
            { wch: 15 },  // Toplam Değer
            { wch: 10 },  // Durum
            { wch: 15 }   // Son Güncelleme
        ];
        ws['!cols'] = colWidths;

        // Style header row
        const range = XLSX.utils.decode_range(ws['!ref']);
        for (let col = range.s.c; col <= range.e.c; col++) {
            const cellAddr = XLSX.utils.encode_cell({ r: 0, c: col });
            if (!ws[cellAddr]) continue;
            ws[cellAddr].s = {
                font: { bold: true },
                fill: { fgColor: { rgb: "E3F2FD" } },
                alignment: { horizontal: "center" }
            };
        }

        // Add title row
        XLSX.utils.sheet_add_aoa(ws, [[`DİNKY METAL - STOK RAPORU (${new Date().toLocaleDateString('tr-TR')})`]], { origin: 'A1' });
        XLSX.utils.sheet_add_json(ws, data, { origin: 'A3' });

        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(wb, ws, 'Stok Raporu');

        // Download file
        const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        XLSX.writeFile(wb, `${fileName}_${timestamp}.xlsx`);
    }

    /**
     * Export attendance report to Excel
     */
    static async exportAttendanceReport(attendanceData, startDate, endDate, fileName = 'Devam_Raporu') {
        if (!attendanceData || attendanceData.length === 0) {
            throw new Error('Devam verileri bulunamadı');
        }

        // Group by employee
        const employeeMap = new Map();
        attendanceData.forEach(record => {
            const empId = record.employee_id;
            if (!employeeMap.has(empId)) {
                employeeMap.set(empId, {
                    name: record.employees?.full_name || 'Bilinmeyen',
                    records: []
                });
            }
            employeeMap.get(empId).records.push(record);
        });

        // Prepare data
        const data = [];
        employeeMap.forEach((empData, empId) => {
            const totalDays = empData.records.length;
            const presentDays = empData.records.filter(r => r.status === 'Tam Gün' || r.status === 'Yarım Gün').length;
            const absentDays = empData.records.filter(r => r.status === 'Gelmedi').length;
            const totalHours = empData.records.reduce((sum, r) => sum + (parseFloat(r.total_hours) || 0), 0);
            const overtimeHours = empData.records.reduce((sum, r) => sum + (parseFloat(r.overtime_hours) || 0), 0);

            data.push({
                'Personel Adı': empData.name,
                'Toplam Gün': totalDays,
                'Devam Eden Gün': presentDays,
                'Devam Etmeyen Gün': absentDays,
                'Devam Oranı (%)': totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0,
                'Toplam Saat': totalHours.toFixed(1),
                'Mesai Saati': overtimeHours.toFixed(1),
                'Ortalama Günlük Saat': presentDays > 0 ? (totalHours / presentDays).toFixed(1) : 0
            });
        });

        // Create workbook
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(data);

        // Set column widths
        const colWidths = [
            { wch: 25 },  // Personel Adı
            { wch: 12 },  // Toplam Gün
            { wch: 15 },  // Devam Eden Gün
            { wch: 18 },  // Devam Etmeyen Gün
            { wch: 15 },  // Devam Oranı
            { wch: 12 },  // Toplam Saat
            { wch: 12 },  // Mesai Saati
            { wch: 20 }   // Ortalama Günlük Saat
        ];
        ws['!cols'] = colWidths;

        // Add title
        const period = `${startDate} - ${endDate}`;
        XLSX.utils.sheet_add_aoa(ws, [[`DİNKY METAL - DEVAM RAPORU (${period})`]], { origin: 'A1' });
        XLSX.utils.sheet_add_json(ws, data, { origin: 'A3' });

        XLSX.utils.book_append_sheet(wb, ws, 'Devam Raporu');

        // Download
        const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        XLSX.writeFile(wb, `${fileName}_${timestamp}.xlsx`);
    }

    /**
     * Export financial summary to Excel
     */
    static async exportFinancialSummary(financialData, period, fileName = 'Mali_Ozet') {
        const data = [
            { 'Kategori': 'Toplam Stok Değeri', 'Tutar (TL)': financialData.totalStockValue || 0, 'Açıklama': 'Depodaki toplam ürün değeri' },
            { 'Kategori': 'Tahmini Aylık Gelir', 'Tutar (TL)': financialData.estimatedIncome || 0, 'Açıklama': 'Stok çıkışlarından hesaplanan gelir' },
            { 'Kategori': 'Tahmini Aylık Gider', 'Tutar (TL)': financialData.estimatedExpense || 0, 'Açıklama': 'Stok girişlerinden hesaplanan gider' },
            { 'Kategori': 'Net Tahmini Kar', 'Tutar (TL)': (financialData.estimatedIncome || 0) - (financialData.estimatedExpense || 0), 'Açıklama': 'Gelir - Gider farkı' }
        ];

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(data);

        // Set column widths
        ws['!cols'] = [
            { wch: 25 },  // Kategori
            { wch: 15 },  // Tutar
            { wch: 40 }   // Açıklama
        ];

        // Add title
        XLSX.utils.sheet_add_aoa(ws, [[`DİNKY METAL - MALİ ÖZET (${period})`]], { origin: 'A1' });
        XLSX.utils.sheet_add_json(ws, data, { origin: 'A3' });

        XLSX.utils.book_append_sheet(wb, ws, 'Mali Özet');

        // Download
        const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        XLSX.writeFile(wb, `${fileName}_${timestamp}.xlsx`);
    }

    /**
     * Export inventory movements to Excel
     */
    static async exportInventoryMovements(movements, period, fileName = 'Stok_Hareketleri') {
        if (!movements || movements.length === 0) {
            throw new Error('Stok hareketi verisi bulunamadı');
        }

        const data = movements.map((movement, index) => ({
            'Sıra': index + 1,
            'Tarih': new Date(movement.movement_date).toLocaleDateString('tr-TR'),
            'Ürün': movement.products?.product_name || 'Bilinmeyen',
            'Hareket Tipi': movement.type,
            'Miktar': movement.quantity,
            'Birim': movement.products?.unit || '',
            'Birim Fiyat': movement.products?.unit_price || 0,
            'Toplam Değer': (movement.quantity || 0) * (movement.products?.unit_price || 0),
            'Açıklama': movement.notes || ''
        }));

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(data);

        // Set column widths
        ws['!cols'] = [
            { wch: 8 },   // Sıra
            { wch: 12 },  // Tarih
            { wch: 25 },  // Ürün
            { wch: 12 },  // Hareket Tipi
            { wch: 10 },  // Miktar
            { wch: 8 },   // Birim
            { wch: 12 },  // Birim Fiyat
            { wch: 15 },  // Toplam Değer
            { wch: 30 }   // Açıklama
        ];

        // Add title
        XLSX.utils.sheet_add_aoa(ws, [[`DİNKY METAL - STOK HAREKETLERİ (${period})`]], { origin: 'A1' });
        XLSX.utils.sheet_add_json(ws, data, { origin: 'A3' });

        XLSX.utils.book_append_sheet(wb, ws, 'Stok Hareketleri');

        // Download
        const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        XLSX.writeFile(wb, `${fileName}_${timestamp}.xlsx`);
    }
}