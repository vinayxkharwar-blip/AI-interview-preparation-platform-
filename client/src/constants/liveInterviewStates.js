export const STATES = {
  IDLE: 'idle',
  ASKING: 'asking',       // preparing to speak the question
  SPEAKING: 'speaking',   // AI TTS is playing the question aloud
  LISTENING: 'listening', // mic is live, recording candidate's answer
  PROCESSING: 'processing', // transcribing recorded audio
  EVALUATING: 'evaluating',  // sending transcript to OpenAI for scoring + next question
  NEXT_QUESTION: 'next_question', // brief transition before speaking next question
  COMPLETED: 'completed',
  ERROR: 'error',
};
