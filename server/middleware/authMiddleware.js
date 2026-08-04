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
        process.env.JWT_SECRET
      );

      if (!decoded.id || typeof decoded.id !== 'string' || decoded.id.startsWith('user-') || !mongoose.Types.ObjectId.isValid(decoded.id)) {
        console.warn(`[Auth Middleware] Rejected token with invalid user ID format: "${decoded.id}"`);
        return res.status(401).json({ message: 'Invalid or expired session token, please sign in again.' });
      }

      if (mongoose.connection.readyState === 1) {
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
        if (memUser && mongoose.Types.ObjectId.isValid(memUser._id)) {
          const { password, ...userWithoutPassword } = memUser;
          req.user = userWithoutPassword;
        } else if (mongoose.Types.ObjectId.isValid(decoded.id)) {
          // Fallback mock user with token payload information (only if ObjectId is valid)
          req.user = {
            _id: decoded.id,
            id: decoded.id,
            name: decoded.name || 'User',
            email: decoded.email || 'user@example.com',
            targetRole: decoded.targetRole || 'Full Stack Engineer',
          };
        } else {
          return res.status(401).json({ message: 'User session not found, please sign in again.' });
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

