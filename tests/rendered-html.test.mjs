import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

function extractCssBlock(css, selector) {
  const start = css.indexOf(selector);
  assert.notEqual(start, -1, `Missing CSS block: ${selector}`);
  const openingBrace = css.indexOf("{", start);
  let depth = 0;

  for (let index = openingBrace; index < css.length; index += 1) {
    if (css[index] === "{") depth += 1;
    if (css[index] === "}") depth -= 1;
    if (depth === 0) return css.slice(start, index + 1);
  }

  assert.fail(`Unclosed CSS block: ${selector}`);
}

test("server-renders Thomas's complete CV narrative", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Thomas de Chillaz[^<]*<\/title>/i);
  assert.match(html, /Thomas de Chillaz/);
  assert.match(html, /MIT CSAIL/);
  assert.match(html, /MANTIS/);
  assert.match(html, /single-cell RNA sequencing/i);
  assert.match(html, /LISN/);
  assert.match(html, /Exoplanet Habitability Classifier/);
  assert.match(html, /Lung Cancer Subtype Classifier/);
  assert.match(html, /Next Kareer/);
  assert.match(html, /60M\+/);
  assert.match(html, /CentraleSupélec/i);
  assert.match(html, /École Jeannine Manuel/);
  assert.match(html, /résumé/);
  assert.match(html, /Researcher · Builder · Science communicator/);
  assert.match(html, /01 — 05/);
  assert.match(html, /↗/);
  assert.doesNotMatch(html, /Â|Ã|â/);
  assert.match(html, /ESSEC/);
});

test("calculates reversible normalized camera progress", async () => {
  const { calculateChapterProgress, lerp } = await import("../app/scrollMath.mjs");
  const sectionTop = 1000;
  const sectionHeight = 3000;
  const viewportHeight = 1000;

  assert.equal(calculateChapterProgress(400, sectionTop, sectionHeight, viewportHeight), 0);
  assert.equal(calculateChapterProgress(880, sectionTop, sectionHeight, viewportHeight), 0);
  assert.equal(calculateChapterProgress(2000, sectionTop, sectionHeight, viewportHeight), 0.5);
  assert.equal(calculateChapterProgress(3120, sectionTop, sectionHeight, viewportHeight), 1);
  assert.equal(calculateChapterProgress(3600, sectionTop, sectionHeight, viewportHeight), 1);
  assert.equal(lerp(2.75, 0.75, 0.5), 1.75);
  assert.ok(
    calculateChapterProgress(2400, sectionTop, sectionHeight, viewportHeight)
      > calculateChapterProgress(1600, sectionTop, sectionHeight, viewportHeight),
  );
});

test("ships an accessible scroll-driven document structure", async () => {
  const response = await render();
  const html = await response.text();

  assert.match(html, /href="#main-content"[^>]*>Skip to content</i);
  assert.match(html, /<main[^>]*id="main-content"/i);
  assert.match(html, /aria-label="Primary navigation"/i);
  assert.match(html, /aria-label="Scroll progress"/i);
  assert.match(html, /data-chapter="health"/i);
  assert.match(html, /data-chapter="space"/i);
  assert.match(html, /data-chapter="education"/i);
  assert.match(html, /data-chapter="building"/i);
  assert.match(html, /data-chapter="impact"/i);
  assert.match(html, /<canvas[^>]*aria-hidden="true"/i);
  assert.match(html, /target="_blank"[^>]*rel="noreferrer"/i);
});

test("removes manual motion controls and persistence", async () => {
  const response = await render();
  const [html, source, scenes, css] = await Promise.all([
    response.text(),
    readFile(new URL("../app/PortfolioExperience.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/ScrollScenes.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  for (const content of [html, source, scenes, css]) {
    assert.doesNotMatch(content, /motion-toggle|play motion|pause motion|data-motion/i);
  }
  assert.doesNotMatch(source, /localStorage|sessionStorage|MOTION_STORAGE_KEY|toggleMotion|setPaused/);
  assert.doesNotMatch(css, /data-motion="paused"/);
  assert.doesNotMatch(`${source}\n${scenes}\n${css}`, /\binfinite\b/);
  assert.doesNotMatch(scenes, /performance\.now|animationStart|setInterval/);
  assert.match(scenes, /Math\.abs\(targetProgress - displayedProgress\)/);
});

test("gives health a dedicated DNA scene and professional reveal system", async () => {
  const response = await render();
  const [html, source, css] = await Promise.all([
    response.text(),
    readFile(new URL("../app/PortfolioExperience.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(html, /data-chapter="health"/i);
  assert.match(
    html,
    /<figure[^>]*data-visual="dna-cell"[^>]*data-scale="hero"[^>]*role="img"[^>]*aria-label="[^"]*DNA[^"]*cell[^"]*"/i,
  );
  assert.ok((html.match(/data-reveal/g) ?? []).length >= 6);
  assert.match(source, /IntersectionObserver/);
  assert.match(css, /\.portfolio\[data-enhanced\]\s+\[data-reveal\]/);
  assert.match(css, /\[data-reveal\]\[data-revealed="true"\]/);
});

test("scrubs cinematic scene cameras from chapter scroll progress", async () => {
  const response = await render();
  const [html, sceneSource, css] = await Promise.all([
    response.text(),
    readFile(new URL("../app/ScrollScenes.tsx", import.meta.url), "utf8").catch(() => ""),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  const scrollScenes = [...html.matchAll(/data-scroll-scene="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(new Set(scrollScenes), new Set(["health", "space", "education", "building", "impact"]));
  const healthSection = html.match(/<section[^>]*data-chapter="health"[\s\S]*?<\/section>/)?.[0] ?? "";
  const healthSteps = [...healthSection.matchAll(/<article[^>]*data-scene-step="([^"]+)"/g)].map(
    (match) => match[1],
  );
  assert.equal(new Set(healthSteps).size, 3);
  assert.match(html, /data-scroll-copy/);
  assert.match(sceneSource, /function getChapterProgress/);
  assert.match(sceneSource, /addEventListener\("scroll"/);
  assert.match(sceneSource, /drawDna\([^)]*\bprogress\b[^)]*\)/);
  assert.match(sceneSource, /drawPlanet\([^)]*\bprogress\b[^)]*\)/);
  assert.match(sceneSource, /drawEducation\([^)]*\bprogress\b[^)]*\)/);
  assert.match(sceneSource, /drawSignalField\([^)]*\bprogress\b[^)]*\)/);
  assert.match(sceneSource, /translate\([^)]*progress/);
  assert.match(sceneSource, /scale\([^)]*progress/);
  assert.match(sceneSource, /reducedMotion\s*\?\s*[\d.]+\s*:\s*getChapterProgress/);
  assert.match(css, /\[data-scroll-copy\][^{]*\{[^}]*animation-timeline:\s*view\(\)[^}]*animation-range:/s);
  assert.match(
    css,
    /prefers-reduced-motion:\s*reduce[\s\S]*\[data-scroll-copy\][^{]*\{[^}]*(?:animation:\s*none|animation-name:\s*none)[^}]*opacity:\s*1[^}]*transform:\s*none/s,
  );
});

test("removes starter artifacts and preserves reduced-motion support", async () => {
  const [css, source, scenes, page, layout, packageJson] = await Promise.all([
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/PortfolioExperience.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/ScrollScenes.tsx", import.meta.url), "utf8").catch(() => ""),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  const reducedMotion = extractCssBlock(css, "@media (prefers-reduced-motion: reduce)");
  assert.match(reducedMotion, /scroll-behavior:\s*auto/);
  assert.match(reducedMotion, /animation-duration:\s*0\.01ms\s*!important/);
  assert.match(reducedMotion, /transition-duration:\s*0\.01ms\s*!important/);
  assert.match(`${source}\n${scenes}`, /matchMedia\("\(prefers-reduced-motion: reduce\)"\)/);
  assert.match(page, /Thomas de Chillaz/);
  assert.match(layout, /Thomas de Chillaz/);
  assert.doesNotMatch(page, /SkeletonPreview|codex-preview/);
  assert.doesNotMatch(layout, /Starter Project|codex-preview/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  await assert.rejects(access(new URL("app/_sites-preview/SkeletonPreview.tsx", projectRoot)));
  await assert.rejects(access(new URL("app/_sites-preview/preview.css", projectRoot)));
});
