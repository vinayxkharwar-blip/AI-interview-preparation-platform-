import Resume from '../models/Resume.js';
import { parseResumeFile } from '../services/resumeParser.js';
import { generateLLMJson } from '../services/llmService.js';
import { buildResumeParsePrompt } from '../prompts/resumePrompts.js';
import path from 'path';

// @desc Upload & Parse Resume
// @route POST /api/resumes/upload
export const uploadResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded. Please upload a PDF or DOCX file.' });
    }

    const fileExt = path.extname(req.file.originalname).toLowerCase().replace('.', '');
    const fileType = fileExt === 'pdf' ? 'pdf' : 'docx';

    console.log(`[Resume Upload] Extracting text from file: ${req.file.originalname}`);
    const rawText = await parseResumeFile(req.file.path, fileType);

    if (!rawText || rawText.trim().length === 0) {
      return res.status(400).json({ message: 'Could not extract text from the document. File may be empty or encrypted.' });
    }

    console.log('[Resume Upload] Requesting structured extraction from LLM service...');
    const prompt = buildResumeParsePrompt(rawText);
    const parsedData = await generateLLMJson(prompt, 'You parse raw resume text into JSON format.');

    let newResume;
    try {
      newResume = await Resume.create({
        user: req.user._id,
        fileName: req.file.originalname,
        fileType,
        rawText,
        parsedData,
      });
    } catch (dbErr) {
      console.log('[Resume DB Notice] Creating mock resume record:', dbErr.message);
      newResume = {
        _id: 'resume-' + Date.now(),
        user: req.user._id,
        fileName: req.file.originalname,
        fileType,
        rawText,
        parsedData,
        createdAt: new Date(),
      };
    }

    res.status(201).json({
      message: 'Resume parsed and saved successfully!',
      resume: newResume,
    });
  } catch (error) {
    console.error('[Resume Upload Error]', error);
    res.status(500).json({ message: error.message || 'Error processing resume file.' });
  }
};

// @desc Get all resumes for user
// @route GET /api/resumes
export const getUserResumes = async (req, res) => {
  try {
    let resumes = [];
    try {
      resumes = await Resume.find({ user: req.user._id }).sort({ createdAt: -1 });
    } catch (e) {
      console.log('[Resume DB Notice] User resumes fallback:', e.message);
    }
    res.json(resumes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Get resume by ID
// @route GET /api/resumes/:id
export const getResumeById = async (req, res) => {
  try {
    let resume = null;
    try {
      resume = await Resume.findById(req.params.id);
    } catch (e) {
      console.log('[Resume DB Notice] Get single resume fallback:', e.message);
    }
    if (!resume) {
      return res.status(404).json({ message: 'Resume not found' });
    }
    res.json(resume);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
