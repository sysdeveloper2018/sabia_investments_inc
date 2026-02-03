const nodemailer = require('nodemailer');

exports.handler = async function(event, context) {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  };
  
  // Handle OPTIONS requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }
  
  try {
    const { to, subject, body } = JSON.parse(event.body);
    
    console.log('=== BREVO EMAIL TEST ===');
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log('Body length:', body?.length || 0);
    console.log('Brevo Server:', process.env.BREVO_SMTP_SERVER);
    console.log('Brevo Login:', process.env.BREVO_SMTP_LOGIN);
    console.log('Has Password:', !!process.env.BREVO_SMTP_PASSWORD);
    
    // Check environment variables
    if (!process.env.BREVO_SMTP_SERVER || !process.env.BREVO_SMTP_LOGIN || !process.env.BREVO_SMTP_PASSWORD) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          success: false, 
          error: 'Missing Brevo environment variables',
          details: {
            hasServer: !!process.env.BREVO_SMTP_SERVER,
            hasLogin: !!process.env.BREVO_SMTP_LOGIN,
            hasPassword: !!process.env.BREVO_SMTP_PASSWORD
          }
        })
      };
    }
    
    // Create transporter
    const transporter = nodemailer.createTransporter({
      host: process.env.BREVO_SMTP_SERVER,
      port: parseInt(process.env.BREVO_SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.BREVO_SMTP_LOGIN,
        pass: process.env.BREVO_SMTP_PASSWORD
      },
      debug: true,
      logger: true
    });
    
    console.log('Attempting to send email...');
    
    // Send email
    const info = await transporter.sendMail({
      from: process.env.BREVO_SMTP_LOGIN,
      to: to,
      subject: subject,
      text: body,
      html: `<p>${body.replace(/\n/g, '<br>')}</p>`
    });
    
    console.log('=== EMAIL SENT SUCCESSFULLY ===');
    console.log('Message ID:', info.messageId);
    console.log('Response:', info.response);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        message: 'Email sent successfully via Brevo!',
        messageId: info.messageId,
        response: info.response
      })
    };
    
  } catch (error) {
    console.error('=== BREVO EMAIL ERROR ===');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false, 
        error: 'Failed to send email via Brevo',
        details: error.message,
        stack: error.stack
      })
    };
  }
};
