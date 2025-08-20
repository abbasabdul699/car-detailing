# Reeva AI Car Detailing Assistant

An intelligent AI-powered car detailing assistant that helps customers book appointments, check availability, and get service recommendations through natural conversation.

## 🚀 Features

- **AI Conversation Interface** - Natural language booking and inquiry system
- **Vehicle Detection** - AI-powered vehicle identification from photos
- **Area Analysis** - Smart service recommendations based on car photos
- **Calendar Integration** - Real-time availability checking and booking
- **SMS Integration** - Automated outreach and communication
- **Background Processing** - Queue-based job processing for scalability

## 🏗️ Architecture

This is a monorepo containing:

- **`apps/web`** - Next.js web application with AI conversation interface
- **`apps/worker`** - Background job processor for AI outreach
- **`packages/ai`** - Core AI functionality and conversation engine
- **`packages/core`** - Shared utilities and worker infrastructure
- **`packages/db`** - Database layer with Prisma ORM

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **AI**: OpenAI GPT-3.5/4, Google Gemini for image analysis
- **Backend**: Node.js, Prisma ORM
- **Database**: PostgreSQL, Redis (for job queues)
- **Communication**: Twilio SMS
- **Calendar**: Google Calendar API
- **Deployment**: Vercel (web), Railway/Upstash (worker)

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- pnpm (recommended) or npm
- PostgreSQL database
- Redis instance
- OpenAI API key
- Google API key (for Gemini)
- Twilio account (for SMS)

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd car-detailing
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   ```
   
   Fill in your environment variables (see Environment Variables section below)

4. **Set up the database**
   ```bash
   pnpm db:push
   ```

5. **Build the packages**
   ```bash
   pnpm build
   ```

6. **Start development servers**
   ```bash
   # Start web app
   pnpm dev
   
   # Start worker (in another terminal)
   pnpm worker
   ```

7. **Test the AI**
   - Visit `http://localhost:3001/test-ai` to test the conversation interface
   - Visit `http://localhost:3001/test-booking` to test booking flow

## 🔧 Environment Variables

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/reeva_ai"

# Redis (for job queues)
REDIS_URL="redis://localhost:6379"

# OpenAI
OPENAI_API_KEY="your-openai-api-key"

# Google (for Gemini image analysis)
GOOGLE_API_KEY="your-google-api-key"

# Twilio (for SMS)
TWILIO_ACCOUNT_SID="your-twilio-account-sid"
TWILIO_AUTH_TOKEN="your-twilio-auth-token"
TWILIO_MESSAGING_SERVICE_SID="your-messaging-service-sid"

# Google Calendar (for availability)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_REDIRECT_URI="http://localhost:3001/api/auth/callback/google"

# App Configuration
APP_URL="http://localhost:3001"
SESSION_SECRET="your-session-secret"
TZ="America/New_York"
```

## 🚀 Deployment

### Vercel Deployment (Web App)

1. **Connect to Vercel**
   ```bash
   npx vercel
   ```

2. **Set environment variables in Vercel dashboard**

3. **Deploy**
   ```bash
   npx vercel --prod
   ```

### Worker Deployment (Railway/Upstash)

1. **Deploy to Railway**
   ```bash
   # Install Railway CLI
   npm i -g @railway/cli
   
   # Login and deploy
   railway login
   railway init
   railway up
   ```

2. **Set environment variables in Railway dashboard**

## 📱 API Endpoints

### AI Conversation
- `POST /api/ai/conversation` - Main conversation endpoint
- `POST /api/ai/vehicle-detect` - Vehicle detection from images
- `POST /api/ai/area-detect` - Service recommendations from area photos

### Booking & Availability
- `GET /api/availability` - Check calendar availability
- `POST /api/book` - Create new booking
- `POST /api/quote` - Generate service quotes

### Testing
- `/test-ai` - AI conversation test interface
- `/test-booking` - Booking flow test interface
- `/test-calendar` - Calendar integration test

## 🧪 Testing

### Manual Testing
1. Visit `/test-ai` to test the conversation interface
2. Try booking phrases like:
   - "I need a car wash"
   - "Can I book for Monday?"
   - "What services do you offer?"

### API Testing
```bash
# Test conversation
curl -X POST http://localhost:3001/api/ai/conversation \
  -H "Content-Type: application/json" \
  -d '{"message": "I need a car wash", "stage": "greeting"}'

# Test vehicle detection
curl -X POST http://localhost:3001/api/ai/vehicle-detect \
  -F "photo=@car-image.jpg"
```

## 📊 Monitoring

- **Vercel Analytics** - Web app performance
- **Railway Logs** - Worker job processing
- **Database Monitoring** - Prisma Studio (`pnpm db:studio`)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is proprietary software. All rights reserved.

## 🆘 Support

For issues and questions:
1. Check the documentation
2. Review error logs
3. Contact the development team

---

**Built with ❤️ by the Reeva Team**
