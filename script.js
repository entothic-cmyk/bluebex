lucide.createIcons();

const chatContainer = document.getElementById('chat-container');
const form = document.getElementById('chat-form');
const input = document.getElementById('user-input');
const fileUpload = document.getElementById('file-upload');
const messagesContainer = document.getElementById('messages');
const welcomeScreen = document.getElementById('welcome-screen');
const authLink = document.getElementById('auth-link');

// 1. Check Login Status
const isLoggedIn = localStorage.getItem('bluebex_logged_in') === 'true';

if (isLoggedIn) {
  authLink.textContent = 'Profile';
  authLink.href = '#';
}

// 2. Chat History Configuration
let chatHistory = JSON.parse(localStorage.getItem('bluebex_history')) || [
  { role: 'system', content: 'You are Bluebex AI, powered by DeepSeek V4.1 Flash.' }
];

window.addEventListener('DOMContentLoaded', () => {
  if (chatHistory.length > 1) {
    if (welcomeScreen) welcomeScreen.style.display = 'none';
    chatHistory.forEach(msg => {
      if (msg.role !== 'system') appendMessage(msg.role, msg.content);
    });
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }
});

// 3. File Reader (Requires Login)
let attachedFileContent = "";
fileUpload.addEventListener('change', (e) => {
  if (!isLoggedIn) {
    window.location.href = 'login.html';
    return;
  }
  
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (evt) => {
    attachedFileContent = `\n\n[Attached File: ${file.name}]\n\`\`\`\n${evt.target.result}\n\`\`\``;
    input.value += ` [Attached: ${file.name}]`;
  };
  reader.readAsText(file);
});

// 4. Handle Chat Submission
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  if (!isLoggedIn) {
    window.location.href = 'login.html';
    return;
  }

  let textPrompt = input.value.trim();
  if (!textPrompt && !attachedFileContent) return;

  if (attachedFileContent) {
    textPrompt += attachedFileContent;
    attachedFileContent = "";
    fileUpload.value = "";
  }

  if (welcomeScreen) welcomeScreen.style.display = 'none';

  appendMessage('user', textPrompt);
  input.value = '';

  chatHistory.push({ role: 'user', content: textPrompt });
  localStorage.setItem('bluebex_history', JSON.stringify(chatHistory));

  const loadingId = appendLoading();
  chatContainer.scrollTop = chatContainer.scrollHeight;

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: chatHistory })
    });

    const data = await response.json();
    document.getElementById(loadingId).remove();

    if (response.ok && data.reply) {
      appendMessage('assistant', data.reply);
      chatHistory.push({ role: 'assistant', content: data.reply });
      localStorage.setItem('bluebex_history', JSON.stringify(chatHistory));
    } else {
      appendMessage('assistant', `API Error: ${data.error || 'Check Vercel API Key in Dashboard.'}`);
    }
  } catch (err) {
    document.getElementById(loadingId).remove();
    appendMessage('assistant', 'Network Error: Check console or Vercel logs.');
  }

  chatContainer.scrollTop = chatContainer.scrollHeight;
});

// 5. Beautiful Chat Bubble Renderer
const renderer = new marked.Renderer();
marked.use({ renderer });

function appendMessage(role, text) {
  const msgDiv = document.createElement('div');
  msgDiv.className = 'w-full flex ' + (role === 'user' ? 'justify-end' : 'justify-start');
  
  let displayText = text;
  if (role === 'user' && text.includes('[Attached File:')) {
    displayText = text.split('[Attached File:')[0] + "\n\n*(File attached)*";
  }

  if (role === 'user') {
    // User Chat Bubble (Gray Pill)
    msgDiv.innerHTML = `
      <div class="bg-[#f4f6f8] text-gray-800 px-5 py-3 rounded-3xl max-w-[80%] text-[15px] leading-relaxed whitespace-pre-wrap font-medium">
        ${escapeHtml(displayText.trim())}
      </div>
    `;
  } else {
    // AI Chat Bubble (Transparent with Sparkle Icon)
    msgDiv.innerHTML = `
      <div class="flex gap-4 w-full">
        <div class="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0 mt-1 shadow-sm">
          <i data-lucide="sparkles" class="w-4 h-4 text-white"></i>
        </div>
        <div class="flex-1 text-gray-800 text-[15px] leading-loose prose prose-blue max-w-none">
          ${marked.parse(text)}
        </div>
      </div>
    `;
  }
  
  messagesContainer.appendChild(msgDiv);
  lucide.createIcons();
}

function appendLoading() {
  const id = 'loading-' + Date.now();
  const div = document.createElement('div');
  div.id = id;
  div.className = 'w-full flex justify-start';
  div.innerHTML = `
    <div class="flex gap-4 w-full">
      <div class="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0 mt-1 shadow-sm animate-pulse">
        <i data-lucide="sparkles" class="w-4 h-4 text-white"></i>
      </div>
      <div class="flex flex-col gap-2 pt-3 w-48 animate-pulse">
        <div class="h-2 bg-gray-200 rounded-full w-full"></div>
        <div class="h-2 bg-gray-200 rounded-full w-2/3"></div>
      </div>
    </div>
  `;
  messagesContainer.appendChild(div);
  return id;
}

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}