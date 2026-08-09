export const clamp = (value, minimum = 0, maximum = 1) =>
  Math.min(maximum, Math.max(minimum, value));

export const lerp = (from, to, progress) => from + (to - from) * progress;

export const ease = (progress) => {
  const value = clamp(progress);
  return value * value * (3 - 2 * value);
};

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
