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
      required: true,
      min: 1,
      max: 10,
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

export default mongoose.model('Feedback', feedbackSchema);
