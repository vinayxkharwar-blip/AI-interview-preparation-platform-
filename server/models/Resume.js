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
      atsScore: { type: Number },
      targetRole: { type: String },
      skills: [{ type: String }],
      experience: [
        {
          title: String,
          company: String,
          duration: String,
          highlights: [String],
        },
      ],
      education: [
        {
          degree: String,
          institution: String,
          year: String,
        },
      ],
      projects: [
        {
          name: String,
          description: String,
          techStack: [String],
        },
      ],
      certifications: [{ type: String }],
      strengths: [{ type: String }],
      weaknesses: [{ type: String }],
      summary: String,
    },
  },
  { timestamps: true, strict: false }
);

export default mongoose.model('Resume', resumeSchema);
