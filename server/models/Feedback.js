import mongoose from 'mongoose';

const feedbackSchema = new mongoose.Schema(
  {
    answer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Answer',
      required: true,
    },
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session',
      required: true,
    },
    score: {
      type: Number,
      min: 1,
      max: 10,
      default: null,
    },
    evaluationStatus: {
      type: String,
      enum: ['PENDING', 'COMPLETED', 'FAILED'],
      default: 'COMPLETED',
      index: true,
    },
    evaluationSource: {
      type: String,
      enum: ['openai', 'mock', 'heuristic', 'none'],
      default: 'openai',
    },
    evaluationError: {
      type: String,
      default: '',
    },
    strengths: [{ type: String }],
    weaknesses: [{ type: String }],
    suggestion: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      default: 'General',
    },
  },
  { timestamps: true }
);

feedbackSchema.index({ session: 1 });
feedbackSchema.index({ answer: 1 });

export default mongoose.model('Feedback', feedbackSchema);
