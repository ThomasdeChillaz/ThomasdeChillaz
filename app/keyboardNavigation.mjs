// @ts-check

/**
 * @typedef {{
 *   key: string,
 *   repeat: boolean,
 *   altKey: boolean,
 *   ctrlKey: boolean,
 *   metaKey: boolean,
 *   shiftKey: boolean,
 *   defaultPrevented: boolean,
 *   isComposing: boolean,
 *   editable: boolean,
 * }} BeatNavigationInput
 */

/** @param {string} key */
export const getArrowDirection = (key) => {
  if (key === "ArrowDown" || key === "ArrowRight") return 1;
  if (key === "ArrowUp" || key === "ArrowLeft") return -1;
  return 0;
};

/**
 * Keeps smooth in-flight movement attached to the requested beat rather than
 * deriving the next destination from an intermediate browser scroll position.
 * @param {BeatNavigationInput} input
 * @param {number} currentIndex
 * @param {number} beatCount
 */
export const resolveBeatNavigation = (input, currentIndex, beatCount) => {
  const direction = getArrowDirection(input.key);
  const unavailable = direction === 0
    || input.editable
    || input.altKey
    || input.ctrlKey
    || input.metaKey
    || input.shiftKey
    || input.defaultPrevented
    || input.isComposing;
  if (unavailable) return { handled: false, targetIndex: null };

  const targetIndex = currentIndex + direction;
  if (targetIndex < 0 || targetIndex >= beatCount) {
    return { handled: false, targetIndex: null };
  }
  if (input.repeat) return { handled: true, targetIndex: null };
  return { handled: true, targetIndex };
};

/**
 * Finds the beat immediately behind the intended direction of travel.
 * @param {number} scrollY
 * @param {ReadonlyArray<number>} stops
 * @param {number} direction
 * @param {number} [tolerance]
 */
export const findBeatCursorIndex = (scrollY, stops, direction, tolerance = 8) => {
  if (stops.length === 0) return -1;
  if (direction >= 0) {
    let cursor = 0;
    for (let index = 0; index < stops.length; index += 1) {
      if (stops[index] > scrollY + tolerance) break;
      cursor = index;
    }
    return cursor;
  }

  let cursor = stops.length;
  for (let index = 0; index < stops.length; index += 1) {
    if (stops[index] >= scrollY - tolerance) {
      cursor = index;
      break;
    }
  }
  return cursor;
};
