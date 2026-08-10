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

test("synchronizes story text and scene cameras to one chapter progress", async () => {
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
  const scrollCopyTags = html.match(/<[^>]+data-scroll-copy[^>]*>/g) ?? [];
  assert.ok(scrollCopyTags.length >= 6);
  scrollCopyTags.forEach((tag) => assert.doesNotMatch(tag, /data-reveal/));
  const beatRanges = [...html.matchAll(/data-beat-range="([^"]+)"/g)].map((match) =>
    match[1].split(",").map(Number),
  );
  beatRanges.forEach((range) => {
    assert.equal(range.length, 4);
    assert.ok(range.every(Number.isFinite));
    assert.ok(range.every((point, index) => index === 0 || point >= range[index - 1]));
    assert.ok(range[3] <= 1, `Beat must complete by chapter end: ${range.join(",")}`);
  });
  assert.match(sceneSource, /function getChapterProgress/);
  assert.match(sceneSource, /addEventListener\("scroll"/);
  assert.match(sceneSource, /reducedMotion\s*\?\s*reducedMotionProgress\s*:\s*getChapterProgress/);
  assert.match(sceneSource, /building:\s*0\.82/);
  assert.match(sceneSource, /impact:\s*0\.64/);
  assert.doesNotMatch(css, /(?:animation|view|scroll)-timeline|@keyframes\s+scroll-copy/i);
  assert.match(sceneSource, /function updateStoryBeats\([^)]*progress[^)]*reducedMotion[^)]*\)/);
  assert.match(sceneSource, /updateThreeScene\([^;]*displayedProgress[^;]*\)/s);
  assert.match(sceneSource, /updateStoryBeats\([^;]*displayedProgress[^;]*reducedMotion[^;]*\)/s);
  assert.match(sceneSource, /setProperty\("--beat-opacity"/);
  assert.match(sceneSource, /setProperty\("--beat-translate-y"/);
  assert.match(sceneSource, /setProperty\("--beat-clip-top"/);
  assert.match(sceneSource, /setProperty\("--beat-clip-bottom"/);
  assert.match(sceneSource, /setProperty\("--beat-opacity",\s*"1"\)/);
  assert.match(
    css,
    /\[data-scroll-copy\][^{]*\{[^}]*opacity:\s*var\(--beat-opacity[^}]*transform:[^}]*var\(--beat-translate-y/s,
  );
  assert.match(css, /clip-path:\s*inset\(var\(--beat-clip-top[^}]*var\(--beat-clip-bottom/s);
  const responsive = extractCssBlock(css, "@media (max-width: 980px)");
  assert.doesNotMatch(responsive, /\[data-scroll-copy\]/);
  assert.match(
    css,
    /prefers-reduced-motion:\s*reduce[\s\S]*\[data-scroll-copy\][^{]*\{[^}]*opacity:\s*1[^}]*transform:\s*none/s,
  );
});

test("uses one procedural Three.js WebGL stage", async () => {
  const response = await render();
  const [html, scrollSource, threeSource, satelliteSource, packageJson] = await Promise.all([
    response.text(),
    readFile(new URL("../app/ScrollScenes.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/ThreeScenes.ts", import.meta.url), "utf8").catch(() => ""),
    readFile(new URL("../app/ThreeSatellite.ts", import.meta.url), "utf8").catch(() => ""),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);
  const sceneSource = `${scrollSource}\n${threeSource}\n${satelliteSource}`;

  assert.equal((html.match(/<canvas\b/g) ?? []).length, 1);
  assert.match(html, /<canvas[^>]*aria-hidden="true"/i);
  assert.match(packageJson, /"three"\s*:/);
  assert.match(sceneSource, /from\s+["']three["']/);
  assert.equal((sceneSource.match(/new\s+THREE\.WebGLRenderer\(/g) ?? []).length, 1);
  assert.match(sceneSource, /new\s+THREE\.Scene\(/);
  assert.match(sceneSource, /new\s+THREE\.PerspectiveCamera\(/);
  assert.match(sceneSource, /function createDnaScene/);
  assert.match(sceneSource, /function createPlanetScene/);
  assert.match(satelliteSource, /function createSatellite/);
  const planetSource = threeSource.slice(
    threeSource.indexOf("export function createPlanetScene"),
    threeSource.indexOf("function createEducationScene"),
  );
  assert.match(satelliteSource, /new THREE\.Group\(\)/);
  assert.match(satelliteSource, /resources\.track\(new THREE\.(?:Box|Cylinder)Geometry/);
  assert.match(satelliteSource, /resources\.track\(new THREE\.(?:Plane|Box)Geometry/);
  assert.match(planetSource, /createSatellite\(resources\)/);
  assert.match(planetSource, /updateSatellite\(satellite,\s*progress,\s*reducedTransparency\)/);
  assert.match(sceneSource, /Math\.sin/);
  assert.match(sceneSource, /Math\.cos/);
  assert.match(sceneSource, /(?:TubeGeometry|InstancedMesh|CylinderGeometry)/);
  assert.match(sceneSource, /SphereGeometry/);
  assert.match(sceneSource, /Mesh(?:Standard|Physical)Material/);
  assert.match(sceneSource, /(?:AmbientLight|DirectionalLight|PointLight|HemisphereLight)/);
  assert.doesNotMatch(sceneSource, /CanvasRenderingContext2D|getContext\(["']2d["']\)|createRadialGradient/);
  assert.doesNotMatch(sceneSource, /GLTFLoader|\.glb|\.gltf/);
});

test("keeps the DNA helix framed throughout the health story", async () => {
  const { DNA_STRAND_HEIGHT, getDnaPresentation } = await import("../app/dnaPresentation.mjs");
  const samples = [0.02, 0.28, 0.5, 0.75, 0.9];

  for (const wide of [true, false]) {
    const poses = samples.map((progress) => getDnaPresentation(progress, wide));
    poses.forEach((pose) => {
      const visibleHeight = 2 * pose.cameraZ * Math.tan((34 * Math.PI) / 360);
      assert.ok(Object.values(pose).every(Number.isFinite));
      assert.ok(pose.scale >= 0.78 && pose.scale <= 1.08);
      assert.ok(DNA_STRAND_HEIGHT * pose.scale <= visibleHeight * 1.32);
      assert.ok(pose.y >= -0.45 && pose.y <= 0.25);
      assert.ok(wide ? pose.x >= 1.25 && pose.x <= 2.7 : pose.x >= -0.05 && pose.x <= 0.9);
    });
    assert.ok(poses.at(-1).scale >= poses[0].scale * 0.76);
  }

  const threeSource = await readFile(new URL("../app/ThreeScenes.ts", import.meta.url), "utf8");
  const dnaSource = threeSource.slice(
    threeSource.indexOf("export function createDnaScene"),
    threeSource.indexOf("export function createPlanetScene"),
  );
  assert.match(dnaSource, /getDnaPresentation\(progress,\s*wide,\s*dnaPresentation\)/);
});

test("renders a ring-free procedurally surfaced planet", async () => {
  const threeSource = await readFile(new URL("../app/ThreeScenes.ts", import.meta.url), "utf8");
  const planetSource = threeSource.slice(
    threeSource.indexOf("export function createPlanetScene"),
    threeSource.indexOf("function createEducationScene"),
  );

  assert.doesNotMatch(planetSource, /RingGeometry|TorusGeometry|LineLoop/);
  assert.match(planetSource, /function deformPlanetSurface/);
  assert.match(planetSource, /position\.setXYZ\(/);
  assert.match(planetSource, /computeVertexNormals\(\)/);
  assert.match(planetSource, /MeshPhysicalMaterial/);
  assert.match(planetSource, /transparent:\s*true/);
  assert.match(planetSource, /side:\s*THREE\.BackSide/);
});

test("uses distinct scroll-directed 3D systems for Build and Reach", async () => {
  const [threeSource, featureSource, scrollSource, css] = await Promise.all([
    readFile(new URL("../app/ThreeScenes.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/ThreeFeatureScenes.ts", import.meta.url), "utf8").catch(() => ""),
    readFile(new URL("../app/ScrollScenes.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  const buildingSource = featureSource.slice(
    featureSource.indexOf("export function createBuildingScene"),
    featureSource.indexOf("export function createReachScene"),
  );
  const reachSource = featureSource.slice(featureSource.indexOf("export function createReachScene"));

  assert.match(featureSource, /export function createBuildingScene/);
  assert.match(featureSource, /export function createReachScene/);
  assert.match(threeSource, /chapter === "building"[^;]*createBuildingScene\(\)/);
  assert.match(threeSource, /chapter === "impact"[^;]*createReachScene\(\)/);
  assert.doesNotMatch(threeSource, /createSignalScene/);
  assert.match(buildingSource, /new THREE\.Group\(\)/);
  assert.match(buildingSource, /new THREE\.(?:BoxGeometry|CylinderGeometry)/);
  assert.match(buildingSource, /update\(progress/);
  assert.match(buildingSource, /progress/);
  assert.match(reachSource, /new THREE\.InstancedMesh/);
  assert.match(reachSource, /new THREE\.(?:IcosahedronGeometry|SphereGeometry)/);
  assert.match(reachSource, /update\(progress/);
  assert.match(reachSource, /progress/);
  assert.doesNotMatch(`${threeSource}\n${featureSource}`, /requestAnimationFrame|performance\.now|setInterval/);
  assert.doesNotMatch(`${threeSource}\n${featureSource}`, /setAnimationLoop\((?!null)/);
  assert.match(scrollSource, /prefers-reduced-motion:\s*reduce/);
  assert.match(scrollSource, /prefers-reduced-transparency:\s*reduce/);
  assert.match(css, /prefers-reduced-transparency:\s*reduce[\s\S]*backdrop-filter:\s*none/);
  assert.match(css, /\.project-card\s*\{[^}]*background:\s*linear-gradient[^}]*rgba\([^)]*,0\.9/s);
  assert.match(css, /\.impact-copy\s*\{[^}]*background:\s*linear-gradient[^}]*rgba\([^)]*,0\.8/s);
  const increasedContrast = extractCssBlock(css, "@media (prefers-contrast: more)");
  assert.match(increasedContrast, /\.project-card/);
  assert.match(increasedContrast, /\.impact-copy/);
});

test("transitions reversibly from space into education using scroll only", async () => {
  const { calculateEducationTransition } = await import("../app/scrollMath.mjs");
  const {
    calculateEducationRelayStart,
    calculateSatelliteSpaceEndpoint,
  } = await import("../app/satelliteMath.mjs");
  const educationTop = 5000;
  const viewportHeight = 1000;
  const positions = [4100, 4500, 4900];
  const forward = positions.map((scrollY) =>
    calculateEducationTransition(scrollY, educationTop, viewportHeight),
  );
  const reverse = positions.toReversed().map((scrollY) =>
    calculateEducationTransition(scrollY, educationTop, viewportHeight),
  );

  assert.equal(forward[0], 0);
  assert.ok(forward[1] > 0 && forward[1] < 1);
  assert.equal(forward[2], 1);
  assert.deepEqual(reverse, forward.toReversed());
  for (const wide of [true, false]) {
    assert.deepEqual(calculateEducationRelayStart(wide), calculateSatelliteSpaceEndpoint(wide));
  }

  const [scrollSource, threeSource, satelliteSource] = await Promise.all([
    readFile(new URL("../app/ScrollScenes.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/ThreeScenes.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/ThreeSatellite.ts", import.meta.url), "utf8"),
  ]);
  assert.match(scrollSource, /calculateEducationTransition\(/);
  assert.match(
    scrollSource,
    /reducedMotion\s*\|\|\s*reducedTransparency\s*\?\s*Number\(chapter === "education"\)\s*:\s*readEducationTransition\(\)/,
  );
  assert.match(satelliteSource, /reducedTransparency\s*\?\s*0\s*:\s*scanIn/);
  assert.match(threeSource, /atmosphereMaterial\.opacity\s*=\s*reducedTransparency\s*\?\s*0\s*:\s*0\.11/);
  assert.match(
    scrollSource,
    /updateThreeScene\([^;]*displayedProgress[^;]*spaceEducationTransition[^;]*\)/s,
  );
  assert.match(threeSource, /function updateSpaceEducationTransition\([^)]*transition[^)]*\)/s);
  assert.match(threeSource, /updateSpaceEducationTransition\([^;]*spaceEducationTransition[^;]*\)/s);
  assert.doesNotMatch(threeSource, /requestAnimationFrame|performance\.now|setInterval/);
  assert.doesNotMatch(threeSource, /setAnimationLoop\((?!null)/);
});

test("shares scroll progress and safely cleans up WebGL", async () => {
  const response = await render();
  const [html, scrollSource, threeSource, css] = await Promise.all([
    response.text(),
    readFile(new URL("../app/ScrollScenes.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/ThreeScenes.ts", import.meta.url), "utf8").catch(() => ""),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  const sceneSource = `${scrollSource}\n${threeSource}`;

  assert.match(sceneSource, /updateThreeScene\([^;]*displayedProgress[^;]*\)/s);
  assert.match(sceneSource, /updateStoryBeats\([^;]*displayedProgress[^;]*reducedMotion[^;]*\)/s);
  assert.match(sceneSource, /geometry\.dispose\(\)/);
  assert.match(sceneSource, /material\.dispose\(\)/);
  assert.match(sceneSource, /renderer\.dispose\(\)/);
  assert.match(sceneSource, /class ResourceTracker/);
  assert.match(sceneSource, /catch\s*\(error\)\s*\{[^}]*resources\.dispose\(\)/s);
  assert.match(sceneSource, /webglcontextlost/);
  assert.match(sceneSource, /dispatchEvent\(new Event\("webglready"\)\)/);
  assert.match(sceneSource, /catch\s*\{[^}]*dataset\.webgl\s*=\s*"fallback"[^}]*disposeThreeStage/s);
  assert.match(sceneSource, /data-webgl/);
  assert.match(html, /class="scene-fallback"[^>]*aria-hidden="true"/i);
  assert.match(sceneSource, /try\s*\{[\s\S]*createThreeStage/);
  assert.match(css, /\[data-webgl="fallback"\][^{]*\+\s*\.scene-fallback\s*\{[^}]*display:\s*block/s);
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
