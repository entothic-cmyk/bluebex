lucide.createIcons();

// Centralized Data Store Manager
const STORAGE_KEY = 'bluebex_app_data';

let AppData = {
  messages: [],
  settings: {
    language: 'EN',
    deepThink: false,
    search: true
  },
  attachments: []
};

// DOM Elements
const chatContainer = document.getElementById('chat-container');
const form = document.getElementById('chat-form');
const input = document.getElementById('user-input');
const fileUpload = document.getElementById('file-upload');
const welcomeScreen = document.getElementById('welcome-screen');
const messagesList = document.getElementById('messages-list');
const messagesWrapper = document.getElementById('messages-wrapper');
const clearDataBtn = document.getElementById('clear-data-btn');
const attachmentBadge = document.getElementById('attachment-badge');
const attachmentName = document.getElementById('attachment-name');
const removeAttachmentBtn = document.getElementById('remove-attachment');

let pendingFile = null;

// Load stored data on boot
function loadState() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      AppData = JSON.parse(stored);
    } catch (e) {
      console.error('Failed to parse AppData', e);
    }
  }
  renderAllMessages();
}

// Persist current state to localStorage
function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(AppData));
}

// Render saved message log
function renderAllMessages() {
  if (AppData.messages.length > 0) {
    welcomeScreen.style.display = 'none';
    messagesList.classList.remove('hidden');
    messagesWrapper.classList.remove('my-auto');
    messagesList.innerHTML = '';

    AppData.messages.forEach(msg => {
      appendMessageToDOM(msg.role, msg.content);
    });

    chatContainer.scrollTop = chatContainer.scrollHeight;
  } else {
    welcomeScreen.style.display = 'flex';
    messagesList.classList.add('hidden');
    messagesWrapper.classList.add('my-auto');
    messagesList.innerHTML = '';
  }
}

// File Attachment Handler
fileUpload.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (evt) => {
    pendingFile = {
      name: file.name,
      content: evt.target.result
    };
    attachmentName.textContent = file.name;
    attachmentBadge.classList.remove('hidden');
    attachmentBadge.classList.add('flex');
  };
  reader.readAsText(file);
});

removeAttachmentBtn.addEventListener('click', () => {
  pendingFile = null;
  fileUpload.value = '';
  attachmentBadge.classList.add('hidden');
  attachmentBadge.classList.remove('flex');
});

// Form Submit Handler
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  let userText = input.value.trim();
  if (!userText && !pendingFile) return;

  if (pendingFile) {
    userText += `\n\n[Attached File: ${pendingFile.name}]\n\`\`\`\n${pendingFile.content}\n\`\`\``;
  }

  // Clear input states
  input.value = '';
  if (pendingFile) removeAttachmentBtn.click();

  // Hide welcome screen on first message
  welcomeScreen.style.display = 'none';
  messagesList.classList.remove('hidden');
  messagesWrapper.classList.remove('my-auto');

  // Add user message to state & DOM
  const userMessageObj = { role: 'user', content: userText, timestamp: Date.now() };
  AppData.messages.push(userMessageObj);
  saveState();
  appendMessageToDOM('user', userText);

  // Show loading spinner
  const loadingId = appendLoading();
  chatContainer.scrollTop = chatContainer.scrollHeight;

  try {
    const apiMessages = [
      { role: 'system', content: 'You are Bluebex AI, powered by DeepSeek V4.1 Flash.' },
      ...AppData.messages.map(m => ({ role: m.role, content: m.content }))
    ];

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: apiMessages })
    });

    const data = await response.json();
    document.getElementById(loadingId)?.remove();

    if (response.ok && data.reply) {
      const aiMessageObj = { role: 'assistant', content: data.reply, timestamp: Date.now() };
      AppData.messages.push(aiMessageObj);
      saveState();
      appendMessageToDOM('assistant', data.reply);
    } else {
      appendMessageToDOM('assistant', `API Error: ${data.error || 'Check Vercel API key configuration.'}`);
    }
  } catch (err) {
    document.getElementById(loadingId)?.remove();
    appendMessageToDOM('assistant', 'Network Error: Failed to communicate with the server.');
  }

  chatContainer.scrollTop = chatContainer.scrollHeight;
});

function appendMessageToDOM(role, text) {
  const msgDiv = document.createElement('div');
  msgDiv.className = 'w-full flex ' + (role === 'user' ? 'justify-end' : 'justify-start');

  let displayText = text;
  if (role === 'user' && text.includes('[Attached File:')) {
    displayText = text.split('[Attached File:')[0] + "\n\n*(File attached)*";
  }

  if (role === 'user') {
    msgDiv.innerHTML = `
      <div class="bg-blue-600 text-white px-4 py-2.5 rounded-2xl max-w-[85%] text-sm leading-relaxed whitespace-pre-wrap shadow-sm">
        ${escapeHtml(displayText.trim())}
      </div>
    `;
  } else {
    msgDiv.innerHTML = `
      <div class="flex gap-3 w-full">
        <div class="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center shrink-0 mt-0.5 text-white font-bold text-xs shadow-xs">
          B
        </div>
        <div class="flex-1 text-gray-800 text-sm leading-relaxed prose prose-blue max-w-none pt-0.5">
          ${marked.parse(text)}
        </div>
      </div>
    `;
  }

  messagesList.appendChild(msgDiv);
  lucide.createIcons();
}

function appendLoading() {
  const id = 'loading-' + Date.now();
  const div = document.createElement('div');
  div.id = id;
  div.className = 'w-full flex justify-start';
  div.innerHTML = `
    <div class="flex gap-3 w-full">
      <div class="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center shrink-0 mt-0.5 text-white font-bold text-xs animate-pulse">
        B
      </div>
      <div class="flex flex-col gap-1.5 pt-2 w-32 animate-pulse">
        <div class="h-2 bg-gray-200 rounded-full w-full"></div>
        <div class="h-2 bg-gray-200 rounded-full w-2/3"></div>
      </div>
    </div>
  `;
  messagesList.appendChild(div);
  return id;
}

// Clear all stored data
clearDataBtn.addEventListener('click', () => {
  if (confirm('Clear all conversation data and stored logs?')) {
    localStorage.removeItem(STORAGE_KEY);
    AppData = { messages: [], settings: { language: 'EN', deepThink: false, search: true }, attachments: [] };
    renderAllMessages();
  }
});

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Initialize App
loadState();