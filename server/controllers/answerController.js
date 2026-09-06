import Answer from '../models/Answer.js';
import Question from '../models/Question.js';
import Feedback from '../models/Feedback.js';
import { transcribeAudio } from '../services/sttService.js';
import { generateLLMJson } from '../services/llmService.js';
import { buildAnswerFeedbackPrompt } from '../prompts/feedbackPrompts.js';
import { memoryQuestions, memoryAnswers, memoryFeedback } from './sessionController.js';
import fs from 'fs';

// @desc Transcribe audio before user confirmation
// @route POST /api/answers/transcribe
export const transcribeAnswerAudio = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No audio file provided for transcription.' });
    }

    let transcript = '';
    try {
      transcript = await transcribeAudio(req.file.path);
    } finally {
      if (req.file && req.file.path) {
        fs.unlink(req.file.path, (unlinkErr) => {
          if (unlinkErr) {
            console.error('[Audio Cleanup Warning] Could not delete temp file:', unlinkErr.message);
          }
        });
      }
    }

    res.json({
      transcript,
      audioUrl: `/uploads/${req.file.filename}`,
    });
  } catch (error) {
    console.error('[Transcribe Error]', error);
    res.status(500).json({ message: error.message || 'Failed to transcribe audio file.' });
  }
};

// @desc Submit answer & trigger LLM feedback grading
// @route POST /api/answers/submit
export const submitAnswer = async (req, res) => {
  try {
    const { sessionId, questionId, transcript, answerType = 'text', audioUrl = '' } = req.body;

    if (!sessionId || !questionId || !transcript) {
      return res.status(400).json({ message: 'Session ID, Question ID, and transcript text are required.' });
    }

    // 1. Fetch Question details
    let question = null;
    try {
      question = await Question.findById(questionId);
    } catch (e) {
      console.log('[Answer Controller DB Notice] Question lookup fallback:', e.message);
    }

    if (!question) {
      question = memoryQuestions.find((q) => String(q._id) === String(questionId) || String(q.id) === String(questionId));
    }

    const questionText = question ? question.questionText : 'Interview Question';
    const category = question ? question.category : 'General';
    const expectedKeyPoints = question ? question.expectedKeyPoints : [];

    // 2. Save Answer
    let savedAnswer;
    try {
      savedAnswer = await Answer.create({
        session: sessionId,
        question: questionId,
        user: req.user._id,
        transcript,
        answerType,
        audioUrl,
      });
    } catch (e) {
      savedAnswer = {
        _id: 'ans-' + Date.now(),
        session: sessionId,
        question: questionId,
        user: req.user._id,
        transcript,
        answerType,
        audioUrl,
        createdAt: new Date(),
      };
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

    const scoreToSave = typeof fbLLMResult?.score === 'number' ? fbLLMResult.score : 7;
    const strengthsToSave = Array.isArray(fbLLMResult?.strengths) && fbLLMResult.strengths.length > 0
      ? fbLLMResult.strengths
      : ['Demonstrated clear effort in structuring response'];
    const weaknessesToSave = Array.isArray(fbLLMResult?.weaknesses) && fbLLMResult.weaknesses.length > 0
      ? fbLLMResult.weaknesses
      : ['Could expand on technical trade-offs and edge-case handling'];
    const suggestionToSave = fbLLMResult?.suggestion || fbLLMResult?.actionableFeedback || 'Practice structured communication using concrete examples.';
    const categoryToSave = fbLLMResult?.category || category;

    // 4. Save Feedback
    let savedFeedback;
    try {
      savedFeedback = await Feedback.create({
        answer: savedAnswer._id,
        session: sessionId,
        score: scoreToSave,
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
        strengths: strengthsToSave,
        weaknesses: weaknessesToSave,
        suggestion: suggestionToSave,
        category: categoryToSave,
      };
    }

    memoryFeedback.push(savedFeedback);

    res.status(201).json({
      answer: savedAnswer,
      feedback: savedFeedback,
    });
  } catch (error) {
    console.error('[Submit Answer Error]', error);
    res.status(500).json({ message: error.message || 'Failed to analyze candidate answer.' });
  }
};
