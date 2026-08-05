import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema(
  {
    jobId: {
      type: String,
      required: true,
      unique: true,
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
      default: '$100k - $140k',
    },
    jobType: {
      type: String,
      default: 'Full-time',
    },
    experience: {
      type: String,
      default: 'Mid Level',
    },
    description: {
      type: String,
      required: true,
    },
    skills: [
      {
        type: String,
      },
    ],
    applyUrl: {
      type: String,
      required: true,
    },
    source: {
      type: String,
      default: 'Internal',
    },
  },
  { timestamps: true }
);

export default mongoose.model('Job', jobSchema);
