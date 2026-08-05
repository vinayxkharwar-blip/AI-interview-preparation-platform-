import mongoose from 'mongoose';

const savedJobSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    jobId: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    company: {
      type: String,
      required: true,
    },
    logo: {
      type: String,
      default: '',
    },
    location: {
      type: String,
      default: 'Remote',
    },
    salary: {
      type: String,
      default: '',
    },
    jobType: {
      type: String,
      default: 'Full-time',
    },
    experience: {
      type: String,
      default: '',
    },
    description: {
      type: String,
      default: '',
    },
    skills: [
      {
        type: String,
      },
    ],
    applyUrl: {
      type: String,
      default: '',
    },
    matchedSkills: [
      {
        type: String,
      },
    ],
    missingSkills: [
      {
        type: String,
      },
    ],
    matchPercentage: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

export default mongoose.model('SavedJob', savedJobSchema);
