# Vapi Voice AI - Simple Setup (No n8n Required)

This is a **much simpler approach** that uses your existing Google Calendar integration instead of n8n workflows.

## 🎯 **What This Does:**

- **Voice AI Booking**: Customers call and book appointments through natural conversation
- **Uses Your Existing Google Calendar Integration**: No need for n8n workflows
- **Real-time Availability**: Checks both database and Google Calendar
- **Automatic Calendar Sync**: Creates events in Google Calendar automatically

## 📋 **Setup Steps:**

### **Step 1: Add Environment Variable**

Add this to your `.env` file:

```bash
# Vapi phone number (the number customers will call)
VAPI_PHONE_NUMBER=+1234567890
```

**Important**: This should match the phone number you configure in Vapi.

### **Step 2: Configure Vapi Assistant**

1. **Go to your Vapi Dashboard**: `https://dashboard.vapi.ai/assistants`
2. **Select your "Reeva" assistant**
3. **Set Webhook URL**:
   ```
   https://www.reevacar.com/api/vapi/webhook
   ```

4. **Add Functions**:

   **Function 1: Check Availability**
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

   **Function 2: Create Booking**
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

### **Step 3: Update System Prompt**

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

### **Step 4: Test the Integration**

1. **Call your Vapi number**
2. **Try booking**: "Hi, I'd like to book a car wash for tomorrow at 2pm"
3. **Check your Google Calendar** for the new event
4. **Check your detailer dashboard** for the new booking

## 🎙️ **Example Call Flow:**

```
Customer: *calls Vapi number*
AI: "Hi! Thanks for calling Brooks Car Care. How can I help you today?"

Customer: "I need a car wash for tomorrow at 2pm"
AI: "Great! Let me check if that time is available... *checks calendar* Yes, 2pm tomorrow is available! What's your name?"

Customer: "John Smith"
AI: "Perfect! What's your phone number?"

Customer: "555-123-4567"
AI: "Great! What kind of car do you have?"

Customer: "2020 Toyota Camry"
AI: "Excellent! What services do you need?"

Customer: "Just a basic wash"
AI: "Perfect! Let me book that for you... *creates booking* Done! I've booked your basic wash for your 2020 Toyota Camry tomorrow at 2pm. You'll get a confirmation text shortly. Anything else I can help with?"
```

## 🔧 **Troubleshooting:**

### **Issue: "Detailer not found"**
- **Solution**: Make sure `VAPI_PHONE_NUMBER` in your `.env` matches the phone number in your detailer record

### **Issue: Availability check fails**
- **Solution**: Check that your detailer has Google Calendar connected in the detailer dashboard

### **Issue: Booking creation fails**
- **Solution**: Check that your detailer has `googleCalendarConnected: true` in the database

## 📊 **What Happens Behind the Scenes:**

1. **Customer calls** Vapi number
2. **Vapi processes** speech and calls your webhook
3. **Your webhook** calls your existing availability API
4. **Availability API** checks both database and Google Calendar
5. **If available**, Vapi asks for booking details
6. **Your webhook** calls your existing booking API
7. **Booking API** creates booking and syncs to Google Calendar
8. **Customer gets** confirmation

## 🚀 **Benefits of This Approach:**

- ✅ **No n8n complexity** - uses your existing, proven Google Calendar integration
- ✅ **Reliable** - leverages your working booking system
- ✅ **Simple** - just webhook calls to your existing APIs
- ✅ **Easy to debug** - standard API calls with logs
- ✅ **Fast** - no external workflow dependencies

## 📞 **Testing:**

1. **Test availability check**: Call and ask "Is tomorrow at 2pm available?"
2. **Test booking creation**: Call and try to book an appointment
3. **Check Google Calendar**: Verify the event appears
4. **Check your dashboard**: Verify the booking appears in your system

---

**This approach is much simpler and more reliable than n8n workflows!** 🎉

Your existing Google Calendar integration is already working, so we're just connecting Vapi to it directly.
