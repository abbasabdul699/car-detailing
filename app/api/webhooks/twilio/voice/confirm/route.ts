import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import twilio from 'twilio';

const VoiceResponse = twilio.twiml.VoiceResponse;

// Helper function to generate speech using OpenAI TTS
async function generateOpenAISpeech(text: string, voice: string = 'nova'): Promise<string | null> {
  try {
    // Clean up the text for better speech synthesis
    let cleanText = text
      .replace(/[^\w\s.,!?-]/g, '') // Remove special characters but keep hyphens
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();

    // Simple text cleanup
    cleanText = cleanText
      .replace(/\s+/g, ' ') // Ensure single spaces
      .replace(/\.{2,}/g, '.') // Replace multiple dots with single dot
      .replace(/!{2,}/g, '!') // Replace multiple exclamations with single
      .replace(/\?{2,}/g, '?'); // Replace multiple questions with single

    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1-hd', // Higher quality voice
        input: cleanText,
        voice: voice,
        response_format: 'mp3',
        speed: 1.0
      })
    });

    if (response.ok) {
      const audioBuffer = await response.arrayBuffer();
      const base64Audio = Buffer.from(audioBuffer).toString('base64');
      return `data:audio/mp3;base64,${base64Audio}`;
    } else {
      console.error('OpenAI TTS error:', response.status, await response.text());
      return null;
    }
  } catch (error) {
    console.error('OpenAI TTS error:', error);
    return null;
  }
}

// Helper function to refresh Google Calendar access token
async function refreshGoogleCalendarToken(refreshToken: string) {
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to refresh token');
    }

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('Error refreshing Google Calendar token:', error);
    throw error;
  }
}

// Helper function to create Google Calendar event
async function createGoogleCalendarEvent(accessToken: string, booking: any, detailer: any) {
  try {
    const startDateTime = new Date(booking.scheduledDate);
    if (booking.scheduledTime) {
      const [hours, minutes] = booking.scheduledTime.split(':');
      startDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    }
    
    const endDateTime = new Date(startDateTime);
    endDateTime.setMinutes(endDateTime.getMinutes() + (booking.duration || 120)); // Default 2 hours

    const event = {
      summary: `Car Detailing - ${booking.customerName || 'Customer'}`,
      description: `
Services: ${booking.services.join(', ')}
Customer: ${booking.customerName || 'N/A'}
Phone: ${booking.customerPhone}
Vehicle: ${booking.vehicleType || 'N/A'}
Location: ${booking.vehicleLocation || 'N/A'}
Notes: ${booking.notes || 'N/A'}
      `.trim(),
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: 'America/New_York', // Adjust based on detailer's timezone
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: 'America/New_York',
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 }, // 24 hours before
          { method: 'popup', minutes: 60 }, // 1 hour before
        ],
      },
    };

    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      }
    );

    if (!response.ok) {
      throw new Error(`Google Calendar API error: ${response.status}`);
    }

    const data = await response.json();
    return data.id; // Return the Google Calendar event ID
  } catch (error) {
    console.error('Error creating Google Calendar event:', error);
    throw error;
  }
}

// Handle booking confirmation via voice
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    // Extract Twilio voice webhook data
    const from = formData.get('From') as string;
    const to = formData.get('To') as string;
    const callSid = formData.get('CallSid') as string;
    const transcription = formData.get('SpeechResult') as string;
    const confidence = parseFloat(formData.get('Confidence') as string || '0');
    const conversationId = formData.get('conversationId') as string;
    const bookingId = formData.get('bookingId') as string;
    
    console.log('Processing booking confirmation:', {
      from,
      to,
      callSid,
      transcription,
      confidence,
      conversationId,
      bookingId,
    });

    // Get booking and detailer info
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        detailer: {
          select: {
            businessName: true,
            googleCalendarConnected: true,
            syncAppointments: true,
            googleCalendarTokens: true,
            googleCalendarRefreshToken: true
          }
        },
        conversation: true
      }
    });

    if (!booking) {
      throw new Error('Booking not found');
    }

    // Determine if customer confirmed or declined
    const lowerTranscription = transcription.toLowerCase();
    const isConfirmed = lowerTranscription.includes('yes') || 
                       lowerTranscription.includes('confirm') || 
                       lowerTranscription.includes('correct') ||
                       lowerTranscription.includes('that\'s right') ||
                       lowerTranscription.includes('sounds good');

    const isDeclined = lowerTranscription.includes('no') || 
                      lowerTranscription.includes('cancel') || 
                      lowerTranscription.includes('wrong') ||
                      lowerTranscription.includes('change') ||
                      lowerTranscription.includes('different');

    // Store the customer's confirmation response
    await prisma.message.create({
      data: {
        conversationId: conversationId,
        direction: 'inbound',
        content: `[VOICE CONFIRMATION]: ${transcription}`,
        twilioSid: callSid,
        status: 'received',
      },
    });

    const twiml = new VoiceResponse();

    if (isConfirmed) {
      // Confirm the booking
      await prisma.booking.update({
        where: { id: bookingId },
        data: { status: 'confirmed' }
      });

      // Try to create Google Calendar event if connected
      let googleEventId = null;
      if (booking.detailer.googleCalendarConnected && booking.detailer.syncAppointments && booking.detailer.googleCalendarTokens && booking.detailer.googleCalendarRefreshToken) {
        try {
          const tokens = JSON.parse(booking.detailer.googleCalendarTokens);
          let accessToken = tokens.access_token;

          try {
            googleEventId = await createGoogleCalendarEvent(accessToken, booking, booking.detailer);
          } catch (error) {
            // If access token is expired, try to refresh it
            console.log('Access token expired, refreshing...');
            accessToken = await refreshGoogleCalendarToken(booking.detailer.googleCalendarRefreshToken);
            
            // Update the stored tokens
            const updatedTokens = {
              ...tokens,
              access_token: accessToken,
            };
            
            await prisma.detailer.update({
              where: { id: booking.detailer.id },
              data: {
                googleCalendarTokens: JSON.stringify(updatedTokens),
              },
            });

            // Retry creating Google Calendar event
            googleEventId = await createGoogleCalendarEvent(accessToken, booking, booking.detailer);
          }

          // Update booking with Google Calendar event ID
          if (googleEventId) {
            await prisma.booking.update({
              where: { id: bookingId },
              data: { googleEventId }
            });
            console.log('Google Calendar event created:', googleEventId);
          }
        } catch (error) {
          console.error('Failed to create Google Calendar event:', error);
          // Don't fail the booking confirmation if Google Calendar fails
        }
      }

      // Store confirmation message
      await prisma.message.create({
        data: {
          conversationId: conversationId,
          direction: 'outbound',
          content: `[VOICE RESPONSE]: Booking confirmed for ${booking.scheduledDate.toLocaleDateString()} at ${booking.scheduledTime}`,
          status: 'sent',
        },
      });

      const confirmationMessage = `Perfect! Your appointment with ${booking.detailer.businessName} is confirmed for ${booking.scheduledDate.toLocaleDateString()} at ${booking.scheduledTime}. We'll see you then! Thank you for calling.`;
      
      const confirmationAudio = await generateOpenAISpeech(confirmationMessage, 'nova');
      
      if (confirmationAudio) {
        twiml.play(confirmationAudio);
      } else {
        twiml.say({
          voice: 'Polly.Matthew',
          language: 'en-US',
          speechRate: 'medium'
        }, confirmationMessage);
      }

    } else if (isDeclined) {
      // Cancel the booking
      await prisma.booking.update({
        where: { id: bookingId },
        data: { status: 'cancelled' }
      });

      // Store cancellation message
      await prisma.message.create({
        data: {
          conversationId: conversationId,
          direction: 'outbound',
          content: `[VOICE RESPONSE]: Booking cancelled - customer requested changes`,
          status: 'sent',
        },
      });

      const cancellationMessage = `No problem! I've cancelled that appointment. Please call back when you're ready to schedule, or if you'd like to make changes to your appointment details.`;
      
      const cancellationAudio = await generateOpenAISpeech(cancellationMessage, 'nova');
      
      if (cancellationAudio) {
        twiml.play(cancellationAudio);
      } else {
        twiml.say({
          voice: 'Polly.Matthew',
          language: 'en-US',
          speechRate: 'medium'
        }, cancellationMessage);
      }

    } else {
      // Unclear response - ask for clarification
      const clarificationMessage = `I'm sorry, I didn't quite understand. Did you say yes to confirm this appointment, or no to make changes?`;
      
      const clarificationAudio = await generateOpenAISpeech(clarificationMessage, 'nova');
      
      if (clarificationAudio) {
        twiml.play(clarificationAudio);
      } else {
        twiml.say({
          voice: 'Polly.Matthew',
          language: 'en-US',
          speechRate: 'medium'
        }, clarificationMessage);
      }

      // Gather clarification
      const gather = twiml.gather({
        input: ['speech'],
        action: `/api/webhooks/twilio/voice/confirm?conversationId=${conversationId}&bookingId=${bookingId}&callSid=${callSid}`,
        method: 'POST',
        speechTimeout: 'auto',
        timeout: 10,
        language: 'en-US',
        enhanced: true,
        speechModel: 'phone_call'
      });

      const gatherPromptAudio = await generateOpenAISpeech('Please say yes to confirm or no to make changes.', 'nova');
      
      if (gatherPromptAudio) {
        gather.play(gatherPromptAudio);
      } else {
        gather.say({
          voice: 'Polly.Matthew',
          language: 'en-US'
        }, 'Please say yes to confirm or no to make changes.');
      }

      // Fallback
      const fallbackAudio = await generateOpenAISpeech('I didn\'t hear a clear response. Please call back to confirm your appointment.', 'nova');
      
      if (fallbackAudio) {
        twiml.play(fallbackAudio);
      } else {
        twiml.say({
          voice: 'Polly.Matthew',
          language: 'en-US'
        }, 'I didn\'t hear a clear response. Please call back to confirm your appointment.');
      }
    }

    twiml.hangup();

    return new NextResponse(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' },
    });

  } catch (error) {
    console.error('Voice confirmation error:', error);
    
    // Return error response
    const twiml = new VoiceResponse();
    twiml.say({
      voice: 'Polly.Matthew',
      language: 'en-US'
    }, 'I apologize, but I\'m experiencing technical difficulties. Please try calling back later.');
    twiml.hangup();
    
    return new NextResponse(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' },
    });
  }
}
