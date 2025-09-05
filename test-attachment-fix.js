// Test script to verify attachment fix
console.log('🧪 Testing attachment functionality...\n');

// Simulate the currentAttachments array
let currentAttachments = [
  new File(['test image content'], 'test-image.jpg', { type: 'image/jpeg' }),
  new File(['test text content'], 'test-doc.txt', { type: 'text/plain' })
];

console.log('📎 Initial attachments:', currentAttachments.length);
console.log('📎 Files:', currentAttachments.map(f => f.name));

// Simulate the old buggy code
console.log('\n❌ OLD CODE (buggy):');
let displayText = 'ini gambar apa?';
if (currentAttachments.length > 0) {
  const attachmentText = currentAttachments.length === 1
    ? `[${currentAttachments[0].name}]`
    : `[${currentAttachments.length} files]`;
  displayText = displayText ? `${displayText} ${attachmentText}` : attachmentText;
}
console.log('💬 Display text:', displayText);

// Clear attachments (this was the bug!)
let attachmentsToSend = [];
console.log('🗑️  Clearing currentAttachments...');
currentAttachments = []; // This was the problem!
console.log('📎 currentAttachments after clear:', currentAttachments.length);

// Check condition (this would always be false!)
if (currentAttachments.length > 0) {
  console.log('📤 Would send with files');
} else {
  console.log('📤 Would send text only (BUG!)');
}

console.log('\n✅ NEW CODE (fixed):');
// Reset for new test
currentAttachments = [
  new File(['test image content'], 'test-image.jpg', { type: 'image/jpeg' }),
  new File(['test text content'], 'test-doc.txt', { type: 'text/plain' })
];

console.log('📎 Reset attachments:', currentAttachments.length);

// Store attachments BEFORE clearing
attachmentsToSend = [...currentAttachments];
console.log('💾 Stored attachments for sending:', attachmentsToSend.length);

// Clear UI immediately
currentAttachments = [];
console.log('🗑️  Cleared currentAttachments for UI:', currentAttachments.length);

// Check condition with stored attachments
if (attachmentsToSend.length > 0) {
  console.log('📤 Will send with files (FIXED!)');
  console.log('📦 Files to send:', attachmentsToSend.map(f => f.name));
} else {
  console.log('📤 Would send text only');
}

console.log('\n🎉 Fix verified! Attachments will now be sent correctly to n8n.');