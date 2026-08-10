// @ts-check

export const DNA_STRAND_HEIGHT = 7.3;

const scaleTrack = Object.freeze([
  Object.freeze([0, 1.04]),
  Object.freeze([0.14, 1.04]),
  Object.freeze([0.24, 0.98]),
  Object.freeze([0.46, 0.92]),
  Object.freeze([0.68, 0.86]),
  Object.freeze([1, 0.82]),
]);
const xWideTrack = Object.freeze([
  Object.freeze([0, 2.6]),
  Object.freeze([0.18, 2.5]),
  Object.freeze([0.4, 2.2]),
  Object.freeze([0.66, 1.82]),
  Object.freeze([1, 1.5]),
]);
const xNarrowTrack = Object.freeze([
  Object.freeze([0, 0.72]),
  Object.freeze([0.18, 0.66]),
  Object.freeze([0.4, 0.52]),
  Object.freeze([0.66, 0.32]),
  Object.freeze([1, 0.12]),
]);
const yTrack = Object.freeze([
  Object.freeze([0, 0.18]),
  Object.freeze([0.22, 0.1]),
  Object.freeze([0.48, 0]),
  Object.freeze([0.72, -0.14]),
  Object.freeze([1, -0.28]),
]);
const rotationYTrack = Object.freeze([
  Object.freeze([0, -0.42]),
  Object.freeze([0.34, -0.08]),
  Object.freeze([0.68, 0.34]),
  Object.freeze([1, 0.62]),
]);
const rotationZTrack = Object.freeze([
  Object.freeze([0, -0.1]),
  Object.freeze([0.46, -0.25]),
  Object.freeze([1, -0.42]),
]);

/** @param {number} value */
const clamp = (value) => Math.min(1, Math.max(0, value));
/** @param {number} value */
const smooth = (value) => {
  const bounded = clamp(value);
  return bounded * bounded * (3 - 2 * bounded);
};

/**
 * @param {number} progress
 * @param {ReadonlyArray<readonly number[]>} points
 */
function sampleTrack(progress, points) {
  if (progress <= points[0][0]) return points[0][1];
  for (let index = 1; index < points.length; index += 1) {
    const [end, endValue] = points[index];
    const [start, startValue] = points[index - 1];
    if (progress <= end) {
      const local = smooth((progress - start) / Math.max(0.001, end - start));
      return startValue + (endValue - startValue) * local;
    }
  }
  return points[points.length - 1][1];
}

/**
 * @param {number} progress
 * @param {boolean} wide
 */
export function getDnaPresentation(progress, wide) {
  const bounded = clamp(progress);
  return {
    scale: sampleTrack(bounded, scaleTrack),
    x: sampleTrack(bounded, wide ? xWideTrack : xNarrowTrack),
    y: sampleTrack(bounded, yTrack),
    rotationX: 0.12 + bounded * 0.16,
    rotationY: sampleTrack(bounded, rotationYTrack),
    rotationZ: sampleTrack(bounded, rotationZTrack),
    cameraZ: wide ? 9.8 : 11.2,
    lookX: wide ? 0.45 : 0,
  };
}
