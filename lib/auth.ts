export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Re-export authOptions from the nextauth route for convenience
export { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function sendEmail(email: string, subject: string, message: string) {
  // Implement email sending using your preferred service (SendGrid, etc.)
  // For example with SendGrid:
  /*
  const sgMail = require('@sendgrid/mail');
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  
  await sgMail.send({
    to: email,
    from: 'your-verified-sender@example.com',
    subject: subject,
    text: message,
  });
  */
} 