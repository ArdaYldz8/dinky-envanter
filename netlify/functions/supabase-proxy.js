// Secure Supabase Proxy Function
// Protects API keys on server-side
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client on server-side with environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-csrf-token',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

// Security validation
function validateRequest(event) {
  const origin = event.headers.origin;
  const allowedOrigins = [
    'https://dinky-erp.netlify.app',
    'https://localhost:8080',
    'http://localhost:8080',
    process.env.URL // Netlify deploy URL
  ];

  // In production, validate origin
  if (process.env.NODE_ENV === 'production' && !allowedOrigins.includes(origin)) {
    return false;
  }

  return true;
}

exports.handler = async (event, context) => {
  // Handle preflight CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: '',
    };
  }

  try {
    // Validate request origin
    if (!validateRequest(event)) {
      return {
        statusCode: 403,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Forbidden: Invalid origin' }),
      };
    }

    // Parse request
    const { action, table, data, query, options = {} } = JSON.parse(event.body || '{}');
    const authHeader = event.headers.authorization;

    // Choose client based on auth header
    const client = authHeader ? supabaseAnon : supabase;

    // Set auth header if provided
    if (authHeader && client === supabaseAnon) {
      // Use anon client with user token
      client.auth.setAuth(authHeader.replace('Bearer ', ''));
    }

    let result;

    // Route to appropriate Supabase operation
    switch (action) {
      case 'select':
        result = await client.from(table).select(query || '*');
        if (options.eq) {
          Object.entries(options.eq).forEach(([key, value]) => {
            result = result.eq(key, value);
          });
        }
        if (options.order) {
          result = result.order(options.order.column, { ascending: options.order.ascending });
        }
        if (options.limit) {
          result = result.limit(options.limit);
        }
        break;

      case 'insert':
        result = await client.from(table).insert(data).select();
        break;

      case 'update':
        result = client.from(table).update(data);
        if (options.eq) {
          Object.entries(options.eq).forEach(([key, value]) => {
            result = result.eq(key, value);
          });
        }
        result = await result.select();
        break;

      case 'delete':
        result = client.from(table);
        if (options.eq) {
          Object.entries(options.eq).forEach(([key, value]) => {
            result = result.eq(key, value);
          });
        }
        result = await result.delete();
        break;

      case 'rpc':
        result = await client.rpc(table, data || {});
        break;

      case 'auth':
        // Handle authentication
        if (data.action === 'signIn') {
          result = await client.auth.signInWithPassword({
            email: data.email,
            password: data.password
          });
        } else if (data.action === 'signOut') {
          result = await client.auth.signOut();
        } else if (data.action === 'getUser') {
          result = await client.auth.getUser(authHeader?.replace('Bearer ', ''));
        }
        break;

      default:
        throw new Error(`Unsupported action: ${action}`);
    }

    // Return successful response
    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(result),
    };

  } catch (error) {
    console.error('Supabase proxy error:', error);

    return {
      statusCode: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        error: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }),
    };
  }
};