import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import nodemailer from 'nodemailer'


// When user registers at /auth/register:
// 1. User fills out registration form
// 2. Form submits to /api/auth/register
// 3. Server creates user with emailVerified = false
// 4. Server generates 6-digit code and saves it in VerificationToken table
// 5. Server sends email with verification code

// When user clicks verify email button at /auth/verify:
// 1. User clicks button
// 2. Form submits to /api/auth/verify-email
// 3. Server verifies code
// 4. Server updates user's emailVerified to true
// 5. Server deletes verification code from VerificationToken table


//1. User registers
// 2. User receives email with 6-digit code
// 3. User is redirected to /auth/verify
// 4. User enters code in verification form
// 5. If code is valid:
//    - User's email is marked as verified
//    - User is redirected to dashboard
// 6. If code is invalid:
//    - Error message is shown
//    - User can try again

// Email configuration
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    // If only email is provided, send verification code
    if (body.email && !body.code) {
      const code = Math.floor(100000 + Math.random() * 900000).toString()
      const expires = new Date(Date.now() + 30 * 60 * 1000) // 30 minutes

      // Save code to database
      await prisma.verificationToken.create({
        data: {
          code,
          email: body.email,
          expires
        }
      })

      // Send verification email
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: body.email,
        subject: 'Verify your email address',
        html: `
          <h1>Email Verification</h1>
          <p>Your verification code is: <strong>${code}</strong></p>
          <p>This code will expire in 30 minutes.</p>
        `
      })

      return NextResponse.json({ message: 'Verification code sent' })
    }
    
    // If code is provided, verify it
    if (body.code) {
      const verificationToken = await prisma.verificationToken.findFirst({
        where: {
          code: body.code,
          expires: {
            gt: new Date()
          }
        }
      })

      if (!verificationToken) {
        return NextResponse.json(
          { error: 'Invalid or expired verification code' },
          { status: 400 }
        )
      }

      // Update user's email verification status
      await prisma.user.update({
        where: {
          email: verificationToken.email
        },
        data: {
          emailVerified: true
        }
      })

      // Delete the used verification token
      await prisma.verificationToken.delete({
        where: {
          id: verificationToken.id
        }
      })

      return NextResponse.json({ message: 'Email verified successfully' })
    }

    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Email verification error:', error)
    return NextResponse.json(
      { error: 'Failed to process verification' },
      { status: 500 }
    )
  }
} 