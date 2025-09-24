# Vapi + n8n + Google Calendar Integration Setup

This guide shows how to connect your Vapi voice AI to your existing n8n workflows for Google Calendar integration.

## 🎯 **Your Current Architecture:**

```
Vapi Voice AI → Your App → n8n Workflows → Google Calendar
```

## 📋 **Prerequisites (Already Set Up):**

✅ **Vapi Assistant "Reeva"** with GPT-5  
✅ **n8n Workflows** for Google Calendar  
✅ **Google Calendar Integration** in n8n  
✅ **Webhook triggers** in n8n  

## 🔧 **Setup Steps:**

### **Step 1: Get Your n8n Webhook URLs**

From your n8n dashboard, get the webhook URLs for:

1. **Availability Check**: `calendar_availability` workflow
2. **Booking Creation**: `calendar_set_appointment` workflow

These should look like:
```
https://azheng39.app.n8n.cloud/webhook/calendar_availability
https://azheng39.app.n8n.cloud/webhook/calendar_set_appointment
```

### **Step 2: Add Environment Variables**

Add these to your `.env` file:

```bash
# n8n Webhook URLs
N8N_WEBHOOK_URL=https://azheng39.app.n8n.cloud/webhook
```

### **Step 3: Configure Vapi Assistant**

In your Vapi dashboard:

1. **Set Webhook URL**:
   ```
   https://www.reevacar.com/api/vapi/webhook
   ```

2. **Add Functions** (same as before):
   - `check_availability`
   - `create_booking`

3. **Update System Prompt**:
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

### **Step 4: Update n8n Workflows**

#### **For Availability Check (`calendar_availability`):**

Make sure your n8n workflow:
1. **Receives** the webhook with `date`, `time`, `action: 'check_availability'`
2. **Checks** Google Calendar availability
3. **Returns** JSON response:
   ```json
   {
     "available": true/false,
     "reason": "Time slot already booked" (if not available)
   }
   ```

#### **For Booking Creation (`calendar_set_appointment`):**

Make sure your n8n workflow:
1. **Receives** the webhook with booking details
2. **Creates** Google Calendar event
3. **Returns** JSON response:
   ```json
   {
     "success": true/false,
     "eventId": "google_calendar_event_id"
   }
   ```

### **Step 5: Test the Integration**

1. **Call your Vapi number**
2. **Try booking**: "Hi, I'd like to book a car wash for tomorrow at 2pm"
3. **Check n8n logs** to see webhook calls
4. **Check Google Calendar** for the new event

## 🎙️ **Example Call Flow:**

```
Customer: *calls Vapi number*
AI: "Hi! Thanks for calling Brooks Car Care. How can I help you today?"

Customer: "I need a car wash for tomorrow at 2pm"
AI: "Great! Let me check if that time is available... *calls n8n workflow* Yes, 2pm tomorrow is available! What's your name?"

Customer: "John Smith"
AI: "Perfect! What's your phone number?"

Customer: "555-123-4567"
AI: "Great! What kind of car do you have?"

Customer: "2020 Toyota Camry"
AI: "Excellent! What services do you need?"

Customer: "Just a basic wash"
AI: "Perfect! Let me book that for you... *calls n8n booking workflow* Done! I've booked your basic wash for your 2020 Toyota Camry tomorrow at 2pm. You'll get a confirmation text shortly. Anything else I can help with?"
```

## 🔧 **Troubleshooting:**

### **Issue: "n8n workflow failed"**
- **Check**: n8n webhook URLs are correct
- **Check**: n8n workflows are active
- **Check**: n8n logs for errors

### **Issue: Availability check not working**
- **Check**: `calendar_availability` workflow is active
- **Check**: Google Calendar API credentials in n8n
- **Check**: n8n workflow returns correct JSON format

### **Issue: Booking creation fails**
- **Check**: `calendar_set_appointment` workflow is active
- **Check**: Google Calendar permissions in n8n
- **Check**: n8n workflow handles all required fields

## 📊 **Monitoring:**

1. **Vapi Dashboard**: Check call logs and function calls
2. **n8n Dashboard**: Check workflow executions
3. **Google Calendar**: Verify events are created
4. **Your App Logs**: Check webhook processing

## 🚀 **Advanced Features:**

### **Multiple Detailers:**
- Use different n8n workflows for different detailers
- Pass `detailerId` in webhook calls
- Route to appropriate Google Calendar

### **Error Handling:**
- Add retry logic in n8n workflows
- Handle Google Calendar API rate limits
- Provide fallback responses

### **Notifications:**
- Add SMS confirmation in n8n workflows
- Send email confirmations
- Update your app's booking database

## 📞 **Support:**

If you need help:
1. **Check n8n execution logs** for workflow errors
2. **Check Vapi function call logs** for API errors
3. **Test n8n workflows manually** using the "Execute workflow" button
4. **Verify Google Calendar API** credentials in n8n

---

**Your Vapi + n8n + Google Calendar integration is now ready!** 🎉

The beauty of this setup is that you're leveraging your existing n8n workflows, which already handle the complex Google Calendar integration. Vapi just needs to call the right webhooks!
