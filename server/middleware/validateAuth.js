import validator from 'validator';

/**
 * Middleware to validate and sanitize login request input
 */
export const validateLoginInput = (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password || (typeof email === 'string' && !email.trim()) || (typeof password === 'string' && !password.trim())) {
    return res.status(400).json({ message: 'Please provide email and password.' });
  }

  const trimmedEmail = typeof email === 'string' ? email.trim() : '';

  if (!validator.isEmail(trimmedEmail)) {
    return res.status(400).json({ message: 'Please enter a valid email address.' });
  }

  // Consistent normalization for authentication
  req.body.email = trimmedEmail.toLowerCase();
  next();
};

/**
 * Middleware to validate and sanitize registration request input
 */
export const validateRegisterInput = (req, res, next) => {
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

  const trimmedEmail = typeof email === 'string' ? email.trim() : '';

  if (!validator.isEmail(trimmedEmail)) {
    return res.status(400).json({ message: 'Please enter a valid email address.' });
  }

  if (typeof password === 'string' && password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
  }

  // Consistent normalization and sanitization
  req.body.name = typeof name === 'string' ? name.trim() : name;
  req.body.email = trimmedEmail.toLowerCase();
  if (targetRole && typeof targetRole === 'string') {
    req.body.targetRole = targetRole.trim();
  }

  next();
};
