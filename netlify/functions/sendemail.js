// Netlify Function for Sending Emails via Brevo
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
    // Parse JSON body
    let to, subject, body;
    
    try {
      const parsedBody = JSON.parse(event.body);
      to = parsedBody.to;
      subject = parsedBody.subject;
      body = parsedBody.body;
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          success: false, 
          error: 'Invalid JSON in request body',
          details: parseError.message 
        })
      };
    }
    
    // Validate required fields
    if (!to || !subject || !body) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: to, subject, body',
          received: { to: !!to, subject: !!subject, body: !!body }
        })
      };
    }
    
    console.log('--- EMAIL REQUEST ---');
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log('Body length:', body?.length || 0);
    console.log('Brevo SMTP Server:', process.env.BREVO_SMTP_SERVER);
    console.log('Brevo SMTP Login:', process.env.BREVO_SMTP_LOGIN);
    
    // Check if environment variables are set
    if (!process.env.BREVO_SMTP_SERVER || !process.env.BREVO_SMTP_LOGIN || !process.env.BREVO_SMTP_PASSWORD) {
      console.error('Missing Brevo environment variables');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          success: false, 
          error: 'Server configuration error: Missing Brevo credentials',
          details: {
            hasServer: !!process.env.BREVO_SMTP_SERVER,
            hasLogin: !!process.env.BREVO_SMTP_LOGIN,
            hasPassword: !!process.env.BREVO_SMTP_PASSWORD
          }
        })
      };
    }
    
    // Create transporter (Brevo SMTP)
    const transporter = nodemailer.createTransporter({
      host: process.env.BREVO_SMTP_SERVER,
      port: parseInt(process.env.BREVO_SMTP_PORT || '587'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.BREVO_SMTP_LOGIN,     // Your Brevo SMTP login
        pass: process.env.BREVO_SMTP_PASSWORD  // Your Brevo SMTP password
      },
      debug: true, // Enable debug logging
      logger: true  // Enable logger
    });
    
    // Prepare email options
    const mailOptions = {
      from: process.env.BREVO_SMTP_LOGIN,
      to: to,
      subject: subject,
      text: body,
      html: `<p>${body.replace(/\n/g, '<br>')}</p>`
    };
    
    console.log('Attempting to send email...');
    
    // Send email
    const info = await transporter.sendMail(mailOptions);
    
    console.log('--- EMAIL SENT SUCCESSFULLY ---');
    console.log('Message ID:', info.messageId);
    console.log('Response:', info.response);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        message: 'Email sent successfully',
        messageId: info.messageId,
        response: info.response
      })
    };
    
  } catch (error) {
    console.error('Email send error:', error);
    console.error('Error stack:', error.stack);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false, 
        error: 'Failed to send email',
        details: error.message,
        stack: error.stack
      })
    };
  }
};
