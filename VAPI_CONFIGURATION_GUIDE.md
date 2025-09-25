# Vapi Configuration Guide - Step by Step

This guide will walk you through setting up your Vapi assistant to work with your Google Calendar integration.

## 🎯 **What We're Setting Up:**

- Vapi assistant that can check calendar availability
- Vapi assistant that can create bookings
- Integration with your existing Google Calendar system
- Natural conversation flow for customers

## 📋 **Step 1: Vapi Dashboard Configuration**

### **1.1 Go to Your Vapi Assistant**

1. **Open**: `https://dashboard.vapi.ai/assistants`
2. **Click on**: "Reeva" assistant (or create a new one)
3. **You should see**: The assistant configuration page

### **1.2 Configure the Model Tab**

**Provider**: `OpenAI`  
**Model**: `GPT-4o` (or `GPT-5` if available)  
**Temperature**: `0.7`  
**Max Tokens**: `200`  

### **1.3 Set the Webhook URL**

**Webhook URL**: 
```
https://www.reevacar.com/api/vapi/webhook
```

**Webhook Events** (enable these):
- ✅ `assistant-request`
- ✅ `function-call` 
- ✅ `status-update`
- ✅ `end-of-call-report`

### **1.4 Update the System Prompt**

Replace the current system prompt with:

```
You are the AI assistant for Brooks Car Care, a car detailing business.

Available services: Car Wash, Interior Detail, Exterior Detail, Full Detail, Waxing, Paint Correction

You're having a natural phone conversation with a customer. Be friendly, helpful, and conversational.

When booking appointments, collect:
- Customer name and phone number
- Vehicle make, model, and year
- Preferred date and time
- Services needed
- Location/address

Use the available functions to check calendar availability and create bookings.

Be conversational and natural - not robotic. Show enthusiasm and be helpful.

IMPORTANT: You're using ElevenLabs voice synthesis, so speak naturally with:
- Natural pauses and breathing
- Appropriate tone changes
- Conversational flow
- Professional but friendly demeanor
```

### **1.5 Configure Functions**

Click on the **"Tools"** tab and add these two functions:

#### **Function 1: Check Availability**

**Name**: `check_availability`  
**Description**: `Check if a specific date and time is available for booking`  

**Parameters**:
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

#### **Function 2: Create Booking**

**Name**: `create_booking`  
**Description**: `Create a new booking/appointment`  

**Parameters**:
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

### **1.6 Configure Voice Settings (ElevenLabs)**

**Voice Provider**: `ElevenLabs`  
**Voice**: Choose your preferred ElevenLabs voice (e.g., `Adam`, `Sarah`, `Rachel`)  
**Speech Rate**: `1.0` (normal speed)  
**Voice Settings**: 
- **Stability**: `0.5` (balanced between consistent and expressive)
- **Clarity**: `0.75` (clear speech)
- **Style**: `0.3` (slightly expressive but professional)

**Note**: ElevenLabs provides much better voice quality than Twilio's default voices, giving your AI a more natural and professional sound.

#### **ElevenLabs Voice Selection Tips:**

**For Car Detailing Business:**
- **Male voices**: `Adam`, `Antoni`, `Arnold` (professional, friendly)
- **Female voices**: `Sarah`, `Rachel`, `Bella` (warm, approachable)
- **Professional voices**: `Josh`, `Daniel` (authoritative, trustworthy)

**Voice Characteristics:**
- **Adam**: Warm, professional, good for customer service
- **Sarah**: Clear, friendly, great for phone calls
- **Rachel**: Natural, conversational, very human-like
- **Antoni**: Deep, confident, good for business calls

### **1.7 Set Phone Number**

**Phone Number**: Use your Vapi phone number (the one customers will call)

## 📋 **Step 2: Environment Variables**

### **2.1 Phone Number Setup**

**Important**: Vapi uses Twilio phone numbers, not its own phone numbers.

1. **Get a Twilio phone number** (if you don't have one)
2. **Configure that Twilio number in Vapi**
3. **Make sure your detailer record has the same Twilio number**

### **2.2 Verify Your Detailer Record**

Make sure your detailer record in the database has:
- `twilioPhoneNumber` matching your Twilio number used in Vapi
- `googleCalendarConnected: true`
- Valid Google Calendar tokens

### **2.3 Environment Variables**

You don't need a separate `VAPI_PHONE_NUMBER` variable. The system will use your existing `TWILIO_PHONE_NUMBER` environment variable.

### **2.4 ElevenLabs Configuration**

**In Vapi Dashboard:**
1. **Go to Voice settings**
2. **Select ElevenLabs as provider**
3. **Choose your preferred voice** (Adam, Sarah, Rachel, etc.)
4. **Set voice parameters**:
   - **Stability**: `0.5` (balanced)
   - **Clarity**: `0.75` (clear speech)
   - **Style**: `0.3` (slightly expressive)

**ElevenLabs API Key**: Make sure you have a valid ElevenLabs API key configured in Vapi for voice synthesis.

## 📋 **Step 3: Test the Integration**

### **3.1 Test the Webhook**

1. **Call your Vapi number**
2. **Say**: "Hi, I'd like to book a car wash for tomorrow at 2pm"
3. **Check your logs** to see if the webhook is being called

### **3.2 Test Availability Check**

1. **Say**: "Is tomorrow at 2pm available?"
2. **The AI should**: Check your Google Calendar and respond
3. **Check your Google Calendar** to see if it's actually checking

### **3.3 Test Booking Creation**

1. **Say**: "I want to book an appointment"
2. **Provide details**: Name, phone, vehicle, services, date/time
3. **Check your Google Calendar** for the new event
4. **Check your detailer dashboard** for the new booking

## 🎙️ **Example Conversation Flow**

```
Customer: *calls +1234567890*
AI: "Hi! Thanks for calling Brooks Car Care. How can I help you today?"

Customer: "I need a car wash for tomorrow at 2pm"
AI: "Great! Let me check if that time is available... *calls check_availability function* Yes, 2pm tomorrow is available! What's your name?"

Customer: "John Smith"
AI: "Perfect! What's your phone number?"

Customer: "555-123-4567"
AI: "Great! What kind of car do you have?"

Customer: "2020 Toyota Camry"
AI: "Excellent! What services do you need?"

Customer: "Just a basic wash"
AI: "Perfect! Let me book that for you... *calls create_booking function* Done! I've booked your basic wash for your 2020 Toyota Camry tomorrow at 2pm. You'll get a confirmation text shortly. Anything else I can help with?"
```

## 🔧 **Troubleshooting**

### **Issue: "Detailer not found"**
- **Check**: Your Twilio phone number in Vapi matches your detailer's `twilioPhoneNumber`
- **Check**: Your detailer record exists in the database
- **Check**: The `TWILIO_PHONE_NUMBER` environment variable is set correctly

### **Issue: Availability check fails**
- **Check**: Your detailer has Google Calendar connected
- **Check**: Google Calendar tokens are valid
- **Check**: Your webhook is receiving the function calls

### **Issue: Booking creation fails**
- **Check**: All required fields are provided
- **Check**: Google Calendar integration is working
- **Check**: Your booking API is working

### **Issue: No response from AI**
- **Check**: Webhook URL is correct
- **Check**: Functions are properly configured
- **Check**: System prompt is set correctly

## 📊 **Monitoring**

1. **Vapi Dashboard**: Check call logs and function calls
2. **Your App Logs**: Check webhook processing
3. **Google Calendar**: Verify events are created
4. **Detailer Dashboard**: Check for new bookings

## 🚀 **Next Steps After Setup**

1. **Test thoroughly** with different scenarios
2. **Monitor the first few calls** for any issues
3. **Adjust the system prompt** if needed
4. **Add more services** to the available services list
5. **Consider adding more functions** (like rescheduling, cancellation)

---

**Your Vapi voice AI is now ready to handle bookings with Google Calendar integration!** 🎉

The key is making sure the phone number in your environment variable matches the phone number in your detailer record, and that your detailer has Google Calendar connected.
