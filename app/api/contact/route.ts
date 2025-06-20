import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const {
      companyName,
      firstName,
      lastName,
      phone,
      phoneNumber,
      email,
      workEmail,
      message,
      formType
    } = data;

    const phoneValue = phone || phoneNumber || '';
    const emailValue = email || workEmail || '';

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
        <p><strong>Phone Number:</strong> ${phoneValue}</p>
        <p><strong>Work Email:</strong> ${emailValue}</p>
        ${companyName ? `<p><strong>Company Name:</strong> ${companyName}</p>` : ''}
        ${message ? `<p><strong>Message:</strong></p><p>${message}</p>` : ''}
      `
    };

    // Send email to admin
    await transporter.sendMail(mailOptions);

    // Send confirmation email to the user if email is provided
    if (emailValue) {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: emailValue,
        subject: "We've received your request – ReevaCar Team",
        html: `
          <div style="max-width:480px;margin:0 auto;font-family:'Segoe UI',Arial,sans-serif;background:#f9f9f9;padding:32px 24px;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
            <div style="text-align:center;margin-bottom:24px;">
              <img src="https://reevacar.s3.us-east-2.amazonaws.com/reeva-logo/logo.png" alt="ReevaCar Logo" style="height:48px;margin-bottom:8px;" />
              <h2 style="color:#0A2217;margin:0;font-size:1.5rem;">Thank you for contacting ReevaCar</h2>
            </div>
            <p style="color:#222;font-size:1.1rem;margin-bottom:16px;">
              Hi${firstName ? ' ' + firstName : ''},
            </p>
            <p style="color:#222;font-size:1.1rem;margin-bottom:16px;">
              We've received your request and a team member will reach out to you soon.
            </p>
            <div style="background:#fff;border-radius:8px;padding:16px 20px;margin-bottom:16px;border:1px solid #e0e0e0;">
              <p style="margin:0 0 8px 0;color:#555;">Here's what you submitted:</p>
              <ul style="padding-left:18px;margin:0;">
                <li><b>Name:</b> ${firstName || ''} ${lastName || ''}</li>
                <li><b>Email:</b> ${emailValue}</li>
                <li><b>Phone:</b> ${phoneValue}</li>
                ${companyName ? `<li><b>Company:</b> ${companyName}</li>` : ''}
                ${message ? `<li><b>Message:</b> ${message}</li>` : ''}
              </ul>
            </div>
            <p style="color:#222;font-size:1.05rem;margin-bottom:20px;">
              If you have any questions, reply to this email or contact us at
              <a href="mailto:reevacar@gmail.com" style="color:#389167;text-decoration:none;">reevacar@gmail.com</a>.
            </p>
            <div style="text-align:center;color:#888;font-size:0.95rem;margin-top:32px;">
              &mdash; The ReevaCar Team
            </div>
          </div>
        `
      });
    }

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