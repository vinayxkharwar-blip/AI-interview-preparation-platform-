import rateLimit from 'express-rate-limit';

/**
 * Global API Rate Limiter
 * Approximately 100 requests per minute
 */
export const globalApiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  skip: (req) =>
    process.env.NODE_ENV === 'test' ||
    Boolean(process.env.TEST_MODE) ||
    process.env.DISABLE_RATE_LIMIT === 'true' ||
    req.headers['x-test-mode'] === 'true',
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: 429,
  message: {
    message: 'Too many requests from this IP. Please try again after a minute.',
  },
});

/**
 * Authentication Rate Limiter
 * Approximately 10 requests per minute for login/register
 */
export const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  skip: (req) =>
    process.env.NODE_ENV === 'test' ||
    Boolean(process.env.TEST_MODE) ||
    process.env.DISABLE_RATE_LIMIT === 'true' ||
    req.headers['x-test-mode'] === 'true',
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: 429,
  message: {
    message: 'Too many authentication attempts. Please try again after a minute.',
  },
});

/**
 * Expensive AI Route Limiter
 * Approximately 15 requests per minute for resource-heavy generative models
 */
export const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: 429,
  message: {
    message: 'Too many AI generation requests. Please wait a minute before trying again.',
  },
});
