import * as THREE from 'three';

export interface CarVisualConfig {
  bodyColor: string;
  underglowColor: string;
  rimColor: string;
  bodyStyle?: 'coupe' | 'muscle' | 'supercar' | 'hypercar' | 'cyber';
  spoilerLevel?: number; // 1-5
  isPlayer?: boolean;
}

export interface BuiltCar {
  group: THREE.Group;
  wheels: THREE.Mesh[];
  exhaustPipes: THREE.Vector3[];
  underglowLight: THREE.PointLight;
  headlights: THREE.SpotLight[];
  taillights: THREE.Mesh[];
  materials: {
    body: THREE.MeshStandardMaterial;
    underglow: THREE.MeshBasicMaterial;
    glass: THREE.MeshPhysicalMaterial;
    lights: THREE.MeshBasicMaterial;
  };
}

export function create3DCar(config: CarVisualConfig): BuiltCar {
  const group = new THREE.Group();
  const wheels: THREE.Mesh[] = [];
  const taillights: THREE.Mesh[] = [];
  const headlights: THREE.SpotLight[] = [];
  const exhaustPipes: THREE.Vector3[] = [];

  const bodyMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(config.bodyColor),
    metalness: 0.85,
    roughness: 0.25,
  });

  const secondaryMat = new THREE.MeshStandardMaterial({
    color: 0x111318,
    metalness: 0.9,
    roughness: 0.3,
  });

  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x111625,
    metalness: 0.1,
    roughness: 0.1,
    transmission: 0.6,
    transparent: true,
    opacity: 0.85,
  });

  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x1a1a1e,
    roughness: 0.8,
  });

  const rimMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(config.rimColor || '#e0e0e0'),
    metalness: 0.95,
    roughness: 0.15,
  });

  const neonUnderglowMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(config.underglowColor),
    transparent: true,
    opacity: 0.8,
  });

  const headlightMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
  });

  const taillightMat = new THREE.MeshBasicMaterial({
    color: 0xff1744,
  });

  // Base Car Dimensions
  const carWidth = 1.9;
  const carHeight = 0.95;
  const carLength = 4.3;

  // 1. MAIN CHASSIS / LOWER BODY
  const lowerBodyGeo = new THREE.BoxGeometry(carWidth, carHeight * 0.45, carLength);
  const lowerBody = new THREE.Mesh(lowerBodyGeo, bodyMat);
  lowerBody.position.y = 0.45;
  lowerBody.castShadow = true;
  lowerBody.receiveShadow = true;
  group.add(lowerBody);

  // 2. CABIN / ROOF
  const cabinWidth = carWidth * 0.82;
  const cabinHeight = carHeight * 0.55;
  const cabinLength = carLength * 0.52;
  const cabinGeo = new THREE.BoxGeometry(cabinWidth, cabinHeight, cabinLength);
  const cabin = new THREE.Mesh(cabinGeo, bodyMat);
  cabin.position.set(0, 0.45 + carHeight * 0.45, -0.2);
  cabin.castShadow = true;
  group.add(cabin);

  // 3. WINDSHIELD (Sloped front glass)
  const windshieldGeo = new THREE.PlaneGeometry(cabinWidth * 0.95, 0.65);
  const windshield = new THREE.Mesh(windshieldGeo, glassMat);
  windshield.position.set(0, 0.72, 0.95);
  windshield.rotation.x = -Math.PI / 3.2;
  group.add(windshield);

  // 4. REAR WINDOW
  const rearWindow = new THREE.Mesh(windshieldGeo, glassMat);
  rearWindow.position.set(0, 0.72, -1.35);
  rearWindow.rotation.x = Math.PI / 3.4;
  rearWindow.rotation.y = Math.PI;
  group.add(rearWindow);

  // 5. SIDE WINDOWS
  const sideWindowGeo = new THREE.PlaneGeometry(cabinLength * 0.85, 0.35);
  const leftWindow = new THREE.Mesh(sideWindowGeo, glassMat);
  leftWindow.position.set(cabinWidth * 0.51, 0.72, -0.2);
  leftWindow.rotation.y = Math.PI / 2;
  group.add(leftWindow);

  const rightWindow = new THREE.Mesh(sideWindowGeo, glassMat);
  rightWindow.position.set(-cabinWidth * 0.51, 0.72, -0.2);
  rightWindow.rotation.y = -Math.PI / 2;
  group.add(rightWindow);

  // 6. FRONT HOOD & SPLITTER
  const splitterGeo = new THREE.BoxGeometry(carWidth * 1.05, 0.08, 0.6);
  const splitter = new THREE.Mesh(splitterGeo, secondaryMat);
  splitter.position.set(0, 0.22, 2.05);
  group.add(splitter);

  // 7. REAR DIFFUSER & SPOILER
  const diffuserGeo = new THREE.BoxGeometry(carWidth * 0.95, 0.15, 0.4);
  const diffuser = new THREE.Mesh(diffuserGeo, secondaryMat);
  diffuser.position.set(0, 0.25, -2.1);
  group.add(diffuser);

  // Spoiler Wings
  const spoilerWingGeo = new THREE.BoxGeometry(carWidth * 0.95, 0.06, 0.4);
  const spoilerWing = new THREE.Mesh(spoilerWingGeo, secondaryMat);
  spoilerWing.position.set(0, 1.05, -1.95);
  spoilerWing.castShadow = true;
  group.add(spoilerWing);

  // Spoiler Stands
  const standGeo = new THREE.BoxGeometry(0.06, 0.35, 0.1);
  const standLeft = new THREE.Mesh(standGeo, secondaryMat);
  standLeft.position.set(0.55, 0.88, -1.95);
  group.add(standLeft);

  const standRight = new THREE.Mesh(standGeo, secondaryMat);
  standRight.position.set(-0.55, 0.88, -1.95);
  group.add(standRight);

  // 8. HEADLIGHTS
  const headlightGeo = new THREE.BoxGeometry(0.35, 0.1, 0.05);
  const hlLeft = new THREE.Mesh(headlightGeo, headlightMat);
  hlLeft.position.set(0.65, 0.48, 2.14);
  group.add(hlLeft);

  const hlRight = new THREE.Mesh(headlightGeo, headlightMat);
  hlRight.position.set(-0.65, 0.48, 2.14);
  group.add(hlRight);

  // 9. TAILLIGHT LED STRIP
  const tlGeo = new THREE.BoxGeometry(carWidth * 0.88, 0.08, 0.05);
  const tlMesh = new THREE.Mesh(tlGeo, taillightMat);
  tlMesh.position.set(0, 0.52, -2.14);
  group.add(tlMesh);
  taillights.push(tlMesh);

  // 10. 4 WHEELS (with Rims & Brake Calipers)
  const wheelRadius = 0.36;
  const wheelThickness = 0.28;
  const wheelPositions = [
    { x: carWidth * 0.5 + 0.02, y: wheelRadius, z: 1.35, isRight: false },
    { x: -carWidth * 0.5 - 0.02, y: wheelRadius, z: 1.35, isRight: true },
    { x: carWidth * 0.5 + 0.02, y: wheelRadius, z: -1.35, isRight: false },
    { x: -carWidth * 0.5 - 0.02, y: wheelRadius, z: -1.35, isRight: true },
  ];

  wheelPositions.forEach((pos) => {
    const wheelGroup = new THREE.Group();
    wheelGroup.position.set(pos.x, pos.y, pos.z);

    // Tire
    const tireGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelThickness, 20);
    const tire = new THREE.Mesh(tireGeo, tireMat);
    tire.rotation.z = Math.PI / 2;
    tire.castShadow = true;
    wheelGroup.add(tire);

    // Rim Disc
    const rimGeo = new THREE.CylinderGeometry(wheelRadius * 0.72, wheelRadius * 0.72, wheelThickness * 1.02, 16);
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.rotation.z = Math.PI / 2;
    wheelGroup.add(rim);

    // Rim Spokes (Star style)
    for (let i = 0; i < 5; i++) {
      const spokeGeo = new THREE.BoxGeometry(wheelThickness * 1.05, wheelRadius * 0.65, 0.04);
      const spoke = new THREE.Mesh(spokeGeo, secondaryMat);
      spoke.rotation.x = (i * Math.PI) / 2.5;
      wheelGroup.add(spoke);
    }

    group.add(wheelGroup);
    wheels.push(tire);
  });

  // 11. EXHAUST PIPES
  const exhaustGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.2, 12);
  const exLeft = new THREE.Mesh(exhaustGeo, secondaryMat);
  exLeft.rotation.x = Math.PI / 2;
  exLeft.position.set(0.4, 0.24, -2.15);
  group.add(exLeft);
  exhaustPipes.push(new THREE.Vector3(0.4, 0.24, -2.25));

  const exRight = new THREE.Mesh(exhaustGeo, secondaryMat);
  exRight.rotation.x = Math.PI / 2;
  exRight.position.set(-0.4, 0.24, -2.15);
  group.add(exRight);
  exhaustPipes.push(new THREE.Vector3(-0.4, 0.24, -2.25));

  // 12. NEON UNDERGLOW PLATE & LIGHT
  const underglowPlaneGeo = new THREE.PlaneGeometry(carWidth * 0.9, carLength * 0.85);
  const underglowMesh = new THREE.Mesh(underglowPlaneGeo, neonUnderglowMat);
  underglowMesh.rotation.x = Math.PI / 2;
  underglowMesh.position.set(0, 0.05, 0);
  group.add(underglowMesh);

  const underglowLight = new THREE.PointLight(new THREE.Color(config.underglowColor), 2.5, 6, 1.5);
  underglowLight.position.set(0, 0.15, 0);
  group.add(underglowLight);

  return {
    group,
    wheels,
    exhaustPipes,
    underglowLight,
    headlights,
    taillights,
    materials: {
      body: bodyMat,
      underglow: neonUnderglowMat,
      glass: glassMat,
      lights: headlightMat,
    },
  };
}
