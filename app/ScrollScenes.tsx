"use client";

import { useEffect, useRef } from "react";
import type { ThreeStage } from "./ThreeScenes";
import {
  findBeatCursorIndex,
  getArrowDirection,
  resolveBeatNavigation,
} from "./keyboardNavigation.mjs";
import {
  calculateCenteredScrollTarget,
  calculateChapterProgress,
  calculateSceneState,
  calculateScrollYForChapterProgress,
  ease,
  groupLayoutRows,
  lerp,
  resolveSceneProgress,
} from "./scrollMath.mjs";

export type Chapter = "hero" | "health" | "space" | "education" | "building" | "impact";

const PREWARM_CHAPTERS: ReadonlyArray<Chapter> = [
  "hero", "health", "space", "education", "building", "impact",
];

function isChapter(value: string | undefined): value is Chapter {
  return value === "hero"
    || value === "health"
    || value === "space"
    || value === "education"
    || value === "building"
    || value === "impact";
}

const REDUCED_MOTION_PROGRESS: Readonly<Record<Chapter, number>> = {
  hero: 0.5,
  health: 0.66,
  space: 0.58,
  education: 0.64,
  building: 0.82,
  impact: 0.64,
};

type BeatRange = readonly [enter: number, entered: number, exit: number, exited: number];
type StoryBeat = Readonly<{ element: HTMLElement; range: BeatRange }>;
type ChapterRuntime = Readonly<{
  chapter: Chapter;
  element: HTMLElement;
  beats: ReadonlyArray<StoryBeat>;
}>;
type SectionMetric = Readonly<{ chapter: Chapter; top: number; height: number }>;

function isInteractiveKeyboardTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || Boolean(target.closest<HTMLElement>("input, textarea, select, option, button, a, summary, [role='textbox'], [role='slider'], [role='spinbutton'], [role='menu'], [role='tablist'], [role='tree'], [role='grid'], [role='listbox']"));
}

function getElementLayoutTop(element: HTMLElement) {
  let top = 0;
  let current: HTMLElement | null = element;
  while (current) {
    top += current.offsetTop;
    current = current.offsetParent instanceof HTMLElement ? current.offsetParent : null;
  }
  return top;
}

function parseBeatRange(value: string | undefined): BeatRange {
  const parsed = value?.split(",").map(Number) ?? [];
  const isMonotonic = parsed.every((point, index) => index === 0 || point >= parsed[index - 1]);
  if (parsed.length === 4 && parsed.every(Number.isFinite) && isMonotonic) {
    return [parsed[0], parsed[1], parsed[2], parsed[3]];
  }
  return [0, 0.1, 0.9, 1];
}

function createStoryBeats(section: HTMLElement | null): ReadonlyArray<StoryBeat> {
  if (!section) return [];
  return Array.from(section.querySelectorAll<HTMLElement>("[data-scroll-copy]"), (element) => ({
    element,
    range: parseBeatRange(element.dataset.beatRange),
  }));
}

function updateStoryBeats(
  beats: ReadonlyArray<StoryBeat>,
  progress: number,
  reducedMotion: boolean,
  styleCache: WeakMap<HTMLElement, string>,
) {
  beats.forEach((beat) => {
    const [enter, entered, exit, exited] = beat.range;
    const reveal = reducedMotion ? 1 : ease((progress - enter) / Math.max(0.001, entered - enter));
    const conceal = reducedMotion ? 1 : 1 - ease((progress - exit) / Math.max(0.001, exited - exit));
    const translateY = reducedMotion
      ? 0
      : progress < entered
        ? lerp(28, 0, reveal)
        : lerp(0, -20, 1 - conceal);
    const translate = `${translateY.toFixed(2)}px`;
    const clipTop = `${((1 - reveal) * 100).toFixed(2)}%`;
    const clipBottom = `${((1 - conceal) * 100).toFixed(2)}%`;
    const styleKey = `${translate}|${clipTop}|${clipBottom}`;
    if (styleCache.get(beat.element) === styleKey) return;

    beat.element.style.setProperty("--beat-opacity", "1");
    beat.element.style.setProperty("--beat-translate-y", translate);
    beat.element.style.setProperty("--beat-clip-top", clipTop);
    beat.element.style.setProperty("--beat-clip-bottom", clipBottom);
    styleCache.set(beat.element, styleKey);
  });
}

export function SceneCanvas({ onChapterChange }: { onChapterChange: (chapter: Chapter) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<ThreeStage | null>(null);
  const moduleRef = useRef<typeof import("./ThreeScenes") | null>(null);
  const prewarmStopRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let disposed = false;
    let initializationId = 0;
    let prewarmId: number | null = null;
    let resumePrewarm: (() => void) | null = null;

    const activateFallback = () => {
      canvas.dataset.webgl = "fallback";
    };
    const cancelPrewarm = () => {
      if (prewarmId === null) return;
      window.cancelIdleCallback(prewarmId);
      prewarmId = null;
    };
    const stopPrewarm = () => {
      cancelPrewarm();
      resumePrewarm = null;
    };
    prewarmStopRef.current = stopPrewarm;
    const queuePrewarm = (
      threeScenes: typeof import("./ThreeScenes"),
      stage: ThreeStage,
    ) => {
      if (!("requestIdleCallback" in window)) return;
      let chapterIndex = 0;
      const prewarmNext = (deadline: IdleDeadline) => {
        prewarmId = null;
        if (disposed || stageRef.current !== stage) {
          resumePrewarm = null;
          return;
        }
        if (deadline.timeRemaining() < 12) {
          resumePrewarm?.();
          return;
        }
        const chapter = PREWARM_CHAPTERS[chapterIndex];
        if (!chapter) {
          resumePrewarm = null;
          return;
        }
        try {
          threeScenes.prewarmThreeScene(stage, chapter);
        } catch (error) {
          console.warn("Optional 3D scene prewarm skipped.", error);
          resumePrewarm = null;
          return;
        }
        chapterIndex += 1;
        resumePrewarm?.();
      };
      resumePrewarm = () => {
        if (prewarmId !== null) return;
        if (chapterIndex >= PREWARM_CHAPTERS.length) {
          resumePrewarm = null;
          return;
        }
        prewarmId = window.requestIdleCallback(prewarmNext);
      };
      resumePrewarm();
    };
    const handlePrewarmScroll = () => {
      cancelPrewarm();
      resumePrewarm?.();
    };
    const initialize = async () => {
      const activeInitialization = ++initializationId;
      try {
        const threeScenes = await import("./ThreeScenes");
        if (disposed || activeInitialization !== initializationId) return;
        moduleRef.current = threeScenes;
        const stage = threeScenes.createThreeStage(canvas);
        stageRef.current = stage;
        canvas.dataset.webgl = "ready";
        canvas.dispatchEvent(new Event("webglready"));
        queuePrewarm(threeScenes, stage);
      } catch {
        if (disposed || activeInitialization !== initializationId) return;
        stageRef.current = null;
        activateFallback();
      }
    };
    const handleContextLost = (event: Event) => {
      event.preventDefault();
      stopPrewarm();
      const stage = stageRef.current;
      stageRef.current = null;
      if (stage && moduleRef.current) moduleRef.current.disposeThreeStage(stage);
      activateFallback();
    };
    const handleContextRestored = () => void initialize();

    canvas.addEventListener("webglcontextlost", handleContextLost);
    canvas.addEventListener("webglcontextrestored", handleContextRestored);
    window.addEventListener("scroll", handlePrewarmScroll, { passive: true });
    void initialize();

    return () => {
      disposed = true;
      initializationId += 1;
      stopPrewarm();
      if (prewarmStopRef.current === stopPrewarm) prewarmStopRef.current = null;
      canvas.removeEventListener("webglcontextlost", handleContextLost);
      canvas.removeEventListener("webglcontextrestored", handleContextRestored);
      window.removeEventListener("scroll", handlePrewarmScroll);
      const stage = stageRef.current;
      stageRef.current = null;
      if (stage && moduleRef.current) moduleRef.current.disposeThreeStage(stage);
      moduleRef.current = null;
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const transparencyMedia = window.matchMedia("(prefers-reduced-transparency: reduce)");
    const chapterSections = Array.from(
      document.querySelectorAll<HTMLElement>("[data-chapter]"),
    );
    const keyboardBeatElements = Array.from(
      document.querySelectorAll<HTMLElement>("[data-scroll-copy][data-beat-range]"),
    );
    const keyboardStaticElements = Array.from(
      document.querySelectorAll<HTMLElement>("[data-keyboard-stop]"),
    );
    const runtimes: ReadonlyArray<ChapterRuntime> = chapterSections.flatMap((element) => {
      const chapter = element.dataset.chapter;
      return isChapter(chapter)
        ? [{ chapter, element, beats: createStoryBeats(element) }]
        : [];
    });
    const storyStyleCache = new WeakMap<HTMLElement, string>();
    let reducedMotion = media.matches;
    let reducedTransparency = transparencyMedia.matches;
    let sectionMetrics: ReadonlyArray<SectionMetric> = [];
    let keyboardStops: ReadonlyArray<number> = [0];
    let keyboardIndex: number | null = null;
    let activeChapter: Chapter | null = null;
    let frame = 0;
    let scrollSettleTimer = 0;

    const measureSections = () => {
      sectionMetrics = runtimes.map(({ chapter, element }) => ({
        chapter,
        top: getElementLayoutTop(element),
        height: element.offsetHeight || window.innerHeight,
      }));
      const maximumScroll = Math.max(
        0,
        document.documentElement.scrollHeight - window.innerHeight,
      );
      const beatStops = keyboardBeatElements.flatMap((element) => {
        const chapter = element.closest<HTMLElement>("[data-chapter]")?.dataset.chapter;
        if (!isChapter(chapter)) return [];
        const metric = sectionMetrics.find((candidate) => candidate.chapter === chapter);
        if (!metric) return [];
        const [, entered, exit] = parseBeatRange(element.dataset.beatRange);
        const visibleStart = reducedMotion ? 0 : calculateScrollYForChapterProgress(
          entered,
          metric.top,
          metric.height,
          window.innerHeight,
        );
        const visibleEnd = reducedMotion ? maximumScroll : calculateScrollYForChapterProgress(
          exit,
          metric.top,
          metric.height,
          window.innerHeight,
        );
        return [calculateCenteredScrollTarget(
          getElementLayoutTop(element),
          element.offsetHeight,
          window.innerHeight,
          visibleStart,
          visibleEnd,
        )];
      });
      const staticStops = groupLayoutRows(keyboardStaticElements.map((element) => ({
        top: getElementLayoutTop(element),
        height: element.offsetHeight,
      }))).map((row) => calculateCenteredScrollTarget(
        row.top,
        row.height,
        window.innerHeight,
        0,
        maximumScroll,
      ));
      const orderedStops = [0, ...beatStops, ...staticStops]
        .map((top) => Math.min(maximumScroll, Math.max(0, top)))
        .sort((first, second) => first - second);
      keyboardStops = orderedStops.filter(
        (top, index) => index === 0 || top - orderedStops[index - 1] > 16,
      );
      keyboardIndex = null;
    };
    const paint = () => {
      const sceneState = calculateSceneState(
        window.scrollY,
        sectionMetrics,
        window.innerHeight,
      );
      if (!sceneState) return;
      const transition = reducedMotion || reducedTransparency
        ? Number(sceneState.mix >= 0.5)
        : sceneState.mix;
      const fromProgress = resolveSceneProgress(
        sceneState.fromProgress,
        reducedMotion,
        REDUCED_MOTION_PROGRESS[sceneState.fromChapter],
      );
      const toProgress = resolveSceneProgress(
        sceneState.toProgress,
        reducedMotion,
        REDUCED_MOTION_PROGRESS[sceneState.toChapter],
      );
      const stage = stageRef.current;
      const threeScenes = moduleRef.current;
      if (stage && threeScenes) {
        try {
          threeScenes.updateThreeScene(
            stage,
            sceneState.fromChapter,
            fromProgress,
            sceneState.toChapter,
            toProgress,
            window.innerWidth,
            window.innerHeight,
            transition,
            reducedTransparency,
          );
        } catch {
          prewarmStopRef.current?.();
          stageRef.current = null;
          if (canvas) canvas.dataset.webgl = "fallback";
          threeScenes.disposeThreeStage(stage);
        }
      }

      runtimes.forEach((runtime, index) => {
        const metric = sectionMetrics[index];
        const chapterProgress = metric
          ? calculateChapterProgress(
            window.scrollY,
            metric.top,
            metric.height,
            window.innerHeight,
          )
          : 0;
        updateStoryBeats(
          runtime.beats,
          resolveSceneProgress(
            chapterProgress,
            reducedMotion,
            REDUCED_MOTION_PROGRESS[runtime.chapter],
          ),
          reducedMotion,
          storyStyleCache,
        );
      });

      const nextChapter = transition >= 0.5
        ? sceneState.toChapter
        : sceneState.fromChapter;
      if (nextChapter !== activeChapter) {
        activeChapter = nextChapter;
        onChapterChange(nextChapter);
      }
    };
    const paintFrame = () => {
      frame = 0;
      paint();
    };
    const schedule = () => {
      if (frame !== 0) return;
      frame = requestAnimationFrame(paintFrame);
    };
    const resize = () => {
      measureSections();
      schedule();
    };
    const handleMotionPreference = (event: MediaQueryListEvent) => {
      reducedMotion = event.matches;
      measureSections();
      schedule();
    };
    const handleTransparencyPreference = (event: MediaQueryListEvent) => {
      reducedTransparency = event.matches;
      schedule();
    };
    const resetKeyboardNavigation = () => {
      keyboardIndex = null;
    };
    const handleScroll = () => {
      schedule();
      if ("onscrollend" in document) return;
      window.clearTimeout(scrollSettleTimer);
      scrollSettleTimer = window.setTimeout(resetKeyboardNavigation, 160);
    };
    const handleStageReady = () => schedule();
    const handleKeyDown = (event: KeyboardEvent) => {
      const direction = getArrowDirection(event.key);
      if (direction !== 0) document.documentElement.dataset.keyboardNavigation = "true";
      if (direction === 0) keyboardIndex = null;
      const currentIndex = keyboardIndex ?? findBeatCursorIndex(
        window.scrollY,
        keyboardStops,
        direction,
      );
      const selection = window.getSelection();
      const navigation = resolveBeatNavigation({
        key: event.key,
        repeat: event.repeat,
        altKey: event.altKey,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        shiftKey: event.shiftKey,
        defaultPrevented: event.defaultPrevented,
        isComposing: event.isComposing,
        editable: isInteractiveKeyboardTarget(event.target)
          || Boolean(selection && !selection.isCollapsed),
      }, currentIndex, keyboardStops.length);
      if (!navigation.handled) {
        keyboardIndex = null;
        return;
      }
      event.preventDefault();
      if (navigation.targetIndex === null) return;
      const top = keyboardStops[navigation.targetIndex];
      if (top === undefined) return;
      keyboardIndex = navigation.targetIndex;
      window.scrollTo({
        top,
        behavior: reducedMotion ? "auto" : "smooth",
      });
    };
    const sizeObserver = "ResizeObserver" in window
      ? new ResizeObserver(() => {
        measureSections();
        schedule();
      })
      : null;

    resize();
    sizeObserver?.observe(document.documentElement);
    runtimes.forEach(({ element }) => sizeObserver?.observe(element));
    keyboardBeatElements.forEach((element) => sizeObserver?.observe(element));
    keyboardStaticElements.forEach((element) => sizeObserver?.observe(element));
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", resize);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("wheel", resetKeyboardNavigation, { passive: true });
    window.addEventListener("touchstart", resetKeyboardNavigation, { passive: true });
    window.addEventListener("pointerdown", resetKeyboardNavigation, { passive: true });
    window.addEventListener("hashchange", resetKeyboardNavigation);
    document.addEventListener("scrollend", resetKeyboardNavigation);
    canvas?.addEventListener("webglready", handleStageReady);
    media.addEventListener("change", handleMotionPreference);
    transparencyMedia.addEventListener("change", handleTransparencyPreference);

    return () => {
      if (frame !== 0) cancelAnimationFrame(frame);
      window.clearTimeout(scrollSettleTimer);
      sizeObserver?.disconnect();
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("wheel", resetKeyboardNavigation);
      window.removeEventListener("touchstart", resetKeyboardNavigation);
      window.removeEventListener("pointerdown", resetKeyboardNavigation);
      window.removeEventListener("hashchange", resetKeyboardNavigation);
      document.removeEventListener("scrollend", resetKeyboardNavigation);
      delete document.documentElement.dataset.keyboardNavigation;
      canvas?.removeEventListener("webglready", handleStageReady);
      media.removeEventListener("change", handleMotionPreference);
      transparencyMedia.removeEventListener("change", handleTransparencyPreference);
    };
  }, [onChapterChange]);

  return (
    <>
      <canvas ref={canvasRef} className="scene-canvas" data-webgl="pending" aria-hidden="true" />
      <div className="scene-fallback" aria-hidden="true">
        <span className="scene-fallback__orbit" />
        <span className="scene-fallback__core" />
      </div>
    </>
  );
}
