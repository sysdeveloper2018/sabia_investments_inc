// Netlify Function for Sending Emails via Brevo
const nodemailer = require('nodemailer');
const formidable = require('formidable');

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
    let to, subject, body, attachment;
    
    // Handle both JSON and FormData requests
    if (event.headers['content-type'] && event.headers['content-type'].includes('multipart/form-data')) {
      // Parse FormData
      const form = new formidable.IncomingForm();
      const [fields, files] = await form.parse(event);
      
      to = fields.to?.[0];
      subject = fields.subject?.[0];
      body = fields.body?.[0];
      attachment = files.attachment?.[0];
    } else {
      // Parse JSON
      const { to: emailTo, subject: emailSubject, body: emailBody } = JSON.parse(event.body);
      to = emailTo;
      subject = emailSubject;
      body = emailBody;
    }
    
    console.log('--- EMAIL REQUEST ---');
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log('Body length:', body?.length || 0);
    if (attachment) {
      console.log('Attachment:', attachment.originalFilename, `(${attachment.size} bytes)`);
    }
    
    // Create transporter (Brevo SMTP)
    const transporter = nodemailer.createTransporter({
      host: process.env.BREVO_SMTP_SERVER,
      port: parseInt(process.env.BREVO_SMTP_PORT || '587'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.BREVO_SMTP_LOGIN,     // Your Brevo SMTP login
        pass: process.env.BREVO_SMTP_PASSWORD  // Your Brevo SMTP password
      }
    });
    
    // Prepare email options
    const mailOptions = {
      from: process.env.BREVO_SMTP_LOGIN,
      to: to,
      subject: subject,
      text: body,
      html: `<p>${body.replace(/\n/g, '<br>')}</p>`
    };
    
    // Add attachment if provided
    if (attachment) {
      mailOptions.attachments = [{
        filename: attachment.originalFilename || `report-${Date.now()}.pdf`,
        content: attachment.content
      }];
    }
    
    // Send email
    const info = await transporter.sendMail(mailOptions);
    
    console.log('--- EMAIL SENT SUCCESSFULLY ---');
    console.log('Message ID:', info.messageId);
    
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
