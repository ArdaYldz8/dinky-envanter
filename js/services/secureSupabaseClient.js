// Secure Supabase Client - Uses Netlify Functions Proxy
// Replaces direct Supabase client with secure server-side proxy

import { secureSupabase } from '../config/secureConfig.js';

// Export the secure client
export { secureSupabase as supabase };

// Legacy compatibility layer for gradual migration
export function createSecureClient() {
    return secureSupabase;
}

// Test connection function
export async function testConnection() {
    try {
        console.log('🔄 Testing secure connection via Netlify Functions...');

        // Test basic connectivity
        const result = await secureSupabase.rpc('test_connection');

        if (result.error) {
            console.error('❌ Secure connection test failed:', result.error);
            return false;
        }

        console.log('✅ Secure connection established via Netlify Functions');
        return true;
    } catch (error) {
        console.error('❌ Secure connection test error:', error);

        // Fallback warning
        console.warn('⚠️ Secure connection failed. Check:');
        console.warn('  1. Netlify Functions are deployed');
        console.warn('  2. Environment variables are set');
        console.warn('  3. SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are correct');

        return false;
    }
}

// Migration helper: Check if we're using secure client
export function isSecureMode() {
    return window.location.hostname.includes('netlify.app') ||
           window.location.hostname === 'localhost';
}

// Development helper: Show migration status
if (typeof window !== 'undefined') {
    console.log(`
🔒 SECURE SUPABASE CLIENT LOADED
📊 Migration Status: ${isSecureMode() ? 'SECURE MODE' : 'LEGACY MODE'}
🌐 API Endpoint: ${secureSupabase.baseURL}
⚡ Ready for production deployment
    `);
}

export default secureSupabase;