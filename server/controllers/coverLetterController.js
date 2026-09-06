import mongoose from 'mongoose';
import CoverLetter from '../models/CoverLetter.js';
import Resume from '../models/Resume.js';
import { generateLLMJson } from '../services/llmService.js';

// Memory fallback store
export const memoryCoverLetters = [];

// @desc Generate tailored AI Cover Letter via OpenAI LLM
// @route POST /api/cover-letter
export const generateCoverLetter = async (req, res) => {
  try {
    const { company, role, jobDescription = '', resumeId } = req.body;

    if (!company || !role) {
      return res.status(400).json({ message: 'Company name and target job role are required.' });
    }

    let resumeText = '';
    let parsedResumeData = null;

    if (resumeId && mongoose.Types.ObjectId.isValid(resumeId)) {
      try {
        const resumeDoc = await Resume.findById(resumeId);
        if (resumeDoc) {
          resumeText = resumeDoc.rawText || '';
          parsedResumeData = resumeDoc.parsedData || null;
        }
      } catch (e) {
        console.log('[Cover Letter Resume DB Notice]', e.message);
      }
    }

    if (!resumeText) {
      // Fetch user's latest resume if not passed
      try {
        const latestResume = await Resume.findOne({ user: req.user._id }).sort({ createdAt: -1 });
        if (latestResume) {
          resumeText = latestResume.rawText || '';
          parsedResumeData = latestResume.parsedData || null;
        }
      } catch (e) {
        console.log('[Cover Letter Latest Resume Notice]', e.message);
      }
    }

    const prompt = `You are a professional executive career strategist and expert technical cover letter writer.
Draft a highly persuasive, customized 3-4 paragraph cover letter for candidate ${req.user.name || 'Candidate'}.

Target Company: ${company}
Target Role: ${role}
Job Description Overview: ${jobDescription || 'Standard software engineering and technical responsibilities.'}

Candidate Profile & Experience Summary:
${resumeText ? resumeText.substring(0, 1500) : `Target Role: ${req.user.targetRole || 'Full Stack Engineer'}, Email: ${req.user.email}`}

Candidate Skills & Strengths: ${JSON.stringify(parsedResumeData?.skills || ['Software Development', 'Problem Solving'])}

Instructions:
1. Address the Hiring Manager at ${company}.
2. Highlight alignment with the target role of ${role}.
3. Reference candidate's core technical skills and project impact.
4. Conclude with a strong, professional call to action for an interview call.
5. Return JSON format:
{
  "coverLetter": "string (full multi-paragraph text with proper line breaks)"
}`;

    const llmResult = await generateLLMJson(prompt, 'You generate personalized technical cover letters.');
    const content = llmResult?.coverLetter || `Dear Hiring Manager at ${company},\n\nI am writing to express my enthusiastic interest in the ${role} position at ${company}. With a strong background in technology, software architecture, and iterative problem solving, I am confident in my ability to contribute immediately to your team's success.\n\nThank you for your time and consideration.\n\nSincerely,\n${req.user.name || 'Candidate'}`;

    let coverLetterDoc = null;
    if (mongoose.connection.readyState === 1) {
      try {
        coverLetterDoc = await CoverLetter.create({
          user: req.user._id,
          company,
          role,
          content,
        });
      } catch (e) {
        console.log('[Cover Letter DB Fallback]', e.message);
      }
    }

    if (!coverLetterDoc) {
      coverLetterDoc = {
        _id: 'cl-' + Date.now(),
        user: req.user._id,
        company,
        role,
        content,
        createdAt: new Date(),
      };
      memoryCoverLetters.push(coverLetterDoc);
    }

    res.status(201).json({
      message: 'Cover letter generated successfully!',
      coverLetter: coverLetterDoc,
    });
  } catch (error) {
    console.error('[Generate Cover Letter Error]', error);
    res.status(500).json({ message: error.message || 'Failed to generate cover letter.' });
  }
};
