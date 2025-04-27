import nodemailer from 'nodemailer';

export function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function sendEmail(to: string, subject: string, code: string) {
  console.log('Creating email transporter with config...');
  
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    requireTLS: true,
    auth: {
      user: 'shermohammad6999@gmail.com',
      pass: 'ljgtgwwhbcbzfolu'
    },
    tls: {
      rejectUnauthorized: false
    },
    debug: true
  });

  // Create a better HTML template
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Your Verification Code</h2>
      <p style="font-size: 16px; color: #666;">Your verification code is:</p>
      <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0;">
        <h1 style="color: #000; font-size: 32px; margin: 0;">${code}</h1>
      </div>
      <p style="color: #666;">This code will expire in 10 minutes.</p>
      <p style="color: #999; font-size: 14px;">If you didn't request this code, please ignore this email.</p>
    </div>
  `;

  const mailOptions = {
    from: {
      name: 'Renu Verification',
      address: 'shermohammad6999@gmail.com'
    },
    to,
    subject,
    html: htmlContent,
    text: `Your verification code is: ${code}. This code will expire in 10 minutes.`,
    priority: 'high'
  };

  try {
    console.log('Verifying SMTP connection...');
    await transporter.verify();
    console.log('SMTP connection verified');

    console.log('Sending email with options:', {
      to: mailOptions.to,
      from: mailOptions.from,
      subject: mailOptions.subject
    });

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent with info:', {
      messageId: info.messageId,
      response: info.response,
      accepted: info.accepted,
      rejected: info.rejected
    });
    
    return true;
  } catch (error) {
    console.error('Detailed email error:', {
      name: error.name,
      message: error.message,
      code: error.code,
      command: error.command,
      response: error.response
    });
    throw error;
  }
} 