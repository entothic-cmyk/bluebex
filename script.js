lucide.createIcons();

const heroView = document.getElementById('hero-view');
const chatFeed = document.getElementById('chat-feed');
const messagesList = document.getElementById('messages-list');
const bottomBar = document.getElementById('bottom-bar');
const mainContainer = document.getElementById('main-container');

const heroForm = document.getElementById('hero-chat-form');
const heroInput = document.getElementById('hero-user-input');

const activeForm = document.getElementById('active-chat-form');
const activeInput = document.getElementById('active-user-input');

let chatHistory = [
  { role: 'system', content: 'You are Bluebex AI, powered by DeepSeek.' }
];

// Handle hero input submission
heroForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = heroInput.value.trim();
  if (!text) return;
  startChat(text);
});

// Handle bottom input submission
activeForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = activeInput.value.trim();
  if (!text) return;
  sendMessage(text);
  activeInput.value = '';
});

function startChat(initialText) {
  // Transition UI from Hero to Active Chat
  heroView.classList.add('hidden');
  chatFeed.classList.remove('hidden');
  chatFeed.classList.add('flex');
  bottomBar.classList.remove('hidden');
  
  sendMessage(initialText);
}

async function sendMessage(text) {
  appendMessage('user', text);
  chatHistory.push({ role: 'user', content: text });

  const loadingId = appendLoading();
  mainContainer.scrollTop = mainContainer.scrollHeight;

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: chatHistory })
    });

    const data = await response.json();
    document.getElementById(loadingId)?.remove();

    if (response.ok && data.reply) {
      appendMessage('assistant', data.reply);
      chatHistory.push({ role: 'assistant', content: data.reply });
    } else {
      appendMessage('assistant', `API Error: ${data.error || 'Check Vercel API key'}`);
    }
  } catch (err) {
    document.getElementById(loadingId)?.remove();
    appendMessage('assistant', 'Network Error: Failed to connect.');
  }

  mainContainer.scrollTop = mainContainer.scrollHeight;
}

function appendMessage(role, text) {
  const msgDiv = document.createElement('div');
  msgDiv.className = 'w-full flex ' + (role === 'user' ? 'justify-end' : 'justify-start');

  if (role === 'user') {
    msgDiv.innerHTML = `
      <div class="bg-blue-600 text-white px-4 py-2.5 rounded-2xl max-w-[85%] text-sm leading-relaxed whitespace-pre-wrap shadow-sm">
        ${escapeHtml(text)}
      </div>
    `;
  } else {
    msgDiv.innerHTML = `
      <div class="flex gap-3 w-full">
        <div class="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center shrink-0 mt-0.5 text-white font-extrabold text-xs shadow-xs">
          B
        </div>
        <div class="flex-1 text-gray-800 text-sm leading-relaxed prose max-w-none pt-0.5">
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
      <div class="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center shrink-0 mt-0.5 text-white font-bold text-xs animate-pulse">
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

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}