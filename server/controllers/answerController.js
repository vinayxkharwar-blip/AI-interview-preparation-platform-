import Answer from '../models/Answer.js';
import Question from '../models/Question.js';
import Feedback from '../models/Feedback.js';
import { transcribeAudio } from '../services/sttService.js';
import { generateLLMJson } from '../services/llmService.js';
import { buildAnswerFeedbackPrompt } from '../prompts/feedbackPrompts.js';
import { memoryQuestions, memoryAnswers, memoryFeedback } from './sessionController.js';
import { checkSessionOwnership } from '../utils/authz.js';
import fs from 'fs';

// @desc Transcribe audio before user confirmation
// @route POST /api/answers/transcribe
export const transcribeAnswerAudio = async (req, res) => {
  const tempPath = req.file?.path;
  try {
    if (!req.file || !tempPath) {
      return res.status(400).json({ message: 'No audio file provided for transcription.' });
    }

    const transcript = await transcribeAudio(tempPath);

    // Audio file is ephemeral and deleted after transcription to protect candidate privacy.
    // We explicitly return audioUrl: null rather than a dead/404 URL.
    return res.json({
      transcript,
      audioUrl: null,
    });
  } catch (error) {
    console.error('[Transcribe Error]', error);
    return res.status(500).json({ message: error.message || 'Failed to transcribe audio file.' });
  } finally {
    if (tempPath) {
      fs.promises.unlink(tempPath).catch((cleanupErr) => {
        if (cleanupErr.code !== 'ENOENT') {
          console.warn('[Audio Cleanup Warning]', cleanupErr.message);
        }
      });
    }
  }
};

// @desc Submit answer & trigger LLM feedback grading
// @route POST /api/answers/submit
export const submitAnswer = async (req, res) => {
  try {
    const { sessionId, questionId, transcript, answerType = 'text', audioUrl = null } = req.body;

    if (!sessionId || !questionId || transcript == null) {
      return res.status(400).json({ message: 'Session ID, Question ID, and transcript text are required.' });
    }

    if (typeof transcript !== 'string' || !transcript.trim()) {
      return res.status(400).json({ message: 'Transcript cannot be empty.' });
    }

    const trimmedTranscript = transcript.trim();
    if (trimmedTranscript.length > 8000) {
      return res.status(400).json({ message: 'Transcript exceeds maximum allowed length of 8000 characters.' });
    }

    // Verify session ownership
    const ownership = await checkSessionOwnership(sessionId, req.user);
    if (!ownership.authorized) {
      return res.status(ownership.status).json({ message: ownership.message });
    }

    // 1. Fetch Question details and verify existence
    let question = null;
    try {
      question = await Question.findById(questionId);
    } catch (e) {
      console.log('[Answer Controller DB Notice] Question lookup fallback:', e.message);
    }

    if (!question) {
      question = memoryQuestions.find((q) => String(q._id) === String(questionId) || String(q.id) === String(questionId));
    }

    if (!question) {
      return res.status(404).json({ message: 'Question not found.' });
    }

    if (question.session && String(question.session) !== String(sessionId)) {
      return res.status(400).json({ message: 'Question does not belong to this session.' });
    }

    const questionText = question.questionText || 'Interview Question';
    const category = question.category || 'General';
    const expectedKeyPoints = question.expectedKeyPoints || [];

    // 2. Save Answer
    let savedAnswer;
    try {
      savedAnswer = await Answer.create({
        session: sessionId,
        question: questionId,
        user: req.user._id,
        transcript: trimmedTranscript,
        answerType,
        audioUrl: audioUrl || null,
      });
    } catch (e) {
      savedAnswer = {
        _id: 'ans-' + Date.now(),
        session: sessionId,
        question: questionId,
        user: req.user._id,
        transcript: trimmedTranscript,
        answerType,
        audioUrl: audioUrl || null,
        createdAt: new Date(),
      };
    }

    if (memoryAnswers.length >= 200) {
      memoryAnswers.shift();
    }
    memoryAnswers.push(savedAnswer);

    // 3. Call LLM for 1-10 scoring & feedback evaluation
    const feedbackPrompt = buildAnswerFeedbackPrompt({
      questionText,
      category,
      expectedKeyPoints,
      candidateAnswer: transcript,
    });

    const fbLLMResult = await generateLLMJson(feedbackPrompt, 'You are an AI interview grading assistant.');

    const isAiSuccess = Boolean(fbLLMResult && fbLLMResult._meta?.source === 'openai');
    const evaluationStatus = isAiSuccess ? 'COMPLETED' : 'FAILED';
    const evaluationSource = isAiSuccess ? 'openai' : (fbLLMResult?._meta?.source || 'mock');
    const evaluationError = isAiSuccess ? '' : (fbLLMResult?._meta?.reason || 'AI evaluation service temporarily unavailable');

    // MOCK RESPONSE SAFETY: Mock scores must NEVER be stored or presented as genuine student scores
    const scoreToSave = isAiSuccess && typeof fbLLMResult?.score === 'number'
      ? Math.min(10, Math.max(1, fbLLMResult.score))
      : null;

    const strengthsToSave = isAiSuccess && Array.isArray(fbLLMResult?.strengths) && fbLLMResult.strengths.length > 0
      ? fbLLMResult.strengths
      : (isAiSuccess ? ['Clear technical articulation'] : []);

    const weaknessesToSave = isAiSuccess && Array.isArray(fbLLMResult?.weaknesses)
      ? fbLLMResult.weaknesses
      : (isAiSuccess ? [] : ['AI evaluation service was temporarily unavailable. Answer preserved for retry.']);

    const suggestionToSave = isAiSuccess
      ? (fbLLMResult?.suggestion || fbLLMResult?.actionableFeedback || 'Practice structured communication using concrete examples.')
      : 'AI grading could not be completed. Your answer is safely saved. Please click "Retry Evaluation" to re-evaluate with the AI grading engine.';

    const categoryToSave = fbLLMResult?.category || category;

    // Update answer evaluationStatus
    try {
      if (savedAnswer && savedAnswer._id) {
        await Answer.findByIdAndUpdate(savedAnswer._id, { evaluationStatus });
      }
    } catch (e) {
      // Memory fallback
    }
    if (savedAnswer) {
      savedAnswer.evaluationStatus = evaluationStatus;
    }

    // 4. Save Feedback
    let savedFeedback;
    try {
      savedFeedback = await Feedback.create({
        answer: savedAnswer._id,
        session: sessionId,
        score: scoreToSave,
        evaluationStatus,
        evaluationSource,
        evaluationError,
        strengths: strengthsToSave,
        weaknesses: weaknessesToSave,
        suggestion: suggestionToSave,
        category: categoryToSave,
      });
    } catch (e) {
      savedFeedback = {
        _id: 'fb-' + Date.now(),
        answer: savedAnswer._id,
        session: sessionId,
        score: scoreToSave,
        evaluationStatus,
        evaluationSource,
        evaluationError,
        strengths: strengthsToSave,
        weaknesses: weaknessesToSave,
        suggestion: suggestionToSave,
        category: categoryToSave,
      };
    }

    if (memoryFeedback.length >= 200) {
      memoryFeedback.shift();
    }
    memoryFeedback.push(savedFeedback);

    res.status(201).json({
      answer: savedAnswer,
      feedback: savedFeedback,
      evaluationStatus,
    });
  } catch (error) {
    console.error('[Submit Answer Error]', error);
    res.status(500).json({ message: error.message || 'Failed to analyze candidate answer.' });
  }
};
