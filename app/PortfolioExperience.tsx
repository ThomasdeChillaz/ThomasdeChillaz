"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

type Chapter = "hero" | "research" | "space" | "education" | "building" | "impact";
const MOTION_STORAGE_KEY = "thomas-motion-paused";

function readMotionPreference() {
  try {
    return window.localStorage.getItem(MOTION_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeMotionPreference(paused: boolean) {
  try {
    window.localStorage.setItem(MOTION_STORAGE_KEY, String(paused));
  } catch {
    // The control still works for this session when storage is unavailable.
  }
}

const CHAPTERS: ReadonlyArray<{ id: Chapter; label: string; number: string }> = [
  { id: "research", label: "Cell", number: "01" },
  { id: "space", label: "Space", number: "02" },
  { id: "education", label: "Learn", number: "03" },
  { id: "building", label: "Build", number: "04" },
  { id: "impact", label: "Reach", number: "05" },
];

function isChapter(value: string | undefined): value is Chapter {
  return value === "hero" || CHAPTERS.some((chapter) => chapter.id === value);
}

const skillGroups = [
  {
    label: "Research computing",
    skills: ["Python", "PyTorch", "Torchvision", "scikit-learn", "NumPy", "Pandas"],
  },
  {
    label: "Methods",
    skills: ["Computer vision", "Survival analysis", "Multimodal ML", "Data visualization"],
  },
  {
    label: "Product",
    skills: ["HTML / CSS / JavaScript", "SQLite", "AI agents", "User research"],
  },
] as const;

const NETWORK_NODES = Array.from({ length: 32 }, (_, index) => ({
  x: 0.54 + ((index * 71) % 43) / 100,
  y: 0.08 + ((index * 113) % 85) / 100,
}));

function drawStars(context: CanvasRenderingContext2D, width: number, height: number, alpha: number) {
  for (let index = 0; index < 110; index += 1) {
    const x = ((index * 97.13) % 1000) / 1000 * width;
    const y = ((index * index * 13.7 + 17) % 1000) / 1000 * height;
    const radius = index % 13 === 0 ? 1.6 : 0.7;
    context.beginPath();
    context.fillStyle = `rgba(255,255,255,${alpha * (0.16 + (index % 5) * 0.07)})`;
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  }
}

function drawDna(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  alpha: number,
) {
  const centerX = width * 0.73;
  const span = Math.min(width * 0.28, 255);
  context.save();
  context.globalAlpha = alpha;
  context.lineCap = "round";

  for (let index = -6; index < 40; index += 1) {
    const y = (index / 39) * height + ((time * 15) % (height / 39));
    const phase = index * 0.52 + time * 0.75;
    const leftX = centerX + Math.sin(phase) * span;
    const rightX = centerX + Math.sin(phase + Math.PI) * span;
    const depth = (Math.cos(phase) + 1) / 2;

    context.beginPath();
    context.strokeStyle = `rgba(156,255,199,${0.12 + depth * 0.28})`;
    context.lineWidth = 1 + depth * 1.5;
    context.moveTo(leftX, y);
    context.lineTo(rightX, y);
    context.stroke();

    for (const [x, color] of [
      [leftX, "129,255,190"],
      [rightX, "255,105,168"],
    ] as const) {
      context.shadowColor = `rgba(${color},0.8)`;
      context.shadowBlur = 12 + depth * 12;
      context.fillStyle = `rgba(${color},0.9)`;
      context.beginPath();
      context.arc(x, y, 2.6 + depth * 2.8, 0, Math.PI * 2);
      context.fill();
      context.shadowBlur = 0;
    }
  }

  context.restore();
}

function drawPlanet(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  alpha: number,
) {
  context.save();
  context.globalAlpha = alpha;
  drawStars(context, width, height, alpha);
  const x = width * 0.74;
  const y = height * 0.48;
  const radius = Math.min(width, height) * 0.27;

  context.save();
  context.translate(x, y);
  context.rotate(-0.18);
  context.strokeStyle = "rgba(255,218,147,0.34)";
  context.lineWidth = Math.max(2, radius * 0.025);
  context.beginPath();
  context.ellipse(0, 0, radius * 1.65, radius * 0.38, 0, 0, Math.PI * 2);
  context.stroke();
  context.restore();

  const planet = context.createRadialGradient(
    x - radius * 0.33,
    y - radius * 0.4,
    radius * 0.05,
    x,
    y,
    radius,
  );
  planet.addColorStop(0, "#fff4cf");
  planet.addColorStop(0.18, "#ffbd65");
  planet.addColorStop(0.55, "#d85135");
  planet.addColorStop(0.84, "#3b1628");
  planet.addColorStop(1, "rgba(5,7,14,0)");
  context.fillStyle = planet;
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fill();

  context.save();
  context.beginPath();
  context.arc(x, y, radius * 0.97, 0, Math.PI * 2);
  context.clip();
  context.translate(x, y);
  context.rotate(-0.22);
  for (let index = -5; index <= 5; index += 1) {
    const bandY = index * radius * 0.17 + Math.sin(time * 0.3 + index) * 5;
    context.strokeStyle = `rgba(255,224,176,${0.035 + (index % 2 === 0 ? 0.035 : 0)})`;
    context.lineWidth = radius * 0.09;
    context.beginPath();
    context.moveTo(-radius, bandY);
    context.bezierCurveTo(-radius * 0.4, bandY - 18, radius * 0.4, bandY + 18, radius, bandY);
    context.stroke();
  }
  context.restore();

  const moonAngle = time * 0.36;
  const moonX = x + Math.cos(moonAngle) * radius * 1.6;
  const moonY = y + Math.sin(moonAngle) * radius * 0.37;
  context.fillStyle = "rgba(255,236,201,0.9)";
  context.beginPath();
  context.arc(moonX, moonY, Math.max(3, radius * 0.035), 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawEducation(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  alpha: number,
) {
  context.save();
  context.globalAlpha = alpha;
  const centerX = width * 0.76;
  const centerY = height * 0.5;
  const radius = Math.min(width, height) * 0.25;

  for (let ring = 1; ring <= 4; ring += 1) {
    context.strokeStyle = `rgba(95,190,255,${0.07 + ring * 0.025})`;
    context.lineWidth = 1;
    context.beginPath();
    context.arc(centerX, centerY, radius * (ring / 4), 0, Math.PI * 2);
    context.stroke();
  }

  const labels = ["AI", "DATA", "MATH", "CODE", "BIZ", "SCIENCE"];
  labels.forEach((label, index) => {
    const angle = index / labels.length * Math.PI * 2 + time * 0.12;
    const orbit = radius * (0.52 + (index % 3) * 0.22);
    const x = centerX + Math.cos(angle) * orbit;
    const y = centerY + Math.sin(angle) * orbit;
    context.fillStyle = index % 2 ? "rgba(138,233,255,0.88)" : "rgba(255,234,166,0.92)";
    context.beginPath();
    context.arc(x, y, 4, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "rgba(226,242,255,0.52)";
    context.font = "11px ui-monospace, monospace";
    context.fillText(label, x + 11, y + 4);
  });

  context.strokeStyle = "rgba(139,226,255,0.32)";
  context.lineWidth = 1.5;
  context.beginPath();
  context.moveTo(centerX, centerY - radius * 0.15);
  context.lineTo(centerX - radius * 0.16, centerY + radius * 0.12);
  context.lineTo(centerX + radius * 0.16, centerY + radius * 0.12);
  context.closePath();
  context.stroke();
  context.restore();
}

function drawNetwork(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  alpha: number,
  warm = false,
) {
  context.save();
  context.globalAlpha = alpha;
  const color = warm ? "255,142,106" : "111,214,255";
  NETWORK_NODES.forEach((node, index) => {
    const next = NETWORK_NODES[(index * 7 + 5) % NETWORK_NODES.length];
    const nodeX = width * node.x;
    const nodeY = height * node.y;
    const nextX = width * next.x;
    const nextY = height * next.y;
    context.strokeStyle = `rgba(${color},0.09)`;
    context.beginPath();
    context.moveTo(nodeX, nodeY);
    context.lineTo(nextX, nextY);
    context.stroke();
    const pulse = 1 + Math.sin(time * 1.4 + index) * 0.5;
    context.fillStyle = `rgba(${color},${0.3 + pulse * 0.18})`;
    context.beginPath();
    context.arc(nodeX, nodeY, 1.6 + pulse, 0, Math.PI * 2);
    context.fill();
  });
  context.restore();
}

function SceneCanvas({ chapter, paused }: { chapter: Chapter; paused: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activeRef = useRef<Chapter>(chapter);
  const previousRef = useRef<Chapter>(chapter);
  const transitionStartRef = useRef(0);

  useEffect(() => {
    if (activeRef.current !== chapter) {
      previousRef.current = activeRef.current;
      activeRef.current = chapter;
      transitionStartRef.current = performance.now();
    }
  }, [chapter]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    let frame = 0;
    let isVisible = true;
    let lastDraw = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      schedule(true);
    };

    const renderScene = (scene: Chapter, time: number, alpha: number) => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      if (scene === "research") drawDna(context, width, height, time, alpha);
      if (scene === "space") drawPlanet(context, width, height, time, alpha);
      if (scene === "education") drawEducation(context, width, height, time, alpha);
      if (scene === "building") drawNetwork(context, width, height, time, alpha);
      if (scene === "impact") drawNetwork(context, width, height, time, alpha, true);
      if (scene === "hero") {
        drawStars(context, width, height, alpha * 0.55);
        drawNetwork(context, width, height, time, alpha * 0.55);
      }
    };

    const schedule = (force = false) => {
      if (frame === 0 && (force || (!paused && isVisible))) {
        frame = requestAnimationFrame(animate);
      }
    };

    const animate = (timestamp: number) => {
      frame = 0;
      if (!paused && timestamp - lastDraw < 1000 / 45) {
        schedule();
        return;
      }
      lastDraw = timestamp;
      const width = window.innerWidth;
      const height = window.innerHeight;
      context.clearRect(0, 0, width, height);
      const time = paused ? 4.25 : timestamp / 1000;
      if (paused) {
        renderScene(activeRef.current, time, 1);
      } else {
        const transition = Math.min(1, (timestamp - transitionStartRef.current) / 900);
        if (transition < 1) renderScene(previousRef.current, time, 1 - transition);
        renderScene(activeRef.current, time, transition);
        schedule();
      }
    };

    const handleVisibility = () => {
      isVisible = document.visibilityState === "visible";
      if (!isVisible && frame !== 0) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
      if (isVisible) schedule(true);
    };

    resize();
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", handleVisibility);
    schedule(true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [paused, chapter]);

  return <canvas ref={canvasRef} className="scene-canvas" aria-hidden="true" />;
}

function ProjectCard({
  index,
  title,
  kicker,
  summary,
  details,
  tags,
  href,
}: {
  index: string;
  title: string;
  kicker: string;
  summary: string;
  details: string;
  tags: ReadonlyArray<string>;
  href?: string;
}) {
  return (
    <article className="project-card">
      <div className="project-topline">
        <span>{index}</span>
        <span>{kicker}</span>
      </div>
      <h3>{title}</h3>
      <p>{summary}</p>
      <details>
        <summary>Open project notes <span aria-hidden="true">↗</span></summary>
        <p>{details}</p>
        {href ? (
          <a className="text-link" href={href} target="_blank" rel="noreferrer">
            View public project
          </a>
        ) : null}
      </details>
      <ul className="tag-list" aria-label={`${title} technologies`}>
        {tags.map((tag) => <li key={tag}>{tag}</li>)}
      </ul>
    </article>
  );
}

export default function PortfolioExperience() {
  const [chapter, setChapter] = useState<Chapter>("hero");
  const [paused, setPaused] = useState(true);
  const progressRef = useRef<HTMLDivElement>(null);
  const progressFillRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const stored = readMotionPreference();
    const preferenceFrame = requestAnimationFrame(() => {
      setPaused(stored === "true" || (stored === null && media.matches));
    });
    const handleMotionPreference = (event: MediaQueryListEvent) => {
      if (readMotionPreference() === null) {
        setPaused(event.matches);
      }
    };
    media.addEventListener("change", handleMotionPreference);

    const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-chapter]"));
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible && visible.target instanceof HTMLElement) {
          const nextChapter = visible.target.dataset.chapter;
          if (isChapter(nextChapter)) setChapter(nextChapter);
        }
      },
      { rootMargin: "-25% 0px -45%", threshold: [0, 0.2, 0.45, 0.7] },
    );
    sections.forEach((section) => observer.observe(section));

    let progressFrame = 0;
    const updateProgress = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const progress = Math.min(1, Math.max(0, scrollable > 0 ? window.scrollY / scrollable : 0));
      if (progressFillRef.current) progressFillRef.current.style.transform = `scaleX(${progress})`;
      if (progressRef.current) progressRef.current.setAttribute("aria-valuenow", String(Math.round(progress * 100)));
      progressFrame = 0;
    };
    const onScroll = () => {
      if (progressFrame === 0) progressFrame = requestAnimationFrame(updateProgress);
    };
    const sizeObserver = "ResizeObserver" in window ? new ResizeObserver(onScroll) : null;
    sizeObserver?.observe(document.documentElement);
    updateProgress();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(preferenceFrame);
      if (progressFrame !== 0) cancelAnimationFrame(progressFrame);
      media.removeEventListener("change", handleMotionPreference);
      observer.disconnect();
      sizeObserver?.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const toggleMotion = () => {
    const next = !paused;
    setPaused(next);
    writeMotionPreference(next);
  };

  return (
    <div className="portfolio" data-theme={chapter} data-motion={paused ? "paused" : "playing"}>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <SceneCanvas chapter={chapter} paused={paused} />
      <div className="ambient-grid" aria-hidden="true" />
      <div ref={progressRef} className="scroll-progress" role="progressbar" aria-label="Scroll progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={0}>
        <span ref={progressFillRef} />
      </div>

      <header className="site-header">
        <a className="wordmark" href="#top" aria-label="Thomas de Chillaz, back to top">
          T<span>·</span>DC
        </a>
        <nav aria-label="Primary navigation">
          {CHAPTERS.map((item) => (
            <a key={item.id} href={`#${item.id}`} data-active={chapter === item.id || undefined} aria-current={chapter === item.id ? "location" : undefined}>
              <span>{item.number}</span>{item.label}
            </a>
          ))}
        </nav>
        <button
          className="motion-toggle"
          type="button"
          onClick={toggleMotion}
          aria-label={paused ? "Play background motion" : "Pause background motion"}
          data-paused={paused || undefined}
        >
          <span className="motion-dot" aria-hidden="true" />
          {paused ? "Play motion" : "Pause motion"}
        </button>
      </header>

      <main id="main-content">
        <section className="hero chapter" id="top" data-chapter="hero" aria-labelledby="hero-title">
          <div className="hero-index" aria-hidden="true">01 — 05</div>
          <div className="hero-copy">
            <p className="eyebrow"><span /> AI × biology × space</p>
            <h1 id="hero-title">Thomas<br /><em>de Chillaz</em></h1>
            <p className="hero-lede">
              I use artificial intelligence to navigate complex systems — from the inner life of a cell to the surface of another world.
            </p>
            <div className="hero-actions">
              <a className="button button-primary" href="#research">Explore the work <span aria-hidden="true">↓</span></a>
              <a className="button button-ghost" href="mailto:tdechillaz@gmail.com">Start a conversation</a>
            </div>
          </div>
          <div className="portrait-wrap">
            <div className="portrait-orbit orbit-one" aria-hidden="true" />
            <div className="portrait-orbit orbit-two" aria-hidden="true" />
            <div className="portrait-frame">
              <Image
                src="/thomas-de-chillaz.webp"
                alt="Thomas de Chillaz"
                width={924}
                height={924}
                sizes="(max-width: 680px) 74vw, (max-width: 980px) 25rem, 28vw"
                priority
                unoptimized
              />
            </div>
            <p className="portrait-note"><span>Currently</span> AI & Data student<br />Researching at MIT CSAIL</p>
          </div>
          <p className="scroll-cue"><span aria-hidden="true" /> Scroll to enter</p>
        </section>

        <section className="chapter split-section research-section" id="research" data-chapter="research" aria-labelledby="research-title">
          <div className="chapter-heading sticky-copy">
            <p className="eyebrow"><span /> 01 / Computational biology</p>
            <h2 id="research-title">Finding signal<br /><em>inside the cell.</em></h2>
            <p className="section-intro">
              At MIT CSAIL&apos;s Computational Biology Group, I am working where AI, interfaces, and genomics meet — making complex scientific knowledge easier to explore.
            </p>
            <a className="source-link" href="https://compbio.mit.edu/" target="_blank" rel="noreferrer">
              MIT Computational Biology Group <span aria-hidden="true">↗</span>
            </a>
          </div>
          <div className="content-rail">
            <article className="research-card featured-card">
              <div className="card-meta"><span>MIT CSAIL</span><span>Current focus</span></div>
              <h3>MANTIS</h3>
              <p className="card-kicker">Interactive Idea Navigator</p>
              <p>
                Contributing to an AI-enhanced collaborative space that helps research teams explore, connect, and move through large bodies of scientific ideas.
              </p>
              <ul className="mini-tags"><li>AI interfaces</li><li>Knowledge systems</li><li>Research tools</li></ul>
            </article>
            <article className="research-card">
              <div className="card-meta"><span>Single-cell</span><span>Data visualization</span></div>
              <h3>Single-cell RNA sequencing</h3>
              <p>
                Building web-based ways to navigate high-dimensional single-cell data, turning dense expression matrices into more legible biological patterns.
              </p>
              <div className="cell-legend" aria-hidden="true">
                {Array.from({ length: 18 }, (_, index) => <span key={index} style={{ "--i": index } as React.CSSProperties} />)}
              </div>
            </article>
            <article className="research-card">
              <div className="card-meta"><span>LISN Laboratory</span><span>Gif-sur-Yvette</span></div>
              <h3>Multimodal survival analysis</h3>
              <p>
                Developing survival prediction from censored clinical data, then evaluating how CT scans, histopathology, and electronic health records can improve practical risk estimation.
              </p>
              <div className="model-flow" aria-label="Research data modalities">
                <span>CT</span><i aria-hidden="true" /><span>Pathology</span><i aria-hidden="true" /><span>EHR</span><i aria-hidden="true" /><strong>Risk</strong>
              </div>
            </article>
          </div>
        </section>

        <section className="chapter split-section space-section" id="space" data-chapter="space" aria-labelledby="space-title">
          <div className="chapter-heading sticky-copy">
            <p className="eyebrow"><span /> 02 / Astronomy</p>
            <h2 id="space-title">Teaching machines<br /><em>to read worlds.</em></h2>
            <p className="section-intro">
              Astronomy is my longest-running curiosity: a place to combine physics, data, and imagination with questions that stretch beyond one discipline.
            </p>
          </div>
          <div className="content-rail space-rail">
            <article className="orbit-card">
              <p className="project-number">EXP — 01</p>
              <h3>Exoplanet Habitability Classifier</h3>
              <p>Machine learning on NASA&apos;s Kepler dataset to estimate whether planetary conditions could be compatible with life.</p>
              <div className="signal-bars" aria-hidden="true">
                {Array.from({ length: 24 }, (_, index) => <span key={index} style={{ height: `${18 + ((index * 17) % 52)}%` }} />)}
              </div>
              <ul className="mini-tags"><li>Kepler</li><li>Feature engineering</li><li>Classification</li></ul>
            </article>
            <article className="orbit-card offset-card">
              <p className="project-number">LAND — 02</p>
              <h3>Landing Suitability Algorithm</h3>
              <p>A computer-vision system that combines terrain segmentation and crater detection to score safer planetary landing zones.</p>
              <div className="terrain-map" aria-hidden="true"><span /><span /><span /><i /></div>
              <ul className="mini-tags"><li>CNN</li><li>Segmentation</li><li>Hazard detection</li></ul>
            </article>
            <blockquote>
              <p>“What is worth doing, is worth doing well.”</p>
              <cite>— My grandfather</cite>
            </blockquote>
          </div>
        </section>

        <section className="chapter education-section" id="education" data-chapter="education" aria-labelledby="education-title">
          <div className="chapter-heading wide-heading">
            <p className="eyebrow"><span /> 03 / Education</p>
            <h2 id="education-title">Learning across<br /><em>the boundaries.</em></h2>
          </div>
          <div className="education-path">
            <article className="education-stop active-stop">
              <p className="education-year">2025 — 2029</p>
              <div className="education-node"><span>01</span></div>
              <div className="education-card">
                <p className="school-label">CentraleSupélec × ESSEC</p>
                <h3>Bachelor of AI, Data & Management Sciences</h3>
                <p>An interdisciplinary program connecting rigorous technical work with strategy, organizations, and real-world decision-making.</p>
                <ul className="course-grid">
                  <li>Linear algebra</li><li>Calculus</li><li>Statistics</li><li>Optimization</li><li>Data structures</li><li>Data analysis</li>
                </ul>
              </div>
            </article>
            <article className="education-stop">
              <p className="education-year">2023 — 2025</p>
              <div className="education-node"><span>02</span></div>
              <div className="education-card">
                <p className="school-label">École Jeannine Manuel</p>
                <h3>French International Baccalaureate</h3>
                <p>Graduated with highest honors, specializing in mathematics, physics, and chemistry with expert-level mathematics.</p>
              </div>
            </article>
            <article className="education-stop compact-stop">
              <p className="education-year">2024</p>
              <div className="education-node"><span>03</span></div>
              <div className="education-card">
                <p className="school-label">Stanford Online</p>
                <h3>Understanding Einstein: Special Relativity</h3>
              </div>
            </article>
          </div>
        </section>

        <section className="chapter building-section" id="building" data-chapter="building" aria-labelledby="building-title">
          <div className="chapter-heading wide-heading">
            <p className="eyebrow"><span /> 04 / Selected work</p>
            <h2 id="building-title">Research that<br /><em>becomes a product.</em></h2>
            <p className="section-intro">I learn fastest by building — models, agents, and tools that make a difficult process more understandable or useful.</p>
          </div>
          <div className="project-grid">
            <ProjectCard
              index="01"
              kicker="Medical AI"
              title="Lung Cancer Subtype Classifier"
              summary="A CT-scan classifier that improved from 85.56% to 93.02% accuracy."
              details="I refined EfficientNet-based architectures and redesigned augmentation so clinically relevant tumor regions survived the training pipeline."
              tags={["EfficientNet", "PyTorch", "CT imaging"]}
            />
            <ProjectCard
              index="02"
              kicker="Clinical workflow"
              title="Clinical Trial AI Agent"
              summary="An automated call-center concept for faster clinical-trial patient classification."
              details="The system combines conversational voice AI, internal clinical data, and lab models to structure a complex screening workflow for clinicians."
              tags={["AI agents", "ElevenLabs", "Clinical data"]}
            />
            <ProjectCard
              index="03"
              kicker="EdTech"
              title="Next Kareer"
              summary="An AI preparation platform for stronger, more targeted job applications."
              details="Developed in the CentraleSupélec accelerator loop, the product brings together interview practice, résumé feedback, and application tracking around the candidate journey."
              tags={["Product", "AI interviewer", "Accelerator"]}
            />
            <ProjectCard
              index="04"
              kicker="Voice AI"
              title="Intervue AI"
              summary="A real-time mock-interview prototype with voice interaction and résumé context."
              details="Built as a working demonstration with speech-to-text, text-to-speech, résumé parsing, and rapid response generation."
              tags={["Flask", "Gemini", "ElevenLabs"]}
              href="https://devpost.com/software/intervue-oexijt"
            />
          </div>
        </section>

        <section className="chapter impact-section" id="impact" data-chapter="impact" aria-labelledby="impact-title">
          <div className="impact-number" aria-label="More than 60 million views"><span>60M</span><sup>+</sup></div>
          <div className="impact-copy">
            <p className="eyebrow"><span /> 05 / Science communication</p>
            <h2 id="impact-title">Curiosity,<br /><em>at scale.</em></h2>
            <p>
              I founded <strong>The Curious Minds</strong> to turn mathematics and astrophysics into stories people want to share. Across TikTok, Instagram, and YouTube, that work has reached 60M+ views.
            </p>
            <div className="impact-facts">
              <div><span>03</span><p>Major social platforms</p></div>
              <div><span>02</span><p>Languages spoken natively</p></div>
              <div><span>01</span><p>Companion science website</p></div>
            </div>
          </div>
        </section>

        <section className="skills-section" aria-labelledby="skills-title">
          <p className="eyebrow"><span /> Toolkit</p>
          <h2 id="skills-title">How I work.</h2>
          <div className="skills-groups">
            {skillGroups.map((group) => (
              <div key={group.label}>
                <h3>{group.label}</h3>
                <ul>{group.skills.map((skill) => <li key={skill}>{skill}</li>)}</ul>
              </div>
            ))}
          </div>
        </section>

        <section className="contact-section" id="contact" aria-labelledby="contact-title">
          <p className="eyebrow"><span /> Open to ambitious ideas</p>
          <h2 id="contact-title">Let&apos;s build what<br /><em>doesn&apos;t exist yet.</em></h2>
          <div className="contact-row">
            <a href="mailto:tdechillaz@gmail.com">Email me <span aria-hidden="true">↗</span></a>
            <a href="https://www.linkedin.com/in/thomas-de-chillaz-9382b62a0" target="_blank" rel="noreferrer">LinkedIn <span aria-hidden="true">↗</span></a>
          </div>
          <footer><span>Thomas de Chillaz</span><span>AI · Biology · Space · 2026</span></footer>
        </section>
      </main>
    </div>
  );
}
