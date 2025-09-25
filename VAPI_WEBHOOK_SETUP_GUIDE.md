# Vapi Webhook Setup - Step by Step Guide

## 🎯 **Goal: Replace n8n with Your App**

Change Vapi webhook from n8n to your existing Google Calendar integration.

## 📋 **Step 1: Access Your Vapi Assistant**

1. **Go to**: `https://dashboard.vapi.ai/assistants`
2. **Click on**: "Reeva" assistant (the one you showed in the screenshot)
3. **You should see**: The assistant configuration page

## 📋 **Step 2: Find Webhook Configuration**

Look for the webhook URL in one of these places:

### **Option A: Advanced Tab**
1. **Click**: "Advanced" tab
2. **Look for**: "Webhook URL" or "Server URL" field
3. **This is where**: You'll change the URL

### **Option B: Tools Tab**
1. **Click**: "Tools" tab
2. **Look for**: "Webhook" or "Server" configuration
3. **This might be**: Where the webhook is set

### **Option C: Main Settings**
1. **Look around**: The main configuration area
2. **Look for**: "Webhook" or "Server URL" field
3. **This could be**: In the general settings

## 📋 **Step 3: Change the Webhook URL**

**Current URL** (probably something like):
```
https://your-n8n-url/webhook/calendar_availability
https://your-n8n-url/webhook/calendar_set_appointment
```

**New URL** (change to):
```
https://www.reevacar.com/api/vapi/webhook
```

## 📋 **Step 4: Add Functions**

In the **"Tools"** tab, add these two functions:

### **Function 1: Check Availability**

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

### **Function 2: Create Booking**

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

## 📋 **Step 5: Update System Prompt**

In the **"Model"** tab, update the system prompt to:

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

## 📋 **Step 6: Test the Integration**

1. **Save** all your changes in Vapi
2. **Call**: `+1 617 882 7958`
3. **Say**: "Hi, I'd like to book a car wash for tomorrow at 2pm"
4. **Check**: Your app logs to see if the webhook is being called
5. **Verify**: No more double-booking issues

## 🔧 **Troubleshooting**

### **Can't Find Webhook URL?**
- **Look in**: All tabs (Model, Voice, Tools, Advanced, etc.)
- **Search for**: "webhook", "server", "url", "endpoint"
- **Check**: If there's a "Settings" or "Configuration" section

### **Webhook Not Working?**
- **Check**: The URL is exactly `https://www.reevacar.com/api/vapi/webhook`
- **Verify**: Your app is deployed and accessible
- **Test**: The webhook endpoint manually

### **Functions Not Working?**
- **Check**: The function names are exactly `check_availability` and `create_booking`
- **Verify**: The parameters match the JSON above
- **Test**: The functions individually

## 🎯 **What This Achieves**

**Before**: `Twilio → Vapi → ChatGPT → ElevenLabs → n8n ❌ (double-booking)`

**After**: `Twilio → Vapi → ChatGPT → ElevenLabs → Your App ✅ (reliable)`

## 📞 **Next Steps**

1. **Make the changes** in Vapi
2. **Test the integration** by calling the number
3. **Monitor** for any issues
4. **Remove n8n** once everything is working

---

**This will fix the double-booking issues by using your existing, proven Google Calendar integration!**
