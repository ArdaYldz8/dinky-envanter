// Security Utilities for XSS Prevention and Input Validation

/**
 * HTML karakterlerini escape eder
 * @param {string} str - Escape edilecek string
 * @returns {string} Güvenli HTML string
 */
export function escapeHtml(str) {
    if (typeof str !== 'string') return '';

    const htmlEscapes = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '/': '&#x2F;'
    };

    return str.replace(/[&<>"'\/]/g, char => htmlEscapes[char]);
}

/**
 * Güvenli DOM element oluşturur
 * @param {string} tag - Element tag adı
 * @param {Object} attributes - Element özellikleri
 * @param {string|Node} content - Element içeriği
 * @returns {HTMLElement}
 */
export function createElement(tag, attributes = {}, content = '') {
    const element = document.createElement(tag);

    // Güvenli attribute set etme
    Object.entries(attributes).forEach(([key, value]) => {
        if (key === 'className') {
            element.className = value;
        } else if (key === 'dataset') {
            Object.entries(value).forEach(([dataKey, dataValue]) => {
                element.dataset[dataKey] = dataValue;
            });
        } else if (key.startsWith('on')) {
            // Event listener'ları güvenli şekilde ekle
            const eventName = key.substring(2).toLowerCase();
            if (typeof value === 'function') {
                element.addEventListener(eventName, value);
            }
        } else {
            element.setAttribute(key, value);
        }
    });

    // İçerik ekleme
    if (content) {
        if (typeof content === 'string') {
            element.textContent = content;
        } else if (content instanceof Node) {
            element.appendChild(content);
        }
    }

    return element;
}

/**
 * Güvenli HTML template renderer
 * @param {string} template - Template string
 * @param {Object} data - Template data
 * @returns {string} Güvenli render edilmiş HTML
 */
export function renderTemplate(template, data = {}) {
    // Template içindeki değişkenleri güvenli şekilde replace et
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        const value = data[key];
        if (value === undefined || value === null) return '';
        return escapeHtml(String(value));
    });
}

/**
 * Input validation
 * @param {string} value - Validate edilecek değer
 * @param {Object} rules - Validation kuralları
 * @returns {Object} {valid: boolean, errors: string[]}
 */
export function validateInput(value, rules = {}) {
    const errors = [];

    // Required check
    if (rules.required && (!value || value.trim() === '')) {
        errors.push('Bu alan zorunludur');
    }

    // Min length
    if (rules.minLength && value.length < rules.minLength) {
        errors.push(`En az ${rules.minLength} karakter olmalı`);
    }

    // Max length
    if (rules.maxLength && value.length > rules.maxLength) {
        errors.push(`En fazla ${rules.maxLength} karakter olmalı`);
    }

    // Email validation
    if (rules.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
            errors.push('Geçerli bir email adresi giriniz');
        }
    }

    // Phone validation
    if (rules.phone) {
        const phoneRegex = /^[\d\s\-\+\(\)]+$/;
        if (!phoneRegex.test(value)) {
            errors.push('Geçerli bir telefon numarası giriniz');
        }
    }

    // Number validation
    if (rules.number) {
        if (isNaN(value)) {
            errors.push('Sayısal bir değer giriniz');
        } else {
            const num = parseFloat(value);
            if (rules.min !== undefined && num < rules.min) {
                errors.push(`Minimum değer: ${rules.min}`);
            }
            if (rules.max !== undefined && num > rules.max) {
                errors.push(`Maximum değer: ${rules.max}`);
            }
        }
    }

    // Pattern validation
    if (rules.pattern) {
        const regex = new RegExp(rules.pattern);
        if (!regex.test(value)) {
            errors.push(rules.patternMessage || 'Geçersiz format');
        }
    }

    // Custom validator
    if (rules.custom && typeof rules.custom === 'function') {
        const customError = rules.custom(value);
        if (customError) {
            errors.push(customError);
        }
    }

    // SQL Injection prevention
    if (rules.preventSQLInjection) {
        const sqlPatterns = [
            /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE)\b)/gi,
            /(--|\||;|\/\*|\*\/)/g,
            /(\bOR\b.*\b1\s*=\s*1)/gi,
            /(\bAND\b.*\b1\s*=\s*1)/gi
        ];

        for (const pattern of sqlPatterns) {
            if (pattern.test(value)) {
                errors.push('Güvenlik nedeniyle bu karakterler kullanılamaz');
                break;
            }
        }
    }

    // XSS prevention
    if (rules.preventXSS) {
        const xssPatterns = [
            /<script[^>]*>.*?<\/script>/gi,
            /<iframe[^>]*>.*?<\/iframe>/gi,
            /javascript:/gi,
            /on\w+\s*=/gi
        ];

        for (const pattern of xssPatterns) {
            if (pattern.test(value)) {
                errors.push('Güvenlik nedeniyle HTML/Script kodları kullanılamaz');
                break;
            }
        }
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Form validation helper
 * @param {HTMLFormElement} form - Form element
 * @param {Object} validationRules - Her input için validation kuralları
 * @returns {Object} {valid: boolean, errors: Object}
 */
export function validateForm(form, validationRules) {
    const formData = new FormData(form);
    const errors = {};
    let valid = true;

    for (const [fieldName, rules] of Object.entries(validationRules)) {
        const value = formData.get(fieldName);
        const validation = validateInput(value, rules);

        if (!validation.valid) {
            valid = false;
            errors[fieldName] = validation.errors;
        }
    }

    return { valid, errors };
}

/**
 * Sanitize file name
 * @param {string} fileName - Dosya adı
 * @returns {string} Güvenli dosya adı
 */
export function sanitizeFileName(fileName) {
    // Tehlikeli karakterleri kaldır
    return fileName
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .replace(/\.{2,}/g, '_')
        .substring(0, 255); // Max file name length
}

/**
 * Rate limiting için basit bir throttle fonksiyonu
 * @param {Function} func - Throttle edilecek fonksiyon
 * @param {number} limit - Milisaniye cinsinden limit
 * @returns {Function}
 */
export function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * CSRF token generator (cryptographically secure 256-bit)
 * @returns {string} CSRF token
 */
export function generateCSRFToken() {
    const array = new Uint8Array(32); // 256 bits
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Cookie-based CSRF token management (Double Submit Cookie Pattern)
 * Secure against CSRF attacks while maintaining usability
 */
export const csrfManager = {
    /**
     * Get or create CSRF token from cookie
     * @returns {string} CSRF token
     */
    getToken() {
        let token = this.getTokenFromCookie();
        if (!token) {
            token = generateCSRFToken();
            this.setTokenCookie(token);
        }
        return token;
    },

    /**
     * Extract CSRF token from cookie
     * @returns {string|null} CSRF token or null
     */
    getTokenFromCookie() {
        const cookies = document.cookie.split('; ');
        const csrfCookie = cookies.find(row => row.startsWith('CSRF-TOKEN='));
        return csrfCookie ? csrfCookie.split('=')[1] : null;
    },

    /**
     * Set CSRF token in cookie with security attributes
     * @param {string} token - CSRF token to set
     */
    setTokenCookie(token) {
        const maxAge = 28800; // 8 hours (same as session)
        const secure = window.location.protocol === 'https:' ? 'Secure;' : '';

        // SameSite=Lax: Protects against CSRF while allowing normal navigation
        // NOT httpOnly: JavaScript needs to read it for Double Submit pattern
        document.cookie = `CSRF-TOKEN=${token}; Max-Age=${maxAge}; Path=/; SameSite=Lax; ${secure}`;
    },

    /**
     * Validate CSRF token (Double Submit pattern)
     * @param {string} requestToken - Token from request header/body
     * @returns {boolean} True if valid
     */
    validateToken(requestToken) {
        const cookieToken = this.getTokenFromCookie();

        if (!cookieToken || !requestToken) {
            return false;
        }

        // Constant-time comparison to prevent timing attacks
        return this.constantTimeCompare(cookieToken, requestToken);
    },

    /**
     * Constant-time string comparison
     * @param {string} a - First string
     * @param {string} b - Second string
     * @returns {boolean} True if equal
     */
    constantTimeCompare(a, b) {
        if (a.length !== b.length) {
            return false;
        }

        let result = 0;
        for (let i = 0; i < a.length; i++) {
            result |= a.charCodeAt(i) ^ b.charCodeAt(i);
        }
        return result === 0;
    },

    /**
     * Refresh CSRF token (on login, password change, or session fixation prevention)
     * @returns {string} New CSRF token
     */
    refreshToken() {
        const token = generateCSRFToken();
        this.setTokenCookie(token);
        return token;
    },

    /**
     * Clear CSRF token (on logout)
     */
    clearToken() {
        document.cookie = 'CSRF-TOKEN=; Max-Age=0; Path=/; SameSite=Lax;';
    },

    /**
     * Inject CSRF token into fetch request
     * @param {RequestInit} options - Fetch options
     * @returns {RequestInit} Options with CSRF token
     */
    injectToken(options = {}) {
        const token = this.getToken();

        return {
            ...options,
            headers: {
                ...options.headers,
                'X-CSRF-Token': token
            }
        };
    },

    /**
     * Add CSRF token to FormData
     * @param {FormData} formData - Form data object
     * @returns {FormData} Form data with CSRF token
     */
    addToFormData(formData) {
        const token = this.getToken();
        formData.append('csrf_token', token);
        return formData;
    },

    /**
     * Add hidden CSRF input to form
     * @param {HTMLFormElement} form - Form element
     */
    addToForm(form) {
        const token = this.getToken();

        // Remove existing CSRF input if present
        const existingInput = form.querySelector('input[name="csrf_token"]');
        if (existingInput) {
            existingInput.value = token;
            return;
        }

        // Create new hidden input
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = 'csrf_token';
        input.value = token;
        form.appendChild(input);
    }
};

export default {
    escapeHtml,
    createElement,
    renderTemplate,
    validateInput,
    validateForm,
    sanitizeFileName,
    throttle,
    csrfManager
};