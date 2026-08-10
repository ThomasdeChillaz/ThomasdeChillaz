import * as THREE from "three";
import { createSatellite, updateEducationRelay, updateSatellite } from "./ThreeSatellite";
import { createBuildingScene, createReachScene } from "./ThreeFeatureScenes";
import { createDnaPresentation, getDnaPresentation } from "./dnaPresentation.mjs";
import { satelliteSpaceSystemEnd } from "./satelliteMath.mjs";

export type ThreeChapter = "hero" | "health" | "space" | "education" | "building" | "impact";

type TrackPoint = readonly [progress: number, value: number];

const PLANET_SCALE_TRACK = [
  [0, 2.18], [0.15, 2.18], [0.25, 1.36], [0.45, 1.36],
  [0.55, 0.98], [0.76, 0.98], [0.86, satelliteSpaceSystemEnd.scale], [1, satelliteSpaceSystemEnd.scale],
] as const;
const PLANET_X_WIDE_TRACK = [
  [0, 3.3], [0.15, 3.3], [0.25, 2.6], [0.55, 2.05],
  [0.86, satelliteSpaceSystemEnd.xWide], [1, satelliteSpaceSystemEnd.xWide],
] as const;
const PLANET_X_NARROW_TRACK = [
  [0, 1.35], [0.15, 1.35], [0.25, 0.95], [0.55, 0.55],
  [0.86, satelliteSpaceSystemEnd.xNarrow], [1, satelliteSpaceSystemEnd.xNarrow],
] as const;
const PLANET_Y_TRACK = [
  [0, 0.8], [0.25, 0.38], [0.55, 0.04],
  [0.86, satelliteSpaceSystemEnd.y], [1, satelliteSpaceSystemEnd.y],
] as const;
const PLANET_ROTATION_Z_TRACK = [[0, -0.04], [0.55, -0.18], [1, -0.28]] as const;

type SceneBundle = Readonly<{
  scene: THREE.Scene;
  update: (
    progress: number,
    width: number,
    height: number,
    camera: THREE.PerspectiveCamera,
    reducedTransparency: boolean,
  ) => void;
}>;

type Disposable = { dispose: () => void };

class ResourceTracker {
  private readonly resources = new Set<Disposable>();

  track<T extends Disposable>(resource: T) {
    this.resources.add(resource);
    return resource;
  }

  dispose() {
    this.resources.forEach((resource) => resource.dispose());
    this.resources.clear();
  }
}

export type ThreeStage = {
  renderer: THREE.WebGLRenderer;
  camera: THREE.PerspectiveCamera;
  scenes: Partial<Record<ThreeChapter, SceneBundle>>;
  width: number;
  height: number;
  pixelRatio: number;
};

const clamp = (value: number) => Math.min(1, Math.max(0, value));
const smooth = (value: number) => {
  const bounded = clamp(value);
  return bounded * bounded * (3 - 2 * bounded);
};

function sampleTrack(progress: number, points: ReadonlyArray<TrackPoint>) {
  if (progress <= points[0][0]) return points[0][1];

  for (let index = 1; index < points.length; index += 1) {
    const [end, endValue] = points[index];
    const [start, startValue] = points[index - 1];
    if (progress <= end) {
      const local = smooth((progress - start) / Math.max(0.001, end - start));
      return THREE.MathUtils.lerp(startValue, endValue, local);
    }
  }

  return points[points.length - 1][1];
}

function createScene(color: number, density = 0.09) {
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(color, density);
  return scene;
}

function seededValue(index: number, salt: number) {
  const value = Math.sin(index * 91.173 + salt * 37.719) * 43758.5453;
  return value - Math.floor(value);
}

function addStars(
  scene: THREE.Scene,
  resources: ResourceTracker,
  color: number,
  count: number,
  spread = 18,
) {
  const positions = new Float32Array(count * 3);
  for (let index = 0; index < count; index += 1) {
    positions[index * 3] = (seededValue(index, 1) - 0.5) * spread;
    positions[index * 3 + 1] = (seededValue(index, 2) - 0.5) * spread;
    positions[index * 3 + 2] = -2 - seededValue(index, 3) * spread;
  }

  const geometry = resources.track(new THREE.BufferGeometry());
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const material = resources.track(new THREE.PointsMaterial({
    color,
    size: 0.035,
    transparent: true,
    opacity: 0.58,
    depthWrite: false,
  }));
  scene.add(new THREE.Points(geometry, material));
}

function disposeScene(scene: THREE.Scene) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();

  scene.traverse((object) => {
    const drawable = object as THREE.Object3D & {
      geometry?: THREE.BufferGeometry;
      material?: THREE.Material | THREE.Material[];
    };
    if (drawable.geometry) geometries.add(drawable.geometry);
    if (Array.isArray(drawable.material)) drawable.material.forEach((material) => materials.add(material));
    else if (drawable.material) materials.add(drawable.material);
    if (drawable instanceof THREE.InstancedMesh) drawable.dispose();
  });

  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
  scene.clear();
}

function helixPoint(progress: number, phaseOffset = 0) {
  const phase = progress * Math.PI * 7.2 + phaseOffset;
  return new THREE.Vector3(
    Math.cos(phase) * 0.72,
    THREE.MathUtils.lerp(-3.65, 3.65, progress),
    Math.sin(phase) * 0.72,
  );
}

export function createDnaScene(): SceneBundle {
  const scene = createScene(0x041318, 0.075);
  const resources = new ResourceTracker();
  try {
  const root = new THREE.Group();
  scene.add(root);
  const dnaPresentation = createDnaPresentation();
  addStars(scene, resources, 0x82eaf1, 360, 17);

  const railMaterials = [
    resources.track(new THREE.MeshPhysicalMaterial({
      color: 0x2ad6e6,
      emissive: 0x063d45,
      emissiveIntensity: 0.46,
      roughness: 0.48,
      metalness: 0.12,
      clearcoat: 0.18,
    })),
    resources.track(new THREE.MeshPhysicalMaterial({
      color: 0xff814d,
      emissive: 0x49150a,
      emissiveIntensity: 0.42,
      roughness: 0.5,
      metalness: 0.1,
      clearcoat: 0.16,
    })),
  ] as const;

  for (const [railIndex, phaseOffset] of [0, Math.PI].entries()) {
    const points = Array.from({ length: 129 }, (_, index) => helixPoint(index / 128, phaseOffset));
    const curve = new THREE.CatmullRomCurve3(points, false, "centripetal", 0.45);
    const geometry = resources.track(new THREE.TubeGeometry(curve, 220, 0.105, 10, false));
    root.add(new THREE.Mesh(geometry, railMaterials[railIndex]));
  }

  const pairCount = 44;
  const pairGeometry = resources.track(new THREE.CylinderGeometry(0.036, 0.036, 1, 10));
  const pairMaterial = resources.track(new THREE.MeshStandardMaterial({
    color: 0xc8e2e3,
    emissive: 0x173a3d,
    emissiveIntensity: 0.28,
    roughness: 0.52,
    metalness: 0.14,
  }));
  const pairs = resources.track(new THREE.InstancedMesh(pairGeometry, pairMaterial, pairCount));
  const nodeGeometry = resources.track(new THREE.SphereGeometry(0.105, 16, 12));
  const cyanNodes = resources.track(new THREE.InstancedMesh(nodeGeometry, railMaterials[0], pairCount));
  const amberNodes = resources.track(new THREE.InstancedMesh(nodeGeometry, railMaterials[1], pairCount));
  const transform = new THREE.Object3D();
  const up = new THREE.Vector3(0, 1, 0);

  for (let index = 0; index < pairCount; index += 1) {
    const progress = index / (pairCount - 1);
    const first = helixPoint(progress);
    const second = helixPoint(progress, Math.PI);
    const direction = second.clone().sub(first);
    const distance = direction.length();

    transform.position.copy(first).add(second).multiplyScalar(0.5);
    transform.quaternion.setFromUnitVectors(up, direction.normalize());
    transform.scale.set(1, distance, 1);
    transform.updateMatrix();
    pairs.setMatrixAt(index, transform.matrix);

    transform.position.copy(first);
    transform.quaternion.identity();
    transform.scale.setScalar(index % 6 === 0 ? 1.34 : 0.86);
    transform.updateMatrix();
    cyanNodes.setMatrixAt(index, transform.matrix);

    transform.position.copy(second);
    transform.quaternion.identity();
    transform.updateMatrix();
    amberNodes.setMatrixAt(index, transform.matrix);
  }

  pairs.instanceMatrix.needsUpdate = true;
  cyanNodes.instanceMatrix.needsUpdate = true;
  amberNodes.instanceMatrix.needsUpdate = true;
  root.add(pairs, cyanNodes, amberNodes);

  scene.add(new THREE.HemisphereLight(0x92f6ff, 0x081018, 1.7));
  const cyanKey = new THREE.DirectionalLight(0x8af8ff, 4.2);
  cyanKey.position.set(-4, 5, 5);
  scene.add(cyanKey);
  const amberRim = new THREE.PointLight(0xff6638, 14, 14, 1.6);
  amberRim.position.set(3.5, -1.2, 3.8);
  scene.add(amberRim);

  return {
    scene,
    update(progress, width, height, camera) {
      const wide = width / Math.max(height, 1) > 1.15;
      const pose = getDnaPresentation(progress, wide, dnaPresentation);
      root.scale.setScalar(pose.scale);
      root.position.set(pose.x, pose.y, 0);
      root.rotation.set(
        pose.rotationX,
        pose.rotationY,
        pose.rotationZ,
      );
      camera.position.set(0, 0, pose.cameraZ);
      camera.lookAt(pose.lookX, 0, 0);
    },
  };
  } catch (error) {
    resources.dispose();
    scene.clear();
    throw error;
  }
}

export function createPlanetScene(): SceneBundle {
  function deformPlanetSurface(geometry: THREE.SphereGeometry) {
    const position = geometry.getAttribute("position");
    const colors = new Float32Array(position.count * 3);
    const normal = new THREE.Vector3();
    const color = new THREE.Color();
    const shadow = new THREE.Color(0x241520);
    const mineral = new THREE.Color(0x934b3b);
    const highland = new THREE.Color(0xd99762);
    const craterCenters = Array.from({ length: 11 }, (_, index) => {
      const latitude = (seededValue(index, 18) - 0.5) * Math.PI * 0.88;
      const longitude = seededValue(index, 19) * Math.PI * 2;
      return new THREE.Vector3(
        Math.cos(latitude) * Math.cos(longitude),
        Math.sin(latitude),
        Math.cos(latitude) * Math.sin(longitude),
      ).normalize();
    });

    for (let index = 0; index < position.count; index += 1) {
      normal.set(position.getX(index), position.getY(index), position.getZ(index)).normalize();
      const broad = Math.sin(normal.x * 5.4 + normal.z * 2.3) * 0.022;
      const fine = Math.cos(normal.y * 14.7 - normal.z * 6.1) * 0.011;
      let displacement = broad + fine;

      craterCenters.forEach((center, craterIndex) => {
        const angularDistance = Math.acos(THREE.MathUtils.clamp(normal.dot(center), -1, 1));
        const radius = 0.09 + seededValue(craterIndex, 20) * 0.075;
        const normalized = angularDistance / radius;
        const basin = Math.exp(-normalized * normalized * 2.8) * -0.045;
        const rim = Math.exp(-((normalized - 1) ** 2) * 18) * 0.014;
        displacement += basin + rim;
      });

      const surfaceRadius = 1.58 + displacement;
      position.setXYZ(
        index,
        normal.x * surfaceRadius,
        normal.y * surfaceRadius,
        normal.z * surfaceRadius,
      );
      const terrain = clamp(0.48 + broad * 8 + fine * 12 + displacement * 3.5);
      if (terrain > 0.58) color.copy(mineral).lerp(highland, (terrain - 0.58) / 0.42);
      else color.copy(shadow).lerp(mineral, terrain / 0.58);
      colors[index * 3] = color.r;
      colors[index * 3 + 1] = color.g;
      colors[index * 3 + 2] = color.b;
    }

    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
  }

  const scene = createScene(0x080715, 0.052);
  const resources = new ResourceTracker();
  try {
  addStars(scene, resources, 0xdde9ff, 720, 26);
  const system = new THREE.Group();
  const planetAssembly = new THREE.Group();
  system.add(planetAssembly);
  scene.add(system);

  const planetGeometry = resources.track(new THREE.SphereGeometry(1.58, 72, 48));
  deformPlanetSurface(planetGeometry);
  const planetMaterial = resources.track(new THREE.MeshPhysicalMaterial({
    vertexColors: true,
    roughness: 0.91,
    metalness: 0.01,
    clearcoat: 0.06,
    clearcoatRoughness: 0.84,
    emissive: 0x10040a,
    emissiveIntensity: 0.05,
  }));
  const planet = new THREE.Mesh(planetGeometry, planetMaterial);
  planetAssembly.add(planet);

  const atmosphereMaterial = resources.track(new THREE.MeshPhysicalMaterial({
    color: 0xff906b,
    emissive: 0x541526,
    emissiveIntensity: 0.55,
    transparent: true,
    opacity: 0.11,
    roughness: 0.12,
    metalness: 0,
    side: THREE.BackSide,
    depthWrite: false,
  }));
  const atmosphere = new THREE.Mesh(
    resources.track(new THREE.SphereGeometry(1.68, 48, 32)),
    atmosphereMaterial,
  );
  planetAssembly.add(atmosphere);

  const moon = new THREE.Mesh(
    resources.track(new THREE.SphereGeometry(0.15, 20, 14)),
    resources.track(new THREE.MeshStandardMaterial({ color: 0xe4d8cc, roughness: 0.82 })),
  );
  system.add(moon);
  const satellite = createSatellite(resources);
  system.add(satellite);

  scene.add(new THREE.HemisphereLight(0x607db8, 0x10040c, 1.35));
  const sun = new THREE.DirectionalLight(0xffe1b0, 5.4);
  sun.position.set(-4.5, 4.2, 5.4);
  scene.add(sun);
  const horizonFill = new THREE.PointLight(0xc35d51, 6, 12, 1.8);
  horizonFill.position.set(3, -2.4, 1.4);
  scene.add(horizonFill);

  return {
    scene,
    update(progress, width, height, camera, reducedTransparency) {
      const wide = width / Math.max(height, 1) > 1.15;
      const scale = sampleTrack(progress, PLANET_SCALE_TRACK);
      system.scale.setScalar(scale);
      system.position.set(
        sampleTrack(progress, wide ? PLANET_X_WIDE_TRACK : PLANET_X_NARROW_TRACK),
        sampleTrack(progress, PLANET_Y_TRACK),
        0,
      );
      planet.rotation.set(0.08 + progress * 0.28, -0.7 + progress * 1.05, -0.06);
      planetAssembly.rotation.z = sampleTrack(progress, PLANET_ROTATION_Z_TRACK);
      const moonAngle = progress * Math.PI * 1.5 + 0.6;
      moon.position.set(Math.cos(moonAngle) * 3.2, Math.sin(moonAngle) * 1.1, Math.sin(moonAngle) * 1.7);
      updateSatellite(satellite, progress, reducedTransparency);
      atmosphereMaterial.opacity = reducedTransparency ? 0 : 0.11;
      camera.position.set(0, 0, wide ? 7.6 : 9.1);
      camera.lookAt(wide ? 0.55 : 0, 0, 0);
    },
  };
  } catch (error) {
    resources.dispose();
    scene.clear();
    throw error;
  }
}

function createEducationScene(): SceneBundle {
  const scene = createScene(0x061118, 0.07);
  const resources = new ResourceTracker();
  try {
  addStars(scene, resources, 0x72dfff, 260, 16);
  const root = new THREE.Group();
  scene.add(root);
  const relay = createSatellite(resources);
  scene.add(relay);

  const nodes: THREE.Mesh[] = [];
  const nodeMaterial = resources.track(new THREE.MeshPhysicalMaterial({
    color: 0x55deef,
    emissive: 0x0b4e59,
    emissiveIntensity: 0.42,
    roughness: 0.5,
    metalness: 0.22,
  }));
  const linePositions: number[] = [];
  for (let index = 0; index < 9; index += 1) {
    const angle = index * 2.1;
    const radius = 0.6 + index * 0.3;
    const position = new THREE.Vector3(Math.cos(angle) * radius, (index - 4) * 0.55, Math.sin(angle) * 0.55);
    const nodeGeometry = resources.track(new THREE.IcosahedronGeometry(index % 3 === 0 ? 0.18 : 0.11, 1));
    const node = new THREE.Mesh(nodeGeometry, nodeMaterial);
    node.position.copy(position);
    nodes.push(node);
    root.add(node);
    if (index > 0) linePositions.push(...nodes[index - 1].position.toArray(), ...position.toArray());
  }
  const lineGeometry = resources.track(new THREE.BufferGeometry());
  lineGeometry.setAttribute("position", new THREE.Float32BufferAttribute(linePositions, 3));
  const lineMaterial = resources.track(new THREE.LineBasicMaterial({ color: 0x4ccbd8, transparent: true, opacity: 0.45 }));
  root.add(new THREE.LineSegments(lineGeometry, lineMaterial));
  scene.add(new THREE.HemisphereLight(0x8cecff, 0x061019, 2.1));
  const key = new THREE.PointLight(0x55deef, 11, 12);
  key.position.set(2, 1, 3);
  scene.add(key);

  return {
    scene,
    update(progress, width, height, camera) {
      const wide = width / Math.max(height, 1) > 1.15;
      root.position.set(wide ? 2.25 - progress * 0.7 : 0.45 - progress * 0.2, 0.2 - progress * 0.45, 0);
      root.rotation.set(-0.18, -0.35 + progress * 1.3, -0.12 + progress * 0.2);
      root.scale.setScalar(1.25 - progress * 0.18);
      updateEducationRelay(relay, progress, wide);
      camera.position.set(0, 0, wide ? 7.8 : 9.3);
      camera.lookAt(0.45, 0, 0);
    },
  };
  } catch (error) {
    resources.dispose();
    scene.clear();
    throw error;
  }
}

function createAmbientScene(): SceneBundle {
  const color = 0x67d8ff;
  const scene = createScene(0x050e15, 0.06);
  const resources = new ResourceTracker();
  try {
  addStars(scene, resources, color, 240, 17);
  const root = new THREE.Group();
  scene.add(root);
  const material = resources.track(new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.42 }));

  for (let track = 0; track < 12; track += 1) {
    const points = Array.from({ length: 72 }, (_, index) => {
      const x = THREE.MathUtils.lerp(-3.4, 3.4, index / 71);
      const y = (track - 5.5) * 0.38 + Math.sin(index * 0.34 + track * 1.8) * (0.08 + (track % 3) * 0.035);
      return new THREE.Vector3(x, y, Math.sin(index * 0.17 + track) * 0.34);
    });
    const geometry = resources.track(new THREE.BufferGeometry());
    geometry.setFromPoints(points);
    root.add(new THREE.Line(geometry, material));
  }
  scene.add(new THREE.AmbientLight(color, 1.4));
  const key = new THREE.PointLight(color, 18, 14);
  key.position.set(3, 0, 4);
  scene.add(key);

  return {
    scene,
    update(progress, width, height, camera) {
      const wide = width / Math.max(height, 1) > 1.15;
      root.position.set(wide ? 2.2 - progress * 1.1 : 0.6 - progress * 0.3, -0.1, 0);
      root.rotation.set(-0.16, -0.28 + progress * 0.72, -0.08);
      root.scale.setScalar(1.12 - progress * 0.16);
      camera.position.set(0, 0, wide ? 7.6 : 9.2);
      camera.lookAt(0.35, 0, 0);
    },
  };
  } catch (error) {
    resources.dispose();
    scene.clear();
    throw error;
  }
}

export function createThreeStage(canvas: HTMLCanvasElement): ThreeStage {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: "high-performance",
  });
  try {
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    return {
      renderer,
      camera: new THREE.PerspectiveCamera(34, 1, 0.1, 80),
      scenes: {},
      width: 0,
      height: 0,
      pixelRatio: 0,
    };
  } catch (error) {
    renderer.dispose();
    throw error;
  }
}

function createChapterScene(chapter: ThreeChapter) {
  if (chapter === "health") return createDnaScene();
  if (chapter === "space") return createPlanetScene();
  if (chapter === "education") return createEducationScene();
  if (chapter === "building") return createBuildingScene();
  if (chapter === "impact") return createReachScene();
  return createAmbientScene();
}

function getOrCreateScene(stage: ThreeStage, chapter: ThreeChapter) {
  const existingBundle = stage.scenes[chapter];
  if (existingBundle) return existingBundle;
  const bundle = createChapterScene(chapter);
  stage.scenes = { ...stage.scenes, [chapter]: bundle };
  return bundle;
}

export function prewarmThreeScene(stage: ThreeStage, chapter: ThreeChapter) {
  getOrCreateScene(stage, chapter);
}

type MaterialState = Readonly<{
  baseOpacity: number;
  appliedOpacity: number;
  transparent: boolean;
  depthWrite: boolean;
}>;

const materialStates = new WeakMap<THREE.Material, MaterialState>();
const sceneMaterials = new WeakMap<THREE.Scene, ReadonlyArray<THREE.Material>>();

function getSceneMaterials(scene: THREE.Scene) {
  const cached = sceneMaterials.get(scene);
  if (cached) return cached;
  const materials = new Set<THREE.Material>();
  scene.traverse((object) => {
    const drawable = object as THREE.Object3D & { material?: THREE.Material | THREE.Material[] };
    if (Array.isArray(drawable.material)) drawable.material.forEach((material) => materials.add(material));
    else if (drawable.material) materials.add(drawable.material);
  });
  const result = Array.from(materials);
  sceneMaterials.set(scene, result);
  return result;
}

function restoreSceneOpacity(scene: THREE.Scene) {
  getSceneMaterials(scene).forEach((material) => {
    const state = materialStates.get(material);
    if (!state) return;
    material.opacity = state.baseOpacity;
    materialStates.set(material, {
      ...state,
      appliedOpacity: state.baseOpacity,
    });
  });
}

function setSceneOpacity(scene: THREE.Scene, opacity: number) {
  const faded = opacity < 0.999;
  getSceneMaterials(scene).forEach((material) => {
    let initial = materialStates.get(material);
    if (!initial) {
      initial = {
        baseOpacity: material.opacity,
        appliedOpacity: material.opacity,
        transparent: material.transparent,
        depthWrite: material.depthWrite,
      };
    }
    const baseOpacity = Math.abs(material.opacity - initial.appliedOpacity) > 0.000001
      ? material.opacity
      : initial.baseOpacity;
    const appliedOpacity = baseOpacity * opacity;
    const transparent = faded || initial.transparent;
    if (material.transparent !== transparent) {
      material.transparent = transparent;
      material.needsUpdate = true;
    }
    material.opacity = appliedOpacity;
    material.depthWrite = faded ? false : initial.depthWrite;
    materialStates.set(material, {
      ...initial,
      baseOpacity,
      appliedOpacity,
    });
  });
}

function setHandoffCamera(camera: THREE.PerspectiveCamera, width: number, height: number) {
  const wide = width / Math.max(height, 1) > 1.15;
  camera.position.set(0, 0, wide ? 7.7 : 9.2);
  camera.lookAt(wide ? 0.5 : 0, 0, 0);
}

function updateChapterTransition(
  stage: ThreeStage,
  fromChapter: ThreeChapter,
  fromProgress: number,
  toChapter: ThreeChapter,
  toProgress: number,
  width: number,
  height: number,
  transition: number,
  reducedTransparency: boolean,
) {
  const blend = smooth(transition);
  const from = getOrCreateScene(stage, fromChapter);
  const renderer = stage.renderer;
  const sharedSatelliteHandoff = fromChapter === "space" && toChapter === "education";

  if (fromChapter === toChapter || blend <= 0.001) {
    setSceneOpacity(from.scene, 1);
    from.update(clamp(fromProgress), width, height, stage.camera, reducedTransparency);
    renderer.render(from.scene, stage.camera);
    return;
  }
  const to = getOrCreateScene(stage, toChapter);
  if (blend >= 0.999) {
    setSceneOpacity(to.scene, 1);
    to.update(clamp(toProgress), width, height, stage.camera, reducedTransparency);
    renderer.render(to.scene, stage.camera);
    return;
  }

  try {
    renderer.autoClear = false;
    renderer.clear(true, true, true);
    restoreSceneOpacity(from.scene);
    from.update(clamp(fromProgress), width, height, stage.camera, reducedTransparency);
    if (sharedSatelliteHandoff) setHandoffCamera(stage.camera, width, height);
    setSceneOpacity(from.scene, 1 - blend);
    renderer.render(from.scene, stage.camera);
    renderer.clearDepth();
    restoreSceneOpacity(to.scene);
    to.update(clamp(toProgress), width, height, stage.camera, reducedTransparency);
    if (sharedSatelliteHandoff) setHandoffCamera(stage.camera, width, height);
    setSceneOpacity(to.scene, blend);
    renderer.render(to.scene, stage.camera);
  } finally {
    renderer.autoClear = true;
  }
}

function resizeStage(stage: ThreeStage, width: number, height: number) {
  const pixelRatio = Math.min(window.devicePixelRatio || 1, width < 700 ? 1.25 : 1.5);
  if (stage.width === width && stage.height === height && stage.pixelRatio === pixelRatio) return;

  stage.width = width;
  stage.height = height;
  stage.pixelRatio = pixelRatio;
  stage.renderer.setPixelRatio(pixelRatio);
  stage.renderer.setSize(width, height, false);
  stage.camera.aspect = width / Math.max(height, 1);
  stage.camera.updateProjectionMatrix();
}

export function updateThreeScene(
  stage: ThreeStage,
  fromChapter: ThreeChapter,
  fromProgress: number,
  toChapter: ThreeChapter,
  toProgress: number,
  width: number,
  height: number,
  transition: number,
  reducedTransparency: boolean,
) {
  resizeStage(stage, width, height);
  updateChapterTransition(
    stage,
    fromChapter,
    fromProgress,
    toChapter,
    toProgress,
    width,
    height,
    transition,
    reducedTransparency,
  );
}

export function disposeThreeStage(stage: ThreeStage) {
  Object.values(stage.scenes).forEach((bundle) => {
    if (!bundle) return;
    disposeScene(bundle.scene);
  });

  stage.renderer.setAnimationLoop(null);
  stage.renderer.dispose();
}
