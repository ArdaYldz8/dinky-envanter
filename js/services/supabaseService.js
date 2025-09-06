// Supabase Service Layer - All database operations
import { supabase } from './supabaseClient.js';

// Re-export supabase client for direct use
export { supabase };

// Employee Operations
export const employeeService = {
    async getAll() {
        const { data, error } = await supabase
            .from('employees')
            .select('*')
            .order('full_name');
        return { data, error };
    },

    async getActive() {
        const { data, error } = await supabase
            .from('employees')
            .select('*')
            .eq('is_active', true)
            .order('full_name');
        return { data, error };
    },

    async getById(id) {
        const { data, error } = await supabase
            .from('employees')
            .select('*')
            .eq('id', id)
            .single();
        return { data, error };
    },

    async create(employee) {
        const { data, error } = await supabase
            .from('employees')
            .insert([employee])
            .select()
            .single();
        return { data, error };
    },

    async update(id, updates) {
        const { data, error } = await supabase
            .from('employees')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        return { data, error };
    },

    async delete(id) {
        const { error } = await supabase
            .from('employees')
            .delete()
            .eq('id', id);
        return { error };
    }
};

// Project Operations
export const projectService = {
    async getAll() {
        const { data, error } = await supabase
            .from('projects')
            .select('*')
            .order('created_at', { ascending: false });
        return { data, error };
    },

    async getActive() {
        const { data, error } = await supabase
            .from('projects')
            .select('*')
            .eq('status', 'Aktif')
            .order('project_name');
        return { data, error };
    },

    async create(project) {
        const { data, error } = await supabase
            .from('projects')
            .insert([project])
            .select()
            .single();
        return { data, error };
    },

    async update(id, updates) {
        const { data, error } = await supabase
            .from('projects')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        return { data, error };
    }
};

// Attendance Operations
export const attendanceService = {
    async getByDate(date) {
        const { data, error } = await supabase
            .from('attendance_records')
            .select(`
                *,
                employees!inner (id, full_name),
                projects (id, project_name)
            `)
            .eq('work_date', date);
        return { data, error };
    },

    async getByEmployee(employeeId, startDate, endDate) {
        let query = supabase
            .from('attendance_records')
            .select(`
                *,
                projects (id, project_name)
            `)
            .eq('employee_id', employeeId);
        
        if (startDate) query = query.gte('work_date', startDate);
        if (endDate) query = query.lte('work_date', endDate);
        
        const { data, error } = await query.order('work_date', { ascending: false });
        return { data, error };
    },

    async upsert(records) {
        const { data, error } = await supabase
            .from('attendance_records')
            .upsert(records, { 
                onConflict: 'employee_id,work_date',
                ignoreDuplicates: false 
            })
            .select();
        return { data, error };
    },

    async create(record) {
        const { data, error } = await supabase
            .from('attendance_records')
            .insert([record])
            .select()
            .single();
        return { data, error };
    },

    async update(id, updates) {
        const { data, error } = await supabase
            .from('attendance_records')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        return { data, error };
    },

    async upsert(records) {
        // Since there's no unique constraint, we need to handle upsert manually
        const results = [];
        const errors = [];
        
        for (const record of records) {
            if (record.id) {
                // Update existing record
                try {
                    const { data, error } = await supabase
                        .from('attendance_records')
                        .update({
                            status: record.status,
                            project_id: record.project_id || null,
                            overtime_hours: record.overtime_hours || 0,
                            created_by: record.created_by || null
                        })
                        .eq('id', record.id)
                        .select('*');
                        
                    if (error) {
                        console.error('Update error for ID:', record.id, error);
                        errors.push(error);
                    } else if (data && data.length > 0) {
                        results.push(...data);
                    }
                } catch (err) {
                    console.error('Update exception:', err);
                    errors.push(err);
                }
            } else {
                // Check if record exists for this employee and date
                const { data: existingRecords } = await supabase
                    .from('attendance_records')
                    .select('id')
                    .eq('employee_id', record.employee_id)
                    .eq('work_date', record.work_date);
                
                const existing = existingRecords && existingRecords.length > 0 ? existingRecords[0] : null;
                
                if (existing) {
                    // Update existing
                    const { data, error } = await supabase
                        .from('attendance_records')
                        .update({
                            status: record.status,
                            project_id: record.project_id || null,
                            overtime_hours: record.overtime_hours || 0,
                            created_by: record.created_by || null
                        })
                        .eq('id', existing.id)
                        .select('*');
                        
                    if (error) {
                        console.error('Update existing error:', error);
                        errors.push(error);
                    } else if (data && data.length > 0) {
                        results.push(...data);
                    }
                } else {
                    // Insert new (clean record without id field)
                    const newRecord = {
                        employee_id: record.employee_id,
                        work_date: record.work_date,
                        status: record.status,
                        project_id: record.project_id || null,
                        overtime_hours: record.overtime_hours || 0,
                        created_by: record.created_by || null
                    };
                    
                    const { data, error } = await supabase
                        .from('attendance_records')
                        .insert([newRecord])
                        .select('*');
                        
                    if (error) {
                        console.error('Insert error:', error);
                        errors.push(error);
                    } else if (data && data.length > 0) {
                        results.push(...data);
                    }
                }
            }
        }
        
        return { 
            data: results.length > 0 ? results : null, 
            error: errors.length > 0 ? errors[0] : null 
        };
    },

    async delete(id) {
        const { error } = await supabase
            .from('attendance_records')
            .delete()
            .eq('id', id);
        return { error };
    }
};

// Transaction Operations (Advance/Deduction)
export const transactionService = {
    async getAll() {
        const { data, error } = await supabase
            .from('transactions')
            .select(`
                *,
                employees (id, full_name)
            `)
            .order('transaction_date', { ascending: false });
        return { data, error };
    },

    async getByEmployee(employeeId, startDate, endDate) {
        let query = supabase
            .from('transactions')
            .select('*')
            .eq('employee_id', employeeId);
        
        if (startDate) query = query.gte('transaction_date', startDate);
        if (endDate) query = query.lte('transaction_date', endDate);
        
        const { data, error } = await query.order('transaction_date', { ascending: false });
        return { data, error };
    },

    async create(transaction) {
        const { data, error } = await supabase
            .from('transactions')
            .insert([transaction])
            .select()
            .single();
        return { data, error };
    },

    async update(id, updates) {
        const { data, error } = await supabase
            .from('transactions')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        return { data, error };
    },

    async delete(id) {
        const { error } = await supabase
            .from('transactions')
            .delete()
            .eq('id', id);
        return { error };
    }
};

// Product Operations
export const productService = {
    async getAll() {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .order('product_name');
        return { data, error };
    },

    async getLowStock() {
        // Try to use RPC function first
        const { data, error } = await supabase.rpc('get_low_stock_products');
        
        if (error) {
            console.warn('RPC function not available, using client-side filtering');
            // Fallback: Get all products and filter in JavaScript
            const { data: products, error: fallbackError } = await supabase
                .from('products')
                .select('*')
                .order('product_name');
                
            if (fallbackError) return { data: null, error: fallbackError };
            
            // Filter products where current_stock <= min_stock_level
            const lowStockProducts = products ? products.filter(product => 
                product.current_stock <= product.min_stock_level
            ) : [];
            
            return { data: lowStockProducts, error: null };
        }
        
        return { data, error };
    },

    async getById(id) {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('id', id)
            .single();
        return { data, error };
    },

    async create(product) {
        const { data, error } = await supabase
            .from('products')
            .insert([product])
            .select()
            .single();
        return { data, error };
    },

    async update(id, updates) {
        const { data, error } = await supabase
            .from('products')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        return { data, error };
    },

    async delete(id) {
        const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', id);
        return { error };
    }
};

// Inventory Movement Operations
export const inventoryService = {
    async getAll() {
        const { data, error } = await supabase
            .from('inventory_movements')
            .select(`
                *,
                products (id, product_name, unit),
                employees (id, full_name),
                projects (id, project_name)
            `)
            .order('movement_date', { ascending: false })
            .limit(100);
        return { data, error };
    },

    async getByProduct(productId) {
        const { data, error } = await supabase
            .from('inventory_movements')
            .select(`
                *,
                employees (id, full_name),
                projects (id, project_name)
            `)
            .eq('product_id', productId)
            .order('movement_date', { ascending: false });
        return { data, error };
    },

    async getRecent(limit = 5) {
        const { data, error } = await supabase
            .from('inventory_movements')
            .select(`
                *,
                products (id, product_name, unit)
            `)
            .order('created_at', { ascending: false })
            .limit(limit);
        return { data, error };
    },

    async create(movement) {
        const { data, error } = await supabase
            .from('inventory_movements')
            .insert([movement])
            .select()
            .single();
        return { data, error };
    },

    async update(id, updates) {
        const { data, error } = await supabase
            .from('inventory_movements')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        return { data, error };
    },

    async delete(id) {
        const { error } = await supabase
            .from('inventory_movements')
            .delete()
            .eq('id', id);
        return { error };
    }
};

// Dashboard Statistics
export const dashboardService = {
    async getStats() {
        try {
            // Active employees count
            const { data: employees, error: empError } = await supabase
                .from('employees')
                .select('id', { count: 'exact' })
                .eq('is_active', true);

            // Product variety count
            const { data: products, error: prodError } = await supabase
                .from('products')
                .select('id', { count: 'exact' });

            // This month's total advances
            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);
            
            const { data: advances, error: advError } = await supabase
                .from('transactions')
                .select('amount')
                .eq('type', 'Avans')
                .gte('transaction_date', startOfMonth.toISOString().split('T')[0]);

            const totalAdvances = advances ? advances.reduce((sum, t) => sum + parseFloat(t.amount), 0) : 0;

            // Today's attendance summary
            const today = new Date().toISOString().split('T')[0];
            const { data: attendance, error: attError } = await supabase
                .from('attendance_records')
                .select('status')
                .eq('work_date', today);

            const attendanceSummary = {
                present: attendance ? attendance.filter(a => a.status !== 'Gelmedi').length : 0,
                absent: attendance ? attendance.filter(a => a.status === 'Gelmedi').length : 0
            };

            return {
                activeEmployees: employees?.length || 0,
                productVariety: products?.length || 0,
                monthlyAdvances: totalAdvances,
                todayAttendance: attendanceSummary
            };
        } catch (error) {
            console.error('Dashboard stats error:', error);
            return null;
        }
    }
};

// Barcode Operations
export const barcodeService = {
    async findProductByBarcode(barcode) {
        const { data, error } = await supabase
            .rpc('find_product_by_barcode', { barcode_input: barcode });
        return { data: data?.[0] || null, error };
    },

    async addMovementByBarcode(barcode, type, quantity, employeeId = null, projectId = null, description = null) {
        const { data, error } = await supabase
            .rpc('add_stock_movement_by_barcode', {
                barcode_input: barcode,
                movement_type: type,
                quantity_input: quantity,
                employee_id_input: employeeId,
                project_id_input: projectId,
                description_input: description
            });
        return { data, error };
    },

    async updateProductBarcode(productId, barcode) {
        const { data, error } = await supabase
            .from('products')
            .update({ barcode })
            .eq('id', productId)
            .select()
            .single();
        return { data, error };
    },

    async getAllProductBarcodes() {
        const { data, error } = await supabase
            .from('products')
            .select('id, product_name, product_code, barcode')
            .order('product_name');
        return { data, error };
    }
};

// Payroll Report Service
export const payrollService = {
    async getMonthlyPayroll(year, month) {
        try {
            // Get all active employees
            const { data: employees, error: empError } = await employeeService.getActive();
            if (empError) throw empError;

            // Calculate date range for the month
            const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
            const endDate = new Date(year, month, 0).toISOString().split('T')[0];

            const payrollData = [];

            for (const employee of employees) {
                // Get attendance records
                const { data: attendance, error: attError } = await attendanceService.getByEmployee(
                    employee.id, startDate, endDate
                );
                if (attError) continue;

                // Calculate working days
                let fullDays = 0;
                let halfDays = 0;
                let absentDays = 0;

                attendance?.forEach(record => {
                    if (record.status === 'Tam Gün') fullDays++;
                    else if (record.status === 'Yarım Gün') halfDays++;
                    else if (record.status === 'Gelmedi') absentDays++;
                });

                const totalDays = fullDays + (halfDays * 0.5);
                const grossSalary = totalDays * employee.daily_wage;

                // Get transactions (advances and deductions)
                const { data: transactions, error: transError } = await transactionService.getByEmployee(
                    employee.id, startDate, endDate
                );

                let totalAdvances = 0;
                let totalDeductions = 0;

                transactions?.forEach(trans => {
                    if (trans.type === 'Avans') totalAdvances += parseFloat(trans.amount);
                    else if (trans.type === 'Kesinti') totalDeductions += parseFloat(trans.amount);
                });

                const netSalary = grossSalary - totalAdvances - totalDeductions;

                payrollData.push({
                    employee: employee.full_name,
                    dailyWage: employee.daily_wage,
                    fullDays,
                    halfDays,
                    absentDays,
                    totalDays,
                    grossSalary,
                    advances: totalAdvances,
                    deductions: totalDeductions,
                    netSalary
                });
            }

            return { data: payrollData, error: null };
        } catch (error) {
            return { data: null, error };
        }
    }
};