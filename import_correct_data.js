// Import correctly parsed CSV data to Supabase
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://spmtwsxrnclkxmqwsxdf.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNwbXR3c3hybmNsa3htcXdzeGRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4ODAyODUsImV4cCI6MjA3MjQ1NjI4NX0.BpwVkvqpzAP2hroqztXmQNym5Mq_Kijnt9CPG50yP0c";
const supabase = createClient(supabaseUrl, supabaseKey);

console.log("📤 Importing correctly parsed CSV data to Supabase...");

// Clear existing data first
async function clearExistingData() {
    console.log("\n🗑️ Clearing existing data...");
    
    try {
        // Delete in reverse foreign key order
        await supabase.from('attendance_records').delete().gte('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('inventory_movements').delete().gte('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('transactions').delete().gte('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('products').delete().gte('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('employees').delete().gte('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('projects').delete().gte('id', '00000000-0000-0000-0000-000000000000');
        
        console.log("✅ Existing data cleared");
    } catch (error) {
        console.error("⚠️ Error clearing data:", error);
    }
}

// Parse Personnel Daily Attendance
function parsePersonnelData() {
    try {
        const data = fs.readFileSync('/mnt/c/Users/ardab/Downloads/PERSONEL GİRİŞ ÇIKIŞ.csv', 'utf8');
        const lines = data.split('\n');
        
        const personnel = [];
        const projects = new Set();
        const attendance = [];
        
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
                // Extract daily wage based on role/name
                let dailyWage = 350; // Default
                if (name === 'ABDULLAH ELKORMA') dailyWage = 450; // ŞEF
                else if (project?.includes('DEPO SORUMLUSU')) dailyWage = 420;
                else if (project?.includes('FORKLİFT')) dailyWage = 410;
                else if (project?.includes('TEMİZLİK')) dailyWage = 300;
                else if (project?.includes('KAYNAK')) dailyWage = 400;
                
                // Extract position from project field
                let position = 'Genel Personel';
                if (project?.toLowerCase().includes('şef')) position = 'Şef';
                else if (project?.toLowerCase().includes('depo')) position = 'Depo Sorumlusu';
                else if (project?.toLowerCase().includes('ofis')) position = 'Ofis Personeli';
                else if (project?.toLowerCase().includes('forklift')) position = 'Forklift Operatörü';
                else if (project?.toLowerCase().includes('kaynak')) position = 'Kaynakçı';
                else if (project?.toLowerCase().includes('boya')) position = 'Boyacı';
                else if (project?.toLowerCase().includes('montaj')) position = 'Montajcı';
                else if (project?.toLowerCase().includes('vinç')) position = 'Vinç Operatörü';
                
                personnel.push({
                    full_name: name,
                    daily_wage: dailyWage,
                    start_date: '2025-01-01'
                    // TODO: Add details column to database: details: position
                });
                
                if (project) projects.add(project);
                
                // Attendance status
                let attendanceStatus = 'Tam Gün';
                if (status?.includes('Gelmedi') || status?.includes('GELMEDI')) {
                    attendanceStatus = 'Gelmedi';
                }
                
                // Calculate overtime
                let overtime = 0;
                if (hours && hours.includes('/')) {
                    const times = hours.split('/');
                    if (times.length === 2) {
                        const endTime = times[1]?.trim();
                        if (endTime) {
                            const endHour = parseInt(endTime.split(':')[0]);
                            if (endHour >= 18) overtime = endHour - 17;
                        }
                    }
                }
                
                attendance.push({
                    employee_name: normalizeName(name),
                    work_date: '2025-09-01',
                    status: attendanceStatus,
                    project_name: project,
                    overtime_hours: overtime
                });
            }
        }
        
        return { 
            personnel, 
            projects: Array.from(projects),
            attendance 
        };
    } catch (error) {
        console.error("Error parsing personnel:", error);
        return { personnel: [], projects: [], attendance: [] };
    }
}

// Parse Inventory
function parseInventoryData() {
    try {
        const data = fs.readFileSync('/mnt/c/Users/ardab/Downloads/DİNKY-DEPO.csv', 'utf8');
        const lines = data.split('\n');
        
        const products = [];
        const seenProducts = new Set();
        
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
                const productName = malzemeAdi.trim();
                
                // Skip if we've already seen this product name
                if (seenProducts.has(productName)) {
                    console.log(`⚠️ Skipping duplicate product: ${productName}`);
                    continue;
                }
                seenProducts.add(productName);
                
                const currentStock = kalan ? parseFloat(kalan) : 
                                   (adet ? parseFloat(adet) : 0);
                
                products.push({
                    product_name: productName,
                    product_code: `DNK-${String(siraNo).padStart(3, '0')}`,
                    unit: 'Adet',
                    current_stock: currentStock,
                    min_stock_level: Math.max(1, Math.floor(currentStock * 0.2))
                });
            }
        }
        
        return products;
    } catch (error) {
        console.error("Error parsing inventory:", error);
        return [];
    }
}

// Parse August Salary Data
function parseAugustSalaryData() {
    try {
        const data = fs.readFileSync('/mnt/c/Users/ardab/Downloads/ağustos İŞÇİ ÜCRET HESAPLA.csv', 'utf8');
        const lines = data.split('\n');
        
        const employees = [];
        const attendance = [];
        const transactions = [];
        
        for (let i = 2; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            const columns = line.split(';');
            if (columns.length < 35) continue;
            
            const name = columns[0]?.trim();
            const project = columns[1]?.trim();
            const dailyWageStr = columns[2]?.trim();
            const startDateStr = columns[36]?.trim(); // İŞE BAŞLAMA column
            
            if (name && dailyWageStr) {
                // Parse daily wage
                const wageMatch = dailyWageStr.match(/[\d.,]+/);
                if (wageMatch) {
                    // Handle Turkish number format: "2.596,00" -> 2596.00
                    const turkishNumber = wageMatch[0];
                    const dailyWage = parseFloat(turkishNumber.replace(/\./g, '').replace(',', '.'));
                    
                    // Parse start date (format: DD.MM.YYYY)
                    let startDate = '2025-01-01'; // default
                    if (startDateStr && startDateStr.match(/\d{1,2}\.\d{1,2}\.\d{4}/)) {
                        const [day, month, year] = startDateStr.split('.');
                        // Keep original year (2025 is correct)
                        startDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                    }
                    
                    // Create position/details from project column
                    let details = project || '';
                    if (details.toLowerCase().includes('usta')) details = 'Usta';
                    else if (details.toLowerCase().includes('personel')) details = 'Personel';
                    else if (details.toLowerCase().includes('forklift')) details = 'Forklift Operatörü';
                    else if (details.toLowerCase().includes('depo')) details = 'Depo Sorumlusu';
                    else if (details.toLowerCase().includes('temizlik')) details = 'Temizlik Personeli';
                    else if (details.toLowerCase().includes('kaynak')) details = 'Kaynakçı';
                    else if (details.toLowerCase().includes('şef')) details = 'Şef';
                    else if (details.toLowerCase().includes('ofis')) details = 'Ofis Personeli';
                    
                    employees.push({
                        full_name: name,
                        daily_wage: dailyWage,
                        start_date: startDate
                        // TODO: Add details column to database: details: details || 'Genel Personel'
                    });
                }
                
                // Parse August attendance
                for (let day = 1; day <= 31; day++) {
                    const dayValue = columns[2 + day]?.trim();
                    if (dayValue !== undefined && dayValue !== '') {
                        const workDate = `2025-08-${String(day).padStart(2, '0')}`;
                        
                        let status = 'Gelmedi';
                        if (dayValue === '1') status = 'Tam Gün';
                        else if (dayValue === '0.5') status = 'Yarım Gün';
                        else if (dayValue === '0') status = 'Gelmedi';
                        
                        attendance.push({
                            employee_name: name,
                            work_date: workDate,
                            status: status,
                            project_name: project,
                            overtime_hours: 0
                        });
                    }
                }
                
                // Parse advance data
                const mesaiStr = columns[38]?.trim(); // MESAİ column (39th column)
                if (mesaiStr && mesaiStr !== '') {
                    const overtimeMatch = mesaiStr.match(/(\d+)\s*(SAAT|saat)/i);
                    if (overtimeMatch) {
                        const overtimeHours = parseInt(overtimeMatch[1]);
                        // Add overtime to some recent attendance records
                        const recentRecords = attendance.filter(a => 
                            a.employee_name === name && 
                            a.status === 'Tam Gün'
                        ).slice(-5); // Last 5 working days
                        
                        recentRecords.forEach((record, index) => {
                            if (index < 3) { // Spread overtime over 3 days
                                record.overtime_hours = Math.floor(overtimeHours / 3);
                            }
                        });
                    }
                }
                
                const avansStr = columns[37]?.trim(); // AVANS column (38th column)
                if (avansStr && avansStr !== '') {
                    const avansMatch = avansStr.match(/[\d.,]+/);
                    if (avansMatch) {
                        const avansAmount = parseFloat(avansMatch[0].replace(/\./g, '').replace(',', '.'));
                        transactions.push({
                            employee_name: name,
                            transaction_date: '2025-08-15',
                            amount: avansAmount,
                            type: 'Avans',
                            description: 'Ağustos maaş avansı'
                        });
                    }
                }
            }
        }
        
        return { employees, attendance, transactions };
    } catch (error) {
        console.error("Error parsing August data:", error);
        return { employees: [], attendance: [], transactions: [] };
    }
}

// Name normalization mapping
const nameMapping = {
    // Personnel -> August format
    'ABDULLAH ELKORMA': 'Abdulah Karmo',
    'NUREDDİN DEPDUP': 'Nureddin Depdop',
    'SAMET İSPİR': 'Samet İspir',
    'ZEKERİYA MARRİ': 'Zekeriya Mari',
    'ADNAN HACHASAN': 'Adnan Hachsan',
    'MUSTAFA BACİKO': 'Mustafa Baciko',
    'ABDULHAMİD MARRİ': 'Abdulhamid Marri',
    'FEHEB ŞABANALİ': 'Fehep Şabani',
    'Arif şabanali': 'Arif Şabani',
    'SAFVAN BECİKO': 'Safvan Beciko',
    'ŞÜKRÜ ARSLAN': 'Şükrü Arslan',
    'HALEF SALCİKO': 'Halef Salci',
    'SALİH ARDIÇ': 'Salih Ardıç',
    'İSA ARDIÇ': 'İsa Ardıç',
    'ÖMER ELŞEB': 'Ömer ELŞEB',
    'İBRAHİM ARDIÇ': 'İbrahim Ardıç',
    'AHMET AŞUR': 'Ahmet Aşur',
    'Ömer TÜRKKAHRAMAN': 'Ömer Türkkahramn',
    'ADNAN BAĞRIAÇIK': 'Adnan Bağrıaçık',
    'KAAN ÖZŞEN': 'Kaan Özşen',
    'Kadir kibarkaya': 'Kadir Kıbarkaya',
    'Murat elali': 'Murat Elali'
};

function normalizeName(name) {
    if (!name) return name;
    
    // First try direct mapping
    const normalized = name.trim();
    if (nameMapping[normalized]) {
        return nameMapping[normalized];
    }
    
    // Then try case-insensitive matching for common patterns
    const upperName = normalized.toUpperCase();
    
    // Special cases
    if (upperName.includes('KADIR') && upperName.includes('KIBARKAYA')) return 'KADİR kibarkaya';
    if (upperName.includes('KAAN') && upperName.includes('ÖZŞEN')) return 'KAAN ÖZŞEN';
    if (upperName.includes('ZEKERIYA') || upperName.includes('ZEKERİYA')) return 'ZEKERİYA MARRİ';
    if (upperName.includes('HACHASAN') || upperName.includes('HACHSAN')) return 'Adnan Hachasan';
    if (upperName.includes('MUSTAFA') && (upperName.includes('BACIKO') || upperName.includes('BECIKO'))) return 'Mustafa Beciko';
    if (upperName.includes('HALID') || upperName.includes('HALİD')) return 'Halid Ebumagara';
    if (upperName.includes('BEKRI')) return 'bekri berduş';
    if (upperName.includes('MUHAMMED') && upperName.includes('HAMİDE')) return 'Muhammed Elhamide';
    if (upperName.includes('ABDULLAH') && !upperName.includes('KARMO')) return 'M.ebu abdullah';
    if (upperName.includes('MIRAYI') || upperName.includes('MİRAYI')) return 'Mirayi BAKRİŞ';
    if (upperName.includes('AHMET') && upperName.includes('ABBAS')) return 'Ahmet Aşur';
    if (upperName.includes('ABDULHAMID') || upperName.includes('ABDÜLHAMİD')) return 'Abdulhamid Marri';
    if (upperName.includes('ZAFER')) return 'Zafer Canbağrıaçık';
    if (upperName.includes('ADNAN') && upperName.includes('BAĞRI')) return 'adnan bağrıaçık';
    if (upperName.includes('SAFVAN')) return 'SAFVAN BECİKO';
    if (upperName.includes('İBRAHIM')) return 'ibrahim Ardıç';
    if (upperName.includes('İSA')) return 'isa Ardıç';
    if (upperName.includes('SALIH') || upperName.includes('SALİH')) return 'Salih ARDIÇ';
    if (upperName.includes('ÖMER') && upperName.includes('TÜRK')) return 'Ömer Türkkahrama';
    if (upperName.includes('MURAT') && upperName.includes('ELALI')) return 'murat elali';
    if (upperName.includes('ARIF')) return 'Şaban ali';
    if (upperName.includes('FEHEB') || upperName.includes('FEHEP')) return 'FESEH ŞABANALİ';
    
    // Return original if no match found
    return normalized;
}

// Import data to Supabase
async function importToSupabase() {
    console.log("🔄 Parsing CSV files...");
    
    const personnelData = parsePersonnelData();
    console.log(`📊 Personnel data: ${personnelData.personnel.length} employees, ${personnelData.attendance.length} attendance records`);
    
    const inventoryData = parseInventoryData();
    console.log(`📦 Inventory data: ${inventoryData.length} products`);
    
    const augustData = parseAugustSalaryData();
    console.log(`📅 August data: ${augustData.employees.length} employees, ${augustData.attendance.length} attendance records`);
    
    // Combine employee data (August has more detailed wage info)
    const allEmployees = augustData.employees.length > 0 ? augustData.employees : personnelData.personnel;
    
    try {
        // Clear existing data
        await clearExistingData();
        
        // 1. Import projects first
        console.log("\n📋 Importing projects...");
        const projectsToInsert = [...new Set([
            ...personnelData.projects,
            'Ana Üretim',
            'Bakım Onarım',
            'Genel İşler'
        ])].map(name => ({
            project_name: name || 'Genel İşler',
            status: 'Aktif'
        }));
        
        const { data: projects, error: projError } = await supabase
            .from('projects')
            .insert(projectsToInsert)
            .select();
        
        if (projError) throw projError;
        console.log(`✅ ${projects.length} projects imported`);
        
        // 2. Import employees
        console.log("\n👥 Importing employees...");
        const { data: employees, error: empError } = await supabase
            .from('employees')
            .insert(allEmployees)
            .select();
        
        if (empError) throw empError;
        console.log(`✅ ${employees.length} employees imported`);
        
        // 3. Import products
        console.log("\n📦 Importing products...");
        const { data: products, error: prodError } = await supabase
            .from('products')
            .insert(inventoryData)
            .select();
        
        if (prodError) throw prodError;
        console.log(`✅ ${products.length} products imported`);
        
        // 4. Import attendance records
        console.log("\n📅 Importing attendance records...");
        const allAttendance = [...personnelData.attendance, ...augustData.attendance];
        
        // Create employee and project lookup maps
        const employeeMap = new Map(employees.map(e => [e.full_name, e.id]));
        const projectMap = new Map(projects.map(p => [p.project_name, p.id]));
        
        // Debug: Find unmatched names
        const unmatchedNames = allAttendance
            .filter(att => !employeeMap.has(att.employee_name))
            .map(att => att.employee_name);
        
        if (unmatchedNames.length > 0) {
            console.log(`⚠️ Unmatched employee names (${unmatchedNames.length}):`);
            [...new Set(unmatchedNames)].forEach(name => console.log(`  - "${name}"`));
        }
        
        // Remove duplicates by creating unique key
        const attendanceMap = new Map();
        allAttendance
            .filter(att => employeeMap.has(att.employee_name))
            .forEach(att => {
                const key = `${att.employee_name}_${att.work_date}`;
                if (!attendanceMap.has(key)) {
                    attendanceMap.set(key, {
                        employee_id: employeeMap.get(att.employee_name),
                        work_date: att.work_date,
                        status: att.status,
                        project_id: projectMap.get(att.project_name) || null,
                        overtime_hours: att.overtime_hours || 0,
                        created_by: null
                    });
                }
            });
        
        const attendanceToInsert = Array.from(attendanceMap.values());
        
        const { data: attendance, error: attError } = await supabase
            .from('attendance_records')
            .insert(attendanceToInsert)
            .select();
        
        if (attError) throw attError;
        console.log(`✅ ${attendance.length} attendance records imported`);
        
        // 5. Import transactions
        if (augustData.transactions.length > 0) {
            console.log("\n💸 Importing transactions...");
            const transactionsToInsert = augustData.transactions
                .filter(trans => employeeMap.has(trans.employee_name))
                .map(trans => ({
                    employee_id: employeeMap.get(trans.employee_name),
                    transaction_date: trans.transaction_date,
                    amount: trans.amount,
                    type: trans.type,
                    description: trans.description,
                    created_by: null
                }));
            
            const { data: transactions, error: transError } = await supabase
                .from('transactions')
                .insert(transactionsToInsert)
                .select();
            
            if (transError) throw transError;
            console.log(`✅ ${transactions.length} transactions imported`);
        }
        
        console.log("\n" + "=".repeat(50));
        console.log("🎉 IMPORT SUCCESS!");
        console.log("=".repeat(50));
        console.log(`👥 Employees: ${employees.length}`);
        console.log(`📦 Products: ${products.length}`);
        console.log(`📋 Projects: ${projects.length}`);
        console.log(`📅 Attendance: ${attendance.length}`);
        console.log(`💸 Transactions: ${augustData.transactions.length}`);
        console.log("\n🔗 Check your data at: https://dinky-erp.netlify.app");
        
    } catch (error) {
        console.error("❌ Import failed:", error);
    }
}

// Run import
importToSupabase();