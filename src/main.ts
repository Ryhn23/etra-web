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
  MAX_FILE_SIZE: 100 * 1024 * 1024, // 10MB
  SUPPORTED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  SUPPORTED_AUDIO_TYPES: ['audio/mpeg', 'audio/wav', 'audio/ogg'],
  SUPPORTED_FILE_TYPES: ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
};

// Message types
type MessageType = 'text' | 'image' | 'file' | 'audio' | 'command';

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
  files?: Array<{
    name: string;
    type: string;
    size: number;
    data: string;
  }>;
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
  
    // Initialize Live2D settings
    initializeLive2DSettings();
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
  const toolsButton = document.getElementById('tools-button') as HTMLButtonElement;
  const attachmentBtn = document.getElementById('attachment-btn') as HTMLButtonElement;
  const audioBtn = document.getElementById('audio-btn') as HTMLButtonElement;
  const fileInput = document.getElementById('file-input') as HTMLInputElement;
  const chatMessages = document.getElementById('chat-messages') as HTMLElement;

  if (!chatInput || !sendButton || !toolsButton || !attachmentBtn || !audioBtn || !fileInput || !chatMessages) {
    console.error('Chat elements not found:', {
      chatInput: !!chatInput,
      sendButton: !!sendButton,
      toolsButton: !!toolsButton,
      attachmentBtn: !!attachmentBtn,
      audioBtn: !!audioBtn,
      fileInput: !!fileInput,
      chatMessages: !!chatMessages
    });
    return;
  }

  // Initialize WebSocket connection
  initializeWebSocket(chatMessages);


  // Send message on button click (only when not in recording mode)
  sendButton.addEventListener('click', () => {
    const recordingDisplay = document.getElementById('recording-display') as HTMLElement;
    if (recordingDisplay && recordingDisplay.style.display !== 'none') {
      // If recording display is visible, don't send regular message
      return;
    }
    sendMessageWithAttachments(chatInput, chatMessages);
  });

  // Send message on Enter key (only when not in recording mode)
  chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const recordingDisplay = document.getElementById('recording-display') as HTMLElement;
      if (recordingDisplay && recordingDisplay.style.display !== 'none') {
        // If recording display is visible, don't send regular message
        return;
      }
      sendMessageWithAttachments(chatInput, chatMessages);
    }
  });

  // Tools menu functionality
  const toolsMenu = document.getElementById('tools-menu') as HTMLElement;
  const activeToolIndicator = document.getElementById('active-tool-indicator') as HTMLElement;
  const activeToolText = document.getElementById('active-tool-text') as HTMLElement;
  const clearToolBtn = document.getElementById('clear-tool-btn') as HTMLButtonElement;

  // Tools button click - show/hide menu
  if (toolsButton && toolsMenu) {
    toolsButton.addEventListener('click', (e) => {
      e.stopPropagation();
      const isVisible = toolsMenu.style.display === 'block';
      toolsMenu.style.display = isVisible ? 'none' : 'block';
    });
  }

  // Close tools menu when clicking outside
  document.addEventListener('click', (e) => {
    if (toolsMenu && !toolsButton?.contains(e.target as Node) && !toolsMenu.contains(e.target as Node)) {
      toolsMenu.style.display = 'none';
    }
  });

  // Tool options click handlers
  const toolOptions = document.querySelectorAll('.tool-option');
  toolOptions.forEach(option => {
    option.addEventListener('click', (e) => {
      e.stopPropagation();
      const command = (option as HTMLElement).dataset.command;

      if (command) {
        console.log('🛠️ Tool option clicked:', command);
        // Check if edit-image requires image attachment
        if (command === 'edit-image' && !hasImageAttachment()) {
          alert('Please attach an image first to use the Edit Image tool.');
          toolsMenu.style.display = 'none';
          return;
        }

        // Activate the selected tool
        activateTool(command, getToolDisplayName(command));
        toolsMenu.style.display = 'none';
      }
    });
  });

  // Clear tool button
  if (clearToolBtn) {
    clearToolBtn.addEventListener('click', () => {
      deactivateTool();
    });
  }

  // File upload button
  if (attachmentBtn) {
    attachmentBtn.addEventListener('click', () => {
      fileInput.click();
    });
  }

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

  // Audio recording button
  audioBtn.addEventListener('click', async () => {
    if (isRecording) {
      // Stop recording
      await stopAudioRecording(audioBtn, document.getElementById('chat-messages') as HTMLElement);
    } else {
      // Start recording
      await startAudioRecording(audioBtn);
    }
  });
}

/**
 * Initialize WebSocket connection to receive messages from webhook server
 */
function initializeWebSocket(chatMessages: HTMLElement): void {
  const wsUrl = `ws://localhost:3002`;
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

  // Extract base64 files from message data
  const base64Files: Array<{data: string, type: string, name: string}> = [];
  if (messageData.files && messageData.files.length > 0) {
    messageData.files.forEach(file => {
      console.log('Processing base64 file:', {
        name: file.name,
        type: file.type,
        dataLength: file.data ? file.data.length : 0
      });
      
      // Use base64 data directly (already includes data URL prefix)
      base64Files.push({
        data: file.data,
        type: file.type,
        name: file.name
      });
    });
  }

  // Add the incoming message to chat with base64 files
  addMessage(chatMessages, messageData.content, 'bot', undefined, base64Files);

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
    sender: 'user',
    metadata: {
      activeTool: activeTool,
      toolCommand: activeTool
    }
  };

  // Add user message
  addMessage(messagesContainer, message, 'user');

  // Clear input
  input.value = '';

  // Send to webhook
  sendToWebhook(messageData).then(success => {
    handleWebhookResponse(messageData.id, success);

    // Clear active tool after successful send
    if (activeTool) {
      deactivateTool();
    }
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
 * Initialize Live2D settings functionality
 */
function initializeLive2DSettings(): void {
  const settingsBtn = document.getElementById('live2d-settings-btn') as HTMLButtonElement;
  const settingsPopup = document.getElementById('live2d-settings-popup') as HTMLElement;
  const closeBtn = document.getElementById('close-settings-btn') as HTMLButtonElement;
  const resetBtn = document.getElementById('reset-settings-btn') as HTMLButtonElement;
  const applyBtn = document.getElementById('apply-settings-btn') as HTMLButtonElement;

  // Sliders and value displays
  const positionXSlider = document.getElementById('position-x-slider') as HTMLInputElement;
  const positionYSlider = document.getElementById('position-y-slider') as HTMLInputElement;
  const scaleSlider = document.getElementById('scale-slider') as HTMLInputElement;
  const positionXValue = document.getElementById('position-x-value') as HTMLElement;
  const positionYValue = document.getElementById('position-y-value') as HTMLElement;
  const scaleValue = document.getElementById('scale-value') as HTMLElement;

  if (!settingsBtn || !settingsPopup || !closeBtn || !resetBtn || !applyBtn ||
      !positionXSlider || !positionYSlider || !scaleSlider) {
    console.error('Live2D settings elements not found');
    return;
  }

  // Settings button click - show/hide popup
  settingsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isVisible = settingsPopup.style.display === 'block';
    settingsPopup.style.display = isVisible ? 'none' : 'block';
  });

  // Close button click
  closeBtn.addEventListener('click', () => {
    settingsPopup.style.display = 'none';
  });

  // Close popup when clicking outside
  document.addEventListener('click', (e) => {
    if (!settingsBtn.contains(e.target as Node) && !settingsPopup.contains(e.target as Node)) {
      settingsPopup.style.display = 'none';
    }
  });

  // Update value displays when sliders change
  positionXSlider.addEventListener('input', () => {
    positionXValue.textContent = parseFloat(positionXSlider.value).toFixed(2);
  });

  positionYSlider.addEventListener('input', () => {
    positionYValue.textContent = parseFloat(positionYSlider.value).toFixed(2);
  });

  scaleSlider.addEventListener('input', () => {
    scaleValue.textContent = parseFloat(scaleSlider.value).toFixed(2);
  });

  // Reset button - restore default values
  resetBtn.addEventListener('click', () => {
    positionXSlider.value = '0';
    positionYSlider.value = '-0.68';
    scaleSlider.value = '3.34';
    positionXValue.textContent = '0.00';
    positionYValue.textContent = '-0.68';
    scaleValue.textContent = '3.34';
  });

  // Apply button - update Live2D model
  applyBtn.addEventListener('click', () => {
    const posX = parseFloat(positionXSlider.value);
    const posY = parseFloat(positionYSlider.value);
    const scale = parseFloat(scaleSlider.value);

    updateLive2DModel(posX, posY, scale);
    settingsPopup.style.display = 'none';
  });

  // Auto-apply default settings when model loads
  setTimeout(() => {
    const defaultPosX = parseFloat(positionXSlider.value);
    const defaultPosY = parseFloat(positionYSlider.value);
    const defaultScale = parseFloat(scaleSlider.value);

    updateLive2DModel(defaultPosX, defaultPosY, defaultScale);
    console.log('Auto-applied default Live2D settings');
  }, 2000); // Wait 2 seconds for model to load
}

/**
 * Update Live2D model position and scale
 */
function updateLive2DModel(posX: number, posY: number, scale: number): void {
  // Get the subdelegate from LAppDelegate
  const delegate = LAppDelegate.getInstance();
  if (!delegate) return;

  // Access the first subdelegate (assuming single canvas setup)
  const subdelegates = (delegate as any)._subdelegates;
  if (!subdelegates || subdelegates.getSize() === 0) return;

  const subdelegate = subdelegates.at(0);
  if (!subdelegate) return;

  // Get the Live2D manager from subdelegate
  const live2DManager = subdelegate.getLive2DManager();
  if (!live2DManager) return;

  // Get the current model
  const models = (live2DManager as any)._models;
  if (!models || models.getSize() === 0) return;

  const model = models.at(0);
  if (!model) return;

  // Update model matrix with new position and scale
  const modelMatrix = model.getModelMatrix();
  if (modelMatrix) {
    // Reset matrix and apply new transformations
    modelMatrix.loadIdentity();
    modelMatrix.scale(scale, scale);
    modelMatrix.translate(posX, posY);

    console.log(`Live2D Model updated: Position(${posX.toFixed(2)}, ${posY.toFixed(2)}), Scale(${scale.toFixed(2)})`);
  }
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
function addMessage(container: HTMLElement, text: string, type: 'user' | 'bot' | 'command', attachments?: File[], base64Files?: Array<{data: string, type: string, name: string}>): void {

  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${type}`;

  // Add text content if provided
  if (text && text.trim()) {
    const textDiv = document.createElement('div');
    textDiv.className = 'message-text';
    textDiv.textContent = text;
    messageDiv.appendChild(textDiv);
  }

  // Add image attachments if any (from user uploads)
  if (attachments && attachments.length > 0) {
    const imagesContainer = document.createElement('div');
    imagesContainer.className = 'message-images';

    attachments.forEach((file, index) => {
      if (file.type.startsWith('image/')) {
        const imageWrapper = document.createElement('div');
        imageWrapper.className = 'message-image-wrapper';

        const img = document.createElement('img');
        img.src = URL.createObjectURL(file);
        img.alt = file.name;
        img.className = 'message-image';
        img.onload = () => URL.revokeObjectURL(img.src);

        const sizeText = document.createElement('div');
        sizeText.className = 'message-image-size';
        sizeText.textContent = formatFileSize(file.size);

        imageWrapper.appendChild(img);
        imageWrapper.appendChild(sizeText);
        imagesContainer.appendChild(imageWrapper);
      }
    });

    if (imagesContainer.children.length > 0) {
      messageDiv.appendChild(imagesContainer);
    }
  }

  // Add base64 files if any (from bot responses)
  if (base64Files && base64Files.length > 0) {
    const filesContainer = document.createElement('div');
    filesContainer.className = 'message-files';

    base64Files.forEach((fileData, index) => {
      const fileWrapper = document.createElement('div');
      fileWrapper.className = 'message-file-wrapper';

      if (fileData.type.startsWith('image/')) {
        // Handle images
        const img = document.createElement('img');
        img.src = fileData.data;
        img.alt = fileData.name || `Image ${index + 1}`;
        img.className = 'message-image';
        img.onload = () => console.log('✅ Image loaded successfully');
        img.onerror = () => console.error('❌ Failed to load image from base64');

        const sizeText = document.createElement('div');
        sizeText.className = 'message-file-size';
        sizeText.textContent = fileData.name || 'Image';

        fileWrapper.appendChild(img);
        fileWrapper.appendChild(sizeText);
        filesContainer.appendChild(fileWrapper);
      } else if (fileData.type.startsWith('audio/')) {
        // Handle audio files
        const audio = document.createElement('audio');
        audio.src = fileData.data;
        audio.controls = true;
        audio.className = 'message-audio';
        audio.onerror = () => console.error('❌ Failed to load audio from base64');

        const fileName = document.createElement('div');
        fileName.className = 'message-file-name';
        fileName.textContent = fileData.name || 'Audio';

        fileWrapper.appendChild(audio);
        fileWrapper.appendChild(fileName);
        filesContainer.appendChild(fileWrapper);
      } else {
        // Handle other file types (PDF, documents, etc.)
        const fileIcon = document.createElement('div');
        fileIcon.className = 'message-file-icon';
        fileIcon.innerHTML = '📄';

        const fileName = document.createElement('div');
        fileName.className = 'message-file-name';
        fileName.textContent = fileData.name || `File ${index + 1}`;

        const downloadBtn = document.createElement('a');
        downloadBtn.href = fileData.data;
        downloadBtn.download = fileData.name || `file_${index + 1}`;
        downloadBtn.className = 'message-file-download';
        downloadBtn.textContent = 'Download';
        downloadBtn.onclick = (e) => e.stopPropagation();

        fileWrapper.appendChild(fileIcon);
        fileWrapper.appendChild(fileName);
        fileWrapper.appendChild(downloadBtn);
        filesContainer.appendChild(fileWrapper);
      }
    });

    if (filesContainer.children.length > 0) {
      messageDiv.appendChild(filesContainer);
    }
  }

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
 * Show recording display and hide chat input
 */
function showRecordingDisplay(): void {
  const chatInputContainer = document.getElementById('chat-input-container') as HTMLElement;
  const recordingDisplay = document.getElementById('recording-display') as HTMLElement;

  if (chatInputContainer && recordingDisplay) {
    // Hide chat input
    chatInputContainer.style.display = 'none';

    // Show recording display
    recordingDisplay.style.display = 'flex';

    // Setup event listeners for recording actions
    setupRecordingActions();
  }
}

/**
 * Start recording timer that updates every 100ms
 */
function startRecordingTimer(): void {
  const timerElement = document.getElementById('recording-timer') as HTMLElement;

  if (!timerElement) return;

  // Clear any existing timer
  if (recordingTimerInterval) {
    clearInterval(recordingTimerInterval);
  }

  // Update timer immediately
  updateRecordingTimer();

  // Set up interval to update timer every 100ms
  recordingTimerInterval = setInterval(updateRecordingTimer, 100);
}

/**
 * Update recording timer display
 */
function updateRecordingTimer(): void {
  const timerElement = document.getElementById('recording-timer') as HTMLElement;

  if (!timerElement || recordingStartTime === 0) return;

  const elapsed = Date.now() - recordingStartTime;
  const seconds = Math.floor(elapsed / 1000);
  const centiseconds = Math.floor((elapsed % 1000) / 10);

  // Format as MM:SS.CC
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  // Pad with zeros manually for compatibility
  const padZero = (num: number): string => (num < 10 ? '0' + num : num.toString());

  const formattedTime = `${padZero(minutes)}:${padZero(remainingSeconds)}.${padZero(centiseconds)}`;
  timerElement.textContent = formattedTime;
}

/**
 * Stop recording timer
 */
function stopRecordingTimer(): void {
  if (recordingTimerInterval) {
    clearInterval(recordingTimerInterval);
    recordingTimerInterval = null;
  }
  recordingStartTime = 0;
}

/**
 * Hide recording display and show chat input
 */
function hideRecordingDisplay(): void {
  const chatInputContainer = document.getElementById('chat-input-container') as HTMLElement;
  const recordingDisplay = document.getElementById('recording-display') as HTMLElement;
  const recordingCompleteDisplay = document.getElementById('recording-complete-display') as HTMLElement;
  const chatInput = document.getElementById('chat-input') as HTMLInputElement;

  if (chatInputContainer && chatInput) {
    // Show chat input
    chatInputContainer.style.display = 'flex';

    // Hide both recording displays
    if (recordingDisplay) {
      recordingDisplay.style.display = 'none';
    }
    if (recordingCompleteDisplay) {
      recordingCompleteDisplay.style.display = 'none';
    }

    // Reset chat input
    chatInput.value = '';
    chatInput.disabled = false;
    chatInput.placeholder = 'Type your message...';

    // Clear recorded audio
    recordedAudio = null;

    console.log('Recording displays hidden, chat input restored');
  }
}

/**
 * Show recording complete display with filename
 */
function showRecordingCompleteDisplay(filename: string): void {
  const recordingDisplay = document.getElementById('recording-display') as HTMLElement;
  const recordingCompleteDisplay = document.getElementById('recording-complete-display') as HTMLElement;
  const recordingCompleteFilename = document.getElementById('recording-complete-filename') as HTMLElement;

  if (recordingDisplay && recordingCompleteDisplay && recordingCompleteFilename) {
    // Hide recording display
    recordingDisplay.style.display = 'none';

    // Show recording complete display with filename
    recordingCompleteFilename.textContent = filename;
    recordingCompleteDisplay.style.display = 'flex';

    // Setup event listeners for recording complete actions
    setupRecordingCompleteActions();
  }
}

/**
 * Setup event listeners for recording actions
 */
function setupRecordingActions(): void {
  const stopBtn = document.getElementById('stop-recording') as HTMLButtonElement;

  // Remove existing event listeners to avoid duplicates
  if (stopBtn) {
    stopBtn.onclick = null;
    stopBtn.addEventListener('click', () => {
      const audioBtn = document.getElementById('audio-btn') as HTMLButtonElement;
      const chatMessages = document.getElementById('chat-messages') as HTMLElement;
      if (audioBtn && chatMessages) {
        stopAudioRecording(audioBtn, chatMessages);
      }
    });
  }
}

/**
 * Setup event listeners for recording complete actions
 */
function setupRecordingCompleteActions(): void {
  const cancelBtn = document.getElementById('cancel-recording') as HTMLButtonElement;
  const sendBtn = document.getElementById('send-recording') as HTMLButtonElement;

  // Remove existing event listeners to avoid duplicates
  if (cancelBtn) {
    cancelBtn.onclick = null;
    cancelBtn.addEventListener('click', () => {
      hideRecordingDisplay();
    });
  }

  if (sendBtn) {
    sendBtn.onclick = null;
    sendBtn.addEventListener('click', () => {
      sendRecording();
    });
  }
}

/**
 * Send the recorded audio
 */
function sendRecording(): void {
  console.log('sendRecording called');
  console.log('recordedAudio exists:', !!recordedAudio);

  if (!recordedAudio) {
    console.error('No recorded audio to send');
    return;
  }

  console.log('Recorded audio details:', {
    name: recordedAudio.name,
    size: recordedAudio.size,
    type: recordedAudio.type
  });

  const messagesContainer = document.getElementById('chat-messages') as HTMLElement;

  // Add recorded audio to attachments
  currentAttachments.push(recordedAudio);

  // Generate message data for audio-only message
  const messageData: MessageData = {
    id: generateMessageId(),
    timestamp: new Date().toISOString(),
    type: 'audio',
    content: '',
    userId: getUserId(),
    sender: 'user',
    metadata: {
      attachments: [{
        name: recordedAudio.name,
        type: recordedAudio.type,
        size: recordedAudio.size
      }],
      activeTool: activeTool,
      toolCommand: activeTool,
      commandId: activeTool,
      isAudioMessage: true
    }
  };

  // Display the audio message
  addMessage(messagesContainer, `[${recordedAudio.name}]`, 'user', [recordedAudio]);

  // Store the recorded audio before clearing
  const audioToSend = recordedAudio;

  // Clear attachments and recorded audio
  currentAttachments = [];
  recordedAudio = null;

  // Send to webhook with file data
  console.log('🎤 Sending recording to webhook...');
  console.log('📊 MessageData:', messageData);
  console.log('🎵 Audio file details:', audioToSend ? {
    name: audioToSend.name,
    size: audioToSend.size,
    type: audioToSend.type
  } : 'NULL');

  if (audioToSend) {
    console.log('✅ Audio file exists, sending to webhook...');
    sendToWebhookWithFile(messageData, audioToSend).then(success => {
      console.log('🎤 Webhook response for recording:', success);
      handleWebhookResponse(messageData.id, success);
    });
  } else {
    console.error('❌ No audio file to send to webhook - recordedAudio was null!');
    handleWebhookResponse(messageData.id, false);
  }

  // Show typing indicator
  showTypingIndicator(messagesContainer);

  // Hide recording display and restore chat input immediately
  setTimeout(() => {
    hideRecordingDisplay();
    console.log('Recording display hidden after sending');
  }, 100);
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
 * Check if there are image attachments
 */
function hasImageAttachment(): boolean {
  return currentAttachments.some(file => file.type.startsWith('image/'));
}

/**
 * Get display name for a tool command
 */
function getToolDisplayName(command: string): string {
  const toolNames: { [key: string]: string } = {
    'generate-image': '<i class="fas fa-palette"></i> Generate Image',
    'generate-audio': '<i class="fas fa-music"></i> Generate Audio',
    'edit-image': '<i class="fas fa-edit"></i> Edit Image'
  };
  return toolNames[command] || command;
}

/**
 * Activate a tool
 */
function activateTool(toolCommand: string, displayText: string): void {
  activeTool = toolCommand;
  const toolsButton = document.getElementById('tools-button') as HTMLButtonElement;
  const activeToolIndicator = document.getElementById('active-tool-indicator') as HTMLElement;
  const activeToolText = document.getElementById('active-tool-text') as HTMLElement;

  if (toolsButton) {
    toolsButton.classList.add('active');
  }

  if (activeToolIndicator && activeToolText) {
    activeToolText.innerHTML = displayText;
    activeToolIndicator.style.display = 'flex';
  }

  console.log('🎯 Tool activated:', toolCommand);
  console.log('🔧 activeTool set to:', activeTool);
  console.log('📋 Display text:', displayText);
  console.log('🔍 DEBUG: activeTool stored as:', activeTool);
}

/**
 * Deactivate current tool
 */
function deactivateTool(): void {
  activeTool = null;
  const toolsButton = document.getElementById('tools-button') as HTMLButtonElement;
  const activeToolIndicator = document.getElementById('active-tool-indicator') as HTMLElement;

  if (toolsButton) {
    toolsButton.classList.remove('active');
  }

  if (activeToolIndicator) {
    activeToolIndicator.style.display = 'none';
  }

  console.log('🎯 Tool deactivated');
}

/**
 * Execute special command
 */
function executeCommand(command: string): void {
  console.log('🎯 Executing command:', command);

  // Validate command requirements
  if (command === 'edit-image' && currentAttachments.length === 0) {
    alert('Please attach an image first to use the edit image command.');
    return;
  }

  if (command === 'edit-image' && !currentAttachments.some(file => file.type.startsWith('image/'))) {
    alert('Please attach an image file to use the edit image command.');
    return;
  }

  // Create command message
  const commandMessage: MessageData = {
    id: generateMessageId(),
    timestamp: new Date().toISOString(),
    type: 'command',
    content: `/${command}`,
    userId: getUserId(),
    sender: 'user',
    metadata: {
      commandId: command,
      attachments: currentAttachments.map(file => ({
        name: file.name,
        type: file.type,
        size: file.size
      }))
    }
  };

  // Add command message to chat
  addMessage(document.getElementById('chat-messages') as HTMLElement, `/${command}`, 'user');

  // Clear attachments after command
  currentAttachments = [];
  updateAttachmentsPreview();

  // Send command to webhook
  sendCommandToWebhook(commandMessage).then(success => {
    handleWebhookResponse(commandMessage.id, success);
  });

  // Show typing indicator
  showTypingIndicator(document.getElementById('chat-messages') as HTMLElement);
}

/**
 * Send command data to n8n webhook
 */
async function sendCommandToWebhook(messageData: MessageData): Promise<boolean> {
  try {
    const commandId = messageData.metadata?.commandId || activeTool || 'unknown';
    console.log('🔧 sendCommandToWebhook called with commandId:', commandId);
    console.log('📦 messageData.metadata:', messageData.metadata);
    console.log('🎯 activeTool:', activeTool);
    console.log('🔍 Full messageData:', messageData);
    console.log('🔍 DEBUG: Extracted commandId:', commandId);
    console.log('🔍 DEBUG: messageData.metadata?.commandId:', messageData.metadata?.commandId);
    
    // Use the simplified payload structure that works with n8n (based on debug tests)
    const payload = {
      messageId: messageData.id,
      timestamp: messageData.timestamp,
      messageType: 'text', // Always use 'text' as messageType for command compatibility
      content: messageData.content,
      userId: messageData.userId,
      sender: messageData.sender,
      metadata: {
        ...messageData.metadata, // Include all original metadata
        commandId: commandId,     // Ensure commandId is present in metadata
        // Additional context for n8n
        userAgent: navigator.userAgent,
        sessionId: getSessionId(),
        platform: 'web',
        language: navigator.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        hasImageAttachment: hasImageAttachment(),
        attachmentCount: currentAttachments.length
      }
    };

    console.log('📤 Simplified payload being sent:', payload);
    console.log('🔍 DEBUG: commandId in payload.metadata:', payload.metadata.commandId);
    console.log('🔍 DEBUG: Full payload metadata:', payload.metadata);

    const response = await fetch(CONFIG.WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      console.error('Command webhook error:', response.status, response.statusText);
      return false;
    } else {
      console.log('Command sent to webhook successfully:', commandId);
      return true;
    }
  } catch (error) {
    console.error('Failed to send command webhook:', error);
    return false;
  }
}

/**
 * Send message data to n8n webhook
 */
async function sendToWebhook(messageData: MessageData): Promise<boolean> {
  console.log('sendToWebhook called with messageData:', messageData);

  try {
    const payload = {
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
    };

    console.log('Sending payload to webhook:', CONFIG.WEBHOOK_URL, payload);

    const response = await fetch(CONFIG.WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    console.log('Webhook response status:', response.status);

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
    console.log('🎵 Converting audio file to base64...');
    console.log('📁 File details:', { name: file.name, type: file.type, size: file.size });

    // Convert file to base64
    const base64Data = await fileToBase64(file);
    console.log('✅ Audio file converted to base64, length:', base64Data.length);

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

    console.log('📤 Sending audio to n8n webhook...');
    console.log('🎯 Webhook URL:', CONFIG.WEBHOOK_URL);
    console.log('📦 Payload size:', JSON.stringify(enhancedMessageData).length, 'characters');

    const response = await fetch(CONFIG.WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(enhancedMessageData)
    });

    console.log('📡 Webhook response status:', response.status);

    if (!response.ok) {
      console.error('❌ Webhook file error:', response.status, response.statusText);
      return false;
    } else {
      console.log('✅ Audio file sent to webhook successfully!');
      console.log('🎵 Audio file details sent:', { name: file.name, type: file.type, size: file.size });
      return true;
    }
  } catch (error) {
    console.error('❌ Failed to send audio webhook:', error);
    return false;
  }
}

// Global variables for attachments, recording, and active tool
let currentAttachments: File[] = [];
let mediaRecorder: MediaRecorder | null = null;
let audioChunks: Blob[] = [];
let activeTool: string | null = null;
let isRecording: boolean = false;
let recordedAudio: File | null = null;
let recordingStartTime: number = 0;
let recordingTimerInterval: number | null = null;

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
    console.log('Requesting microphone access...');
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    console.log('Microphone access granted');

    // Force OGG format as requested
    let mimeType = 'audio/ogg';
    if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
      mimeType = 'audio/ogg;codecs=opus';
    } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
      mimeType = 'audio/ogg';
    } else {
      console.warn('OGG format not supported, falling back to default');
      // Try to find any supported format if OGG is not available
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        mimeType = 'audio/webm';
      } else {
        // Use default browser format
        mimeType = ''; // Let browser choose
      }
    }

    console.log('Using mime type:', mimeType);

    mediaRecorder = new MediaRecorder(stream, { mimeType });
    audioChunks = [];
    isRecording = true;

    mediaRecorder.ondataavailable = (event) => {
      console.log('Audio data available:', {
        size: event.data.size,
        type: event.data.type
      });

      if (event.data.size > 0) {
        audioChunks.push(event.data);
        console.log('Audio chunk added, total chunks:', audioChunks.length);
      } else {
        console.warn('Received empty audio data');
      }
    };

    mediaRecorder.onstop = () => {
      console.log('MediaRecorder onstop triggered, chunks:', audioChunks.length);

      if (audioChunks.length === 0) {
        console.error('No audio chunks recorded!');
        // Reset recording state
        isRecording = false;
        hideRecordingDisplay();
        return;
      }

      // Force OGG format as requested
      const mimeType = 'audio/ogg';
      const filename = `recording_${Date.now()}.ogg`;
      const audioBlob = new Blob(audioChunks, { type: mimeType });
      recordedAudio = new File([audioBlob], filename, { type: mimeType });

      console.log('Audio blob created:', {
        size: audioBlob.size,
        type: audioBlob.type,
        filename: filename
      });

      // Stop all tracks
      stream.getTracks().forEach(track => track.stop());

      // Show recording complete display
      showRecordingCompleteDisplay(filename);

      console.log('Audio recording completed:', filename);
    };

    mediaRecorder.start();
    audioButton.classList.add('recording');

    // Start recording timer
    recordingStartTime = Date.now();
    startRecordingTimer();

    // Immediately show recording display and hide chat input
    showRecordingDisplay();

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
    isRecording = false;

    // Stop the timer
    stopRecordingTimer();

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
    attachmentDiv.setAttribute('data-type', file.type);

    if (file.type.startsWith('image/')) {
      const img = document.createElement('img');
      img.src = URL.createObjectURL(file);
      img.alt = file.name;
      img.onload = () => URL.revokeObjectURL(img.src);

      attachmentDiv.appendChild(img);
    } else {
      const fileIcon = document.createElement('div');
      fileIcon.className = 'file-icon';
      attachmentDiv.appendChild(fileIcon);
    }

    const fileName = document.createElement('div');
    fileName.className = 'file-name';
    fileName.textContent = file.name.length > 15 ? file.name.substring(0, 12) + '...' : file.name;
    attachmentDiv.appendChild(fileName);

    const fileSize = document.createElement('div');
    fileSize.className = 'file-size';
    fileSize.textContent = formatFileSize(file.size);
    attachmentDiv.appendChild(fileSize);

    const removeBtn = document.createElement('span');
    removeBtn.className = 'remove-attachment';
    removeBtn.textContent = '×';
    removeBtn.onclick = () => removeAttachment(index);
    attachmentDiv.appendChild(removeBtn);

    previewContainer.appendChild(attachmentDiv);
  });
}

/**
 * Format file size for display
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Send message with attachments
 */
function sendMessageWithAttachments(input: HTMLInputElement, messagesContainer: HTMLElement): void {
  const message = input.value.trim();

  console.log('📝 sendMessageWithAttachments called');
  console.log('💬 Message:', message || '(empty)');
  console.log('📎 Attachments count:', currentAttachments.length);
  console.log('🎤 Recorded audio:', recordedAudio ? recordedAudio.name : 'none');
  console.log('🛠️ Active tool:', activeTool);
  console.log('🔍 Current attachments:', currentAttachments.map(f => f.name));

  // Add recorded audio to attachments if available
  if (recordedAudio) {
    currentAttachments.push(recordedAudio);
    recordedAudio = null; // Clear after adding
    console.log('✅ Recorded audio added to attachments');
  }

  // If message is just "audio" or a recording filename, treat it as audio-only message
  const isAudioMessage = message === 'audio' || (recordedAudio && message.startsWith('recording_') && message.endsWith('.ogg'));
  const finalMessage = isAudioMessage ? '' : message; // Empty message for audio-only

  // Must have either text or attachments (including recorded audio)
  if (!finalMessage && currentAttachments.length === 0 && !recordedAudio) {
    console.log('❌ No message or attachments, returning');
    return;
  }

  // Generate message data
  const messageData: MessageData = {
    id: generateMessageId(),
    timestamp: new Date().toISOString(),
    type: activeTool ? 'command' : 'text',
    content: finalMessage,
    userId: getUserId(),
    sender: 'user',
    metadata: {
      attachments: currentAttachments.map(file => ({
        name: file.name,
        type: file.type,
        size: file.size
      })),
      activeTool: activeTool,
      toolCommand: activeTool,
      commandId: activeTool,
      isAudioMessage: isAudioMessage
    }
  };
  
  console.log('📦 MessageData created:', {
    type: messageData.type,
    content: messageData.content,
    metadata: messageData.metadata
  });
  console.log('🔍 DEBUG: commandId in messageData.metadata:', messageData.metadata.commandId);
  console.log('🔍 DEBUG: activeTool at message creation:', activeTool);

  // Store attachments for processing
  const attachmentsToSend = [...currentAttachments];

  // Add user message
  let displayText = finalMessage;
  if (isAudioMessage) {
    // For audio messages, show the filename
    displayText = message;
  } else if (currentAttachments.length > 0) {
    const attachmentText = currentAttachments.length === 1
      ? `[${currentAttachments[0].name}]`
      : `[${currentAttachments.length} files]`;
    displayText = displayText ? `${displayText} ${attachmentText}` : attachmentText;
  }

  addMessage(messagesContainer, displayText, 'user', attachmentsToSend);

  // Clear input and attachments immediately for UI
  input.value = '';
  currentAttachments = [];
  updateAttachmentsPreview();


  // Send to webhook
  if (activeTool) {
    console.log('🎯 Sending command with active tool:', activeTool);
    console.log('📤 Calling sendCommandToWebhook with messageData:', messageData);
    // Send as command
    sendCommandToWebhook(messageData).then(success => {
      handleWebhookResponse(messageData.id, success);
      // Clear active tool after successful send
      deactivateTool();
    });
  } else if (attachmentsToSend.length > 0) {
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
      messageType: activeTool ? 'command' : 'mixed',
      files: fileData,
      metadata: {
        ...messageData.metadata,
        fileCount: files.length,
        totalSize: files.reduce((sum, file) => sum + file.size, 0),
        hasText: !!(messageData.content && messageData.content.trim()),
        activeTool: activeTool,
        toolCommand: activeTool,
        commandId: activeTool
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

      // Clear active tool after successful send
      if (activeTool) {
        deactivateTool();
      }
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

// Test function for debugging image display
(window as any).testImageDisplay = () => {
  const testBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
  console.log('🧪 Testing image display with file size');
  addMessage(document.getElementById('chat-messages') as HTMLElement, 'Test image with file size display', 'bot', undefined, [
    { data: testBase64, type: 'image/png', name: 'test_image.png' }
  ]);
};
