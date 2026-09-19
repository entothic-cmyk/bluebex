lucide.createIcons();

const chatContainer = document.getElementById('chat-container');
const header = document.getElementById('main-header');
const form = document.getElementById('chat-form');
const input = document.getElementById('user-input');
const fileUpload = document.getElementById('file-upload');
const messagesContainer = document.getElementById('messages');
const welcomeScreen = document.getElementById('welcome-screen');
const mainFooter = document.getElementById('main-footer');

// 1. Shrinking Header on Scroll
chatContainer.addEventListener('scroll', () => {
  if (chatContainer.scrollTop > 40) {
    header.classList.add('shrunk');
  } else {
    header.classList.remove('shrunk');
  }
});

// 2. Chat History & Memory Initialization
let chatHistory = JSON.parse(localStorage.getItem('bluebex_history')) || [
  { role: 'system', content: 'You are Bluebex AI, an expert coding and reasoning AI assistant.' }
];

window.addEventListener('DOMContentLoaded', () => {
  if (chatHistory.length > 1) {
    if (welcomeScreen) welcomeScreen.style.display = 'none';
    if (mainFooter) mainFooter.style.display = 'none';
    
    chatHistory.forEach(msg => {
      if (msg.role !== 'system') appendMessage(msg.role, msg.content);
    });
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }
});

// 3. File Reader Handling
let attachedFileContent = "";
fileUpload.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (evt) => {
    attachedFileContent = `\n\n[Attached File Content: ${file.name}]\n\`\`\`\n${evt.target.result}\n\`\`\``;
    input.value += ` [Attached: ${file.name}]`;
  };
  reader.readAsText(file);
});

// 4. Custom Code Block Parser with Copy & Download
const renderer = new marked.Renderer();
renderer.code = function(code, language) {
  const id = 'code-' + Math.random().toString(36).substr(2, 9);
  const lang = language || 'code';
  const ext = lang.split(' ')[0] || 'txt';
  
  // Escape HTML entities inside code block
  const safeCode = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  return `
    <div class="code-block-wrapper">
      <div class="code-header">
        <span>${lang}</span>
        <div class="flex gap-3">
          <button onclick="copyCode('${id}')" class="hover:text-white transition flex items-center gap-1">
            <i data-lucide="copy" class="w-3 h-3"></i> Copy
          </button>
          <button onclick="downloadCode('${id}', 'bluebex-code.${ext}')" class="hover:text-white transition flex items-center gap-1">
            <i data-lucide="download" class="w-3 h-3"></i> Download
          </button>
        </div>
      </div>
      <pre class="code-content"><code id="${id}">${safeCode}</code></pre>
    </div>
  `;
};
marked.use({ renderer });

// Global Copy & Download Functions
window.copyCode = function(id) {
  const text = document.getElementById(id).innerText;
  navigator.clipboard.writeText(text).then(() => alert('Code copied to clipboard!'));
};

window.downloadCode = function(id, filename) {
  const text = document.getElementById(id).innerText;
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

// 5. Submit Form & Fetch Stream Response
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  let textPrompt = input.value.trim();
  if (!textPrompt && !attachedFileContent) return;

  if (attachedFileContent) {
    textPrompt += attachedFileContent;
    attachedFileContent = "";
    fileUpload.value = "";
  }

  if (welcomeScreen) welcomeScreen.style.display = 'none';
  if (mainFooter) mainFooter.style.display = 'none';

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

    if (data.reply) {
      appendMessage('assistant', data.reply);
      chatHistory.push({ role: 'assistant', content: data.reply });
      localStorage.setItem('bluebex_history', JSON.stringify(chatHistory));
    } else {
      appendMessage('assistant', 'Error: Could not retrieve response from API.');
    }
  } catch (err) {
    document.getElementById(loadingId).remove();
    appendMessage('assistant', 'Error connecting to the Bluebex AI backend.');
  }

  chatContainer.scrollTop = chatContainer.scrollHeight;
});

function appendMessage(role, text) {
  const msgDiv = document.createElement('div');
  msgDiv.className = 'flex gap-4 items-start ' + (role === 'user' ? 'justify-end' : '');

  if (role === 'user') {
    msgDiv.innerHTML = `
      <div class="bg-blue-600 text-white px-5 py-3 rounded-2xl max-w-[80%] shadow-sm leading-relaxed whitespace-pre-wrap">
        ${escapeHtml(text)}
      </div>
    `;
  } else {
    const parsedHTML = marked.parse(text);
    msgDiv.innerHTML = `
      <div class="p-2 rounded-full shrink-0 bg-blue-600 text-white mt-1 shadow-sm">
        <i data-lucide="sparkles" class="w-4 h-4"></i>
      </div>
      <div class="flex-1 pt-1 text-gray-800 leading-relaxed max-w-none space-y-3">
        ${parsedHTML}
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
  div.className = 'flex gap-4 items-center mt-4';
  div.innerHTML = `
    <div class="p-2 rounded-full bg-blue-600 text-white animate-pulse">
      <i data-lucide="sparkles" class="w-4 h-4"></i>
    </div>
    <span class="text-sm text-gray-400 animate-pulse">Bluebex AI is thinking...</span>
  `;
  messagesContainer.appendChild(div);
  return id;
}

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}