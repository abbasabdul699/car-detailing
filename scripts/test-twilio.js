const twilio = require('twilio');

async function testTwilio() {
  try {
    console.log('Testing Twilio client...');
    
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    
    // Test Twilio client by getting account info
    const account = await client.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
    console.log('✅ Twilio client working');
    console.log('Account SID:', account.sid);
    console.log('Account Name:', account.friendlyName);
    
    // Test sending a message (this will fail in test mode, but we can see the error)
    try {
      const message = await client.messages.create({
        to: '+1234567890',
        from: '+15551234567',
        body: 'Test message from AI system'
      });
      console.log('✅ Message sent successfully:', message.sid);
    } catch (error) {
      console.log('⚠️  Message send failed (expected in test mode):', error.message);
    }
    
  } catch (error) {
    console.error('❌ Twilio error:', error.message);
  }
}

testTwilio();
