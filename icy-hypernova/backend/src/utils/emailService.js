const nodemailer = require('nodemailer');
const logger = require('./logger');

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

const emailTemplates = {
  welcome: (name, role) => ({
    subject: '🌱 Welcome to FoodBridge!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9;">
        <div style="background: linear-gradient(135deg, #7c3aed, #4f46e5); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 20px;">
          <h1 style="color: white; margin: 0; font-size: 28px;">🌉 FoodBridge</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0;">Connecting Generosity with Need</p>
        </div>
        <div style="background: white; padding: 30px; border-radius: 12px;">
          <h2 style="color: #1f2937;">Welcome, ${name}! 🎉</h2>
          <p style="color: #6b7280;">Your account has been created successfully as a <strong style="color: #7c3aed;">${role}</strong>.</p>
          <p style="color: #6b7280;">Together, we can make a difference in reducing food waste and ensuring no one goes hungry.</p>
          <a href="${process.env.FRONTEND_URL}/login" style="display: inline-block; background: linear-gradient(135deg, #7c3aed, #4f46e5); color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 10px;">Get Started →</a>
        </div>
      </div>
    `
  }),

  requestReceived: (donorName, requestDetails) => ({
    subject: '📦 New Food Request Received - FoodBridge',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #7c3aed, #4f46e5); padding: 20px; border-radius: 12px; text-align: center; margin-bottom: 20px;">
          <h1 style="color: white; margin: 0;">🌉 FoodBridge</h1>
        </div>
        <div style="background: white; padding: 30px; border-radius: 12px; border: 1px solid #e5e7eb;">
          <h2 style="color: #1f2937;">New Request, ${donorName}!</h2>
          <p style="color: #6b7280;">Someone has requested your food donation: <strong>${requestDetails.title}</strong></p>
          <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <p style="margin: 0; color: #374151;"><strong>Quantity:</strong> ${requestDetails.quantity} servings</p>
            <p style="margin: 5px 0 0; color: #374151;"><strong>Urgency:</strong> ${requestDetails.urgency}/5</p>
          </div>
          <a href="${process.env.FRONTEND_URL}/dashboard" style="display: inline-block; background: #7c3aed; color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: bold;">View Request →</a>
        </div>
      </div>
    `
  }),

  deliveryUpdate: (receiverName, status, details) => ({
    subject: `🚚 Delivery Update: ${status} - FoodBridge`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #7c3aed, #4f46e5); padding: 20px; border-radius: 12px; text-align: center; margin-bottom: 20px;">
          <h1 style="color: white; margin: 0;">🌉 FoodBridge</h1>
        </div>
        <div style="background: white; padding: 30px; border-radius: 12px; border: 1px solid #e5e7eb;">
          <h2 style="color: #1f2937;">Delivery Update, ${receiverName}!</h2>
          <p style="color: #6b7280;">Your food delivery status has been updated to: <strong style="color: #7c3aed;">${status}</strong></p>
          <a href="${process.env.FRONTEND_URL}/dashboard" style="display: inline-block; background: #7c3aed; color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: bold;">Track Delivery →</a>
        </div>
      </div>
    `
  })
};

const sendEmail = async (to, templateName, templateData) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    logger.warn('Email not configured. Skipping email send.');
    return false;
  }

  try {
    const transporter = createTransporter();
    const template = emailTemplates[templateName](...templateData);
    
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'FoodBridge <noreply@foodbridge.com>',
      to,
      subject: template.subject,
      html: template.html
    });
    
    logger.info(`Email sent successfully to ${to}: ${templateName}`);
    return true;
  } catch (error) {
    logger.error(`Failed to send email to ${to}:`, error.message);
    return false;
  }
};

module.exports = { sendEmail };
