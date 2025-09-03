/**
 * Copyright(c) Live2D Inc. All rights reserved.
 *
 * Use of this source code is governed by the Live2D Open Software license
 * that can be found at https://www.live2d.com/eula/live2d-open-software-license-agreement_en.html.
 */

import { LAppDelegate } from './lappdelegate';
import * as LAppDefine from './lappdefine';

// Configuration
const CONFIG = {
  WEBHOOK_URL: 'https://n8n.nextray.online/webhook/e1d52c48-5940-4120-b059-68c2b202aeef',
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  SUPPORTED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  SUPPORTED_AUDIO_TYPES: ['audio/mpeg', 'audio/wav', 'audio/ogg'],
  SUPPORTED_FILE_TYPES: ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
};

// Message types
type MessageType = 'text' | 'image' | 'file' | 'audio';

interface MessageData {
  id: string;
  timestamp: string;
  type: MessageType;
  content: string;
  userId: string;
  sender: 'user' | 'bot';
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  metadata?: any;
  originalMessageId?: string;
}

/**
 * ブラウザロード後の処理
 */
window.addEventListener(
  'load',
  (): void => {
    // Initialize WebGL and create the application instance
    if (!LAppDelegate.getInstance().initialize()) {
      return;
    }

    LAppDelegate.getInstance().run();

    // Initialize chat functionality
    initializeChat();
  },
  { passive: true }
);

/**
 * 終了時の処理
 */
window.addEventListener(
  'beforeunload',
  (): void => LAppDelegate.releaseInstance(),
  { passive: true }
);

/**
 * Initialize chat functionality
 */
function initializeChat(): void {
  const chatInput = document.getElementById('chat-input') as HTMLInputElement;
  const sendButton = document.getElementById('send-button') as HTMLButtonElement;
  const fileButton = document.getElementById('file-button') as HTMLButtonElement;
  const audioButton = document.getElementById('audio-button') as HTMLButtonElement;
  const fileInput = document.getElementById('file-input') as HTMLInputElement;
  const chatMessages = document.getElementById('chat-messages') as HTMLElement;

  if (!chatInput || !sendButton || !fileButton || !audioButton || !fileInput || !chatMessages) {
    console.error('Chat elements not found');
    return;
  }

  // Initialize WebSocket connection
  initializeWebSocket(chatMessages);

  // Initialize audio recording
  initializeAudioRecording(audioButton, chatMessages);

  // Send message on button click
  sendButton.addEventListener('click', () => {
    sendMessageWithAttachments(chatInput, chatMessages);
  });

  // Send message on Enter key
  chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      sendMessageWithAttachments(chatInput, chatMessages);
    }
  });

  // File upload button
  fileButton.addEventListener('click', () => {
    fileInput.click();
  });

  // File input change
  fileInput.addEventListener('change', (e) => {
    const target = e.target as HTMLInputElement;
    const files = Array.from(target.files || []);
    if (files.length > 0) {
      addAttachments(files);
      // Reset file input
      target.value = '';
    }
  });
}

/**
 * Initialize WebSocket connection to receive messages from webhook server
 */
function initializeWebSocket(chatMessages: HTMLElement): void {
  const wsUrl = `ws://localhost:3001`;
  let ws: WebSocket | null = null;

  function connectWebSocket() {
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('Connected to webhook server via WebSocket');
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('Received WebSocket message:', message);

        if (message.type === 'chat_response' && message.data) {
          handleIncomingMessage(message.data, chatMessages);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket connection closed. Reconnecting in 3 seconds...');
      setTimeout(connectWebSocket, 3000);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  // Initial connection
  connectWebSocket();
}

/**
 * Handle incoming message from webhook server
 */
function handleIncomingMessage(messageData: MessageData, chatMessages: HTMLElement): void {
  console.log('Handling incoming message:', messageData);

  // Hide typing indicator if present
  hideTypingIndicator();

  // Add the incoming message to chat
  addMessage(chatMessages, messageData.content, 'bot');

  // You can add additional logic here based on the message data
  // For example, trigger Live2D animations based on message content
  if (messageData.metadata && messageData.metadata.triggerAnimation) {
    // Trigger Live2D animation based on metadata
    console.log('Triggering Live2D animation:', messageData.metadata.triggerAnimation);
  }
}

/**
 * Send a message and handle response
 */
function sendMessage(input: HTMLInputElement, messagesContainer: HTMLElement): void {
  const message = input.value.trim();
  if (!message) return;

  // Generate message data
  const messageData: MessageData = {
    id: generateMessageId(),
    timestamp: new Date().toISOString(),
    type: 'text',
    content: message,
    userId: getUserId(),
    sender: 'user'
  };

  // Add user message
  addMessage(messagesContainer, message, 'user');

  // Clear input
  input.value = '';

  // Send to webhook
  sendToWebhook(messageData).then(success => {
    handleWebhookResponse(messageData.id, success);
  });

  // Show typing indicator
  showTypingIndicator(messagesContainer);

  // Simulate bot response (for now, just echo)
  // setTimeout(() => {
  //   hideTypingIndicator();

  //   const botResponse = `You said: "${message}". This is a placeholder response.`;
  //   const botMessageData: MessageData = {
  //     id: generateMessageId(),
  //     timestamp: new Date().toISOString(),
  //     type: 'text',
  //     content: botResponse,
  //     userId: getUserId(),
  //     sender: 'bot'
  //   };

  //   addMessage(messagesContainer, botResponse, 'bot');
  //   sendToWebhook(botMessageData).then(success => {
  //     handleWebhookResponse(botMessageData.id, success);
  //   });
  // }, 2000);
}

/**
 * Send file message (legacy function - now handled by sendMessageWithAttachments)
 */
function sendFileMessage(file: File, messagesContainer: HTMLElement): void {
  // Add to attachments and let sendMessageWithAttachments handle it
  addAttachments([file]);
}

/**
 * Add a message to the chat
 */
function addMessage(container: HTMLElement, text: string, type: 'user' | 'bot'): void {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${type}`;
  messageDiv.textContent = text;

  // Add timestamp
  const timestamp = document.createElement('div');
  timestamp.className = 'message-timestamp';
  timestamp.textContent = new Date().toLocaleTimeString();
  messageDiv.appendChild(timestamp);

  container.appendChild(messageDiv);

  // Scroll to bottom
  container.scrollTop = container.scrollHeight;
}

/**
 * Show typing indicator
 */
function showTypingIndicator(container: HTMLElement): void {
  const typingDiv = document.createElement('div');
  typingDiv.className = 'message bot typing';
  typingDiv.id = 'typing-indicator';
  typingDiv.innerHTML = '<div class="typing-dots"><span></span><span></span><span></span></div>';
  container.appendChild(typingDiv);
  container.scrollTop = container.scrollHeight;
}

/**
 * Hide typing indicator
 */
function hideTypingIndicator(): void {
  const typingDiv = document.getElementById('typing-indicator');
  if (typingDiv) {
    typingDiv.remove();
  }
}

/**
 * Add message status indicator
 */
function addMessageStatus(messageId: string, status: 'sending' | 'sent' | 'delivered' | 'error'): void {
  // This could be enhanced to show delivery status
  console.log(`Message ${messageId} status: ${status}`);
}

/**
 * Handle webhook response and update message status
 */
function handleWebhookResponse(messageId: string, success: boolean): void {
  const status = success ? 'sent' : 'error';
  addMessageStatus(messageId, status);
}

/**
 * Generate unique message ID
 */
function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get or create user ID
 */
function getUserId(): string {
  let userId = localStorage.getItem('chatbot_user_id');
  if (!userId) {
    userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('chatbot_user_id', userId);
  }
  return userId;
}

/**
 * Send message data to n8n webhook
 */
async function sendToWebhook(messageData: MessageData): Promise<boolean> {
  try {
    const response = await fetch(CONFIG.WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messageId: messageData.id,
        timestamp: messageData.timestamp,
        messageType: messageData.type,
        content: messageData.content,
        userId: messageData.userId,
        sender: messageData.sender,
        // File metadata
        fileName: messageData.fileName,
        fileSize: messageData.fileSize,
        fileType: messageData.fileType,
        // Additional metadata
        userAgent: navigator.userAgent,
        sessionId: getSessionId(),
        platform: 'web',
        language: navigator.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      })
    });

    if (!response.ok) {
      console.error('Webhook error:', response.status, response.statusText);
      return false;
    } else {
      console.log('Message sent to webhook successfully');
      return true;
    }
  } catch (error) {
    console.error('Failed to send webhook:', error);
    return false;
  }
}

/**
 * Send file message data to n8n webhook with base64 encoded file content
 */
async function sendToWebhookWithFile(messageData: MessageData, file: File): Promise<boolean> {
  try {
    // Convert file to base64
    const base64Data = await fileToBase64(file);

    // Create enhanced message data with file content
    const enhancedMessageData = {
      ...messageData,
      files: [{
        name: file.name,
        type: file.type,
        size: file.size,
        data: base64Data // Full base64 string including data URL prefix
      }],
      metadata: {
        ...messageData.metadata,
        fileCount: 1,
        totalSize: file.size,
        hasText: !!(messageData.content && messageData.content.trim())
      }
    };

    const response = await fetch(CONFIG.WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(enhancedMessageData)
    });

    if (!response.ok) {
      console.error('Webhook file error:', response.status, response.statusText);
      return false;
    } else {
      console.log('File message sent to webhook successfully');
      console.log('File included:', { name: file.name, type: file.type, size: file.size });
      return true;
    }
  } catch (error) {
    console.error('Failed to send file webhook:', error);
    return false;
  }
}

// Global variables for attachments and recording
let currentAttachments: File[] = [];
let mediaRecorder: MediaRecorder | null = null;
let audioChunks: Blob[] = [];

/**
 * Initialize audio recording functionality
 */
function initializeAudioRecording(audioButton: HTMLButtonElement, chatMessages: HTMLElement): void {
  audioButton.addEventListener('click', async () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      // Stop recording
      stopAudioRecording(audioButton, chatMessages);
    } else {
      // Start recording
      await startAudioRecording(audioButton);
    }
  });
}

/**
 * Start audio recording
 */
async function startAudioRecording(audioButton: HTMLButtonElement): Promise<void> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'audio/webm;codecs=opus'
    });

    audioChunks = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/ogg' });
      const audioFile = new File([audioBlob], `recording_${Date.now()}.ogg`, { type: 'audio/ogg' });
      addAttachments([audioFile]);

      // Stop all tracks
      stream.getTracks().forEach(track => track.stop());
    };

    mediaRecorder.start();
    audioButton.classList.add('recording');
    showRecordingIndicator();

    console.log('Audio recording started');
  } catch (error) {
    console.error('Error starting audio recording:', error);
    alert('Could not access microphone. Please check permissions.');
  }
}

/**
 * Stop audio recording
 */
function stopAudioRecording(audioButton: HTMLButtonElement, chatMessages: HTMLElement): void {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
    audioButton.classList.remove('recording');
    hideRecordingIndicator();
    console.log('Audio recording stopped');
  }
}

/**
 * Show recording indicator
 */
function showRecordingIndicator(): void {
  const indicator = document.getElementById('recording-indicator');
  if (indicator) {
    indicator.style.display = 'flex';
    indicator.addEventListener('click', () => {
      const audioButton = document.getElementById('audio-button') as HTMLButtonElement;
      if (audioButton) {
        stopAudioRecording(audioButton, document.getElementById('chat-messages') as HTMLElement);
      }
    });
  }
}

/**
 * Hide recording indicator
 */
function hideRecordingIndicator(): void {
  const indicator = document.getElementById('recording-indicator');
  if (indicator) {
    indicator.style.display = 'none';
  }
}

/**
 * Add attachments to preview
 */
function addAttachments(files: File[]): void {
  console.log('📎 addAttachments called with', files.length, 'files');
  console.log('📎 Files:', files.map(f => ({ name: f.name, type: f.type, size: f.size })));

  // Validate file sizes
  const oversizedFiles = files.filter(file => file.size > CONFIG.MAX_FILE_SIZE);
  if (oversizedFiles.length > 0) {
    console.log('❌ Oversized files:', oversizedFiles.map(f => f.name));
    alert(`Some files are too large. Maximum size is ${CONFIG.MAX_FILE_SIZE / (1024 * 1024)}MB`);
    return;
  }

  // Validate file types
  const unsupportedFiles = files.filter(file => {
    const isImage = CONFIG.SUPPORTED_IMAGE_TYPES.indexOf(file.type) !== -1;
    const isAudio = CONFIG.SUPPORTED_AUDIO_TYPES.indexOf(file.type) !== -1;
    const isDocument = CONFIG.SUPPORTED_FILE_TYPES.indexOf(file.type) !== -1;
    return !isImage && !isAudio && !isDocument;
  });

  if (unsupportedFiles.length > 0) {
    console.log('❌ Unsupported file types:', unsupportedFiles.map(f => ({ name: f.name, type: f.type })));
    alert('Some file types are not supported. Supported: images, audio files, and documents.');
    return;
  }

  console.log('✅ Adding files to currentAttachments');
  currentAttachments.push(...files);
  console.log('📊 currentAttachments now has', currentAttachments.length, 'files');

  updateAttachmentsPreview();
}

/**
 * Remove attachment
 */
function removeAttachment(index: number): void {
  currentAttachments.splice(index, 1);
  updateAttachmentsPreview();
}

/**
 * Update attachments preview
 */
function updateAttachmentsPreview(): void {
  const previewContainer = document.getElementById('attachments-preview');
  if (!previewContainer) return;

  if (currentAttachments.length === 0) {
    previewContainer.style.display = 'none';
    return;
  }

  previewContainer.style.display = 'flex';
  previewContainer.innerHTML = '';

  currentAttachments.forEach((file, index) => {
    const attachmentDiv = document.createElement('div');
    attachmentDiv.className = 'attachment-item';

    if (file.type.startsWith('image/')) {
      const img = document.createElement('img');
      img.src = URL.createObjectURL(file);
      img.onload = () => URL.revokeObjectURL(img.src);
      attachmentDiv.appendChild(img);
    } else if (file.type.startsWith('audio/')) {
      const audioIcon = document.createTextNode('🎵');
      attachmentDiv.appendChild(audioIcon);
    } else {
      const fileIcon = document.createTextNode('📄');
      attachmentDiv.appendChild(fileIcon);
    }

    const fileName = document.createElement('span');
    fileName.textContent = file.name.length > 20 ? file.name.substring(0, 17) + '...' : file.name;
    attachmentDiv.appendChild(fileName);

    const removeBtn = document.createElement('span');
    removeBtn.className = 'remove-attachment';
    removeBtn.textContent = '×';
    removeBtn.onclick = () => removeAttachment(index);
    attachmentDiv.appendChild(removeBtn);

    previewContainer.appendChild(attachmentDiv);
  });
}

/**
 * Send message with attachments
 */
function sendMessageWithAttachments(input: HTMLInputElement, messagesContainer: HTMLElement): void {
  const message = input.value.trim();

  console.log('📝 sendMessageWithAttachments called');
  console.log('💬 Message:', message || '(empty)');
  console.log('📎 Attachments count:', currentAttachments.length);
  console.log('📎 Attachments:', currentAttachments.map(f => f.name));

  // Must have either text or attachments
  if (!message && currentAttachments.length === 0) {
    console.log('❌ No message or attachments, returning');
    return;
  }

  // Generate message data
  const messageData: MessageData = {
    id: generateMessageId(),
    timestamp: new Date().toISOString(),
    type: 'text',
    content: message,
    userId: getUserId(),
    sender: 'user',
    metadata: {
      attachments: currentAttachments.map(file => ({
        name: file.name,
        type: file.type,
        size: file.size
      }))
    }
  };

  // Add user message
  let displayText = message;
  if (currentAttachments.length > 0) {
    const attachmentText = currentAttachments.length === 1
      ? `[${currentAttachments[0].name}]`
      : `[${currentAttachments.length} files]`;
    displayText = displayText ? `${displayText} ${attachmentText}` : attachmentText;
  }

  addMessage(messagesContainer, displayText, 'user');

  // Store attachments for processing
  const attachmentsToSend = [...currentAttachments];

  // Clear input and attachments immediately for UI
  input.value = '';
  currentAttachments = [];
  updateAttachmentsPreview();

  // Send to webhook
  if (attachmentsToSend.length > 0) {
    console.log('Sending mixed content with', attachmentsToSend.length, 'files');
    // Send with files (base64 encoded)
    sendMultipleFilesWithMessage(messageData, attachmentsToSend, messagesContainer);
  } else {
    console.log('Sending text only message');
    // Send text only
    sendToWebhook(messageData).then(success => {
      handleWebhookResponse(messageData.id, success);
    });
  }

  // Show typing indicator
  showTypingIndicator(messagesContainer);
}

/**
 * Convert file to base64 string
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
}

/**
 * Send multiple files with message (base64 encoded)
 */
async function sendMultipleFilesWithMessage(messageData: MessageData, files: File[], messagesContainer: HTMLElement): Promise<void> {
  console.log('🔄 sendMultipleFilesWithMessage called with', files.length, 'files');
  console.log('📁 Files:', files.map(f => ({ name: f.name, type: f.type, size: f.size })));

  try {
    // Convert all files to base64
    console.log('🔄 Converting files to base64...');
    const filePromises = files.map(async (file) => {
      console.log('📄 Converting file:', file.name);
      const base64 = await fileToBase64(file);
      console.log('✅ File converted:', file.name, 'Base64 length:', base64.length);
      return {
        name: file.name,
        type: file.type,
        size: file.size,
        data: base64 // Full base64 string including data URL prefix
      };
    });

    const fileData = await Promise.all(filePromises);
    console.log('✅ All files converted to base64');

    // Create enhanced message data with file content
    const enhancedMessageData = {
      ...messageData,
      messageType: 'mixed',
      files: fileData,
      metadata: {
        ...messageData.metadata,
        fileCount: files.length,
        totalSize: files.reduce((sum, file) => sum + file.size, 0),
        hasText: !!(messageData.content && messageData.content.trim())
      }
    };

    console.log('📤 Sending to webhook:', CONFIG.WEBHOOK_URL);
    console.log('📦 Payload size:', JSON.stringify(enhancedMessageData).length, 'characters');
    console.log('📦 Message type:', enhancedMessageData.messageType);
    console.log('📦 File count:', enhancedMessageData.files.length);

    const response = await fetch(CONFIG.WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(enhancedMessageData)
    });

    if (!response.ok) {
      console.error('❌ Webhook mixed content error:', response.status, response.statusText);
      handleWebhookResponse(messageData.id, false);
    } else {
      console.log('✅ Mixed content message sent to webhook successfully');
      console.log('📊 Response status:', response.status);
      handleWebhookResponse(messageData.id, true);
    }
  } catch (error) {
    console.error('❌ Failed to send mixed content webhook:', error);
    handleWebhookResponse(messageData.id, false);
  }
}

/**
 * Get or create session ID
 */
function getSessionId(): string {
  let sessionId = sessionStorage.getItem('chatbot_session_id');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('chatbot_session_id', sessionId);
  }
  return sessionId;
}
