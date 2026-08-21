import mongoose from 'mongoose';

const resumeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    fileType: {
      type: String,
      enum: ['pdf', 'docx'],
      required: true,
    },
    rawText: {
      type: String,
      required: true,
    },
    parsedData: {
      skills: [{ type: String }],
      experience: [
        {
          title: String,
          company: String,
          duration: String,
          highlights: [String],
        },
      ],
      projects: [
        {
          name: String,
          description: String,
          techStack: [String],
        },
      ],
      targetRole: String,
      summary: String,
    },
  },
  { timestamps: true }
);

export default mongoose.model('Resume', resumeSchema);
