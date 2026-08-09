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
  const cameraProgress = ease(progress);
  const unit = Math.min(width, height);
  const radius = unit * 0.2;
  const length = unit * 0.86;

  context.save();
  context.globalAlpha = alpha;
  context.translate(
    width * lerp(0.88, 0.69, progress),
    height * lerp(0.57, 0.52, cameraProgress),
  );
  context.scale(lerp(2.75, 0.74, progress), lerp(2.75, 0.74, progress));
  context.rotate(lerp(0.08, -0.64, cameraProgress));

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
    width * lerp(1.02, 0.72, progress),
    height * lerp(0.58, 0.5, cameraProgress),
  );
  context.scale(lerp(2.38, 0.78, progress), lerp(2.38, 0.78, progress));
  context.rotate(lerp(-0.05, -0.23, cameraProgress));

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
    width * lerp(0.92, 0.72, progress),
    height * lerp(0.58, 0.5, cameraProgress),
  );
  context.scale(lerp(2.05, 0.84, progress), lerp(2.05, 0.84, progress));
  context.rotate(lerp(-0.28, 0.08, cameraProgress));

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
  context.translate(width * lerp(0.2, 0, progress), height * lerp(0.08, 0, cameraProgress));
  context.scale(lerp(1.62, 0.94, progress), lerp(1.62, 0.94, progress));
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

    resize();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", resize);
    media.addEventListener("change", handleMotionPreference);

    return () => {
      if (frame !== 0) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", resize);
      media.removeEventListener("change", handleMotionPreference);
    };
  }, [chapter]);

  return <canvas ref={canvasRef} className="scene-canvas" aria-hidden="true" />;
}
