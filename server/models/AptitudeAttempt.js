import mongoose from 'mongoose';

const attemptQuestionSchema = new mongoose.Schema(
  {
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AptitudeQuestion',
      required: true,
    },
    questionText: { type: String, required: true },
    options: [{ type: String }],
    topic: { type: String, required: true },
    subtopic: { type: String, default: '' },
    difficulty: { type: String, default: 'Medium' },
    company: { type: String, default: '' },
    examYear: { type: Number, default: null },
    sourceUrl: { type: String, default: '' },
    sourceTitle: { type: String, default: '' },
    userAnswer: { type: String, default: null },
    isAnswered: { type: Boolean, default: false },
    isFlagged: { type: Boolean, default: false },
    isCorrect: { type: Boolean, default: false },
    correctAnswer: { type: String, default: null }, // Revealed strictly upon submission
    explanation: { type: String, default: '' },     // Revealed strictly upon submission
  },
  { _id: false }
);

const topicBreakdownSchema = new mongoose.Schema(
  {
    topic: { type: String, required: true },
    total: { type: Number, default: 0 },
    correct: { type: Number, default: 0 },
    incorrect: { type: Number, default: 0 },
    unanswered: { type: Number, default: 0 },
    score: { type: Number, default: 0 },
    accuracy: { type: Number, default: 0 },
  },
  { _id: false }
);

const aptitudeAttemptSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    company: {
      type: String,
      default: null,
      index: true,
    },
    examName: {
      type: String,
      default: '',
    },
    examYear: {
      type: Number,
      default: null,
    },
    topic: {
      type: String,
      default: 'All Topics',
    },
    difficulty: {
      type: String,
      default: 'Medium',
    },
    testMode: {
      type: String,
      enum: ['full_mock', 'topic_practice'],
      default: 'full_mock',
    },
    isVerifiedPYQTest: {
      type: Boolean,
      default: true,
    },
    negativeMarking: {
      type: Number,
      default: 0.25, // -0.25 for incorrect answer
      min: 0,
      max: 1.0,
    },
    marksPerQuestion: {
      type: Number,
      default: 1.0,
    },
    timeLimitMinutes: {
      type: Number,
      default: 15,
    },
    timeSpentSeconds: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['in_progress', 'completed', 'timed_out', 'abandoned'],
      default: 'in_progress',
      index: true,
    },
    questions: [attemptQuestionSchema],
    totalQuestions: {
      type: Number,
      default: 0,
    },
    totalAttempted: {
      type: Number,
      default: 0,
    },
    totalCorrect: {
      type: Number,
      default: 0,
    },
    totalIncorrect: {
      type: Number,
      default: 0,
    },
    totalUnanswered: {
      type: Number,
      default: 0,
    },
    rawScore: {
      type: Number,
      default: 0,
    },
    maxScore: {
      type: Number,
      default: 0,
    },
    percentage: {
      type: Number,
      default: 0,
    },
    passed: {
      type: Boolean,
      default: false,
    },
    topicBreakdown: [topicBreakdownSchema],
    weakTopics: [{ type: String }],
    strongTopics: [{ type: String }],
    recommendations: [{ type: String }],
    startedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

aptitudeAttemptSchema.index({ user: 1, createdAt: -1 });
aptitudeAttemptSchema.index({ user: 1, company: 1 });

export default mongoose.model('AptitudeAttempt', aptitudeAttemptSchema);
