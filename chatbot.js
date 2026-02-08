// ===== CHATBOT UI PARA LA VECINDAD DEL PERRO =====

const GEMINI_API_KEY = "AIzaSyDSOpXdu2Ndzn4apgjZHUzK5zkVkSzDID8";

let voiceClient = null;
let isVoiceActive = false;

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', () => {
    initEventListeners();
});

// ===== CONTROL DE VOZ =====
function startVoiceChat() {
    if (voiceClient && isVoiceActive) {
        stopVoiceChat();
        return;
    }

    voiceClient = new VoiceClient(GEMINI_API_KEY, {
        onStatusChange: handleStatusChange,
        onAudioLevel: handleAudioLevel,
        onResponseText: handleResponseText
    });

    voiceClient.start();
    isVoiceActive = true;
    updateMicButton(true);
}

function stopVoiceChat() {
    if (voiceClient) {
        voiceClient.stop();
        voiceClient = null;
    }
    isVoiceActive = false;
    updateMicButton(false);
    hideStatus();
}

function handleStatusChange(status, detail) {
    console.log('Status:', status, detail);
    
    switch (status) {
        case 'connected':
            showStatus('✅ Conectado');
            break;
        case 'listening':
            showStatus('🎤 Escuchando... Habla ahora');
            break;
        case 'disconnected':
            showStatus('🔌 Desconectado');
            isVoiceActive = false;
            updateMicButton(false);
            setTimeout(hideStatus, 2000);
            break;
        case 'error':
            showStatus('❌ Error: ' + (detail || 'Desconocido'), true);
            isVoiceActive = false;
            updateMicButton(false);
            setTimeout(hideStatus, 3000);
            break;
    }
}

function handleAudioLevel(level) {
    // Visualización del nivel de audio (opcional)
    const mic = document.getElementById('chatbotMic');
    if (mic && isVoiceActive) {
        const scale = 1 + (level * 2);
        mic.style.transform = `scale(${Math.min(scale, 1.3)})`;
    }
}

function handleResponseText(text) {
    if (text) {
        addMessage(text, 'bot');
    }
}

// ===== UI DEL CHATBOT =====
function initEventListeners() {
    const chatbot = document.getElementById('chatbot');
    const toggle = document.getElementById('chatbotToggle');
    const close = document.getElementById('chatbotClose');
    const send = document.getElementById('chatbotSend');
    const input = document.getElementById('chatbotInput');
    const mic = document.getElementById('chatbotMic');

    toggle?.addEventListener('click', () => {
        chatbot.classList.toggle('active');
        toggle.classList.toggle('active');
    });

    close?.addEventListener('click', () => {
        chatbot.classList.remove('active');
        toggle.classList.remove('active');
        stopVoiceChat();
    });

    send?.addEventListener('click', sendTextMessage);
    input?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendTextMessage();
    });

    mic?.addEventListener('click', startVoiceChat);

    document.querySelectorAll('.quick-reply').forEach(btn => {
        btn.addEventListener('click', () => {
            if (input) input.value = btn.dataset.message;
            sendTextMessage();
        });
    });

    // Auto-abrir después de 5 segundos
    setTimeout(() => {
        if (!sessionStorage.getItem('chatOpened') && chatbot) {
            chatbot.classList.add('active');
            toggle?.classList.add('active');
            sessionStorage.setItem('chatOpened', 'true');
        }
    }, 5000);
}

function sendTextMessage() {
    const input = document.getElementById('chatbotInput');
    const message = input?.value.trim();
    if (!message) return;

    addMessage(message, 'user');
    input.value = '';

    // Si hay conexión de voz activa, enviar por ahí
    if (voiceClient && voiceClient.ws && voiceClient.ws.readyState === WebSocket.OPEN) {
        voiceClient.sendTextMessage(message);
    } else {
        // Si no, iniciar conexión de voz
        startVoiceChat();
        setTimeout(() => {
            if (voiceClient) {
                voiceClient.sendTextMessage(message);
            }
        }, 1000);
    }
}

function updateMicButton(active) {
    const mic = document.getElementById('chatbotMic');
    if (!mic) return;
    
    if (active) {
        mic.classList.add('listening');
        mic.textContent = '🔴';
        mic.style.animation = 'pulse 1s infinite';
    } else {
        mic.classList.remove('listening');
        mic.textContent = '🎤';
        mic.style.animation = '';
        mic.style.transform = 'scale(1)';
    }
}

function addMessage(content, sender) {
    const container = document.getElementById('chatbotMessages');
    if (!container) return;

    const div = document.createElement('div');
    div.className = `chat-message ${sender}`;

    if (sender === 'bot') {
        div.innerHTML = `
            <span class="message-avatar">🐕</span>
            <div class="message-content">${content.replace(/\n/g, '<br>')}</div>
        `;
    } else {
        div.innerHTML = `<div class="message-content">${content}</div>`;
    }

    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

function showStatus(msg, isError = false) {
    let status = document.getElementById('voiceStatus');
    if (!status) {
        status = document.createElement('div');
        status.id = 'voiceStatus';
        status.style.cssText = `
            text-align: center; padding: 10px; font-size: 13px;
            position: absolute; bottom: 80px; left: 16px; right: 16px;
            border-radius: 8px; z-index: 10; font-weight: 500;
            transition: all 0.3s ease;
        `;
        document.getElementById('chatbot')?.appendChild(status);
    }
    status.textContent = msg;
    status.style.display = 'block';
    status.style.background = isError ? '#fef2f2' : '#f0fdf4';
    status.style.color = isError ? '#dc2626' : '#16a34a';
}

function hideStatus() {
    const el = document.getElementById('voiceStatus');
    if (el) el.style.display = 'none';
}
