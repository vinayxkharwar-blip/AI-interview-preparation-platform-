import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../models/User.js';
import validator from 'validator';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

// Startup check for JWT_SECRET
if (!process.env.JWT_SECRET) {
  throw new Error('FATAL: process.env.JWT_SECRET is missing or undefined! Server cannot start without a configured JWT_SECRET.');
}

export const memoryUsers = [];

export const generateToken = (id, name, email, targetRole) => {
  const secret = process.env.JWT_SECRET;
  return jwt.sign(
    { id, name, email, targetRole },
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
    targetRole: u.targetRole || 'Full Stack Engineer',
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
      targetRole: (targetRole && typeof targetRole === 'string' ? targetRole.trim() : null) || 'Full Stack Engineer',
    });

    const formattedUser = formatUser(user);
    const token = generateToken(formattedUser.id, formattedUser.name, formattedUser.email, formattedUser.targetRole);

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
    const token = generateToken(formattedUser.id, formattedUser.name, formattedUser.email, formattedUser.targetRole);

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
