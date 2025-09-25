// LEGACY Configuration - DEPRECATED
// ⚠️ SECURITY NOTICE: This file contains exposed API keys and will be removed
// ✅ NEW: Use secureConfig.js with Netlify Functions for API security

// MIGRATION STATUS:
// - ❌ INSECURE: Hardcoded API keys (CRITICAL VULNERABILITY)
// - ✅ SECURE: Server-side API proxy via Netlify Functions
// - 🔄 TRANSITION: Gradually migrating all services to secure endpoints

const config = {
    // DEPRECATED: Exposed API keys (SECURITY RISK)
    supabase: {
        url: 'https://nppfutvdiwjkzxzzgfhf.supabase.co', // ⚠️ EXPOSED
        anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wcGZ1dHZkaXdqa3p4enpnZmhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjc0NDUyNjQsImV4cCI6MjA0MzAyMTI2NH0.XqegSxpTEYBzKWUkbkMHdCJnTiUYT-a4hqKD0lBGV8E' // ⚠️ EXPOSED
    },

    // Application Settings
    app: {
        name: import.meta.env?.VITE_APP_NAME || 'Dinky Metal ERP',
        sessionTimeout: parseInt(import.meta.env?.VITE_SESSION_TIMEOUT || '28800000'), // 8 hours
        environment: import.meta.env?.VITE_ENV || 'production'
    },

    // Security Settings
    security: {
        passwordMinLength: 8,
        passwordRequireUppercase: true,
        passwordRequireLowercase: true,
        passwordRequireNumbers: true,
        maxLoginAttempts: 5,
        lockoutDuration: 900000 // 15 minutes
    }
};

// Development mode warning
if (config.app.environment === 'development') {
    console.warn('⚠️ Running in development mode. Ensure environment variables are properly configured for production.');
}

// Validate configuration
function validateConfig() {
    if (!config.supabase.url || !config.supabase.anonKey) {
        throw new Error('Supabase configuration is missing. Please check your environment variables.');
    }

    // URL format validation
    try {
        new URL(config.supabase.url);
    } catch (e) {
        throw new Error('Invalid Supabase URL format');
    }

    // Check if we're using hardcoded values in production
    if (config.app.environment === 'production') {
        if (config.supabase.url.includes('spmtwsxrnclkxmqwsxdf')) {
            console.error('⚠️ WARNING: Using hardcoded Supabase URL in production!');
        }
    }
}

// Run validation
try {
    validateConfig();
} catch (error) {
    console.error('Configuration error:', error.message);
}

export default config;