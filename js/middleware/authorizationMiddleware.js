// Authorization Middleware - Role-Based Access Control (RBAC)
import { supabase } from '../services/supabaseClient.js';
import { Toast } from '../utils/toast.js';

/**
 * Permission Matrix - Defines what each role can do
 */
const PERMISSION_MATRIX = {
    admin: {
        employees: ['create', 'read', 'update', 'delete'],
        products: ['create', 'read', 'update', 'delete'],
        inventory: ['create', 'read', 'update', 'delete'],
        customers: ['create', 'read', 'update', 'delete'],
        transactions: ['create', 'read', 'update', 'delete'],
        projects: ['create', 'read', 'update', 'delete'],
        tasks: ['create', 'read', 'update', 'delete'],
        attendance: ['create', 'read', 'update', 'delete'],
        activity_logs: ['read'],
        settings: ['read', 'update']
    },
    warehouse: {
        employees: ['read'], // active only
        products: ['create', 'read', 'update', 'delete'],
        inventory: ['create', 'read', 'update', 'delete'],
        customers: ['read'],
        transactions: [],
        projects: ['read'],
        tasks: [],
        attendance: ['read'],
        activity_logs: [],
        settings: []
    },
    accounting: {
        employees: ['create', 'read', 'update', 'delete'],
        products: ['read'],
        inventory: ['read'],
        customers: ['create', 'read', 'update', 'delete'],
        transactions: ['create', 'read', 'update', 'delete'],
        projects: ['create', 'read', 'update'], // no delete
        tasks: ['create', 'read', 'update', 'delete'],
        attendance: ['create', 'read', 'update', 'delete'],
        activity_logs: ['read'],
        settings: ['read', 'update']
    }
};

/**
 * Get current user info from localStorage
 * @returns {Object|null} User object or null
 */
function getCurrentUser() {
    const userStr = localStorage.getItem('dinky_user');
    if (!userStr) return null;

    try {
        return JSON.parse(userStr);
    } catch (error) {
        console.error('Failed to parse user data:', error);
        return null;
    }
}

/**
 * Check if user has permission for resource and action
 * @param {string} resource - Resource name (employees, products, etc.)
 * @param {string} action - Action type (create, read, update, delete)
 * @returns {boolean} True if user has permission
 */
export function checkPermission(resource, action) {
    const user = getCurrentUser();

    if (!user || !user.role) {
        console.warn('Authorization: No user or role found');
        return false;
    }

    const userPermissions = PERMISSION_MATRIX[user.role];

    if (!userPermissions) {
        console.warn(`Authorization: Unknown role '${user.role}'`);
        return false;
    }

    const resourcePermissions = userPermissions[resource];

    if (!resourcePermissions) {
        console.warn(`Authorization: Unknown resource '${resource}'`);
        return false;
    }

    const hasPermission = resourcePermissions.includes(action);

    if (!hasPermission) {
        console.warn(`Authorization: User '${user.email}' (${user.role}) denied ${action} on ${resource}`);
    }

    return hasPermission;
}

/**
 * Check if user has ANY of the specified permissions
 * @param {string} resource - Resource name
 * @param {string[]} actions - Array of actions
 * @returns {boolean} True if user has at least one permission
 */
export function hasAnyPermission(resource, actions) {
    return actions.some(action => checkPermission(resource, action));
}

/**
 * Check if user has ALL specified permissions
 * @param {string} resource - Resource name
 * @param {string[]} actions - Array of actions
 * @returns {boolean} True if user has all permissions
 */
export function hasAllPermissions(resource, actions) {
    return actions.every(action => checkPermission(resource, action));
}

/**
 * Assert permission - throws error if not authorized
 * @param {string} resource - Resource name
 * @param {string} action - Action type
 * @throws {Error} If user doesn't have permission
 */
export function assertPermission(resource, action) {
    if (!checkPermission(resource, action)) {
        const user = getCurrentUser();
        const error = new Error(`Yetkiniz yok: ${action} işlemi için '${resource}' kaynağına erişim reddedildi`);
        error.code = 'PERMISSION_DENIED';
        error.details = {
            user: user?.email,
            role: user?.role,
            resource,
            action
        };

        // Log unauthorized attempt
        logUnauthorizedAttempt(resource, action).catch(console.error);

        throw error;
    }
}

/**
 * Require specific role
 * @param {string|string[]} requiredRoles - Required role(s)
 * @returns {boolean} True if user has required role
 */
export function requireRole(requiredRoles) {
    const user = getCurrentUser();

    if (!user || !user.role) {
        return false;
    }

    const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
    return roles.includes(user.role);
}

/**
 * Assert role - throws error if user doesn't have required role
 * @param {string|string[]} requiredRoles - Required role(s)
 * @throws {Error} If user doesn't have required role
 */
export function assertRole(requiredRoles) {
    if (!requireRole(requiredRoles)) {
        const user = getCurrentUser();
        const roles = Array.isArray(requiredRoles) ? requiredRoles.join(', ') : requiredRoles;
        const error = new Error(`Bu işlem için gerekli rol: ${roles}`);
        error.code = 'ROLE_REQUIRED';
        error.details = {
            user: user?.email,
            currentRole: user?.role,
            requiredRoles
        };
        throw error;
    }
}

/**
 * Log unauthorized access attempt to security_events
 * @param {string} resource - Resource name
 * @param {string} action - Action type
 */
async function logUnauthorizedAttempt(resource, action) {
    const user = getCurrentUser();

    if (!user) return;

    try {
        await supabase.rpc('log_security_event', {
            p_event_type: 'PERMISSION_DENIED',
            p_user_id: user.id,
            p_action: action,
            p_resource: resource,
            p_status: 'blocked',
            p_severity: 'medium',
            p_metadata: {
                user_role: user.role,
                user_email: user.email,
                attempted_action: action,
                resource: resource
            }
        });
    } catch (error) {
        console.error('Failed to log unauthorized attempt:', error);
    }
}

/**
 * Protect service method with permission check
 * @param {Function} serviceMethod - Service method to protect
 * @param {string} resource - Resource name
 * @param {string} action - Action type
 * @returns {Function} Protected service method
 */
export function protectMethod(serviceMethod, resource, action) {
    return async function(...args) {
        try {
            assertPermission(resource, action);
            return await serviceMethod.apply(this, args);
        } catch (error) {
            if (error.code === 'PERMISSION_DENIED') {
                Toast.show(error.message, 'error');
            }
            throw error;
        }
    };
}

/**
 * Protect entire service with permission checks
 * @param {Object} service - Service object
 * @param {string} resource - Resource name
 * @param {Object} actionMap - Map of method names to actions
 * @returns {Object} Protected service
 */
export function protectService(service, resource, actionMap = {}) {
    const protectedService = {};

    // Default action mapping
    const defaultActionMap = {
        create: 'create',
        insert: 'create',
        getAll: 'read',
        getById: 'read',
        getActive: 'read',
        update: 'update',
        delete: 'delete',
        remove: 'delete'
    };

    const fullActionMap = { ...defaultActionMap, ...actionMap };

    for (const [methodName, method] of Object.entries(service)) {
        if (typeof method === 'function') {
            const action = fullActionMap[methodName];

            if (action) {
                protectedService[methodName] = protectMethod(method, resource, action);
            } else {
                // No protection needed (helper methods, etc.)
                protectedService[methodName] = method;
            }
        } else {
            // Non-function properties
            protectedService[methodName] = method;
        }
    }

    return protectedService;
}

/**
 * UI Element Permission Control
 * Hide/disable UI elements based on permissions
 */
export const UIPermissions = {
    /**
     * Show element only if user has permission
     * @param {HTMLElement} element - DOM element
     * @param {string} resource - Resource name
     * @param {string} action - Action type
     */
    showIfAllowed(element, resource, action) {
        if (!element) return;

        if (checkPermission(resource, action)) {
            element.style.display = '';
            element.removeAttribute('disabled');
        } else {
            element.style.display = 'none';
        }
    },

    /**
     * Disable element if user doesn't have permission
     * @param {HTMLElement} element - DOM element
     * @param {string} resource - Resource name
     * @param {string} action - Action type
     */
    disableIfNotAllowed(element, resource, action) {
        if (!element) return;

        if (!checkPermission(resource, action)) {
            element.setAttribute('disabled', 'disabled');
            element.style.opacity = '0.5';
            element.style.cursor = 'not-allowed';
            element.title = 'Bu işlem için yetkiniz yok';
        }
    },

    /**
     * Show element only if user has role
     * @param {HTMLElement} element - DOM element
     * @param {string|string[]} roles - Required role(s)
     */
    showIfRole(element, roles) {
        if (!element) return;

        if (requireRole(roles)) {
            element.style.display = '';
        } else {
            element.style.display = 'none';
        }
    }
};

/**
 * Get user permissions for resource
 * @param {string} resource - Resource name
 * @returns {string[]} Array of allowed actions
 */
export function getUserPermissions(resource) {
    const user = getCurrentUser();

    if (!user || !user.role) {
        return [];
    }

    const userPermissions = PERMISSION_MATRIX[user.role];

    if (!userPermissions) {
        return [];
    }

    return userPermissions[resource] || [];
}

/**
 * Check if user is admin
 * @returns {boolean} True if user is admin
 */
export function isAdmin() {
    return requireRole('admin');
}

/**
 * Check if user is warehouse
 * @returns {boolean} True if user is warehouse or admin
 */
export function isWarehouse() {
    return requireRole(['admin', 'warehouse']);
}

/**
 * Check if user is accounting
 * @returns {boolean} True if user is accounting or admin
 */
export function isAccounting() {
    return requireRole(['admin', 'accounting']);
}

export default {
    checkPermission,
    hasAnyPermission,
    hasAllPermissions,
    assertPermission,
    requireRole,
    assertRole,
    protectMethod,
    protectService,
    UIPermissions,
    getUserPermissions,
    isAdmin,
    isWarehouse,
    isAccounting,
    PERMISSION_MATRIX
};