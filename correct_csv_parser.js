// Correct CSV Parser - Based on actual file analysis
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://spmtwsxrnclkxmqwsxdf.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNwbXR3c3hybmNsa3htcXdzeGRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4ODAyODUsImV4cCI6MjA3MjQ1NjI4NX0.BpwVkvqpzAP2hroqztXmQNym5Mq_Kijnt9CPG50yP0c";
const supabase = createClient(supabaseUrl, supabaseKey);

console.log("📊 Parsing CSV files with correct structure...");

// 1. Parse Personnel Daily Attendance (PERSONEL GİRİŞ ÇIKIŞ.csv)
async function parsePersonnelAttendance() {
    console.log("\n👥 Parsing PERSONEL GİRİŞ ÇIKIŞ.csv...");
    
    try {
        const data = fs.readFileSync('/mnt/c/Users/ardab/Downloads/PERSONEL GİRİŞ ÇIKIŞ.csv', 'utf8');
        const lines = data.split('\n');
        
        const personnel = [];
        const attendance = [];
        
        // Skip header lines, start from line 3
        for (let i = 2; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            const columns = line.split(';');
            if (columns.length < 3) continue;
            
            const name = columns[0]?.trim();
            const project = columns[1]?.trim();
            const status = columns[2]?.trim();
            const hours = columns[3]?.trim();
            
            if (name && name !== 'PERSONEL') {
                // Extract personnel info
                personnel.push({
                    full_name: name,
                    project: project,
                    daily_wage: getDailyWageEstimate(name, project) // We'll estimate from other files
                });
                
                // Extract attendance for 01.09.2025
                let attendanceStatus;
                if (status.includes('GELDİ') || status.includes('Geldi')) {
                    attendanceStatus = 'Tam Gün';
                } else if (status.includes('Gelmedi') || status.includes('GELMEDI')) {
                    attendanceStatus = 'Gelmedi';
                } else {
                    attendanceStatus = 'Tam Gün';
                }
                
                // Calculate overtime from hours
                let overtime = 0;
                if (hours && hours.includes('/')) {
                    const times = hours.split('/');
                    if (times.length === 2) {
                        const startTime = times[0]?.trim();
                        const endTime = times[1]?.trim();
                        
                        if (startTime.includes('08:00') && endTime) {
                            const endHour = parseInt(endTime.split(':')[0]);
                            if (endHour > 17) {
                                overtime = endHour - 17; // After 17:00 is overtime
                            }
                        }
                    }
                }
                
                attendance.push({
                    employee_name: name,
                    work_date: '2024-09-01', // Convert to 2024 for consistency
                    status: attendanceStatus,
                    project: project,
                    overtime_hours: overtime
                });
            }
        }
        
        console.log(`✅ Parsed ${personnel.length} personnel records`);
        console.log(`✅ Parsed ${attendance.length} attendance records for 2024-09-01`);
        
        return { personnel, attendance };
        
    } catch (error) {
        console.error("❌ Error parsing personnel attendance:", error);
        return { personnel: [], attendance: [] };
    }
}

// 2. Parse Inventory Data (DİNKY-DEPO.csv)
async function parseInventoryData() {
    console.log("\n📦 Parsing DİNKY-DEPO.csv...");
    
    try {
        const data = fs.readFileSync('/mnt/c/Users/ardab/Downloads/DİNKY-DEPO.csv', 'utf8');
        const lines = data.split('\n');
        
        const products = [];
        
        // Skip header lines, start from line 3
        for (let i = 2; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            const columns = line.split(';');
            if (columns.length < 5) continue;
            
            const siraNo = columns[0]?.trim();
            const malzemeAdi = columns[1]?.trim();
            const adet = columns[2]?.trim();
            const cikis = columns[3]?.trim();
            const kalan = columns[4]?.trim();
            
            if (siraNo && malzemeAdi && !isNaN(siraNo)) {
                const currentStock = kalan ? parseFloat(kalan) : 
                                   adet ? parseFloat(adet) : 0;
                
                products.push({
                    product_name: malzemeAdi,
                    product_code: `DINKY-${String(siraNo).padStart(3, '0')}`,
                    unit: 'Adet',
                    current_stock: currentStock,
                    min_stock_level: Math.max(1, Math.floor(currentStock * 0.1)), // 10% of current stock
                    initial_stock: adet ? parseFloat(adet) : currentStock,
                    outgoing: cikis ? parseFloat(cikis) : 0
                });
            }
        }
        
        console.log(`✅ Parsed ${products.length} inventory items`);
        return products;
        
    } catch (error) {
        console.error("❌ Error parsing inventory:", error);
        return [];
    }
}

// 3. Parse Monthly Salary Data (ağustos İŞÇİ ÜCRET HESAPLA.csv)
async function parseMonthlySalaryData() {
    console.log("\n💰 Parsing ağustos İŞÇİ ÜCRET HESAPLA.csv...");
    
    try {
        const data = fs.readFileSync('/mnt/c/Users/ardab/Downloads/ağustos İŞÇİ ÜCRET HESAPLA.csv', 'utf8');
        const lines = data.split('\n');
        
        const employees = [];
        const attendanceRecords = [];
        const transactions = [];
        
        // Skip header lines, start from line 3
        for (let i = 2; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            const columns = line.split(';');
            if (columns.length < 35) continue; // Need at least name + daily wage + 31 days
            
            const name = columns[0]?.trim();
            const project = columns[1]?.trim();
            const dailyWageStr = columns[2]?.trim();
            
            if (name && dailyWageStr) {
                // Parse daily wage (remove ₺ and . separators)
                const dailyWage = parseFloat(dailyWageStr.replace(/[₺.,]/g, '').replace(',', '.'));
                
                employees.push({
                    full_name: name,
                    daily_wage: dailyWage / 100, // Convert from cents to TL
                    start_date: '2024-01-01'
                });
                
                // Parse daily attendance for August 2024
                for (let day = 1; day <= 31; day++) {
                    const dayValue = columns[2 + day]?.trim(); // Skip name, project, wage columns
                    if (dayValue) {
                        const workDate = `2024-08-${String(day).padStart(2, '0')}`;
                        
                        let status = 'Gelmedi';
                        let overtime = 0;
                        
                        if (dayValue === '1') {
                            status = 'Tam Gün';
                        } else if (dayValue === '0.5') {
                            status = 'Yarım Gün';
                        } else if (dayValue === '0') {
                            status = 'Gelmedi';
                        }
                        
                        attendanceRecords.push({
                            employee_name: name,
                            work_date: workDate,
                            status: status,
                            project: project,
                            overtime_hours: overtime
                        });
                    }
                }
                
                // Parse advance/deduction info
                const avansColumn = columns[37]?.trim(); // AVANS column
                const mesaiColumn = columns[38]?.trim(); // MESAİ column
                
                if (avansColumn && avansColumn !== '') {
                    const avansAmount = parseFloat(avansColumn.replace(/[₺.,TL\s]/g, ''));
                    if (!isNaN(avansAmount) && avansAmount > 0) {
                        transactions.push({
                            employee_name: name,
                            transaction_date: '2024-08-01',
                            amount: avansAmount,
                            type: 'Avans',
                            description: 'Ağustos maaş avansı'
                        });
                    }
                }
            }
        }
        
        console.log(`✅ Parsed ${employees.length} employee salary records`);
        console.log(`✅ Parsed ${attendanceRecords.length} attendance records for August 2024`);
        console.log(`✅ Parsed ${transactions.length} advance/deduction records`);
        
        return { employees, attendanceRecords, transactions };
        
    } catch (error) {
        console.error("❌ Error parsing salary data:", error);
        return { employees: [], attendanceRecords: [], transactions: [] };
    }
}

// Helper function to estimate daily wage
function getDailyWageEstimate(name, project) {
    const wageEstimates = {
        'ABDULLAH ELKORMA': 450, // ŞEF
        'KAAN ÖZŞEN': 420, // DEPO SORUMLUSU  
        'ADNAN HACHASAN': 400, // KAYNAK
        'Mİrayi BAKRİŞ': 410, // FORKLİFT
        'ÖMER ELŞEB': 300 // TEMİZLİK
    };
    
    if (wageEstimates[name]) {
        return wageEstimates[name];
    }
    
    // Estimate based on project
    if (project?.includes('USTA') || project?.includes('ŞEF')) {
        return 450;
    } else if (project?.includes('KAYNAK') || project?.includes('DEPO')) {
        return 400;
    } else if (project?.includes('SORUMLUSU')) {
        return 420;
    } else {
        return 350; // Default worker wage
    }
}

// Main parsing function
async function parseAllCSVFiles() {
    console.log("🚀 Starting correct CSV parsing...\n");
    
    const personnelData = await parsePersonnelAttendance();
    const inventoryData = await parseInventoryData();
    const salaryData = await parseMonthlySalaryData();
    
    console.log("\n" + "=".repeat(50));
    console.log("📊 PARSING SUMMARY");
    console.log("=".repeat(50));
    
    console.log(`👥 Personnel: ${personnelData.personnel.length} records`);
    console.log(`📦 Inventory: ${inventoryData.length} products`);
    console.log(`💰 Employees: ${salaryData.employees.length} with wages`);
    console.log(`📅 Attendance: ${salaryData.attendanceRecords.length + personnelData.attendance.length} total records`);
    console.log(`💸 Transactions: ${salaryData.transactions.length} advances/deductions`);
    
    return {
        personnel: personnelData.personnel,
        inventory: inventoryData,
        employees: salaryData.employees,
        attendance: [...personnelData.attendance, ...salaryData.attendanceRecords],
        transactions: salaryData.transactions
    };
}

// Export for use
export { parseAllCSVFiles };

// If run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    parseAllCSVFiles();
}