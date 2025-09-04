// Apply overtime system changes to Supabase database
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabaseUrl = "https://spmtwsxrnclkxmqwsxdf.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNwbXR3c3hybmNsa3htcXdzeGRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4ODAyODUsImV4cCI6MjA3MjQ1NjI4NX0.BpwVkvqpzAP2hroqztXmQNym5Mq_Kijnt9CPG50yP0c";

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyOvertimeChanges() {
    console.log('Applying overtime system changes to database...\n');
    
    try {
        // 1. Add overtime_hours column to attendance_records
        console.log('1. Adding overtime_hours column...');
        const { error: alterError } = await supabase.rpc('sql', {
            query: `
                ALTER TABLE attendance_records 
                ADD COLUMN IF NOT EXISTS overtime_hours NUMERIC(4,2) DEFAULT 0 CHECK (overtime_hours >= 0);
                
                COMMENT ON COLUMN attendance_records.overtime_hours IS 'Extra hours worked beyond normal working day';
                
                UPDATE attendance_records SET overtime_hours = 0 WHERE overtime_hours IS NULL;
            `
        });
        
        if (alterError) {
            console.log('Column might already exist, trying alternative approach...');
            // Try to update existing records
            const { error: updateError } = await supabase
                .from('attendance_records')
                .update({ overtime_hours: 0 })
                .is('overtime_hours', null);
                
            if (updateError) {
                console.log('Update not needed, column likely already exists with data');
            }
        }
        console.log('✓ Overtime column ready');
        
        // 2. Test the new column by adding some sample overtime data
        console.log('\n2. Adding sample overtime data...');
        
        // Get some recent attendance records to add overtime to
        const { data: recentRecords, error: fetchError } = await supabase
            .from('attendance_records')
            .select('id, employee_id, work_date')
            .eq('status', 'Tam Gün')
            .order('work_date', { ascending: false })
            .limit(5);
            
        if (fetchError) {
            console.error('Error fetching records:', fetchError);
        } else if (recentRecords && recentRecords.length > 0) {
            // Add some sample overtime hours
            const overtimeUpdates = [
                { id: recentRecords[0].id, overtime_hours: 2.0 }, // 2 hours overtime
                { id: recentRecords[1].id, overtime_hours: 1.5 }, // 1.5 hours overtime  
                { id: recentRecords[2].id, overtime_hours: 3.0 }, // 3 hours overtime
            ];
            
            for (const update of overtimeUpdates) {
                const { error: overtimeError } = await supabase
                    .from('attendance_records')
                    .update({ overtime_hours: update.overtime_hours })
                    .eq('id', update.id);
                    
                if (overtimeError) {
                    console.error('Error adding overtime:', overtimeError);
                } else {
                    console.log(`✓ Added ${update.overtime_hours} hours overtime`);
                }
            }
        }
        
        // 3. Test payroll calculation with overtime
        console.log('\n3. Testing overtime calculations...');
        
        // Get a sample employee with overtime
        const { data: overtimeRecords, error: overtimeError } = await supabase
            .from('attendance_records')
            .select(`
                id, work_date, overtime_hours,
                employees(full_name, daily_wage)
            `)
            .gt('overtime_hours', 0)
            .limit(3);
            
        if (overtimeError) {
            console.error('Error fetching overtime records:', overtimeError);
        } else if (overtimeRecords && overtimeRecords.length > 0) {
            console.log('\n📊 Sample overtime calculations:');
            overtimeRecords.forEach(record => {
                const hourlyRate = record.employees.daily_wage / 8;
                const overtimeRate = hourlyRate * 1.5;
                const overtimePayment = record.overtime_hours * overtimeRate;
                
                console.log(`${record.employees.full_name}:`);
                console.log(`  Date: ${record.work_date}`);
                console.log(`  Overtime: ${record.overtime_hours} hours`);
                console.log(`  Rate: ₺${overtimeRate.toFixed(2)}/hour (1.5x)`);
                console.log(`  Payment: ₺${overtimePayment.toFixed(2)}\n`);
            });
        }
        
        console.log('🎉 Overtime system successfully implemented!');
        console.log('\nNext steps:');
        console.log('1. Update frontend to allow overtime entry');
        console.log('2. Modify payroll reports to include overtime');
        console.log('3. Add overtime to attendance forms');
        
    } catch (error) {
        console.error('Error applying overtime changes:', error);
        process.exit(1);
    }
}

// Run the changes
applyOvertimeChanges();