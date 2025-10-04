import { prisma } from './prisma';
import { sendEmail } from './email';

export interface BillingEmailData {
  detailerName: string;
  detailerEmail: string;
  planName: string;
  amount: number;
  currency: string;
  periodStart: Date;
  periodEnd: Date;
  invoiceUrl?: string;
  isFirstCohort: boolean;
}

export class BillingEmailService {
  // Send monthly invoice email
  async sendInvoiceEmail(invoiceId: string) {
    try {
      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: {
          subscription: {
            include: {
              detailer: true,
              plan: true,
            },
          },
        },
      });

      if (!invoice || !invoice.subscription) {
        throw new Error('Invoice not found');
      }

      const { detailer, plan } = invoice.subscription;
      const isFirstCohort = detailer.isFirstCohort;

      const emailData: BillingEmailData = {
        detailerName: detailer.businessName,
        detailerEmail: detailer.email || '',
        planName: plan.name,
        amount: invoice.amount,
        currency: invoice.currency,
        periodStart: invoice.periodStart,
        periodEnd: invoice.periodEnd,
        isFirstCohort,
      };

      const subject = `Your ReevaCar ${plan.name} Invoice - $${invoice.amount.toFixed(2)}`;
      const htmlContent = this.generateInvoiceEmailHTML(emailData);
      const textContent = this.generateInvoiceEmailText(emailData);

      await sendEmail({
        to: detailer.email || '',
        subject,
        html: htmlContent,
        text: textContent,
      });

      console.log(`Invoice email sent to ${detailer.businessName}`);
    } catch (error) {
      console.error('Error sending invoice email:', error);
      throw error;
    }
  }

  // Send trial ending reminder
  async sendTrialEndingReminder(detailerId: string, daysRemaining: number) {
    try {
      const detailer = await prisma.detailer.findUnique({
        where: { id: detailerId },
        include: {
          subscription: {
            include: { plan: true },
          },
        },
      });

      if (!detailer || !detailer.subscription) {
        throw new Error('Detailer or subscription not found');
      }

      const emailData = {
        detailerName: detailer.businessName,
        detailerEmail: detailer.email || '',
        planName: detailer.subscription.plan.name,
        daysRemaining,
        isFirstCohort: detailer.isFirstCohort,
      };

      const subject = `Your ReevaCar trial ends in ${daysRemaining} days`;
      const htmlContent = this.generateTrialReminderHTML(emailData);
      const textContent = this.generateTrialReminderText(emailData);

      await sendEmail({
        to: detailer.email || '',
        subject,
        html: htmlContent,
        text: textContent,
      });

      console.log(`Trial reminder sent to ${detailer.businessName}`);
    } catch (error) {
      console.error('Error sending trial reminder:', error);
      throw error;
    }
  }

  // Send payment failed notification
  async sendPaymentFailedNotification(detailerId: string) {
    try {
      const detailer = await prisma.detailer.findUnique({
        where: { id: detailerId },
        include: {
          subscription: {
            include: { plan: true },
          },
        },
      });

      if (!detailer || !detailer.subscription) {
        throw new Error('Detailer or subscription not found');
      }

      const emailData = {
        detailerName: detailer.businessName,
        detailerEmail: detailer.email || '',
        planName: detailer.subscription.plan.name,
        isFirstCohort: detailer.isFirstCohort,
      };

      const subject = 'Payment Failed - Update Your Payment Method';
      const htmlContent = this.generatePaymentFailedHTML(emailData);
      const textContent = this.generatePaymentFailedText(emailData);

      await sendEmail({
        to: detailer.email || '',
        subject,
        html: htmlContent,
        text: textContent,
      });

      console.log(`Payment failed notification sent to ${detailer.businessName}`);
    } catch (error) {
      console.error('Error sending payment failed notification:', error);
      throw error;
    }
  }

  private generateInvoiceEmailHTML(data: BillingEmailData): string {
    const discountMessage = data.isFirstCohort 
      ? '<p style="color: #10b981; font-weight: bold;">🎉 You\'re part of our first cohort and receiving a 15% discount!</p>'
      : '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Your ReevaCar Invoice</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: white; padding: 30px; border: 1px solid #e5e7eb; }
          .footer { background: #f9fafb; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none; }
          .invoice-details { background: #f9fafb; padding: 20px; border-radius: 6px; margin: 20px 0; }
          .amount { font-size: 24px; font-weight: bold; color: #10b981; }
          .button { display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>💳 Your ReevaCar Invoice</h1>
            <p>Thank you for being part of the ReevaCar community!</p>
          </div>
          
          <div class="content">
            <h2>Hello ${data.detailerName}!</h2>
            
            ${discountMessage}
            
            <p>Here's your monthly invoice for your <strong>${data.planName}</strong> subscription:</p>
            
            <div class="invoice-details">
              <h3>Invoice Details</h3>
              <p><strong>Plan:</strong> ${data.planName}</p>
              <p><strong>Amount:</strong> <span class="amount">$${data.amount.toFixed(2)} ${data.currency.toUpperCase()}</span></p>
              <p><strong>Billing Period:</strong> ${data.periodStart.toLocaleDateString()} - ${data.periodEnd.toLocaleDateString()}</p>
              <p><strong>Status:</strong> Paid ✅</p>
            </div>
            
            <p>Your subscription is active and you're all set to continue growing your detailing business with ReevaCar!</p>
            
            <p style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXTAUTH_URL}/detailer-dashboard/subscription" class="button">
                Manage Subscription
              </a>
            </p>
            
            <p>If you have any questions about your invoice or subscription, please don't hesitate to reach out to our support team.</p>
          </div>
          
          <div class="footer">
            <p>© 2024 ReevaCar. All rights reserved.</p>
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generateInvoiceEmailText(data: BillingEmailData): string {
    const discountMessage = data.isFirstCohort 
      ? '🎉 You\'re part of our first cohort and receiving a 15% discount!\n\n'
      : '';

    return `
Your ReevaCar Invoice

Hello ${data.detailerName}!

${discountMessage}Here's your monthly invoice for your ${data.planName} subscription:

Invoice Details:
- Plan: ${data.planName}
- Amount: $${data.amount.toFixed(2)} ${data.currency.toUpperCase()}
- Billing Period: ${data.periodStart.toLocaleDateString()} - ${data.periodEnd.toLocaleDateString()}
- Status: Paid ✅

Your subscription is active and you're all set to continue growing your detailing business with ReevaCar!

Manage your subscription: ${process.env.NEXTAUTH_URL}/detailer-dashboard/subscription

If you have any questions about your invoice or subscription, please don't hesitate to reach out to our support team.

© 2024 ReevaCar. All rights reserved.
This is an automated message. Please do not reply to this email.
    `;
  }

  private generateTrialReminderHTML(data: any): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Trial Ending Soon</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: white; padding: 30px; border: 1px solid #e5e7eb; }
          .footer { background: #f9fafb; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none; }
          .button { display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⏰ Your Trial is Ending Soon</h1>
            <p>Don't miss out on growing your business!</p>
          </div>
          
          <div class="content">
            <h2>Hello ${data.detailerName}!</h2>
            
            <p>Your ReevaCar trial for the <strong>${data.planName}</strong> plan ends in <strong>${data.daysRemaining} days</strong>.</p>
            
            <p>To continue receiving bookings and growing your detailing business, you'll need to add a payment method to your account.</p>
            
            <p style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXTAUTH_URL}/detailer-dashboard/subscription" class="button">
                Add Payment Method
              </a>
            </p>
            
            <p>If you have any questions, our support team is here to help!</p>
          </div>
          
          <div class="footer">
            <p>© 2024 ReevaCar. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generateTrialReminderText(data: any): string {
    return `
Your ReevaCar Trial is Ending Soon

Hello ${data.detailerName}!

Your ReevaCar trial for the ${data.planName} plan ends in ${data.daysRemaining} days.

To continue receiving bookings and growing your detailing business, you'll need to add a payment method to your account.

Add payment method: ${process.env.NEXTAUTH_URL}/detailer-dashboard/subscription

If you have any questions, our support team is here to help!

© 2024 ReevaCar. All rights reserved.
    `;
  }

  private generatePaymentFailedHTML(data: any): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Payment Failed</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #ef4444, #dc2626); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: white; padding: 30px; border: 1px solid #e5e7eb; }
          .footer { background: #f9fafb; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none; }
          .button { display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⚠️ Payment Failed</h1>
            <p>Please update your payment method</p>
          </div>
          
          <div class="content">
            <h2>Hello ${data.detailerName}!</h2>
            
            <p>We were unable to process the payment for your <strong>${data.planName}</strong> subscription.</p>
            
            <p>This could be due to:</p>
            <ul>
              <li>Expired credit card</li>
              <li>Insufficient funds</li>
              <li>Bank declined the transaction</li>
            </ul>
            
            <p>Please update your payment method to continue your subscription and avoid any service interruption.</p>
            
            <p style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXTAUTH_URL}/detailer-dashboard/subscription" class="button">
                Update Payment Method
              </a>
            </p>
            
            <p>If you need help, our support team is available to assist you.</p>
          </div>
          
          <div class="footer">
            <p>© 2024 ReevaCar. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generatePaymentFailedText(data: any): string {
    return `
Payment Failed - Update Your Payment Method

Hello ${data.detailerName}!

We were unable to process the payment for your ${data.planName} subscription.

This could be due to:
- Expired credit card
- Insufficient funds
- Bank declined the transaction

Please update your payment method to continue your subscription and avoid any service interruption.

Update payment method: ${process.env.NEXTAUTH_URL}/detailer-dashboard/subscription

If you need help, our support team is available to assist you.

© 2024 ReevaCar. All rights reserved.
    `;
  }
}

export const billingEmailService = new BillingEmailService();
