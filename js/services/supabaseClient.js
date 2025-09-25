// Supabase Client Configuration
import config from '../config/config.js';

// ✅ FIXED: Using WORKING Supabase project URL and matching API key
export const supabase = window.supabase.createClient(
    'https://spmtwsxrnclkxmqwsxdf.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNwbXR3c3hybmNsa3htcXdzeGRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4ODAyODUsImV4cCI6MjA3MjQ1NjI4NX0.BpwVkvqpzAP2hroqztXmQNym5Mq_Kijnt9CPG50yP0c',
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