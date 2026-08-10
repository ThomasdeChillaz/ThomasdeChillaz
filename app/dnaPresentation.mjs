// @ts-check

export const DNA_STRAND_HEIGHT = 7.3;

/** @typedef {readonly [number, number]} TrackPoint */
/** @typedef {readonly [TrackPoint, ...TrackPoint[]]} Track */
/**
 * @typedef {{
 *   scale: number,
 *   x: number,
 *   y: number,
 *   rotationX: number,
 *   rotationY: number,
 *   rotationZ: number,
 *   cameraZ: number,
 *   lookX: number,
 * }} DnaPresentation
 */

/**
 * @param {number} progress
 * @param {number} value
 * @returns {TrackPoint}
 */
const point = (progress, value) => Object.freeze([progress, value]);

/** @type {Track} */
const scaleTrack = Object.freeze([
  point(0, 1.04), point(0.14, 1.04), point(0.24, 0.98),
  point(0.46, 0.92), point(0.68, 0.86), point(1, 0.82),
]);
/** @type {Track} */
const xWideTrack = Object.freeze([
  point(0, 2.6), point(0.18, 2.5), point(0.4, 2.2),
  point(0.66, 1.82), point(1, 1.5),
]);
/** @type {Track} */
const xNarrowTrack = Object.freeze([
  point(0, 0.72), point(0.18, 0.66), point(0.4, 0.52),
  point(0.66, 0.32), point(1, 0.12),
]);
/** @type {Track} */
const yTrack = Object.freeze([
  point(0, 0.18), point(0.22, 0.1), point(0.48, 0),
  point(0.72, -0.14), point(1, -0.28),
]);
/** @type {Track} */
const rotationYTrack = Object.freeze([
  point(0, -0.42), point(0.34, -0.08), point(0.68, 0.34), point(1, 0.62),
]);
/** @type {Track} */
const rotationZTrack = Object.freeze([
  point(0, -0.1), point(0.46, -0.25), point(1, -0.42),
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
 * @param {Track} points
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

/** @returns {DnaPresentation} */
export function createDnaPresentation() {
  return {
    scale: 1,
    x: 0,
    y: 0,
    rotationX: 0,
    rotationY: 0,
    rotationZ: 0,
    cameraZ: 10,
    lookX: 0,
  };
}

/**
 * @param {number} progress
 * @param {boolean} wide
 * @param {DnaPresentation} [output]
 * @returns {DnaPresentation}
 */
export function getDnaPresentation(progress, wide, output = createDnaPresentation()) {
  const bounded = clamp(progress);
  output.scale = sampleTrack(bounded, scaleTrack);
  output.x = sampleTrack(bounded, wide ? xWideTrack : xNarrowTrack);
  output.y = sampleTrack(bounded, yTrack);
  output.rotationX = 0.12 + bounded * 0.16;
  output.rotationY = sampleTrack(bounded, rotationYTrack);
  output.rotationZ = sampleTrack(bounded, rotationZTrack);
  output.cameraZ = wide ? 9.8 : 11.2;
  output.lookX = wide ? 0.45 : 0;
  return output;
}
