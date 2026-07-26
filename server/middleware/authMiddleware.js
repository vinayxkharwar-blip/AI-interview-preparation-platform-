import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/User.js';
import { memoryUsers } from '../controllers/authController.js';

export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'super-secret-ai-interview-prep-jwt-key-2026'
      );

      if (mongoose.connection.readyState === 1 && mongoose.Types.ObjectId.isValid(decoded.id)) {
        try {
          req.user = await User.findById(decoded.id).select('-password');
        } catch (e) {
          console.log('[Auth Middleware] DB lookup notice:', e.message);
        }
      }

      if (!req.user) {
        // Search in-memory users fallback
        const memUser = memoryUsers.find(
          (u) => u._id === decoded.id || u.id === decoded.id || u.email === decoded.email
        );
        if (memUser) {
          const { password, ...userWithoutPassword } = memUser;
          req.user = userWithoutPassword;
        } else {
          // Fallback mock user with token payload information
          req.user = {
            _id: decoded.id,
            id: decoded.id,
            name: decoded.name || 'User',
            email: decoded.email || 'user@example.com',
            targetRole: decoded.targetRole || 'Full Stack Engineer',
          };
        }
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

