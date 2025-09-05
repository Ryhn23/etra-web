# 🚀 Webhook Integration Setup Guide

## ✅ **Current Status:**
- ✅ Webhook server running on `http://localhost:3002`
- ✅ WebSocket connection working
- ✅ Message broadcasting functional
- ✅ JSON parsing working correctly

## 🔧 **Setup Steps:**

### **1. Install ngrok (if not already installed)**
```bash
# Download ngrok from https://ngrok.com/download
# Or install via npm:
npm install -g ngrok
```

### **2. Expose Local Server to Internet**
```bash
# In a new terminal, run:
ngrok http 3002
```

This will give you a public URL like: `https://abc123.ngrok.io`

### **3. Update n8n Webhook URL**
Replace your current n8n webhook URL with the ngrok URL:
```
OLD: https://n8n.nextray.online/webhook/e1d52c48-5940-4120-b059-68c2b202aeef
NEW: https://abc123.ngrok.io/webhook/chat-response
```

## 📊 **Webhook Data Format**

### **What Your App Sends to n8n:**
```json
{
  "messageId": "msg_1725372290123_abc123",
  "timestamp": "2025-09-04T01:06:00.000Z",
  "messageType": "text",
  "content": "Hello, how are you?",
  "userId": "user_1234567890_xyz789",
  "sender": "user",
  "metadata": {
    "activeTool": null,
    "toolCommand": null,
    "isAudioMessage": false
  }
}
```

### **What n8n Should Send Back:**
```json
{
  "messageId": "msg_1725372290123_response",
  "timestamp": "2025-09-04T01:06:05.000Z",
  "messageType": "text",
  "content": "I'm doing well, thank you for asking!",
  "userId": "user_1234567890_xyz789",
  "sender": "bot",
  "metadata": {
    "originalMessageId": "msg_1725372290123_abc123"
  }
}
```

## 🎯 **n8n Workflow Setup**

### **Required n8n Nodes:**

1. **Webhook Node** (Trigger)
   - HTTP Method: `POST`
   - Path: `/webhook/chat-response`
   - Response Mode: `When Last Node Finishes`

2. **Function Node** (Process Message)
   ```javascript
   // Extract message data
   const message = $node["Webhook"].json;
   const content = message.content;
   const userId = message.userId;

   // Your AI processing logic here
   // Example: Call OpenAI API
   const response = await $ai.generateText({
     prompt: content,
     model: "gpt-4"
   });

   return {
     messageId: `response_${Date.now()}`,
     timestamp: new Date().toISOString(),
     messageType: "text",
     content: response,
     userId: userId,
     sender: "bot",
     originalMessageId: message.messageId
   };
   ```

3. **HTTP Request Node** (Send Response Back)
   - Method: `POST`
   - URL: `{{ $node["Webhook"].json.webhookUrl }}` (if you want to send back to a different endpoint)
   - Or use the same webhook URL for responses

## 🔍 **Testing Your Setup**

### **Test Webhook Server Locally:**
```bash
# Test health endpoint
curl http://localhost:3002/health

# Test webhook endpoint
curl -X POST http://localhost:3002/webhook/chat-response \
  -H "Content-Type: application/json" \
  -d @test-webhook.json
```

### **Test with ngrok:**
```bash
# After ngrok is running, test the public URL
curl -X POST https://abc123.ngrok.io/webhook/chat-response \
  -H "Content-Type: application/json" \
  -d @test-webhook.json
```

## 🚨 **Common Issues & Solutions**

### **1. CORS Issues**
- ✅ Already handled with `cors()` middleware
- If you still get CORS errors, check your n8n request headers

### **2. JSON Parsing Errors**
- ✅ Fixed by using proper JSON format
- Make sure n8n sends valid JSON without extra escaping

### **3. WebSocket Connection Issues**
- ✅ Client automatically reconnects on disconnection
- Check browser console for WebSocket errors

### **4. ngrok Connection Issues**
- Make sure ngrok is running: `ngrok http 3002`
- Check ngrok status: visit `http://localhost:4040`
- If ngrok disconnects, restart it

## 📈 **Monitoring & Debugging**

### **Server Logs:**
The webhook server will show:
- Incoming webhook requests
- WebSocket connections/disconnections
- Message broadcasting status
- Error details

### **Browser Console:**
Check for:
- WebSocket connection status
- Message sending confirmations
- Error messages

### **n8n Logs:**
Check n8n execution logs for:
- Webhook trigger events
- Processing errors
- HTTP request responses

## 🎉 **Success Indicators**

When everything is working correctly, you should see:

1. **n8n receives webhook** ✅
2. **n8n processes message** ✅
3. **n8n sends response back** ✅
4. **Webhook server receives response** ✅
5. **WebSocket broadcasts to browser** ✅
6. **Chat updates with bot response** ✅

## 🔄 **Data Flow:**

```
User Message → Browser → n8n Webhook → AI Processing → Response → Webhook Server → WebSocket → Browser → Chat UI
```

## 📞 **Need Help?**

If you encounter issues:

1. Check webhook server logs
2. Verify ngrok is running and accessible
3. Test with the provided `test-webhook.json` file
4. Check n8n workflow execution logs
5. Verify JSON format matches the expected structure

**Your webhook server is ready! Just expose it with ngrok and update your n8n webhook URL.** 🚀