const authAttemptStore = new Map();

// Periodic cleanup of expired entries
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of authAttemptStore.entries()) {
    if (now > data.resetTime) {
      authAttemptStore.delete(ip);
    }
  }
}, 15 * 60 * 1000);

export const authRateLimiter = (req, res, next) => {
  const clientIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown-ip';
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxAttempts = 10;

  const record = authAttemptStore.get(clientIp);

  if (!record || now > record.resetTime) {
    authAttemptStore.set(clientIp, {
      count: 1,
      resetTime: now + windowMs,
    });
    return next();
  }

  if (record.count >= maxAttempts) {
    return res.status(429).json({
      message: 'Too many authentication attempts. Please try again in 15 minutes.',
    });
  }

  record.count += 1;
  authAttemptStore.set(clientIp, record);
  next();
};
