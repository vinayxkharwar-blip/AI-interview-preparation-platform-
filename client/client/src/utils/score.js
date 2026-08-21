/**
 * Normalizes a candidate score to a 0-100 scale.
 * Handles inputs on 0-10 scale (multiplies by 10) and 0-100 scale.
 *
 * @param {number|string|null|undefined} score - The input score to normalize.
 * @returns {number} Normalized score integer between 0 and 100.
 */
export function toHundredScale(score) {
  if (score === null || score === undefined || score === '' || isNaN(Number(score))) {
    return 0;
  }
  const numScore = Number(score);
  const normalized = numScore > 10 ? numScore : numScore * 10;
  return Math.round(Math.min(100, Math.max(0, normalized)));
}
