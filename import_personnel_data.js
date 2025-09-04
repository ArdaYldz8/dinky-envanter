// Import personnel and project data from CSV files
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://spmtwsxrnclkxmqwsxdf.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNwbXR3c3hybmNsa3htcXdzeGRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4ODAyODUsImV4cCI6MjA3MjQ1NjI4NX0.BpwVkvqpzAP2hroqztXmQNym5Mq_Kijnt9CPG50yP0c";

const supabase = createClient(supabaseUrl, supabaseKey);

// Employee data extracted from CSV files - matching database schema exactly
const employees = [
    // From Temmuz and Ağustos files with daily rates
    { full_name: "Abdullah Elkorma", daily_wage: 2596, start_date: "2025-04-28", is_active: true },
    { full_name: "Samet İspir", daily_wage: 2115, start_date: "2025-04-08", is_active: true },
    { full_name: "Nureddin Depdop", daily_wage: 1923, start_date: "2025-06-12", is_active: true },
    { full_name: "Ömer Elşeb", daily_wage: 962, start_date: "2025-05-14", is_active: true },
    { full_name: "Abdulhamid Marri", daily_wage: 1635, start_date: "2025-06-27", is_active: true },
    { full_name: "Mustafa Beciko", daily_wage: 1384.62, start_date: "2025-06-23", is_active: true },
    { full_name: "Muhammed Elhamide", daily_wage: 1923, start_date: "2025-06-30", is_active: true },
    { full_name: "Mahmut Elahmet", daily_wage: 1500, start_date: "2025-07-01", is_active: false },
    { full_name: "Muhammed Elahmet", daily_wage: 1500, start_date: "2025-07-01", is_active: false },
    { full_name: "Celal Kaya", daily_wage: 962, start_date: "2025-07-01", is_active: true },
    { full_name: "Abdulkadir Bekro", daily_wage: 1923, start_date: "2025-07-01", is_active: true },
    { full_name: "Zafer Canbağrıaçık", daily_wage: 1538, start_date: "2025-05-12", is_active: true },
    { full_name: "Süheyl Kurdiye", daily_wage: 2115, start_date: "2025-05-12", is_active: true },
    { full_name: "Safvan Beciko", daily_wage: 2500, start_date: "2025-05-08", is_active: true },
    { full_name: "Bayram Işık", daily_wage: 1346, start_date: "2025-06-26", is_active: true },
    { full_name: "Zekeriya Marri", daily_wage: 1154, start_date: "2025-07-03", is_active: true },
    { full_name: "Salih Eltalip", daily_wage: 2115, start_date: "2025-07-01", is_active: true },
    { full_name: "Mirayi Bakriş", daily_wage: 1538.46, start_date: "2025-07-07", is_active: true },
    { full_name: "Muhammed Ebu Abdullah", daily_wage: 1346, start_date: "2025-07-07", is_active: true },
    { full_name: "Adnan Hachasan", daily_wage: 1923, start_date: "2025-07-15", is_active: true },
    { full_name: "Kadir Kibarkaya", daily_wage: 1346.15, start_date: "2025-07-22", is_active: true },
    { full_name: "Salih Ardıç", daily_wage: 2307.69, start_date: "2025-07-25", is_active: true },
    { full_name: "Halid Ebumagara", daily_wage: 1153.85, start_date: "2025-07-23", is_active: true },
    { full_name: "İsa Ardıç", daily_wage: 1346.15, start_date: "2025-07-28", is_active: true },
    { full_name: "İbrahim Ardıç", daily_wage: 2692.31, start_date: "2025-07-28", is_active: true },
    { full_name: "Kaan Özşen", daily_wage: 2000, start_date: "2025-05-01", is_active: true },
    { full_name: "Bekri Berduş", daily_wage: 1500, start_date: "2025-07-01", is_active: true },
    { full_name: "Ahmet Abbas", daily_wage: 1500, start_date: "2025-07-01", is_active: true },
    { full_name: "Adnan Bağrıaçık", daily_wage: 1500, start_date: "2025-07-01", is_active: true },
    { full_name: "Ahmet Aşur", daily_wage: 1500, start_date: "2025-07-01", is_active: true },
    { full_name: "Ömer Türkkahraman", daily_wage: 1500, start_date: "2025-07-01", is_active: true },
    { full_name: "Murat Elali", daily_wage: 1500, start_date: "2025-07-01", is_active: true },
    { full_name: "Arif Şabanali", daily_wage: 1500, start_date: "2025-07-01", is_active: true },
    { full_name: "Feheb Şabanali", daily_wage: 1500, start_date: "2025-07-01", is_active: true }
];

// Project data from CSV files - matching database schema (only project_name and status)
const projects = [
    { project_name: "Ofis", status: "Aktif" },
    { project_name: "İlhan Projesi", status: "Aktif" },
    { project_name: "Türkoğlu Vinç", status: "Aktif" },
    { project_name: "Beyoğlu Projesi", status: "Aktif" },
    { project_name: "Ömer Çatı", status: "Aktif" },
    { project_name: "Villa Mustafa", status: "Aktif" },
    { project_name: "Narlı Montaj", status: "Aktif" },
    { project_name: "Yemekhane", status: "Aktif" },
    { project_name: "Hüseyin Kuru", status: "Aktif" },
    { project_name: "Maraş Dükkan", status: "Aktif" },
    { project_name: "Süleyman Projesi", status: "Aktif" },
    { project_name: "Hasan Bal Projesi", status: "Aktif" },
    { project_name: "Kemal Coffee Projesi", status: "Aktif" },
    { project_name: "Savaş 6 Ton Vinç", status: "Aktif" }
];

async function importData() {
    console.log('Starting data import...\n');
    
    try {
        // 1. Import Employees
        console.log('Importing employees...');
        let employeeCount = 0;
        const employeeMap = {}; // Map to store employee IDs by name
        
        for (const employee of employees) {
            const { data, error } = await supabase
                .from('employees')
                .insert([employee])
                .select()
                .single();
            
            if (error) {
                console.error(`Error inserting ${employee.full_name}:`, error.message);
            } else {
                employeeCount++;
                employeeMap[employee.full_name] = data.id;
                console.log(`✓ Added employee: ${employee.full_name}`);
            }
        }
        console.log(`\n✓ Imported ${employeeCount} employees\n`);
        
        // 2. Import Projects
        console.log('Importing projects...');
        let projectCount = 0;
        const projectMap = {}; // Map to store project IDs by name
        
        for (const project of projects) {
            const { data, error } = await supabase
                .from('projects')
                .insert([project])
                .select()
                .single();
            
            if (error) {
                console.error(`Error inserting ${project.project_name}:`, error.message);
            } else {
                projectCount++;
                projectMap[project.project_name] = data.id;
                console.log(`✓ Added project: ${project.project_name}`);
            }
        }
        console.log(`\n✓ Imported ${projectCount} projects\n`);
        
        // Save the maps for later use (attendance records import)
        console.log('\n=== Import Complete ===');
        console.log(`Total employees imported: ${employeeCount}`);
        console.log(`Total projects imported: ${projectCount}`);
        console.log('\nEmployee and project IDs have been generated.');
        console.log('You can now import attendance records using these IDs.');
        
        // Save maps to file for attendance import
        const fs = await import('fs');
        const importMaps = {
            employees: employeeMap,
            projects: projectMap,
            timestamp: new Date().toISOString()
        };
        fs.writeFileSync('import_maps.json', JSON.stringify(importMaps, null, 2));
        console.log('\nID mappings saved to import_maps.json for attendance import.');
        
    } catch (error) {
        console.error('Import error:', error);
        process.exit(1);
    }
}

// Run import
importData();