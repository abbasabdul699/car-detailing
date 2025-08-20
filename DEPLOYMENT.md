# AI Car Detailing Assistant - Deployment Guide

This guide covers deploying the AI car detailing assistant to production for stress testing.

## 🎯 What We're Deploying

We're deploying the AI-specific components from the `/apps` folder:

- **Web App** (`apps/web`) - AI conversation interface and APIs
- **Worker** (`apps/worker`) - Background job processing
- **AI Package** (`packages/ai`) - Core AI functionality
- **Core Package** (`packages/core`) - Shared utilities
- **DB Package** (`packages/db`) - Database layer

## 🚀 Step 1: Prepare for Git

### 1.1 Create a new Git repository

```bash
# Create a new repository on GitHub for the AI project
# Then initialize locally
git init
git remote add origin https://github.com/your-username/reeva-ai.git
```

### 1.2 Update .gitignore for AI focus

```bash
# Ensure .gitignore excludes marketplace-specific files
# but includes AI components
```

### 1.3 Commit AI-specific code

```bash
# Add only the AI-related files
git add apps/
git add packages/
git add package.json
git add pnpm-workspace.yaml
git add turbo.json
git add vercel.json
git add README.md
git add DEPLOYMENT.md
git add env.example

# Commit
git commit -m "Initial AI car detailing assistant"

# Push to GitHub
git push -u origin main
```

## 🚀 Step 2: Set Up Production Environment

### 2.1 Database Setup

**Option A: Supabase (Recommended)**
```bash
# 1. Create account at supabase.com
# 2. Create new project
# 3. Get connection string from Settings > Database
# 4. Add to environment variables
```

**Option B: Railway PostgreSQL**
```bash
# 1. Create account at railway.app
# 2. Create PostgreSQL service
# 3. Get connection string
# 4. Add to environment variables
```

### 2.2 Redis Setup (for job queues)

**Option A: Upstash Redis**
```bash
# 1. Create account at upstash.com
# 2. Create Redis database
# 3. Get connection string
# 4. Add to environment variables
```

**Option B: Railway Redis**
```bash
# 1. Add Redis service to Railway project
# 2. Get connection string
# 3. Add to environment variables
```

### 2.3 API Keys Setup

**OpenAI API Key**
```bash
# 1. Go to platform.openai.com
# 2. Create account and add billing
# 3. Generate API key
# 4. Add to environment variables
```

**Google API Key (for Gemini)**
```bash
# 1. Go to console.cloud.google.com
# 2. Create project
# 3. Enable Gemini API
# 4. Create API key
# 5. Add to environment variables
```

**Twilio Setup (for SMS)**
```bash
# 1. Create account at twilio.com
# 2. Get Account SID and Auth Token
# 3. Create Messaging Service
# 4. Add to environment variables
```

## 🚀 Step 3: Deploy to Vercel

### 3.1 Connect to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Link to your project
vercel link
```

### 3.2 Configure Environment Variables

In Vercel dashboard, add these environment variables:

```env
# Database
DATABASE_URL="your-production-database-url"

# Redis
REDIS_URL="your-redis-url"

# OpenAI
OPENAI_API_KEY="your-openai-api-key"

# Google
GOOGLE_API_KEY="your-google-api-key"

# Twilio
TWILIO_ACCOUNT_SID="your-twilio-account-sid"
TWILIO_AUTH_TOKEN="your-twilio-auth-token"
TWILIO_MESSAGING_SERVICE_SID="your-messaging-service-sid"

# App Configuration
APP_URL="https://your-vercel-app.vercel.app"
SESSION_SECRET="your-session-secret"
TZ="America/New_York"
```

### 3.3 Deploy

```bash
# Deploy to production
vercel --prod
```

## 🚀 Step 4: Deploy Worker

### 4.1 Deploy to Railway

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login to Railway
railway login

# Initialize project
railway init

# Add environment variables
railway variables set DATABASE_URL="your-database-url"
railway variables set REDIS_URL="your-redis-url"
railway variables set TWILIO_ACCOUNT_SID="your-twilio-sid"
railway variables set TWILIO_AUTH_TOKEN="your-twilio-token"
railway variables set TWILIO_MESSAGING_SERVICE_SID="your-messaging-service"

# Deploy
railway up
```

### 4.2 Alternative: Deploy to Upstash QStash

If you prefer a serverless approach:

```bash
# 1. Create account at upstash.com
# 2. Create QStash service
# 3. Configure webhook endpoints
# 4. Update worker code to use QStash
```

## 🧪 Step 5: Testing & Validation

### 5.1 Test AI Conversation

```bash
# Test the conversation endpoint
curl -X POST https://your-app.vercel.app/api/ai/conversation \
  -H "Content-Type: application/json" \
  -d '{
    "message": "I need a car wash",
    "stage": "greeting",
    "context": {}
  }'
```

### 5.2 Test Vehicle Detection

```bash
# Test vehicle detection
curl -X POST https://your-app.vercel.app/api/ai/vehicle-detect \
  -F "photo=@test-car.jpg"
```

### 5.3 Test Area Analysis

```bash
# Test area analysis
curl -X POST https://your-app.vercel.app/api/ai/area-detect \
  -F "photos=@car-interior.jpg"
```

### 5.4 Manual Testing

1. **Visit the test interface**: `https://your-app.vercel.app/test-ai`
2. **Test booking flow**: `https://your-app.vercel.app/test-booking`
3. **Test calendar integration**: `https://your-app.vercel.app/test-calendar`

## 📊 Step 6: Monitoring Setup

### 6.1 Vercel Analytics

- Enable Vercel Analytics in dashboard
- Monitor API performance
- Track error rates

### 6.2 Database Monitoring

```bash
# Access Prisma Studio
npx prisma studio
```

### 6.3 Worker Monitoring

- Check Railway logs for worker jobs
- Monitor queue processing
- Track SMS delivery rates

## 🔧 Step 7: Environment Variables Reference

### Required Variables

```env
# Database
DATABASE_URL="postgresql://..."

# Redis
REDIS_URL="redis://..."

# AI Services
OPENAI_API_KEY="sk-..."
GOOGLE_API_KEY="AIza..."

# Communication
TWILIO_ACCOUNT_SID="AC..."
TWILIO_AUTH_TOKEN="..."
TWILIO_MESSAGING_SERVICE_SID="MG..."

# App Configuration
APP_URL="https://your-app.vercel.app"
SESSION_SECRET="your-secret"
TZ="America/New_York"
```

### Optional Variables

```env
# Google Calendar (if using calendar integration)
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
GOOGLE_REDIRECT_URI="https://your-app.vercel.app/api/auth/callback/google"

# Additional AI Models
ANTHROPIC_API_KEY="sk-ant-..."  # If using Claude
```

## 🚨 Troubleshooting

### Common Issues

1. **Build Failures**
   ```bash
   # Clear cache and rebuild
   rm -rf .next
   rm -rf node_modules
   npm install
   npm run build
   ```

2. **Database Connection Issues**
   ```bash
   # Test database connection
   npx prisma db push
   npx prisma studio
   ```

3. **API Key Issues**
   - Verify API keys are correct
   - Check billing status
   - Ensure proper permissions

4. **Worker Not Processing**
   - Check Railway logs
   - Verify Redis connection
   - Ensure environment variables are set

### Performance Optimization

1. **Enable Edge Functions** for AI APIs
2. **Use Connection Pooling** for database
3. **Implement Caching** for frequent requests
4. **Monitor Memory Usage** in worker

## 📈 Stress Testing Preparation

### Load Testing Setup

```bash
# Install artillery for load testing
npm install -g artillery

# Create load test configuration
cat > load-test.yml << EOF
config:
  target: 'https://your-app.vercel.app'
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - name: "AI Conversation"
    requests:
      - post:
          url: "/api/ai/conversation"
          headers:
            Content-Type: "application/json"
          json:
            message: "I need a car wash"
            stage: "greeting"
EOF

# Run load test
artillery run load-test.yml
```

### Monitoring During Stress Test

1. **Vercel Dashboard** - Monitor API performance
2. **Database Metrics** - Check connection pool usage
3. **Redis Metrics** - Monitor queue processing
4. **Worker Logs** - Track job processing

## 🎯 Next Steps

1. **Deploy to production** following this guide
2. **Run initial tests** to validate functionality
3. **Set up monitoring** for performance tracking
4. **Begin stress testing** with your team
5. **Iterate and optimize** based on results

---

**Ready for deployment! 🚀**
