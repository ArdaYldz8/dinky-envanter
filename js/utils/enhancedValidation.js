// Enhanced Validation Framework with DOMPurify and Real-time UI
// OWASP Best Practices 2025 - Defense in Depth

import { ValidationRules, getValidationRule } from './validationRules.js';

/**
 * DOMPurify-like sanitization (lightweight implementation)
 * For full protection, use actual DOMPurify from CDN
 */
const sanitizeHTML = (function() {
    const tagWhitelist = ['b', 'i', 'em', 'strong', 'u', 'br'];
    const attrWhitelist = ['class', 'id'];

    return function(dirty, options = {}) {
        const allowedTags = options.ALLOWED_TAGS || tagWhitelist;
        const allowedAttrs = options.ALLOWED_ATTR || attrWhitelist;

        if (allowedTags.length === 0) {
            // Strip all HTML
            const temp = document.createElement('div');
            temp.textContent = dirty;
            return temp.innerHTML;
        }

        // Create temporary element
        const temp = document.createElement('div');
        temp.innerHTML = dirty;

        // Remove disallowed tags
        const allElements = temp.getElementsByTagName('*');
        for (let i = allElements.length - 1; i >= 0; i--) {
            const element = allElements[i];
            if (!allowedTags.includes(element.tagName.toLowerCase())) {
                element.parentNode.removeChild(element);
            } else {
                // Remove disallowed attributes
                const attrs = Array.from(element.attributes);
                attrs.forEach(attr => {
                    if (!allowedAttrs.includes(attr.name)) {
                        element.removeAttribute(attr.name);
                    }
                });
            }
        }

        return temp.innerHTML;
    };
})();

/**
 * Enhanced input validator with XSS/SQLi prevention
 * @param {string} value - Value to validate
 * @param {Object|string} rules - Validation rules or rule name
 * @returns {Object} {valid: boolean, errors: string[], sanitized: string}
 */
export function validateInput(value, rules = {}) {
    const errors = [];
    let sanitized = value;

    // If rules is a string, get predefined rule
    if (typeof rules === 'string') {
        rules = getValidationRule(rules);
    }

    // Skip validation if empty and not required
    if (!value && !rules.required) {
        return { valid: true, errors: [], sanitized: '' };
    }

    // Required check
    if (rules.required && (!value || value.trim() === '')) {
        errors.push(rules.requiredMessage || 'Bu alan zorunludur');
        return { valid: false, errors, sanitized: '' };
    }

    // Sanitize input if sanitizer provided
    if (rules.sanitize && typeof rules.sanitize === 'function') {
        sanitized = rules.sanitize(value);
    }

    // Length validation
    if (rules.minLength && sanitized.length < rules.minLength) {
        errors.push(`En az ${rules.minLength} karakter olmalıdır`);
    }

    if (rules.maxLength && sanitized.length > rules.maxLength) {
        errors.push(`En fazla ${rules.maxLength} karakter olmalıdır`);
    }

    // Pattern validation (allowlist approach)
    if (rules.pattern) {
        if (!rules.pattern.test(sanitized)) {
            errors.push(rules.message || 'Geçersiz format');
        }
    }

    // Number validation
    if (rules.min !== undefined || rules.max !== undefined) {
        const num = parseFloat(sanitized);
        if (isNaN(num)) {
            errors.push('Sayısal bir değer giriniz');
        } else {
            if (rules.min !== undefined && num < rules.min) {
                errors.push(`Minimum değer: ${rules.min}`);
            }
            if (rules.max !== undefined && num > rules.max) {
                errors.push(`Maximum değer: ${rules.max}`);
            }
        }
    }

    // Custom validator
    if (rules.custom && typeof rules.custom === 'function') {
        const customError = rules.custom(sanitized);
        if (customError) {
            errors.push(customError);
        }
    }

    // XSS Prevention
    if (rules.preventXSS) {
        const allowedTags = rules.allowedTags || [];
        const cleanValue = sanitizeHTML(sanitized, { ALLOWED_TAGS: allowedTags });

        if (cleanValue !== sanitized) {
            errors.push('Güvenlik nedeniyle HTML/Script kodları kullanılamaz');
            sanitized = cleanValue;
        }
    }

    // SQL Injection Prevention (defense in depth)
    if (rules.preventSQLInjection) {
        const sqlPatterns = [
            /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|EXEC|EXECUTE)\b)/gi,
            /(--|;|\/\*|\*\/|xp_|sp_)/g,
            /(\bOR\b.*\b1\s*=\s*1)/gi,
            /(\bAND\b.*\b1\s*=\s*1)/gi
        ];

        for (const pattern of sqlPatterns) {
            if (pattern.test(sanitized)) {
                errors.push('Güvenlik nedeniyle bu karakterler kullanılamaz');
                break;
            }
        }
    }

    return {
        valid: errors.length === 0,
        errors,
        sanitized
    };
}

/**
 * Validate entire form with enhanced error handling
 * @param {HTMLFormElement} form - Form element
 * @param {Object} rules - Validation rules per field
 * @returns {Object} {valid: boolean, errors: Object, sanitized: Object}
 */
export function validateForm(form, rules = {}) {
    const formData = new FormData(form);
    const errors = {};
    const sanitized = {};
    let valid = true;

    for (const [fieldName, fieldRules] of Object.entries(rules)) {
        const value = formData.get(fieldName) || '';
        const result = validateInput(value, fieldRules);

        if (!result.valid) {
            valid = false;
            errors[fieldName] = result.errors;
        }

        sanitized[fieldName] = result.sanitized;
    }

    return { valid, errors, sanitized };
}

/**
 * Real-time validation with debouncing
 * @param {HTMLInputElement} input - Input element
 * @param {Object|string} rules - Validation rules
 * @param {Function} callback - Callback with validation result
 * @param {number} delay - Debounce delay in ms (default: 300)
 * @returns {Function} Cleanup function
 */
export function validateRealTime(input, rules, callback, delay = 300) {
    let timeoutId = null;
    let hasBlurred = false;

    const validate = () => {
        const result = validateInput(input.value, rules);
        callback(result, input);
    };

    // Validate on blur (immediate)
    const onBlur = () => {
        hasBlurred = true;
        validate();
    };

    // Validate on input (debounced, only after blur)
    const onInput = () => {
        if (!hasBlurred) return; // Don't validate until user finishes field

        clearTimeout(timeoutId);
        timeoutId = setTimeout(validate, delay);
    };

    // Attach events
    input.addEventListener('blur', onBlur);
    input.addEventListener('input', onInput);

    // Cleanup function
    return () => {
        clearTimeout(timeoutId);
        input.removeEventListener('blur', onBlur);
        input.removeEventListener('input', onInput);
    };
}

/**
 * Show validation error on input field
 * @param {HTMLInputElement} input - Input element
 * @param {string[]} errors - Error messages
 */
export function showValidationError(input, errors) {
    // Remove existing error
    clearValidationState(input);

    if (!errors || errors.length === 0) {
        // Show success state
        input.classList.add('is-valid');
        input.classList.remove('is-invalid');

        const successIcon = document.createElement('span');
        successIcon.className = 'validation-icon validation-success';
        successIcon.innerHTML = '<i class="fas fa-check-circle"></i>';
        successIcon.setAttribute('aria-label', 'Geçerli');

        input.parentElement.appendChild(successIcon);
        return;
    }

    // Show error state
    input.classList.add('is-invalid');
    input.classList.remove('is-valid');
    input.setAttribute('aria-invalid', 'true');

    const errorContainer = document.createElement('div');
    errorContainer.className = 'validation-error';
    errorContainer.setAttribute('role', 'alert');

    const errorIcon = document.createElement('span');
    errorIcon.className = 'validation-icon validation-error-icon';
    errorIcon.innerHTML = '<i class="fas fa-exclamation-circle"></i>';

    const errorText = document.createElement('span');
    errorText.className = 'validation-error-text';
    errorText.textContent = errors[0]; // Show first error

    errorContainer.appendChild(errorIcon);
    errorContainer.appendChild(errorText);

    input.parentElement.appendChild(errorContainer);

    // Set ARIA describedby for accessibility
    const errorId = `error-${input.name || input.id}`;
    errorContainer.id = errorId;
    input.setAttribute('aria-describedby', errorId);
}

/**
 * Clear validation state from input
 * @param {HTMLInputElement} input - Input element
 */
export function clearValidationState(input) {
    input.classList.remove('is-valid', 'is-invalid');
    input.removeAttribute('aria-invalid');
    input.removeAttribute('aria-describedby');

    // Remove validation feedback elements
    const parent = input.parentElement;
    const errorEl = parent.querySelector('.validation-error');
    const successIcon = parent.querySelector('.validation-success');

    if (errorEl) errorEl.remove();
    if (successIcon) successIcon.remove();
}

/**
 * Validate form on submit with UI feedback
 * @param {HTMLFormElement} form - Form element
 * @param {Object} rules - Validation rules
 * @param {Function} onSuccess - Success callback
 * @param {Function} onError - Error callback
 */
export function validateFormOnSubmit(form, rules, onSuccess, onError) {
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        // Clear all previous validation states
        const inputs = form.querySelectorAll('input, textarea, select');
        inputs.forEach(input => clearValidationState(input));

        // Validate form
        const result = validateForm(form, rules);

        if (result.valid) {
            // Success
            if (onSuccess) onSuccess(result.sanitized, form);
        } else {
            // Show errors on each field
            for (const [fieldName, errors] of Object.entries(result.errors)) {
                const input = form.elements[fieldName];
                if (input) {
                    showValidationError(input, errors);
                }
            }

            // Focus first error field
            const firstErrorField = form.querySelector('.is-invalid');
            if (firstErrorField) {
                firstErrorField.focus();
            }

            if (onError) onError(result.errors, form);
        }
    });
}

/**
 * Add real-time validation to all form fields
 * @param {HTMLFormElement} form - Form element
 * @param {Object} rules - Validation rules per field
 */
export function addRealTimeValidation(form, rules) {
    const cleanupFunctions = [];

    for (const [fieldName, fieldRules] of Object.entries(rules)) {
        const input = form.elements[fieldName];
        if (!input) continue;

        const cleanup = validateRealTime(
            input,
            fieldRules,
            (result) => {
                showValidationError(input, result.errors);
            },
            300
        );

        cleanupFunctions.push(cleanup);
    }

    // Return cleanup function for all validators
    return () => {
        cleanupFunctions.forEach(cleanup => cleanup());
    };
}

export default {
    validateInput,
    validateForm,
    validateRealTime,
    showValidationError,
    clearValidationState,
    validateFormOnSubmit,
    addRealTimeValidation,
    sanitizeHTML
};