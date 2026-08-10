"use client";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { SceneCanvas, type Chapter } from "./ScrollScenes";

const CHAPTERS: ReadonlyArray<{ id: Chapter; label: string; number: string }> = [
  { id: "health", label: "Health", number: "01" },
  { id: "space", label: "Space", number: "02" },
  { id: "education", label: "Learn", number: "03" },
  { id: "building", label: "Build", number: "04" },
  { id: "impact", label: "Reach", number: "05" },
];
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
type BeatRangeValue = `${number},${number},${number},${number}`;

function ProjectCard({
  index,
  title,
  kicker,
  summary,
  details,
  tags,
  beatRange,
  href,
}: {
  index: string;
  title: string;
  kicker: string;
  summary: string;
  details: string;
  tags: ReadonlyArray<string>;
  beatRange: BeatRangeValue;
  href?: string;
}) {
  return (
    <article className="project-card" data-scene-step={`project-${index}`} data-scroll-copy data-beat-range={beatRange}>
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
  const rootRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const progressFillRef = useRef<HTMLSpanElement>(null);
  const handleChapterChange = useCallback((nextChapter: Chapter) => {
    setChapter((currentChapter) => currentChapter === nextChapter ? currentChapter : nextChapter);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    const revealTargets = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    let revealObserver: IntersectionObserver | null = null;

    try {
      revealObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && entry.target instanceof HTMLElement) {
              entry.target.setAttribute("data-revealed", "true");
              revealObserver?.unobserve(entry.target);
            }
          });
        },
        { rootMargin: "0px 0px -9%", threshold: 0.14 },
      );
      revealTargets.forEach((target) => {
        const bounds = target.getBoundingClientRect();
        if (bounds.top < window.innerHeight * 0.92 && bounds.bottom > 0) {
          target.setAttribute("data-revealed", "true");
        } else {
          revealObserver?.observe(target);
        }
      });
      root?.setAttribute("data-enhanced", "true");
    } catch {
      revealTargets.forEach((target) => target.setAttribute("data-revealed", "true"));
    }

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
      if (progressFrame !== 0) cancelAnimationFrame(progressFrame);
      revealObserver?.disconnect();
      sizeObserver?.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      root?.removeAttribute("data-enhanced");
    };
  }, []);

  return (
    <div ref={rootRef} className="portfolio" data-theme={chapter}>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <SceneCanvas onChapterChange={handleChapterChange} />
      <div ref={progressRef} className="scroll-progress" role="progressbar" aria-label="Scroll progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={0}>
        <span ref={progressFillRef} />
      </div>

      <header className="site-header">
        <a className="wordmark" href="#top" aria-label="Thomas de Chillaz, back to top">
          Thomas de Chillaz <span>Research / Product / Science</span>
        </a>
        <nav aria-label="Primary navigation">
          {CHAPTERS.map((item) => (
            <a key={item.id} href={`#${item.id}`} data-active={chapter === item.id || undefined} aria-current={chapter === item.id ? "location" : undefined}>
              <span aria-hidden="true">{item.number}</span>{item.label}
            </a>
          ))}
        </nav>
      </header>

      <main id="main-content">
        <section className="hero chapter" id="top" data-chapter="hero" aria-labelledby="hero-title">
          <div className="hero-index" aria-hidden="true">01 — 05</div>
          <div className="hero-copy" data-reveal>
            <p className="eyebrow"><span /> Researcher · Builder · Science communicator</p>
            <h1 id="hero-title">Thomas<br /><em>de Chillaz</em></h1>
            <p className="hero-lede">
              I build ways to see complex systems more clearly — from the inner life of a cell to the surface of another world.
            </p>
            <div className="hero-actions">
              <a className="button button-primary" href="#health">Explore the work <span aria-hidden="true">↓</span></a>
              <a className="button button-ghost" href="mailto:tdechillaz@gmail.com">Start a conversation</a>
            </div>
          </div>
          <div className="portrait-wrap" data-reveal>
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

        <section className="chapter split-section health-section" id="health" data-chapter="health" data-scroll-scene="health" aria-labelledby="health-title">
          <figure
            className="health-visual"
            data-visual="dna-cell"
            data-scale="hero"
            data-reveal
            role="img"
            aria-label="DNA double helix connecting gene expression, cell state, and clinical signals in single-cell research"
          >
            <div className="health-annotation health-annotation-a"><span>01</span> Gene expression</div>
            <div className="health-annotation health-annotation-b"><span>02</span> Cell state</div>
            <div className="health-annotation health-annotation-c"><span>03</span> Clinical signal</div>
            <div className="sequence-window">ACGT · GCTA · TTAG · CGAT · ACGT · GCTA</div>
          </figure>
          <div className="chapter-heading sticky-copy" data-scene-step="health-intro" data-scroll-copy data-beat-range="-0.03,0.02,0.14,0.20">
            <p className="eyebrow"><span /> 01 / Health & computational biology</p>
            <h2 id="health-title">Finding signal<br /><em>inside the cell.</em></h2>
            <p className="section-intro">
              At MIT CSAIL&apos;s Computational Biology Group, I am working where AI, interfaces, and genomics meet — making complex scientific knowledge easier to explore.
            </p>
            <a className="source-link" href="https://compbio.mit.edu/" target="_blank" rel="noreferrer">
              MIT Computational Biology Group <span aria-hidden="true">↗</span>
            </a>
          </div>
          <div className="content-rail">
            <article className="research-card featured-card" data-scene-step="mantis" data-scroll-copy data-beat-range="0.14,0.22,0.34,0.42">
              <div className="card-meta"><span>MIT CSAIL</span><span>Current focus</span></div>
              <h3>MANTIS</h3>
              <p className="card-kicker">Interactive Idea Navigator</p>
              <p>
                Contributing to an AI-enhanced collaborative space that helps research teams explore, connect, and move through large bodies of scientific ideas.
              </p>
              <ul className="mini-tags"><li>AI interfaces</li><li>Knowledge systems</li><li>Research tools</li></ul>
            </article>
            <article className="research-card" data-scene-step="single-cell" data-scroll-copy data-beat-range="0.36,0.44,0.56,0.64">
              <div className="card-meta"><span>Single-cell</span><span>Data visualization</span></div>
              <h3>Single-cell RNA sequencing</h3>
              <p>
                Building web-based ways to navigate high-dimensional single-cell data, turning dense expression matrices into more legible biological patterns.
              </p>
              <div className="cell-legend" aria-hidden="true">
                {Array.from({ length: 18 }, (_, index) => <span key={index} style={{ "--i": index } as React.CSSProperties} />)}
              </div>
            </article>
            <article className="research-card" data-scene-step="survival" data-scroll-copy data-beat-range="0.58,0.66,0.84,0.92">
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

        <section className="chapter split-section space-section" id="space" data-chapter="space" data-scroll-scene="space" aria-labelledby="space-title">
          <div className="chapter-heading sticky-copy" data-scene-step="space-intro" data-scroll-copy data-beat-range="-0.03,0.02,0.15,0.23">
            <p className="eyebrow"><span /> 02 / Astronomy</p>
            <h2 id="space-title">Teaching machines<br /><em>to read worlds.</em></h2>
            <p className="section-intro">
              Astronomy is my longest-running curiosity: a place to combine physics, data, and imagination with questions that stretch beyond one discipline.
            </p>
          </div>
          <div className="content-rail space-rail">
            <article className="orbit-card" data-scene-step="exoplanet" data-scroll-copy data-beat-range="0.17,0.25,0.45,0.53">
              <p className="project-number">EXP — 01</p>
              <h3>Exoplanet Habitability Classifier</h3>
              <p>Machine learning on NASA&apos;s Kepler dataset to estimate whether planetary conditions could be compatible with life.</p>
              <div className="signal-bars" aria-hidden="true">
                {Array.from({ length: 24 }, (_, index) => <span key={index} style={{ height: `${18 + ((index * 17) % 52)}%` }} />)}
              </div>
              <ul className="mini-tags"><li>Kepler</li><li>Feature engineering</li><li>Classification</li></ul>
            </article>
            <article className="orbit-card offset-card" data-scene-step="landing" data-scroll-copy data-beat-range="0.47,0.55,0.76,0.84">
              <p className="project-number">LAND — 02</p>
              <h3>Landing Suitability Algorithm</h3>
              <p>A computer-vision system that combines terrain segmentation and crater detection to score safer planetary landing zones.</p>
              <div className="terrain-map" aria-hidden="true"><span /><span /><span /><i /></div>
              <ul className="mini-tags"><li>CNN</li><li>Segmentation</li><li>Hazard detection</li></ul>
            </article>
            <blockquote data-scene-step="space-quote" data-scroll-copy data-beat-range="0.78,0.86,0.96,1.00">
              <p>“What is worth doing, is worth doing well.”</p>
              <cite>— My grandfather</cite>
            </blockquote>
          </div>
        </section>

        <section className="chapter education-section" id="education" data-chapter="education" data-scroll-scene="education" aria-labelledby="education-title">
          <div className="chapter-heading wide-heading" data-scene-step="education-intro" data-scroll-copy data-beat-range="-0.03,0.02,0.14,0.21">
            <p className="eyebrow"><span /> 03 / Education</p>
            <h2 id="education-title">Learning across<br /><em>the boundaries.</em></h2>
          </div>
          <div className="education-path">
            <article className="education-stop active-stop" data-scene-step="centralesupelec-essec" data-scroll-copy data-beat-range="0.15,0.23,0.40,0.48">
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
            <article className="education-stop" data-scene-step="baccalaureate" data-scroll-copy data-beat-range="0.42,0.50,0.64,0.72">
              <p className="education-year">2023 — 2025</p>
              <div className="education-node"><span>02</span></div>
              <div className="education-card">
                <p className="school-label">École Jeannine Manuel</p>
                <h3>French International Baccalaureate</h3>
                <p>Graduated with highest honors, specializing in mathematics, physics, and chemistry with expert-level mathematics.</p>
              </div>
            </article>
            <article className="education-stop compact-stop" data-scene-step="stanford" data-scroll-copy data-beat-range="0.66,0.74,0.90,0.98">
              <p className="education-year">2024</p>
              <div className="education-node"><span>03</span></div>
              <div className="education-card">
                <p className="school-label">Stanford Online</p>
                <h3>Understanding Einstein: Special Relativity</h3>
              </div>
            </article>
          </div>
        </section>

        <section className="chapter building-section" id="building" data-chapter="building" data-scroll-scene="building" aria-labelledby="building-title">
          <div className="chapter-heading wide-heading" data-scene-step="building-intro" data-scroll-copy data-beat-range="-0.03,0.02,0.10,0.16">
            <p className="eyebrow"><span /> 04 / Selected work</p>
            <h2 id="building-title">Research that<br /><em>becomes a product.</em></h2>
            <p className="section-intro">I learn fastest by building — models, agents, and tools that make a difficult process more understandable or useful.</p>
          </div>
          <div className="project-grid">
            <ProjectCard
              index="01"
              beatRange="0.11,0.17,0.29,0.35"
              kicker="Medical AI"
              title="Lung Cancer Subtype Classifier"
              summary="A CT-scan classifier that improved from 85.56% to 93.02% accuracy."
              details="I refined EfficientNet-based architectures and redesigned augmentation so clinically relevant tumor regions survived the training pipeline."
              tags={["EfficientNet", "PyTorch", "CT imaging"]}
            />
            <ProjectCard
              index="02"
              beatRange="0.30,0.36,0.48,0.54"
              kicker="Clinical workflow"
              title="Clinical Trial AI Agent"
              summary="An automated call-center concept for faster clinical-trial patient classification."
              details="The system combines conversational voice AI, internal clinical data, and lab models to structure a complex screening workflow for clinicians."
              tags={["AI agents", "ElevenLabs", "Clinical data"]}
            />
            <ProjectCard
              index="03"
              beatRange="0.49,0.55,0.67,0.73"
              kicker="EdTech"
              title="Next Kareer"
              summary="An AI preparation platform for stronger, more targeted job applications."
              details="Developed in the CentraleSupélec accelerator loop, the product brings together interview practice, résumé feedback, and application tracking around the candidate journey."
              tags={["Product", "AI interviewer", "Accelerator"]}
            />
            <ProjectCard
              index="04"
              beatRange="0.68,0.74,0.90,0.98"
              kicker="Voice AI"
              title="Intervue AI"
              summary="A real-time mock-interview prototype with voice interaction and résumé context."
              details="Built as a working demonstration with speech-to-text, text-to-speech, résumé parsing, and rapid response generation."
              tags={["Flask", "Gemini", "ElevenLabs"]}
              href="https://devpost.com/software/intervue-oexijt"
            />
          </div>
        </section>

        <section className="chapter impact-section" id="impact" data-chapter="impact" data-scroll-scene="impact" aria-labelledby="impact-title">
          <div className="impact-number" data-scene-step="impact-number" data-scroll-copy data-beat-range="-0.03,0.02,0.42,0.54" aria-label="More than 60 million views"><span>60M</span><sup>+</sup></div>
          <div className="impact-copy" data-scene-step="impact-story" data-scroll-copy data-beat-range="0.46,0.56,0.90,0.99">
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
          <h2 id="skills-title" data-reveal>How I work.</h2>
          <div className="skills-groups">
            {skillGroups.map((group) => (
              <div key={group.label} data-reveal>
                <h3>{group.label}</h3>
                <ul>{group.skills.map((skill) => <li key={skill}>{skill}</li>)}</ul>
              </div>
            ))}
          </div>
        </section>

        <section className="contact-section" id="contact" aria-labelledby="contact-title" data-reveal>
          <p className="eyebrow"><span /> Open to ambitious ideas</p>
          <h2 id="contact-title">Let&apos;s build what<br /><em>doesn&apos;t exist yet.</em></h2>
          <div className="contact-row">
            <a href="mailto:tdechillaz@gmail.com">Email me <span aria-hidden="true">↗</span></a>
            <a href="https://www.linkedin.com/in/thomas-de-chillaz-9382b62a0" target="_blank" rel="noreferrer">LinkedIn <span aria-hidden="true">↗</span></a>
          </div>
        </section>
      </main>
      <footer className="site-footer"><span>Thomas de Chillaz</span><span>AI · Biology · Space · 2026</span></footer>
    </div>
  );
}
