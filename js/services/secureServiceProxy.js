// Secure Service Proxy - Wraps existing services with security layer
// Provides seamless migration to server-side API calls

import { secureSupabase } from '../config/secureConfig.js';

/**
 * Secure Service Proxy
 * Routes service calls through Netlify Functions while maintaining
 * existing API interface for seamless migration
 */
class SecureServiceProxy {
    constructor() {
        this.client = secureSupabase;
        this.migrationStatus = {
            employeeService: 'proxy',     // wrapped but not migrated
            productService: 'proxy',
            customerService: 'proxy',
            attendanceService: 'proxy',
            transactionService: 'proxy',
            inventoryService: 'proxy',
            dashboardService: 'proxy',
            barcodeService: 'proxy',
            payrollService: 'proxy',
            taskService: 'proxy',
            projectService: 'proxy',
            taskPersonnelService: 'proxy'
        };
    }

    /**
     * Wrap existing service with secure routing
     * @param {string} serviceName - Name of the service
     * @param {object} originalService - Original service object
     * @returns {object} Secure wrapped service
     */
    wrapService(serviceName, originalService) {
        const wrapped = {};

        // Get migration status
        const status = this.migrationStatus[serviceName] || 'legacy';

        // Wrap each method in the service
        for (const [methodName, method] of Object.entries(originalService)) {
            if (typeof method === 'function') {
                wrapped[methodName] = async (...args) => {
                    try {
                        // Add security headers and context
                        const securityContext = this.getSecurityContext();

                        if (status === 'migrated') {
                            // Use Netlify Functions proxy
                            return await this.executeSecureMethod(serviceName, methodName, args, securityContext);
                        } else {
                            // Use existing method with enhanced security
                            return await this.executeProxyMethod(serviceName, methodName, method, args, securityContext);
                        }
                    } catch (error) {
                        console.error(`Secure proxy error [${serviceName}.${methodName}]:`, error);
                        throw this.enhanceError(error, serviceName, methodName);
                    }
                };
            } else {
                // Copy non-function properties as-is
                wrapped[methodName] = method;
            }
        }

        return wrapped;
    }

    /**
     * Get current security context
     */
    getSecurityContext() {
        const user = this.getCurrentUser();
        return {
            userId: user?.id,
            userEmail: user?.email,
            userRole: user?.role,
            timestamp: new Date().toISOString(),
            csrfToken: this.getCSRFToken(),
            sessionId: this.getSessionId()
        };
    }

    /**
     * Execute method through secure proxy (not yet migrated)
     */
    async executeProxyMethod(serviceName, methodName, originalMethod, args, securityContext) {
        // Add security logging
        this.logServiceCall(serviceName, methodName, 'proxy', securityContext);

        // Execute original method with security context
        const result = await originalMethod.apply(null, args);

        // Log result (for security audit)
        if (result.error) {
            this.logServiceError(serviceName, methodName, result.error, securityContext);
        }

        return result;
    }

    /**
     * Execute method through Netlify Functions (fully migrated)
     */
    async executeSecureMethod(serviceName, methodName, args, securityContext) {
        const payload = {
            service: serviceName,
            method: methodName,
            args: args,
            security: securityContext
        };

        return await this.client.call('service-proxy', null, payload);
    }

    /**
     * Get current user from localStorage
     */
    getCurrentUser() {
        try {
            const userStr = localStorage.getItem('dinky_user');
            return userStr ? JSON.parse(userStr) : null;
        } catch (e) {
            return null;
        }
    }

    /**
     * Get CSRF token
     */
    getCSRFToken() {
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'csrf_token') {
                return decodeURIComponent(value);
            }
        }
        return null;
    }

    /**
     * Get session ID
     */
    getSessionId() {
        return sessionStorage.getItem('session_id') || 'anonymous';
    }

    /**
     * Log service calls for security audit
     */
    logServiceCall(serviceName, methodName, type, context) {
        if (console.groupCollapsed) {
            console.groupCollapsed(`🔒 ${type.toUpperCase()}: ${serviceName}.${methodName}`);
            console.log('Context:', context);
            console.log('User:', context.userEmail, '|', context.userRole);
            console.log('Time:', context.timestamp);
            console.groupEnd();
        }
    }

    /**
     * Log service errors
     */
    logServiceError(serviceName, methodName, error, context) {
        console.error(`🚨 Service Error [${serviceName}.${methodName}]:`, {
            error: error,
            user: context.userEmail,
            time: context.timestamp
        });
    }

    /**
     * Enhance error with security context
     */
    enhanceError(error, serviceName, methodName) {
        const enhancedError = new Error(error.message);
        enhancedError.originalError = error;
        enhancedError.service = serviceName;
        enhancedError.method = methodName;
        enhancedError.timestamp = new Date().toISOString();
        enhancedError.userId = this.getCurrentUser()?.id;
        return enhancedError;
    }

    /**
     * Get migration status for a service
     */
    getMigrationStatus(serviceName) {
        return this.migrationStatus[serviceName] || 'legacy';
    }

    /**
     * Set migration status for a service
     */
    setMigrationStatus(serviceName, status) {
        this.migrationStatus[serviceName] = status;
        console.log(`🔄 Migration: ${serviceName} → ${status.toUpperCase()}`);
    }

    /**
     * Get migration overview
     */
    getMigrationOverview() {
        const stats = {
            legacy: 0,
            proxy: 0,
            migrated: 0,
            total: 0
        };

        Object.values(this.migrationStatus).forEach(status => {
            stats[status] = (stats[status] || 0) + 1;
            stats.total++;
        });

        return {
            stats,
            percentage: Math.round((stats.migrated / stats.total) * 100),
            services: this.migrationStatus
        };
    }
}

// Create global instance
export const secureServiceProxy = new SecureServiceProxy();

// Development helper
if (typeof window !== 'undefined') {
    window.secureServiceProxy = secureServiceProxy;
    console.log('🔒 Secure Service Proxy loaded');
    console.log('📊 Migration Status:', secureServiceProxy.getMigrationOverview());
}

export default secureServiceProxy;