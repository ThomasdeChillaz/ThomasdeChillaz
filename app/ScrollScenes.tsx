"use client";

import { useEffect, useRef } from "react";
import type { ThreeStage } from "./ThreeScenes";
import {
  calculateChapterProgress,
  calculateSceneState,
  ease,
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
    let activeChapter: Chapter | null = null;
    let frame = 0;

    const measureSections = () => {
      sectionMetrics = runtimes.map(({ chapter, element }) => ({
        chapter,
        top: element.getBoundingClientRect().top + window.scrollY,
        height: element.offsetHeight || window.innerHeight,
      }));
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
      schedule();
    };
    const handleTransparencyPreference = (event: MediaQueryListEvent) => {
      reducedTransparency = event.matches;
      schedule();
    };
    const handleScroll = () => schedule();
    const handleStageReady = () => schedule();
    const sizeObserver = "ResizeObserver" in window
      ? new ResizeObserver(() => {
        measureSections();
        schedule();
      })
      : null;

    resize();
    sizeObserver?.observe(document.documentElement);
    runtimes.forEach(({ element }) => sizeObserver?.observe(element));
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", resize);
    canvas?.addEventListener("webglready", handleStageReady);
    media.addEventListener("change", handleMotionPreference);
    transparencyMedia.addEventListener("change", handleTransparencyPreference);

    return () => {
      if (frame !== 0) cancelAnimationFrame(frame);
      sizeObserver?.disconnect();
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", resize);
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
