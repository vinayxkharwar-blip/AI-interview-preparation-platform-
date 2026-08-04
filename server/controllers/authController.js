import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

// Startup check for JWT_SECRET
if (!process.env.JWT_SECRET) {
  throw new Error('FATAL: process.env.JWT_SECRET is missing or undefined! Server cannot start without a configured JWT_SECRET.');
}

// In-memory fallback user store when MongoDB is offline
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
// @route POST /api/auth/register (or /signup)
export const registerUser = async (req, res) => {
  try {
    const { name, email, password, targetRole } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please enter all required fields.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
    }

    const cleanEmail = email.toLowerCase().trim();

    let existingUser = null;
    if (mongoose.connection.readyState === 1) {
      try {
        existingUser = await User.findOne({ email: cleanEmail });
      } catch (e) {
        console.log('[DB Auth Warning] Searching existing user failed:', e.message);
      }
    }

    if (!existingUser) {
      existingUser = memoryUsers.find((u) => u.email === cleanEmail);
    }

    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    let user = null;
    if (mongoose.connection.readyState === 1) {
      try {
        user = await User.create({
          name: name.trim(),
          email: cleanEmail,
          password: hashedPassword,
          targetRole: targetRole || 'Full Stack Engineer',
        });
      } catch (e) {
        console.error('[DB Auth Error] User creation failed, using memory fallback:', e.message);
      }
    }

    if (!user) {
      user = {
        _id: new mongoose.Types.ObjectId().toString(),
        name: name.trim(),
        email: cleanEmail,
        password: hashedPassword,
        targetRole: targetRole || 'Full Stack Engineer',
      };
      memoryUsers.push(user);
    }

    const formattedUser = formatUser(user);
    const token = generateToken(formattedUser.id, formattedUser.name, formattedUser.email, formattedUser.targetRole);

    return res.status(201).json({
      token,
      user: formattedUser,
    });
  } catch (error) {
    console.error('[Register Error]', error);
    return res.status(500).json({ message: error.message || 'Server error during registration' });
  }
};

// @desc Login user
// @route POST /api/auth/login
export const loginUser = async (req, res) => {
  let currentStep = 'initializing request';
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password.' });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Step 1: Finding user
    currentStep = 'finding user';
    let user = null;
    if (mongoose.connection.readyState === 1) {
      try {
        user = await User.findOne({ email: cleanEmail });
      } catch (e) {
        console.log('[DB Auth Warning] Login query error:', e.message);
      }
    }

    if (!user) {
      user = memoryUsers.find((u) => u.email === cleanEmail);
    }

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    // Step 2: Comparing password
    currentStep = 'comparing password';
    if (!user.password || typeof user.password !== 'string') {
      console.error('[Auth Error] Stored password hash is missing or malformed for user:', cleanEmail);
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    let isMatch = false;
    try {
      isMatch = await bcrypt.compare(password, user.password);
    } catch (bcryptErr) {
      console.error('[Bcrypt Error] Password comparison failed:', bcryptErr.message);
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    // Step 3: Signing token
    currentStep = 'signing token';
    const formattedUser = formatUser(user);
    const token = generateToken(formattedUser.id, formattedUser.name, formattedUser.email, formattedUser.targetRole);

    return res.json({
      token,
      user: formattedUser,
    });
  } catch (error) {
    console.error(`[Login Error] Failed during step: "${currentStep}"`);
    console.error('[Login Error] Error Message:', error.message);
    console.error('[Login Error] Stack Trace:\n', error.stack);
    return res.status(500).json({
      message: `Server error during login (${currentStep}): ${error.message}`,
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
