// Test script to verify base64 file functionality
const testData = {
  messageId: "test_123",
  timestamp: new Date().toISOString(),
  messageType: "mixed",
  content: "Test message with file",
  userId: "test_user",
  sender: "user",
  files: [{
    name: "test.txt",
    type: "text/plain",
    size: 11,
    data: "data:text/plain;base64,SGVsbG8gV29ybGQ=" // "Hello World" in base64
  }],
  metadata: {
    fileCount: 1,
    totalSize: 11,
    hasText: true
  }
};

console.log("Test data structure:");
console.log(JSON.stringify(testData, null, 2));

// Simulate what n8n would receive
console.log("\nWhat n8n would receive:");
console.log("Message:", testData.content);
console.log("Files:", testData.files.map(f => ({
  name: f.name,
  type: f.type,
  size: f.size,
  dataLength: f.data.length,
  dataPreview: f.data.substring(0, 50) + "..."
})));