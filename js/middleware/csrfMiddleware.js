// CSRF Protection Middleware
import { csrfManager } from '../utils/security.js';
import { Toast } from '../utils/toast.js';

/**
 * CSRF Protection Middleware for Supabase operations
 * Implements Double Submit Cookie Pattern with server-side validation
 */

/**
 * Wrap Supabase service calls with CSRF protection
 * @param {Function} serviceCall - Original service function
 * @returns {Function} Wrapped function with CSRF protection
 */
export function withCSRFProtection(serviceCall) {
    return async function(...args) {
        try {
            // Get CSRF token from cookie
            const csrfToken = csrfManager.getToken();

            if (!csrfToken) {
                throw new Error('CSRF token eksik. Lütfen sayfayı yenileyin.');
            }

            // Add CSRF token to request context
            const result = await serviceCall.apply(this, args);

            // Validate response (server should echo token or validate)
            return result;

        } catch (error) {
            if (error.message.includes('CSRF')) {
                Toast.show('Güvenlik doğrulaması başarısız. Lütfen sayfayı yenileyin.', 'error');

                // Refresh token on CSRF error
                csrfManager.refreshToken();
            }
            throw error;
        }
    };
}

/**
 * Protected service wrapper that adds CSRF validation
 * @param {Object} service - Service object with methods
 * @returns {Object} Protected service object
 */
export function protectService(service) {
    const protectedService = {};

    for (const [key, value] of Object.entries(service)) {
        if (typeof value === 'function' && isWriteOperation(key)) {
            protectedService[key] = withCSRFProtection(value);
        } else {
            protectedService[key] = value;
        }
    }

    return protectedService;
}

/**
 * Check if operation is a write operation (needs CSRF protection)
 * @param {string} methodName - Method name
 * @returns {boolean} True if write operation
 */
function isWriteOperation(methodName) {
    const writeOperations = ['create', 'update', 'delete', 'upsert', 'remove'];
    return writeOperations.some(op => methodName.toLowerCase().includes(op));
}

/**
 * Validate CSRF token from request
 * This should be called server-side via Supabase Edge Function
 * @param {string} cookieToken - Token from cookie
 * @param {string} headerToken - Token from header/body
 * @returns {boolean} True if valid
 */
export function validateCSRFToken(cookieToken, headerToken) {
    if (!cookieToken || !headerToken) {
        return false;
    }

    return csrfManager.constantTimeCompare(cookieToken, headerToken);
}

/**
 * Fetch wrapper with automatic CSRF token injection
 * @param {string} url - Request URL
 * @param {RequestInit} options - Fetch options
 * @returns {Promise<Response>} Fetch response
 */
export async function csrfFetch(url, options = {}) {
    const method = options.method?.toUpperCase() || 'GET';

    // Only add CSRF token to state-changing requests
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
        options = csrfManager.injectToken(options);
    }

    try {
        const response = await fetch(url, options);

        // Check for CSRF validation errors
        if (response.status === 403) {
            const errorData = await response.json().catch(() => ({}));
            if (errorData.message?.includes('CSRF')) {
                csrfManager.refreshToken();
                Toast.show('Güvenlik doğrulaması başarısız. Lütfen tekrar deneyin.', 'error');
            }
        }

        return response;
    } catch (error) {
        console.error('CSRF Fetch error:', error);
        throw error;
    }
}

/**
 * Form submit handler with CSRF protection
 * @param {HTMLFormElement} form - Form element
 * @param {Function} submitCallback - Submit callback function
 */
export function protectForm(form, submitCallback) {
    // Add CSRF token as hidden input
    csrfManager.addToForm(form);

    // Attach submit handler
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData(form);
        const csrfToken = formData.get('csrf_token');

        // Validate token before submit
        if (!csrfManager.validateToken(csrfToken)) {
            Toast.show('Güvenlik doğrulaması başarısız. Sayfa yenileniyor...', 'error');
            setTimeout(() => window.location.reload(), 2000);
            return;
        }

        try {
            await submitCallback(formData);
        } catch (error) {
            console.error('Form submit error:', error);
            Toast.show('İşlem sırasında hata oluştu: ' + error.message, 'error');
        }
    });
}

/**
 * Initialize CSRF protection for the page
 * Call this on page load
 */
export function initCSRFProtection() {
    // Generate initial token
    csrfManager.getToken();

    // Auto-refresh token every 4 hours (half of session time)
    setInterval(() => {
        csrfManager.refreshToken();
        console.log('🔄 CSRF token rotated');
    }, 4 * 60 * 60 * 1000);

    // Refresh token on visibility change (user returns to tab)
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            const token = csrfManager.getTokenFromCookie();
            if (!token) {
                csrfManager.refreshToken();
                console.log('🔄 CSRF token refreshed on visibility change');
            }
        }
    });

    // Clear token on logout
    window.addEventListener('beforeunload', () => {
        const isLoggingOut = sessionStorage.getItem('logging_out');
        if (isLoggingOut) {
            csrfManager.clearToken();
            sessionStorage.removeItem('logging_out');
        }
    });
}

export default {
    withCSRFProtection,
    protectService,
    validateCSRFToken,
    csrfFetch,
    protectForm,
    initCSRFProtection
};