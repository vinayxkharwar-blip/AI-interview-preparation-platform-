import mongoose from 'mongoose';
import Application from '../models/Application.js';
import { checkOwnership } from '../utils/authz.js';

// Memory fallback store
export const memoryApplications = [];

// @desc Log a new job application
// @route POST /api/applications
export const createApplication = async (req, res) => {
  try {
    const { jobId, title, company, logo, location, status = 'applied', notes, applyUrl } = req.body;

    if (!jobId || !title || !company) {
      return res.status(400).json({ message: 'jobId, title, and company are required.' });
    }

    let applicationDoc = null;
    if (mongoose.connection.readyState === 1) {
      try {
        applicationDoc = await Application.create({
          user: req.user._id,
          jobId,
          title,
          company,
          logo: logo || '',
          location: location || 'Remote',
          status,
          notes: notes || '',
          applyUrl: applyUrl || '',
          appliedDate: new Date(),
        });
      } catch (e) {
        console.log('[Application DB Fallback]', e.message);
      }
    }

    if (!applicationDoc) {
      applicationDoc = {
        _id: 'app-' + Date.now(),
        user: req.user._id,
        jobId,
        title,
        company,
        logo: logo || '',
        location: location || 'Remote',
        status,
        notes: notes || '',
        applyUrl: applyUrl || '',
        appliedDate: new Date(),
        createdAt: new Date(),
      };
      memoryApplications.push(applicationDoc);
    }

    res.status(201).json({ message: 'Application logged successfully!', application: applicationDoc });
  } catch (error) {
    console.error('[Create Application Error]', error);
    res.status(500).json({ message: error.message || 'Failed to record application.' });
  }
};

// @desc Get all applications for current user
// @route GET /api/applications
export const getUserApplications = async (req, res) => {
  try {
    let applications = [];
    if (mongoose.connection.readyState === 1) {
      try {
        applications = await Application.find({ user: req.user._id }).sort({ appliedDate: -1 });
      } catch (e) {
        console.log('[Get Applications DB Notice]', e.message);
      }
    }

    if (applications.length === 0) {
      applications = memoryApplications.filter((app) => String(app.user) === String(req.user._id));
    }

    res.json(applications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Update job application status
// @route PATCH /api/applications/:id
export const updateApplicationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const validStatuses = ['applied', 'pending', 'interview', 'rejected', 'offer'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    let application = null;
    if (mongoose.connection.readyState === 1 && mongoose.Types.ObjectId.isValid(id)) {
      try {
        application = await Application.findById(id);
        if (application) {
          if (!checkOwnership(application, req.user)) {
            return res.status(403).json({ message: 'Forbidden: You do not own this application record.' });
          }
          if (status) application.status = status;
          if (notes !== undefined) application.notes = notes;
          await application.save();
          return res.json({ message: 'Application updated successfully!', application });
        }
      } catch (e) {
        console.log('[Update Application DB Notice]', e.message);
      }
    }

    // Memory fallback
    const memApp = memoryApplications.find(
      (app) => (String(app._id) === String(id) || String(app.id) === String(id)) && String(app.user) === String(req.user._id)
    );

    if (memApp) {
      if (status) memApp.status = status;
      if (notes !== undefined) memApp.notes = notes;
      return res.json({ message: 'Application updated successfully!', application: memApp });
    }

    res.status(404).json({ message: 'Application record not found.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
