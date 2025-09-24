# Vapi Voice AI + Google Calendar Integration Setup

This guide will help you connect your Vapi voice AI assistant to your Google Calendar system for automatic appointment booking and availability checking.

## 🎯 What This Does

- **Voice AI Booking**: Customers can call and book appointments through natural conversation
- **Google Calendar Integration**: Automatically checks availability and creates calendar events
- **Real-time Availability**: Prevents double-booking by checking both local database and Google Calendar
- **Seamless Experience**: Customers get instant confirmation and calendar sync

## 📋 Prerequisites

1. **Vapi Account**: You already have a Vapi dashboard set up
2. **Google Calendar Connected**: Your detailer accounts have Google Calendar integration
3. **Twilio Phone Numbers**: Each detailer has a Twilio phone number for voice calls

## 🔧 Setup Steps

### Step 1: Configure Vapi Assistant

1. **Go to your Vapi Dashboard**: `https://dashboard.vapi.ai/assistants`
2. **Select your "Reeva" assistant**
3. **Update the Model tab**:
   - Provider: `OpenAI`
   - Model: `GPT-4o` (or `GPT-5` if available)
   - Temperature: `0.7`
   - Max Tokens: `200`

4. **Update the System Prompt**:
```
You are the AI assistant for [Business Name], a car detailing business.

Available services: [List your services]

You're having a natural phone conversation with a customer. Be friendly, helpful, and conversational.

When booking appointments, collect:
- Customer name and phone number
- Vehicle make, model, and year
- Preferred date and time
- Services needed
- Location/address

Use the available functions to check calendar availability and create bookings.

Be conversational and natural - not robotic. Show enthusiasm and be helpful.
```

### Step 2: Configure Webhook URL

1. **In your Vapi assistant settings**, set the webhook URL to:
   ```
   https://www.reevacar.com/api/vapi/webhook
   ```

2. **Enable the following webhook events**:
   - `assistant-request`
   - `function-call`
   - `status-update`
   - `end-of-call-report`

### Step 3: Configure Functions

Add these functions to your Vapi assistant:

#### Function 1: Check Availability
- **Name**: `check_availability`
- **Description**: `Check if a specific date and time is available for booking`
- **Parameters**:
  ```json
  {
    "type": "object",
    "properties": {
      "date": {
        "type": "string",
        "description": "Date in YYYY-MM-DD format"
      },
      "time": {
        "type": "string", 
        "description": "Time in HH:MM format (24-hour)"
      }
    },
    "required": ["date", "time"]
  }
  ```

#### Function 2: Create Booking
- **Name**: `create_booking`
- **Description**: `Create a new booking/appointment`
- **Parameters**:
  ```json
  {
    "type": "object",
    "properties": {
      "customerName": {
        "type": "string",
        "description": "Customer full name"
      },
      "customerPhone": {
        "type": "string",
        "description": "Customer phone number"
      },
      "vehicleMake": {
        "type": "string",
        "description": "Vehicle make (e.g., Toyota, Honda)"
      },
      "vehicleModel": {
        "type": "string",
        "description": "Vehicle model (e.g., Camry, Civic)"
      },
      "vehicleYear": {
        "type": "string",
        "description": "Vehicle year"
      },
      "services": {
        "type": "array",
        "items": { "type": "string" },
        "description": "List of services requested"
      },
      "scheduledDate": {
        "type": "string",
        "description": "Scheduled date in YYYY-MM-DD format"
      },
      "scheduledTime": {
        "type": "string",
        "description": "Scheduled time in HH:MM format"
      },
      "address": {
        "type": "string",
        "description": "Service location address"
      }
    },
    "required": ["customerName", "customerPhone", "vehicleMake", "vehicleModel", "vehicleYear", "services", "scheduledDate", "scheduledTime"]
  }
  ```

### Step 4: Configure Phone Number Mapping

1. **In your Vapi assistant**, set the phone number to match your detailer's Twilio number
2. **Update the webhook code** to map phone numbers to detailer IDs:

```typescript
// In app/api/vapi/webhook/route.ts, update the detailer lookup:
const detailer = await prisma.detailer.findFirst({
  where: {
    twilioPhoneNumber: call.assistant?.phoneNumber || call.assistant?.number
  }
});
```

### Step 5: Test the Integration

1. **Call your Vapi phone number**
2. **Try booking an appointment**:
   - "Hi, I'd like to book a car wash for tomorrow at 2pm"
   - Provide your name, phone, vehicle details
   - Confirm the booking

3. **Check your Google Calendar** - the appointment should appear automatically
4. **Check your detailer dashboard** - the booking should appear in the bookings list

## 🎙️ Example Conversation Flow

```
Customer: *calls +1234567890*
AI: "Hi! Thanks for calling Brooks Car Care. I'm your AI assistant. How can I help you today?"

Customer: "I need a car wash for tomorrow at 2pm"
AI: "Great! I'd be happy to help you schedule a car wash for tomorrow at 2pm. What's your name?"

Customer: "John Smith"
AI: "Nice to meet you, John! What's your phone number?"

Customer: "555-123-4567"
AI: "Perfect! What kind of vehicle do you have?"

Customer: "2020 Toyota Camry"
AI: "Great! Let me check if 2pm tomorrow is available... *checks calendar* Yes, that time is available! What services do you need?"

Customer: "Just a basic wash"
AI: "Perfect! I've got you down for a basic wash for your 2020 Toyota Camry tomorrow at 2pm. You'll receive a confirmation text shortly. Is there anything else I can help you with?"

Customer: "That's it, thanks!"
AI: "You're welcome! Have a great day and we'll see you tomorrow at 2pm!"
```

## 🔧 Troubleshooting

### Issue: "Detailer not found"
- **Solution**: Make sure the Vapi phone number matches the `twilioPhoneNumber` in your detailer record

### Issue: "Google Calendar not connected"
- **Solution**: Ensure the detailer has connected their Google Calendar in the detailer dashboard

### Issue: Availability check fails
- **Solution**: Check that the detailer's Google Calendar tokens are valid and not expired

### Issue: Booking creation fails
- **Solution**: Check the database connection and ensure all required fields are provided

## 📊 Monitoring

1. **Check Vapi logs** in your Vapi dashboard for call logs and errors
2. **Check your application logs** for webhook processing
3. **Monitor Google Calendar** for automatic event creation
4. **Check your detailer dashboard** for new bookings

## 🚀 Advanced Features

### Custom Voice
- Configure different voices for different detailers
- Use ElevenLabs for more natural speech
- Adjust speech rate and tone

### Multi-language Support
- Add language detection
- Configure different system prompts for different languages
- Use appropriate voice models

### Integration with SMS
- Send SMS confirmations after voice bookings
- Follow up with appointment reminders
- Handle both voice and SMS in the same conversation

## 📞 Support

If you need help with the setup:
1. Check the Vapi documentation: `https://docs.vapi.ai`
2. Review your webhook logs in the Vapi dashboard
3. Check your application logs for errors
4. Test the individual API endpoints: `/api/vapi/availability` and `/api/vapi/booking`

---

**Your voice AI is now connected to Google Calendar!** 🎉
