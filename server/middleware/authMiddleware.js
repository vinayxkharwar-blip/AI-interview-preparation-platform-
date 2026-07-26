import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super-secret-ai-interview-prep-jwt-key-2026');

      if (mongoose.connection.readyState === 1) {
        try {
          req.user = await User.findById(decoded.id).select('-password');
        } catch (e) {
          console.log('[Auth Middleware] DB lookup notice:', e.message);
        }
      }

      if (!req.user) {
        // Fallback for mock user if database is offline or user in memory
        req.user = { _id: decoded.id, name: decoded.name || 'User', email: decoded.email || 'user@example.com' };
      }
      return next();
    } catch (error) {
      console.error('[Auth Middleware Error]', error.message);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token provided' });
  }
};
