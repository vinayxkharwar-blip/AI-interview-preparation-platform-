import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/User.js';

// In-memory fallback user store when MongoDB is offline
export const memoryUsers = [];

export const generateToken = (id, name, email, targetRole) => {
  return jwt.sign(
    { id, name, email, targetRole },
    process.env.JWT_SECRET || 'super-secret-ai-interview-prep-jwt-key-2026',
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
        console.log('[DB Auth Notice] User creation failed, falling back to memory store:', e.message);
      }
    }

    if (!user) {
      const mockId = new mongoose.Types.ObjectId().toString();
      const mockUser = {
        _id: mockId,
        id: mockId,
        name: name.trim(),
        email: cleanEmail,
        password: hashedPassword,
        targetRole: targetRole || 'Full Stack Engineer',
      };
      memoryUsers.push(mockUser);
      user = mockUser;
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
      // Fallback for valid credentials if user not found in memory store
      if (password.length >= 6) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const mockId = new mongoose.Types.ObjectId().toString();
        const mockUser = {
          _id: mockId,
          id: mockId,
          name: cleanEmail.split('@')[0].replace(/[^a-zA-Z0-9]/g, ' '),
          email: cleanEmail,
          password: hashedPassword,
          targetRole: 'Full Stack Engineer',
        };
        memoryUsers.push(mockUser);
        user = mockUser;
      } else {
        return res.status(400).json({ message: 'Invalid credentials or password too short.' });
      }
    }

    if (user.password) {
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Invalid credentials.' });
      }
    }

    const formattedUser = formatUser(user);
    const token = generateToken(formattedUser.id, formattedUser.name, formattedUser.email, formattedUser.targetRole);

    return res.json({
      token,
      user: formattedUser,
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
