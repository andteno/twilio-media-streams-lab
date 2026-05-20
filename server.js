const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const twilio = require('twilio'); 

// Configure the WebSocket server
const wss = new WebSocket.Server({ port: 8080 });

// --- SECURITY CONFIGURATION ---
// Your Auth Token from the Twilio Console 
const authToken = 'YOUR_TWILIO_AUTH_TOKEN'; 
// The EXACT wss:// URL from your trigger.js script (Include the trailing slash if needed!)
const expectedUrl = 'wss://xxx.dev/media'; 

// Load your pre-recorded audio file
const audioFilePath = path.join(__dirname, 'greeting.wav'); 
let audioData;
try {
    audioData = fs.readFileSync(audioFilePath);
} catch (err) {
    console.error("Error loading audio file. Ensure 'greeting.wav' exists in the directory.");
}

console.log('Local WebSocket Server running on ws://localhost:8080/media');

wss.on('connection', (ws, req) => {
    // --- 1. IP ADDRESS & URL CAPTURE ---
    const incomingIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    
    // Construct the full URL that Twilio requested
    const host = req.headers.host;
    const path = req.url;
    const requestedUrl = `wss://${host}${path}`;

    console.log(`\n[!] Incoming connection attempt from IP: ${incomingIp}`);
    console.log(`[!] Requested URL: ${requestedUrl}`);

    // --- 2. SIGNATURE VALIDATION ---
    const signature = req.headers['x-twilio-signature'];

    if (!signature) {
        console.error('Connection Rejected: Missing X-Twilio-Signature header.');
        ws.close(1008, 'Missing signature'); 
        return;
    }

    const isValid = twilio.validateRequest(authToken, signature, expectedUrl, {});

    if (!isValid) {
        console.error('Connection Rejected: Invalid X-Twilio-Signature.');
        ws.close(1008, 'Invalid signature');
        return;
    }

    console.log('Twilio Signature Validated Successfully! Connection established.');
    
    // --- 3. STANDARD CONNECTION LOGIC ---
    let streamSid = null;
    let audioInterval = null;

    ws.on('message', (message) => {
        const msg = JSON.parse(message);

        switch (msg.event) {
            case 'connected':
                console.log('Twilio Media Stream Connected.');
                break;

            case 'start':
                streamSid = msg.start.streamSid;
                console.log(`Stream Started. Metadata:`, msg.start);
                
                if (audioData) {
                    startSendingAudio(ws, streamSid);
                }
                break;

            case 'media':
                const payloadSize = Buffer.byteLength(msg.media.payload, 'base64');
                console.log(`Received inbound media - Timestamp: ${msg.media.timestamp}, Payload Size: ${payloadSize} bytes`);
                break;

            case 'stop':
                console.log('Stream Stopped.');
                if (audioInterval) clearInterval(audioInterval);
                break;
        }
    });

    ws.on('close', () => {
        console.log('WebSocket connection closed by Twilio.');
        if (audioInterval) clearInterval(audioInterval);
    });

    // Helper function to send audio chunks
    function startSendingAudio(ws, sid) {
        let offset = 0;
        const chunkSize = 160; 

        audioInterval = setInterval(() => {
            if (offset >= audioData.length) {
                console.log('Finished sending pre-recorded audio.');
                clearInterval(audioInterval);
                return;
            }

            const chunk = audioData.slice(offset, offset + chunkSize);
            offset += chunkSize;

            const mediaMessage = {
                event: 'media',
                streamSid: sid,
                media: {
                    payload: chunk.toString('base64')
                }
            };

            ws.send(JSON.stringify(mediaMessage));
        }, 20); 
    }
});