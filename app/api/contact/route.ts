import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { companyName, firstName, lastName, phoneNumber, workEmail, message, formType, smsOptIn, promotionalOptIn } = data;

    // Create email transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER, // your Gmail address
        pass: process.env.EMAIL_PASS  // your app-specific password
      }
    });

    // Determine subject based on form type
    const subject = formType === 'faq' 
      ? 'FAQ Submission Form' 
      : 'New Contact Form Submission';

    // Email content
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: 'reevacar@gmail.com',
      subject,
      html: `
        <h2>${subject}</h2>
        <p><strong>First Name:</strong> ${firstName}</p>
        <p><strong>Last Name:</strong> ${lastName}</p>
        <p><strong>Phone Number:</strong> ${phoneNumber}</p>
        <p><strong>Work Email:</strong> ${workEmail}</p>
        ${companyName ? `<p><strong>Company Name:</strong> ${companyName}</p>` : ''}
        <p><strong>SMS Opt-In:</strong> ${smsOptIn ? 'Yes' : 'No'}</p>
        <p><strong>Promotional SMS Opt-In:</strong> ${promotionalOptIn ? 'Yes' : 'No'}</p>
        ${message ? `<p><strong>Message:</strong></p><p>${message}</p>` : ''}
      `
    };

    // Send email
    await transporter.sendMail(mailOptions);

    return NextResponse.json(
      { message: 'Email sent successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Email error:', error);
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    );
  }
} 