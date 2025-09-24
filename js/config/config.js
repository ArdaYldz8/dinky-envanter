// Application Configuration
// Environment variables veya fallback değerler kullanır

const config = {
    // Supabase Configuration
    supabase: {
        url: import.meta.env?.VITE_SUPABASE_URL ||
             window.__ENV__?.SUPABASE_URL ||
             'https://spmtwsxrnclkxmqwsxdf.supabase.co',

        anonKey: import.meta.env?.VITE_SUPABASE_ANON_KEY ||
                 window.__ENV__?.SUPABASE_ANON_KEY ||
                 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNwbXR3c3hybmNsa3htcXdzeGRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4ODAyODUsImV4cCI6MjA3MjQ1NjI4NX0.BpwVkvqpzAP2hroqztXmQNym5Mq_Kijnt9CPG50yP0c'
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