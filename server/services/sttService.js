import fs from 'fs';
import { openaiClient } from '../config/openai.js';

export const transcribeAudio = async (filePath) => {
  if (!openaiClient) {
    return '';
  }

  try {
    const fileStream = fs.createReadStream(filePath);
    const transcription = await openaiClient.audio.transcriptions.create({
      file: fileStream,
      model: 'whisper-1',
      language: 'en',
    });

    return (transcription.text || '').trim();
  } catch (error) {
    console.error('[STT Service Error]', error.message);
    return '';
  }
};
