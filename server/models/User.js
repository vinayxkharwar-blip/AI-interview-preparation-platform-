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
      default: 'Software Engineer',
    },
  },
  { timestamps: true }
);

export default mongoose.model('User', userSchema);
