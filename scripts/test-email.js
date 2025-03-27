const nodemailer = require('nodemailer');

async function testEmail() {
  // Create transporter
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: 'shermohammad6999@gmail.com',
      pass: 'ljgtgwwhbcbzfolu'
    }
  });

  try {
    // Verify connection
    await transporter.verify();
    console.log('SMTP connection verified');

    // Send test email
    const info = await transporter.sendMail({
      from: 'shermohammad6999@gmail.com',
      to: 'asiabashir699@gmail.com',
      subject: 'Test Email',
      text: 'This is a test email from Nodemailer'
    });

    console.log('Email sent successfully');
    console.log('Message ID:', info.messageId);
  } catch (error) {
    console.error('Error:', error);
  }
}

testEmail(); 