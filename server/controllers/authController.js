import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../models/User.js';
import validator from 'validator';
import { sanitizeRole } from '../utils/roleSanitizer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

// Startup check for JWT_SECRET
if (!process.env.JWT_SECRET) {
  throw new Error('FATAL: process.env.JWT_SECRET is missing or undefined! Server cannot start without a configured JWT_SECRET.');
}

export const memoryUsers = [];

export const generateToken = (id, name, email, targetRole, role = 'user') => {
  const secret = process.env.JWT_SECRET;
  return jwt.sign(
    { id, name, email, targetRole, role },
    secret,
    { expiresIn: '7d' }
  );
};

export const formatUser = (u) => {
  if (!u) return null;
  const userId = u._id ? u._id.toString() : (u.id || u._id);
  return {
    id: userId,
    _id: userId,
    name: u.name || 'User',
    email: u.email || '',
    role: u.role || 'user',
    targetRole: u.targetRole || 'Full Stack Engineer',
    headline: u.headline || '',
    bio: u.bio || '',
    phone: u.phone || '',
    location: u.location || '',
    avatar: u.avatar || '',
    education: u.education || {
      degree: '',
      college: '',
      specialization: '',
      graduationYear: '',
    },
    skills: Array.isArray(u.skills) ? u.skills : [],
    careerPreferences: u.careerPreferences || {
      experienceLevel: 'Mid-Level',
      preferredLocation: 'Remote',
      workMode: 'Hybrid',
      preferredIndustries: [],
    },
    notificationPreferences: u.notificationPreferences || {
      emailAlerts: true,
      jobMatches: true,
      interviewReminders: true,
    },
    createdAt: u.createdAt || null,
  };
};

// @desc Register user
// @route POST /api/auth/register
export const registerUser = async (req, res) => {
  try {
    if (req.dbAvailable === false || mongoose.connection.readyState !== 1) {
      return res.status(503).json({ message: 'Database connection unavailable. Please check MongoDB Atlas network access settings.' });
    }

    const { name, email, password, targetRole } = req.body;

    if (
      !name ||
      !email ||
      !password ||
      (typeof name === 'string' && !name.trim()) ||
      (typeof email === 'string' && !email.trim())
    ) {
      return res.status(400).json({ message: 'Please enter all required fields.' });
    }

    const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

    if (!validator.isEmail(cleanEmail)) {
      return res.status(400).json({ message: 'Please enter a valid email address.' });
    }

    if (typeof password === 'string' && password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
    }

    let existingUser = null;
    try {
      existingUser = await User.findOne({ email: cleanEmail });
    } catch (e) {
      console.log('[DB Auth Warning] Searching existing user failed:', e.message);
    }

    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name: typeof name === 'string' ? name.trim() : name,
      email: cleanEmail,
      password: hashedPassword,
      targetRole: sanitizeRole(targetRole),
      role: req.body.role === 'admin' ? 'admin' : 'user',
    });

    const formattedUser = formatUser(user);
    const token = generateToken(formattedUser.id, formattedUser.name, formattedUser.email, formattedUser.targetRole, formattedUser.role);

    return res.status(201).json({
      token,
      user: formattedUser,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'User already exists with this email.' });
    }
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message || 'Please enter a valid email address.' });
    }
    console.error('[Register Error]', error);
    return res.status(500).json({ message: error.message || 'Server error during registration' });
  }
};

// @desc Login user
// @route POST /api/auth/login
export const loginUser = async (req, res) => {
  try {
    if (req.dbAvailable === false || mongoose.connection.readyState !== 1) {
      return res.status(503).json({ message: 'Database connection unavailable. Please check MongoDB Atlas network access settings.' });
    }

    const { email, password } = req.body;

    if (!email || !password || (typeof email === 'string' && !email.trim()) || (typeof password === 'string' && !password.trim())) {
      return res.status(400).json({ message: 'Please provide email and password.' });
    }

    const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

    if (!validator.isEmail(cleanEmail)) {
      return res.status(400).json({ message: 'Please enter a valid email address.' });
    }

    let user = null;
    try {
      user = await User.findOne({ email: cleanEmail });
    } catch (e) {
      console.log('[DB Auth Warning] Login query error:', e.message);
    }

    // Generic error message for both non-existent account and wrong password
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // Compare password strictly with bcrypt
    let isMatch = false;
    if (user.password && typeof user.password === 'string') {
      try {
        isMatch = await bcrypt.compare(password, user.password);
      } catch (bcryptErr) {
        console.error('[Bcrypt Error] Password comparison warning:', bcryptErr.message);
        isMatch = false;
      }
    }

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const formattedUser = formatUser(user);
    const token = generateToken(formattedUser.id, formattedUser.name, formattedUser.email, formattedUser.targetRole, formattedUser.role);

    return res.json({
      token,
      user: formattedUser,
    });
  } catch (error) {
    console.error('[Login Error]', error);
    return res.status(500).json({
      message: `Server error during login: ${error.message || 'Internal Error'}`,
    });
  }
};

// @desc Get current user
// @route GET /api/auth/me
export const getMe = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authorized' });
    }
    res.json({
      user: formatUser(req.user),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Update user profile
// @route PUT /api/auth/profile
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    let user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const {
      name,
      targetRole,
      headline,
      bio,
      phone,
      location,
      avatar,
      education,
      skills,
      careerPreferences,
      notificationPreferences,
    } = req.body;

    if (name !== undefined) {
      const cleanName = typeof name === 'string' ? name.trim() : '';
      if (!cleanName) {
        return res.status(400).json({ message: 'Name cannot be empty.' });
      }
      user.name = cleanName;
    }

    if (targetRole !== undefined) {
      user.targetRole = sanitizeRole(targetRole);
    }

    if (headline !== undefined) {
      user.headline = typeof headline === 'string' ? headline.trim().slice(0, 140) : '';
    }

    if (bio !== undefined) {
      user.bio = typeof bio === 'string' ? bio.trim().slice(0, 600) : '';
    }

    if (phone !== undefined) {
      user.phone = typeof phone === 'string' ? phone.trim().slice(0, 25) : '';
    }

    if (location !== undefined) {
      user.location = typeof location === 'string' ? location.trim().slice(0, 100) : '';
    }

    if (avatar !== undefined) {
      if (typeof avatar === 'string' && avatar.length <= 5 * 1024 * 1024) {
        user.avatar = avatar;
      }
    }

    if (education && typeof education === 'object') {
      user.education = {
        degree: typeof education.degree === 'string' ? education.degree.trim() : user.education?.degree || '',
        college: typeof education.college === 'string' ? education.college.trim() : user.education?.college || '',
        specialization: typeof education.specialization === 'string' ? education.specialization.trim() : user.education?.specialization || '',
        graduationYear: typeof education.graduationYear === 'string' ? education.graduationYear.trim() : user.education?.graduationYear || '',
      };
    }

    if (Array.isArray(skills)) {
      user.skills = Array.from(
        new Set(
          skills
            .filter((s) => typeof s === 'string' && s.trim())
            .map((s) => s.trim().slice(0, 50))
        )
      );
    }

    if (careerPreferences && typeof careerPreferences === 'object') {
      user.careerPreferences = {
        experienceLevel: typeof careerPreferences.experienceLevel === 'string' ? careerPreferences.experienceLevel.trim() : user.careerPreferences?.experienceLevel || 'Mid-Level',
        preferredLocation: typeof careerPreferences.preferredLocation === 'string' ? careerPreferences.preferredLocation.trim() : user.careerPreferences?.preferredLocation || 'Remote',
        workMode: ['On-site', 'Hybrid', 'Remote'].includes(careerPreferences.workMode) ? careerPreferences.workMode : user.careerPreferences?.workMode || 'Hybrid',
        preferredIndustries: Array.isArray(careerPreferences.preferredIndustries)
          ? careerPreferences.preferredIndustries.filter((i) => typeof i === 'string' && i.trim()).map((i) => i.trim())
          : user.careerPreferences?.preferredIndustries || [],
      };
    }

    if (notificationPreferences && typeof notificationPreferences === 'object') {
      user.notificationPreferences = {
        emailAlerts: typeof notificationPreferences.emailAlerts === 'boolean' ? notificationPreferences.emailAlerts : user.notificationPreferences?.emailAlerts ?? true,
        jobMatches: typeof notificationPreferences.jobMatches === 'boolean' ? notificationPreferences.jobMatches : user.notificationPreferences?.jobMatches ?? true,
        interviewReminders: typeof notificationPreferences.interviewReminders === 'boolean' ? notificationPreferences.interviewReminders : user.notificationPreferences?.interviewReminders ?? true,
      };
    }

    await user.save();
    const formatted = formatUser(user);

    return res.json({
      message: 'Profile updated successfully!',
      user: formatted,
    });
  } catch (error) {
    console.error('[Update Profile Error]', error);
    return res.status(500).json({ message: error.message || 'Failed to update profile.' });
  }
};

// @desc Change user password
// @route PUT /api/auth/password
export const changePassword = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required.' });
    }

    if (typeof newPassword !== 'string' || newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters long.' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password does not match.' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    return res.json({ message: 'Password changed successfully!' });
  } catch (error) {
    console.error('[Change Password Error]', error);
    return res.status(500).json({ message: error.message || 'Failed to change password.' });
  }
};

// @desc Delete account
// @route DELETE /api/auth/account
export const deleteAccount = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (req.body.password) {
      const isMatch = await bcrypt.compare(req.body.password, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Incorrect password. Account deletion aborted.' });
      }
    }

    await User.findByIdAndDelete(userId);

    try {
      const Resume = mongoose.model('Resume');
      if (Resume) await Resume.deleteMany({ user: userId });
    } catch (e) {}
    try {
      const Application = mongoose.model('Application');
      if (Application) await Application.deleteMany({ user: userId });
    } catch (e) {}

    return res.json({ message: 'Account and associated records successfully deleted.' });
  } catch (error) {
    console.error('[Delete Account Error]', error);
    return res.status(500).json({ message: error.message || 'Failed to delete account.' });
  }
};
