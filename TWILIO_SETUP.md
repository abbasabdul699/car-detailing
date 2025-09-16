# Twilio SMS Integration Setup Guide

This guide will help you set up Twilio SMS integration for your Reeva Car AI system with **multiple detailer phone numbers**.

## Prerequisites

1. Twilio account (sign up at [twilio.com](https://twilio.com))
2. Multiple phone numbers with SMS capabilities (one per detailer)
3. Your application deployed and accessible via HTTPS

## Step 1: Get Twilio Credentials

1. Log into your Twilio Console
2. Go to **Account** → **API Keys & Tokens**
3. Copy your:
   - **Account SID**
   - **Auth Token**

## Step 2: Purchase Phone Numbers for Each Detailer

1. In Twilio Console, go to **Phone Numbers** → **Manage** → **Buy a number**
2. Choose numbers with SMS capabilities
3. Purchase one number for each detailer
4. Copy each phone number (format: +1234567890)
5. **Important**: You'll need to configure the webhook for each number

## Step 3: Configure Webhooks for Each Phone Number

**Important**: You need to configure the same webhook URL for ALL phone numbers.

1. In Twilio Console, go to **Phone Numbers** → **Manage** → **Active numbers**
2. For **each** purchased number:
   - Click on the number
   - In the **Messaging** section, set:
     - **Webhook URL**: `https://yourdomain.com/api/webhooks/twilio`
     - **HTTP Method**: `POST`
   - Save the configuration

## Step 4: Set Environment Variables

Add these to your `.env` file:

```bash
# Twilio Configuration
TWILIO_ACCOUNT_SID="your_account_sid_here"
TWILIO_AUTH_TOKEN="your_auth_token_here"
TWILIO_WEBHOOK_AUTH_SECRET="your_random_secret_string_here"

# Other required variables
OPENAI_API_KEY="your_openai_api_key"
MONGODB_URI="your_mongodb_connection_string"
```

**Note**: Individual detailer phone numbers are stored in the database, not in environment variables.

## Step 5: Configure Detailer Phone Numbers

1. **Access the admin panel**: Go to `/admin/sms-settings`
2. **For each detailer**:
   - Enter their Twilio phone number (format: +1234567890)
   - Enable SMS functionality
   - Click "Update"

## Step 6: Test the Integration

### Option 1: Using the Test Script

1. Update the test script with your detailer's phone number:
   ```bash
   # Edit scripts/test-sms.js
   const DETAILER_PHONE = '+1987654321'; // Replace with actual detailer phone
   ```
2. Make sure your app is running
3. Run the test script:
   ```bash
   node scripts/test-sms.js
   ```

### Option 2: Manual Testing

1. Send an SMS to a detailer's Twilio phone number
2. The AI should respond with a greeting
3. Follow the conversation flow to test booking

## Step 6: Conversation Flow

The AI follows this conversation flow:

1. **Greeting**: Initial welcome message
2. **Service Inquiry**: Asks what type of service needed
3. **Vehicle Info**: Collects vehicle details
4. **Availability Check**: Asks for preferred date/time
5. **Booking Confirmation**: Confirms booking details
6. **Booking Complete**: Final confirmation

## Troubleshooting

### Common Issues

1. **Webhook not receiving messages**
   - Check that your webhook URL is accessible via HTTPS
   - Verify the webhook URL in Twilio Console
   - Check server logs for errors

2. **Signature verification failing**
   - Ensure `TWILIO_WEBHOOK_AUTH_SECRET` matches what you set
   - Check that the signature header is being read correctly

3. **Database connection issues**
   - Verify `MONGODB_URI` is correct
   - Ensure database is accessible from your server

4. **AI not responding**
   - Check `OPENAI_API_KEY` is valid
   - Verify OpenAI API credits/usage limits

### Debug Mode

Enable debug logging by setting:
```bash
DEBUG=true
```

This will show detailed logs of the conversation flow.

## Security Considerations

1. **Webhook Security**: Always verify Twilio signatures
2. **Rate Limiting**: Consider implementing rate limiting for webhook endpoints
3. **Data Privacy**: Ensure customer data is handled according to privacy regulations
4. **API Keys**: Never commit API keys to version control

## Production Deployment

1. **HTTPS Required**: Twilio webhooks require HTTPS in production
2. **Environment Variables**: Set all required environment variables
3. **Database**: Ensure production database is properly configured
4. **Monitoring**: Set up monitoring for webhook failures
5. **Backup**: Regular database backups for conversation history

## Support

For issues with this integration:
1. Check the logs for error messages
2. Verify all environment variables are set
3. Test with the provided test script
4. Check Twilio Console for webhook delivery status

## Next Steps

Once basic SMS is working:
1. Add more sophisticated conversation flows
2. Integrate with your existing detailer system
3. Add calendar integration for real availability
4. Implement customer notifications
5. Add analytics and reporting
