// Supabase Service Layer - All database operations
import { supabase } from './supabaseClient.js';
import { csrfManager } from '../utils/security.js';

// Re-export supabase client for direct use
export { supabase };

// Simple permission check (always allows for now - can be enhanced later)
function checkPermission(resource, action) {
    // For now, allow all operations
    // TODO: Implement proper role-based permissions if needed
    return true;
}

/**
 * Combined CSRF + Authorization validation wrapper
 * Validates both CSRF token and user permissions before executing operations
 */
async function withSecurityValidation(operation, operationType = 'unknown', resource = null, action = null) {
    // Only validate for write operations
    const writeOps = ['insert', 'update', 'delete', 'upsert'];
    const isWriteOp = writeOps.some(op => operationType.toLowerCase().includes(op));

    if (isWriteOp) {
        // 1. CSRF Validation
        const token = csrfManager.getToken();
        if (!token) {
            throw new Error('CSRF token missing');
        }

        const cookieToken = csrfManager.getTokenFromCookie();
        if (!cookieToken || !csrfManager.validateToken(token)) {
            throw new Error('CSRF validation failed');
        }

        // 2. Authorization Check (if resource and action provided)
        if (resource && action) {
            if (!checkPermission(resource, action)) {
                const error = new Error(`Yetkiniz yok: ${action} işlemi için '${resource}' kaynağına erişim reddedildi`);
                error.code = 'PERMISSION_DENIED';

                // Log to security_events via Supabase
                try {
                    await supabase.rpc('log_permission_denied', {
                        p_resource: resource,
                        p_action: action
                    });
                } catch (logError) {
                    console.error('Failed to log permission denial:', logError);
                }

                throw error;
            }
        }
    }

    return await operation();
}

// Employee Operations
export const employeeService = {
    async getAll() {
        const { data, error } = await supabase
            .from('employees')
            .select()
            .order('full_name');
        return { data, error };
    },

    async getActive() {
        const { data, error } = await supabase
            .from('employees')
            .select()
            .eq('is_active', true)
            .order('full_name');
        return { data, error };
    },

    async getById(id) {
        const { data, error } = await supabase
            .from('employees')
            .select()
            .eq('id', id)
            .single();
        return { data, error };
    },

    async create(employee) {
        return await withSecurityValidation(async () => {
            const { data, error } = await supabase
                .from('employees')
                .insert([employee])
                .select()
                .single();

            // Activity logging
            if (!error && data) {
                try {
                    const userInfo = this.getCurrentUserInfo();
                    await supabase.rpc('log_user_activity', {
                        p_action_type: 'CREATE',
                        p_table_name: 'employees',
                        p_record_id: data.id,
                        p_description: `Yeni personel eklendi: ${data.full_name}`,
                        p_new_values: data,
                        p_user_id: userInfo.id,
                        p_user_name: userInfo.name,
                        p_user_role: userInfo.role
                    });
                } catch (logError) {
                    console.warn('Employee create activity logging failed:', logError);
                }
            }

            return { data, error };
        }, 'create', 'employees', 'create');
    },
    
    getCurrentUserInfo() {
        const userStr = localStorage.getItem('dinky_user');
        if (!userStr) {
            return { id: null, name: 'Sistem', role: 'system' };
        }
        const user = JSON.parse(userStr);
        return {
            id: user.id,
            name: user.name || user.full_name || user.email || 'Kullanıcı',
            role: user.role || 'user'
        };
    },

    async update(id, updates) {
        // Get old data first
        const { data: oldData } = await supabase
            .from('employees')
            .select()
            .eq('id', id)
            .single();
            
        const { data, error } = await supabase
            .from('employees')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
            
        // Activity logging
        if (!error && data) {
            try {
                const userInfo = this.getCurrentUserInfo();
                await supabase.rpc('log_user_activity', {
                    p_action_type: 'UPDATE',
                    p_table_name: 'employees',
                    p_record_id: data.id,
                    p_description: `Personel güncellendi: ${data.full_name}`,
                    p_old_values: oldData,
                    p_new_values: data,
                    p_user_id: userInfo.id,
                    p_user_name: userInfo.name,
                    p_user_role: userInfo.role
                });
            } catch (logError) {
                console.warn('Employee update activity logging failed:', logError);
            }
        }
        
        return { data, error };
    },

    async delete(id) {
        // Get data before deletion
        const { data: oldData } = await supabase
            .from('employees')
            .select()
            .eq('id', id)
            .single();
            
        const { error } = await supabase
            .from('employees')
            .delete()
            .eq('id', id);
            
        // Activity logging
        if (!error && oldData) {
            try {
                const userInfo = this.getCurrentUserInfo();
                await supabase.rpc('log_user_activity', {
                    p_action_type: 'DELETE',
                    p_table_name: 'employees',
                    p_record_id: oldData.id,
                    p_description: `Personel silindi: ${oldData.full_name}`,
                    p_old_values: oldData,
                    p_user_id: userInfo.id,
                    p_user_name: userInfo.name,
                    p_user_role: userInfo.role
                });
            } catch (logError) {
                console.warn('Employee delete activity logging failed:', logError);
            }
        }
        
        return { error };
    }
};

// Project Operations
export const projectService = {
    async getAll() {
        const { data, error } = await supabase
            .from('projects')
            .select()
            .order('created_at', { ascending: false });
        return { data, error };
    },

    async getActive() {
        const { data, error } = await supabase
            .from('projects')
            .select()
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
            
        // Activity logging
        if (!error && data) {
            try {
                const userInfo = this.getCurrentUserInfo();
                await supabase.rpc('log_user_activity', {
                    p_action_type: 'CREATE',
                    p_table_name: 'projects',
                    p_record_id: data.id,
                    p_description: `Yeni proje eklendi: ${data.project_name}`,
                    p_new_values: data,
                    p_user_id: userInfo.id,
                    p_user_name: userInfo.name,
                    p_user_role: userInfo.role
                });
            } catch (logError) {
                console.warn('Project create activity logging failed:', logError);
            }
        }
        
        return { data, error };
    },
    
    getCurrentUserInfo() {
        const userStr = localStorage.getItem('dinky_user');
        if (!userStr) {
            return { id: null, name: 'Sistem', role: 'system' };
        }
        const user = JSON.parse(userStr);
        return {
            id: user.id,
            name: user.name || user.full_name || user.email || 'Kullanıcı',
            role: user.role || 'user'
        };
    },

    async update(id, updates) {
        // Get old data first
        const { data: oldData } = await supabase
            .from('projects')
            .select()
            .eq('id', id)
            .single();
            
        const { data, error } = await supabase
            .from('projects')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
            
        // Activity logging
        if (!error && data) {
            try {
                const userInfo = this.getCurrentUserInfo();
                await supabase.rpc('log_user_activity', {
                    p_action_type: 'UPDATE',
                    p_table_name: 'projects',
                    p_record_id: data.id,
                    p_description: `Proje güncellendi: ${data.project_name}`,
                    p_old_values: oldData,
                    p_new_values: data,
                    p_user_id: userInfo.id,
                    p_user_name: userInfo.name,
                    p_user_role: userInfo.role
                });
            } catch (logError) {
                console.warn('Project update activity logging failed:', logError);
            }
        }
        
        return { data, error };
    },
    async delete(id) {
        // Get data before deletion
        const { data: oldData } = await supabase
            .from('projects')
            .select()
            .eq('id', id)
            .single();
            
        const { error } = await supabase
            .from('projects')
            .delete()
            .eq('id', id);
            
        // Activity logging
        if (!error && oldData) {
            try {
                const userInfo = this.getCurrentUserInfo();
                await supabase.rpc('log_user_activity', {
                    p_action_type: 'DELETE',
                    p_table_name: 'projects',
                    p_record_id: oldData.id,
                    p_description: `Proje silindi: ${oldData.project_name}`,
                    p_old_values: oldData,
                    p_user_id: userInfo.id,
                    p_user_name: userInfo.name,
                    p_user_role: userInfo.role
                });
            } catch (logError) {
                console.warn('Project delete activity logging failed:', logError);
            }
        }
        
        return { error };
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

    async getAll() {
        const { data, error } = await supabase
            .from('attendance_records')
            .select(`
                *,
                employees!inner (id, full_name),
                projects (id, project_name)
            `)
            .order('work_date', { ascending: false });
        return { data, error };
    },

    async getTodayAttendance() {
        const today = new Date().toISOString().split('T')[0];
        const { data, error } = await supabase
            .from('attendance_records')
            .select(`
                *,
                employees!inner (id, full_name),
                projects (id, project_name)
            `)
            .eq('work_date', today);
        return { data, error };
    },

    async getByDateRange(startDate, endDate) {
        const { data, error } = await supabase
            .from('attendance_records')
            .select(`
                *,
                employees!inner (id, full_name),
                projects (id, project_name)
            `)
            .gte('work_date', startDate)
            .lte('work_date', endDate)
            .order('work_date');
        return { data, error };
    },

    async create(record) {
        const { data, error } = await supabase
            .from('attendance_records')
            .insert([record])
            .select()
            .single();
            
        // Activity logging
        if (!error && data) {
            try {
                const userInfo = this.getCurrentUserInfo();
                const { data: employee } = await supabase
                    .from('employees')
                    .select('full_name')
                    .eq('id', data.employee_id)
                    .single();
                    
                await supabase.rpc('log_user_activity', {
                    p_action_type: 'CREATE',
                    p_table_name: 'attendance_records',
                    p_record_id: data.id,
                    p_description: `Yeni puantaj kaydı: ${employee?.full_name || 'Bilinmeyen'} - ${data.work_date}`,
                    p_new_values: data,
                    p_user_id: userInfo.id,
                    p_user_name: userInfo.name,
                    p_user_role: userInfo.role
                });
            } catch (logError) {
                console.warn('Attendance create activity logging failed:', logError);
            }
        }
        
        return { data, error };
    },
    
    getCurrentUserInfo() {
        const userStr = localStorage.getItem('dinky_user');
        if (!userStr) {
            return { id: null, name: 'Sistem', role: 'system' };
        }
        const user = JSON.parse(userStr);
        return {
            id: user.id,
            name: user.name || user.full_name || user.email || 'Kullanıcı',
            role: user.role || 'user'
        };
    },

    async update(id, updates) {
        // Get old data first
        const { data: oldData } = await supabase
            .from('attendance_records')
            .select()
            .eq('id', id)
            .single();
            
        const { data, error } = await supabase
            .from('attendance_records')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
            
        // Activity logging
        if (!error && data) {
            try {
                const userInfo = this.getCurrentUserInfo();
                const { data: employee } = await supabase
                    .from('employees')
                    .select('full_name')
                    .eq('id', data.employee_id)
                    .single();
                    
                await supabase.rpc('log_user_activity', {
                    p_action_type: 'UPDATE',
                    p_table_name: 'attendance_records',
                    p_record_id: data.id,
                    p_description: `Puantaj güncellendi: ${employee?.full_name || 'Bilinmeyen'} - ${data.work_date}`,
                    p_old_values: oldData,
                    p_new_values: data,
                    p_user_id: userInfo.id,
                    p_user_name: userInfo.name,
                    p_user_role: userInfo.role
                });
            } catch (logError) {
                console.warn('Attendance update activity logging failed:', logError);
            }
        }
        
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
                            overtime_hours: record.overtime_hours || 0
                        })
                        .eq('id', record.id)
                        .select();
                        
                    if (error) {
                        console.error('Update error for ID:', record.id, error);
                        errors.push(error);
                    } else if (data && data.length > 0) {
                        results.push(...data);
                        // Activity logging for update
                        try {
                            const userInfo = this.getCurrentUserInfo();
                            const { data: employee } = await supabase
                                .from('employees')
                                .select('full_name')
                                .eq('id', data[0].employee_id)
                                .single();
                                
                            await supabase.rpc('log_user_activity', {
                                p_action_type: 'UPDATE',
                                p_table_name: 'attendance_records',
                                p_record_id: data[0].id,
                                p_description: `Puantaj güncellendi: ${employee?.full_name || 'Bilinmeyen'} - ${data[0].work_date}`,
                                p_new_values: data[0],
                                p_user_id: userInfo.id,
                                p_user_name: userInfo.name,
                                p_user_role: userInfo.role
                            });
                        } catch (logError) {
                            console.warn('Attendance upsert update activity logging failed:', logError);
                        }
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
                            overtime_hours: record.overtime_hours || 0
                        })
                        .eq('id', existing.id)
                        .select();
                        
                    if (error) {
                        console.error('Update existing error:', error);
                        errors.push(error);
                    } else if (data && data.length > 0) {
                        results.push(...data);
                        // Activity logging for update existing
                        try {
                            const userInfo = this.getCurrentUserInfo();
                            const { data: employee } = await supabase
                                .from('employees')
                                .select('full_name')
                                .eq('id', data[0].employee_id)
                                .single();
                                
                            await supabase.rpc('log_user_activity', {
                                p_action_type: 'UPDATE',
                                p_table_name: 'attendance_records',
                                p_record_id: data[0].id,
                                p_description: `Puantaj güncellendi: ${employee?.full_name || 'Bilinmeyen'} - ${data[0].work_date}`,
                                p_new_values: data[0],
                                p_user_id: userInfo.id,
                                p_user_name: userInfo.name,
                                p_user_role: userInfo.role
                            });
                        } catch (logError) {
                            console.warn('Attendance existing update activity logging failed:', logError);
                        }
                    }
                } else {
                    // Insert new (clean record without id field)
                    const newRecord = {
                        employee_id: record.employee_id,
                        work_date: record.work_date,
                        status: record.status,
                        project_id: record.project_id || null,
                        overtime_hours: record.overtime_hours || 0
                    };
                    
                    const { data, error } = await supabase
                        .from('attendance_records')
                        .insert([newRecord])
                        .select();
                        
                    if (error) {
                        console.error('Insert error:', error);
                        errors.push(error);
                    } else if (data && data.length > 0) {
                        results.push(...data);
                        // Activity logging for insert new
                        try {
                            const userInfo = this.getCurrentUserInfo();
                            const { data: employee } = await supabase
                                .from('employees')
                                .select('full_name')
                                .eq('id', data[0].employee_id)
                                .single();
                                
                            await supabase.rpc('log_user_activity', {
                                p_action_type: 'CREATE',
                                p_table_name: 'attendance_records',
                                p_record_id: data[0].id,
                                p_description: `Yeni puantaj kaydı: ${employee?.full_name || 'Bilinmeyen'} - ${data[0].work_date}`,
                                p_new_values: data[0],
                                p_user_id: userInfo.id,
                                p_user_name: userInfo.name,
                                p_user_role: userInfo.role
                            });
                        } catch (logError) {
                            console.warn('Attendance insert activity logging failed:', logError);
                        }
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
            .select()
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
            
        // Activity logging
        if (!error && data) {
            try {
                const userInfo = this.getCurrentUserInfo();
                const { data: employee } = await supabase
                    .from('employees')
                    .select('full_name')
                    .eq('id', data.employee_id)
                    .single();
                    
                await supabase.rpc('log_user_activity', {
                    p_action_type: 'CREATE',
                    p_table_name: 'transactions',
                    p_record_id: data.id,
                    p_description: `Yeni ${data.type.toLowerCase()} kaydı: ${employee?.full_name || 'Bilinmeyen'} - ${data.amount} TL`,
                    p_new_values: data,
                    p_user_id: userInfo.id,
                    p_user_name: userInfo.name,
                    p_user_role: userInfo.role
                });
            } catch (logError) {
                console.warn('Transaction create activity logging failed:', logError);
            }
        }
        
        return { data, error };
    },
    
    getCurrentUserInfo() {
        const userStr = localStorage.getItem('dinky_user');
        if (!userStr) {
            return { id: null, name: 'Sistem', role: 'system' };
        }
        const user = JSON.parse(userStr);
        return {
            id: user.id,
            name: user.name || user.full_name || user.email || 'Kullanıcı',
            role: user.role || 'user'
        };
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
            .select()
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
                .select()
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
            .select()
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
            
        // Activity logging
        if (!error && data) {
            try {
                const userInfo = this.getCurrentUserInfo();
                await supabase.rpc('log_user_activity', {
                    p_action_type: 'CREATE',
                    p_table_name: 'products',
                    p_record_id: data.id,
                    p_description: `Yeni ürün tanımı: ${data.product_name}`,
                    p_new_values: data,
                    p_user_id: userInfo.id,
                    p_user_name: userInfo.name,
                    p_user_role: userInfo.role
                });
            } catch (logError) {
                console.warn('Product create activity logging failed:', logError);
            }
        }
        
        return { data, error };
    },
    
    getCurrentUserInfo() {
        const userStr = localStorage.getItem('dinky_user');
        if (!userStr) {
            return { id: null, name: 'Sistem', role: 'system' };
        }
        const user = JSON.parse(userStr);
        return {
            id: user.id,
            name: user.name || user.full_name || user.email || 'Kullanıcı',
            role: user.role || 'user'
        };
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
            .select('id, product_id, type, quantity, movement_date, description, created_at')
            .order('movement_date', { ascending: false })
            .limit(100);
        return { data, error };
    },

    async getByProduct(productId) {
        const { data, error } = await supabase
            .from('inventory_movements')
            .select(`
                id, type, quantity, movement_date, description, created_at,
                project_id,
                projects (project_name)
            `)
            .eq('product_id', productId)
            .order('movement_date', { ascending: false });
        return { data, error };
    },

    async getRecent(limit = 5) {
        const { data, error } = await supabase
            .from('inventory_movements')
            .select(`
                id, product_id, type, quantity, movement_date, created_at,
                products (product_name, unit)
            `)
            .order('created_at', { ascending: false })
            .limit(limit);
        return { data, error };
    },

    async create(movement) {
        // Get current user info from localStorage
        const getCurrentUserInfo = () => {
            const userStr = localStorage.getItem('dinky_user');
            if (!userStr) {
                return { id: null, name: 'Sistem', role: 'system' };
            }
            const user = JSON.parse(userStr);
            // Debug logs removed
            return {
                id: user.id,
                name: user.name || user.full_name || user.email || 'Kullanıcı',
                role: user.role || 'user'
            };
        };
        
        const userInfo = getCurrentUserInfo();
        
        // Clean movement object to ensure no undefined values
        const cleanMovement = {
            product_id: movement.product_id,
            type: movement.type,
            quantity: movement.quantity,
            movement_date: movement.movement_date,
            employee_id: movement.employee_id || null,
            project_id: movement.project_id || null,
            description: movement.description || null
        };
        
        // Insert movement
        const { data, error } = await supabase
            .from('inventory_movements')
            .insert(cleanMovement)
            .select()
            .single();
            
        if (!error && data) {
            // Manuel activity log kaydı yap
            try {
                const productResult = await supabase
                    .from('products')
                    .select('product_name')
                    .eq('id', movement.product_id)
                    .single();
                
                const productName = productResult.data?.product_name || 'Bilinmeyen';
                const description = `Stok hareketi: ${productName} - ${movement.type} (${movement.quantity})`;
                
                const actionType = movement.type === 'Giriş' ? 'STOCK_IN' : 'STOCK_OUT';
                
                await supabase.rpc('log_user_activity', {
                    p_action_type: actionType,
                    p_table_name: 'inventory_movements',
                    p_record_id: data.id,
                    p_description: description,
                    p_new_values: cleanMovement,
                    p_user_id: userInfo.id,
                    p_user_name: userInfo.name,
                    p_user_role: userInfo.role
                });
            } catch (logError) {
                console.warn('Activity logging failed:', logError);
            }
        }
        
        // Return result
        return { data, error };
    },

    async update(id, updates) {
        const { data, error } = await supabase
            .from('inventory_movements')
            .update(updates)
            .eq('id', id)
            .select('id, product_id, type, quantity, movement_date, description, created_at')
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

                // Calculate working days and overtime
                let fullDays = 0;
                let halfDays = 0;
                let absentDays = 0;
                let customHours = 0;
                let overtimeHours = 0;

                attendance?.forEach(record => {
                    if (record.status === 'Tam Gün') fullDays++;
                    else if (record.status === 'Yarım Gün') halfDays++;
                    else if (record.status === 'Serbest Saat') customHours += parseFloat(record.custom_hours) || 0;
                    else if (record.status === 'Gelmedi') absentDays++;

                    // Add overtime hours
                    overtimeHours += parseFloat(record.overtime_hours) || 0;
                });

                const totalDays = fullDays + (halfDays * 0.5) + (customHours / 9);
                const overtimePayment = overtimeHours * (employee.daily_wage / 9) * 1.5;
                const grossSalary = (totalDays * employee.daily_wage) + overtimePayment;

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
                    overtimeHours,
                    overtimePayment,
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

// Task Service
export const taskService = {
    async getTasksWithPersonnel() {
        try {
            console.log('Fetching tasks with personnel...');
            
            // Get current user for debugging
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            console.log('Current user for tasks fetch:', user);
            
            // Simplified approach - get tasks without employee details for now
            const { data, error } = await supabase
                .from('tasks')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) {
                console.error('Supabase tasks fetch error:', error);
                throw error;
            }
            console.log('Tasks fetched successfully:', data);
            return { data, error: null };
        } catch (error) {
            console.error('Error fetching tasks:', error);
            return { data: null, error };
        }
    },

    async addTask(taskData) {
        try {
            console.log('Adding task with data:', taskData);
            
            // Use service_role key for bypassing RLS temporarily
            const { data, error } = await supabase
                .from('tasks')
                .insert([{
                    title: taskData.title,
                    assigned_to_id: taskData.assigned_to_id,
                    is_completed: false,
                    created_at: new Date().toISOString()
                }])
                .select()
                .single();
            
            if (error) {
                console.error('Supabase insert error details:', error);
                
                // Try with simpler approach if RLS is blocking
                if (error.code === 'PGRST301' || error.message.includes('row-level security')) {
                    console.log('RLS blocking insert, trying alternative approach...');
                    // In production, you would need to run the SQL fix or use service role key
                }
                throw error;
            }
            console.log('Task added successfully:', data);
            return { data, error: null };
        } catch (error) {
            console.error('Error adding task:', error);
            return { data: null, error };
        }
    },

    async updateTaskStatus(taskId, isCompleted) {
        try {
            const updateData = {
                is_completed: isCompleted,
                completed_at: isCompleted ? new Date().toISOString() : null
            };
            
            const { data, error } = await supabase
                .from('tasks')
                .update(updateData)
                .eq('id', taskId)
                .select()
                .single();
            
            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            console.error('Error updating task status:', error);
            return { data: null, error };
        }
    },

    async updateTaskAssignment(taskId, assignedToId) {
        try {
            console.log('Updating task assignment:', taskId, 'to', assignedToId);
            
            const { data, error } = await supabase
                .from('tasks')
                .update({
                    assigned_to_id: assignedToId
                })
                .eq('id', taskId)
                .select()
                .single();
            
            if (error) {
                console.error('Supabase task assignment update error:', error);
                throw error;
            }
            console.log('Task assignment updated successfully:', data);
            return { data, error: null };
        } catch (error) {
            console.error('Error updating task assignment:', error);
            return { data: null, error };
        }
    }
};

// Customer Service
export const customerService = {
    async getAll() {
        const { data, error } = await supabase
            .from('customers')
            .select()
            .order('company_name');
        return { data, error };
    },

    async getActive() {
        const { data, error } = await supabase
            .from('customers')
            .select()
            .eq('is_active', true)
            .order('company_name');
        return { data, error };
    },

    async getById(id) {
        const { data, error } = await supabase
            .from('customers')
            .select()
            .eq('id', id)
            .single();
        return { data, error };
    },

    async getByCode(code) {
        const { data, error } = await supabase
            .from('customers')
            .select()
            .eq('customer_code', code)
            .single();
        return { data, error };
    },

    async create(customer) {
        // Auto-generate customer code if not provided
        if (!customer.customer_code) {
            // Get the highest customer code to generate next one
            const { data: lastCustomer } = await supabase
                .from('customers')
                .select('customer_code')
                .like('customer_code', 'C%')
                .order('customer_code', { ascending: false })
                .limit(1);

            let nextNumber = 1;
            if (lastCustomer && lastCustomer.length > 0) {
                const lastCode = lastCustomer[0].customer_code;
                const lastNumber = parseInt(lastCode.substring(1));
                nextNumber = lastNumber + 1;
            }

            customer.customer_code = `C${String(nextNumber).padStart(4, '0')}`;
        }

        const { data, error } = await supabase
            .from('customers')
            .insert([customer])
            .select()
            .single();

        // Activity logging (simplified)
        if (!error && data) {
            console.log(`Customer created: ${data.company_name} (${data.customer_code})`);
        }

        return { data, error };
    },

    getCurrentUserInfo() {
        const userStr = localStorage.getItem('dinky_user');
        if (!userStr) {
            return { id: null, name: 'Sistem', role: 'system' };
        }
        const user = JSON.parse(userStr);
        return {
            id: user.id,
            name: user.name || user.full_name || user.email || 'Kullanıcı',
            role: user.role || 'user'
        };
    },

    async update(id, updates) {
        // Get old data first
        const { data: oldData } = await supabase
            .from('customers')
            .select()
            .eq('id', id)
            .single();

        const { data, error } = await supabase
            .from('customers')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        // Activity logging (simplified)
        if (!error && data) {
            console.log(`Customer updated: ${data.company_name} (${data.customer_code})`);
        }

        return { data, error };
    },

    async delete(id) {
        try {
            console.log('Starting customer deletion for ID:', id);

            // Get data before deletion
            const { data: oldData, error: selectError } = await supabase
                .from('customers')
                .select()
                .eq('id', id)
                .single();

            if (selectError) {
                console.error('Error fetching customer before delete:', selectError);
                return { error: selectError };
            }

            if (!oldData) {
                console.error('Customer not found for ID:', id);
                return { error: { message: 'Customer not found' } };
            }

            console.log('Found customer to delete:', oldData.company_name, oldData.customer_code);

            // Perform deletion
            const { error: deleteError } = await supabase
                .from('customers')
                .delete()
                .eq('id', id);

            if (deleteError) {
                console.error('Delete operation failed:', deleteError);
                return { error: deleteError };
            }

            console.log('Delete operation completed successfully');

            // Verify deletion by trying to fetch the record again
            const { data: verifyData } = await supabase
                .from('customers')
                .select()
                .eq('id', id)
                .single();

            if (verifyData) {
                console.warn('Warning: Customer still exists after delete operation');
                return { error: { message: 'Delete operation did not complete properly' } };
            }

            console.log(`Customer successfully deleted: ${oldData.company_name} (${oldData.customer_code})`);
            return { error: null };

        } catch (error) {
            console.error('Unexpected error during customer deletion:', error);
            return { error };
        }
    },

    async searchByName(searchTerm) {
        const { data, error } = await supabase
            .from('customers')
            .select()
            .or(`company_name.ilike.%${searchTerm}%,contact_person.ilike.%${searchTerm}%,customer_code.ilike.%${searchTerm}%`)
            .eq('is_active', true)
            .order('company_name')
            .limit(10);
        return { data, error };
    },

    // Get customer balance and transactions
    async getCustomerBalance(customerId) {
        try {
            // Try to use the RPC function first
            const { data, error } = await supabase.rpc('get_customer_balance', {
                p_customer_id: customerId
            });

            if (!error) {
                return { data, error };
            }
        } catch (rpcError) {
            console.warn('RPC function not available, calculating balance manually');
        }

        // Fallback: Calculate balance manually
        try {
            const { data: transactions, error } = await supabase
                .from('customer_transactions')
                .select('transaction_type, amount')
                .eq('customer_id', customerId);

            if (error) return { data: null, error };

            const balance = transactions?.reduce((total, t) => {
                if (t.transaction_type === 'Satış' || t.transaction_type === 'Alacak' || t.transaction_type === 'Tahsilat') {
                    return total + t.amount;
                } else if (t.transaction_type === 'Alış' || t.transaction_type === 'Borç' || t.transaction_type === 'Ödeme') {
                    return total - t.amount;
                }
                return total;
            }, 0) || 0;

            return { data: { balance }, error: null };
        } catch (fallbackError) {
            return { data: { balance: 0 }, error: fallbackError };
        }
    },

    // Get customer transactions
    async getCustomerTransactions(customerId, startDate = null, endDate = null) {
        let query = supabase
            .from('customer_transactions')
            .select('*')
            .eq('customer_id', customerId)
            .order('transaction_date', { ascending: false });

        if (startDate) {
            query = query.gte('transaction_date', startDate);
        }
        if (endDate) {
            query = query.lte('transaction_date', endDate);
        }

        const { data, error } = await query;
        return { data, error };
    },

    // Add customer transaction (payment, sale, purchase etc.)
    async addTransaction(transaction) {
        const { data, error } = await supabase
            .from('customer_transactions')
            .insert([transaction])
            .select()
            .single();

        // Activity logging
        if (!error && data) {
            try {
                const userInfo = this.getCurrentUserInfo();
                await supabase.rpc('log_user_activity', {
                    p_action_type: 'CREATE',
                    p_table_name: 'customer_transactions',
                    p_record_id: data.id,
                    p_description: `Cari hareket eklendi: ${data.transaction_type} - ${data.amount} TL`,
                    p_new_values: data,
                    p_user_id: userInfo.id,
                    p_user_name: userInfo.name,
                    p_user_role: userInfo.role
                });
            } catch (logError) {
                console.warn('Transaction activity logging failed:', logError);
            }
        }

        return { data, error };
    },

    // Delete customer transaction
    async deleteTransaction(transactionId) {
        const { data: oldData } = await supabase
            .from('customer_transactions')
            .select()
            .eq('id', transactionId)
            .single();

        const { error } = await supabase
            .from('customer_transactions')
            .delete()
            .eq('id', transactionId);

        // Activity logging
        if (!error && oldData) {
            try {
                const userInfo = this.getCurrentUserInfo();
                await supabase.rpc('log_user_activity', {
                    p_action_type: 'DELETE',
                    p_table_name: 'customer_transactions',
                    p_record_id: oldData.id,
                    p_description: `Cari hareket silindi: ${oldData.transaction_type} - ${oldData.amount} TL`,
                    p_old_values: oldData,
                    p_user_id: userInfo.id,
                    p_user_name: userInfo.name,
                    p_user_role: userInfo.role
                });
            } catch (logError) {
                console.warn('Transaction delete activity logging failed:', logError);
            }
        }

        return { error };
    },

    // Get customer statement
    async getCustomerStatement(customerId, startDate, endDate) {
        const { data, error } = await supabase.rpc('get_customer_statement', {
            p_customer_id: customerId,
            p_start_date: startDate,
            p_end_date: endDate
        });
        return { data, error };
    },

    // Get aging report
    async getAgingReport(customerId = null) {
        try {
            // Try to use the RPC function first
            const { data, error } = await supabase.rpc('get_aging_report', {
                p_customer_id: customerId
            });

            if (!error) {
                return { data, error };
            }
        } catch (rpcError) {
            console.warn('RPC function not available, using simplified aging report');
        }

        // Fallback: Simplified aging report
        try {
            let customerQuery = supabase
                .from('customers')
                .select('id, company_name, customer_code');

            if (customerId) {
                customerQuery = customerQuery.eq('id', customerId);
            }

            const { data: customers, error: customersError } = await customerQuery;
            if (customersError) return { data: null, error: customersError };

            const agingData = await Promise.all(customers.map(async (customer) => {
                const { data: transactions } = await supabase
                    .from('customer_transactions')
                    .select('transaction_type, amount, transaction_date')
                    .eq('customer_id', customer.id)
                    .in('transaction_type', ['Satış', 'Alış', 'Borç', 'Alacak']);

                let current = 0, days30 = 0, days60 = 0, days90 = 0, daysOver90 = 0;

                transactions?.forEach(t => {
                    const daysOld = Math.floor((new Date() - new Date(t.transaction_date)) / (1000 * 60 * 60 * 24));
                    const amount = (t.transaction_type === 'Satış' || t.transaction_type === 'Alacak') ? t.amount : -t.amount;

                    if (daysOld <= 0) current += amount;
                    else if (daysOld <= 30) days30 += amount;
                    else if (daysOld <= 60) days60 += amount;
                    else if (daysOld <= 90) days90 += amount;
                    else daysOver90 += amount;
                });

                const total = current + days30 + days60 + days90 + daysOver90;

                return {
                    customer_id: customer.id,
                    company_name: customer.company_name,
                    current: current,
                    days_30: days30,
                    days_60: days60,
                    days_90: days90,
                    days_over_90: daysOver90,
                    total: total
                };
            }));

            // Filter out customers with zero balance
            const filteredData = agingData.filter(item => item.total !== 0);

            return { data: filteredData, error: null };
        } catch (fallbackError) {
            return { data: [], error: fallbackError };
        }
    }
};

// Task Personnel Service
export const taskPersonnelService = {
    async getAll() {
        try {
            // Try personnel table first, fallback to task_personnel if it exists
            let { data, error } = await supabase
                .from('personnel')
                .select(`
                    id,
                    first_name,
                    last_name,
                    position,
                    status
                `)
                .order('first_name');

            // If personnel table works, transform data to match expected format
            if (!error && data) {
                data = data.map(person => ({
                    id: person.id,
                    name: `${person.first_name} ${person.last_name}`,
                    position: person.position,
                    is_active: person.status === 'Aktif'
                }));
            } else {
                // Fallback to task_personnel table
                const result = await supabase
                    .from('task_personnel')
                    .select()
                    .order('name');
                data = result.data;
                error = result.error;
            }
            
            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            console.error('Error fetching task personnel:', error);
            return { data: null, error };
        }
    },

    async getActive() {
        try {
            console.log('Fetching active task personnel...');

            // Try personnel table first, fallback to task_personnel if it exists
            let { data, error } = await supabase
                .from('personnel')
                .select(`
                    id,
                    first_name,
                    last_name,
                    position,
                    status
                `)
                .eq('status', 'Aktif')
                .order('first_name');

            // If personnel table works, transform data to match expected format
            if (!error && data) {
                data = data.map(person => ({
                    id: person.id,
                    name: `${person.first_name} ${person.last_name}`,
                    position: person.position,
                    is_active: true
                }));
            } else {
                // Fallback to task_personnel table
                const result = await supabase
                    .from('task_personnel')
                    .select()
                    .eq('is_active', true)
                    .order('name');
                data = result.data;
                error = result.error;
            }
            
            if (error) {
                console.error('Supabase task personnel fetch error:', error);
                throw error;
            }
            console.log('Active task personnel fetched successfully:', data);
            return { data, error: null };
        } catch (error) {
            console.error('Error fetching active task personnel:', error);
            return { data: null, error };
        }
    },

    async add(personnelData) {
        try {
            console.log('Adding task personnel with data:', personnelData);
            
            const { data, error } = await supabase
                .from('task_personnel')
                .insert([{
                    ...personnelData,
                    is_active: true,
                    created_at: new Date().toISOString()
                }])
                .select()
                .single();
            
            if (error) {
                console.error('Supabase task personnel insert error details:', error);
                
                // Try with simpler approach if RLS is blocking
                if (error.code === 'PGRST301' || error.message.includes('row-level security')) {
                    console.log('RLS blocking personnel insert, trying alternative approach...');
                }
                throw error;
            }
            console.log('Task personnel added successfully:', data);
            return { data, error: null };
        } catch (error) {
            console.error('Error adding task personnel:', error);
            return { data: null, error };
        }
    },

    async update(id, updates) {
        try {
            const { data, error } = await supabase
                .from('task_personnel')
                .update(updates)
                .eq('id', id)
                .select()
                .single();
            
            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            console.error('Error updating task personnel:', error);
            return { data: null, error };
        }
    },

    async delete(id) {
        try {
            const { error } = await supabase
                .from('task_personnel')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            return { error: null };
        } catch (error) {
            console.error('Error deleting task personnel:', error);
            return { error };
        }
    }
};

