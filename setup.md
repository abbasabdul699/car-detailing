# Reeva 3.0 Setup Guide

## Prerequisites

1. **Node.js** (v18 or higher)
2. **pnpm** (recommended) or npm
3. **Docker** (for local development)
4. **PostgreSQL** database
5. **Redis** instance

## Step 1: Environment Setup

1. Copy the environment template:
   ```bash
   cp env.example .env
   ```

2. Fill in your environment variables in `.env`:
   - **Database**: PostgreSQL connection string
   - **Redis**: Redis connection URL
   - **Twilio**: Account SID, Auth Token, and phone number
   - **OpenAI**: API key for AI features
   - **Google**: OAuth credentials for Calendar integration

## Step 2: Database Setup

1. Start PostgreSQL and Redis (using Docker):
   ```bash
   docker run --name pg -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:15
   docker run --name redis -p 6379:6379 -d redis:7
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Push the database schema:
   ```bash
   pnpm db:push
   ```

4. (Optional) Open Prisma Studio to view/edit data:
   ```bash
   pnpm db:studio
   ```

## Step 3: Create Test Business

You'll need to create a business record in the database. You can do this via Prisma Studio or by running a seed script.

Example business data:
```json
{
  "id": "test-business-id",
  "name": "Test Car Detailing",
  "phone": "+1234567890",
  "timezone": "America/New_York",
  "pricingRules": {
    "base": { "S": 100, "M": 140, "L": 180, "XL": 220 },
    "addOns": { "petHair": 40, "heavySoil": 50, "engineBay": 30 },
    "packages": { "exteriorOnly": -30, "fullDetail": 0, "ceramicLite": 120 }
  },
  "availability": {
    "workingHours": {
      "monday": { "start": "09:00", "end": "17:00" },
      "tuesday": { "start": "09:00", "end": "17:00" },
      "wednesday": { "start": "09:00", "end": "17:00" },
      "thursday": { "start": "09:00", "end": "17:00" },
      "friday": { "start": "09:00", "end": "17:00" }
    },
    "bufferMinutes": 30
  },
  "playbook": {
    "tone": "professional",
    "guardrails": ["never invent prices", "be concise", "offer max 3 time slots"]
  }
}
```

## Step 4: Start Development

1. Start the web application:
   ```bash
   pnpm --filter @reeva/web dev
   ```

2. In another terminal, start the worker:
   ```bash
   pnpm worker
   ```

3. Visit `http://localhost:3000` to see the application

## Step 5: Test the Flow

1. Go to `http://localhost:3000/lead`
2. Fill out the lead form
3. Submit the form
4. Check your phone for the SMS (if Twilio is configured)
5. The worker should process the lead and send the initial message

## Step 6: Twilio Webhook Setup (Optional)

For testing inbound SMS:

1. Install ngrok:
   ```bash
   npm install -g ngrok
   ```

2. Expose your local server:
   ```bash
   ngrok http 3000
   ```

3. Set the Twilio webhook URL to: `https://your-ngrok-url.ngrok.io/api/webhooks/twilio`

## Troubleshooting

### Common Issues

1. **Database connection errors**: Make sure PostgreSQL is running and the connection string is correct
2. **Redis connection errors**: Ensure Redis is running on the correct port
3. **Twilio errors**: Verify your Twilio credentials and phone number
4. **Worker not processing jobs**: Check that Redis is accessible and the worker is running

### Development Tips

- Use Prisma Studio (`pnpm db:studio`) to inspect and edit database data
- Check the worker logs for job processing information
- Monitor the Redis queue status for pending jobs
- Use the browser's network tab to debug API calls

## Next Steps

Once the basic setup is working, you can:

1. **Implement Google Calendar integration** for real availability checking
2. **Enhance the AI conversation engine** with more sophisticated prompts
3. **Add admin dashboard** for business management
4. **Implement payment processing** with Stripe
5. **Add analytics and reporting** features
6. **Set up production deployment** on Vercel or similar platform
