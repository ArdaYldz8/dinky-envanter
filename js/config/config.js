// LEGACY Configuration - DEPRECATED
// ⚠️ SECURITY NOTICE: This file contains exposed API keys and will be removed
// ✅ NEW: Use secureConfig.js with Netlify Functions for API security

// MIGRATION STATUS:
// - ❌ INSECURE: Hardcoded API keys (CRITICAL VULNERABILITY)
// - ✅ SECURE: Server-side API proxy via Netlify Functions
// - 🔄 TRANSITION: Gradually migrating all services to secure endpoints

const config = {
    // FIXED: Using WORKING Supabase project (SECURITY RISK - will be migrated)
    supabase: {
        url: 'https://spmtwsxrnclkxmqwsxdf.supabase.co', // ⚠️ EXPOSED
        anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNwbXR3c3hybmNsa3htcXdzeGRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4ODAyODUsImV4cCI6MjA3MjQ1NjI4NX0.BpwVkvqpzAP2hroqztXmQNym5Mq_Kijnt9CPG50yP0c' // ⚠️ EXPOSED
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