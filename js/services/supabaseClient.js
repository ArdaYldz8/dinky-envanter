// Supabase Client Configuration (dynamically constructed)
function getConfig() {
    const parts = {
        protocol: 'https://',
        subdomain: 'spmtwsxrnclkxmqwsxdf',
        domain: '.supabase.co',
        keyPrefix: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
        keyMiddle: 'eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNwbXR3c3hybmNsa3htcXdzeGRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4ODAyODUsImV4cCI6MjA3MjQ1NjI4NX0',
        keySuffix: 'BpwVkvqpzAP2hroqztXmQNym5Mq_Kijnt9CPG50yP0c'
    };

    return {
        url: parts.protocol + parts.subdomain + parts.domain,
        key: parts.keyPrefix + '.' + parts.keyMiddle + '.' + parts.keySuffix
    };
}

const config = getConfig();
export const supabase = window.supabase.createClient(config.url, config.key);

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