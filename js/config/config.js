// Application Configuration
const config = {
    // Supabase Configuration
    supabase: {
        url: 'https://spmtwsxrnclkxmqwsxdf.supabase.co',
        anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNwbXR3c3hybmNsa3htcXdzeGRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4ODAyODUsImV4cCI6MjA3MjQ1NjI4NX0.BpwVkvqpzAP2hroqztXmQNym5Mq_Kijnt9CPG50yP0c'
    },

    // Application Settings
    app: {
        name: 'Dinky Metal ERP',
        sessionTimeout: 28800000, // 8 hours
        environment: 'production'
    },

    // Security Settings
    security: {
        passwordMinLength: 8,
        maxLoginAttempts: 5,
        lockoutDuration: 900000 // 15 minutes
    }
};

// Simple validation
function validateConfig() {
    if (!config.supabase.url || !config.supabase.anonKey) {
        throw new Error('Supabase configuration is missing');
    }
}

// Initialize
validateConfig();

export default config;