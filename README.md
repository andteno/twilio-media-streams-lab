# Twilio Media Streams: Local Proof of Concept (POC)

> **Disclaimer:** This repository contains sample code provided by Twilio Professional Services (PS) for demonstration and proof-of-concept purposes only. It is not a production-ready solution. You are strongly advised to further develop, secure, and rigorously test this code in a lower environment (e.g., development or staging) before deploying it to a production environment.

---

## Context & Summary
This repository provides a local testing environment to evaluate Twilio Media Streams. It represents a simplified phase of a larger AI-to-AI communication architecture. By redirecting the destination routing to a standard personal phone number, a human can manually receive the call and audit the output from the agent in real-time. 

## Objectives
* **Audio Validation:** Verifies the integrity of the PSTN bridge and audio fidelity while avoiding the complexity of managing concurrent AI sessions.
* **Protocol Logging:** Functions as a robust Protocol Logger. The application captures precise timestamps and payload dimensions for inbound media, as well as formal confirmation of successful packet transmission to the Twilio gateway.
* **Scripted Agent Simulation:** Operates without a live LLM integration by transmitting pre-recorded mu-law audio packets (e.g., a static greeting loop).

---

## How to Run This Code

### 1. Prerequisites
* **Node.js**: A WebSocket server built with Node.js.
* **ngrok**: A public tunnel to expose your local port to the internet so Twilio can reach it.
* **Twilio Account**: A purchased Twilio phone number (the caller) and your API Credentials (Account SID and Auth Token).

### 2. Initial Setup
Clone this repository and install the dependencies:
```bash
npm install
```

### 3. Configuration
Before running, update the scripts with your actual credentials:
* **`server.js`**: Add your **Twilio Auth Token** and the exact **ngrok `wss://` URL**.
* **`trigger.js`**: Update your **Account SID**, **Auth Token**, **Twilio Phone Number** (From), and your **Personal Phone Number** (To).

### 4. Execution
Open three separate terminal windows to run the flow:

**Terminal 1: Expose the Local Port**
```bash
ngrok http 8080
```

**Terminal 2: Start the WebSocket Server**
```bash
node server.js
```

**Terminal 3: Trigger the Call**
```bash
node trigger.js
```

Once your phone rings, answer it. You will hear the pre-recorded greeting, and the server terminal will automatically log the incoming payload details as you speak into the device!

---

## 🏗️ Architecture Diagram

```mermaid
sequenceDiagram
    autonumber
    participant Lab as Lab Script (trigger.js)
    participant WS as Local Server (server.js)
    participant Twilio as Twilio Gateway
    participant Phone as Personal Phone

    Lab->>Twilio: POST /Calls (From: Twilio Num, To: Personal Num) 
    Note over Lab, Twilio: TwiML: <Connect><Stream url="wss://ngrok-url">
    
    par WebSocket Initiation
        Twilio->>WS: Connect WebSocket (HTTP Upgrade)
        WS-->>Twilio: Validate X-Twilio-Signature
        Twilio->>WS: Event: "start" (Capture streamSid)
    end
    
    Twilio->>Phone: Call rings via PSTN
    Phone-->>Twilio: You answer the phone
    
    Note over WS, Phone: Call connected. Testing phase begins.
    
    loop Scripted Interaction & Logging
        WS->>Twilio: Send Fixed/Scripted Audio (Base64 mu-law)
        Twilio->>Phone: You hear the scripted message
        Phone->>Twilio: You speak into the phone
        Twilio->>WS: Send JSON (event: "media", payload: base64)
        Note over WS: Server LOGS the incoming payload
    end

