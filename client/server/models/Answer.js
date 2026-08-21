import mongoose from 'mongoose';

const answerSchema = new mongoose.Schema(
  {
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session',
      required: true,
    },
    question: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question',
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    transcript: {
      type: String,
      required: true,
    },
    audioUrl: {
      type: String,
      default: '',
    },
    answerType: {
      type: String,
      enum: ['text', 'audio'],
      default: 'text',
    },
  },
  { timestamps: true }
);

export default mongoose.model('Answer', answerSchema);
