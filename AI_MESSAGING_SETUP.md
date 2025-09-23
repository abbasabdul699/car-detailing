# AI Messaging Services Setup Guide

## Overview
Your Twilio campaign has been approved and you now have AI-powered messaging services set up. This guide will help you configure and test the complete AI messaging flow.

## What's Been Set Up

### 1. AI-Powered SMS Webhook
- **Endpoint**: `/api/webhooks/twilio/sms-ai/route.ts`
- **Purpose**: Handles incoming SMS messages and generates AI responses
- **Features**:
  - Automatic conversation management
  - AI-powered responses using OpenAI GPT-3.5-turbo
  - Booking request detection and extraction
  - Twilio SMS integration

### 2. Test Endpoint
- **Endpoint**: `/api/test/sms-ai/route.ts`
- **Purpose**: Test AI messaging without sending actual SMS
- **Usage**: Send POST requests to test the AI response generation

## Configuration Steps

### Step 1: Update Twilio Webhook URL
In your Twilio Console, update the webhook URL for incoming messages:

1. Go to Phone Numbers → Manage → Active Numbers
2. Click on your phone number
3. In the "Messaging" section, update the webhook URL to:
   ```
   https://yourdomain.com/api/webhooks/twilio/sms-ai
   ```
4. Set HTTP method to `POST`
5. Save the configuration

### Step 2: Environment Variables
Ensure these environment variables are set:

```bash
# Required for AI messaging
OPENAI_API_KEY=your_openai_api_key

# Required for Twilio SMS
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token

# Required for webhook URLs
NEXTAUTH_URL=https://yourdomain.com
```

### Step 3: Database Schema
The system uses these database tables:
- `Detailer` - Business information and Twilio phone numbers
- `Conversation` - SMS conversation threads
- `Message` - Individual messages in conversations
- `Booking` - Extracted booking requests

## Testing the Setup

### Test 1: AI Response Generation
```bash
curl -X POST https://yourdomain.com/api/test/sms-ai \
  -H "Content-Type: application/json" \
  -d '{
    "detailerId": "your_detailer_id",
    "customerPhone": "+1234567890",
    "message": "Hi, I need a car wash appointment"
  }'
```

### Test 2: Full SMS Flow
1. Send an SMS to your Twilio phone number
2. Check the webhook logs for processing
3. Verify the AI response is sent back

## Features

### AI Capabilities
- **Appointment Booking**: Automatically detects and processes booking requests
- **Service Information**: Answers questions about available services
- **Pricing Inquiries**: Provides information about service costs
- **Availability**: Helps with scheduling and time slots

### Booking Detection
The AI automatically detects when customers want to book appointments by looking for keywords like:
- "book", "appointment", "schedule", "reserve"
- Date and time patterns
- Service requests

### Conversation Management
- Maintains conversation history
- Context-aware responses
- Automatic conversation creation and updates

## Monitoring and Debugging

### Webhook Logs
Check your application logs for:
- `=== AI SMS WEBHOOK START ===` - Webhook processing started
- `=== AI SMS WEBHOOK SUCCESS ===` - Successful processing
- `=== AI SMS WEBHOOK ERROR ===` - Error occurred

### Database Monitoring
Monitor these tables:
- `Message` - All incoming and outgoing messages
- `Conversation` - Active conversation threads
- `Booking` - Extracted booking requests

### Common Issues

1. **No AI Response**: Check OpenAI API key and quota
2. **SMS Not Sending**: Verify Twilio credentials and phone number
3. **Webhook Not Triggered**: Check Twilio webhook URL configuration

## Next Steps

1. **Configure Twilio Webhook**: Update your Twilio phone number webhook URL
2. **Test the Flow**: Send test messages to verify everything works
3. **Monitor Performance**: Watch logs and database for any issues
4. **Customize Responses**: Modify the AI system prompt for your business needs

## Support

If you encounter any issues:
1. Check the application logs
2. Verify environment variables
3. Test the individual components (AI API, Twilio SMS)
4. Review the database for conversation and message data

The AI messaging system is now ready to handle customer inquiries and booking requests automatically!
