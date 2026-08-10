import * as THREE from "three";

type FeatureSceneBundle = Readonly<{
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

class FeatureResources {
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

const clamp = (value: number) => Math.min(1, Math.max(0, value));
const smooth = (value: number) => {
  const bounded = clamp(value);
  return bounded * bounded * (3 - 2 * bounded);
};
const seededValue = (index: number, salt: number) => {
  const value = Math.sin(index * 73.917 + salt * 41.113) * 43758.5453;
  return value - Math.floor(value);
};

function createBackdrop(
  scene: THREE.Scene,
  resources: FeatureResources,
  color: number,
  count: number,
) {
  const positions = new Float32Array(count * 3);
  for (let index = 0; index < count; index += 1) {
    positions[index * 3] = (seededValue(index, 1) - 0.5) * 18;
    positions[index * 3 + 1] = (seededValue(index, 2) - 0.5) * 14;
    positions[index * 3 + 2] = -3 - seededValue(index, 3) * 14;
  }
  const geometry = resources.track(new THREE.BufferGeometry());
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const material = resources.track(new THREE.PointsMaterial({
    color,
    size: 0.03,
    transparent: true,
    opacity: 0.3,
    depthWrite: false,
  }));
  scene.add(new THREE.Points(geometry, material));
  return material;
}

const BUILD_BEATS = [
  [0.11, 0.17, 0.29, 0.35],
  [0.3, 0.36, 0.48, 0.54],
  [0.49, 0.55, 0.67, 0.73],
  [0.68, 0.74, 0.9, 0.98],
] as const;

export function createBuildingScene(): FeatureSceneBundle {
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x050d15, 0.065);
  const resources = new FeatureResources();
  try {
    const backdropMaterial = createBackdrop(scene, resources, 0x75d9ff, 230);
    const root = new THREE.Group();
    scene.add(root);

    const coreMaterial = resources.track(new THREE.MeshPhysicalMaterial({
      color: 0x4fc7ed,
      emissive: 0x0b506a,
      emissiveIntensity: 1.1,
      roughness: 0.22,
      metalness: 0.72,
      clearcoat: 0.36,
    }));
    const core = new THREE.Mesh(
      resources.track(new THREE.IcosahedronGeometry(0.52, 2)),
      coreMaterial,
    );
    root.add(core);

    const moduleGeometry = resources.track(new THREE.BoxGeometry(1.28, 0.68, 0.42, 2, 2, 1));
    const detailGeometry = resources.track(new THREE.BoxGeometry(0.84, 0.045, 0.46));
    const detailMaterial = resources.track(new THREE.MeshStandardMaterial({
      color: 0xbbeeff,
      emissive: 0x154a62,
      emissiveIntensity: 0.7,
      roughness: 0.3,
      metalness: 0.7,
    }));
    const moduleTargets = [
      new THREE.Vector3(0, -1.38, 0),
      new THREE.Vector3(0, -0.46, 0),
      new THREE.Vector3(0, 0.46, 0),
      new THREE.Vector3(0, 1.38, 0),
    ];
    const explodedPositions = [
      new THREE.Vector3(3.8, -2.1, 1.2),
      new THREE.Vector3(-3.5, -0.35, 0.9),
      new THREE.Vector3(3.5, 1.2, -0.9),
      new THREE.Vector3(-3.2, 2.2, 1.1),
    ];
    const moduleGroups: THREE.Group[] = [];
    const moduleMaterials: THREE.MeshPhysicalMaterial[] = [];

    for (let index = 0; index < 4; index += 1) {
      const group = new THREE.Group();
      const material = resources.track(new THREE.MeshPhysicalMaterial({
        color: index % 2 === 0 ? 0x173b52 : 0x1d304b,
        emissive: index % 2 === 0 ? 0x0c4962 : 0x142f56,
        emissiveIntensity: 0.28,
        roughness: 0.32,
        metalness: 0.76,
        clearcoat: 0.42,
      }));
      const body = new THREE.Mesh(moduleGeometry, material);
      const upperDetail = new THREE.Mesh(detailGeometry, detailMaterial);
      const lowerDetail = new THREE.Mesh(detailGeometry, detailMaterial);
      upperDetail.position.y = 0.2;
      lowerDetail.position.y = -0.2;
      group.add(body, upperDetail, lowerDetail);
      group.position.copy(explodedPositions[index]);
      root.add(group);
      moduleGroups.push(group);
      moduleMaterials.push(material);
    }

    const connectorGeometry = resources.track(new THREE.BufferGeometry());
    connectorGeometry.setAttribute("position", new THREE.Float32BufferAttribute([
      0, -1.38, -0.24, 0, 1.38, -0.24,
      -0.55, -0.92, -0.24, 0.55, -0.92, -0.24,
      -0.55, 0, -0.24, 0.55, 0, -0.24,
      -0.55, 0.92, -0.24, 0.55, 0.92, -0.24,
    ], 3));
    const connectorMaterial = resources.track(new THREE.LineBasicMaterial({
      color: 0x70dcff,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    }));
    root.add(new THREE.LineSegments(connectorGeometry, connectorMaterial));

    scene.add(new THREE.HemisphereLight(0x8fe7ff, 0x04070d, 1.5));
    const key = new THREE.DirectionalLight(0xd1f5ff, 4.2);
    key.position.set(-3.5, 5, 5);
    scene.add(key);
    const accent = new THREE.PointLight(0x2cbce8, 18, 12, 1.8);
    accent.position.set(3, -1.5, 3.2);
    scene.add(accent);

    return {
      scene,
      update(progress, width, height, camera, reducedTransparency) {
        const wide = width / Math.max(height, 1) > 1.15;
        moduleGroups.forEach((group, index) => {
          const [enter, entered, exit, exited] = BUILD_BEATS[index];
          const assembled = smooth((progress - enter) / Math.max(0.001, entered - enter));
          const focused = assembled * (1 - smooth((progress - exit) / Math.max(0.001, exited - exit)));
          group.position.lerpVectors(explodedPositions[index], moduleTargets[index], assembled);
          group.rotation.set(
            (1 - assembled) * (index % 2 === 0 ? 0.48 : -0.38),
            (1 - assembled) * (index % 2 === 0 ? -0.72 : 0.82),
            (1 - assembled) * 0.32,
          );
          group.scale.setScalar(0.18 + assembled * 0.82);
          moduleMaterials[index].emissiveIntensity = 0.28 + focused * 1.5;
        });
        const completion = smooth((progress - 0.3) / 0.5);
        connectorMaterial.opacity = reducedTransparency ? 0 : completion * 0.42;
        backdropMaterial.opacity = reducedTransparency ? 0 : 0.3;
        core.rotation.set(progress * 0.42, progress * 1.15, -progress * 0.18);
        core.scale.setScalar(0.76 + completion * 0.24);
        coreMaterial.emissiveIntensity = 0.8 + completion * 1.1;
        root.position.set(wide ? 2.25 - progress * 0.48 : 0.22, -0.04, 0);
        root.rotation.set(-0.08, -0.34 + progress * 0.5, -0.03);
        root.scale.setScalar(wide ? 0.94 : 0.76);
        camera.position.set(0, 0, wide ? 7.8 : 9.5);
        camera.lookAt(wide ? 0.52 : 0, 0, 0);
      },
    };
  } catch (error) {
    resources.dispose();
    scene.clear();
    throw error;
  }
}

export function createReachScene(): FeatureSceneBundle {
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x130706, 0.058);
  const resources = new FeatureResources();
  try {
    const backdropMaterial = createBackdrop(scene, resources, 0xff9a72, 260);
    const root = new THREE.Group();
    scene.add(root);

    const sourceMaterial = resources.track(new THREE.MeshPhysicalMaterial({
      color: 0xff8e68,
      emissive: 0x762516,
      emissiveIntensity: 1.6,
      roughness: 0.25,
      metalness: 0.52,
      clearcoat: 0.48,
    }));
    const source = new THREE.Mesh(
      resources.track(new THREE.IcosahedronGeometry(0.56, 2)),
      sourceMaterial,
    );
    root.add(source);

    const hubDirections = [
      new THREE.Vector3(0.9, 0.48, 0.12).normalize(),
      new THREE.Vector3(-0.72, 0.74, -0.16).normalize(),
      new THREE.Vector3(0.16, -0.92, 0.34).normalize(),
    ];
    const hubGeometry = resources.track(new THREE.IcosahedronGeometry(0.16, 1));
    const hubMaterial = resources.track(new THREE.MeshStandardMaterial({
      color: 0xffd7c5,
      emissive: 0x7d3526,
      emissiveIntensity: 1.1,
      roughness: 0.4,
      metalness: 0.42,
    }));
    const hubs = hubDirections.map(() => {
      const hub = new THREE.Mesh(hubGeometry, hubMaterial);
      root.add(hub);
      return hub;
    });

    const nodeCount = 60;
    const nodeGeometry = resources.track(new THREE.SphereGeometry(0.055, 8, 6));
    const nodeMaterial = resources.track(new THREE.MeshStandardMaterial({
      color: 0xffb08d,
      emissive: 0x6d2116,
      emissiveIntensity: 1,
      roughness: 0.48,
      metalness: 0.3,
    }));
    const nodes = resources.track(new THREE.InstancedMesh(nodeGeometry, nodeMaterial, nodeCount));
    nodes.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    nodes.frustumCulled = false;
    root.add(nodes);

    const nodeOffsets = Array.from({ length: nodeCount }, (_, index) => new THREE.Vector3(
      (seededValue(index, 31) - 0.5) * 1.4,
      (seededValue(index, 32) - 0.5) * 1.4,
      (seededValue(index, 33) - 0.5) * 1.2,
    ));
    const linePositions = new Float32Array(nodeCount * 6);
    const lineGeometry = resources.track(new THREE.BufferGeometry());
    const lineAttribute = new THREE.BufferAttribute(linePositions, 3);
    lineAttribute.setUsage(THREE.DynamicDrawUsage);
    lineGeometry.setAttribute("position", lineAttribute);
    const lineMaterial = resources.track(new THREE.LineBasicMaterial({
      color: 0xff9c78,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    }));
    const connections = new THREE.LineSegments(lineGeometry, lineMaterial);
    connections.frustumCulled = false;
    root.add(connections);
    const transform = new THREE.Object3D();

    scene.add(new THREE.HemisphereLight(0xffc2a8, 0x120506, 1.65));
    const key = new THREE.DirectionalLight(0xffe1d2, 4.4);
    key.position.set(-4, 4, 5);
    scene.add(key);
    const coral = new THREE.PointLight(0xff6c48, 20, 14, 1.8);
    coral.position.set(3, -2, 3.5);
    scene.add(coral);

    return {
      scene,
      update(progress, width, height, camera, reducedTransparency) {
        const wide = width / Math.max(height, 1) > 1.15;
        const spread = smooth((progress - 0.02) / 0.4);
        const story = smooth((progress - 0.44) / 0.14);
        const hubRadius = 0.5 + spread * 0.72;
        hubs.forEach((hub, index) => {
          hub.position.copy(hubDirections[index]).multiplyScalar(hubRadius);
          hub.scale.setScalar(0.4 + spread * 0.6);
        });

        for (let index = 0; index < nodeCount; index += 1) {
          const hubIndex = index % 3;
          const hub = hubs[hubIndex];
          const arrival = smooth((progress - (0.1 + (index / nodeCount) * 0.06)) / 0.22);
          const offset = nodeOffsets[index];
          transform.position.set(
            hub.position.x + offset.x * spread * 1.45,
            hub.position.y + offset.y * spread * 1.3,
            hub.position.z + offset.z * spread * 1.15,
          );
          transform.rotation.set(0, progress * 0.8 + index * 0.07, 0);
          transform.scale.setScalar(0.05 + arrival * 0.95);
          transform.updateMatrix();
          nodes.setMatrixAt(index, transform.matrix);
          if (!reducedTransparency) {
            const lineIndex = index * 6;
            linePositions[lineIndex] = hub.position.x;
            linePositions[lineIndex + 1] = hub.position.y;
            linePositions[lineIndex + 2] = hub.position.z;
            linePositions[lineIndex + 3] = transform.position.x;
            linePositions[lineIndex + 4] = transform.position.y;
            linePositions[lineIndex + 5] = transform.position.z;
          }
        }
        nodes.instanceMatrix.needsUpdate = true;
        connections.visible = !reducedTransparency;
        if (!reducedTransparency) lineAttribute.needsUpdate = true;
        lineMaterial.opacity = reducedTransparency ? 0 : spread * (1 - story * 0.62) * 0.28;
        backdropMaterial.opacity = reducedTransparency ? 0 : 0.3;
        nodeMaterial.emissiveIntensity = 0.8 + spread * 0.8;
        source.rotation.set(progress * 0.38, progress * 1.05, -progress * 0.2);
        source.scale.setScalar(1.08 - spread * 0.2);
        root.position.set(
          wide ? THREE.MathUtils.lerp(2.18, -1.05, story) : THREE.MathUtils.lerp(0.42, 0, story),
          -0.02,
          0,
        );
        root.rotation.set(-0.08, -0.3 + progress * 0.28, 0.04 - progress * 0.08);
        root.scale.setScalar(wide ? 1 : 0.72);
        camera.position.set(0, 0, wide ? 7.8 + spread * 0.45 : 9.6);
        camera.lookAt(wide ? 0.35 : 0, 0, 0);
      },
    };
  } catch (error) {
    resources.dispose();
    scene.clear();
    throw error;
  }
}
