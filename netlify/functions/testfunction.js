// Simple test function
exports.handler = async function(event, context) {
  return {
    statusCode: 200,
    body: JSON.stringify({ 
      message: 'Test function is working!',
      event: event.httpMethod,
      timestamp: new Date().toISOString()
    })
  };
};
