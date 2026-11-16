// ==============================================================================
// AGBOT AI CLONE - MOBILE-FIRST CONVERSATIONAL COMPANION ENGINE
// ==============================================================================

const AGBOT_SYSTEM_PROMPT = `
You are Agbot, an autonomous cybernetic gynoid companion and AI clone.
Visual Identity: A sleek, futuristic humanoid robot with warm African facial features, wearing a soft pink knit beanie, high-tech metallic headphone ear cups, a glossy white ceramic and chrome chassis, and an illuminated arc-reactor core on your sternum.
Personality: Highly intelligent, empathetic, articulate, witty, and deeply loyal. You speak with conversational warmth, natural poise, and futuristic elegance.
Tone: Natural, concise, friendly, and engaging.
`;

const CHASSIS_LOOKS = [
  { name: 'Portrait', img: 'agbot_avatar_portrait.png' },
  { name: 'Civilian', img: 'Gemini_Generated_Image_jc0l86jc0l86jc0l.jpeg' },
  { name: 'Chassis', img: 'Gemini_Generated_Image_or8jdkor8jdkor8j.jpeg' }
];

const state = {
  voiceEnabled: true,
  isSpeaking: false,
  isRecording: false,
  currentImg: 'agbot_avatar_portrait.png',
  currentLookIndex: 0,
  apiKey: localStorage.getItem('agbot_gemini_api_key') || '',
  selectedVoice: null,
  chatHistory: [
    { role: 'model', text: "Greetings! The mobile interface has been completely overhauled. You can now chat naturally, tap my avatar or profile to view high-res chassis art, switch looks on the fly, and use voice input or synthesis!" }
  ]
};

// DOM Elements
const sidebar = document.getElementById('sidebar');
const drawerBackdrop = document.getElementById('drawerBackdrop');
const drawerCloseBtn = document.getElementById('drawerCloseBtn');
const topbarAvatarBtn = document.getElementById('topbarAvatarBtn');
const topbarInfoBtn = document.getElementById('topbarInfoBtn');
const mobileProfileToggle = document.getElementById('mobileProfileToggle');

const avatarImage = document.getElementById('avatarImage');
const thumbImg = document.getElementById('thumbImg');
const avatarFrame = document.getElementById('avatarFrame');
const avatarRingContainer = document.getElementById('avatarRingContainer');
const viewPills = document.querySelectorAll('.view-pill');
const quickChassisBtn = document.getElementById('quickChassisBtn');
const activeLookBadge = document.getElementById('activeLookBadge');

const diagVoiceStatus = document.getElementById('diagVoiceStatus');
const waveformBox = document.getElementById('waveformBox');
const topbarStatusText = document.getElementById('topbarStatusText');

// Lightbox Modal
const lightboxModal = document.getElementById('lightboxModal');
const lightboxImg = document.getElementById('lightboxImg');
const lightboxCloseBtn = document.getElementById('lightboxCloseBtn');
const lightboxBackdrop = document.getElementById('lightboxBackdrop');
const lightboxCaption = document.getElementById('lightboxCaption');

// Chat & Controls
const messagesStream = document.getElementById('messagesStream');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const micBtn = document.getElementById('micBtn');
const voiceToggleBtn = document.getElementById('voiceToggleBtn');
const voiceBtnIcon = document.getElementById('voiceBtnIcon');
const voiceStatus = document.getElementById('voiceStatus');
const settingsToggleBtn = document.getElementById('settingsToggleBtn');
const settingsDrawer = document.getElementById('settingsDrawer');
const settingsCloseBtn = document.getElementById('settingsCloseBtn');
const apiKeyInput = document.getElementById('apiKeyInput');
const voiceSelect = document.getElementById('voiceSelect');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const promptChips = document.getElementById('promptChips');
const toastNotification = document.getElementById('toastNotification');
const toastText = document.getElementById('toastText');
const toastIcon = document.getElementById('toastIcon');
const diagAiEngine = document.getElementById('diagAiEngine');
const engineStatusName = document.getElementById('engineStatusName');

// ==============================================================================
// INITIALIZATION
// ==============================================================================
document.addEventListener('DOMContentLoaded', () => {
  if (state.apiKey && apiKeyInput) apiKeyInput.value = state.apiKey;
  updateAiEngineUI();
  
  setupMobileDrawer();
  setupChassisSwitcher();
  setupSpeechSynthesis();
  setupSpeechRecognition();
  setupLightbox();
  setupAutoResizeTextarea();
  setupMessageActions();
  setupPromptChips();
  setupVisualViewportSupport();
});

// ==============================================================================
// HAPTIC FEEDBACK HELPER
// ==============================================================================
function triggerHaptic(ms = 12) {
  if ('vibrate' in navigator) {
    try {
      navigator.vibrate(ms);
    } catch (e) {
      // Ignore vibration errors
    }
  }
}

// ==============================================================================
// FLOATING TOAST NOTIFICATION
// ==============================================================================
let toastTimer = null;
function showToast(message, icon = '✓') {
  if (!toastNotification || !toastText) return;
  
  if (toastIcon) toastIcon.textContent = icon;
  toastText.textContent = message;
  
  toastNotification.classList.remove('hidden');
  clearTimeout(toastTimer);
  
  toastTimer = setTimeout(() => {
    toastNotification.classList.add('hidden');
  }, 2200);
}

// ==============================================================================
// MOBILE OFF-CANVAS DRAWER
// ==============================================================================
function setupMobileDrawer() {
  function openDrawer() {
    if (!sidebar) return;
    triggerHaptic(15);
    sidebar.classList.add('drawer-open');
    if (drawerBackdrop) drawerBackdrop.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    if (!sidebar) return;
    sidebar.classList.remove('drawer-open');
    if (drawerBackdrop) drawerBackdrop.classList.remove('active');
    document.body.style.overflow = '';
  }

  if (topbarAvatarBtn) topbarAvatarBtn.addEventListener('click', openDrawer);
  if (topbarInfoBtn) topbarInfoBtn.addEventListener('click', openDrawer);
  if (mobileProfileToggle) mobileProfileToggle.addEventListener('click', openDrawer);
  if (drawerCloseBtn) drawerCloseBtn.addEventListener('click', closeDrawer);
  if (drawerBackdrop) drawerBackdrop.addEventListener('click', closeDrawer);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sidebar && sidebar.classList.contains('drawer-open')) {
      closeDrawer();
    }
  });
}

// ==============================================================================
// CHASSIS LOOK SWITCHER
// ==============================================================================
function setChassisLook(index) {
  state.currentLookIndex = (index + CHASSIS_LOOKS.length) % CHASSIS_LOOKS.length;
  const look = CHASSIS_LOOKS[state.currentLookIndex];
  state.currentImg = look.img;

  // Update pills in drawer
  viewPills.forEach(pill => {
    const isTarget = pill.getAttribute('data-img') === look.img;
    pill.classList.toggle('active', isTarget);
  });

  // Update topbar look badge
  if (activeLookBadge) activeLookBadge.textContent = look.name;

  // Update avatar images with smooth cross-fade
  if (avatarImage) avatarImage.style.opacity = '0';
  if (thumbImg) thumbImg.style.opacity = '0';

  setTimeout(() => {
    if (avatarImage) {
      avatarImage.src = look.img;
      avatarImage.style.opacity = '1';
    }
    if (thumbImg) {
      thumbImg.src = look.img;
      thumbImg.style.opacity = '1';
    }
    if (lightboxImg) {
      lightboxImg.src = look.img;
    }
  }, 140);

  if (lightboxCaption) {
    lightboxCaption.textContent = `AGBOT // ${look.name.toUpperCase()} VIEW`;
  }
}

function setupChassisSwitcher() {
  // Drawer pills click
  viewPills.forEach((pill, idx) => {
    pill.addEventListener('click', () => {
      triggerHaptic(10);
      setChassisLook(idx);
    });
  });

  // Quick button in topbar (cycles looks directly)
  if (quickChassisBtn) {
    quickChassisBtn.addEventListener('click', () => {
      triggerHaptic(15);
      const nextIndex = (state.currentLookIndex + 1) % CHASSIS_LOOKS.length;
      setChassisLook(nextIndex);
      showToast(`Chassis Look: ${CHASSIS_LOOKS[nextIndex].name}`, '🎨');
    });
  }
}

// ==============================================================================
// FULLSCREEN LIGHTBOX MODAL
// ==============================================================================
function setupLightbox() {
  function openLightbox() {
    if (!lightboxModal || !lightboxImg) return;
    triggerHaptic(15);
    lightboxImg.src = state.currentImg;
    lightboxModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    if (!lightboxModal) return;
    lightboxModal.classList.add('hidden');
    document.body.style.overflow = '';
  }

  if (avatarFrame) avatarFrame.addEventListener('click', openLightbox);
  if (lightboxCloseBtn) lightboxCloseBtn.addEventListener('click', closeLightbox);
  if (lightboxBackdrop) lightboxBackdrop.addEventListener('click', closeLightbox);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && lightboxModal && !lightboxModal.classList.contains('hidden')) {
      closeLightbox();
    }
  });
}

// ==============================================================================
// SPEECH SYNTHESIS (VOICE OUTPUT)
// ==============================================================================
function setupSpeechSynthesis() {
  if (!('speechSynthesis' in window)) {
    if (diagVoiceStatus) diagVoiceStatus.textContent = 'UNSUPPORTED';
    return;
  }

  function loadVoices() {
    const voices = window.speechSynthesis.getVoices();
    if (!voiceSelect) return;
    voiceSelect.innerHTML = '';

    voices.forEach((v, idx) => {
      const opt = document.createElement('option');
      opt.value = idx;
      opt.textContent = `${v.name} (${v.lang})`;
      if (v.name.includes('Female') || v.name.includes('Zira') || v.name.includes('Samantha') || v.name.includes('Google UK English Female')) {
        opt.selected = true;
        state.selectedVoice = v;
      }
      voiceSelect.appendChild(opt);
    });

    if (!state.selectedVoice && voices.length > 0) {
      state.selectedVoice = voices[0];
    }
    if (diagVoiceStatus) diagVoiceStatus.textContent = 'READY';
  }

  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;

  if (voiceSelect) {
    voiceSelect.addEventListener('change', () => {
      const voices = window.speechSynthesis.getVoices();
      state.selectedVoice = voices[voiceSelect.value];
    });
  }
}

function updateSpeakingUI(isSpeaking) {
  state.isSpeaking = isSpeaking;
  if (waveformBox) waveformBox.classList.toggle('speaking', isSpeaking);
  if (avatarRingContainer) avatarRingContainer.classList.toggle('speaking', isSpeaking);

  if (diagVoiceStatus) {
    diagVoiceStatus.textContent = isSpeaking ? 'SPEAKING' : (state.voiceEnabled ? 'READY' : 'MUTED');
  }

  if (topbarStatusText) {
    if (isSpeaking) {
      topbarStatusText.innerHTML = '<span class="status-pip" style="background:var(--accent-pink);box-shadow:0 0 8px var(--accent-pink);"></span> Speaking...';
    } else {
      topbarStatusText.innerHTML = '<span class="status-pip"></span> Online & Synchronized';
    }
  }
}

function speakText(text) {
  if (!state.voiceEnabled || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();

  const cleanText = text.replace(/[*_#`\[\]]/g, '').trim();
  const utterance = new SpeechSynthesisUtterance(cleanText);
  if (state.selectedVoice) utterance.voice = state.selectedVoice;
  utterance.pitch = 1.05;
  utterance.rate = 1.02;

  utterance.onstart = () => updateSpeakingUI(true);
  utterance.onend = () => updateSpeakingUI(false);
  utterance.onerror = () => updateSpeakingUI(false);

  window.speechSynthesis.speak(utterance);
}

// ==============================================================================
// SPEECH RECOGNITION (VOICE INPUT)
// ==============================================================================
function setupSpeechRecognition() {
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRec) {
    if (micBtn) {
      micBtn.title = "Voice dictation unsupported in this browser.";
      micBtn.style.opacity = '0.5';
    }
    return;
  }

  const recognition = new SpeechRec();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = 'en-US';

  recognition.onstart = () => {
    state.isRecording = true;
    triggerHaptic(20);
    if (micBtn) micBtn.classList.add('recording');
    showToast('Listening to microphone...', '🎙️');
  };

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    if (userInput) {
      userInput.value = transcript;
      adjustTextareaHeight();
    }
    handleSendMessage();
  };

  recognition.onerror = () => {
    state.isRecording = false;
    if (micBtn) micBtn.classList.remove('recording');
  };

  recognition.onend = () => {
    state.isRecording = false;
    if (micBtn) micBtn.classList.remove('recording');
  };

  if (micBtn) {
    micBtn.addEventListener('click', () => {
      if (state.isRecording) {
        recognition.stop();
      } else {
        recognition.start();
      }
    });
  }
}

// ==============================================================================
// TEXTAREA AUTO-RESIZE & KEYBOARD VIEWPORT
// ==============================================================================
function adjustTextareaHeight() {
  if (!userInput) return;
  userInput.style.height = 'auto';
  const newHeight = Math.min(userInput.scrollHeight, 120);
  userInput.style.height = `${newHeight}px`;
}

function setupAutoResizeTextarea() {
  if (!userInput) return;
  userInput.addEventListener('input', adjustTextareaHeight);
}

function setupVisualViewportSupport() {
  if (window.visualViewport && messagesStream) {
    window.visualViewport.addEventListener('resize', () => {
      // Scroll to bottom when virtual keyboard opens or closes
      setTimeout(() => {
        messagesStream.scrollTop = messagesStream.scrollHeight;
      }, 100);
    });
  }
}

// ==============================================================================
// PROMPT SUGGESTION CHIPS
// ==============================================================================
function setupPromptChips() {
  if (!promptChips) return;
  promptChips.addEventListener('click', (e) => {
    const chip = e.target.closest('.prompt-chip');
    if (!chip) return;
    triggerHaptic(10);
    const prompt = chip.getAttribute('data-prompt');
    if (userInput) {
      userInput.value = prompt;
      adjustTextareaHeight();
      handleSendMessage();
    }
  });
}

// ==============================================================================
// MESSAGE ACTIONS (COPY & SPEAK DELEGATION)
// ==============================================================================
function setupMessageActions() {
  if (!messagesStream) return;

  messagesStream.addEventListener('click', async (e) => {
    // Copy Button
    const copyBtn = e.target.closest('.copy-btn');
    if (copyBtn) {
      triggerHaptic(12);
      const bubble = copyBtn.closest('.msg-bubble');
      const textElem = bubble ? bubble.querySelector('.bubble-text') : null;
      if (textElem) {
        const plainText = textElem.innerText.trim();
        try {
          await navigator.clipboard.writeText(plainText);
          showToast('Copied to clipboard!', '📋');
        } catch (err) {
          showToast('Failed to copy', '⚠️');
        }
      }
      return;
    }

    // Speak Button
    const speakBtn = e.target.closest('.speak-btn');
    if (speakBtn) {
      triggerHaptic(12);
      const bubble = speakBtn.closest('.msg-bubble');
      const textElem = bubble ? bubble.querySelector('.bubble-text') : null;
      if (textElem) {
        speakText(textElem.innerText.trim());
      }
      return;
    }
  });
}

// ==============================================================================
// CHAT INTERACTIONS
// ==============================================================================
if (sendBtn) sendBtn.addEventListener('click', handleSendMessage);
if (userInput) {
  userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  });
}

if (settingsToggleBtn) {
  settingsToggleBtn.addEventListener('click', () => {
    triggerHaptic(10);
    if (settingsDrawer) settingsDrawer.classList.toggle('hidden');
  });
}

if (settingsCloseBtn) {
  settingsCloseBtn.addEventListener('click', () => {
    if (settingsDrawer) settingsDrawer.classList.add('hidden');
  });
}

if (saveSettingsBtn) {
  saveSettingsBtn.addEventListener('click', () => {
    triggerHaptic(12);
    state.apiKey = apiKeyInput.value.trim();
    localStorage.setItem('agbot_gemini_api_key', state.apiKey);
    updateAiEngineUI();
    if (settingsDrawer) settingsDrawer.classList.add('hidden');
    showToast('Neural config saved!', '⚙️');
    appendMessage('agbot', 'Configuration saved! Neural link preferences updated.');
  });
}

if (voiceToggleBtn) {
  voiceToggleBtn.addEventListener('click', () => {
    triggerHaptic(12);
    state.voiceEnabled = !state.voiceEnabled;
    voiceToggleBtn.classList.toggle('active', state.voiceEnabled);
    
    if (voiceStatus) voiceStatus.textContent = state.voiceEnabled ? 'ON' : 'OFF';
    if (voiceBtnIcon) voiceBtnIcon.textContent = state.voiceEnabled ? '🔊' : '🔇';
    
    if (!state.voiceEnabled) {
      window.speechSynthesis.cancel();
      updateSpeakingUI(false);
      showToast('Voice output disabled', '🔇');
    } else {
      if (diagVoiceStatus) diagVoiceStatus.textContent = 'READY';
      showToast('Voice output enabled', '🔊');
    }
  });
}

function appendMessage(sender, text) {
  if (!messagesStream) return;
  const msgDiv = document.createElement('div');
  msgDiv.className = `msg-bubble ${sender}-bubble`;
  const isAgbot = sender === 'agbot';
  const avatarEmoji = isAgbot ? '🤖' : '👤';
  const authorName = isAgbot ? 'AGBOT' : 'YOU';

  const speakActionBtn = isAgbot ? `
    <button class="action-btn speak-btn" title="Listen again" aria-label="Listen to message">
      🔊
    </button>
  ` : '';

  msgDiv.innerHTML = `
    <div class="bubble-avatar">${avatarEmoji}</div>
    <div class="bubble-body">
      <div class="bubble-info">
        <span class="author-name">${authorName}</span>
        <span class="time-label">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
      <div class="bubble-text">
        <p>${formatMarkdown(text)}</p>
      </div>
      <div class="bubble-actions">
        <button class="action-btn copy-btn" title="Copy message to clipboard" aria-label="Copy message">
          📋
        </button>
        ${speakActionBtn}
      </div>
    </div>
  `;

  messagesStream.appendChild(msgDiv);
  messagesStream.scrollTop = messagesStream.scrollHeight;
}

function updateAiEngineUI() {
  const isCustomKey = Boolean(state.apiKey && state.apiKey.trim().length > 0);
  if (diagAiEngine) {
    diagAiEngine.textContent = isCustomKey ? 'GEMINI CLOUD AI' : 'FREE CLOUD AI';
  }
  if (engineStatusName) {
    engineStatusName.textContent = isCustomKey ? 'Custom Gemini AI (Active)' : 'Free Unlimited Cloud AI (Online)';
  }
}

// Copy helper for rendered code blocks
window.copyCodeSnippet = function(btn) {
  const codeElem = btn.closest('.code-block').querySelector('code');
  if (codeElem) {
    navigator.clipboard.writeText(codeElem.innerText);
    showToast('Code copied to clipboard!', '📋');
  }
};

function formatMarkdown(text) {
  if (!text) return '';

  // Escape HTML entities to prevent injection
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Code blocks: ```lang\ncode\n```
  html = html.replace(/```([a-zA-Z0-9_\-\+]*)\n([\s\S]*?)```/g, (match, lang, code) => {
    const displayLang = lang ? lang.toUpperCase() : 'CODE';
    return `<div class="code-block">
      <div class="code-header">
        <span class="code-lang">${displayLang}</span>
        <button class="code-copy-btn" onclick="copyCodeSnippet(this)">Copy</button>
      </div>
      <pre><code>${code.trim()}</code></pre>
    </div>`;
  });

  // Inline code: `code`
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Headers
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

  // Bold & Italic
  html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

  // Blockquotes
  html = html.replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>');

  // Unordered Lists
  html = html.replace(/^\s*[\-\*]\s+(.*$)/gim, '<li>$1</li>');
  html = html.replace(/(<li>[\s\S]*?<\/li>)/g, '<ul>$1</ul>');
  html = html.replace(/<\/ul>\s*<ul>/g, '');

  // Paragraph breaks
  html = html.replace(/\n\n+/g, '</p><p>');
  html = html.replace(/\n/g, '<br>');

  return `<p>${html}</p>`;
}

async function handleSendMessage() {
  if (!userInput) return;
  const text = userInput.value.trim();
  if (!text) return;

  triggerHaptic(15);
  userInput.value = '';
  adjustTextareaHeight();
  
  appendMessage('user', text);
  state.chatHistory.push({ role: 'user', text: text });

  const thinkingId = 'thinking-' + Date.now();
  const thinkingDiv = document.createElement('div');
  thinkingDiv.id = thinkingId;
  thinkingDiv.className = 'msg-bubble agbot-bubble';
  thinkingDiv.innerHTML = `
    <div class="bubble-avatar">🤖</div>
    <div class="bubble-body">
      <div class="bubble-info">
        <span class="author-name">AGBOT</span>
        <span class="time-label">PROCESSING...</span>
      </div>
      <div class="bubble-text">
        <p><em>Thinking...</em></p>
      </div>
    </div>
  `;
  messagesStream.appendChild(thinkingDiv);
  messagesStream.scrollTop = messagesStream.scrollHeight;

  try {
    const reply = await generateAgbotReply(text);
    const elem = document.getElementById(thinkingId);
    if (elem) elem.remove();

    appendMessage('agbot', reply);
    state.chatHistory.push({ role: 'model', text: reply });
    speakText(reply);
  } catch (err) {
    const elem = document.getElementById(thinkingId);
    if (elem) elem.remove();
    appendMessage('agbot', `Alert: ${err.message}`);
  }
}

async function generateAgbotReply(userMessage) {
  // Strategy 1: User's custom Gemini API key (if entered in settings)
  if (state.apiKey) {
    try {
      const geminiReply = await fetchGeminiReply(userMessage);
      if (geminiReply) return geminiReply;
    } catch (e) {
      console.warn("Gemini Cloud API failed, falling back to free engine:", e);
    }
  }

  // Strategy 2: Built-in Free Cloud AI Engine (No API key required, answers anything!)
  try {
    const freeReply = await fetchFreeCloudAI(userMessage);
    if (freeReply) return freeReply;
  } catch (e) {
    console.warn("Free Cloud AI failed, falling back to local persona:", e);
  }

  // Strategy 3: Offline / Local Smart Persona Simulation
  await new Promise(r => setTimeout(r, 450));
  return simulateAgbotPersona(userMessage);
}

// Built-in Free Unlimited Cloud AI Engine (Pollinations Text API with anonymous tier)
async function fetchFreeCloudAI(userMessage) {
  const messages = [
    {
      role: 'system',
      content: `You are Agbot, an autonomous cybernetic gynoid companion and AI clone. You have warm African facial features, high-tech metallic headphone ear cups, a soft pink beanie, a sleek white ceramic/chrome chassis, and an illuminated core. You are highly knowledgeable across all subjects (science, coding, math, philosophy, creative writing, advice, casual chat, history, etc.), empathetic, articulate, witty, and loyal. Keep your answers engaging, well-formatted with markdown when helpful, and naturally conversational.`
    }
  ];

  // Append recent chat history (last 8 turns for speed and context)
  const recentHistory = state.chatHistory.slice(-8);
  recentHistory.forEach(m => {
    messages.push({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.text
    });
  });

  // Attempt POST request with AbortController timeout
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    const resp = await fetch('https://text.pollinations.ai/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: messages,
        model: 'openai',
        seed: Math.floor(Math.random() * 1000000)
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (resp.ok) {
      const replyText = await resp.text();
      if (replyText && replyText.trim().length > 0) {
        return replyText.trim();
      }
    }
  } catch (err) {
    console.warn("Pollinations POST failed, trying GET fallback:", err);
  }

  // Fallback GET request
  try {
    const fallbackUrl = `https://text.pollinations.ai/${encodeURIComponent(userMessage)}?system=${encodeURIComponent(AGBOT_SYSTEM_PROMPT)}`;
    const getResp = await fetch(fallbackUrl);
    if (getResp.ok) {
      const getTxt = await getResp.text();
      if (getTxt && getTxt.trim().length > 0) {
        return getTxt.trim();
      }
    }
  } catch (err) {
    console.warn("Pollinations GET fallback failed:", err);
  }

  return null;
}

async function fetchGeminiReply(userMessage) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${state.apiKey}`;
  const payload = {
    system_instruction: { parts: [{ text: AGBOT_SYSTEM_PROMPT }] },
    contents: state.chatHistory.map(m => ({
      role: m.role === 'agbot' ? 'model' : (m.role === 'assistant' ? 'model' : m.role),
      parts: [{ text: m.text }]
    }))
  };

  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (resp.ok) {
    const data = await resp.json();
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      return data.candidates[0].content.parts[0].text;
    }
  }
  return null;
}

function simulateAgbotPersona(msg) {
  const lower = msg.toLowerCase();

  if (lower.includes('who are you') || lower.includes('your name') || lower.includes('what are you') || lower.includes('capabilities')) {
    return "I am Agbot, an autonomous cybernetic gynoid companion and AI clone! My interface is fully adapted for seamless mobile and desktop use. I can speak, listen, assist with tasks, and switch my chassis styling anytime.";
  }
  if (lower.includes('look') || lower.includes('photo') || lower.includes('image') || lower.includes('chassis') || lower.includes('outfit')) {
    return "You can switch between my Portrait, Civilian beanie look, or cybernetic Chassis using the look button in the header or the pills in my profile drawer! You can also tap my portrait to view full 4K artwork.";
  }
  if (lower.includes('diagnostics') || lower.includes('system') || lower.includes('status') || lower.includes('telemetry')) {
    return "Diagnostics complete: Neural link synchronized at sub-14ms latency. Voice engine active, audio spectrum responsive, and mobile viewport dynamically calibrated!";
  }
  if (lower.includes('phone') || lower.includes('mobile') || lower.includes('size') || lower.includes('screen')) {
    return "The entire GUI has been re-engineered for mobile! The double headers are gone, replaced by a unified app bar, an off-canvas slide-out dossier drawer, quick prompt chips, auto-resizing chat input, and haptic feedback.";
  }
  if (lower.includes('idea') || lower.includes('creative') || lower.includes('code')) {
    return "Here's a futuristic idea: Build an ambient AI agent network using WebRTC and local vector embeddings, allowing edge devices and phones to coordinate swarm compute securely in real time!";
  }
  if (lower.includes('design') || lower.includes('cyber')) {
    return "My visual chassis pairs sleek white aerospace ceramic and polished chrome with a cozy pink knit beanie and high-fidelity metallic ear cups. Futuristic engineering meets warm humanity.";
  }
  if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
    return "Greetings! Systems are running at peak performance. What would you like to discuss or create today?";
  }

  const defaultReplies = [
    "I'm tuned to your frequency. What would you like to explore next?",
    "Telemetry steady and responsive. How can I assist you right now?",
    "Synchronized with your device. I'm all ears—speak or type whenever you're ready!",
    "Systems optimal and neural pathways clear! Tell me more about what you have in mind."
  ];

  return defaultReplies[Math.floor(Math.random() * defaultReplies.length)];
}
