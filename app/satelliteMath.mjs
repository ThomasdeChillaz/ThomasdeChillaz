// @ts-check

/**
 * @typedef {Readonly<{
 *   position: readonly [number, number, number],
 *   scale: number,
 *   rotation: readonly [number, number, number],
 *   leftPanelRotation: number,
 *   rightPanelRotation: number,
 *   beaconScale: number,
 * }>} SatellitePose
 */

/**
 * @param {number} x
 * @param {number} y
 * @param {number} z
 * @returns {readonly [number, number, number]}
 */
const tuple3 = (x, y, z) => Object.freeze([x, y, z]);

/** @type {Readonly<{scale: number, xWide: number, xNarrow: number, y: number, z: number}>} */
export const satelliteSpaceSystemEnd = Object.freeze({
  scale: 0.76,
  xWide: 1.48,
  xNarrow: 0.18,
  y: -0.26,
  z: 0,
});

/** @type {SatellitePose} */
export const satelliteLocalHandoff = Object.freeze({
  position: tuple3(-1.1, 1.25, 4.6),
  scale: 0.82,
  rotation: tuple3(0.55, -2.56, 0.57),
  leftPanelRotation: 0.66,
  rightPanelRotation: -0.66,
  beaconScale: 1.2,
});

/** @type {Readonly<{wide: SatellitePose, narrow: SatellitePose}>} */
const educationRelayStarts = Object.freeze({
  wide: Object.freeze({
    position: tuple3(
      1.48 + -1.1 * 0.76,
      -0.26 + 1.25 * 0.76,
      4.6 * 0.76,
    ),
    scale: 0.82 * 0.76,
    rotation: tuple3(0.55, -2.56, 0.57),
    leftPanelRotation: 0.66,
    rightPanelRotation: -0.66,
    beaconScale: 1.2,
  }),
  narrow: Object.freeze({
    position: tuple3(
      0.18 + -1.1 * 0.76,
      -0.26 + 1.25 * 0.76,
      4.6 * 0.76,
    ),
    scale: 0.82 * 0.76,
    rotation: tuple3(0.55, -2.56, 0.57),
    leftPanelRotation: 0.66,
    rightPanelRotation: -0.66,
    beaconScale: 1.2,
  }),
});

/**
 * @param {number} systemX
 * @returns {SatellitePose}
 */
const createSpaceEndpoint = (systemX) => Object.freeze({
  position: tuple3(
    systemX + satelliteLocalHandoff.position[0] * satelliteSpaceSystemEnd.scale,
    satelliteSpaceSystemEnd.y + satelliteLocalHandoff.position[1] * satelliteSpaceSystemEnd.scale,
    satelliteSpaceSystemEnd.z + satelliteLocalHandoff.position[2] * satelliteSpaceSystemEnd.scale,
  ),
  scale: satelliteLocalHandoff.scale * satelliteSpaceSystemEnd.scale,
  rotation: satelliteLocalHandoff.rotation,
  leftPanelRotation: satelliteLocalHandoff.leftPanelRotation,
  rightPanelRotation: satelliteLocalHandoff.rightPanelRotation,
  beaconScale: satelliteLocalHandoff.beaconScale,
});

/** @type {Readonly<{wide: SatellitePose, narrow: SatellitePose}>} */
const satelliteSpaceEndpoints = Object.freeze({
  wide: createSpaceEndpoint(satelliteSpaceSystemEnd.xWide),
  narrow: createSpaceEndpoint(satelliteSpaceSystemEnd.xNarrow),
});

/**
 * @param {boolean} wide
 * @returns {SatellitePose}
 */
export function calculateSatelliteSpaceEndpoint(wide) {
  return wide ? satelliteSpaceEndpoints.wide : satelliteSpaceEndpoints.narrow;
}

/**
 * @param {boolean} wide
 * @returns {SatellitePose}
 */
export function calculateEducationRelayStart(wide) {
  return wide ? educationRelayStarts.wide : educationRelayStarts.narrow;
}
