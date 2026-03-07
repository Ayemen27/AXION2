// ══════════════════════════════════════════════════════════════════════════════
// Email Notification Provider
// ══════════════════════════════════════════════════════════════════════════════

const nodemailer = require('nodemailer');

class EmailNotifier {
  constructor() {
    this.name = 'Email';
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  async send(message) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: ${message.color};">${message.title}</h2>
        <p>${message.message}</p>
        ${Object.entries(message.fields || {}).map(([key, value]) => `
          <div style="margin: 10px 0;">
            <strong>${key}:</strong> ${value}
          </div>
        `).join('')}
        <hr style="margin: 20px 0;">
        <p style="color: #888; font-size: 12px;">AXION Git Notifications</p>
      </div>
    `;
    
    await this.transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: process.env.NOTIFY_EMAIL,
      subject: message.title,
      html
    });
    
    console.log(`✅ Sent via ${this.name}`);
  }
}

module.exports = EmailNotifier;
