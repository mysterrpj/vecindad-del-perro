# Guía de Implementación Correcta: Agente de Voz Gemini (Modelo Experimental)

Esta guía documenta la configuración específica necesaria para utilizar el modelo de audio nativo `gemini-2.5-flash-native-audio-preview-12-2025` sin errores de conexión (Error 1008).

## 1. El Modelo Específico

Utiliza exactamente este nombre de modelo (o la versión pública equivalente si cambia):
```javascript
const MODEL_NAME = "models/gemini-2.5-flash-native-audio-preview-12-2025";
```

## 2. Configuración Crítica (Evitar Error 1008)

El error **1008 (Policy Violation)** ocurre principalmente por una configuración incorrecta en la solicitud inicial (`setup`).

### ❌ Lo que NO debes hacer:
**NUNCA** solicites la modalidad `TEXT` junto con `AUDIO` para este modelo específico.
```javascript
// ESTO PROVOCA ERROR 1008 CON ESTE MODELO
responseModalities: ["AUDIO", "TEXT"] 
```

### ✅ La Configuración Correcta:
Solicita **únicamente** `AUDIO`. El modelo está optimizado para latencia ultra-baja y solo devuelve audio PCM.
```javascript
generationConfig: {
    responseModalities: ["AUDIO"], // SOLO AUDIO
    speechConfig: {
        voiceConfig: {
            prebuiltVoiceConfig: {
                voiceName: "Aoede" // O las voces disponibles (Puck, Charon, Kore, Fenrir)
            }
        }
    }
}
```

## 3. Configuración de API Key (Seguridad)

Para que funcione en producción (Firebase Hosting) sin exponer tu clave a abusos, debes configurarla así en [Google Cloud Console](https://console.cloud.google.com/apis/credentials):

1.  **Restricciones de Aplicación (Referrers):**
    *   Selecciona "Sitios web (HTTP referrers)".
    *   Agrega tu dominio de producción Y el de firebase:
        *   `https://tu-proyecto.web.app/*`
        *   `https://tu-proyecto.firebaseapp.com/*`
    *   (Opcional para desarrollo local): `http://localhost:*`

2.  **Restricciones de API:**
    *   En la lista de APIs permitidas, asegúrate de marcar **"Generative Language API"**.
    *   Si no está marcada, la conexión fallará (a veces con 1008 o 403).

## 4. URL de Conexión WebSocket

Asegúrate de usar la versión correcta de la API en la URL (actualmente `v1alpha` para modelos experimentales):

```javascript
const host = "generativelanguage.googleapis.com";
const url = `wss://${host}/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${API_KEY}`;
```

## 5. Compatibilidad con Móviles (Audio Bidireccional)

Los navegadores móviles (iOS/Android) tienen limitaciones con el audio que no existen en PC.

### El Problema
- Los celulares usan internamente **48,000 Hz** (o 44,100 Hz).
- Si fuerzas `AudioContext({ sampleRate: 16000 })`, el audio de **salida** puede quedar mudo o distorsionado.
- Si usas la frecuencia nativa del celular sin conversión, Gemini recibe audio a 48k pero espera 16k, causando el **"efecto ardilla"** (voz acelerada ininteligible).

### ✅ La Solución (Híbrida)
```javascript
// 1. Detectar dispositivo
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

// 2. Configurar AudioContext
const audioConfig = isMobile ? {} : { sampleRate: 16000 };
this.audioContext = new (window.AudioContext || window.webkitAudioContext)(audioConfig);

// 3. Downsample antes de enviar a Gemini (solo si es necesario)
if (this.audioContext.sampleRate > 16000) {
    audioToSend = this.downsampleBuffer(inputData, this.audioContext.sampleRate, 16000);
}

// 4. Función de downsampling
downsampleBuffer(buffer, inputRate, outputRate) {
    const ratio = inputRate / outputRate;
    const newLength = Math.round(buffer.length / ratio);
    const result = new Float32Array(newLength);
    for (let i = 0; i < newLength; i++) {
        result[i] = buffer[Math.round(i * ratio)] || 0;
    }
    return result;
}
```

### Importante: Caché del Navegador
Después de desplegar cambios, el navegador móvil puede seguir usando la versión vieja. **Cierra el navegador completamente** y reabre la página para forzar la descarga del código nuevo.

---

## Resumen de Solución de Problemas

| Error | Causa Probable | Solución |
|-------|---|---|
| **1008 (Policy Violation)** | `responseModalities` incluye "TEXT" | Cambiar a `["AUDIO"]` solamente. |
| **1008 (Policy Violation)** | API Key restringida incorrectamente | Añadir el dominio en Google Cloud Console. |
| **404 (Not Found)** | Nombre del modelo incorrecto | Verificar `MODEL_NAME` exacto. |
| **Connection Closed inmediately** | Formato de JSON `setup` inválido | Revisar estructura `setup > model > generationConfig`. |
| **Móvil: No se escucha la voz** | `sampleRate: 16000` forzado en móvil | Usar frecuencia nativa + downsampling. |
| **Móvil: Gemini no entiende** | Audio enviado a 48k en vez de 16k | Aplicar `downsampleBuffer()` antes de enviar. |
| **Cambios no se reflejan** | Caché del navegador móvil | Cerrar navegador completamente y reabrir. |
