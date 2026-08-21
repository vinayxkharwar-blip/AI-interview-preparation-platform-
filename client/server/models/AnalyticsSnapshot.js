import mongoose from 'mongoose';

const analyticsSnapshotSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    totalSessions: {
      type: Number,
      default: 0,
    },
    avgScore: {
      type: Number,
      default: 0,
    },
    skillScores: [
      {
        skill: String,
        score: Number,
      },
    ],
    scoreTrend: [
      {
        date: String,
        score: Number,
      },
    ],
    weakTopics: [
      {
        topic: String,
        frequency: Number,
      },
    ],
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export default mongoose.model('AnalyticsSnapshot', analyticsSnapshotSchema);
