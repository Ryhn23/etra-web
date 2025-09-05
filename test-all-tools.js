// Test script to verify all three tools work with the simplified payload structure
const https = require('https');

const WEBHOOK_URL = 'https://n8n.nextray.online/webhook/e1d52c48-5940-4120-b059-68c2b202aeef';

const tools = ['generate-image', 'generate-audio', 'edit-image'];

function testTool(toolName) {
  const testPayload = {
    messageId: `test_${toolName}_${Date.now()}`,
    timestamp: new Date().toISOString(),
    messageType: 'text',
    content: `/${toolName}`,
    userId: 'user123',
    sender: 'user',
    metadata: {
      commandId: toolName,
      userAgent: 'Test Script',
      sessionId: 'test_session_123',
      platform: 'test',
      language: 'en-US',
      timezone: 'UTC',
      hasImageAttachment: toolName === 'edit-image',
      attachmentCount: toolName === 'edit-image' ? 1 : 0
    }
  };

  console.log(`\n=== Testing ${toolName} tool ===`);
  console.log('Payload:');
  console.log(JSON.stringify(testPayload, null, 2));

  const data = JSON.stringify(testPayload);
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
      console.log(`Status: ${res.statusCode}`);
      
      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        console.log('Response:', responseData || '(empty)');
        console.log(`=== ${toolName} test completed ===`);
        resolve({ tool: toolName, status: res.statusCode, response: responseData });
      });
    });

    req.on('error', (error) => {
      console.error('Error:', error.message);
      resolve({ tool: toolName, status: 'error', error: error.message });
    });

    req.write(data);
    req.end();
  });
}

async function testAllTools() {
  console.log('Testing all three tools with simplified payload structure...');
  
  const results = [];
  for (const tool of tools) {
    const result = await testTool(tool);
    results.push(result);
    // Wait 2 seconds between tests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('\n=== TEST RESULTS SUMMARY ===');
  results.forEach(result => {
    console.log(`${result.tool}: ${result.status === 200 ? '✅ Success' : '❌ Failed'}${result.error ? ` - ${result.error}` : ''}`);
  });

  // Check if any tools are not being recognized properly
  const unrecognizedTools = results.filter(result => 
    result.response && result.response.includes('gak punya perintah')
  );
  
  if (unrecognizedTools.length > 0) {
    console.log('\n⚠️  Tools not recognized by n8n:');
    unrecognizedTools.forEach(tool => {
      console.log(`   - ${tool.tool}`);
    });
    console.log('\nPlease check n8n workflow configuration to ensure these commands are properly configured.');
  } else {
    console.log('\n🎉 All tools appear to be working correctly!');
  }
}

testAllTools().catch(console.error);