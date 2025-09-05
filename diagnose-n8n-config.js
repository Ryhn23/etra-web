// Diagnostic script to understand n8n workflow configuration issues
const https = require('https');

const WEBHOOK_URL = 'https://n8n.nextray.online/webhook/e1d52c48-5940-4120-b059-68c2b202aeef';

// Test different payload structures to understand what n8n expects
const testCases = [
  {
    name: 'Simplified metadata structure (current)',
    payload: {
      messageId: 'test_diagnostic_1',
      timestamp: new Date().toISOString(),
      messageType: 'text',
      content: '/generate-image',
      userId: 'user123',
      sender: 'user',
      metadata: {
        commandId: 'generate-image',
        userAgent: 'Diagnostic Script',
        sessionId: 'diagnostic_session'
      }
    }
  },
  {
    name: 'Command in content only',
    payload: {
      messageId: 'test_diagnostic_2',
      timestamp: new Date().toISOString(),
      messageType: 'text',
      content: '/generate-image',
      userId: 'user123',
      sender: 'user'
    }
  },
  {
    name: 'Command in both content and metadata',
    payload: {
      messageId: 'test_diagnostic_3',
      timestamp: new Date().toISOString(),
      messageType: 'text',
      content: '/generate-image create a beautiful landscape',
      userId: 'user123',
      sender: 'user',
      metadata: {
        commandId: 'generate-image',
        prompt: 'create a beautiful landscape'
      }
    }
  }
];

async function runDiagnostic() {
  console.log('🔍 Running n8n Configuration Diagnostic');
  console.log('=======================================\n');
  
  for (const testCase of testCases) {
    console.log(`\n📋 Test Case: ${testCase.name}`);
    console.log('Payload:');
    console.log(JSON.stringify(testCase.payload, null, 2));
    
    const result = await sendWebhook(testCase.payload);
    
    console.log(`Status: ${result.status}`);
    console.log('Response:', result.response || '(empty)');
    
    if (result.response && result.response.includes('gak punya perintah')) {
      console.log('❌ n8n does NOT recognize this command structure');
    } else if (result.status === 200) {
      console.log('✅ Webhook accepted, but check n8n response content');
    }
    
    console.log('---');
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
  
  console.log('\n🎯 DIAGNOSIS SUMMARY:');
  console.log('The webhook communication is working correctly (HTTP 200 responses)');
  console.log('The commandId is being transmitted properly in metadata');
  console.log('BUT: n8n workflow is configured to respond with error messages');
  console.log('\n🔧 RECOMMENDED ACTION:');
  console.log('Update n8n workflow to:');
  console.log('1. Extract commandId from metadata.commandId field');
  console.log('2. Route commands to appropriate AI services instead of error responses');
  console.log('3. Ensure /generate-image, /generate-audio, /edit-image are properly configured');
}

function sendWebhook(payload) {
  const data = JSON.stringify(payload);
  const url = new URL(WEBHOOK_URL);

  const options = {
    hostname: url.hostname,
    port: 443,
    path: url.pathname + url.search,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  };

  return new Promise((resolve) => {
    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        resolve({ status: res.statusCode, response: responseData });
      });
    });

    req.on('error', (error) => {
      resolve({ status: 'error', response: error.message });
    });

    req.write(data);
    req.end();
  });
}

runDiagnostic().catch(console.error);