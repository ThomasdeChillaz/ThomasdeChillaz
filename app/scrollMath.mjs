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
 * Inverts calculateChapterProgress so keyboard navigation and scene rendering
 * resolve to the same normalized chapter position.
 * @param {number} progress
 * @param {number} sectionTop
 * @param {number} sectionHeight
 * @param {number} viewportHeight
 */
export const calculateScrollYForChapterProgress = (
  progress,
  sectionTop,
  sectionHeight,
  viewportHeight,
) => {
  const start = sectionTop - viewportHeight * 0.12;
  const distance = Math.max(1, sectionHeight - viewportHeight * 0.76);
  return start + clamp(progress) * distance;
};

/**
 * A stateless, reversible handoff that begins as the next chapter approaches
 * the viewport and completes just before its content takes over.
 * @param {number} scrollY
 * @param {number} nextTop
 * @param {number} viewportHeight
 */
export const calculateBoundaryTransition = (scrollY, nextTop, viewportHeight) => {
  const start = nextTop - viewportHeight * 0.8;
  const end = nextTop - viewportHeight * 0.18;
  return ease((scrollY - start) / Math.max(1, end - start));
};

/**
 * Resolves a direct scroll position to a scene pose without carrying state
 * from the direction in which that position was reached.
 * @param {number} progress
 * @param {boolean} reducedMotion
 * @param {number} reducedValue
 */
export const resolveSceneProgress = (progress, reducedMotion, reducedValue) =>
  reducedMotion ? clamp(reducedValue) : clamp(progress);

/**
 * @template {string} TChapter
 * @typedef {{ chapter: TChapter, top: number, height: number }} SceneSection
 */

/**
 * @template {string} TChapter
 * @typedef {{
 *   fromChapter: TChapter,
 *   toChapter: TChapter,
 *   fromProgress: number,
 *   toProgress: number,
 *   mix: number,
 * }} SceneState
 */

/**
 * Calculates the complete scene handoff from an absolute document position.
 * The result is identical for upward and downward travel at the same scrollY.
 * @template {string} TChapter
 * @param {number} scrollY
 * @param {ReadonlyArray<SceneSection<TChapter>>} sections
 * @param {number} viewportHeight
 * @returns {SceneState<TChapter> | null}
 */
export const calculateSceneState = (scrollY, sections, viewportHeight) => {
  const first = sections[0];
  if (!first) return null;

  /** @param {SceneSection<TChapter>} section */
  const progressFor = (section) => calculateChapterProgress(
    scrollY,
    section.top,
    section.height,
    viewportHeight,
  );

  for (let index = 1; index < sections.length; index += 1) {
    const from = sections[index - 1];
    const to = sections[index];
    const mix = calculateBoundaryTransition(scrollY, to.top, viewportHeight);
    if (mix < 1) {
      return {
        fromChapter: from.chapter,
        toChapter: to.chapter,
        fromProgress: progressFor(from),
        toProgress: progressFor(to),
        mix,
      };
    }
  }

  const last = sections[sections.length - 1];
  const progress = progressFor(last);
  return {
    fromChapter: last.chapter,
    toChapter: last.chapter,
    fromProgress: progress,
    toProgress: progress,
    mix: 0,
  };
};
