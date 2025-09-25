// Secure Services - Migration layer for all Supabase services
// Provides secure proxy wrapping while maintaining API compatibility

import { secureServiceProxy } from './secureServiceProxy.js';

// Import original services (legacy)
import {
    employeeService as originalEmployeeService,
    productService as originalProductService,
    customerService as originalCustomerService,
    attendanceService as originalAttendanceService,
    transactionService as originalTransactionService,
    inventoryService as originalInventoryService,
    dashboardService as originalDashboardService,
    barcodeService as originalBarcodeService,
    payrollService as originalPayrollService,
    taskService as originalTaskService,
    projectService as originalProjectService,
    taskPersonnelService as originalTaskPersonnelService,
    supabase
} from './supabaseService.js';

// Wrap services with secure proxy
export const employeeService = secureServiceProxy.wrapService('employeeService', originalEmployeeService);
export const productService = secureServiceProxy.wrapService('productService', originalProductService);
export const customerService = secureServiceProxy.wrapService('customerService', originalCustomerService);
export const attendanceService = secureServiceProxy.wrapService('attendanceService', originalAttendanceService);
export const transactionService = secureServiceProxy.wrapService('transactionService', originalTransactionService);
export const inventoryService = secureServiceProxy.wrapService('inventoryService', originalInventoryService);
export const dashboardService = secureServiceProxy.wrapService('dashboardService', originalDashboardService);
export const barcodeService = secureServiceProxy.wrapService('barcodeService', originalBarcodeService);
export const payrollService = secureServiceProxy.wrapService('payrollService', originalPayrollService);
export const taskService = secureServiceProxy.wrapService('taskService', originalTaskService);
export const projectService = secureServiceProxy.wrapService('projectService', originalProjectService);
export const taskPersonnelService = secureServiceProxy.wrapService('taskPersonnelService', originalTaskPersonnelService);

// Export supabase client (for gradual migration)
export { supabase };

// Migration utilities
export const migrationUtils = {
    /**
     * Get migration status overview
     */
    getStatus() {
        return secureServiceProxy.getMigrationOverview();
    },

    /**
     * Migrate a service to Netlify Functions
     */
    migrateService(serviceName) {
        secureServiceProxy.setMigrationStatus(serviceName, 'migrated');
        console.log(`✅ Service migrated: ${serviceName}`);
    },

    /**
     * Rollback a service to legacy mode
     */
    rollbackService(serviceName) {
        secureServiceProxy.setMigrationStatus(serviceName, 'legacy');
        console.log(`⬇️ Service rolled back: ${serviceName}`);
    },

    /**
     * Test service connectivity
     */
    async testService(serviceName, methodName = 'getAll') {
        try {
            console.log(`🧪 Testing ${serviceName}.${methodName}...`);

            // CSP-safe service mapping (no eval())
            const serviceMap = {
                employeeService,
                productService,
                customerService,
                attendanceService,
                transactionService,
                inventoryService,
                dashboardService,
                barcodeService,
                payrollService,
                taskService,
                projectService,
                taskPersonnelService
            };

            const service = serviceMap[serviceName];
            if (!service) {
                throw new Error(`Service not found: ${serviceName}`);
            }

            if (!service[methodName]) {
                throw new Error(`Method not found: ${serviceName}.${methodName}`);
            }

            const result = await service[methodName]();
            console.log(`✅ Test passed: ${serviceName}.${methodName}`);
            return { success: true, result };
        } catch (error) {
            console.error(`❌ Test failed: ${serviceName}.${methodName}`, error);
            return { success: false, error };
        }
    },

    /**
     * Bulk test all services
     */
    async testAllServices() {
        const serviceTests = [
            { name: 'employeeService', method: 'getAll' },
            { name: 'productService', method: 'getAll' },
            { name: 'customerService', method: 'getAll' },
            { name: 'attendanceService', method: 'getAll' },
            { name: 'dashboardService', method: 'getStats' } // ✅ Fixed method name
        ];

        const results = {};
        for (const serviceTest of serviceTests) {
            results[serviceTest.name] = await this.testService(serviceTest.name, serviceTest.method);
        }

        return results;
    }
};

// Development helpers
if (typeof window !== 'undefined') {
    window.migrationUtils = migrationUtils;

    console.log(`
🔒 SECURE SERVICES LOADED
📊 Migration Status: ${migrationUtils.getStatus().percentage}% complete
🧪 Test Command: migrationUtils.testAllServices()
🔄 Migrate Command: migrationUtils.migrateService('employeeService')
    `);
}

// Export all for compatibility
export default {
    employeeService,
    productService,
    customerService,
    attendanceService,
    transactionService,
    inventoryService,
    dashboardService,
    barcodeService,
    payrollService,
    taskService,
    projectService,
    taskPersonnelService,
    supabase,
    migrationUtils
};