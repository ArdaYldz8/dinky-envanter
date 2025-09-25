// Secure Configuration - Using Netlify Functions
// API keys are now protected on server-side

export const config = {
    // API base URL (points to Netlify Functions)
    API_BASE_URL: window.location.origin + '/api',

    // Application settings
    APP_NAME: 'Dinky Metal ERP',
    VERSION: '1.1.0',

    // Security settings
    SESSION_TIMEOUT: 8 * 60 * 60 * 1000, // 8 hours
    CSRF_ENABLED: true,

    // Feature flags
    FEATURES: {
        REAL_TIME_UPDATES: false,
        ADVANCED_ANALYTICS: false,
        MOBILE_APP: false,
        API_RATE_LIMITING: true
    },

    // UI Settings
    PAGINATION: {
        DEFAULT_PAGE_SIZE: 50,
        MAX_PAGE_SIZE: 200
    },

    // File upload limits
    UPLOAD_LIMITS: {
        MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
        ALLOWED_TYPES: ['image/jpeg', 'image/png', 'application/pdf', 'application/vnd.ms-excel']
    }
};

// Environment detection
export const isDevelopment = () => {
    return window.location.hostname === 'localhost' ||
           window.location.hostname === '127.0.0.1' ||
           window.location.hostname.includes('deploy-preview');
};

export const isProduction = () => {
    return window.location.hostname.includes('netlify.app') &&
           !window.location.hostname.includes('deploy-preview');
};

// Secure API client
class SecureAPIClient {
    constructor() {
        this.baseURL = config.API_BASE_URL;
        this.sessionToken = null;
    }

    // Set authentication token
    setAuth(token) {
        this.sessionToken = token;
    }

    // Make secure API call
    async call(action, table, data = null, options = {}) {
        const url = `${this.baseURL}/supabase-proxy`;

        const headers = {
            'Content-Type': 'application/json',
        };

        // Add auth header if available
        if (this.sessionToken) {
            headers['Authorization'] = `Bearer ${this.sessionToken}`;
        }

        // Add CSRF token if available
        const csrfToken = this.getCSRFToken();
        if (csrfToken) {
            headers['x-csrf-token'] = csrfToken;
        }

        const body = JSON.stringify({
            action,
            table,
            data,
            options
        });

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers,
                body
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('SecureAPIClient error:', error);
            throw error;
        }
    }

    // Get CSRF token from cookies
    getCSRFToken() {
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'csrf_token') {
                return decodeURIComponent(value);
            }
        }
        return null;
    }

    // Supabase-like interface
    from(table) {
        return new TableQueryBuilder(this, table);
    }

    // RPC calls
    async rpc(functionName, params = {}) {
        return this.call('rpc', functionName, params);
    }

    // Auth operations
    get auth() {
        return {
            signInWithPassword: async ({ email, password }) => {
                return this.call('auth', null, { action: 'signIn', email, password });
            },
            signOut: async () => {
                return this.call('auth', null, { action: 'signOut' });
            },
            getUser: async () => {
                return this.call('auth', null, { action: 'getUser' });
            },
            setAuth: (token) => {
                this.setAuth(token);
            }
        };
    }
}

// Query builder for table operations
class TableQueryBuilder {
    constructor(client, table) {
        this.client = client;
        this.table = table;
        this.query = '*';
        this.filters = {};
        this.orderBy = null;
        this.limitValue = null;
    }

    select(query = '*') {
        this.query = query;
        return this;
    }

    eq(column, value) {
        if (!this.filters.eq) this.filters.eq = {};
        this.filters.eq[column] = value;
        return this;
    }

    order(column, options = { ascending: true }) {
        this.orderBy = { column, ascending: options.ascending };
        return this;
    }

    limit(count) {
        this.limitValue = count;
        return this;
    }

    async single() {
        const result = await this.execute();
        if (result.data && result.data.length > 0) {
            return { data: result.data[0], error: result.error };
        }
        return { data: null, error: result.error };
    }

    async execute() {
        const options = {
            ...this.filters,
            order: this.orderBy,
            limit: this.limitValue
        };

        return this.client.call('select', this.table, null, options);
    }

    // Insert operation
    async insert(data) {
        const result = await this.client.call('insert', this.table, data);
        return { ...result, select: () => this };
    }

    // Update operation
    async update(data) {
        const options = { ...this.filters };
        const result = await this.client.call('update', this.table, data, options);
        return { ...result, select: () => this };
    }

    // Delete operation
    async delete() {
        const options = { ...this.filters };
        return this.client.call('delete', this.table, null, options);
    }
}

// Export secure client instance
export const secureSupabase = new SecureAPIClient();

// Legacy support - gradually migrate to secureSupabase
export default secureSupabase;