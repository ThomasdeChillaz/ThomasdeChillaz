import * as THREE from "three";
import {
  calculateEducationRelayStart,
  satelliteLocalHandoff,
} from "./satelliteMath.mjs";

type Disposable = { dispose: () => void };

export type SatelliteResourceTracker = {
  track: <T extends Disposable>(resource: T) => T;
};

export type Satellite = THREE.Group & {
  userData: {
    leftPanel: THREE.Group;
    rightPanel: THREE.Group;
    beacon: THREE.Mesh;
    scanMaterial: THREE.MeshBasicMaterial;
  };
};

const clamp = (value: number) => Math.min(1, Math.max(0, value));
const smooth = (value: number) => {
  const bounded = clamp(value);
  return bounded * bounded * (3 - 2 * bounded);
};

export function createSatellite(resources: SatelliteResourceTracker): Satellite {
  const satellite = new THREE.Group() as Satellite;
  const busMaterial = resources.track(new THREE.MeshPhysicalMaterial({
    color: 0xd8c3a0,
    emissive: 0x21160a,
    emissiveIntensity: 0.36,
    roughness: 0.28,
    metalness: 0.82,
    clearcoat: 0.42,
  }));
  const darkMetal = resources.track(new THREE.MeshStandardMaterial({
    color: 0x1a222a,
    roughness: 0.34,
    metalness: 0.88,
  }));
  const panelMaterial = resources.track(new THREE.MeshPhysicalMaterial({
    color: 0x102d52,
    emissive: 0x071b36,
    emissiveIntensity: 0.72,
    roughness: 0.22,
    metalness: 0.56,
    clearcoat: 0.64,
  }));
  const dishMaterial = resources.track(new THREE.MeshStandardMaterial({
    color: 0xe8edf1,
    roughness: 0.24,
    metalness: 0.74,
    side: THREE.DoubleSide,
  }));

  const busGeometry = resources.track(new THREE.BoxGeometry(0.58, 0.42, 0.44));
  satellite.add(new THREE.Mesh(busGeometry, busMaterial));

  const panelGeometry = resources.track(new THREE.BoxGeometry(0.78, 0.035, 0.34));
  const panelFrameGeometry = resources.track(new THREE.BoxGeometry(0.82, 0.045, 0.025));
  const hingeGeometry = resources.track(new THREE.CylinderGeometry(0.045, 0.045, 0.28, 12));
  const leftPanel = new THREE.Group();
  const rightPanel = new THREE.Group();
  leftPanel.name = "satellite-panel-left";
  rightPanel.name = "satellite-panel-right";
  leftPanel.position.x = -0.69;
  rightPanel.position.x = 0.69;
  leftPanel.add(new THREE.Mesh(panelGeometry, panelMaterial));
  rightPanel.add(new THREE.Mesh(panelGeometry, panelMaterial));

  for (const panel of [leftPanel, rightPanel]) {
    const upperFrame = new THREE.Mesh(panelFrameGeometry, busMaterial);
    const lowerFrame = new THREE.Mesh(panelFrameGeometry, busMaterial);
    upperFrame.position.z = 0.17;
    lowerFrame.position.z = -0.17;
    panel.add(upperFrame, lowerFrame);
  }
  const leftHinge = new THREE.Mesh(hingeGeometry, darkMetal);
  const rightHinge = new THREE.Mesh(hingeGeometry, darkMetal);
  leftHinge.rotation.z = Math.PI / 2;
  rightHinge.rotation.z = Math.PI / 2;
  leftHinge.position.x = 0.44;
  rightHinge.position.x = -0.44;
  leftPanel.add(leftHinge);
  rightPanel.add(rightHinge);
  satellite.add(leftPanel, rightPanel);

  const mast = new THREE.Mesh(
    resources.track(new THREE.CylinderGeometry(0.025, 0.025, 0.42, 10)),
    darkMetal,
  );
  mast.position.y = 0.38;
  satellite.add(mast);
  const dish = new THREE.Mesh(
    resources.track(new THREE.SphereGeometry(0.22, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.46)),
    dishMaterial,
  );
  dish.position.y = 0.58;
  dish.rotation.z = Math.PI;
  satellite.add(dish);
  const sensor = new THREE.Mesh(
    resources.track(new THREE.SphereGeometry(0.07, 14, 10)),
    resources.track(new THREE.MeshStandardMaterial({
      color: 0xffb15c,
      emissive: 0xff6a27,
      emissiveIntensity: 1.7,
      roughness: 0.3,
    })),
  );
  sensor.position.set(0.16, 0.16, 0.25);
  satellite.add(sensor);

  const scanMaterial = resources.track(new THREE.MeshBasicMaterial({
    color: 0x72dfff,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }));
  const scanCone = new THREE.Mesh(
    resources.track(new THREE.ConeGeometry(0.28, 1.15, 24, 1, true)),
    scanMaterial,
  );
  scanCone.position.y = -0.78;
  satellite.add(scanCone);

  satellite.userData = { leftPanel, rightPanel, beacon: sensor, scanMaterial };
  return satellite;
}

const satelliteOrbitPosition = new THREE.Vector3();
const satelliteHandoffPosition = new THREE.Vector3(...satelliteLocalHandoff.position);

export function updateSatellite(
  satellite: Satellite,
  progress: number,
  reducedTransparency = false,
) {
  const reveal = smooth((progress - 0.1) / 0.18);
  const orbitProgress = smooth((progress - 0.12) / 0.66);
  const angle = -1.1 + orbitProgress * 4.7;
  satelliteOrbitPosition.set(
    Math.cos(angle) * 3.2,
    0.22 + Math.sin(angle * 0.82) * 0.86,
    Math.sin(angle) * 1.65,
  );
  const handoff = smooth((progress - 0.76) / 0.24);
  satellite.position.lerpVectors(satelliteOrbitPosition, satelliteHandoffPosition, handoff);
  const scale = THREE.MathUtils.lerp(0.06, 0.38, reveal) * (1 - handoff)
    + satelliteLocalHandoff.scale * handoff;
  satellite.scale.setScalar(scale);
  satellite.rotation.set(
    THREE.MathUtils.lerp(0.14 + progress * 0.41, satelliteLocalHandoff.rotation[0], handoff),
    THREE.MathUtils.lerp(-angle + 0.8, satelliteLocalHandoff.rotation[1], handoff),
    THREE.MathUtils.lerp(0.08, satelliteLocalHandoff.rotation[2], handoff),
  );
  satellite.userData.leftPanel.rotation.y = THREE.MathUtils.lerp(
    0.08 + reveal * 0.14,
    satelliteLocalHandoff.leftPanelRotation,
    handoff,
  );
  satellite.userData.rightPanel.rotation.y = THREE.MathUtils.lerp(
    -0.08 - reveal * 0.14,
    satelliteLocalHandoff.rightPanelRotation,
    handoff,
  );
  const scanIn = smooth((progress - 0.46) / 0.09);
  const scanOut = 1 - smooth((progress - 0.76) / 0.1);
  satellite.userData.scanMaterial.opacity = reducedTransparency ? 0 : scanIn * scanOut * 0.17;
  satellite.userData.beacon.scale.setScalar(THREE.MathUtils.lerp(
    0.82 + reveal * 0.38,
    satelliteLocalHandoff.beaconScale,
    handoff,
  ));
}

export function updateEducationRelay(satellite: Satellite, progress: number, wide: boolean) {
  const settle = smooth(progress / 0.22);
  const start = calculateEducationRelayStart(wide);
  satellite.position.set(
    THREE.MathUtils.lerp(start.position[0], wide ? 2.05 : 0.38, settle),
    THREE.MathUtils.lerp(start.position[1], 0.08, settle),
    THREE.MathUtils.lerp(start.position[2], 0, settle),
  );
  const disappear = smooth((progress - 0.16) / 0.16);
  satellite.scale.setScalar(THREE.MathUtils.lerp(start.scale, 0.12, settle) * (1 - disappear * 0.82));
  satellite.rotation.set(
    THREE.MathUtils.lerp(start.rotation[0], 0.04, settle),
    THREE.MathUtils.lerp(start.rotation[1], 0.3, settle),
    THREE.MathUtils.lerp(start.rotation[2], 0, settle),
  );
  satellite.userData.leftPanel.rotation.y = THREE.MathUtils.lerp(start.leftPanelRotation, 0.05, settle);
  satellite.userData.rightPanel.rotation.y = THREE.MathUtils.lerp(start.rightPanelRotation, -0.05, settle);
  satellite.userData.scanMaterial.opacity = 0;
  satellite.userData.beacon.scale.setScalar(THREE.MathUtils.lerp(start.beaconScale, 1.85, settle));
}
