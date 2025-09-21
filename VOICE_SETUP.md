# 🎙️ AI Voice Concierge Setup Guide

This guide will help you set up the AI voice concierge system for your Reeva Car detailing service. Customers can now call the Twilio phone numbers and speak directly with an AI assistant that can handle booking requests, answer questions, and schedule appointments.

## 🚀 What's New

### Voice AI Features
- **Natural Voice Conversations**: Customers can speak naturally with the AI
- **Speech Recognition**: Advanced speech-to-text processing
- **Appointment Booking**: Voice-based appointment scheduling
- **Google Calendar Integration**: Automatic calendar event creation
- **Multi-turn Conversations**: AI remembers context throughout the call
- **Professional Voice Synthesis**: High-quality text-to-speech

## 📋 Prerequisites

1. **Existing Twilio Setup**: You should already have Twilio phone numbers configured for SMS
2. **OpenAI API Key**: Required for AI conversation processing
3. **Google Calendar Integration**: For automatic appointment scheduling
4. **HTTPS Domain**: Voice webhooks require secure connections

## 🔧 Setup Instructions

### Step 1: Configure Voice Webhooks in Twilio Console

For **each** Twilio phone number you want to enable voice calling:

1. **Log into Twilio Console**
2. **Go to Phone Numbers → Manage → Active numbers**
3. **Click on each phone number**
4. **In the Voice section, set:**
   - **Webhook URL**: `https://yourdomain.com/api/webhooks/twilio/voice`
   - **HTTP Method**: `POST`
   - **Fallback URL**: `https://yourdomain.com/api/voice/test` (optional)
5. **Save the configuration**

### Step 2: Environment Variables

Make sure these are set in your `.env` file:

```env
# OpenAI (Required for AI conversations)
OPENAI_API_KEY="sk-..."

# Google Calendar (Required for appointment scheduling)
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."

# Twilio (Required for voice calls)
TWILIO_ACCOUNT_SID="AC..."
TWILIO_AUTH_TOKEN="..."

# App Configuration
NEXTAUTH_URL="https://yourdomain.com"
```

### Step 3: Test the Voice System

1. **Test Voice Endpoint**: Visit `https://yourdomain.com/api/voice/test` to verify TwiML generation
2. **Test AI Voice**: Call your Twilio number and speak to the AI
3. **Test Booking Flow**: Try booking an appointment via voice

## 🎯 How It Works

### 1. Customer Calls Twilio Number
- Twilio receives the call and forwards to your voice webhook
- AI greets the customer professionally

### 2. Speech Recognition
- Customer speaks naturally
- Twilio converts speech to text with high accuracy
- AI processes the transcription

### 3. AI Response Generation
- OpenAI generates contextual responses
- AI can ask follow-up questions
- Maintains conversation context

### 4. Appointment Booking
- AI detects booking intent
- Extracts date, time, and service information
- Creates booking in database
- Adds event to Google Calendar (if connected)
- Confirms appointment with customer

### 5. Call Completion
- AI provides confirmation details
- Call ends with professional goodbye

## 🗣️ Voice Features

### Speech Recognition
- **Language**: English (US)
- **Model**: `phone_call` (optimized for phone conversations)
- **Confidence Threshold**: 50% (asks for clarification if unclear)
- **Timeout**: 10 seconds per input

### Voice Synthesis
- **Voice**: Polly.Joanna (natural female voice)
- **Rate**: Medium speech rate
- **Pauses**: Automatic pauses for better flow
- **Cleanup**: Removes special characters for better speech

### Conversation Flow
1. **Greeting**: Professional business greeting
2. **Intent Detection**: Identifies booking vs. general inquiry
3. **Information Gathering**: Collects appointment details
4. **Confirmation**: Confirms all details with customer
5. **Completion**: Provides confirmation and ends call

## 📞 Example Call Flow

```
Customer: *calls +1234567890*
AI: "Hello! Thank you for calling Reeva Car Detailing. I'm your AI assistant. How can I help you today?"

Customer: "I need a car wash for tomorrow at 2pm"
AI: "Great! I'd be happy to help you schedule a car wash for tomorrow at 2pm. What type of vehicle do you have?"

Customer: "It's a 2020 Honda Civic"
AI: "Perfect! A 2020 Honda Civic. Where will the vehicle be located for the service?"

Customer: "At my house in downtown"
AI: "Excellent! I have a car wash scheduled for tomorrow at 2pm for your 2020 Honda Civic at your downtown location. Is this correct?"

Customer: "Yes, that's perfect"
AI: "Wonderful! Your appointment is confirmed for tomorrow at 2pm. We'll see you then! Thank you for calling Reeva Car Detailing."

*Call ends*
```

## 🔍 Troubleshooting

### Common Issues

1. **"I didn't hear anything"**
   - Check microphone/speaker on customer's phone
   - Verify Twilio voice webhook is configured correctly
   - Check speech recognition confidence settings

2. **"Technical difficulties"**
   - Verify OpenAI API key is valid and has credits
   - Check database connection
   - Review server logs for errors

3. **No Google Calendar events created**
   - Ensure detailer has Google Calendar connected
   - Verify Google OAuth tokens are valid
   - Check Google Calendar API permissions

### Debug Endpoints

- **Voice Test**: `GET /api/voice/test` - Test TwiML generation
- **AI Test**: `POST /api/ai/test` - Test OpenAI integration
- **Health Check**: `GET /api/ai/test` - Verify all services

## 📊 Monitoring

### Voice Call Logs
- All voice interactions are stored in the `messages` table
- Look for `[VOICE]` and `[VOICE RESPONSE]` prefixes
- Monitor conversation success rates

### Booking Analytics
- Check `bookings` table for voice-generated appointments
- Monitor confirmation rates
- Track Google Calendar sync success

### Performance Metrics
- Speech recognition accuracy
- AI response time
- Call completion rates
- Booking conversion rates

## 🚀 Advanced Features

### Custom Voice Prompts
You can customize the AI's personality and responses by modifying the system prompts in:
- `/api/webhooks/twilio/voice/route.ts` (initial greeting)
- `/api/webhooks/twilio/voice/process/route.ts` (conversation handling)

### Multi-language Support
To add other languages:
1. Update Twilio speech recognition language settings
2. Modify OpenAI system prompts for different languages
3. Adjust voice synthesis language in TwiML

### Call Recording
To enable call recording:
1. Add recording parameters to TwiML responses
2. Store recordings in your database
3. Implement playback for quality assurance

## 🎉 Success!

Your AI voice concierge is now ready! Customers can call your Twilio numbers and have natural conversations with AI assistants that can:

- ✅ Answer questions about services
- ✅ Schedule appointments via voice
- ✅ Confirm booking details
- ✅ Integrate with Google Calendar
- ✅ Provide professional customer service 24/7

The system will automatically handle the entire booking flow from initial call to calendar event creation, providing a seamless experience for your customers.
