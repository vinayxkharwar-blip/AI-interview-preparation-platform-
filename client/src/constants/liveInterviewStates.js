export const STATES = {
  IDLE: 'idle',
  GENERATING_QUESTION: 'generating_question',
  ASKING: 'asking', // alias for generating_question
  SPEAKING: 'speaking',
  LISTENING: 'listening',
  TRANSCRIBING: 'transcribing',
  PROCESSING: 'processing', // alias for transcribing
  SUBMITTING_ANSWER: 'submitting_answer',
  EVALUATING: 'evaluating',
  GENERATING_NEXT_QUESTION: 'generating_next_question',
  NEXT_QUESTION: 'next_question', // alias for generating_next_question
  COMPLETED: 'completed',
  ERROR: 'error',
};
