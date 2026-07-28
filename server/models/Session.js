import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    resume: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resume',
    },
    targetRole: {
      type: String,
      required: true,
    },
    interviewType: {
      type: String,
      enum: ['technical', 'hr', 'behavioral'],
      default: 'technical',
    },
    difficulty: {
      type: String,
      enum: ['junior', 'mid', 'senior', 'lead'],
      default: 'mid',
    },
    totalQuestions: {
      type: Number,
      default: 5,
    },
    status: {
      type: String,
      enum: ['in_progress', 'completed'],
      default: 'in_progress',
    },
    overallScore: {
      type: Number,
      default: 0,
    },
    categoryBreakdown: [
      {
        category: String,
        score: Number,
      },
    ],
    focusTopic: {
      type: String,
      default: null,
    },
    previousScore: {
      type: Number,
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model('Session', sessionSchema);
