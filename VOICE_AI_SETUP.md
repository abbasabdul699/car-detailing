# 🎤 Voice AI Setup Guide

## Overview
This guide will help you set up a custom voice AI system using ElevenLabs for realistic voice synthesis, integrated with your existing car detailing business.

## Features
- ✅ **Realistic Voice Synthesis** - Using ElevenLabs API for natural-sounding voices
- ✅ **Intelligent Conversation Flow** - Guided booking process via voice
- ✅ **Automatic Booking Creation** - Voice conversations create bookings instantly
- ✅ **Customer Record Management** - Automatic customer creation from voice calls
- ✅ **High-Priority Notifications** - Instant alerts for voice bookings
- ✅ **Voice Caching** - Performance optimization for repeated phrases

## Setup Instructions

### 1. ElevenLabs API Setup

1. **Create ElevenLabs Account**
   - Go to [ElevenLabs.io](https://elevenlabs.io)
   - Sign up for an account
   - Choose a plan (Starter plan is sufficient for testing)

2. **Get API Key**
   - Go to your profile settings
   - Copy your API key
   - Add to your environment variables

3. **Add to Environment Variables**
   ```bash
   ELEVENLABS_API_KEY=your_api_key_here
   ```

### 2. Twilio Voice Configuration

1. **Enable Voice on Twilio Number**
   - Go to your Twilio Console
   - Navigate to Phone Numbers > Manage > Active Numbers
   - Click on your phone number
   - Set Voice webhook to: `https://yourdomain.com/api/webhooks/voice`
   - Set HTTP method to POST

2. **Voice Webhook Settings**
   ```
   Webhook URL: https://yourdomain.com/api/webhooks/voice
   HTTP Method: POST
   Fallback URL: (optional)
   ```

### 3. Voice AI Configuration

The system comes with multiple voice options:

#### Professional Male Voices
- **Adam** (Default) - Professional, clear
- **Antoni** - Warm, friendly  
- **Arnold** - Deep, authoritative

#### Professional Female Voices
- **Bella** - Professional, clear
- **Ella** - Warm, friendly
- **Rachel** - Professional, articulate

#### Casual Voices
- **Josh** - Casual, friendly
- **Sam** - Casual, approachable

### 4. Voice Conversation Flow

The voice AI follows this conversation flow:

1. **Greeting** - Introduces business and asks for permission
2. **Name Collection** - Gets customer name
3. **Vehicle Information** - Year, make, model
4. **Service Selection** - Interior, exterior, ceramic, etc.
5. **Address Collection** - Complete service address
6. **Location Type** - Home, work, or other
7. **Date Selection** - Today, tomorrow, or specific date
8. **Time Selection** - Morning, afternoon, or specific time
9. **Email Collection** - Optional for confirmations
10. **Confirmation** - Reviews all details
11. **Completion** - Creates booking and sends confirmation

### 5. Voice AI Features

#### Automatic Booking Creation
- Creates customer records instantly
- Generates booking confirmations
- Sends SMS confirmations
- Creates high-priority notifications

#### Voice Synthesis Options
- Multiple voice personalities
- Voice caching for performance
- Customizable voice settings
- Professional and casual options

#### Conversation Management
- State-based conversation flow
- Error handling and retries
- Natural language processing
- Context-aware responses

## API Endpoints

### Voice Webhook
```
POST /api/webhooks/voice
```
- Handles incoming voice calls
- Initiates conversation flow
- Manages voice state

### Voice Processing
```
POST /api/webhooks/voice/process
```
- Processes voice input
- Generates responses
- Creates bookings

## Environment Variables

Add these to your `.env.local` file:

```bash
# ElevenLabs Configuration
ELEVENLABS_API_KEY=your_elevenlabs_api_key

# Twilio Configuration (already configured)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number

# Base URL for webhooks
NEXT_PUBLIC_BASE_URL=https://yourdomain.com
```

## Testing the Voice AI

### 1. Test Voice Call
1. Call your Twilio phone number
2. The system should answer with a greeting
3. Follow the conversation flow
4. Complete a test booking

### 2. Check Dashboard
1. Go to your detailer dashboard
2. Check for new notifications
3. Verify customer record creation
4. Check booking creation

### 3. Test Voice Quality
1. Try different voice options
2. Test conversation flow
3. Verify booking creation
4. Check SMS confirmations

## Troubleshooting

### Common Issues

1. **Voice Not Working**
   - Check ElevenLabs API key
   - Verify Twilio webhook configuration
   - Check environment variables

2. **Poor Voice Quality**
   - Try different voice options
   - Adjust voice settings
   - Check internet connection

3. **Booking Not Created**
   - Check database connection
   - Verify conversation flow
   - Check error logs

### Debug Mode

Enable debug logging by adding to your environment:
```bash
VOICE_DEBUG=true
```

## Voice AI Customization

### Custom Voice Responses
Edit the voice templates in `lib/voiceAI.ts`:

```typescript
export const VOICE_TEMPLATES = {
  GREETING: (businessName: string, isFirstTime: boolean, customerName?: string) => {
    // Customize your greeting
  },
  // ... other templates
};
```

### Custom Voice Settings
Adjust voice parameters in `lib/voiceAI.ts`:

```typescript
export const DEFAULT_VOICE_CONFIG: VoiceConfig = {
  voiceId: VOICE_OPTIONS.ADAM,
  modelId: 'eleven_monolingual_v1',
  stability: 0.5,        // 0.0 to 1.0
  similarityBoost: 0.5,  // 0.0 to 1.0
  useCache: true
};
```

## Performance Optimization

### Voice Caching
- Enabled by default
- Caches frequently used phrases
- Reduces API calls and latency

### Voice Selection
- Choose appropriate voice for your business
- Test different options
- Consider customer demographics

## Security Considerations

### API Key Protection
- Never expose ElevenLabs API key
- Use environment variables
- Rotate keys regularly

### Webhook Security
- Validate Twilio webhooks
- Use HTTPS endpoints
- Monitor for abuse

## Monitoring and Analytics

### Voice Call Metrics
- Track call volume
- Monitor conversion rates
- Analyze conversation flow

### Performance Monitoring
- Voice synthesis latency
- API usage and costs
- Error rates and debugging

## Support and Maintenance

### Regular Updates
- Monitor ElevenLabs API changes
- Update voice models
- Test conversation flows

### Cost Management
- Monitor API usage
- Optimize voice caching
- Review pricing plans

## Next Steps

1. **Test the system** with a few calls
2. **Customize voice responses** for your business
3. **Monitor performance** and adjust settings
4. **Train your team** on the new voice system
5. **Gather feedback** from customers

Your voice AI system is now ready to handle customer calls and create bookings automatically! 🎤✨
