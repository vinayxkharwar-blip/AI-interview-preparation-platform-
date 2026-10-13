import mongoose from 'mongoose';

const questionAnswerSchema = new mongoose.Schema(
  {
    questionId: { type: String, required: true },
    section: {
      type: String,
      enum: ['quantitative', 'logical', 'verbal'],
      required: true,
    },
    questionText: { type: String, required: true },
    options: [{ type: String }],
    userSelectedOption: { type: String, default: null },
    correctOption: { type: String, required: true },
    isCorrect: { type: Boolean, default: false },
    explanation: { type: String, default: '' },
  },
  { _id: false }
);

const gdMessageSchema = new mongoose.Schema(
  {
    speaker: { type: String, required: true },
    role: {
      type: String,
      enum: ['moderator', 'participant', 'candidate'],
      required: true,
    },
    text: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const placementDriveSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    targetRole: {
      type: String,
      required: true,
      default: 'Full Stack Engineer',
    },
    status: {
      type: String,
      enum: ['in_progress', 'completed', 'failed'],
      default: 'in_progress',
      index: true,
    },
    currentRound: {
      type: Number,
      enum: [1, 2, 3, 4, 5], // 5 = completed all rounds
      default: 1,
    },
    overallScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    rounds: {
      round1_aptitude: {
        status: {
          type: String,
          enum: ['locked', 'unlocked', 'in_progress', 'completed', 'failed'],
          default: 'unlocked',
        },
        attempts: { type: Number, default: 0 },
        maxAttempts: { type: Number, default: 3 },
        passThreshold: { type: Number, default: 60 }, // 60%
        score: { type: Number, default: 0 },
        passed: { type: Boolean, default: false },
        timeSpentSeconds: { type: Number, default: 0 },
        breakdown: {
          quantitative: {
            score: { type: Number, default: 0 },
            total: { type: Number, default: 5 },
          },
          logical: {
            score: { type: Number, default: 0 },
            total: { type: Number, default: 5 },
          },
          verbal: {
            score: { type: Number, default: 0 },
            total: { type: Number, default: 5 },
          },
        },
        questions: [questionAnswerSchema],
        feedback: { type: String, default: '' },
        completedAt: { type: Date, default: null },
      },

      round2_technical: {
        status: {
          type: String,
          enum: ['locked', 'unlocked', 'in_progress', 'completed', 'failed'],
          default: 'locked',
        },
        attempts: { type: Number, default: 0 },
        maxAttempts: { type: Number, default: 3 },
        passThreshold: { type: Number, default: 60 },
        sessionId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Session',
          default: null,
        },
        score: { type: Number, default: 0 },
        passed: { type: Boolean, default: false },
        categoryBreakdown: [
          {
            category: String,
            score: Number,
          },
        ],
        feedback: {
          strengths: [{ type: String }],
          weaknesses: [{ type: String }],
          summary: { type: String, default: '' },
        },
        completedAt: { type: Date, default: null },
      },

      round3_gd: {
        status: {
          type: String,
          enum: ['locked', 'unlocked', 'in_progress', 'completed', 'failed'],
          default: 'locked',
        },
        attempts: { type: Number, default: 0 },
        maxAttempts: { type: Number, default: 3 },
        passThreshold: { type: Number, default: 60 },
        topic: { type: String, default: '' },
        discussionContext: { type: String, default: '' },
        transcript: [gdMessageSchema],
        score: { type: Number, default: 0 },
        passed: { type: Boolean, default: false },
        rubrics: {
          clarityAndArticulation: { type: Number, default: 0 },
          problemSolvingAndIdeas: { type: Number, default: 0 },
          collaborationAndListening: { type: Number, default: 0 },
          persuasionAndConfidence: { type: Number, default: 0 },
        },
        feedback: {
          strengths: [{ type: String }],
          weaknesses: [{ type: String }],
          summary: { type: String, default: '' },
        },
        completedAt: { type: Date, default: null },
      },

      round4_resume: {
        status: {
          type: String,
          enum: ['locked', 'unlocked', 'in_progress', 'completed', 'failed'],
          default: 'locked',
        },
        attempts: { type: Number, default: 0 },
        maxAttempts: { type: Number, default: 3 },
        passThreshold: { type: Number, default: 60 },
        resumeId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Resume',
          default: null,
        },
        sessionId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Session',
          default: null,
        },
        score: { type: Number, default: 0 },
        passed: { type: Boolean, default: false },
        categoryBreakdown: [
          {
            category: String,
            score: Number,
          },
        ],
        feedback: {
          strengths: [{ type: String }],
          weaknesses: [{ type: String }],
          summary: { type: String, default: '' },
        },
        completedAt: { type: Date, default: null },
      },
    },
    finalReport: {
      verdict: {
        type: String,
        enum: ['SELECTED', 'RECOMMENDED', 'NEEDS_REFINEMENT', 'IN_PROGRESS', 'FAILED'],
        default: 'IN_PROGRESS',
      },
      readinessScore: { type: Number, default: 0 },
      hiringRecommendation: { type: String, default: '' },
      executiveSummary: { type: String, default: '' },
      roundSummary: [
        {
          roundName: String,
          score: Number,
          status: String,
          passed: Boolean,
        },
      ],
      topStrengths: [{ type: String }],
      areasForImprovement: [{ type: String }],
      generatedAt: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

export default mongoose.model('PlacementDrive', placementDriveSchema);
