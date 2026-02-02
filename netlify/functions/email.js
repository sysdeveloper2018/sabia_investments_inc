const handler = async (event) => {
  console.log('FUNCTION CALLED');
  
  try {
    const { to, subject, body } = JSON.parse(event.body);
    
    console.log('Email request:', { to, subject, bodyLength: body?.length });
    
    // Return success for now (we'll add actual email later)
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        success: true, 
        message: 'Email function is working!',
        received: { to, subject, bodyLength: body?.length }
      })
    };
  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        success: false, 
        error: error.message 
      })
    };
  }
};

module.exports = { handler };
