// Enhanced Validation Rules - Allowlist Approach with Comprehensive Patterns
// OWASP Input Validation Best Practices 2025

/**
 * Validation Rule Definitions
 * Using allowlist (whitelist) approach for security
 */

export const ValidationRules = {
    // Email validation (RFC 5322 compliant)
    email: {
        pattern: /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
        message: 'Geçerli bir e-posta adresi giriniz (örn: kullanici@ornek.com)',
        maxLength: 254,
        preventXSS: true,
        preventSQLInjection: true
    },

    // Phone number (Turkish formats)
    phone: {
        pattern: /^(\+90|0)?5\d{9}$/,
        message: 'Geçerli bir telefon numarası giriniz (örn: 05XX XXX XX XX)',
        sanitize: (value) => value.replace(/[\s\-\(\)]/g, ''), // Remove formatting
        maxLength: 13
    },

    // Turkish ID Number (TC Kimlik No) - 11 digits with validation algorithm
    tcKimlik: {
        pattern: /^[1-9]\d{10}$/,
        message: 'Geçerli bir TC Kimlik Numarası giriniz (11 haneli)',
        custom: (value) => {
            if (!/^[1-9]\d{10}$/.test(value)) return 'TC Kimlik Numarası 11 haneli olmalıdır';

            const digits = value.split('').map(Number);
            const sum1 = (digits[0] + digits[2] + digits[4] + digits[6] + digits[8]) * 7;
            const sum2 = digits[1] + digits[3] + digits[5] + digits[7];
            const check10 = (sum1 - sum2) % 10;

            if (check10 !== digits[9]) return 'Geçersiz TC Kimlik Numarası';

            const sumAll = digits.slice(0, 10).reduce((a, b) => a + b, 0);
            if (sumAll % 10 !== digits[10]) return 'Geçersiz TC Kimlik Numarası';

            return null;
        }
    },

    // Tax ID (Vergi Kimlik No) - 10 digits
    taxId: {
        pattern: /^\d{10}$/,
        message: 'Vergi Kimlik Numarası 10 haneli olmalıdır',
        maxLength: 10
    },

    // IBAN (Turkish)
    iban: {
        pattern: /^TR\d{2}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{2}$/i,
        message: 'Geçerli bir IBAN giriniz (TR ile başlamalı)',
        sanitize: (value) => value.replace(/\s/g, '').toUpperCase(),
        maxLength: 32
    },

    // Name (Turkish characters allowed)
    name: {
        pattern: /^[a-zA-ZçÇğĞıİöÖşŞüÜ\s'-]+$/,
        message: 'Ad sadece harf içermelidir',
        minLength: 2,
        maxLength: 100,
        preventXSS: true,
        preventSQLInjection: true
    },

    // Address
    address: {
        pattern: /^[a-zA-Z0-9çÇğĞıİöÖşŞüÜ\s,.\-\/:#]+$/,
        message: 'Geçersiz adres formatı',
        minLength: 5,
        maxLength: 500,
        preventXSS: true,
        preventSQLInjection: true
    },

    // URL
    url: {
        pattern: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
        message: 'Geçerli bir URL giriniz (http:// veya https:// ile başlamalı)',
        preventXSS: true
    },

    // Currency (Turkish Lira)
    currency: {
        pattern: /^\d+([.,]\d{1,2})?$/,
        message: 'Geçerli bir tutar giriniz (örn: 1000 veya 1000,50)',
        sanitize: (value) => value.replace(',', '.'),
        min: 0,
        max: 999999999
    },

    // Percentage
    percentage: {
        pattern: /^\d+([.,]\d{1,2})?$/,
        message: 'Geçerli bir yüzde giriniz (0-100)',
        min: 0,
        max: 100
    },

    // Date (ISO 8601 and Turkish format)
    date: {
        pattern: /^\d{4}-\d{2}-\d{2}$|^\d{2}\/\d{2}\/\d{4}$/,
        message: 'Geçerli bir tarih giriniz (GG/AA/YYYY veya YYYY-MM-DD)',
        custom: (value) => {
            const date = new Date(value);
            if (isNaN(date.getTime())) return 'Geçersiz tarih';
            return null;
        }
    },

    // Username (alphanumeric + underscore)
    username: {
        pattern: /^[a-zA-Z0-9_]{3,20}$/,
        message: 'Kullanıcı adı 3-20 karakter, sadece harf, rakam ve alt çizgi içerebilir',
        minLength: 3,
        maxLength: 20,
        preventXSS: true,
        preventSQLInjection: true
    },

    // Password (strong)
    password: {
        pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
        message: 'Şifre en az 8 karakter, 1 büyük harf, 1 küçük harf, 1 rakam ve 1 özel karakter içermelidir',
        minLength: 8,
        maxLength: 128
    },

    // Barcode (EAN-13, EAN-8, UPC)
    barcode: {
        pattern: /^(\d{8}|\d{12,13})$/,
        message: 'Geçerli bir barkod numarası giriniz (8, 12 veya 13 haneli)'
    },

    // Product Code
    productCode: {
        pattern: /^[A-Z0-9\-]{3,20}$/,
        message: 'Ürün kodu 3-20 karakter, büyük harf, rakam ve tire içerebilir',
        sanitize: (value) => value.toUpperCase()
    },

    // Quantity (integer)
    quantity: {
        pattern: /^\d+$/,
        message: 'Miktar pozitif bir tam sayı olmalıdır',
        min: 0,
        max: 999999
    },

    // Unit Weight (decimal)
    weight: {
        pattern: /^\d+([.,]\d{1,3})?$/,
        message: 'Geçerli bir ağırlık giriniz (örn: 1000 veya 1000,500)',
        sanitize: (value) => value.replace(',', '.'),
        min: 0,
        max: 999999
    },

    // Notes/Description (prevent XSS/SQLi)
    notes: {
        maxLength: 1000,
        preventXSS: true,
        preventSQLInjection: true,
        allowedTags: [] // No HTML allowed
    },

    // Generic text (safe)
    text: {
        pattern: /^[a-zA-Z0-9çÇğĞıİöÖşŞüÜ\s,.;:!?()\-]+$/,
        message: 'Geçersiz karakter kullanıldı',
        maxLength: 500,
        preventXSS: true,
        preventSQLInjection: true
    }
};

/**
 * Get validation rule by field type
 * @param {string} fieldType - Field type (email, phone, etc.)
 * @returns {Object} Validation rule
 */
export function getValidationRule(fieldType) {
    return ValidationRules[fieldType] || ValidationRules.text;
}

/**
 * Combine multiple validation rules
 * @param {...string} ruleNames - Rule names to combine
 * @returns {Object} Combined validation rule
 */
export function combineRules(...ruleNames) {
    const combined = {};

    ruleNames.forEach(ruleName => {
        const rule = ValidationRules[ruleName];
        if (rule) {
            Object.assign(combined, rule);
        }
    });

    return combined;
}

/**
 * Create custom validation rule
 * @param {Object} config - Rule configuration
 * @returns {Object} Custom validation rule
 */
export function createCustomRule(config) {
    return {
        ...config,
        preventXSS: config.preventXSS !== false,
        preventSQLInjection: config.preventSQLInjection !== false
    };
}

export default ValidationRules;