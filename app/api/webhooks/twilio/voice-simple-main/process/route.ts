import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';

const VoiceResponse = twilio.twiml.VoiceResponse;

// Simple process webhook without ElevenLabs
export async function POST(request: NextRequest) {
  try {
    console.log('=== SIMPLE VOICE PROCESS WEBHOOK START ===');
    
    const formData = await request.formData();
    const from = formData.get('From') as string;
    const to = formData.get('To') as string;
    const callSid = formData.get('CallSid') as string;
    const transcription = formData.get('SpeechResult') as string;
    const confidence = parseFloat(formData.get('Confidence') as string || '0');
    
    console.log('Simple Voice Process - Input received:', {
      from,
      to,
      callSid,
      transcription,
      confidence,
    });

    const twiml = new VoiceResponse();

    // Check transcription confidence
    if (confidence < 0.5) {
      console.log('Simple Voice Process - Low confidence, asking for repeat');
      twiml.say({
        voice: 'Polly.Matthew',
        language: 'en-US'
      }, 'I\'m sorry, I didn\'t quite catch that. Could you please repeat what you said?');
      
      const gather = twiml.gather({
        input: ['speech'],
        action: `/api/webhooks/twilio/voice-simple-main/process`,
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

    // Process the transcription
    console.log('Simple Voice Process - Processing transcription:', transcription);
    
    // Simple response based on what was said
    let response = '';
    const lowerTranscription = transcription.toLowerCase();
    
    if (lowerTranscription.includes('book') || lowerTranscription.includes('appointment') || lowerTranscription.includes('schedule')) {
      response = 'Great! I can help you book an appointment. Please visit our website or call back during business hours to speak with a representative.';
    } else if (lowerTranscription.includes('price') || lowerTranscription.includes('cost') || lowerTranscription.includes('how much')) {
      response = 'For pricing information, please visit our website or call back during business hours. We have different packages available.';
    } else if (lowerTranscription.includes('location') || lowerTranscription.includes('where') || lowerTranscription.includes('address')) {
      response = 'For our location and service areas, please visit our website or call back during business hours.';
    } else if (lowerTranscription.includes('hours') || lowerTranscription.includes('time') || lowerTranscription.includes('when')) {
      response = 'For our business hours and availability, please call back during business hours or visit our website.';
    } else {
      response = 'Thank you for your message. For more detailed assistance, please call back during business hours or visit our website.';
    }

    twiml.say({
      voice: 'Polly.Matthew',
      language: 'en-US'
    }, response);
    
    // Ask if they need anything else
    twiml.pause({ length: 1 });
    
    const gather = twiml.gather({
      input: ['speech'],
      action: `/api/webhooks/twilio/voice-simple-main/process`,
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
    
    console.log('Simple Voice Process - Response generated successfully');
    
    return new NextResponse(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' },
    });
    
  } catch (error) {
    console.error('=== SIMPLE VOICE PROCESS WEBHOOK ERROR ===');
    console.error('Error details:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
    
    // Return simple error response
    const twiml = new VoiceResponse();
    twiml.say({
      voice: 'Polly.Matthew',
      language: 'en-US'
    }, 'I apologize, but I\'m having trouble processing your request. Please try calling back later.');
    twiml.hangup();
    
    return new NextResponse(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' },
    });
  }
}
