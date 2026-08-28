import * as THREE from 'three';
import { TrackConfig, CarConfig, CarUpgradeLevels, OpponentConfig, RaceResultData, GameMode } from '../types/game';
import { CARS_DATA, OPPONENT_NAMES } from '../data/gameData';
import { create3DCar, BuiltCar } from './carModelBuilder';
import { audioEngine } from '../services/audioEngine';

export interface CarPhysicsState {
  id: string;
  name: string;
  isPlayer: boolean;
  carConfig: CarConfig;
  builtCar: BuiltCar;
  position: THREE.Vector3;
  rotation: THREE.Euler;
  speed: number; // km/h
  maxSpeed: number;
  accelerationPower: number;
  handlingPower: number;
  brakingPower: number;
  trackDistance: number; // 0 to trackLength
  currentLap: number;
  targetLap: number;
  lapTimes: number[];
  currentLapStartTime: number;
  raceRank: number;
  isDrifting: boolean;
  driftAngle: number;
  lateralVelocity: number;
  nitroRemaining: number; // 0 - 100
  isNitroActive: boolean;
  finished: boolean;
  finishTimeMs: number;
  // AI specific
  targetLaneOffset: number;
  currentLaneOffset: number;
  skillMultiplier: number;
}

export interface TrackPoint {
  position: THREE.Vector3;
  tangent: THREE.Vector3;
  normal: THREE.Vector3;
  binormal: THREE.Vector3;
  distance: number;
}

export class RacingEngine {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  private container: HTMLElement;

  // Track & Environment
  public trackConfig: TrackConfig;
  public trackCurve!: THREE.CatmullRomCurve3;
  public trackPoints: TrackPoint[] = [];
  public trackTotalLength = 0;
  private trackMesh!: THREE.Mesh;
  private environmentObjects: THREE.Object3D[] = [];
  private particleSystems: {
    nitroFlames: THREE.Points[];
    tireSmoke: THREE.Points;
    speedLines: THREE.LineSegments;
    sparks: THREE.Points;
  } | null = null;

  // Racers
  public playerCarState!: CarPhysicsState;
  public opponentCarStates: CarPhysicsState[] = [];
  public allRacers: CarPhysicsState[] = [];

  // Game Loop & State
  public isRunning = false;
  public isPaused = false;
  public countdown = 3; // 3, 2, 1, 0 (GO)
  public raceState: 'countdown' | 'racing' | 'finished' = 'countdown';
  public raceStartTime = 0;
  public elapsedTimeMs = 0;
  public mode: GameMode = 'quick';
  public careerRaceId?: string;
  public graphicsQuality: 'low' | 'medium' | 'high' = 'medium';

  // Player Input Controls
  public controls = {
    accelerate: false,
    brake: false,
    steerLeft: false,
    steerRight: false,
    nitro: false,
  };

  // Telemetry Callbacks for React HUD
  public onTelemetryUpdate?: (state: {
    speedKmh: number;
    rpm: number;
    nitroPercent: number;
    lap: number;
    totalLaps: number;
    position: number;
    totalRacers: number;
    lapTimeMs: number;
    bestLapMs: number;
    raceTimeMs: number;
    isDrifting: boolean;
    isNitroActive: boolean;
    opponents: { name: string; position: number; distance: number; lap: number }[];
  }) => void;

  public onRaceFinish?: (result: RaceResultData) => void;

  // Internal Clock
  private clock = new THREE.Clock();
  private animFrameId: number | null = null;
  private nitroUsedDuration = 0;
  private driftDuration = 0;
  private maxSpeedReached = 0;

  constructor(
    container: HTMLElement,
    track: TrackConfig,
    playerCar: CarConfig,
    playerUpgrades: CarUpgradeLevels,
    playerColor: string,
    playerUnderglow: string,
    playerRimColor: string,
    mode: GameMode = 'quick',
    opponentsCount = 4,
    careerRaceId?: string,
    graphicsQuality: 'low' | 'medium' | 'high' = 'medium'
  ) {
    this.container = container;
    this.trackConfig = track;
    this.mode = mode;
    this.careerRaceId = careerRaceId;
    this.graphicsQuality = graphicsQuality;

    // 1. Three.js Scene Setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(track.skyColor);
    this.scene.fog = new THREE.FogExp2(track.skyColor, track.fogDensity);

    // 2. Camera Setup (Safe dimension fallback for mobile viewport mounts)
    const width = Math.max(container.clientWidth || 0, window.innerWidth || 800);
    const height = Math.max(container.clientHeight || 0, window.innerHeight || 600);
    const aspect = width / height;
    this.camera = new THREE.PerspectiveCamera(65, aspect, 0.1, 1200);
    this.camera.position.set(0, 5, -8);

    // 3. WebGL Renderer (Optimized for Android / Redmi A3 hardware)
    this.renderer = new THREE.WebGLRenderer({
      antialias: graphicsQuality !== 'low',
      alpha: false,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(width, height);

    // Dynamic resolution scaling for smooth FPS
    const maxRatio = graphicsQuality === 'low' ? 1.0 : (graphicsQuality === 'medium' ? 1.25 : 1.75);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxRatio));

    if (graphicsQuality === 'low') {
      this.renderer.shadowMap.enabled = false;
    } else if (graphicsQuality === 'medium') {
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.BasicShadowMap;
    } else {
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    container.appendChild(this.renderer.domElement);

    // 4. Lights Setup
    this.setupLighting();

    // 5. Build Track Geometry & Environment
    this.buildTrack();
    this.buildEnvironment();

    // 6. Build Racers
    this.setupRacers(playerCar, playerUpgrades, playerColor, playerUnderglow, playerRimColor, opponentsCount);

    // 7. Setup Particle Systems
    this.setupParticles();

    // 8. Handle Window Resize
    this.onResize = this.onResize.bind(this);
    window.addEventListener('resize', this.onResize);
  }

  private setupLighting() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(100, 150, 50);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 10;
    dirLight.shadow.camera.far = 400;
    const d = 120;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    this.scene.add(dirLight);

    // Theme Accent Light
    const accentLight = new THREE.PointLight(new THREE.Color(this.trackConfig.accentColor), 2.5, 300);
    accentLight.position.set(0, 40, 0);
    this.scene.add(accentLight);
  }

  private buildTrack() {
    // Generate distinct curved circuit points based on track theme
    const baseRadius = 240;
    const points: THREE.Vector3[] = [];
    const numPoints = 28;

    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      let r = baseRadius;
      let elevation = 0;

      // Theme-specific track topology
      if (this.trackConfig.theme === 'neon_city') {
        // High speed city grid with sweeping chicanes
        r += Math.sin(angle * 3) * 60 + Math.cos(angle * 5) * 35;
        elevation = Math.sin(angle * 2) * 8;
      } else if (this.trackConfig.theme === 'desert_storm') {
        // Canyon straights and wide hairpin turns
        r += Math.sin(angle * 2) * 80 + Math.cos(angle * 4) * 45;
        elevation = Math.sin(angle * 3) * 15;
      } else if (this.trackConfig.theme === 'mountain_rush') {
        // Alpine serpentine switchbacks and steep hills
        r += Math.sin(angle * 4) * 75 + Math.cos(angle * 6) * 40;
        elevation = Math.sin(angle * 2) * 28 + Math.cos(angle * 4) * 12;
      } else if (this.trackConfig.theme === 'coastal_drive') {
        // Long flowing ocean seaside curves
        r += Math.sin(angle * 2) * 70 + Math.sin(angle * 3) * 40;
        elevation = Math.sin(angle) * 10;
      } else {
        // Cyber Circuit: Complex high-tech figure 8-like curves
        r += Math.sin(angle * 3) * 85 + Math.cos(angle * 2) * 50;
        elevation = Math.sin(angle * 4) * 20;
      }

      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      points.push(new THREE.Vector3(x, elevation, z));
    }

    this.trackCurve = new THREE.CatmullRomCurve3(points, true, 'centripetal', 0.5);
    this.trackTotalLength = this.trackCurve.getLength();

    // Sample discrete track points with normals for accurate car positioning
    const sampleCount = 600;
    this.trackPoints = [];
    for (let i = 0; i <= sampleCount; i++) {
      const u = i / sampleCount;
      const pos = this.trackCurve.getPointAt(u);
      const tangent = this.trackCurve.getTangentAt(u).normalize();
      const up = new THREE.Vector3(0, 1, 0);
      const binormal = new THREE.Vector3().crossVectors(tangent, up).normalize();
      const normal = new THREE.Vector3().crossVectors(binormal, tangent).normalize();

      this.trackPoints.push({
        position: pos,
        tangent,
        normal,
        binormal,
        distance: u * this.trackTotalLength,
      });
    }

    // 3D Road Mesh (Extrusion / Tube with Flat Top)
    const roadWidth = 18;
    const roadSegments = 500;
    const roadGeo = new THREE.BufferGeometry();
    const positions: number[] = [];
    const uvs: number[] = [];
    const normals: number[] = [];
    const indices: number[] = [];

    for (let i = 0; i <= roadSegments; i++) {
      const u = i / roadSegments;
      const pt = this.trackCurve.getPointAt(u);
      const tangent = this.trackCurve.getTangentAt(u).normalize();
      const binormal = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize();

      // Left edge, Center, Right edge
      const left = pt.clone().addScaledVector(binormal, -roadWidth / 2);
      const right = pt.clone().addScaledVector(binormal, roadWidth / 2);

      positions.push(left.x, left.y, left.z);
      positions.push(right.x, right.y, right.z);

      normals.push(0, 1, 0, 0, 1, 0);
      uvs.push(0, u * 80, 1, u * 80);

      if (i < roadSegments) {
        const row1 = i * 2;
        const row2 = (i + 1) * 2;
        indices.push(row1, row1 + 1, row2);
        indices.push(row1 + 1, row2 + 1, row2);
      }
    }

    roadGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    roadGeo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    roadGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    roadGeo.setIndex(indices);

    // Procedural Road Canvas Texture
    const roadCanvas = document.createElement('canvas');
    roadCanvas.width = 512;
    roadCanvas.height = 512;
    const ctx = roadCanvas.getContext('2d')!;
    ctx.fillStyle = this.trackConfig.roadColor;
    ctx.fillRect(0, 0, 512, 512);

    // Kerbs / borders
    ctx.fillStyle = this.trackConfig.kerbColor1;
    ctx.fillRect(0, 0, 32, 512);
    ctx.fillRect(480, 0, 32, 512);

    ctx.fillStyle = this.trackConfig.kerbColor2;
    for (let y = 0; y < 512; y += 64) {
      ctx.fillRect(0, y, 32, 32);
      ctx.fillRect(480, y, 32, 32);
    }

    // Center dashed line
    ctx.fillStyle = '#ffffff';
    for (let y = 0; y < 512; y += 80) {
      ctx.fillRect(252, y, 8, 44);
    }

    const roadTexture = new THREE.CanvasTexture(roadCanvas);
    roadTexture.wrapS = THREE.RepeatWrapping;
    roadTexture.wrapT = THREE.RepeatWrapping;
    roadTexture.repeat.set(1, 40);

    const roadMat = new THREE.MeshStandardMaterial({
      map: roadTexture,
      roughness: 0.8,
      metalness: 0.1,
    });

    this.trackMesh = new THREE.Mesh(roadGeo, roadMat);
    this.trackMesh.receiveShadow = true;
    this.scene.add(this.trackMesh);

    // Start / Finish Gantry
    this.buildStartGantry();
  }

  private buildStartGantry() {
    const startPt = this.trackCurve.getPointAt(0);
    const tangent = this.trackCurve.getTangentAt(0).normalize();
    const binormal = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize();

    const gantryGroup = new THREE.Group();
    gantryGroup.position.copy(startPt);

    const postMat = new THREE.MeshStandardMaterial({ color: 0x1a1a24, metalness: 0.8, roughness: 0.2 });
    const signMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(this.trackConfig.accentColor) });

    // Left & Right posts
    const postGeo = new THREE.CylinderGeometry(0.5, 0.5, 12, 16);
    const leftPost = new THREE.Mesh(postGeo, postMat);
    leftPost.position.copy(binormal.clone().multiplyScalar(-11)).setY(6);
    gantryGroup.add(leftPost);

    const rightPost = new THREE.Mesh(postGeo, postMat);
    rightPost.position.copy(binormal.clone().multiplyScalar(11)).setY(6);
    gantryGroup.add(rightPost);

    // Overhead truss
    const trussGeo = new THREE.BoxGeometry(24, 2, 2);
    const truss = new THREE.Mesh(trussGeo, signMat);
    truss.position.set(0, 11, 0);
    truss.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), binormal);
    gantryGroup.add(truss);

    // Checkered Finish Line decal on road
    const lineGeo = new THREE.PlaneGeometry(18, 3);
    const lineMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9,
    });
    const lineMesh = new THREE.Mesh(lineGeo, lineMat);
    lineMesh.rotation.x = -Math.PI / 2;
    lineMesh.position.set(0, 0.05, 0);
    lineMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 1, 0));
    gantryGroup.add(lineMesh);

    this.scene.add(gantryGroup);
  }

  private buildEnvironment() {
    // Ground Plane
    const groundGeo = new THREE.PlaneGeometry(1600, 1600);
    const groundMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(this.trackConfig.groundColor),
      roughness: 0.95,
      metalness: 0.05,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Theme Specific Environment Props (City skyscrapers / Desert mesas / Alpine trees / Coastal Palms / Cyber pylons)
    const count = 120;
    for (let i = 0; i < count; i++) {
      const u = i / count;
      const pt = this.trackCurve.getPointAt(u);
      const tangent = this.trackCurve.getTangentAt(u).normalize();
      const binormal = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize();

      const side = (i % 2 === 0 ? 1 : -1);
      const distance = 25 + Math.random() * 80;
      const propPos = pt.clone().addScaledVector(binormal, side * distance);
      propPos.y = pt.y;

      if (this.trackConfig.theme === 'neon_city') {
        // Neon Skyscraper
        const height = 40 + Math.random() * 100;
        const width = 18 + Math.random() * 25;
        const bldgGeo = new THREE.BoxGeometry(width, height, width);
        const bldgMat = new THREE.MeshStandardMaterial({
          color: 0x080c18,
          metalness: 0.8,
          roughness: 0.2,
        });
        const bldg = new THREE.Mesh(bldgGeo, bldgMat);
        bldg.position.set(propPos.x, propPos.y + height / 2, propPos.z);
        bldg.castShadow = true;
        this.scene.add(bldg);
        this.environmentObjects.push(bldg);

        // Neon Glow Window Band
        if (Math.random() > 0.3) {
          const bandGeo = new THREE.BoxGeometry(width + 0.5, 2, width + 0.5);
          const neonColor = Math.random() > 0.5 ? 0x00f0ff : 0xff0055;
          const bandMat = new THREE.MeshBasicMaterial({ color: neonColor });
          const band = new THREE.Mesh(bandGeo, bandMat);
          band.position.set(propPos.x, propPos.y + height * (0.3 + Math.random() * 0.5), propPos.z);
          this.scene.add(band);
          this.environmentObjects.push(band);
        }
      } else if (this.trackConfig.theme === 'desert_storm') {
        // Canyon Rock Mesa
        const rockHeight = 25 + Math.random() * 45;
        const rockGeo = new THREE.CylinderGeometry(15, 25, rockHeight, 7);
        const rockMat = new THREE.MeshStandardMaterial({
          color: 0x8d4e28,
          roughness: 0.9,
        });
        const rock = new THREE.Mesh(rockGeo, rockMat);
        rock.position.set(propPos.x, propPos.y + rockHeight / 2, propPos.z);
        rock.rotation.y = Math.random() * Math.PI;
        rock.castShadow = true;
        this.scene.add(rock);
        this.environmentObjects.push(rock);
      } else if (this.trackConfig.theme === 'mountain_rush') {
        // Alpine Pine Tree
        const trunkGeo = new THREE.CylinderGeometry(0.6, 1.2, 8, 8);
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3d2817 });
        const treeGroup = new THREE.Group();
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.y = 4;
        treeGroup.add(trunk);

        const leavesMat = new THREE.MeshStandardMaterial({ color: 0x0d381e, roughness: 0.8 });
        for (let l = 0; l < 3; l++) {
          const coneGeo = new THREE.ConeGeometry(6 - l * 1.4, 7, 8);
          const cone = new THREE.Mesh(coneGeo, leavesMat);
          cone.position.y = 7 + l * 4;
          treeGroup.add(cone);
        }
        treeGroup.position.copy(propPos);
        this.scene.add(treeGroup);
        this.environmentObjects.push(treeGroup);
      } else if (this.trackConfig.theme === 'coastal_drive') {
        // Palm Tree
        const palmGroup = new THREE.Group();
        const trunkGeo = new THREE.CylinderGeometry(0.5, 0.9, 14, 8);
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6e4e37 });
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.y = 7;
        trunk.rotation.z = (Math.random() - 0.5) * 0.2;
        palmGroup.add(trunk);

        const leafMat = new THREE.MeshStandardMaterial({ color: 0x00e676, roughness: 0.6 });
        for (let lf = 0; lf < 6; lf++) {
          const leafGeo = new THREE.BoxGeometry(7, 0.2, 1.5);
          const leaf = new THREE.Mesh(leafGeo, leafMat);
          leaf.position.set(0, 14, 0);
          leaf.rotation.y = (lf * Math.PI) / 3;
          leaf.rotation.z = 0.3;
          palmGroup.add(leaf);
        }
        palmGroup.position.copy(propPos);
        this.scene.add(palmGroup);
        this.environmentObjects.push(palmGroup);
      } else {
        // Cyber Circuit: Holographic floating rings & pylons
        const pylonGeo = new THREE.TorusGeometry(8, 0.8, 12, 24);
        const pylonMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(this.trackConfig.accentColor) });
        const pylon = new THREE.Mesh(pylonGeo, pylonMat);
        pylon.position.set(propPos.x, propPos.y + 12, propPos.z);
        pylon.rotation.x = Math.PI / 2;
        this.scene.add(pylon);
        this.environmentObjects.push(pylon);
      }
    }
  }

  private setupRacers(
    playerCar: CarConfig,
    playerUpgrades: CarUpgradeLevels,
    playerColor: string,
    playerUnderglow: string,
    playerRimColor: string,
    opponentsCount: number
  ) {
    this.allRacers = [];
    this.opponentCarStates = [];

    // Calculate upgraded player stats
    const speedBoost = (playerUpgrades.engine - 1) * 7 + (playerUpgrades.turbo - 1) * 6;
    const accelBoost = (playerUpgrades.turbo - 1) * 8 + (playerUpgrades.engine - 1) * 4;
    const handlingBoost = (playerUpgrades.handling - 1) * 6 + (playerUpgrades.tires - 1) * 5;
    const brakingBoost = (playerUpgrades.brakes - 1) * 8 + (playerUpgrades.tires - 1) * 4;

    const playerMaxSpeed = 220 + (playerCar.stats.speed * 0.9) + speedBoost;
    const playerAccel = 40 + (playerCar.stats.acceleration * 0.7) + accelBoost;
    const playerHandling = 45 + (playerCar.stats.handling * 0.6) + handlingBoost;
    const playerBraking = 60 + (playerCar.stats.braking * 0.6) + brakingBoost;

    // 1. Build Player Car
    const playerBuiltCar = create3DCar({
      bodyColor: playerColor,
      underglowColor: playerUnderglow,
      rimColor: playerRimColor,
      bodyStyle: playerCar.bodyStyle,
      spoilerLevel: playerUpgrades.turbo,
      isPlayer: true,
    });
    this.scene.add(playerBuiltCar.group);

    this.playerCarState = {
      id: 'player',
      name: 'Player',
      isPlayer: true,
      carConfig: playerCar,
      builtCar: playerBuiltCar,
      position: new THREE.Vector3(),
      rotation: new THREE.Euler(),
      speed: 0,
      maxSpeed: playerMaxSpeed,
      accelerationPower: playerAccel,
      handlingPower: playerHandling,
      brakingPower: playerBraking,
      trackDistance: 0,
      currentLap: 1,
      targetLap: this.trackConfig.laps,
      lapTimes: [],
      currentLapStartTime: 0,
      raceRank: opponentsCount + 1,
      isDrifting: false,
      driftAngle: 0,
      lateralVelocity: 0,
      nitroRemaining: 100,
      isNitroActive: false,
      finished: false,
      finishTimeMs: 0,
      targetLaneOffset: 0,
      currentLaneOffset: 0,
      skillMultiplier: 1.0,
    };

    this.allRacers.push(this.playerCarState);

    // 2. Build AI Opponents
    const opponentCarsPool = CARS_DATA.slice(0, 5);
    for (let i = 0; i < opponentsCount; i++) {
      const oppCarConfig = opponentCarsPool[i % opponentCarsPool.length];
      const oppColor = oppCarConfig.availableColors[(i + 1) % oppCarConfig.availableColors.length];
      const oppUnderglow = oppCarConfig.accentColor;
      const oppName = OPPONENT_NAMES[i % OPPONENT_NAMES.length];

      const oppBuiltCar = create3DCar({
        bodyColor: oppColor,
        underglowColor: oppUnderglow,
        rimColor: '#1a1a1a',
        bodyStyle: oppCarConfig.bodyStyle,
        isPlayer: false,
      });
      this.scene.add(oppBuiltCar.group);

      const skill = 0.85 + (i * 0.05);
      const oppState: CarPhysicsState = {
        id: `ai_${i}`,
        name: oppName,
        isPlayer: false,
        carConfig: oppCarConfig,
        builtCar: oppBuiltCar,
        position: new THREE.Vector3(),
        rotation: new THREE.Euler(),
        speed: 0,
        maxSpeed: playerMaxSpeed * (0.92 + Math.random() * 0.12),
        accelerationPower: playerAccel * 0.9,
        handlingPower: playerHandling * 0.95,
        brakingPower: playerBraking * 0.9,
        trackDistance: (i + 1) * 14, // Grid positions ahead/behind
        currentLap: 1,
        targetLap: this.trackConfig.laps,
        lapTimes: [],
        currentLapStartTime: 0,
        raceRank: i + 1,
        isDrifting: false,
        driftAngle: 0,
        lateralVelocity: 0,
        nitroRemaining: 80,
        isNitroActive: false,
        finished: false,
        finishTimeMs: 0,
        targetLaneOffset: (i % 2 === 0 ? 3.5 : -3.5),
        currentLaneOffset: (i % 2 === 0 ? 3.5 : -3.5),
        skillMultiplier: skill,
      };

      this.opponentCarStates.push(oppState);
      this.allRacers.push(oppState);
    }

    // Set initial physical positions on starting grid
    this.allRacers.forEach((racer, index) => {
      const startDist = (this.allRacers.length - 1 - index) * 12;
      racer.trackDistance = startDist;
      this.updateRacerMesh(racer);
    });

    // Position camera behind player
    this.updateCamera(0.016);
  }

  private setupParticles() {
    // 1. Nitro Flame Particles (attached to player exhaust)
    const flameCount = 40;
    const flameGeo = new THREE.BufferGeometry();
    const flamePositions = new Float32Array(flameCount * 3);
    const flameColors = new Float32Array(flameCount * 3);

    for (let i = 0; i < flameCount; i++) {
      flamePositions[i * 3] = (Math.random() - 0.5) * 0.4;
      flamePositions[i * 3 + 1] = (Math.random() - 0.5) * 0.4;
      flamePositions[i * 3 + 2] = -Math.random() * 2.5;

      flameColors[i * 3] = 0.0;
      flameColors[i * 3 + 1] = 0.9;
      flameColors[i * 3 + 2] = 1.0;
    }

    flameGeo.setAttribute('position', new THREE.BufferAttribute(flamePositions, 3));
    flameGeo.setAttribute('color', new THREE.BufferAttribute(flameColors, 3));

    const flameMat = new THREE.PointsMaterial({
      size: 0.35,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
    });

    const flames1 = new THREE.Points(flameGeo, flameMat);
    const flames2 = flames1.clone();
    flames1.visible = false;
    flames2.visible = false;
    this.scene.add(flames1);
    this.scene.add(flames2);

    // 2. Speed Lines when at top speed / nitro
    const lineCount = 60;
    const speedLineGeo = new THREE.BufferGeometry();
    const linePositions = new Float32Array(lineCount * 6);
    for (let i = 0; i < lineCount; i++) {
      const x = (Math.random() - 0.5) * 20;
      const y = Math.random() * 8 - 1;
      const z = -Math.random() * 30;
      linePositions[i * 6] = x;
      linePositions[i * 6 + 1] = y;
      linePositions[i * 6 + 2] = z;
      linePositions[i * 6 + 3] = x;
      linePositions[i * 6 + 4] = y;
      linePositions[i * 6 + 5] = z - 6;
    }
    speedLineGeo.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.4,
    });
    const speedLines = new THREE.LineSegments(speedLineGeo, lineMat);
    speedLines.visible = false;
    this.camera.add(speedLines);
    this.scene.add(this.camera);

    // 3. Tire Smoke & Sparks
    const smokeGeo = new THREE.BufferGeometry();
    const smokePositions = new Float32Array(60 * 3);
    smokeGeo.setAttribute('position', new THREE.BufferAttribute(smokePositions, 3));
    const smokeMat = new THREE.PointsMaterial({
      color: 0xcccccc,
      size: 0.6,
      transparent: true,
      opacity: 0.5,
    });
    const tireSmoke = new THREE.Points(smokeGeo, smokeMat);
    this.scene.add(tireSmoke);

    const sparksGeo = new THREE.BufferGeometry();
    const sparksPositions = new Float32Array(40 * 3);
    sparksGeo.setAttribute('position', new THREE.BufferAttribute(sparksPositions, 3));
    const sparksMat = new THREE.PointsMaterial({
      color: 0xffaa00,
      size: 0.25,
      blending: THREE.AdditiveBlending,
    });
    const sparks = new THREE.Points(sparksGeo, sparksMat);
    this.scene.add(sparks);

    this.particleSystems = {
      nitroFlames: [flames1, flames2],
      tireSmoke,
      speedLines,
      sparks,
    };
  }

  // --- GAME LOOP ---
  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.clock.start();
    audioEngine.startEngine();
    audioEngine.startMusic(this.trackConfig.musicBpm);

    // Start 3-2-1 countdown
    this.countdown = 3;
    this.raceState = 'countdown';
    audioEngine.playCountdownBeep(false);

    const cdInterval = window.setInterval(() => {
      this.countdown--;
      if (this.countdown > 0) {
        audioEngine.playCountdownBeep(false);
      } else if (this.countdown === 0) {
        audioEngine.playCountdownBeep(true);
        this.raceState = 'racing';
        this.raceStartTime = performance.now();
        this.playerCarState.currentLapStartTime = this.raceStartTime;
        clearInterval(cdInterval);
      }
    }, 1000);

    this.loop();
  }

  private loop = () => {
    if (!this.isRunning) return;
    this.animFrameId = requestAnimationFrame(this.loop);

    if (this.isPaused) return;

    // Clamp frame delta to prevent physics glitches on low-end mobile devices (Redmi A3)
    const delta = Math.min(this.clock.getDelta(), 0.05);
    this.update(delta);
    this.render();
  };

  private update(delta: number) {
    if (this.raceState === 'racing') {
      this.elapsedTimeMs = performance.now() - this.raceStartTime;
    }

    // 1. Update Player Physics
    this.updatePlayerPhysics(delta);

    // 2. Update AI Racers Physics
    this.updateAIPhysics(delta);

    // 3. Collision Checks & Ranks
    this.checkCollisions();
    this.calculateRanks();

    // 4. Update Particle Systems & FX
    this.updateParticles(delta);

    // 5. Update Camera
    this.updateCamera(delta);

    // 6. Sound Engine Updates
    if (this.playerCarState) {
      audioEngine.updateEngineRPM(
        this.playerCarState.speed,
        this.playerCarState.maxSpeed,
        this.controls.accelerate,
        this.controls.brake
      );
    }

    // 7. Push Telemetry to HUD
    if (this.onTelemetryUpdate && this.playerCarState) {
      const p = this.playerCarState;
      const currentLapTime = this.raceState === 'racing' ? performance.now() - p.currentLapStartTime : 0;
      const bestLap = p.lapTimes.length > 0 ? Math.min(...p.lapTimes) : 0;

      this.onTelemetryUpdate({
        speedKmh: Math.round(p.speed),
        rpm: Math.round((p.speed / p.maxSpeed) * 8500),
        nitroPercent: Math.round(p.nitroRemaining),
        lap: p.currentLap,
        totalLaps: this.trackConfig.laps,
        position: p.raceRank,
        totalRacers: this.allRacers.length,
        lapTimeMs: currentLapTime,
        bestLapMs: bestLap,
        raceTimeMs: this.elapsedTimeMs,
        isDrifting: p.isDrifting,
        isNitroActive: p.isNitroActive,
        opponents: this.opponentCarStates.map(o => ({
          name: o.name,
          position: o.raceRank,
          distance: o.trackDistance,
          lap: o.currentLap,
        })),
      });
    }
  }

  private updatePlayerPhysics(delta: number) {
    const p = this.playerCarState;
    if (p.finished) {
      p.speed = Math.max(0, p.speed - 60 * delta);
      this.updateRacerMesh(p);
      return;
    }

    if (this.raceState === 'countdown') {
      // Allow player to rev in place
      return;
    }

    // Throttle & Nitro
    let effectiveMaxSpeed = p.maxSpeed;
    if (this.controls.nitro && p.nitroRemaining > 2) {
      if (!p.isNitroActive) {
        p.isNitroActive = true;
        audioEngine.startNitro();
      }
      p.nitroRemaining = Math.max(0, p.nitroRemaining - 28 * delta);
      effectiveMaxSpeed += 55;
      p.speed = Math.min(effectiveMaxSpeed, p.speed + (p.accelerationPower * 1.8) * delta);
      this.nitroUsedDuration += delta;
    } else {
      if (p.isNitroActive) {
        p.isNitroActive = false;
        audioEngine.stopNitro();
      }
      // Nitro natural recharge
      p.nitroRemaining = Math.min(100, p.nitroRemaining + 6 * delta);

      if (this.controls.accelerate) {
        p.speed = Math.min(effectiveMaxSpeed, p.speed + p.accelerationPower * delta);
      } else if (this.controls.brake) {
        p.speed = Math.max(-30, p.speed - p.brakingPower * 1.8 * delta);
      } else {
        // Natural friction coasting
        p.speed = Math.max(0, p.speed - 22 * delta);
      }
    }

    if (p.speed > this.maxSpeedReached) {
      this.maxSpeedReached = p.speed;
    }

    // Steering & Drifting
    const steerInput = (this.controls.steerLeft ? -1 : 0) + (this.controls.steerRight ? 1 : 0);
    const speedRatio = Math.abs(p.speed) / p.maxSpeed;

    if (steerInput !== 0 && speedRatio > 0.05) {
      const steerSpeed = (p.handlingPower * 0.14) * (1.1 - speedRatio * 0.4);
      p.currentLaneOffset += steerInput * steerSpeed * delta * (p.speed >= 0 ? 1 : -1);

      // Drift Detection
      if (speedRatio > 0.55 && (this.controls.brake || Math.abs(steerInput) > 0.8)) {
        p.isDrifting = true;
        p.driftAngle = THREE.MathUtils.lerp(p.driftAngle, steerInput * 0.38, 0.15);
        p.nitroRemaining = Math.min(100, p.nitroRemaining + 14 * delta);
        this.driftDuration += delta;
        audioEngine.startTireScreech(0.65);
      } else {
        p.isDrifting = false;
        p.driftAngle = THREE.MathUtils.lerp(p.driftAngle, 0, 0.15);
        audioEngine.stopTireScreech();
      }
    } else {
      p.isDrifting = false;
      p.driftAngle = THREE.MathUtils.lerp(p.driftAngle, 0, 0.15);
      audioEngine.stopTireScreech();
    }

    // Clamp lane within road borders (-7.5 to +7.5)
    const maxRoadOffset = 8.0;
    if (Math.abs(p.currentLaneOffset) > maxRoadOffset) {
      p.currentLaneOffset = Math.sign(p.currentLaneOffset) * maxRoadOffset;
      p.speed = Math.max(0, p.speed - 80 * delta); // Off-road gravel friction
    }

    // Advance Distance along track
    const distDelta = (p.speed / 3.6) * delta; // km/h to m/s
    p.trackDistance += distDelta;

    // Lap Completion Check
    if (p.trackDistance >= this.trackTotalLength) {
      p.trackDistance -= this.trackTotalLength;
      const lapTime = performance.now() - p.currentLapStartTime;
      p.lapTimes.push(lapTime);
      p.currentLapStartTime = performance.now();

      if (p.currentLap >= this.trackConfig.laps) {
        // FINISHED!
        p.finished = true;
        p.finishTimeMs = this.elapsedTimeMs;
        this.handleRaceCompletion();
      } else {
        p.currentLap++;
      }
    }

    this.updateRacerMesh(p);
  }

  private updateAIPhysics(delta: number) {
    if (this.raceState !== 'racing') return;

    this.opponentCarStates.forEach((ai) => {
      if (ai.finished) {
        ai.speed = Math.max(0, ai.speed - 50 * delta);
        this.updateRacerMesh(ai);
        return;
      }

      // AI Acceleration & Target Speed
      const targetSpeed = ai.maxSpeed * (0.9 + Math.sin(ai.trackDistance * 0.01) * 0.1) * ai.skillMultiplier;
      if (ai.speed < targetSpeed) {
        ai.speed += ai.accelerationPower * delta * 0.95;
      } else {
        ai.speed -= 20 * delta;
      }

      // AI Lane dynamics & overtaking
      if (Math.random() < 0.02) {
        ai.targetLaneOffset = (Math.random() - 0.5) * 11;
      }
      ai.currentLaneOffset = THREE.MathUtils.lerp(ai.currentLaneOffset, ai.targetLaneOffset, delta * 2.0);

      const distDelta = (ai.speed / 3.6) * delta;
      ai.trackDistance += distDelta;

      if (ai.trackDistance >= this.trackTotalLength) {
        ai.trackDistance -= this.trackTotalLength;
        const lapTime = performance.now() - ai.currentLapStartTime;
        ai.lapTimes.push(lapTime);
        ai.currentLapStartTime = performance.now();

        if (ai.currentLap >= this.trackConfig.laps) {
          ai.finished = true;
          ai.finishTimeMs = this.elapsedTimeMs;
        } else {
          ai.currentLap++;
        }
      }

      this.updateRacerMesh(ai);
    });
  }

  private updateRacerMesh(racer: CarPhysicsState) {
    const u = (racer.trackDistance % this.trackTotalLength) / this.trackTotalLength;
    const clampedU = Math.max(0, Math.min(1, u));

    const pt = this.trackCurve.getPointAt(clampedU);
    const tangent = this.trackCurve.getTangentAt(clampedU).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const binormal = new THREE.Vector3().crossVectors(tangent, up).normalize();

    // Position on road + lateral lane offset
    const carPos = pt.clone().addScaledVector(binormal, racer.currentLaneOffset);
    carPos.y += 0.2; // ground clearance
    racer.position.copy(carPos);
    racer.builtCar.group.position.copy(carPos);

    // Orientation along tangent with drift yaw
    const lookTarget = carPos.clone().add(tangent);
    racer.builtCar.group.lookAt(lookTarget);

    if (racer.isDrifting && racer.driftAngle !== 0) {
      racer.builtCar.group.rotateY(racer.driftAngle);
    }

    // Wheel Spin
    const wheelSpinRate = (racer.speed / 3.6) * 0.05;
    racer.builtCar.wheels.forEach((w) => {
      w.rotation.x += wheelSpinRate;
    });
  }

  private checkCollisions() {
    const p = this.playerCarState;
    if (!p) return;

    this.opponentCarStates.forEach((opp) => {
      const dist = p.position.distanceTo(opp.position);
      if (dist < 2.5) {
        // Collision bump between player & AI!
        audioEngine.playCollisionSound(0.7);
        const pushDir = p.position.clone().sub(opp.position).normalize();
        p.currentLaneOffset += pushDir.x * 0.8;
        p.speed = Math.max(0, p.speed * 0.85);
        opp.speed = Math.max(0, opp.speed * 0.85);

        // Spawn collision spark particles
        if (this.particleSystems) {
          const sparkPos = p.position.clone().add(opp.position).multiplyScalar(0.5);
          this.particleSystems.sparks.position.copy(sparkPos);
        }
      }
    });
  }

  private calculateRanks() {
    // Rank based on (Lap * TotalLength + TrackDistance)
    const sortedRacers = [...this.allRacers].sort((a, b) => {
      const progressA = (a.currentLap - 1) * this.trackTotalLength + a.trackDistance;
      const progressB = (b.currentLap - 1) * this.trackTotalLength + b.trackDistance;
      return progressB - progressA;
    });

    sortedRacers.forEach((racer, idx) => {
      racer.raceRank = idx + 1;
    });
  }

  private updateParticles(delta: number) {
    if (!this.particleSystems || !this.playerCarState) return;

    const p = this.playerCarState;

    // Nitro Flames
    if (p.isNitroActive && p.builtCar.exhaustPipes.length >= 2) {
      this.particleSystems.nitroFlames.forEach((flame, i) => {
        flame.visible = true;
        const pipeLocal = p.builtCar.exhaustPipes[i] || p.builtCar.exhaustPipes[0];
        const worldPipe = pipeLocal.clone().applyMatrix4(p.builtCar.group.matrixWorld);
        flame.position.copy(worldPipe);
        flame.quaternion.copy(p.builtCar.group.quaternion);
      });
      this.particleSystems.speedLines.visible = true;
    } else {
      this.particleSystems.nitroFlames.forEach(f => (f.visible = false));
      this.particleSystems.speedLines.visible = p.speed > 220;
    }

    // Tire Smoke on Drift
    if (p.isDrifting) {
      this.particleSystems.tireSmoke.visible = true;
      this.particleSystems.tireSmoke.position.copy(p.position);
    } else {
      this.particleSystems.tireSmoke.visible = false;
    }
  }

  private updateCamera(delta: number) {
    if (!this.playerCarState) return;

    const p = this.playerCarState;
    const carPos = p.position;

    // Get track tangent for smooth behind-car camera orientation
    const u = (p.trackDistance % this.trackTotalLength) / this.trackTotalLength;
    const tangent = this.trackCurve.getTangentAt(Math.max(0, Math.min(1, u))).normalize();

    // Camera offset behind and above car
    const camDistance = p.isNitroActive ? 10.5 : 8.2;
    const camHeight = 3.6;

    const idealCamPos = carPos.clone().sub(tangent.clone().multiplyScalar(camDistance));
    idealCamPos.y = carPos.y + camHeight;

    // Smooth spring lerp
    this.camera.position.lerp(idealCamPos, delta * 12.0);

    // Look at point slightly in front of player car
    const lookTarget = carPos.clone().add(tangent.clone().multiplyScalar(12));
    lookTarget.y += 1.2;
    this.camera.lookAt(lookTarget);

    // Dynamic FOV for high speed sensation
    const speedRatio = Math.min(1.2, p.speed / p.maxSpeed);
    const targetFov = 65 + speedRatio * 15 + (p.isNitroActive ? 12 : 0);
    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFov, delta * 6.0);
    this.camera.updateProjectionMatrix();
  }

  private handleRaceCompletion() {
    this.raceState = 'finished';
    audioEngine.stopNitro();
    audioEngine.stopTireScreech();
    audioEngine.playVictoryFanfare();

    const p = this.playerCarState;
    const bestLap = p.lapTimes.length > 0 ? Math.min(...p.lapTimes) : p.finishTimeMs;

    // Calculate rewards
    let baseCoins = 800;
    let baseXP = 300;
    let stars = 1;

    if (p.raceRank === 1) {
      baseCoins = 2400;
      baseXP = 800;
      stars = 3;
    } else if (p.raceRank === 2) {
      baseCoins = 1600;
      baseXP = 550;
      stars = 2;
    } else if (p.raceRank === 3) {
      baseCoins = 1100;
      baseXP = 400;
      stars = 1;
    } else {
      baseCoins = 400;
      baseXP = 150;
      stars = 0;
    }

    const resultData: RaceResultData = {
      trackId: this.trackConfig.id,
      mode: this.mode,
      position: p.raceRank,
      totalRacers: this.allRacers.length,
      totalTimeMs: p.finishTimeMs,
      bestLapMs: bestLap,
      topSpeedKmh: Math.round(this.maxSpeedReached),
      coinsEarned: baseCoins,
      xpEarned: baseXP,
      starsEarned: stars,
      isNewBestTime: true,
      driftPoints: Math.round(this.driftDuration * 100),
      nitroUsedSeconds: Math.round(this.nitroUsedDuration),
      careerRaceId: this.careerRaceId,
    };

    if (this.onRaceFinish) {
      this.onRaceFinish(resultData);
    }
  }

  private render() {
    this.renderer.render(this.scene, this.camera);
  }

  public onResize() {
    if (!this.container || !this.camera || !this.renderer) return;
    const width = Math.max(this.container.clientWidth || 0, window.innerWidth || 800);
    const height = Math.max(this.container.clientHeight || 0, window.innerHeight || 600);
    if (width > 0 && height > 0) {
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    }
  }

  public setPaused(paused: boolean) {
    this.isPaused = paused;
    if (paused) {
      audioEngine.stopEngine();
      audioEngine.stopNitro();
      audioEngine.stopTireScreech();
    } else {
      audioEngine.startEngine();
    }
  }

  public destroy() {
    this.isRunning = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
    }
    window.removeEventListener('resize', this.onResize);
    audioEngine.stopEngine();
    audioEngine.stopNitro();
    audioEngine.stopTireScreech();
    audioEngine.stopMusic();

    try {
      this.renderer.dispose();
      if (this.container && this.renderer.domElement) {
        this.container.removeChild(this.renderer.domElement);
      }
    } catch {
      // Ignored
    }
  }
}
