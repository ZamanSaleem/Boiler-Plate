const nodemailer = require('nodemailer');
const config = require('../config/config');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: config.mailHost,
      port: config.mailPort,
      secure: config.mailPort === 465, 
      auth: {
        user: config.mailUser,
        pass: config.mailPass,
      },
    });
  }

  /**
   * Send OTP email for user verification
   * @param {string} email - Recipient email
   * @param {string} otp - OTP code
   * @param {string} firstName - User's first name
   * @returns {Promise}
   */
  async sendOtpEmail(email, otp, firstName) {
    const mailOptions = {
      from: config.mailFrom,
      to: email,
      subject: 'Verify Your Email - SyncMosaic',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 28px;">SyncMosaic</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Email Verification</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-bottom: 20px;">Hello ${firstName}!</h2>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 25px;">
              Thank you for signing up with SyncMosaic. To complete your registration, please use the verification code below:
            </p>
            
            <div style="background: #fff; border: 2px dashed #667eea; border-radius: 8px; padding: 20px; text-align: center; margin: 25px 0;">
              <h3 style="color: #667eea; font-size: 32px; margin: 0; letter-spacing: 5px; font-weight: bold;">${otp}</h3>
            </div>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              This code will expire in ${config.otpExpiresInMinutes} minutes. If you didn't request this verification, please ignore this email.
            </p>
            
            <div style="text-align: center; margin-top: 30px;">
              <p style="color: #999; font-size: 14px;">
                Best regards,<br>
                The SyncMosaic Team
              </p>
            </div>
          </div>
        </div>
      `,
    };

    return this.sendEmail(mailOptions);
  }

  /**
   * Send password reset email
   * @param {string} email - Recipient email
   * @param {string} otp - OTP code for password reset
   * @param {string} firstName - User's first name
   * @returns {Promise}
   */
  async sendPasswordResetEmail(email, otp, firstName) {
    const mailOptions = {
      from: config.mailFrom,
      to: email,
      subject: 'Password Reset Request - SyncMosaic',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 28px;">SyncMosaic</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Password Reset</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-bottom: 20px;">Hello ${firstName}!</h2>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 25px;">
              We received a request to reset your password. Use the verification code below to proceed with the password reset:
            </p>
            
            <div style="background: #fff; border: 2px dashed #ff6b6b; border-radius: 8px; padding: 20px; text-align: center; margin: 25px 0;">
              <h3 style="color: #ff6b6b; font-size: 32px; margin: 0; letter-spacing: 5px; font-weight: bold;">${otp}</h3>
            </div>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              This code will expire in ${config.otpExpiresInMinutes} minutes. If you didn't request a password reset, please ignore this email and your password will remain unchanged.
            </p>
            
            <div style="text-align: center; margin-top: 30px;">
              <p style="color: #999; font-size: 14px;">
                Best regards,<br>
                The SyncMosaic Team
              </p>
            </div>
          </div>
        </div>
      `,
    };

    return this.sendEmail(mailOptions);
  }

  /**
   * Send welcome email
   * @param {string} email - Recipient email
   * @param {string} firstName - User's first name
   * @returns {Promise}
   */
  async sendWelcomeEmail(email, firstName) {
    const mailOptions = {
      from: config.mailFrom,
      to: email,
      subject: 'Welcome to SyncMosaic!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 28px;">SyncMosaic</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Welcome Aboard!</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-bottom: 20px;">Welcome ${firstName}!</h2>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 25px;">
              Thank you for joining SyncMosaic! Your account has been successfully verified and you're now ready to explore all the amazing features we have to offer.
            </p>
            
            <div style="background: #fff; border: 2px solid #4facfe; border-radius: 8px; padding: 20px; margin: 25px 0;">
              <h3 style="color: #4facfe; margin-top: 0;">What's Next?</h3>
              <ul style="color: #666; line-height: 1.8;">
                <li>Complete your profile</li>
                <li>Explore our features</li>
                <li>Connect with others</li>
                <li>Start your journey!</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin-top: 30px;">
              <a href="${config.siteUrl}" style="background: #4facfe; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Get Started</a>
            </div>
            
            <div style="text-align: center; margin-top: 30px;">
              <p style="color: #999; font-size: 14px;">
                Best regards,<br>
                The SyncMosaic Team
              </p>
            </div>
          </div>
        </div>
      `,
    };

    return this.sendEmail(mailOptions);
  }

  /**
   * Generic email sending method
   * @param {Object} mailOptions - Nodemailer mail options
   * @returns {Promise}
   */
  async sendEmail(mailOptions) {
    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', info.messageId);
      return info;
    } catch (error) {
      console.error('Error sending email:', error);
      // throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  /**
   * Verify email configuration
   * @returns {Promise<boolean>}
   */
  async verifyConnection() {
    try {
      await this.transporter.verify();
      console.log('Email service is ready');
      return true;
    } catch (error) {
      console.error('Email service verification failed:', error);
      return false;
    }
  }
}

module.exports = new EmailService(); 