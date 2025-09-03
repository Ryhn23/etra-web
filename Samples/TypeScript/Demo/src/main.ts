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
  WEBHOOK_URL: 'https://n8n.nextray.online/webhook/e1d52c48-5940-4120-b059-68c2b202aeef', // Replace with your n8n webhook URL
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
  const fileInput = document.getElementById('file-input') as HTMLInputElement;
  const chatMessages = document.getElementById('chat-messages') as HTMLElement;

  if (!chatInput || !sendButton || !fileButton || !fileInput || !chatMessages) {
    console.error('Chat elements not found');
    return;
  }

  // Initialize WebSocket connection
  initializeWebSocket(chatMessages);

  // Send message on button click
  sendButton.addEventListener('click', () => {
    sendMessage(chatInput, chatMessages);
  });

  // Send message on Enter key
  chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      sendMessage(chatInput, chatMessages);
    }
  });

  // File upload button
  fileButton.addEventListener('click', () => {
    fileInput.click();
  });

  // File input change
  fileInput.addEventListener('change', (e) => {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) {
      sendFileMessage(file, chatMessages);
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
 * Send file message
 */
function sendFileMessage(file: File, messagesContainer: HTMLElement): void {
  if (file.size > CONFIG.MAX_FILE_SIZE) {
    alert(`File size too large. Maximum size is ${CONFIG.MAX_FILE_SIZE / (1024 * 1024)}MB`);
    return;
  }

  let messageType: MessageType = 'file';
  if (CONFIG.SUPPORTED_IMAGE_TYPES.indexOf(file.type) !== -1) {
    messageType = 'image';
  } else if (CONFIG.SUPPORTED_AUDIO_TYPES.indexOf(file.type) !== -1) {
    messageType = 'audio';
  }

  // Generate message data
  const messageData: MessageData = {
    id: generateMessageId(),
    timestamp: new Date().toISOString(),
    type: messageType,
    content: `[${messageType.toUpperCase()}] ${file.name}`,
    userId: getUserId(),
    sender: 'user',
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type
  };

  // Add user message
  addMessage(messagesContainer, `[${messageType.toUpperCase()}] ${file.name}`, 'user');

  // Send to webhook with file data
  sendToWebhookWithFile(messageData, file).then(success => {
    handleWebhookResponse(messageData.id, success);
  });
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
 * Send file message data to n8n webhook with file content
 */
async function sendToWebhookWithFile(messageData: MessageData, file: File): Promise<boolean> {
  try {
    const formData = new FormData();
    formData.append('messageId', messageData.id);
    formData.append('timestamp', messageData.timestamp);
    formData.append('messageType', messageData.type);
    formData.append('content', messageData.content);
    formData.append('userId', messageData.userId);
    formData.append('sender', messageData.sender);
    formData.append('file', file);
    formData.append('fileName', messageData.fileName || '');
    formData.append('fileSize', (messageData.fileSize || 0).toString());
    formData.append('fileType', messageData.fileType || '');
    formData.append('userAgent', navigator.userAgent);
    formData.append('sessionId', getSessionId());
    formData.append('platform', 'web');
    formData.append('language', navigator.language);
    formData.append('timezone', Intl.DateTimeFormat().resolvedOptions().timeZone);

    const response = await fetch(CONFIG.WEBHOOK_URL, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      console.error('Webhook file error:', response.status, response.statusText);
      return false;
    } else {
      console.log('File message sent to webhook successfully');
      return true;
    }
  } catch (error) {
    console.error('Failed to send file webhook:', error);
    return false;
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
