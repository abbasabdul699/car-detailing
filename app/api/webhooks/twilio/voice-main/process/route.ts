import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';

const VoiceResponse = twilio.twiml.VoiceResponse;

// Process voice input from the main webhook
export async function POST(request: NextRequest) {
  try {
    console.log('=== VOICE PROCESS WEBHOOK START ===');
    
    const formData = await request.formData();
    const from = formData.get('From') as string;
    const to = formData.get('To') as string;
    const callSid = formData.get('CallSid') as string;
    const transcription = formData.get('SpeechResult') as string;
    const confidence = parseFloat(formData.get('Confidence') as string || '0');
    
    console.log('Voice Process - Input received:', {
      from,
      to,
      callSid,
      transcription,
      confidence,
    });

    const twiml = new VoiceResponse();

    // Check transcription confidence
    if (confidence < 0.5) {
      console.log('Voice Process - Low confidence, asking for repeat');
      
      twiml.say({
        voice: 'Polly.Matthew',
        language: 'en-US'
      }, 'I\'m sorry, I didn\'t quite catch that. Could you please repeat what you said?');
      
      const gather = twiml.gather({
        input: ['speech'],
        action: `/api/webhooks/twilio/voice-main/process`,
        method: 'POST',
        speechTimeout: 'auto',
        timeout: 10,
        language: 'en-US',
        enhanced: true,
        speechModel: 'phone_call'
      });

      return new NextResponse(twiml.toString(), {
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    // Process the transcription and generate a response
    let response = '';
    const lowerText = transcription.toLowerCase();
    
    if (lowerText.includes('book') || lowerText.includes('appointment') || lowerText.includes('schedule')) {
      response = 'I can help you book an appointment! What type of car detailing service are you looking for?';
    } else if (lowerText.includes('price') || lowerText.includes('cost') || lowerText.includes('how much')) {
      response = 'Our pricing depends on the type of service you need. We offer interior cleaning, exterior detailing, and full service packages.';
    } else if (lowerText.includes('location') || lowerText.includes('where') || lowerText.includes('address')) {
      response = 'We provide mobile car detailing services and can come to your location. What\'s your address or general area?';
    } else if (lowerText.includes('time') || lowerText.includes('when') || lowerText.includes('available')) {
      response = 'We have flexible scheduling available. What day and time works best for you?';
    } else if (lowerText.includes('thank') || lowerText.includes('bye') || lowerText.includes('goodbye')) {
      response = 'Thank you for calling Reeva Car! Have a great day and we look forward to serving you.';
    } else {
      response = 'I understand you said: ' + transcription + '. How else can I help you with your car detailing needs today?';
    }

    console.log('Voice Process - Generated response:', response);
    
    // Use Twilio's built-in voice for the response
    twiml.say({
      voice: 'Polly.Matthew',
      language: 'en-US'
    }, response);
    
    // Ask if they need anything else
    twiml.pause({ length: 1 });
    
    const gather = twiml.gather({
      input: ['speech'],
      action: `/api/webhooks/twilio/voice-main/process`,
      method: 'POST',
      speechTimeout: 'auto',
      timeout: 10,
      language: 'en-US',
      enhanced: true,
      speechModel: 'phone_call'
    });
    
    gather.say({
      voice: 'Polly.Matthew',
      language: 'en-US'
    }, 'Is there anything else I can help you with?');
    
    // Fallback
    twiml.say({
      voice: 'Polly.Matthew',
      language: 'en-US'
    }, 'Thank you for calling Reeva Car. Have a great day!');
    
    twiml.hangup();
    
    console.log('Voice Process - TwiML generated:', twiml.toString());
    
    return new NextResponse(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' },
    });
    
  } catch (error) {
    console.error('=== VOICE PROCESS WEBHOOK ERROR ===');
    console.error('Error details:', error);
    
    // Return simple error response
    const twiml = new VoiceResponse();
    twiml.say({
      voice: 'Polly.Matthew',
      language: 'en-US'
    }, 'I\'m sorry, I\'m having trouble processing your request right now. Please try calling back later.');
    twiml.hangup();
    
    return new NextResponse(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' },
    });
  }
}