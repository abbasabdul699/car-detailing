import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SERVER_HOST,
  port: Number(process.env.EMAIL_SERVER_PORT),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_SERVER_USER,
    pass: process.env.EMAIL_SERVER_PASSWORD,
  },
});

export async function sendVerificationEmail(email: string, code: string) {
  try {
    console.log('Attempting to send email with following config:', {
      host: process.env.EMAIL_SERVER_HOST,
      port: process.env.EMAIL_SERVER_PORT,
      user: process.env.EMAIL_SERVER_USER,
    });

    const info = await transporter.sendMail({
      from: `"Reeva Security" <${process.env.EMAIL_FROM}>`,
      to: email,
      subject: "Your 2FA Verification Code",
      text: `Your verification code is: ${code}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Your Verification Code</h2>
          <p>Your verification code is: <strong>${code}</strong></p>
          <p>This code will expire in 10 minutes.</p>
        </div>
      `,
    });

    console.log('Email sent: %s', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

export async function sendPasswordResetEmail(email: string, businessName: string, resetUrl: string) {
  try {
    console.log('Sending password reset email to:', email);

    const info = await transporter.sendMail({
      from: `"Reeva Support" <${process.env.EMAIL_FROM}>`,
      to: email,
      subject: "Reset Your Reeva Password",
      text: `Hello ${businessName},\n\nYou requested a password reset for your Reeva account. Click the link below to reset your password:\n\n${resetUrl}\n\nThis link will expire in 1 hour.\n\nIf you didn't request this reset, please ignore this email.\n\nBest regards,\nThe Reeva Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #16a34a; margin: 0;">Reeva</h1>
            <p style="color: #6b7280; margin: 5px 0 0 0;">Car Detailing Platform</p>
          </div>
          
          <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #111827; margin: 0 0 15px 0;">Password Reset Request</h2>
            <p style="color: #374151; margin: 0 0 15px 0;">Hello <strong>${businessName}</strong>,</p>
            <p style="color: #374151; margin: 0 0 20px 0;">You requested a password reset for your Reeva account. Click the button below to reset your password:</p>
            
            <div style="text-align: center; margin: 25px 0;">
              <a href="${resetUrl}" style="background: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">
                Reset Password
              </a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; margin: 20px 0 0 0;">
              This link will expire in 1 hour for security reasons.
            </p>
          </div>
          
          <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center;">
            <p style="color: #6b7280; font-size: 14px; margin: 0;">
              If you didn't request this password reset, please ignore this email. Your password will remain unchanged.
            </p>
            <p style="color: #6b7280; font-size: 14px; margin: 10px 0 0 0;">
              Best regards,<br>The Reeva Team
            </p>
          </div>
        </div>
      `,
    });

    console.log('Password reset email sent: %s', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw error;
  }
}

// Generic email function for billing and other emails
export async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html: string;
  text: string;
}) {
  try {
    console.log('Sending email to:', to);

    const info = await transporter.sendMail({
      from: `"ReevaCar" <${process.env.EMAIL_FROM}>`,
      to,
      subject,
      text,
      html,
    });

    console.log('Email sent: %s', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
} 