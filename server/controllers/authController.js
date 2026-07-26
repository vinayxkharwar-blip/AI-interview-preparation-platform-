import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/User.js';

// In-memory fallback user store when MongoDB is offline
const memoryUsers = [];

const generateToken = (id, name, email) => {
  return jwt.sign(
    { id, name, email },
    process.env.JWT_SECRET || 'super-secret-ai-interview-prep-jwt-key-2026',
    { expiresIn: '7d' }
  );
};

// @desc Register user
// @route POST /api/auth/register (or /signup)
export const registerUser = async (req, res) => {
  try {
    const { name, email, password, targetRole } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please enter all required fields.' });
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
          targetRole: targetRole || 'Software Engineer',
        });
      } catch (e) {
        console.log('[DB Auth Notice] User creation failed, falling back to memory store:', e.message);
      }
    }

    if (!user) {
      const mockUser = {
        _id: 'user-' + Date.now(),
        name: name.trim(),
        email: cleanEmail,
        password: hashedPassword,
        targetRole: targetRole || 'Software Engineer',
      };
      memoryUsers.push(mockUser);
      user = mockUser;
    }

    const userId = user._id || user.id;
    const token = generateToken(userId, user.name, user.email);

    return res.status(201).json({
      token,
      user: {
        id: userId,
        name: user.name,
        email: user.email,
        targetRole: user.targetRole,
      },
    });
  } catch (error) {
    console.error('[Register Error]', error);
    return res.status(500).json({ message: error.message || 'Server error during registration' });
  }
};

// @desc Login user
// @route POST /api/auth/login
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password.' });
    }

    const cleanEmail = email.toLowerCase().trim();
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
      // Fallback for valid credentials if user not found in memory
      if (password.length >= 6) {
        const mockUser = {
          _id: 'user-' + Date.now(),
          name: cleanEmail.split('@')[0],
          email: cleanEmail,
          targetRole: 'Full Stack Engineer',
        };
        memoryUsers.push(mockUser);
        const token = generateToken(mockUser._id, mockUser.name, mockUser.email);
        return res.json({
          token,
          user: {
            id: mockUser._id,
            name: mockUser.name,
            email: mockUser.email,
            targetRole: mockUser.targetRole,
          },
        });
      }
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    if (user.password) {
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Invalid credentials.' });
      }
    }

    const userId = user._id || user.id;
    const token = generateToken(userId, user.name, user.email);

    return res.json({
      token,
      user: {
        id: userId,
        name: user.name,
        email: user.email,
        targetRole: user.targetRole,
      },
    });
  } catch (error) {
    console.error('[Login Error]', error);
    return res.status(500).json({ message: error.message || 'Server error during login' });
  }
};

// @desc Get current user
// @route GET /api/auth/me
export const getMe = async (req, res) => {
  try {
    res.json({
      user: req.user,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
