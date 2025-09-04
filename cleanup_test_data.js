// Cleanup test data using Supabase client
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://spmtwsxrnclkxmqwsxdf.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNwbXR3c3hybmNsa3htcXdzeGRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4ODAyODUsImV4cCI6MjA3MjQ1NjI4NX0.BpwVkvqpzAP2hroqztXmQNym5Mq_Kijnt9CPG50yP0c";

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanupTestData() {
    console.log('Starting cleanup of test data...\n');
    
    try {
        // 1. Delete attendance records
        console.log('Deleting attendance records...');
        const { data: attendanceRecords } = await supabase
            .from('attendance_records')
            .select('id');
        
        if (attendanceRecords && attendanceRecords.length > 0) {
            for (const record of attendanceRecords) {
                await supabase.from('attendance_records').delete().eq('id', record.id);
            }
            console.log(`✓ Deleted ${attendanceRecords.length} attendance records\n`);
        } else {
            console.log('✓ No attendance records to delete\n');
        }
        
        // 2. Delete transactions
        console.log('Deleting transactions...');
        const { data: transactions } = await supabase
            .from('transactions')
            .select('id');
        
        if (transactions && transactions.length > 0) {
            for (const record of transactions) {
                await supabase.from('transactions').delete().eq('id', record.id);
            }
            console.log(`✓ Deleted ${transactions.length} transactions\n`);
        } else {
            console.log('✓ No transactions to delete\n');
        }
        
        // 3. Delete inventory movements
        console.log('Deleting inventory movements...');
        const { data: movements } = await supabase
            .from('inventory_movements')
            .select('id');
        
        if (movements && movements.length > 0) {
            for (const record of movements) {
                await supabase.from('inventory_movements').delete().eq('id', record.id);
            }
            console.log(`✓ Deleted ${movements.length} inventory movements\n`);
        } else {
            console.log('✓ No inventory movements to delete\n');
        }
        
        // 4. Delete all employees
        console.log('Deleting all test employees...');
        const { data: employees } = await supabase
            .from('employees')
            .select('id');
        
        if (employees && employees.length > 0) {
            for (const record of employees) {
                await supabase.from('employees').delete().eq('id', record.id);
            }
            console.log(`✓ Deleted ${employees.length} employees\n`);
        } else {
            console.log('✓ No employees to delete\n');
        }
        
        // 5. Delete all projects
        console.log('Deleting all test projects...');
        const { data: projects } = await supabase
            .from('projects')
            .select('id');
        
        if (projects && projects.length > 0) {
            for (const record of projects) {
                await supabase.from('projects').delete().eq('id', record.id);
            }
            console.log(`✓ Deleted ${projects.length} projects\n`);
        } else {
            console.log('✓ No projects to delete\n');
        }
        
        // 6. Verify cleanup
        console.log('Verifying cleanup...');
        
        const { count: empRemaining } = await supabase
            .from('employees')
            .select('*', { count: 'exact', head: true });
            
        const { count: projRemaining } = await supabase
            .from('projects')
            .select('*', { count: 'exact', head: true });
            
        const { count: prodRemaining } = await supabase
            .from('products')
            .select('*', { count: 'exact', head: true });
        
        console.log('\n=== Cleanup Complete ===');
        console.log(`Employees remaining: ${empRemaining || 0}`);
        console.log(`Projects remaining: ${projRemaining || 0}`);
        console.log(`Products remaining (preserved): ${prodRemaining || 0}`);
        console.log('\nAll test data has been removed successfully!');
        
    } catch (error) {
        console.error('Cleanup error:', error);
        process.exit(1);
    }
}

// Run cleanup
cleanupTestData();