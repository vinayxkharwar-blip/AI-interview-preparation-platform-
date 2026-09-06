import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

/**
 * Wraps raw 16-bit mono PCM buffer in a standard 44-byte RIFF/WAVE header
 * so browsers can play it natively via <audio> or Web Audio API.
 */
export const pcmToWav = (pcmBuffer, sampleRate = 24000, numChannels = 1, bitDepth = 16) => {
  const header = Buffer.alloc(44);
  const dataLength = pcmBuffer.length;
  const fileLength = dataLength + 36;
  const byteRate = (sampleRate * numChannels * bitDepth) / 8;
  const blockAlign = (numChannels * bitDepth) / 8;

  // RIFF identifier
  header.write('RIFF', 0);
  header.writeUInt32LE(fileLength, 4);
  header.write('WAVE', 8);

  // "fmt " chunk
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // subchunk1 size
  header.writeUInt16LE(1, 20);  // PCM format = 1
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitDepth, 34);

  // "data" chunk
  header.write('data', 36);
  header.writeUInt32LE(dataLength, 40);

  return Buffer.concat([header, pcmBuffer]);
};

/**
 * Synthesizes high-quality voice using Gemini TTS preview models.
 * Returns base64 WAV data that plays natively in any modern browser.
 * 
 * Available Gemini voices: Puck, Charon, Kore, Fenrir, Aoede
 * Default voice for interviewer "Alex": "Puck" (clear, professional, natural cadence)
 */
export const synthesizeGeminiSpeech = async (text, voiceName = 'Puck') => {
  const apiKey = (process.env.GEMINI_API_KEY || process.env.Gemini_API_KEY || '').trim();
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    throw new Error('GEMINI_API_KEY is not configured for TTS synthesis.');
  }

  const cleanText = (text || '').trim();
  if (!cleanText) {
    throw new Error('No text provided for TTS synthesis.');
  }

  const candidateModels = [
    'gemini-2.5-flash-preview-tts',
    'gemini-3.1-flash-tts-preview',
  ];

  let lastError = null;

  for (const model of candidateModels) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const payload = {
        contents: [
          {
            parts: [{ text: cleanText }],
          },
        ],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName,
              },
            },
          },
        },
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errBody = await res.text().catch(() => '');
        throw new Error(`Gemini TTS HTTP ${res.status}: ${errBody.substring(0, 200)}`);
      }

      const data = await res.json();
      const inlineData = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData;

      if (!inlineData || !inlineData.data) {
        throw new Error(`Model ${model} response did not contain audio inlineData.`);
      }

      // Convert raw PCM to standard playable WAV
      const pcmBuffer = Buffer.from(inlineData.data, 'base64');
      const wavBuffer = pcmToWav(pcmBuffer, 24000);

      return {
        audioBase64: wavBuffer.toString('base64'),
        mimeType: 'audio/wav',
        model,
        voiceName,
      };
    } catch (err) {
      console.warn(`[Gemini TTS Notice] Model ${model} synthesis notice:`, err.message);
      lastError = err;
    }
  }

  throw lastError || new Error('All Gemini TTS models failed to synthesize audio.');
};
