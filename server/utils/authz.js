import mongoose from 'mongoose';
import Session from '../models/Session.js';
import { memorySessions } from '../controllers/sessionController.js';

/**
 * Checks if a given resource belongs to req.user.
 * Works against both Mongoose documents and in-memory fallback objects.
 * Handles string IDs, ObjectIds, and populated user objects.
 */
export const checkOwnership = (resource, reqUser) => {
  if (!resource || !reqUser || (!reqUser._id && !reqUser.id)) return false;

  const resourceUserId = resource.user?._id
    ? String(resource.user._id)
    : resource.user
    ? String(resource.user)
    : null;

  const reqUserId = reqUser._id ? String(reqUser._id) : String(reqUser.id);

  if (!resourceUserId || !reqUserId) return false;
  return resourceUserId === reqUserId;
};

/**
 * Shared helper to verify parent session ownership.
 * Fetches session from DB or memorySessions fallback.
 */
export const checkSessionOwnership = async (sessionId, reqUser) => {
  if (!sessionId || !reqUser) {
    return { session: null, authorized: false, status: 401, message: 'Not authorized' };
  }

  let session = null;
  if (mongoose.connection.readyState === 1 && mongoose.Types.ObjectId.isValid(sessionId)) {
    try {
      session = await Session.findById(sessionId);
    } catch (e) {
      console.log('[Authz DB Notice]', e.message);
    }
  }

  if (!session) {
    session = memorySessions.find(
      (s) => String(s._id) === String(sessionId) || String(s.id) === String(sessionId)
    );
  }

  if (!session) {
    return { session: null, authorized: false, status: 404, message: 'Session not found.' };
  }

  const isOwner = checkOwnership(session, reqUser);
  if (!isOwner) {
    return { session, authorized: false, status: 403, message: 'Forbidden: You do not have access to this session' };
  }

  return { session, authorized: true, status: 200 };
};
