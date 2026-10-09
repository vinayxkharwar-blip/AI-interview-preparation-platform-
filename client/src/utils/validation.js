import validator from 'validator';

/**
 * Validates and normalizes an email address.
 *
 * Checks for non-empty input, trims whitespace, verifies format using validator.js,
 * and returns the normalized lowercase email along with a standardized error message.
 *
 * @param {string} email - The email string to validate.
 * @returns {{ isValid: boolean, normalizedEmail: string, error: string | null }}
 */
export const validateEmail = (email) => {
  if (!email || typeof email !== 'string') {
    return {
      isValid: false,
      normalizedEmail: '',
      error: 'Please enter a valid email address.',
    };
  }

  const trimmed = email.trim();
  if (!trimmed) {
    return {
      isValid: false,
      normalizedEmail: '',
      error: 'Please enter a valid email address.',
    };
  }

  if (!validator.isEmail(trimmed)) {
    return {
      isValid: false,
      normalizedEmail: trimmed.toLowerCase(),
      error: 'Please enter a valid email address.',
    };
  }

  return {
    isValid: true,
    normalizedEmail: trimmed.toLowerCase(),
    error: null,
  };
};

export default {
  validateEmail,
};
