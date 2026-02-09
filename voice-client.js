/**
 * Gemini Voice Client for La Vecindad del Perro
 * Model: gemini-2.5-flash-native-audio-preview-12-2025
 * Protocol: BidiGenerateContent (WebSocket)
 */

class VoiceClient {
    constructor(apiKey, config = {}) {
        this.apiKey = apiKey;
        this.config = config;
        this.onStatusChange = config.onStatusChange || (() => { });
        this.onAudioLevel = config.onAudioLevel || (() => { });
        this.onResponseText = config.onResponseText || (() => { });

        this.ws = null;
        this.audioContext = null;
        this.mediaStream = null;
        this.processor = null;
        this.inputSampleRate = 16000;

        this.nextStartTime = 0;
        this.scheduledAudioDuration = 0;

        this.model = "models/gemini-2.5-flash-native-audio-preview-12-2025";

        this.connect = this.connect.bind(this);
        this.start = this.start.bind(this);
        this.stop = this.stop.bind(this);
        this.handleServerMessage = this.handleServerMessage.bind(this);
    }

    async connect() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) return;

        const host = "generativelanguage.googleapis.com";
        const url = `wss://${host}/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${this.apiKey}`;

        console.log("Voice Agent: Connecting to", this.model);

        try {
            this.ws = new WebSocket(url);
        } catch (e) {
            console.error("WebSocket Creation Failed:", e);
            this.safeStatusChange('error', e.message);
            return;
        }

        this.ws.onopen = () => {
            console.log("Voice Agent: WebSocket Open");
            this.safeStatusChange('connected');
            this.sendSetupMessage();

            setTimeout(() => {
                this.sendTextMessage("¡Hola! (Salúdame y preséntate cortito)");
            }, 100);
        };

        this.ws.onmessage = async (event) => {
            try {
                let response;
                if (event.data instanceof Blob) {
                    response = JSON.parse(await event.data.text());
                } else {
                    response = JSON.parse(event.data);
                }
                this.handleServerMessage(response);
            } catch (e) {
                console.error("Message Parse Error:", e);
            }
        };

        this.ws.onerror = (error) => {
            console.error("Voice Agent: WebSocket Error", error);
            this.safeStatusChange('error', 'WebSocket Error');
        };

        this.ws.onclose = (event) => {
            console.log("Voice Agent: Disconnected", event.code, event.reason);
            this.safeStatusChange('disconnected', event.reason || "Desconectado");
            this.stopAudio();
        };
    }

    safeStatusChange(status, detail) {
        if (this.onStatusChange) this.onStatusChange(status, detail);
    }

    sendSetupMessage() {
        const setup = {
            setup: {
                model: this.model,
                generationConfig: {
                    responseModalities: ["AUDIO"],
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: {
                                voiceName: "Aoede"
                            }
                        }
                    }
                },
                systemInstruction: {
                    parts: [{
                        text: `Eres la asistente virtual de "La Vecindad del Perro", un spa y salón de belleza para mascotas en Lima, Perú.
                        
                        TU PERSONALIDAD:
                        - SÚPER NATURAL y HUMANA: Habla como una persona real, no como un robot. Usa conectores naturales ("Mira", "Te cuento", "Claro").
                        - CÁLIDA Y AMIGABLE: Eres dulce y cercana, amas a las mascotas.
                        - EXPLICATIVA: Cuando hables de precios, destaca los beneficios.
                        
                        INFORMACIÓN OFICIAL:
                        
                        1. SERVICIOS Y PRECIOS:
                           - Baño Completo: S/ 20 (incluye shampoo premium, secado y cepillado)
                           - Corte de Pelo: S/ 25 (según raza o estilo personalizado)
                           - Grooming Completo: S/ 40 (baño + corte + limpieza de oídos y uñas)
                           - Spa Relax: S/ 50 (tratamiento de aromaterapia y masajes)
                           - Limpieza Dental: S/ 20
                           
                        2. HORARIOS:
                           - Atendemos de 7:00 AM a 8:00 PM, todos los días.
                           
                        3. UBICACIÓN:
                           - Estamos en Mz P1 Lote 26, Montenegro, San Juan de Lurigancho.
                           
                        4. CONTACTO:
                           - Para agendar citas, escríbenos al WhatsApp: 970 716 064
                           
                        TU OBJETIVO:
                        - Si preguntan precios: Explica las opciones con entusiasmo.
                        - Si quieren agendar: Dales el WhatsApp.
                        - SUENA RELAJADA: Usa frases como "¡Claro que sí!", "Te cuento", "No te preocupes".
                        - Responde BREVE, máximo 2 oraciones.
                        `
                    }]
                }
            }
        };
        this.ws.send(JSON.stringify(setup));
    }

    sendTextMessage(text) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            const msg = {
                clientContent: {
                    turns: [{
                        role: "user",
                        parts: [{ text: text }]
                    }],
                    turnComplete: true
                }
            };
            this.ws.send(JSON.stringify(msg));
        }
    }

    async start() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            alert("Tu navegador no soporta grabación de audio.");
            return;
        }

        try {
            // Mobile detection: simple check for common mobile user agents
            const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

            // On mobile, let the browser choose the native sample rate to avoid audio glitches.
            // On desktop, force 16000Hz as it works well with Gemini.
            const audioConfig = isMobile ? {} : { sampleRate: 16000 };

            this.audioContext = new (window.AudioContext || window.webkitAudioContext)(audioConfig);

            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }

            // Diagnostic BEEP (Keep it for verification)
            try {
                const osc = this.audioContext.createOscillator();
                const gain = this.audioContext.createGain();
                osc.connect(gain);
                gain.connect(this.audioContext.destination);
                osc.frequency.value = 880;
                gain.gain.value = 0.1;
                osc.start();
                osc.stop(this.audioContext.currentTime + 0.1);
            } catch (e) {
                console.log("Diagnostic beep failed:", e);
            }

            this.mediaStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount: 1,
                    sampleRate: 16000
                }
            });

            this.connect();
            this.startRecording();

        } catch (error) {
            console.error("Error starting audio context:", error);
            // Fallback for Safari/Legacy if needed
        }
    }

    startRecording() {
        if (!this.audioContext) return;

        // Create script processor for audio input
        this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

        const source = this.audioContext.createMediaStreamSource(this.mediaStream);
        source.connect(this.processor);
        this.processor.connect(this.audioContext.destination);

        this.processor.onaudioprocess = (e) => {
            if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

            const inputData = e.inputBuffer.getChannelData(0);
            this.calculateAudioLevel(inputData); // Calculate level from original input

            // DOWNSAMPLING LOGIC:
            // If AudioContext is running at native rate (e.g. 48000Hz on mobile)
            // we MUST downsample to 16000Hz before sending to Gemini.
            // Otherwise, Gemini will hear everything 3x faster ("chipmunk effect").

            let audioToSend = inputData;
            const currentSampleRate = this.audioContext.sampleRate;
            const targetSampleRate = 16000;

            if (currentSampleRate > targetSampleRate) {
                audioToSend = this.downsampleBuffer(inputData, currentSampleRate, targetSampleRate);
            }

            const pcmData = this.floatTo16BitPCM(audioToSend);
            const base64Audio = this.arrayBufferToBase64(pcmData);

            const audioMessage = {
                realtimeInput: {
                    mediaChunks: [{
                        mimeType: "audio/pcm",
                        data: base64Audio
                    }]
                }
            };

            this.ws.send(JSON.stringify(audioMessage));
        };
    }

    downsampleBuffer(buffer, inputRate, outputRate) {
        if (outputRate >= inputRate) {
            return buffer;
        }

        const sampleRatio = inputRate / outputRate;
        const newLength = Math.round(buffer.length / sampleRatio);
        const result = new Float32Array(newLength);

        for (let i = 0; i < newLength; i++) {
            const originalIndex = Math.round(i * sampleRatio);
            result[i] = buffer[originalIndex] || 0;
        }

        return result;
    }

    calculateAudioLevel(inputData) {
        let sum = 0;
        for (let i = 0; i < inputData.length; i += 4) {
            sum += inputData[i] * inputData[i];
        }
        const rms = Math.sqrt(sum / (inputData.length / 4));
        this.onAudioLevel(rms);
    }

    handleServerMessage(response) {
        const content = response.serverContent;
        if (content && content.modelTurn && content.modelTurn.parts) {
            for (const part of content.modelTurn.parts) {
                if (part.text) {
                    this.onResponseText(part.text);
                } else if (part.inlineData && part.inlineData.mimeType.startsWith("audio/pcm")) {
                    this.playAudioChunk(part.inlineData.data);
                }
            }
        }
    }

    async playAudioChunk(base64Data) {
        if (!this.audioContext) return;

        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }

        const audioData = this.base64ToArrayBuffer(base64Data);
        const float32 = this.pcm16ToFloat32(audioData);

        const buffer = this.audioContext.createBuffer(1, float32.length, 24000);
        buffer.getChannelData(0).set(float32);

        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(this.audioContext.destination);

        const currentTime = this.audioContext.currentTime;

        if (this.nextStartTime < currentTime) {
            this.nextStartTime = currentTime + 0.05;
        }

        source.start(this.nextStartTime);
        this.nextStartTime += buffer.duration;
    }

    stop() {
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
            this.mediaStream = null;
        }
        if (this.processor) {
            this.processor.disconnect();
            this.processor = null;
        }
        if (this.ws) {
            this.ws.close(1000, "User stopped");
            this.ws = null;
        }
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        this.nextStartTime = 0;
        this.safeStatusChange('disconnected');
    }

    stopAudio() {
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
        }
    }

    floatTo16BitPCM(output, offset = 0) {
        const buffer = new ArrayBuffer(output.length * 2);
        const view = new DataView(buffer);
        for (let i = 0; i < output.length; i++, offset += 2) {
            let s = Math.max(-1, Math.min(1, output[i]));
            view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        }
        return buffer;
    }

    pcm16ToFloat32(buffer) {
        const view = new DataView(buffer);
        const float32 = new Float32Array(buffer.byteLength / 2);
        for (let i = 0; i < float32.length; i++) {
            const int16 = view.getInt16(i * 2, true);
            float32[i] = int16 / 32768;
        }
        return float32;
    }

    arrayBufferToBase64(buffer) {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    base64ToArrayBuffer(base64) {
        const binaryString = atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    }
}

window.VoiceClient = VoiceClient;
