import mongoose from 'mongoose';

const improvementPlanSchema = new mongoose.Schema(
  {
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session',
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    focusAreas: [
      {
        topic: { type: String, required: true },
        observation: { type: String, required: true },
        recommendation: { type: String, required: true },
      },
    ],
    overallSummary: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

export default mongoose.model('ImprovementPlan', improvementPlanSchema);
