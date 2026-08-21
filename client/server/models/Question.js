import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema(
  {
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session',
      required: true,
    },
    questionNumber: {
      type: Number,
      required: true,
    },
    questionText: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    expectedKeyPoints: [{ type: String }],
    hints: [{ type: String }],
  },
  { timestamps: true }
);

export default mongoose.model('Question', questionSchema);
