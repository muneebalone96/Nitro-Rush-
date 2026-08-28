import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { CarConfig } from '../../types/game';
import { create3DCar, BuiltCar } from '../../game/carModelBuilder';
import { RotateCw, Sparkles, Volume2 } from 'lucide-react';
import { audioEngine } from '../../services/audioEngine';

interface Garage3DViewerProps {
  car: CarConfig;
  bodyColor: string;
  underglowColor: string;
  rimColor: string;
  spoilerLevel: number;
}

export const Garage3DViewer: React.FC<Garage3DViewerProps> = ({
  car,
  bodyColor,
  underglowColor,
  rimColor,
  spoilerLevel,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const carGroupRef = useRef<BuiltCar | null>(null);
  const isDraggingRef = useRef(false);
  const prevMouseX = useRef(0);
  const rotationY = useRef(Math.PI * 0.25);
  const autoRotateRef = useRef(true);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x0a0c14);

    // Camera
    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(4.5, 2.2, 5.5);
    camera.lookAt(0, 0.4, 0);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const mainSpot = new THREE.SpotLight(0xffffff, 3.5, 30, Math.PI / 4, 0.3);
    mainSpot.position.set(6, 9, 6);
    mainSpot.castShadow = true;
    mainSpot.shadow.bias = -0.0001;
    scene.add(mainSpot);

    const fillSpot = new THREE.SpotLight(0x00e5ff, 2.0, 25, Math.PI / 3, 0.5);
    fillSpot.position.set(-6, 4, -4);
    scene.add(fillSpot);

    const rimSpot = new THREE.SpotLight(0xff007f, 1.8, 25, Math.PI / 3, 0.5);
    rimSpot.position.set(0, 5, -7);
    scene.add(rimSpot);

    // Showroom Turntable Floor
    const floorGeo = new THREE.CylinderGeometry(5.5, 5.8, 0.3, 48);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x111422,
      metalness: 0.85,
      roughness: 0.2,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.y = -0.15;
    floor.receiveShadow = true;
    scene.add(floor);

    // Neon Rim around turntable
    const neonRingGeo = new THREE.TorusGeometry(5.55, 0.06, 16, 64);
    const neonRingMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(underglowColor) });
    const neonRing = new THREE.Mesh(neonRingGeo, neonRingMat);
    neonRing.rotation.x = Math.PI / 2;
    neonRing.position.y = 0.01;
    scene.add(neonRing);

    // Grid details on floor
    const gridHelper = new THREE.GridHelper(10, 20, 0x00f0ff, 0x1c2438);
    gridHelper.position.y = 0.01;
    scene.add(gridHelper);

    // Build 3D Car
    const builtCar = create3DCar({
      bodyColor,
      underglowColor,
      rimColor,
      bodyStyle: car.bodyStyle,
      spoilerLevel,
      isPlayer: true,
    });
    scene.add(builtCar.group);
    carGroupRef.current = builtCar;

    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);

      if (autoRotateRef.current && !isDraggingRef.current && carGroupRef.current) {
        rotationY.current += 0.005;
      }

      if (carGroupRef.current) {
        carGroupRef.current.group.rotation.y = rotationY.current;
        // Subtle suspension breathing
        carGroupRef.current.group.position.y = Math.sin(Date.now() * 0.002) * 0.02;
      }

      renderer.render(scene, camera);
    };
    animate();

    // Resize Handler
    const handleResize = () => {
      if (!container || !renderer) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    // Mouse / Touch Interaction for 3D rotation
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      isDraggingRef.current = true;
      autoRotateRef.current = false;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      prevMouseX.current = clientX;
    };

    const onPointerMove = (e: MouseEvent | TouchEvent) => {
      if (!isDraggingRef.current) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const deltaX = clientX - prevMouseX.current;
      rotationY.current += deltaX * 0.008;
      prevMouseX.current = clientX;
    };

    const onPointerUp = () => {
      isDraggingRef.current = false;
    };

    const domEl = renderer.domElement;
    domEl.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);

    domEl.addEventListener('touchstart', onPointerDown, { passive: true });
    window.addEventListener('touchmove', onPointerMove, { passive: true });
    window.addEventListener('touchend', onPointerUp);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      domEl.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('mouseup', onPointerUp);
      domEl.removeEventListener('touchstart', onPointerDown);
      window.removeEventListener('touchmove', onPointerMove);
      window.removeEventListener('touchend', onPointerUp);
      renderer.dispose();
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [car.id, car.bodyStyle]);

  // Update materials live when colors change without rebuilding whole scene
  useEffect(() => {
    if (carGroupRef.current) {
      carGroupRef.current.materials.body.color.set(bodyColor);
      carGroupRef.current.materials.underglow.color.set(underglowColor);
      carGroupRef.current.underglowLight.color.set(underglowColor);
    }
  }, [bodyColor, underglowColor, rimColor]);

  const handleRevEngine = () => {
    audioEngine.startEngine();
    audioEngine.updateEngineRPM(200, 250, true, false);
    setTimeout(() => {
      audioEngine.updateEngineRPM(260, 250, true, false);
    }, 300);
    setTimeout(() => {
      audioEngine.updateEngineRPM(0, 250, false, false);
      setTimeout(() => audioEngine.stopEngine(), 600);
    }, 700);
  };

  return (
    <div className="relative w-full h-full min-h-[260px] md:min-h-[380px] rounded-2xl overflow-hidden bg-gradient-to-b from-[#0e1220] to-[#08090f] border border-cyan-500/20 shadow-2xl touch-none">
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing touch-none select-none" />

      {/* Floating Control Badges */}
      <div className="absolute top-3 left-3 flex items-center gap-2 pointer-events-none">
        <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-cyan-500/30 text-cyan-400 text-xs font-mono tracking-wider flex items-center gap-1.5">
          <RotateCw className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '6s' }} /> 3D SHOWROOM
        </span>
      </div>

      <div className="absolute bottom-3 right-3 flex items-center gap-2">
        <button
          id="garage-rev-engine-btn"
          onClick={handleRevEngine}
          className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-300 border border-cyan-500/40 text-xs font-bold flex items-center gap-1.5 transition-all shadow-lg shadow-cyan-500/10 active:scale-95"
        >
          <Volume2 className="w-3.5 h-3.5" /> REV ENGINE
        </button>

        <button
          id="garage-toggle-autorotate-btn"
          onClick={() => {
            autoRotateRef.current = !autoRotateRef.current;
          }}
          className="p-2 rounded-xl bg-black/60 hover:bg-black/80 text-white/80 border border-white/10 text-xs transition-all active:scale-95"
          title="Toggle Auto Rotate"
        >
          <Sparkles className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
