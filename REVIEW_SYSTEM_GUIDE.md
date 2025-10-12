# Google Review System Guide

## 🎯 Overview

The **Google Review System** automatically sends review links to customers after their car detailing appointments are completed. This helps detailers gather valuable feedback and improve their online reputation.

## 🔄 How It Works

### **Automatic Review Link Sending:**
1. **Appointment completed** → System marks booking as `completed`
2. **Review link scheduled** → 2-hour delay to let customers experience service
3. **SMS sent** → Customer receives personalized review message with Google link
4. **Follow-up** → Customer can easily leave a review on Google

### **Two Ways to Trigger Reviews:**

#### **1. Automatic (Cron Job)**
- Appointments are automatically marked as completed when their time passes
- Review links are scheduled and sent via cron job
- Runs every hour to process completed appointments

#### **2. Manual (Admin Interface)**
- Admins can manually mark bookings as "completed" 
- Review links are sent immediately when manually completed
- Useful for confirming completed services

## 🛠️ System Components

### **1. Database Models:**
- **`ScheduledReview`** - Stores scheduled review links with timing
- **`Booking`** - Tracks appointment completion status

### **2. API Endpoints:**
- **`/api/cron/process-reviews`** - Processes scheduled review links (runs hourly)
- **`/api/bookings`** - Updates booking status and triggers reviews

### **3. Core Services:**
- **`reviewLinks.ts`** - Generates Google Review links and messages
- **`scheduledReviews.ts`** - Manages delayed review sending
- **`booking-completion.ts`** - Handles booking completion logic

## 📱 Review Message Format

### **Short SMS Message:**
```
Hi John! Hope you enjoyed your Full Detail! 🚗✨

We'd love a quick review if you have a moment:
https://maps.google.com/search/Test%20Car%20Detailing%20car%20detailing?hl=en&gl=US

Thanks! - Test Car Detailing
```

### **Features:**
- ✅ Personalized with customer name
- ✅ Includes service type
- ✅ Direct Google Maps search link
- ✅ Mobile-friendly format
- ✅ Emojis for engagement

## 🚀 Setup Instructions

### **1. Environment Variables:**
```bash
# Required for SMS sending
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token

# Required for cron job security
CRON_SECRET=your_secure_cron_secret_here
```

### **2. Set Up Cron Jobs:**
```bash
# Add to your Vercel cron jobs or external service
# Runs every hour to process scheduled review links
POST https://reevacar.com/api/cron/process-reviews
Authorization: Bearer YOUR_CRON_SECRET
```

### **3. Database Migration:**
```bash
# Apply the new ScheduledReview model
npx prisma db push
npx prisma generate
```

## 📊 Current Status

### **Features Implemented:**
- ✅ Google Review link generation
- ✅ Personalized SMS messages
- ✅ Scheduled review sending (2-hour delay)
- ✅ Database-based scheduling system
- ✅ Admin interface integration
- ✅ Automatic booking completion detection
- ✅ Manual booking completion support

### **Database Schema:**
```sql
-- New ScheduledReview table added
CREATE TABLE scheduledReviews (
  id            ObjectId PRIMARY KEY,
  bookingId     ObjectId REFERENCES bookings(id),
  customerPhone String,
  detailerId    ObjectId REFERENCES detailers(id),
  businessName  String,
  customerName  String?,
  serviceType   String?,
  scheduledFor  DateTime,
  sent          Boolean DEFAULT false,
  createdAt     DateTime DEFAULT now(),
  updatedAt     DateTime
);
```

## 🧪 Testing

### **Test the System:**
```bash
# Run the comprehensive test
node scripts/test-review-system.js
```

### **Manual Testing:**
1. Create a test booking
2. Mark it as completed via admin interface
3. Check for scheduled review in database
4. Wait 2 hours or run cron job manually
5. Verify SMS was sent

## 🔧 Configuration Options

### **Review Timing:**
- **Default delay:** 2 hours after completion
- **Configurable:** Can be adjusted in `scheduleReviewLink()` function
- **Immediate sending:** Available for testing via `sendReviewLinkImmediately()`

### **Message Customization:**
- **Short format:** Default for SMS
- **Long format:** Available for email (future feature)
- **Business-specific:** Uses actual business name from database

### **SMS Settings:**
- **Respects detailer settings:** Only sends if SMS enabled
- **Uses detailer's Twilio number:** Sends from business number
- **Error handling:** Graceful failure if SMS disabled

## 📈 Benefits

### **For Detailers:**
- 🎯 **Increased Reviews:** Automated follow-up increases review rates
- 📈 **Better Reputation:** More Google reviews = better search ranking
- ⏰ **Time Saving:** No manual follow-up needed
- 📱 **Professional:** Automated but personalized messages

### **For Customers:**
- 🔗 **Easy Access:** Direct link to Google Reviews
- 💬 **Personalized:** Uses their name and service details
- 📱 **Mobile Friendly:** SMS format works on any phone
- ⏰ **Perfect Timing:** Sent after they've experienced the service

## 🚨 Troubleshooting

### **Common Issues:**

#### **Reviews Not Being Sent:**
1. Check if detailer has SMS enabled
2. Verify Twilio credentials are correct
3. Ensure cron job is running
4. Check database for scheduled reviews

#### **TypeScript Errors:**
1. Run `npx prisma generate` after schema changes
2. Restart TypeScript language server
3. Check model names match schema

#### **Database Issues:**
1. Run `npx prisma db push` to apply schema changes
2. Check MongoDB connection
3. Verify indexes are created

## 🔮 Future Enhancements

### **Planned Features:**
- 📧 **Email Reviews:** Send via email for customers who prefer it
- 📊 **Review Analytics:** Track review response rates
- 🎨 **Custom Messages:** Let detailers customize review messages
- 📅 **Multiple Follow-ups:** Send reminders if no review left
- 🌟 **Review Templates:** Different messages for different service types

### **Integration Opportunities:**
- 🔗 **Google My Business API:** Direct integration with Google
- 📱 **WhatsApp:** Send reviews via WhatsApp
- 📧 **Email Marketing:** Integrate with email campaigns
- 📊 **Analytics:** Connect with business intelligence tools

---

## 🎉 Success Metrics

Track these metrics to measure the system's success:
- **Review Send Rate:** % of completed bookings that get review links
- **Review Response Rate:** % of sent links that result in reviews
- **Customer Satisfaction:** Average rating of received reviews
- **Business Growth:** Increase in new customers from improved reviews

The Google Review System is now fully implemented and ready to help detailers build their online reputation! 🚗✨
