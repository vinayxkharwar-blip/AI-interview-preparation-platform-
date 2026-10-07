import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { openaiClient, isOpenAIConfigured } from '../config/openai.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const VOICE_MAP = {
  puck: 'alloy',
  charon: 'onyx',
  kore: 'nova',
  fenrir: 'echo',
  aoede: 'shimmer',
  alex: 'alloy',
  alloy: 'alloy',
  echo: 'echo',
  fable: 'fable',
  onyx: 'onyx',
  nova: 'nova',
  shimmer: 'shimmer',
};

const resolveVoice = (voiceName = 'alloy') => {
  const normalized = (voiceName || '').trim().toLowerCase();
  return VOICE_MAP[normalized] || 'alloy';
};

/**
 * Synthesizes high-quality speech using OpenAI TTS (tts-1).
 * Returns base64 WAV data that plays natively in any modern browser.
 */
export const synthesizeOpenAISpeech = async (text, voiceName = 'alloy') => {
  if (!isOpenAIConfigured || !openaiClient) {
    throw new Error('OPENAI_API_KEY is not configured for TTS synthesis.');
  }

  const cleanText = (text || '').trim();
  if (!cleanText) {
    throw new Error('No text provided for TTS synthesis.');
  }

  const selectedVoice = resolveVoice(voiceName);
  const ttsStart = Date.now();
  console.log(`[LiveTiming][Server TTS] Starting OpenAI TTS synthesis for ${cleanText.length} chars with voice "${selectedVoice}"`);

  const response = await openaiClient.audio.speech.create({
    model: 'tts-1',
    voice: selectedVoice,
    input: cleanText,
    response_format: 'wav',
  });

  const arrayBuffer = await response.arrayBuffer();
  const wavBuffer = Buffer.from(arrayBuffer);
  const totalElapsedMs = Date.now() - ttsStart;

  console.log(`[LiveTiming][Server TTS] OpenAI TTS completed in ${totalElapsedMs}ms | WAV Size: ${(wavBuffer.length / 1024).toFixed(1)} KB`);

  return {
    audioBase64: wavBuffer.toString('base64'),
    mimeType: 'audio/wav',
    model: 'tts-1',
    voiceName: selectedVoice,
    durationMs: totalElapsedMs,
  };
};

// Backward-compatible alias for any existing callers
export const synthesizeGeminiSpeech = synthesizeOpenAISpeech;
