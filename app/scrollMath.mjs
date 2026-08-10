// @ts-check

/**
 * @param {number} value
 * @param {number} [minimum]
 * @param {number} [maximum]
 */
export const clamp = (value, minimum = 0, maximum = 1) =>
  Math.min(maximum, Math.max(minimum, value));

/**
 * @param {number} from
 * @param {number} to
 * @param {number} progress
 */
export const lerp = (from, to, progress) => from + (to - from) * progress;

/** @param {number} progress */
export const ease = (progress) => {
  const value = clamp(progress);
  return value * value * (3 - 2 * value);
};

/**
 * @param {number} scrollY
 * @param {number} sectionTop
 * @param {number} sectionHeight
 * @param {number} viewportHeight
 */
export const calculateChapterProgress = (
  scrollY,
  sectionTop,
  sectionHeight,
  viewportHeight,
) => {
  const start = sectionTop - viewportHeight * 0.12;
  const distance = Math.max(1, sectionHeight - viewportHeight * 0.76);
  return clamp((scrollY - start) / distance);
};

/**
 * A stateless, reversible handoff that begins while education approaches the
 * viewport and completes just before its content takes over.
 * @param {number} scrollY
 * @param {number} educationTop
 * @param {number} viewportHeight
 */
export const calculateEducationTransition = (scrollY, educationTop, viewportHeight) => {
  const start = educationTop - viewportHeight * 0.8;
  const end = educationTop - viewportHeight * 0.18;
  return ease((scrollY - start) / Math.max(1, end - start));
};
