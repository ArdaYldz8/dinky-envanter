// Supabase Client Configuration
import config from '../config/config.js';

// Initialize Supabase client with configuration
export const supabase = window.supabase.createClient(
    config.supabase.url,
    config.supabase.anonKey,
    {
        auth: {
            persistSession: true,
            detectSessionInUrl: true,
            autoRefreshToken: true
        }
    }
);

// Test connection
export async function testConnection() {
    try {
        const { data, error } = await supabase.from('employees').select('count', { count: 'exact', head: true });
        if (error) {
            console.error('Supabase connection error:', error);
            return false;
        }
        console.log('Supabase connected successfully');
        return true;
    } catch (error) {
        console.error('Connection test failed:', error);
        return false;
    }
}