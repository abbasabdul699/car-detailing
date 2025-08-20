# 🚀 Quick Start - AI Car Detailing Assistant

Get your AI car detailing assistant deployed in 10 minutes!

## ⚡ Super Quick Deployment

### 1. Prepare Your Repository

```bash
# Create a new GitHub repository for the AI project
# Clone it locally
git clone https://github.com/your-username/reeva-ai.git
cd reeva-ai

# Copy only the AI components from your current project
cp -r /path/to/car-detailing/apps ./
cp -r /path/to/car-detailing/packages ./
cp /path/to/car-detailing/package.json ./
cp /path/to/car-detailing/pnpm-workspace.yaml ./
cp /path/to/car-detailing/turbo.json ./
cp /path/to/car-detailing/vercel.json ./
cp /path/to/car-detailing/README.md ./
cp /path/to/car-detailing/DEPLOYMENT.md ./
cp /path/to/car-detailing/env.example ./
cp /path/to/car-detailing/deploy.sh ./
```

### 2. Set Up Environment Variables

```bash
# Copy environment template
cp env.example .env

# Edit .env with your API keys
nano .env
```

**Required API Keys:**
- `OPENAI_API_KEY` - Get from [OpenAI Platform](https://platform.openai.com)
- `GOOGLE_API_KEY` - Get from [Google Cloud Console](https://console.cloud.google.com)
- `DATABASE_URL` - Use [Supabase](https://supabase.com) (free tier)
- `REDIS_URL` - Use [Upstash](https://upstash.com) (free tier)

### 3. Deploy with One Command

```bash
# Run the deployment script
./deploy.sh
```

Choose option 3 to deploy both web app and worker.

## 🎯 What You Get

After deployment, you'll have:

- **Web App**: `https://your-app.vercel.app`
- **AI Test Interface**: `https://your-app.vercel.app/test-ai`
- **API Endpoints**: 
  - `POST /api/ai/conversation` - Chat with AI
  - `POST /api/ai/vehicle-detect` - Detect vehicle from photo
  - `POST /api/ai/area-detect` - Analyze car areas

## 🧪 Test Your AI

### 1. Test the Conversation Interface

Visit: `https://your-app.vercel.app/test-ai`

Try these phrases:
- "I need a car wash"
- "Can I book for Monday?"
- "What services do you offer?"

### 2. Test the API

```bash
# Test conversation
curl -X POST https://your-app.vercel.app/api/ai/conversation \
  -H "Content-Type: application/json" \
  -d '{"message": "I need a car wash", "stage": "greeting"}'
```

### 3. Test Vehicle Detection

```bash
# Test with a car photo
curl -X POST https://your-app.vercel.app/api/ai/vehicle-detect \
  -F "photo=@your-car-photo.jpg"
```

## 📊 Monitor Performance

- **Vercel Dashboard**: Monitor web app performance
- **Railway Dashboard**: Monitor worker processing
- **Database**: Use Prisma Studio (`npx prisma studio`)

## 🔧 Troubleshooting

### Common Issues

1. **Build Fails**
   ```bash
   # Clear cache and retry
   rm -rf .next node_modules
   npm install
   npm run build
   ```

2. **API Keys Not Working**
   - Check billing status
   - Verify API key format
   - Ensure proper permissions

3. **Database Connection Issues**
   ```bash
   # Test connection
   npx prisma db push
   ```

## 🎯 Next Steps

1. **Stress Test**: Use the test interfaces to validate functionality
2. **Monitor**: Watch performance metrics during testing
3. **Optimize**: Adjust based on performance results
4. **Scale**: Add more features as needed

## 📞 Support

If you encounter issues:
1. Check the logs in Vercel/Railway dashboards
2. Verify all environment variables are set
3. Test locally first with `npm run dev`

---

**Your AI assistant is ready for stress testing! 🚀** 