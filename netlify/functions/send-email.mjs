import nodemailer from 'nodemailer';

export default async function handler(event, context) {
  console.log('EMAIL FUNCTION CALLED');
  
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
    
    console.log('Email request:', { to, subject, bodyLength: body?.length });
    console.log('Brevo credentials:', {
      server: process.env.BREVO_SMTP_SERVER,
      login: process.env.BREVO_SMTP_LOGIN,
      hasPassword: !!process.env.BREVO_SMTP_PASSWORD
    });
    
    // Create transporter
    const transporter = nodemailer.createTransporter({
      host: process.env.BREVO_SMTP_SERVER,
      port: parseInt(process.env.BREVO_SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.BREVO_SMTP_LOGIN,
        pass: process.env.BREVO_SMTP_PASSWORD
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
    
    console.log('Email sent successfully:', info.messageId);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        message: 'Email sent successfully!',
        messageId: info.messageId
      })
    };
    
  } catch (error) {
    console.error('Email function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false, 
        error: error.message 
      })
    };
  }
}
