import fs from 'fs';
import path from 'path';
import { openaiClient, isOpenAIConfigured } from '../config/openai.js';

export const transcribeAudio = async (filePath) => {
  let tempFilePath = null;
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Audio file not found at path: ${filePath}`);
    }

    if (!isOpenAIConfigured || !openaiClient) {
      throw new Error('OpenAI STT is not configured (OPENAI_API_KEY missing).');
    }

    // OpenAI Whisper expects a recognized audio file extension (.webm, .wav, .mp3, etc.)
    const ext = path.extname(filePath).toLowerCase();
    const validAudioExts = ['.webm', '.wav', '.mp3', '.m4a', '.ogg', '.flac', '.mp4'];
    let targetPath = filePath;

    if (!ext || !validAudioExts.includes(ext)) {
      tempFilePath = `${filePath}.webm`;
      fs.copyFileSync(filePath, tempFilePath);
      targetPath = tempFilePath;
    }

    console.log(`[OpenAI STT] Transcribing audio file "${targetPath}" via whisper-1...`);
    const transcription = await openaiClient.audio.transcriptions.create({
      file: fs.createReadStream(targetPath),
      model: 'whisper-1',
    });

    const transcript = (transcription?.text || '').trim();
    console.log(`[OpenAI STT Success] Transcribed ${transcript.length} characters.`);
    return transcript;
  } catch (error) {
    console.error('[OpenAI STT Service Error]', error.message);
    return "Sorry, I couldn't transcribe that answer clearly — could you repeat it?";
  } finally {
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch (cleanupErr) {
        // silent cleanup
      }
    }
  }
};
