const twilio = require('twilio');
// Your Twilio credentials from the console
const accountSid = 'YOUR_TWILIO_ACCOUNTSID';
const authToken = 'YOUR_TWILIO_AUTH_TOKEN';
const client = twilio(accountSid, authToken);
async function startLabCall() {
  try {
    const call = await client.calls.create({
      // 1. The destination
      to: '+5516999999999',
      // 2. The origin (Your Twilio number)
      from: '+19999999999',
      record: true,
      // 3. The Inline TwiML pointing to your local ngrok server
      twiml: `
<Response>
<Connect>
<Stream url="wss://turmoil-unfixed-garlic.ngrok-free.dev/media"
/>
</Connect>
</Response>
`
    });
    console.log(`Call triggered successfully! Call SID:
${call.sid}`);
  } catch (error) {
    console.error('Error triggering call:', error);
  }
}
startLabCall();