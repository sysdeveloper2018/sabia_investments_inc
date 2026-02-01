// Netlify Function for Sending Emails via Gmail
const nodemailer = require('nodemailer');

exports.handler = async function(event, context) {
  const { to, subject, body } = JSON.parse(event.body);
  
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
    // Create transporter (Brevo SMTP)
    const transporter = nodemailer.createTransporter({
      host: process.env.BREVO_SMTP_SERVER,
      port: process.env.BREVO_SMTP_PORT,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.BREVO_SMTP_LOGIN,     // Your Brevo SMTP login
        pass: process.env.BREVO_SMTP_PASSWORD  // Your Brevo SMTP password
      }
    });
    
    // Send email
    const info = await transporter.sendMail({
      from: process.env.BREVO_SMTP_LOGIN,
      to: to,
      subject: subject,
      text: body,
      html: `<p>${body.replace(/\n/g, '<br>')}</p>`
    });
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        message: 'Email sent successfully',
        messageId: info.messageId 
      })
    };
    
  } catch (error) {
    console.error('Email send error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false, 
        error: 'Failed to send email',
        details: error.message 
      })
    };
  }
};
