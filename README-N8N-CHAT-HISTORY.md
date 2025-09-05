# N8N Chat History System - Complete Implementation Guide

## 🎯 Overview
This guide provides complete setup instructions for implementing a comprehensive chat history system with multimedia support using N8N, Google Drive, and Google Sheets.

## 📋 System Features

### ✅ Implemented Features
- **20 latest messages** loaded on page load
- **Infinite scroll** with "Load More" button
- **Chat search** with keyword highlighting
- **Scroll to bottom** functionality
- **Auto-scroll** on new messages
- **Multimedia support** (images, audio, files)
- **Base64 file storage** in Google Sheets
- **Google Drive integration** for large files

---

## 🔧 N8N Workflow Setup

### **Option 1: Google Drive + Google Sheets (Recommended)**

#### **Workflow Structure:**
```
Webhook → Router → Google Drive Upload → Google Sheets Save → Response
```

#### **1. Main Webhook Node**
```json
{
  "name": "Chat History Webhook",
  "path": "26dafe26-1528-4f01-a9d7-17a3fc7e277e",
  "method": "POST",
  "responseMode": "responseNode",
  "options": {}
}
```

#### **2. Router Node (Action-based routing)**
```json
{
  "rules": [
    {
      "conditions": [
        {
          "leftValue": "{{$json.action}}",
          "rightValue": "save_message"
        }
      ]
    },
    {
      "conditions": [
        {
          "leftValue": "{{$json.action}}",
          "rightValue": "load_history"
        }
      ]
    },
    {
      "conditions": [
        {
          "leftValue": "{{$json.action}}",
          "rightValue": "search_messages"
        }
      ]
    }
  ]
}
```

#### **3. Google Drive Upload Node (for files)**
```json
{
  "operation": "upload",
  "fileName": "={{$json.fileName}}",
  "fileContent": "={{$json.base64Data}}",
  "folderId": "YOUR_GOOGLE_DRIVE_FOLDER_ID",
  "options": {
    "convertToGoogleFormat": false
  }
}
```

#### **4. Google Sheets Node (for metadata)**
```json
{
  "operation": "append",
  "sheetName": "Chat_History",
  "columns": [
    "id",
    "user_id",
    "timestamp",
    "sender",
    "message_type",
    "content",
    "file_name",
    "file_type",
    "file_url",
    "metadata"
  ]
}
```

### **Option 2: Google Sheets Only (Base64 Storage)**

#### **Simplified Workflow:**
```
Webhook → Google Sheets Append → Response
```

#### **Google Sheets Node Configuration:**
```json
{
  "operation": "append",
  "sheetName": "Chat_History",
  "columns": [
    "id",
    "user_id",
    "timestamp",
    "sender",
    "message_type",
    "content",
    "file_name",
    "file_type",
    "base64_data",
    "metadata"
  ]
}
```

---

## 📊 Google Sheets Database Schema

### **Chat_History Sheet Structure:**

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT | Unique message ID |
| user_id | TEXT | User identifier |
| timestamp | TIMESTAMP | Message timestamp |
| sender | TEXT | 'user' or 'bot' |
| message_type | TEXT | 'text', 'image', 'audio', 'file' |
| content | TEXT | Message content |
| file_name | TEXT | Original file name |
| file_type | TEXT | MIME type |
| base64_data | TEXT | Base64 encoded file data |
| metadata | TEXT | JSON metadata |

### **Sample Data:**
```csv
id,user_id,timestamp,sender,message_type,content,file_name,file_type,base64_data,metadata
msg_001,user_123,2025-01-01 10:00:00,user,text,"Hello world",,,,"{""sessionId"": ""session_456""}"
msg_002,user_123,2025-01-01 10:00:05,bot,image,"Here's your image!",cat.jpg,image/jpeg,data:image/jpeg;base64/...,"{""tool"": ""generate-image""}"
```

---

## 🔍 Search Implementation

### **Search Workflow:**
```
Webhook → Google Sheets Search → Filter Results → Format Response
```

#### **Google Sheets Search Node:**
```json
{
  "operation": "search",
  "sheetName": "Chat_History",
  "filters": [
    {
      "column": "user_id",
      "condition": "={{$json.userId}}"
    },
    {
      "column": "content",
      "condition": "={{$json.query}}",
      "operator": "contains"
    }
  ]
}
```

#### **Search Response Format:**
```json
{
  "messages": [
    {
      "id": "msg_123",
      "content": "Hello <mark>world</mark>",
      "timestamp": "2025-01-01T10:00:00Z",
      "sender": "user",
      "fileName": "image.jpg",
      "base64Data": "data:image/jpeg;base64/..."
    }
  ],
  "totalFound": 15
}
```

---

## 📁 Google Drive Setup

### **1. Create Google Cloud Project**
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project or select existing
3. Enable Google Drive API
4. Create service account credentials

### **2. N8N Google Drive Configuration**
```json
{
  "authentication": "serviceAccount",
  "serviceAccount": "your-service-account.json",
  "scope": "https://www.googleapis.com/auth/drive"
}
```

### **3. Create Dedicated Folder**
```javascript
// Create folder for chat files
const folderName = `Chat_Files_${userId}`;
const folderId = await createGoogleDriveFolder(folderName);
```

### **4. File Upload Process**
```javascript
// Upload file to Google Drive
const fileMetadata = {
  name: fileName,
  parents: [folderId]
};

const media = {
  mimeType: fileType,
  body: Buffer.from(base64Data, 'base64')
};

const response = await drive.files.create({
  resource: fileMetadata,
  media: media,
  fields: 'id,webViewLink'
});
```

---

## 🔄 API Endpoints

### **1. Save Message**
```javascript
POST https://n8n.nextray.online/webhook/26dafe26-1528-4f01-a9d7-17a3fc7e277e
Content-Type: application/json

{
  "action": "save_message",
  "messageId": "msg_123",
  "userId": "user_456",
  "sender": "user",
  "messageType": "text",
  "content": "Hello world",
  "timestamp": "2025-01-01T10:00:00Z",
  "metadata": {
    "sessionId": "session_789"
  }
}
```

### **2. Load History**
```javascript
POST https://n8n.nextray.online/webhook/26dafe26-1528-4f01-a9d7-17a3fc7e277e
Content-Type: application/json

{
  "action": "load_history",
  "userId": "user_456",
  "limit": 20,
  "offset": 0
}
```

### **3. Search Messages**
```javascript
POST https://n8n.nextray.online/webhook/26dafe26-1528-4f01-a9d7-17a3fc7e277e
Content-Type: application/json

{
  "action": "search_messages",
  "userId": "user_456",
  "query": "hello",
  "context": 10
}
```

---

## 📱 Frontend Integration

### **Automatic History Loading:**
```typescript
// Loads on page initialization
window.addEventListener('load', () => {
  loadInitialChatHistory(); // Loads 20 latest messages
});
```

### **Infinite Scroll:**
```typescript
// Load more when button clicked
loadMoreBtn.addEventListener('click', () => {
  loadMoreChatHistory(); // Loads next 20 messages
});
```

### **Search Functionality:**
```typescript
// Search with highlighting
searchBtn.addEventListener('click', () => {
  const query = searchInput.value;
  searchMessages(query); // Searches and highlights results
});
```

---

## 🔒 Security Considerations

### **Authentication:**
- Use secure webhook URLs
- Implement user authentication
- Validate user permissions

### **Data Privacy:**
- Encrypt sensitive data
- Implement data retention policies
- Regular backup procedures

### **Rate Limiting:**
- Implement request throttling
- Monitor API usage
- Set reasonable limits

---

## 🚀 Deployment Checklist

### **N8N Setup:**
- [ ] Create webhook endpoint
- [ ] Configure Google Drive integration
- [ ] Set up Google Sheets database
- [ ] Test all workflow branches
- [ ] Enable production mode

### **Frontend Setup:**
- [ ] Update webhook URLs
- [ ] Test all features
- [ ] Verify multimedia support
- [ ] Test on mobile devices

### **Testing:**
- [ ] Save text messages
- [ ] Upload images and files
- [ ] Load chat history
- [ ] Test search functionality
- [ ] Verify scroll behaviors

---

## 🐛 Troubleshooting

### **Common Issues:**

#### **Google Drive Upload Fails:**
```javascript
// Check file size limits
if (fileSize > 10 * 1024 * 1024) {
  // Use chunked upload for large files
}
```

#### **Base64 Data Too Large:**
```javascript
// Compress images before base64 encoding
const compressedImage = await compressImage(file);
const base64Data = await fileToBase64(compressedImage);
```

#### **Search Performance:**
```javascript
// Use database indexes for better performance
CREATE INDEX idx_user_content ON Chat_History(user_id, content);
```

---

## 📈 Performance Optimization

### **Database Optimization:**
```sql
-- Add indexes for better query performance
CREATE INDEX idx_user_timestamp ON Chat_History(user_id, timestamp DESC);
CREATE INDEX idx_content_search ON Chat_History(content) USING FULLTEXT;
```

### **File Storage Strategy:**
```javascript
// Use different storage based on file size
if (fileSize < 1 * 1024 * 1024) {
  // Store in Google Sheets (base64)
  storeInSheets(base64Data);
} else {
  // Store in Google Drive
  storeInDrive(file);
}
```

### **Caching Strategy:**
```javascript
// Cache recent messages in memory
const messageCache = new Map();
const CACHE_SIZE = 100;

function addToCache(message) {
  if (messageCache.size >= CACHE_SIZE) {
    const oldestKey = messageCache.keys().next().value;
    messageCache.delete(oldestKey);
  }
  messageCache.set(message.id, message);
}
```

---

## 🎯 Next Steps

1. **Set up Google Cloud Project**
2. **Configure N8N workflows**
3. **Test with sample data**
4. **Implement user authentication**
5. **Add data backup procedures**
6. **Monitor performance metrics**

This comprehensive system provides a robust, scalable chat history solution with full multimedia support! 🚀