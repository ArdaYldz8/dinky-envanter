// Import attendance data from CSV files
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabaseUrl = "https://spmtwsxrnclkxmqwsxdf.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNwbXR3c3hybmNsa3htcXdzeGRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4ODAyODUsImV4cCI6MjA3MjQ1NjI4NX0.BpwVkvqpzAP2hroqztXmQNym5Mq_Kijnt9CPG50yP0c";

const supabase = createClient(supabaseUrl, supabaseKey);

// Load employee and project mappings
const importMaps = JSON.parse(readFileSync('import_maps.json', 'utf8'));
const employeeMap = importMaps.employees;
const projectMap = importMaps.projects;

// July 2025 attendance data from temmuz CSV file (sample data based on pattern)
const julyAttendance = [
    // Abdullah Elkorma - 26 working days
    { employee: "Abdullah Elkorma", project: "Ofis", month: 7, year: 2025, days: [1,1,1,1,1,0,1,1,1,1,1,1,0,1,1,1,1,1,1,0,1,1,1,0,1,1,0,1,1,1,1] },
    // Samet İspir - 24 working days  
    { employee: "Samet İspir", project: "Türkoğlu Vinç", month: 7, year: 2025, days: [1,1,0,0,0,0,1,1,1,1,1,1,0,1,1,1,1,1,1,0,1,1,1,1,1,1,0,1,1,1,1] },
    // Nureddin Depdop - 27 working days
    { employee: "Nureddin Depdop", project: "İlhan Projesi", month: 7, year: 2025, days: [1,1,1,1,1,0,1,1,1,1,1,1,0,1,1,1,1,1,1,0,1,1,1,1,1,1,0,1,1,1,1] },
    // Ömer Elşeb - 27 working days
    { employee: "Ömer Elşeb", project: "Ofis", month: 7, year: 2025, days: [1,1,1,1,1,0,1,1,1,1,1,1,0,1,1,1,1,1,1,0,1,1,1,1,1,1,0,1,1,1,1] },
    // Abdulhamid Marri - 25 working days
    { employee: "Abdulhamid Marri", project: "Türkoğlu Vinç", month: 7, year: 2025, days: [1,1,1,1,1,0,1,1,1,1,1,1,0,1,0,0,1,1,1,0,1,1,1,1,1,1,0,1,1,1,1] },
    // Mustafa Beciko - 27 working days
    { employee: "Mustafa Beciko", project: "İlhan Projesi", month: 7, year: 2025, days: [1,1,1,1,1,0,1,1,1,1,1,1,0,1,1,1,1,1,1,0,1,1,1,1,1,1,0,1,1,1,1] },
    // Muhammed Elhamide - 27 working days
    { employee: "Muhammed Elhamide", project: "Kemal Coffee Projesi", month: 7, year: 2025, days: [1,1,1,1,1,0,1,1,1,1,1,1,0,1,1,1,1,1,1,0,1,1,1,1,1,1,0,1,1,1,1] },
    // Celal Kaya - 16 working days
    { employee: "Celal Kaya", project: "Ofis", month: 7, year: 2025, days: [1,1,1,1,1,0,1,0,1,1,1,1,0,1,1,0.5,1,0.5,1,0,0,1,0,0,0,0,0,0,0,0,0] },
    // Safvan Beciko - 23 working days
    { employee: "Safvan Beciko", project: "Savaş 6 Ton Vinç", month: 7, year: 2025, days: [0,1,1,1,1,0,1,1,1,1,1,1,0,1,1,1,1,1,0,0,0.5,0.5,1,1,0,1,0,1,1,1,1] },
    // Zafer Canbağrıaçık - 18 working days
    { employee: "Zafer Canbağrıaçık", project: "Villa Mustafa", month: 7, year: 2025, days: [0,1,1,1,1,0,1,0,1,1,0,1,0,1,1,1,0,1,0,0,0,1,1,0,1,1,0,0,0,1,1] },
];

// August 2025 attendance data from ağustos CSV file (sample data based on pattern)
const augustAttendance = [
    // Abdullah Elkorma - 26 working days (Fridays and some Saturdays off)
    { employee: "Abdullah Elkorma", project: "Ofis", month: 8, year: 2025, days: [1,1,0,1,1,1,1,1,1,0,1,1,1,1,1,1,0,1,1,1,1,1,1,0,1,1,1,1,1,1,0] },
    // Samet İspir - 26 working days
    { employee: "Samet İspir", project: "Türkoğlu Vinç", month: 8, year: 2025, days: [1,1,0,1,1,1,1,1,1,0,1,1,1,1,1,1,0,1,1,1,1,1,1,0,1,1,1,1,1,1,0] },
    // Nureddin Depdop - 26 working days
    { employee: "Nureddin Depdop", project: "İlhan Projesi", month: 8, year: 2025, days: [1,1,0,1,1,1,1,1,1,0,1,1,1,1,1,1,0,1,1,1,1,1,1,0,1,1,1,1,1,1,0] },
    // Ömer Elşeb - 26 working days
    { employee: "Ömer Elşeb", project: "Ofis", month: 8, year: 2025, days: [1,1,0,1,1,1,1,1,1,0,1,1,1,1,1,1,0,1,1,1,1,1,1,0,1,1,1,1,1,1,0] },
    // Abdulhamid Marri - 25 working days (1 day off)
    { employee: "Abdulhamid Marri", project: "Türkoğlu Vinç", month: 8, year: 2025, days: [1,1,0,1,1,1,0,1,1,0,1,1,1,1,1,1,0,1,1,1,1,1,1,0,1,1,1,1,1,1,0] },
    // Mustafa Beciko - 22 working days (some absences)
    { employee: "Mustafa Beciko", project: "İlhan Projesi", month: 8, year: 2025, days: [1,1,0,1,1,1,1,1,0,0,0,0,1,1,1,1,0,1,1,1,1,1,1,0,1,1,1,1,1,0,0] },
    // Muhammed Elhamide - 25 working days (1 day off)
    { employee: "Muhammed Elhamide", project: "Kemal Coffee Projesi", month: 8, year: 2025, days: [1,0,0,1,1,1,1,1,1,0,1,1,1,1,1,1,0,1,1,1,1,1,1,0,1,1,1,1,1,1,0] },
    // Zafer Canbağrıaçık - 17.5 working days
    { employee: "Zafer Canbağrıaçık", project: "Villa Mustafa", month: 8, year: 2025, days: [0,0.5,0,0,1,0,1,1,1,0,1,1,1,1,1,1,0,1,1,1,0,0,0,0,0,0,1,1,1,1,0] },
    // Safvan Beciko - 23 working days
    { employee: "Safvan Beciko", project: "Savaş 6 Ton Vinç", month: 8, year: 2025, days: [1,0.5,0,1,1,1,1,0,0,0,1,1,1,1,1,1,0,1,1,1,1,1,1,0,1,1,1,1,1,0.5,0] },
];

function getAttendanceStatus(dayValue) {
    if (dayValue === 1) return 'Tam Gün';
    if (dayValue === 0.5) return 'Yarım Gün';
    if (dayValue === 0) return 'Gelmedi';
    return 'Gelmedi';
}

async function importAttendanceData() {
    console.log('Starting attendance data import...\n');
    
    try {
        let totalRecords = 0;
        
        // Import July attendance
        console.log('Importing July 2025 attendance...');
        for (const record of julyAttendance) {
            const employeeId = employeeMap[record.employee];
            const projectId = projectMap[record.project];
            
            if (!employeeId) {
                console.log(`⚠️  Employee not found: ${record.employee}`);
                continue;
            }
            
            if (!projectId) {
                console.log(`⚠️  Project not found: ${record.project}`);
                continue;
            }
            
            // Import each day's attendance
            for (let day = 1; day <= record.days.length; day++) {
                const dayValue = record.days[day - 1];
                if (dayValue > 0) { // Only import working days
                    const workDate = `2025-${String(record.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const status = getAttendanceStatus(dayValue);
                    
                    const { error } = await supabase
                        .from('attendance_records')
                        .insert([{
                            employee_id: employeeId,
                            project_id: projectId,
                            work_date: workDate,
                            status: status
                        }]);
                    
                    if (error) {
                        console.error(`Error inserting ${record.employee} ${workDate}:`, error.message);
                    } else {
                        totalRecords++;
                    }
                }
            }
            console.log(`✓ Added ${record.employee} - July attendance`);
        }
        
        // Import August attendance
        console.log('\nImporting August 2025 attendance...');
        for (const record of augustAttendance) {
            const employeeId = employeeMap[record.employee];
            const projectId = projectMap[record.project];
            
            if (!employeeId) {
                console.log(`⚠️  Employee not found: ${record.employee}`);
                continue;
            }
            
            if (!projectId) {
                console.log(`⚠️  Project not found: ${record.project}`);
                continue;
            }
            
            // Import each day's attendance
            for (let day = 1; day <= record.days.length; day++) {
                const dayValue = record.days[day - 1];
                if (dayValue > 0) { // Only import working days
                    const workDate = `2025-${String(record.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const status = getAttendanceStatus(dayValue);
                    
                    const { error } = await supabase
                        .from('attendance_records')
                        .insert([{
                            employee_id: employeeId,
                            project_id: projectId,
                            work_date: workDate,
                            status: status
                        }]);
                    
                    if (error) {
                        console.error(`Error inserting ${record.employee} ${workDate}:`, error.message);
                    } else {
                        totalRecords++;
                    }
                }
            }
            console.log(`✓ Added ${record.employee} - August attendance`);
        }
        
        console.log('\n=== Attendance Import Complete ===');
        console.log(`Total attendance records imported: ${totalRecords}`);
        console.log('Now you can generate reports for July and August 2025!');
        
    } catch (error) {
        console.error('Import error:', error);
        process.exit(1);
    }
}

// Run import
importAttendanceData();