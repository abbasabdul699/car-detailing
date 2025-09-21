# ElevenLabs Voice Integration Setup

## 🎤 **ElevenLabs TTS Integration**

ElevenLabs offers some of the best AI voices available, with incredibly natural and human-like speech synthesis.

## 🚀 **Setup Instructions**

### **1. Get ElevenLabs API Key**
1. Go to [ElevenLabs.io](https://elevenlabs.io)
2. Sign up for an account
3. Go to your profile and generate an API key
4. Copy the API key

### **2. Add to Environment Variables**
Add your ElevenLabs API key to your `.env.local` file:
```bash
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
```

### **3. Deploy and Test**
The endpoints are already created and ready to use!

## 🎯 **Available Endpoints**

### **Voice Demo (Recommended)**
```
https://www.reevacar.com/api/voice/elevenlabs-demo
```
- Interactive voice selection menu
- Press 1-8 to hear different voices
- Then have a conversation with your chosen voice

### **Direct Test**
```
https://www.reevacar.com/api/voice/elevenlabs-test
```
- Direct conversation with default voice
- Add `?voice=VOICE_ID` to specify a voice

## 🎙️ **Available Voices**

| Voice | Description | Best For |
|-------|-------------|----------|
| **Adam** | Deep, warm male voice | Professional, authoritative |
| **Bella** | Clear, professional female voice | Customer service, business |
| **Elli** | Young, energetic female voice | Friendly, casual conversations |
| **Josh** | Friendly, conversational male voice | Casual, approachable |
| **Arnold** | Confident, authoritative male voice | Professional, commanding |
| **Domi** | Professional, clear female voice | Business, formal |
| **Antoni** | Smooth, natural male voice | Natural conversations |
| **Thomas** | Friendly, approachable male voice | Warm, welcoming |

## 💰 **Pricing**

**ElevenLabs Pricing (2024):**
- **Free Tier**: 10,000 characters/month
- **Starter**: $5/month - 30,000 characters
- **Creator**: $22/month - 100,000 characters
- **Pro**: $99/month - 500,000 characters

**Cost per 5-minute call**: ~$0.02-0.05 (much cheaper than OpenAI Realtime API!)

## 🔧 **How to Test**

### **Option 1: Update Twilio Webhook**
1. Go to Twilio Console → Phone Numbers
2. Click your Twilio number
3. Update Voice webhook URL to:
   ```
   https://www.reevacar.com/api/voice/elevenlabs-demo
   ```
4. Save and call your number

### **Option 2: Test Specific Voice**
Update webhook to:
```
https://www.reevacar.com/api/voice/elevenlabs-test?voice=pNInz6obpgDQGcFmaJgB
```
(Replace with any voice ID from the table above)

## 🎨 **Voice Quality Comparison**

| Provider | Quality | Naturalness | Cost | Latency |
|----------|---------|-------------|------|---------|
| **Twilio (Polly)** | Good | 6/10 | Low | Fast |
| **OpenAI TTS** | Very Good | 8/10 | Medium | Medium |
| **ElevenLabs** | Excellent | 9/10 | Low | Fast |

## 🚀 **Advantages of ElevenLabs**

✅ **Superior voice quality** - Most natural AI voices available  
✅ **Reasonable pricing** - Much cheaper than OpenAI Realtime API  
✅ **Fast generation** - Quick response times  
✅ **Multiple voice options** - 8+ high-quality voices  
✅ **Easy integration** - Simple API  
✅ **Production ready** - Reliable and stable  

## 🎯 **Recommendation**

**ElevenLabs is the best choice for your car detailing business because:**
- **Excellent voice quality** that sounds truly human
- **Cost-effective** pricing for business use
- **Professional voices** perfect for customer service
- **Reliable performance** for production use

## 🧪 **Ready to Test?**

1. **Add your ElevenLabs API key** to environment variables
2. **Update Twilio webhook** to the demo endpoint
3. **Call your number** and experience the superior voice quality!

The difference in voice quality will be immediately noticeable - ElevenLabs voices sound incredibly natural and human-like! 🎉
