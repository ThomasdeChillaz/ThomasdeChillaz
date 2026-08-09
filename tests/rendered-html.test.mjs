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
  assert.match(html, /CentraleSup(?:é|e)lec/i);
  assert.match(html, /ESSEC/);
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
  const [html, source, css] = await Promise.all([
    response.text(),
    readFile(new URL("../app/PortfolioExperience.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  for (const content of [html, source, css]) {
    assert.doesNotMatch(content, /motion-toggle|play motion|pause motion|data-motion/i);
  }
  assert.doesNotMatch(source, /localStorage|sessionStorage|MOTION_STORAGE_KEY|toggleMotion|setPaused/);
  assert.doesNotMatch(css, /data-motion="paused"/);
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

test("removes starter artifacts and preserves reduced-motion support", async () => {
  const [css, source, page, layout, packageJson] = await Promise.all([
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/PortfolioExperience.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  const reducedMotion = extractCssBlock(css, "@media (prefers-reduced-motion: reduce)");
  assert.match(reducedMotion, /scroll-behavior:\s*auto/);
  assert.match(reducedMotion, /animation-duration:\s*0\.01ms\s*!important/);
  assert.match(reducedMotion, /transition-duration:\s*0\.01ms\s*!important/);
  assert.match(source, /matchMedia\("\(prefers-reduced-motion: reduce\)"\)/);
  assert.match(page, /Thomas de Chillaz/);
  assert.match(layout, /Thomas de Chillaz/);
  assert.doesNotMatch(page, /SkeletonPreview|codex-preview/);
  assert.doesNotMatch(layout, /Starter Project|codex-preview/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  await assert.rejects(access(new URL("app/_sites-preview/SkeletonPreview.tsx", projectRoot)));
  await assert.rejects(access(new URL("app/_sites-preview/preview.css", projectRoot)));
});
