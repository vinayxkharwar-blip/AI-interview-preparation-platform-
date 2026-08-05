import mongoose from 'mongoose';
import SavedJob from '../models/SavedJob.js';
import Resume from '../models/Resume.js';
import { fetchJobRecommendations } from '../services/jobService.js';
import { checkOwnership } from '../utils/authz.js';

// In-memory fallback stores when MongoDB is offline
export const memorySavedJobs = [];

// @desc Get personalized AI Job Recommendations
// @route GET /api/jobs/recommendations
export const getJobRecommendations = async (req, res) => {
  try {
    const { targetRole, skills, experience, location } = req.query;

    let userTargetRole = targetRole || req.user?.targetRole || 'Full Stack Engineer';
    let userSkills = Array.isArray(skills) ? skills : skills ? skills.split(',') : [];

    // Auto-extract skills and targetRole from user's latest uploaded resume if not passed explicitly
    if (userSkills.length === 0) {
      let latestResume = null;
      if (mongoose.connection.readyState === 1) {
        try {
          latestResume = await Resume.findOne({ user: req.user._id }).sort({ createdAt: -1 });
        } catch (e) {
          console.log('[Job Controller DB Notice]', e.message);
        }
      }

      if (latestResume?.parsedData) {
        userSkills = latestResume.parsedData.skills || [];
        if (!targetRole && latestResume.parsedData.targetRole) {
          userTargetRole = latestResume.parsedData.targetRole;
        }
      }
    }

    const jobs = await fetchJobRecommendations({
      targetRole: userTargetRole,
      skills: userSkills,
      experience,
      location,
    });

    res.json(jobs);
  } catch (error) {
    console.error('[Job Recommendations Error]', error);
    res.status(500).json({ message: error.message || 'Failed to fetch job recommendations.' });
  }
};

// @desc Save a job to user's saved jobs list
// @route POST /api/jobs/save
export const saveJob = async (req, res) => {
  try {
    const {
      jobId,
      title,
      company,
      logo,
      location,
      salary,
      jobType,
      experience,
      description,
      skills,
      applyUrl,
      matchedSkills,
      missingSkills,
      matchPercentage,
    } = req.body;

    if (!jobId || !title || !company) {
      return res.status(400).json({ message: 'jobId, title, and company are required.' });
    }

    let savedJobDoc = null;
    if (mongoose.connection.readyState === 1) {
      try {
        const existing = await SavedJob.findOne({ user: req.user._id, jobId });
        if (existing) {
          return res.status(200).json({ message: 'Job already saved!', savedJob: existing });
        }
        savedJobDoc = await SavedJob.create({
          user: req.user._id,
          jobId,
          title,
          company,
          logo: logo || '',
          location: location || 'Remote',
          salary: salary || '',
          jobType: jobType || 'Full-time',
          experience: experience || '',
          description: description || '',
          skills: skills || [],
          applyUrl: applyUrl || '',
          matchedSkills: matchedSkills || [],
          missingSkills: missingSkills || [],
          matchPercentage: matchPercentage || 85,
        });
      } catch (e) {
        console.log('[Save Job DB Fallback]', e.message);
      }
    }

    if (!savedJobDoc) {
      const existingMem = memorySavedJobs.find(
        (sj) => String(sj.user) === String(req.user._id) && sj.jobId === jobId
      );
      if (existingMem) {
        return res.status(200).json({ message: 'Job already saved!', savedJob: existingMem });
      }

      savedJobDoc = {
        _id: 'sj-' + Date.now(),
        user: req.user._id,
        jobId,
        title,
        company,
        logo: logo || '',
        location: location || 'Remote',
        salary: salary || '',
        jobType: jobType || 'Full-time',
        experience: experience || '',
        description: description || '',
        skills: skills || [],
        applyUrl: applyUrl || '',
        matchedSkills: matchedSkills || [],
        missingSkills: missingSkills || [],
        matchPercentage: matchPercentage || 85,
        createdAt: new Date(),
      };
      memorySavedJobs.push(savedJobDoc);
    }

    res.status(201).json({ message: 'Job saved successfully!', savedJob: savedJobDoc });
  } catch (error) {
    console.error('[Save Job Error]', error);
    res.status(500).json({ message: error.message || 'Failed to save job.' });
  }
};

// @desc Get all saved jobs for user
// @route GET /api/jobs/saved
export const getSavedJobs = async (req, res) => {
  try {
    let savedJobs = [];
    if (mongoose.connection.readyState === 1) {
      try {
        savedJobs = await SavedJob.find({ user: req.user._id }).sort({ createdAt: -1 });
      } catch (e) {
        console.log('[Get Saved Jobs DB Notice]', e.message);
      }
    }

    if (savedJobs.length === 0) {
      savedJobs = memorySavedJobs.filter((sj) => String(sj.user) === String(req.user._id));
    }

    res.json(savedJobs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Remove a saved job
// @route DELETE /api/jobs/save/:id
export const deleteSavedJob = async (req, res) => {
  try {
    const { id } = req.params;
    let savedJob = null;

    if (mongoose.connection.readyState === 1 && mongoose.Types.ObjectId.isValid(id)) {
      try {
        savedJob = await SavedJob.findById(id);
        if (savedJob) {
          if (!checkOwnership(savedJob, req.user)) {
            return res.status(403).json({ message: 'Forbidden: You do not own this saved job record.' });
          }
          await SavedJob.findByIdAndDelete(id);
          return res.json({ message: 'Saved job removed successfully!' });
        }
      } catch (e) {
        console.log('[Delete Saved Job DB Notice]', e.message);
      }
    }

    // Memory fallback
    const memIndex = memorySavedJobs.findIndex(
      (sj) => (String(sj._id) === String(id) || String(sj.id) === String(id)) && String(sj.user) === String(req.user._id)
    );

    if (memIndex !== -1) {
      memorySavedJobs.splice(memIndex, 1);
      return res.json({ message: 'Saved job removed successfully!' });
    }

    res.status(404).json({ message: 'Saved job not found.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
