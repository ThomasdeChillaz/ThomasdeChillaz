"use client";

import { useEffect, useRef } from "react";
import type { ThreeStage } from "./ThreeScenes";
import { calculateChapterProgress, calculateEducationTransition, ease, lerp } from "./scrollMath.mjs";

export type Chapter = "hero" | "health" | "space" | "education" | "building" | "impact";

const REDUCED_MOTION_PROGRESS: Readonly<Record<Chapter, number>> = {
  hero: 0.5,
  health: 0.66,
  space: 0.58,
  education: 0.64,
  building: 0.82,
  impact: 0.64,
};

function getChapterProgress(chapter: Chapter) {
  const section = document.querySelector<HTMLElement>(`[data-chapter="${chapter}"]`);
  if (!section) return 0;

  return calculateChapterProgress(
    window.scrollY,
    section.offsetTop,
    section.offsetHeight,
    window.innerHeight,
  );
}

type BeatRange = readonly [enter: number, entered: number, exit: number, exited: number];
type StoryBeat = Readonly<{ element: HTMLElement; range: BeatRange }>;

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

export function SceneCanvas({ chapter }: { chapter: Chapter }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<ThreeStage | null>(null);
  const moduleRef = useRef<typeof import("./ThreeScenes") | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let disposed = false;
    let initializationId = 0;

    const activateFallback = () => {
      canvas.dataset.webgl = "fallback";
    };
    const initialize = async () => {
      const activeInitialization = ++initializationId;
      try {
        const threeScenes = await import("./ThreeScenes");
        if (disposed || activeInitialization !== initializationId) return;
        moduleRef.current = threeScenes;
        stageRef.current = threeScenes.createThreeStage(canvas);
        canvas.dataset.webgl = "ready";
        canvas.dispatchEvent(new Event("webglready"));
      } catch {
        if (disposed || activeInitialization !== initializationId) return;
        stageRef.current = null;
        activateFallback();
      }
    };
    const handleContextLost = (event: Event) => {
      event.preventDefault();
      const stage = stageRef.current;
      stageRef.current = null;
      if (stage && moduleRef.current) moduleRef.current.disposeThreeStage(stage);
      activateFallback();
    };
    const handleContextRestored = () => void initialize();

    canvas.addEventListener("webglcontextlost", handleContextLost);
    canvas.addEventListener("webglcontextrestored", handleContextRestored);
    void initialize();

    return () => {
      disposed = true;
      initializationId += 1;
      canvas.removeEventListener("webglcontextlost", handleContextLost);
      canvas.removeEventListener("webglcontextrestored", handleContextRestored);
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
    let reducedMotion = media.matches;
    let reducedTransparency = transparencyMedia.matches;
    const reducedMotionProgress = REDUCED_MOTION_PROGRESS[chapter];
    let targetProgress = reducedMotion ? reducedMotionProgress : getChapterProgress(chapter);
    let displayedProgress = targetProgress;
    let frame = 0;
    const section = document.querySelector<HTMLElement>(`[data-chapter="${chapter}"]`);
    const educationSection = document.querySelector<HTMLElement>('[data-chapter="education"]');
    const storyBeats = createStoryBeats(section);
    const storyStyleCache = new WeakMap<HTMLElement, string>();
    let sectionTop = section?.offsetTop ?? 0;
    let sectionHeight = section?.offsetHeight ?? window.innerHeight;
    let educationTop = educationSection?.offsetTop ?? Number.POSITIVE_INFINITY;

    const measureSection = () => {
      sectionTop = section?.offsetTop ?? 0;
      sectionHeight = section?.offsetHeight ?? window.innerHeight;
      educationTop = educationSection?.offsetTop ?? Number.POSITIVE_INFINITY;
    };
    const readProgress = () => calculateChapterProgress(
      window.scrollY,
      sectionTop,
      sectionHeight,
      window.innerHeight,
    );
    const readEducationTransition = () => calculateEducationTransition(
      window.scrollY,
      educationTop,
      window.innerHeight,
    );
    const paint = () => {
      const stage = stageRef.current;
      const threeScenes = moduleRef.current;
      const spaceEducationTransition = reducedMotion || reducedTransparency
        ? Number(chapter === "education")
        : readEducationTransition();
      if (stage && threeScenes) {
        try {
          threeScenes.updateThreeScene(
            stage,
            chapter,
            displayedProgress,
            window.innerWidth,
            window.innerHeight,
            spaceEducationTransition,
            reducedTransparency,
          );
        } catch {
          stageRef.current = null;
          if (canvas) canvas.dataset.webgl = "fallback";
          threeScenes.disposeThreeStage(stage);
        }
      }
      updateStoryBeats(storyBeats, displayedProgress, reducedMotion, storyStyleCache);
    };
    const animate = () => {
      frame = 0;
      targetProgress = reducedMotion ? reducedMotionProgress : readProgress();
      const delta = targetProgress - displayedProgress;
      displayedProgress = reducedMotion || Math.abs(delta) < 0.001
        ? targetProgress
        : displayedProgress + delta * 0.16;
      paint();
      if (!reducedMotion && Math.abs(targetProgress - displayedProgress) >= 0.001) {
        frame = requestAnimationFrame(animate);
      }
    };
    const schedule = (force = false) => {
      if ((!force && reducedMotion) || frame !== 0) return;
      frame = requestAnimationFrame(animate);
    };
    const resize = () => {
      measureSection();
      schedule(true);
    };
    const handleMotionPreference = (event: MediaQueryListEvent) => {
      reducedMotion = event.matches;
      displayedProgress = reducedMotion ? reducedMotionProgress : readProgress();
      schedule(true);
    };
    const handleTransparencyPreference = (event: MediaQueryListEvent) => {
      reducedTransparency = event.matches;
      schedule(true);
    };
    const handleScroll = () => schedule();
    const handleStageReady = () => schedule(true);
    const sizeObserver = "ResizeObserver" in window
      ? new ResizeObserver(() => {
        measureSection();
        schedule(true);
      })
      : null;

    resize();
    sizeObserver?.observe(document.documentElement);
    if (section) sizeObserver?.observe(section);
    if (educationSection && educationSection !== section) sizeObserver?.observe(educationSection);
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
  }, [chapter]);

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
