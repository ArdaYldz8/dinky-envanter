// Login Form Validation and Security
import { validateInput, validateForm, csrfManager, escapeHtml } from '../utils/security.js';

// Login validation rules
const loginValidationRules = {
    email: {
        required: true,
        email: true,
        maxLength: 100,
        preventSQLInjection: true,
        preventXSS: true
    },
    password: {
        required: true,
        minLength: 8,
        maxLength: 128,
        preventSQLInjection: true,
        preventXSS: true
    }
};

// Login attempts tracking
const loginAttempts = {
    attempts: 0,
    lastAttempt: null,
    lockedUntil: null,
    maxAttempts: 5,
    lockoutDuration: 15 * 60 * 1000 // 15 minutes
};

/**
 * Check if account is locked
 * @returns {boolean}
 */
function isAccountLocked() {
    if (loginAttempts.lockedUntil && Date.now() < loginAttempts.lockedUntil) {
        return true;
    }

    // Reset if lockout expired
    if (loginAttempts.lockedUntil && Date.now() >= loginAttempts.lockedUntil) {
        loginAttempts.attempts = 0;
        loginAttempts.lockedUntil = null;
    }

    return false;
}

/**
 * Record login attempt
 * @param {boolean} success - Whether login was successful
 */
function recordLoginAttempt(success) {
    if (success) {
        loginAttempts.attempts = 0;
        loginAttempts.lockedUntil = null;
    } else {
        loginAttempts.attempts++;
        loginAttempts.lastAttempt = Date.now();

        if (loginAttempts.attempts >= loginAttempts.maxAttempts) {
            loginAttempts.lockedUntil = Date.now() + loginAttempts.lockoutDuration;
        }
    }

    // Store in sessionStorage for persistence
    sessionStorage.setItem('loginAttempts', JSON.stringify(loginAttempts));
}

/**
 * Initialize login form validation
 * @param {HTMLFormElement} form - Login form element
 * @param {Function} onSubmit - Callback for successful validation
 */
export function initializeLoginValidation(form, onSubmit) {
    if (!form) return;

    // Load previous attempts from sessionStorage
    const stored = sessionStorage.getItem('loginAttempts');
    if (stored) {
        Object.assign(loginAttempts, JSON.parse(stored));
    }

    // Add CSRF token
    const csrfToken = csrfManager.getToken();
    const csrfInput = document.createElement('input');
    csrfInput.type = 'hidden';
    csrfInput.name = 'csrf_token';
    csrfInput.value = csrfToken;
    form.appendChild(csrfInput);

    // Real-time validation
    const emailInput = form.querySelector('input[type="email"], input[name="email"]');
    const passwordInput = form.querySelector('input[type="password"], input[name="password"]');

    if (emailInput) {
        emailInput.addEventListener('blur', () => {
            const validation = validateInput(emailInput.value, loginValidationRules.email);
            showFieldError(emailInput, validation);
        });
    }

    if (passwordInput) {
        passwordInput.addEventListener('blur', () => {
            const validation = validateInput(passwordInput.value, loginValidationRules.password);
            showFieldError(passwordInput, validation);
        });
    }

    // Form submit handler
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Check if account is locked
        if (isAccountLocked()) {
            const remainingTime = Math.ceil((loginAttempts.lockedUntil - Date.now()) / 60000);
            showError(`Hesap kilitli. ${remainingTime} dakika sonra tekrar deneyin.`);
            return;
        }

        // Validate CSRF token
        const formData = new FormData(form);
        const submittedToken = formData.get('csrf_token');

        if (!csrfManager.validateToken(submittedToken)) {
            showError('Güvenlik hatası. Lütfen sayfayı yenileyin.');
            csrfManager.refreshToken();
            return;
        }

        // Validate form
        const validation = validateForm(form, loginValidationRules);

        if (!validation.valid) {
            // Show validation errors
            Object.entries(validation.errors).forEach(([field, errors]) => {
                const input = form.querySelector(`[name="${field}"]`);
                if (input) {
                    showFieldError(input, { valid: false, errors });
                }
            });
            return;
        }

        // Additional security checks
        const email = formData.get('email');
        const password = formData.get('password');

        // Check for common SQL injection patterns
        const sqlPatterns = ['--', '/*', '*/', 'xp_', 'sp_', 'exec', 'execute'];
        const combinedInput = (email + password).toLowerCase();

        for (const pattern of sqlPatterns) {
            if (combinedInput.includes(pattern)) {
                showError('Güvenlik nedeniyle bu karakterler kullanılamaz');
                recordLoginAttempt(false);
                return;
            }
        }

        // Disable form during submission
        const submitButton = form.querySelector('button[type="submit"]');
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = 'Giriş yapılıyor...';
        }

        try {
            // Call the provided onSubmit handler
            const result = await onSubmit({
                email: escapeHtml(email),
                password: password, // Don't escape password
                csrf_token: submittedToken
            });

            if (result.success) {
                recordLoginAttempt(true);
                // Clear sensitive data
                form.reset();
            } else {
                recordLoginAttempt(false);
                showError(result.error || 'Giriş başarısız');

                // Show remaining attempts
                const remaining = loginAttempts.maxAttempts - loginAttempts.attempts;
                if (remaining > 0 && remaining <= 3) {
                    showError(`Kalan deneme hakkı: ${remaining}`);
                }
            }
        } catch (error) {
            recordLoginAttempt(false);
            showError('Bir hata oluştu. Lütfen tekrar deneyin.');
            console.error('Login error:', error);
        } finally {
            // Re-enable form
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = 'Giriş Yap';
            }
        }
    });
}

/**
 * Show field-specific error
 * @param {HTMLInputElement} input - Input element
 * @param {Object} validation - Validation result
 */
function showFieldError(input, validation) {
    // Remove existing error
    const existingError = input.parentElement.querySelector('.field-error');
    if (existingError) {
        existingError.remove();
    }

    input.classList.remove('error', 'valid');

    if (!validation.valid) {
        input.classList.add('error');

        const errorDiv = document.createElement('div');
        errorDiv.className = 'field-error';
        errorDiv.textContent = validation.errors[0];
        input.parentElement.appendChild(errorDiv);
    } else {
        input.classList.add('valid');
    }
}

/**
 * Show general error message
 * @param {string} message - Error message
 */
function showError(message) {
    const existingError = document.querySelector('.error-message');

    if (existingError) {
        existingError.textContent = message;
        existingError.style.display = 'block';
    } else {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        document.querySelector('.login-form').prepend(errorDiv);
    }

    // Auto-hide after 5 seconds
    setTimeout(() => {
        const error = document.querySelector('.error-message');
        if (error) {
            error.style.display = 'none';
        }
    }, 5000);
}

/**
 * Password strength checker
 * @param {string} password - Password to check
 * @returns {Object} Strength level and suggestions
 */
export function checkPasswordStrength(password) {
    const result = {
        score: 0,
        level: 'weak',
        suggestions: []
    };

    if (!password) return result;

    // Length check
    if (password.length >= 8) result.score++;
    if (password.length >= 12) result.score++;
    if (password.length >= 16) result.score++;

    // Character variety checks
    if (/[a-z]/.test(password)) result.score++;
    else result.suggestions.push('Küçük harf ekleyin');

    if (/[A-Z]/.test(password)) result.score++;
    else result.suggestions.push('Büyük harf ekleyin');

    if (/[0-9]/.test(password)) result.score++;
    else result.suggestions.push('Rakam ekleyin');

    if (/[^a-zA-Z0-9]/.test(password)) result.score++;
    else result.suggestions.push('Özel karakter ekleyin');

    // Common patterns to avoid
    const commonPatterns = [
        /12345/,
        /qwerty/i,
        /password/i,
        /admin/i,
        /letmein/i,
        /welcome/i
    ];

    for (const pattern of commonPatterns) {
        if (pattern.test(password)) {
            result.score = Math.max(0, result.score - 2);
            result.suggestions.push('Yaygın kullanılan şifrelerden kaçının');
            break;
        }
    }

    // Determine strength level
    if (result.score <= 2) {
        result.level = 'weak';
    } else if (result.score <= 4) {
        result.level = 'fair';
    } else if (result.score <= 6) {
        result.level = 'good';
    } else {
        result.level = 'strong';
    }

    return result;
}

export default {
    initializeLoginValidation,
    checkPasswordStrength,
    loginValidationRules
};