import * as THREE from "three";

export type ThreeChapter = "hero" | "health" | "space" | "education" | "building" | "impact";

type TrackPoint = readonly [progress: number, value: number];

const DNA_SCALE_TRACK = [
  [0, 2.35], [0.14, 2.35], [0.22, 1.68], [0.34, 1.68],
  [0.44, 1.25], [0.56, 1.25], [0.66, 0.92], [1, 0.78],
] as const;
const DNA_X_WIDE_TRACK = [
  [0, 3.35], [0.14, 3.35], [0.22, 2.75], [0.44, 2.25], [0.66, 1.65], [1, 1.3],
] as const;
const DNA_X_NARROW_TRACK = [
  [0, 1.35], [0.14, 1.35], [0.22, 1.05], [0.44, 0.72], [0.66, 0.35], [1, 0.1],
] as const;
const DNA_Y_TRACK = [[0, 0.85], [0.22, 0.5], [0.44, 0.16], [0.66, -0.14], [1, -0.36]] as const;
const DNA_ROTATION_Y_TRACK = [[0, -0.45], [0.34, 0.06], [0.66, 0.48], [1, 0.76]] as const;
const DNA_ROTATION_Z_TRACK = [[0, -0.16], [0.44, -0.36], [1, -0.57]] as const;

const PLANET_SCALE_TRACK = [
  [0, 2.18], [0.15, 2.18], [0.25, 1.36], [0.45, 1.36],
  [0.55, 0.98], [0.76, 0.98], [0.86, 0.76], [1, 0.76],
] as const;
const PLANET_X_WIDE_TRACK = [
  [0, 3.3], [0.15, 3.3], [0.25, 2.6], [0.55, 2.05], [0.86, 1.48], [1, 1.48],
] as const;
const PLANET_X_NARROW_TRACK = [
  [0, 1.35], [0.15, 1.35], [0.25, 0.95], [0.55, 0.55], [0.86, 0.18], [1, 0.18],
] as const;
const PLANET_Y_TRACK = [[0, 0.8], [0.25, 0.38], [0.55, 0.04], [0.86, -0.26], [1, -0.26]] as const;
const PLANET_ROTATION_Z_TRACK = [[0, -0.04], [0.55, -0.18], [1, -0.28]] as const;

type SceneBundle = Readonly<{
  scene: THREE.Scene;
  update: (progress: number, width: number, height: number, camera: THREE.PerspectiveCamera) => void;
}>;

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

function addStars(scene: THREE.Scene, color: number, count: number, spread = 18) {
  const positions = new Float32Array(count * 3);
  for (let index = 0; index < count; index += 1) {
    positions[index * 3] = (seededValue(index, 1) - 0.5) * spread;
    positions[index * 3 + 1] = (seededValue(index, 2) - 0.5) * spread;
    positions[index * 3 + 2] = -2 - seededValue(index, 3) * spread;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color,
    size: 0.035,
    transparent: true,
    opacity: 0.58,
    depthWrite: false,
  });
  scene.add(new THREE.Points(geometry, material));
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
  const root = new THREE.Group();
  scene.add(root);
  addStars(scene, 0x82eaf1, 360, 17);

  const railMaterials = [
    new THREE.MeshPhysicalMaterial({
      color: 0x2ad6e6,
      emissive: 0x063d45,
      emissiveIntensity: 1.2,
      roughness: 0.24,
      metalness: 0.64,
      clearcoat: 0.75,
    }),
    new THREE.MeshPhysicalMaterial({
      color: 0xff814d,
      emissive: 0x49150a,
      emissiveIntensity: 1.15,
      roughness: 0.28,
      metalness: 0.58,
      clearcoat: 0.7,
    }),
  ] as const;

  for (const [railIndex, phaseOffset] of [0, Math.PI].entries()) {
    const points = Array.from({ length: 129 }, (_, index) => helixPoint(index / 128, phaseOffset));
    const curve = new THREE.CatmullRomCurve3(points, false, "centripetal", 0.45);
    const geometry = new THREE.TubeGeometry(curve, 220, 0.105, 10, false);
    root.add(new THREE.Mesh(geometry, railMaterials[railIndex]));
  }

  const pairCount = 44;
  const pairGeometry = new THREE.CylinderGeometry(0.036, 0.036, 1, 10);
  const pairMaterial = new THREE.MeshStandardMaterial({
    color: 0xc8e2e3,
    emissive: 0x173a3d,
    emissiveIntensity: 0.75,
    roughness: 0.34,
    metalness: 0.52,
  });
  const pairs = new THREE.InstancedMesh(pairGeometry, pairMaterial, pairCount);
  const nodeGeometry = new THREE.SphereGeometry(0.105, 16, 12);
  const cyanNodes = new THREE.InstancedMesh(nodeGeometry, railMaterials[0], pairCount);
  const amberNodes = new THREE.InstancedMesh(nodeGeometry, railMaterials[1], pairCount);
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
  const amberRim = new THREE.PointLight(0xff6638, 34, 14, 1.6);
  amberRim.position.set(3.5, -1.2, 3.8);
  scene.add(amberRim);

  return {
    scene,
    update(progress, width, height, camera) {
      const wide = width / Math.max(height, 1) > 1.15;
      const scale = sampleTrack(progress, DNA_SCALE_TRACK);
      root.scale.setScalar(scale);
      root.position.set(
        sampleTrack(progress, wide ? DNA_X_WIDE_TRACK : DNA_X_NARROW_TRACK),
        sampleTrack(progress, DNA_Y_TRACK),
        0,
      );
      root.rotation.set(
        0.18 + progress * 0.22,
        sampleTrack(progress, DNA_ROTATION_Y_TRACK),
        sampleTrack(progress, DNA_ROTATION_Z_TRACK),
      );
      camera.position.set(0, 0, wide ? 7.2 : 8.7);
      camera.lookAt(wide ? 0.5 : 0, 0, 0);
    },
  };
}

function colorPlanetGeometry(geometry: THREE.SphereGeometry) {
  const position = geometry.getAttribute("position");
  const colors = new Float32Array(position.count * 3);
  const shadow = new THREE.Color(0x3b0e28);
  const rust = new THREE.Color(0xc5482f);
  const sand = new THREE.Color(0xffbd6b);

  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index);
    const y = position.getY(index);
    const z = position.getZ(index);
    const terrain = clamp(0.5 + Math.sin(x * 4.7 + z * 1.8) * 0.2 + Math.cos(y * 9.1 - z * 2.4) * 0.19);
    const color = terrain > 0.61
      ? rust.clone().lerp(sand, (terrain - 0.61) / 0.39)
      : shadow.clone().lerp(rust, terrain / 0.61);
    colors[index * 3] = color.r;
    colors[index * 3 + 1] = color.g;
    colors[index * 3 + 2] = color.b;
  }

  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
}

export function createPlanetScene(): SceneBundle {
  const scene = createScene(0x080715, 0.052);
  addStars(scene, 0xdde9ff, 720, 26);
  const system = new THREE.Group();
  const planetAssembly = new THREE.Group();
  system.add(planetAssembly);
  scene.add(system);

  const planetGeometry = new THREE.SphereGeometry(1.58, 72, 48);
  colorPlanetGeometry(planetGeometry);
  const planetMaterial = new THREE.MeshPhysicalMaterial({
    vertexColors: true,
    roughness: 0.72,
    metalness: 0.04,
    clearcoat: 0.24,
    clearcoatRoughness: 0.5,
    emissive: 0x17030b,
    emissiveIntensity: 0.35,
  });
  const planet = new THREE.Mesh(planetGeometry, planetMaterial);
  planetAssembly.add(planet);

  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(1.68, 48, 32),
    new THREE.MeshPhysicalMaterial({
      color: 0xff7a50,
      emissive: 0x5f1427,
      emissiveIntensity: 1.4,
      transparent: true,
      opacity: 0.14,
      roughness: 0.08,
      metalness: 0,
      side: THREE.BackSide,
      depthWrite: false,
    }),
  );
  planetAssembly.add(atmosphere);

  const craterCount = 18;
  const craterGeometry = new THREE.TorusGeometry(0.1, 0.018, 7, 22);
  const craterMaterial = new THREE.MeshStandardMaterial({ color: 0x260917, roughness: 0.94 });
  const craters = new THREE.InstancedMesh(craterGeometry, craterMaterial, craterCount);
  const transform = new THREE.Object3D();
  const forward = new THREE.Vector3(0, 0, 1);
  for (let index = 0; index < craterCount; index += 1) {
    const latitude = (seededValue(index, 8) - 0.5) * Math.PI * 0.82;
    const longitude = seededValue(index, 9) * Math.PI * 2;
    const normal = new THREE.Vector3(
      Math.cos(latitude) * Math.cos(longitude),
      Math.sin(latitude),
      Math.cos(latitude) * Math.sin(longitude),
    );
    transform.position.copy(normal).multiplyScalar(1.59);
    transform.quaternion.setFromUnitVectors(forward, normal);
    transform.scale.setScalar(0.65 + seededValue(index, 10) * 1.6);
    transform.updateMatrix();
    craters.setMatrixAt(index, transform.matrix);
  }
  craters.instanceMatrix.needsUpdate = true;
  planetAssembly.add(craters);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(2.04, 2.55, 128),
    new THREE.MeshStandardMaterial({
      color: 0xffc47c,
      emissive: 0x3b160a,
      emissiveIntensity: 0.8,
      transparent: true,
      opacity: 0.42,
      roughness: 0.55,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  ring.rotation.x = 1.22;
  ring.rotation.z = -0.14;
  planetAssembly.add(ring);

  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(0.15, 20, 14),
    new THREE.MeshStandardMaterial({ color: 0xe4d8cc, roughness: 0.82 }),
  );
  system.add(moon);

  scene.add(new THREE.HemisphereLight(0x607db8, 0x10040c, 1.35));
  const sun = new THREE.DirectionalLight(0xffe1b0, 5.4);
  sun.position.set(-4.5, 4.2, 5.4);
  scene.add(sun);
  const redBounce = new THREE.PointLight(0xff4f36, 28, 12, 1.8);
  redBounce.position.set(3, -2.4, 2.2);
  scene.add(redBounce);

  return {
    scene,
    update(progress, width, height, camera) {
      const wide = width / Math.max(height, 1) > 1.15;
      const scale = sampleTrack(progress, PLANET_SCALE_TRACK);
      system.scale.setScalar(scale);
      system.position.set(
        sampleTrack(progress, wide ? PLANET_X_WIDE_TRACK : PLANET_X_NARROW_TRACK),
        sampleTrack(progress, PLANET_Y_TRACK),
        0,
      );
      planet.rotation.set(0.08 + progress * 0.28, -0.7 + progress * 2.15, -0.06);
      planetAssembly.rotation.z = sampleTrack(progress, PLANET_ROTATION_Z_TRACK);
      const moonAngle = progress * Math.PI * 1.5 + 0.6;
      moon.position.set(Math.cos(moonAngle) * 3.2, Math.sin(moonAngle) * 1.1, Math.sin(moonAngle) * 1.7);
      camera.position.set(0, 0, wide ? 7.6 : 9.1);
      camera.lookAt(wide ? 0.55 : 0, 0, 0);
    },
  };
}

function createEducationScene(): SceneBundle {
  const scene = createScene(0x061118, 0.07);
  addStars(scene, 0x72dfff, 260, 16);
  const root = new THREE.Group();
  scene.add(root);

  const nodes: THREE.Mesh[] = [];
  const nodeMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x55deef,
    emissive: 0x0b4e59,
    emissiveIntensity: 1.2,
    roughness: 0.24,
    metalness: 0.6,
  });
  const linePositions: number[] = [];
  for (let index = 0; index < 9; index += 1) {
    const angle = index * 2.1;
    const radius = 0.6 + index * 0.3;
    const position = new THREE.Vector3(Math.cos(angle) * radius, (index - 4) * 0.55, Math.sin(angle) * 0.55);
    const node = new THREE.Mesh(new THREE.IcosahedronGeometry(index % 3 === 0 ? 0.18 : 0.11, 1), nodeMaterial);
    node.position.copy(position);
    nodes.push(node);
    root.add(node);
    if (index > 0) linePositions.push(...nodes[index - 1].position.toArray(), ...position.toArray());
  }
  const lineGeometry = new THREE.BufferGeometry();
  lineGeometry.setAttribute("position", new THREE.Float32BufferAttribute(linePositions, 3));
  root.add(new THREE.LineSegments(lineGeometry, new THREE.LineBasicMaterial({ color: 0x4ccbd8, transparent: true, opacity: 0.45 })));
  scene.add(new THREE.HemisphereLight(0x8cecff, 0x061019, 2.1));
  const key = new THREE.PointLight(0x55deef, 22, 12);
  key.position.set(2, 1, 3);
  scene.add(key);

  return {
    scene,
    update(progress, width, height, camera) {
      const wide = width / Math.max(height, 1) > 1.15;
      root.position.set(wide ? 2.25 - progress * 0.7 : 0.45 - progress * 0.2, 0.2 - progress * 0.45, 0);
      root.rotation.set(-0.18, -0.35 + progress * 1.3, -0.12 + progress * 0.2);
      root.scale.setScalar(1.25 - progress * 0.18);
      camera.position.set(0, 0, wide ? 7.8 : 9.3);
      camera.lookAt(0.45, 0, 0);
    },
  };
}

function createSignalScene(warm: boolean): SceneBundle {
  const color = warm ? 0xff835f : 0x67d8ff;
  const scene = createScene(warm ? 0x150908 : 0x050e15, 0.06);
  addStars(scene, color, 240, 17);
  const root = new THREE.Group();
  scene.add(root);
  const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.42 });

  for (let track = 0; track < 12; track += 1) {
    const points = Array.from({ length: 72 }, (_, index) => {
      const x = THREE.MathUtils.lerp(-3.4, 3.4, index / 71);
      const y = (track - 5.5) * 0.38 + Math.sin(index * 0.34 + track * 1.8) * (0.08 + (track % 3) * 0.035);
      return new THREE.Vector3(x, y, Math.sin(index * 0.17 + track) * 0.34);
    });
    root.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material));
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
      root.rotation.set(-0.16, -0.28 + progress * 0.72, warm ? 0.12 : -0.08);
      root.scale.setScalar(1.12 - progress * 0.16);
      camera.position.set(0, 0, wide ? 7.6 : 9.2);
      camera.lookAt(0.35, 0, 0);
    },
  };
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
    renderer.toneMappingExposure = 1.15;

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
  return createSignalScene(chapter === "impact");
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
  chapter: ThreeChapter,
  progress: number,
  width: number,
  height: number,
) {
  resizeStage(stage, width, height);
  const existingBundle = stage.scenes[chapter];
  const bundle = existingBundle ?? createChapterScene(chapter);
  if (!existingBundle) stage.scenes = { ...stage.scenes, [chapter]: bundle };
  bundle.update(clamp(progress), width, height, stage.camera);
  stage.renderer.render(bundle.scene, stage.camera);
}

function disposeMaterial(material: THREE.Material) {
  material.dispose();
}

export function disposeThreeStage(stage: ThreeStage) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();

  Object.values(stage.scenes).forEach((bundle) => {
    if (!bundle) return;
    const { scene } = bundle;
    scene.traverse((object) => {
      const drawable = object as THREE.Object3D & {
        geometry?: THREE.BufferGeometry;
        material?: THREE.Material | THREE.Material[];
        dispose?: () => void;
      };
      if (drawable.geometry) geometries.add(drawable.geometry);
      if (Array.isArray(drawable.material)) drawable.material.forEach((material) => materials.add(material));
      else if (drawable.material) materials.add(drawable.material);
      if (drawable instanceof THREE.InstancedMesh) drawable.dispose();
    });
    scene.clear();
  });

  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => disposeMaterial(material));
  stage.renderer.setAnimationLoop(null);
  stage.renderer.dispose();
}
