import nodemailer from 'nodemailer';

export async function GET() {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_SERVER_HOST,
    port: Number(process.env.EMAIL_SERVER_PORT),
    secure: false,
    auth: {
      user: process.env.EMAIL_SERVER_USER,
      pass: process.env.EMAIL_SERVER_PASSWORD,
    },
    debug: true // Enable debug logs
  });

  try {
    // Verify the connection configuration
    await transporter.verify();
    console.log('Server is ready to take our messages');

    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: "asiabashir699@gmail.com", // your email to test
      subject: "Test Email",
      text: "If you receive this, the email configuration is working!",
    });

    console.log('Message sent: %s', info.messageId);
    return new Response('Test email sent successfully');
  } catch (error) {
    console.error('Error:', error);
    return new Response(`Failed to send email: ${error.message}`, { status: 500 });
  }
} 