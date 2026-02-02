// Simple test function
exports.handler = async function(event, context) {
  return {
    statusCode: 200,
    body: JSON.stringify({ 
      message: 'Functions are working!',
      method: event.httpMethod,
      timestamp: new Date().toISOString()
    })
  };
};
