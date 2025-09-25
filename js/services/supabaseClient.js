// Supabase Client Configuration
import config from '../config/config.js';

// ✅ FIXED: Using working config values for authentication
export const supabase = window.supabase.createClient(
    'https://nppfutvdiwjkzxzzgfhf.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wcGZ1dHZkaXdqa3p4enpnZmhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjc0NDUyNjQsImV4cCI6MjA0MzAyMTI2NH0.XqegSxpTEYBzKWUkbkMHdCJnTiUYT-a4hqKD0lBGV8E',
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