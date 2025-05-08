// netlify/functions/options.js
// Handle OPTIONS requests for CORS preflight

exports.handler = async (event, context) => {
  // Allow OPTIONS method
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS"
      },
      body: ''
    };
  }

  // If not an OPTIONS request, return 405 Method Not Allowed
  return {
    statusCode: 405,
    body: JSON.stringify({ error: 'Method not allowed' })
  };
};
