/**
 * Role Sanitizer Utility
 * Sanitizes and validates custom and predefined engineering roles.
 * Prevents prompt injection, script execution, and malformed inputs.
 */

export const sanitizeRole = (role) => {
  if (!role || typeof role !== 'string') {
    return 'Full Stack Engineer';
  }

  // Normalize, strip control characters, prompt delimiters, and dangerous punctuation
  const sanitized = role
    .replace(/[\r\n\t]/g, ' ')
    .replace(/[^\w\s\/\-\.&+#(),]/gi, '')
    .trim()
    .substring(0, 100);

  return sanitized || 'Full Stack Engineer';
};

export const isValidRole = (role) => {
  if (!role || typeof role !== 'string') return false;
  const trimmed = role.trim();
  return trimmed.length > 0 && trimmed.length <= 100;
};
