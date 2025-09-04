# n8n Integration with Base64 Files

This document explains how to configure n8n to send images and files to the web project using base64 encoding.

## Webhook Endpoints

The webhook server now supports two endpoints for receiving base64 content:

### 1. `/webhook/chat-response` (Enhanced)
- **URL**: `http://localhost:3002/webhook/chat-response`
- **Method**: POST
- **Content-Type**: application/json
- **Description**: Enhanced endpoint that can handle both text responses and base64 files

### 2. `/webhook/base64-content` (Dedicated)
- **URL**: `http://localhost:3002/webhook/base64-content`
- **Method**: POST
- **Content-Type**: application/json
- **Description**: Dedicated endpoint specifically for base64 content

## Payload Structure

### Basic Text Response
```json
{
  "messageId": "unique_message_id",
  "timestamp": "2025-09-04T03:45:00.000Z",
  "messageType": "text",
  "content": "Your response text here",
  "userId": "system",
  "sender": "bot",
  "metadata": {
    "triggerAnimation": "happy"
  }
}
```

### Response with Base64 Files
```json
{
  "messageId": "unique_message_id",
  "timestamp": "2025-09-04T03:45:00.000Z",
  "messageType": "mixed",
  "content": "Here is the image you requested",
  "userId": "system",
  "sender": "bot",
  "files": [
    {
      "name": "generated_image.png",
      "type": "image/png",
      "size": 10240,
      "data": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
    }
  ],
  "metadata": {
    "triggerAnimation": "happy",
    "fileCount": 1,
    "hasText": true
  }
}
```

## File Properties

| Property | Type | Description |
|----------|------|-------------|
| `name` | string | Original filename |
| `type` | string | MIME type (e.g., `image/png`, `audio/mpeg`) |
| `size` | number | File size in bytes |
| `data` | string | Base64 encoded data with data URL prefix |

## Supported File Types

### Images
- `image/jpeg`
- `image/png` 
- `image/gif`
- `image/webp`

### Audio
- `audio/mpeg` (MP3)
- `audio/wav`
- `audio/ogg`

### Documents
- `application/pdf`
- `text/plain`
- `application/msword`
- `application/vnd.openxmlformats-officedocument.wordprocessingml.document`

## n8n Configuration Examples

### Example 1: Send Image Response
```javascript
// In n8n JavaScript code node
const imageBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

return [{
  json: {
    messageId: `msg_${Date.now()}`,
    timestamp: new Date().toISOString(),
    messageType: "mixed",
    content: "Here is your generated image",
    userId: "system",
    sender: "bot",
    files: [{
      name: "generated_image.png",
      type: "image/png",
      size: 10240,
      data: imageBase64
    }],
    metadata: {
      triggerAnimation: "excited",
      fileCount: 1,
      hasText: true
    }
  }
}];
```

### Example 2: Send Multiple Files
```javascript
// In n8n JavaScript code node
const imageData = "data:image/png;base64,...";
const audioData = "data:audio/mpeg;base64,...";

return [{
  json: {
    messageId: `msg_${Date.now()}`,
    timestamp: new Date().toISOString(),
    messageType: "mixed",
    content: "Here are your files",
    userId: "system",
    sender: "bot",
    files: [
      {
        name: "image.png",
        type: "image/png",
        size: 15360,
        data: imageData
      },
      {
        name: "audio.mp3",
        type: "audio/mpeg",
        size: 20480,
        data: audioData
      }
    ],
    metadata: {
      triggerAnimation: "talking",
      fileCount: 2,
      hasText: true
    }
  }
}];
```

### Example 3: Audio Response Only
```javascript
// In n8n JavaScript code node
const audioBase64 = "data:audio/mpeg;base64,...";

return [{
  json: {
    messageId: `msg_${Date.now()}`,
    timestamp: new Date().toISOString(),
    messageType: "audio",
    content: "",
    userId: "system",
    sender: "bot",
    files: [{
      name: "response.mp3",
      type: "audio/mpeg",
      size: 10240,
      data: audioBase64
    }],
    metadata: {
      triggerAnimation: "listening",
      fileCount: 1,
      hasText: false
    }
  }
}];
```

## Generating Base64 in n8n

### Method 1: Using HTTP Request Node
1. Add an HTTP Request node to fetch the file
2. Use a Function node to convert to base64:

```javascript
// Convert buffer to base64 with data URL prefix
const base64Data = `data:${$input.first().headers['content-type']};base64,${$input.first().response.toString('base64')}`;

return {
  base64: base64Data,
  contentType: $input.first().headers['content-type'],
  filename: "downloaded_file.png"
};
```

### Method 2: From File System
```javascript
// Read file and convert to base64
const fs = require('fs');
const path = require('path');

const filePath = '/path/to/your/file.png';
const fileBuffer = fs.readFileSync(filePath);
const base64Data = `data:image/png;base64,${fileBuffer.toString('base64')}`;

return {
  base64: base64Data,
  filename: path.basename(filePath)
};
```

## Testing

### Test File
A test file [`test-n8n-base64.json`](./test-n8n-base64.json) is provided with sample base64 data.

### Manual Testing with curl
```bash
# Test base64 endpoint
curl -X POST http://localhost:3002/webhook/base64-content \
  -H "Content-Type: application/json" \
  -d @test-n8n-base64.json

# Test enhanced chat-response endpoint  
curl -X POST http://localhost:3002/webhook/chat-response \
  -H "Content-Type: application/json" \
  -d @test-n8n-base64.json
```

## Limitations

1. **File Size**: Maximum 50MB payload size (configured in webhook server)
2. **Base64 Overhead**: Base64 encoding increases file size by ~33%
3. **Memory Usage**: Large files may impact browser performance
4. **Supported Types**: Only the listed MIME types are supported

## Troubleshooting

### Common Issues
1. **Missing data URL prefix**: Ensure base64 strings start with `data:[mime-type];base64,`
2. **Large files**: Check n8n memory limits and webhook server payload size
3. **Unsupported types**: Verify MIME type is in the supported list

### Debugging
- Check webhook server console for incoming requests
- Use browser developer tools to inspect WebSocket messages
- Test with the provided [`test-n8n-base64.json`](./test-n8n-base64.json) file

## Best Practices

1. **Compress images** before base64 encoding
2. **Use appropriate MIME types** for proper rendering
3. **Include filename** for better user experience
4. **Limit file size** to ensure good performance
5. **Use metadata** to trigger Live2D animations appropriately

## Live2D Integration

Use metadata to trigger Live2D animations:

```json
{
  "metadata": {
    "triggerAnimation": "happy",
    "expression": "smile",
    "motion": "greeting"
  }
}
```

Available animations are defined in the Live2D model configuration.