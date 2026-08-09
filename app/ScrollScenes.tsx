"use client";

import { useEffect, useRef } from "react";
import { calculateChapterProgress, ease, lerp } from "./scrollMath.mjs";

export type Chapter = "hero" | "health" | "space" | "education" | "building" | "impact";

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

type TrackPoint = readonly [progress: number, value: number];
type BeatRange = readonly [enter: number, entered: number, exit: number, exited: number];
type StoryBeat = Readonly<{ element: HTMLElement; range: BeatRange }>;

const HEALTH_CAMERA = {
  x: [[0, 0.88], [0.14, 0.88], [0.22, 0.81], [0.34, 0.81], [0.44, 0.75], [0.56, 0.75], [0.66, 0.69], [1, 0.67]],
  y: [[0, 0.57], [0.22, 0.55], [0.44, 0.53], [0.66, 0.51], [1, 0.5]],
  scale: [[0, 2.35], [0.14, 2.35], [0.22, 1.6], [0.34, 1.6], [0.44, 1.18], [0.56, 1.18], [0.66, 0.82], [1, 0.76]],
  rotation: [[0, 0.08], [0.14, 0.08], [0.22, -0.12], [0.34, -0.12], [0.44, -0.3], [0.56, -0.3], [0.66, -0.52], [1, -0.58]],
} as const;

const SPACE_CAMERA = {
  x: [[0, 1.01], [0.15, 1.01], [0.25, 0.82], [0.45, 0.82], [0.55, 0.72], [0.76, 0.72], [0.86, 0.66], [1, 0.66]],
  y: [[0, 0.58], [0.25, 0.53], [0.55, 0.5], [0.86, 0.47], [1, 0.47]],
  scale: [[0, 2.2], [0.15, 2.2], [0.25, 1.32], [0.45, 1.32], [0.55, 0.91], [0.76, 0.91], [0.86, 0.72], [1, 0.72]],
  rotation: [[0, -0.05], [0.45, -0.05], [0.55, -0.16], [0.76, -0.16], [0.86, -0.23], [1, -0.23]],
} as const;

const EDUCATION_CAMERA = {
  x: [[0, 0.9], [0.14, 0.9], [0.23, 0.82], [0.4, 0.82], [0.5, 0.74], [0.64, 0.74], [0.74, 0.68], [1, 0.68]],
  y: [[0, 0.56], [0.23, 0.52], [0.5, 0.48], [0.74, 0.52], [1, 0.52]],
  scale: [[0, 1.36], [0.14, 1.36], [0.23, 1.12], [0.4, 1.12], [0.5, 1.02], [0.64, 1.02], [0.74, 0.9], [1, 0.9]],
  rotation: [[0, -0.14], [0.23, -0.08], [0.5, 0], [0.74, 0.06], [1, 0.06]],
} as const;

const SIGNAL_CAMERA = {
  x: [[0, 0.16], [0.1, 0.16], [0.17, 0.08], [0.29, 0.08], [0.36, 0.02], [0.48, 0.02], [0.55, -0.04], [0.67, -0.04], [0.74, -0.1], [1, -0.1]],
  y: [[0, 0.06], [0.36, 0.02], [0.74, -0.02], [1, -0.02]],
  scale: [[0, 1.3], [0.1, 1.3], [0.17, 1.14], [0.29, 1.14], [0.36, 1.04], [0.48, 1.04], [0.55, 0.96], [0.67, 0.96], [0.74, 0.88], [1, 0.88]],
} as const;

function sampleTrack(progress: number, points: ReadonlyArray<TrackPoint>) {
  if (progress <= points[0][0]) return points[0][1];
  for (let index = 1; index < points.length; index += 1) {
    const [end, endValue] = points[index];
    const [start, startValue] = points[index - 1];
    if (progress <= end) {
      const localProgress = ease((progress - start) / Math.max(0.001, end - start));
      return lerp(startValue, endValue, localProgress);
    }
  }
  return points[points.length - 1][1];
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
    const fadeIn = reducedMotion ? 1 : ease((progress - enter) / Math.max(0.001, entered - enter));
    const fadeOut = reducedMotion ? 1 : 1 - ease((progress - exit) / Math.max(0.001, exited - exit));
    const translateY = reducedMotion
      ? 0
      : progress < entered
        ? lerp(28, 0, fadeIn)
        : lerp(0, -20, 1 - fadeOut);
    const translate = `${translateY.toFixed(2)}px`;
    const clipTop = `${((1 - fadeIn) * 100).toFixed(2)}%`;
    const clipBottom = `${((1 - fadeOut) * 100).toFixed(2)}%`;
    const styleKey = `${translate}|${clipTop}|${clipBottom}`;
    if (styleCache.get(beat.element) === styleKey) return;
    beat.element.style.setProperty("--beat-opacity", "1");
    beat.element.style.setProperty("--beat-translate-y", translate);
    beat.element.style.setProperty("--beat-clip-top", clipTop);
    beat.element.style.setProperty("--beat-clip-bottom", clipBottom);
    styleCache.set(beat.element, styleKey);
  });
}

function drawStars(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  alpha: number,
  drift = 0,
) {
  for (let index = 0; index < 120; index += 1) {
    const x = ((((index * 97.13) % 1000) / 1000) * width + drift * (index % 4)) % width;
    const y = (((index * index * 13.7 + 17) % 1000) / 1000) * height;
    const radius = index % 17 === 0 ? 1.5 : 0.65;
    context.beginPath();
    context.fillStyle = `rgba(255,255,255,${alpha * (0.12 + (index % 5) * 0.07)})`;
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  }
}

function traceHelixRail(
  context: CanvasRenderingContext2D,
  radius: number,
  length: number,
  phaseOffset: number,
  color: string,
) {
  context.beginPath();
  for (let index = 0; index <= 110; index += 1) {
    const ratio = index / 110;
    const phase = ratio * Math.PI * 7.2 + phaseOffset;
    const x = Math.sin(phase) * radius;
    const y = lerp(-length, length, ratio);
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
  context.lineCap = "round";
  context.strokeStyle = "rgba(7,13,16,0.94)";
  context.lineWidth = Math.max(13, radius * 0.23);
  context.shadowColor = "rgba(0,0,0,0.7)";
  context.shadowBlur = 18;
  context.stroke();
  context.shadowBlur = 0;
  context.strokeStyle = `rgba(${color},0.72)`;
  context.lineWidth = Math.max(3, radius * 0.052);
  context.stroke();
  context.strokeStyle = "rgba(255,255,255,0.23)";
  context.lineWidth = Math.max(1, radius * 0.014);
  context.stroke();
}

function drawDna(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  progress: number,
  alpha: number,
) {
  const unit = Math.min(width, height);
  const radius = unit * 0.2;
  const length = unit * 0.86;

  context.save();
  context.globalAlpha = alpha;
  context.translate(
    width * sampleTrack(progress, HEALTH_CAMERA.x),
    height * sampleTrack(progress, HEALTH_CAMERA.y),
  );
  context.scale(sampleTrack(progress, HEALTH_CAMERA.scale), sampleTrack(progress, HEALTH_CAMERA.scale));
  context.rotate(sampleTrack(progress, HEALTH_CAMERA.rotation));

  for (let index = 0; index <= 34; index += 1) {
    const ratio = index / 34;
    const phase = ratio * Math.PI * 7.2;
    const depth = (Math.cos(phase) + 1) / 2;
    const y = lerp(-length, length, ratio);
    const leftX = Math.sin(phase) * radius;
    const rightX = Math.sin(phase + Math.PI) * radius;
    const hot = index % 5 === 0;

    context.beginPath();
    context.moveTo(leftX, y);
    context.lineTo(rightX, y);
    context.strokeStyle = `rgba(205,219,220,${0.16 + depth * 0.48})`;
    context.lineWidth = 3 + depth * 7;
    context.shadowColor = hot ? "rgba(255,128,73,0.7)" : "rgba(77,222,239,0.38)";
    context.shadowBlur = hot ? 20 : 8;
    context.stroke();
    context.shadowBlur = 0;

    for (const [x, color] of [
      [leftX, "68,219,237"],
      [rightX, "255,128,73"],
    ] as const) {
      const size = 5 + depth * 8;
      context.fillStyle = `rgba(${color},${0.72 + depth * 0.24})`;
      context.beginPath();
      context.arc(x, y, size, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = `rgba(${color},${hot ? 0.55 : 0.16})`;
      context.lineWidth = 1.2;
      context.beginPath();
      context.arc(x, y, size + (hot ? 11 : 4), 0, Math.PI * 2);
      context.stroke();
    }
  }

  traceHelixRail(context, radius, length, 0, "68,219,237");
  traceHelixRail(context, radius, length, Math.PI, "255,128,73");
  context.restore();
}

function drawPlanet(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  progress: number,
  alpha: number,
) {
  const cameraProgress = ease(progress);
  const radius = Math.min(width, height) * 0.34;
  drawStars(context, width, height, alpha, progress * -10);

  context.save();
  context.globalAlpha = alpha;
  context.translate(
    width * sampleTrack(progress, SPACE_CAMERA.x),
    height * sampleTrack(progress, SPACE_CAMERA.y),
  );
  context.scale(sampleTrack(progress, SPACE_CAMERA.scale), sampleTrack(progress, SPACE_CAMERA.scale));
  context.rotate(sampleTrack(progress, SPACE_CAMERA.rotation));

  context.strokeStyle = "rgba(255,211,142,0.4)";
  context.lineWidth = 3;
  context.beginPath();
  context.ellipse(0, 0, radius * 1.68, radius * 0.38, -0.06, 0, Math.PI * 2);
  context.stroke();
  context.strokeStyle = "rgba(255,211,142,0.1)";
  context.lineWidth = 1;
  context.beginPath();
  context.ellipse(0, 0, radius * 1.36, radius * 0.57, 0.5, 0, Math.PI * 2);
  context.stroke();

  const planet = context.createRadialGradient(
    -radius * 0.34,
    -radius * 0.42,
    radius * 0.03,
    0,
    0,
    radius,
  );
  planet.addColorStop(0, "#fff1c7");
  planet.addColorStop(0.2, "#ffba63");
  planet.addColorStop(0.54, "#d34d32");
  planet.addColorStop(0.83, "#351326");
  planet.addColorStop(1, "#060910");
  context.fillStyle = planet;
  context.shadowColor = "rgba(255,101,61,0.26)";
  context.shadowBlur = radius * 0.23;
  context.beginPath();
  context.arc(0, 0, radius, 0, Math.PI * 2);
  context.fill();
  context.shadowBlur = 0;

  context.save();
  context.beginPath();
  context.arc(0, 0, radius * 0.97, 0, Math.PI * 2);
  context.clip();
  context.rotate(-0.08);
  for (let index = -5; index <= 5; index += 1) {
    const y = index * radius * 0.17 + Math.sin(index * 2.1 + progress * 2) * 5;
    context.strokeStyle = `rgba(255,226,177,${index % 2 === 0 ? 0.07 : 0.035})`;
    context.lineWidth = radius * 0.09;
    context.beginPath();
    context.moveTo(-radius, y);
    context.bezierCurveTo(-radius * 0.4, y - 18, radius * 0.4, y + 18, radius, y);
    context.stroke();
  }
  context.restore();

  const moonAngle = lerp(-0.8, 1.05, cameraProgress);
  context.fillStyle = "rgba(255,238,204,0.94)";
  context.beginPath();
  context.arc(
    Math.cos(moonAngle) * radius * 1.6,
    Math.sin(moonAngle) * radius * 0.37,
    Math.max(4, radius * 0.037),
    0,
    Math.PI * 2,
  );
  context.fill();
  context.restore();
}

function drawEducation(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  progress: number,
  alpha: number,
) {
  const cameraProgress = ease(progress);
  const radius = Math.min(width, height) * 0.3;
  const labels = ["AI", "DATA", "MATH", "CODE", "BIZ", "SCIENCE"];

  context.save();
  context.globalAlpha = alpha;
  context.translate(
    width * sampleTrack(progress, EDUCATION_CAMERA.x),
    height * sampleTrack(progress, EDUCATION_CAMERA.y),
  );
  context.scale(sampleTrack(progress, EDUCATION_CAMERA.scale), sampleTrack(progress, EDUCATION_CAMERA.scale));
  context.rotate(sampleTrack(progress, EDUCATION_CAMERA.rotation));

  for (let ring = 1; ring <= 4; ring += 1) {
    context.strokeStyle = `rgba(91,210,255,${0.06 + ring * 0.025})`;
    context.lineWidth = 1;
    context.beginPath();
    context.arc(0, 0, radius * (ring / 4), 0, Math.PI * 2);
    context.stroke();
  }

  const nodes = labels.map((label, index) => {
    const angle = (index / labels.length) * Math.PI * 2 + cameraProgress * 0.55;
    const orbit = radius * (0.52 + (index % 3) * 0.22);
    return { label, x: Math.cos(angle) * orbit, y: Math.sin(angle) * orbit };
  });

  context.strokeStyle = "rgba(124,232,255,0.17)";
  nodes.forEach((node, index) => {
    const partner = nodes[(index + 2) % nodes.length];
    context.beginPath();
    context.moveTo(node.x, node.y);
    context.lineTo(partner.x, partner.y);
    context.stroke();
  });

  nodes.forEach((node, index) => {
    context.fillStyle = index % 2 ? "rgba(124,232,255,0.95)" : "rgba(255,226,153,0.95)";
    context.shadowColor = context.fillStyle;
    context.shadowBlur = 15;
    context.beginPath();
    context.arc(node.x, node.y, 5.5, 0, Math.PI * 2);
    context.fill();
    context.shadowBlur = 0;
    context.fillStyle = "rgba(225,242,255,0.66)";
    context.font = "11px ui-monospace, monospace";
    context.fillText(node.label, node.x + 12, node.y + 4);
  });

  context.strokeStyle = "rgba(124,232,255,0.52)";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(0, -radius * 0.15);
  context.lineTo(-radius * 0.17, radius * 0.12);
  context.lineTo(radius * 0.17, radius * 0.12);
  context.closePath();
  context.stroke();
  context.restore();
}

function drawSignalField(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  progress: number,
  alpha: number,
  warm = false,
) {
  const cameraProgress = ease(progress);
  const color = warm ? "255,142,106" : "111,214,255";

  context.save();
  context.globalAlpha = alpha;
  context.translate(
    width * sampleTrack(progress, SIGNAL_CAMERA.x),
    height * sampleTrack(progress, SIGNAL_CAMERA.y),
  );
  context.scale(sampleTrack(progress, SIGNAL_CAMERA.scale), sampleTrack(progress, SIGNAL_CAMERA.scale));
  const startX = width * 0.49;
  const endX = width * 1.06;

  for (let track = 0; track < 10; track += 1) {
    const baseline = height * (0.14 + track * 0.083);
    const amplitude = 6 + (track % 4) * 4;
    context.strokeStyle = `rgba(${color},${0.07 + track * 0.008})`;
    context.lineWidth = track % 3 === 0 ? 1.5 : 0.8;
    context.beginPath();
    for (let x = startX; x <= endX; x += 16) {
      const y = baseline + Math.sin(x * 0.012 + cameraProgress * 4 + track) * amplitude
        + Math.sin(x * 0.035 - cameraProgress * 2 + track * 2.1) * amplitude * 0.32;
      if (x === startX) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.stroke();

    const markerX = lerp(startX, endX, (cameraProgress + track * 0.11) % 1);
    const markerY = baseline + Math.sin(markerX * 0.012 + cameraProgress * 4 + track) * amplitude;
    context.fillStyle = `rgba(${color},${0.3 + (track % 3) * 0.12})`;
    context.beginPath();
    context.arc(markerX, markerY, 2 + (track % 2), 0, Math.PI * 2);
    context.fill();
  }
  context.restore();
}

function renderScene(
  context: CanvasRenderingContext2D,
  chapter: Chapter,
  width: number,
  height: number,
  progress: number,
) {
  context.clearRect(0, 0, width, height);
  if (chapter === "health") drawDna(context, width, height, progress, 1);
  if (chapter === "space") drawPlanet(context, width, height, progress, 1);
  if (chapter === "education") drawEducation(context, width, height, progress, 1);
  if (chapter === "building") drawSignalField(context, width, height, progress, 1);
  if (chapter === "impact") drawSignalField(context, width, height, progress, 1, true);
  if (chapter === "hero") {
    drawStars(context, width, height, 0.55);
    drawSignalField(context, width, height, progress, 0.34);
  }
}

export function SceneCanvas({ chapter }: { chapter: Chapter }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reducedMotion = media.matches;
    let targetProgress = reducedMotion ? 0.64 : getChapterProgress(chapter);
    let displayedProgress = targetProgress;
    let frame = 0;
    let dpr = 1;
    const section = document.querySelector<HTMLElement>(`[data-chapter="${chapter}"]`);
    const storyBeats = createStoryBeats(section);
    const storyStyleCache = new WeakMap<HTMLElement, string>();
    let sectionTop = section?.offsetTop ?? 0;
    let sectionHeight = section?.offsetHeight ?? window.innerHeight;

    const measureSection = () => {
      sectionTop = section?.offsetTop ?? 0;
      sectionHeight = section?.offsetHeight ?? window.innerHeight;
    };

    const readProgress = () => calculateChapterProgress(
      window.scrollY,
      sectionTop,
      sectionHeight,
      window.innerHeight,
    );

    const paint = () => {
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      renderScene(context, chapter, window.innerWidth, window.innerHeight, displayedProgress);
      updateStoryBeats(storyBeats, displayedProgress, reducedMotion, storyStyleCache);
    };

    const animate = () => {
      frame = 0;
      targetProgress = reducedMotion ? 0.64 : readProgress();
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
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      measureSection();
      schedule(true);
    };

    const handleMotionPreference = (event: MediaQueryListEvent) => {
      reducedMotion = event.matches;
      displayedProgress = reducedMotion ? 0.64 : readProgress();
      schedule(true);
    };

    const handleScroll = () => schedule();
    const sizeObserver = "ResizeObserver" in window
      ? new ResizeObserver(() => {
        measureSection();
        schedule(true);
      })
      : null;

    resize();
    sizeObserver?.observe(document.documentElement);
    if (section) sizeObserver?.observe(section);
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", resize);
    media.addEventListener("change", handleMotionPreference);

    return () => {
      if (frame !== 0) cancelAnimationFrame(frame);
      sizeObserver?.disconnect();
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", resize);
      media.removeEventListener("change", handleMotionPreference);
    };
  }, [chapter]);

  return <canvas ref={canvasRef} className="scene-canvas" aria-hidden="true" />;
}
