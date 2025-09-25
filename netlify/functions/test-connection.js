// Test Connection Function for Netlify Functions
// Validates that secure API proxy is working correctly

exports.handler = async (event, context) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };

  // Handle preflight CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: '',
    };
  }

  try {
    // Environment validation
    const requiredEnvVars = [
      'SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'Missing environment variables',
          missing: missingVars,
          available: Object.keys(process.env).filter(key => key.startsWith('SUPABASE')),
          status: 'configuration_error'
        }),
      };
    }

    // Basic connectivity test
    const testResult = {
      status: 'success',
      message: 'Netlify Functions proxy is working',
      timestamp: new Date().toISOString(),
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        region: process.env.AWS_REGION || 'unknown'
      },
      supabase: {
        url: process.env.SUPABASE_URL ? 'configured' : 'missing',
        serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'configured' : 'missing'
      },
      security: {
        origin: event.headers.origin || 'none',
        userAgent: event.headers['user-agent'] || 'none',
        method: event.httpMethod
      }
    };

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testResult),
    };

  } catch (error) {
    console.error('Test connection error:', error);

    return {
      statusCode: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        error: error.message,
        status: 'function_error',
        timestamp: new Date().toISOString()
      }),
    };
  }
};