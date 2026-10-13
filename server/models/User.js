import mongoose from 'mongoose';
import validator from 'validator';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: (value) => typeof value === 'string' && validator.isEmail(value.trim()),
        message: 'Please enter a valid email address.',
      },
    },
    password: {
      type: String,
      required: true,
    },
    targetRole: {
      type: String,
      default: 'Full Stack Engineer',
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    headline: {
      type: String,
      default: '',
      trim: true,
      maxLength: 140,
    },
    bio: {
      type: String,
      default: '',
      trim: true,
      maxLength: 600,
    },
    phone: {
      type: String,
      default: '',
      trim: true,
      maxLength: 25,
    },
    location: {
      type: String,
      default: '',
      trim: true,
      maxLength: 100,
    },
    avatar: {
      type: String,
      default: '',
    },
    education: {
      degree: { type: String, default: '', trim: true },
      college: { type: String, default: '', trim: true },
      specialization: { type: String, default: '', trim: true },
      graduationYear: { type: String, default: '', trim: true },
    },
    skills: {
      type: [String],
      default: [],
    },
    careerPreferences: {
      experienceLevel: { type: String, default: 'Mid-Level', trim: true },
      preferredLocation: { type: String, default: 'Remote', trim: true },
      workMode: { type: String, default: 'Hybrid', enum: ['On-site', 'Hybrid', 'Remote'] },
      preferredIndustries: { type: [String], default: [] },
    },
    notificationPreferences: {
      emailAlerts: { type: Boolean, default: true },
      jobMatches: { type: Boolean, default: true },
      interviewReminders: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

export default mongoose.model('User', userSchema);
