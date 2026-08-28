import React, { useEffect, useRef, useState } from 'react';
import { TrackConfig, CarConfig, GameMode, CareerRace, RaceResultData, PlayerProfile, GameSettings } from '../../types/game';
import { CARS_DATA } from '../../data/gameData';
import { RacingEngine } from '../../game/racingEngine';
import { RaceHUD } from './RaceHUD';
import { RaceResultModal } from './RaceResultModal';
import { StorageService } from '../../services/storageService';
import { audioEngine } from '../../services/audioEngine';
import { RotateCw, Smartphone, Check } from 'lucide-react';

interface RacingGameViewProps {
  track: TrackConfig;
  car: CarConfig;
  mode: GameMode;
  careerRace?: CareerRace;
  profile: PlayerProfile;
  settings: GameSettings;
  onUpdateProfile: (profile: PlayerProfile) => void;
  onUpdateSettings: (settings: GameSettings) => void;
  onExitToMenu: () => void;
  onGoToGarage: () => void;
}

export const RacingGameView: React.FC<RacingGameViewProps> = ({
  track,
  car,
  mode,
  careerRace,
  profile,
  settings,
  onUpdateProfile,
  onUpdateSettings,
  onExitToMenu,
  onGoToGarage,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<RacingEngine | null>(null);

  // HUD Telemetry State
  const [telemetry, setTelemetry] = useState({
    speedKmh: 0,
    rpm: 0,
    nitroPercent: 100,
    lap: 1,
    totalLaps: track.laps,
    position: 1,
    totalRacers: 5,
    lapTimeMs: 0,
    bestLapMs: 0,
    raceTimeMs: 0,
    isDrifting: false,
    isNitroActive: false,
  });

  const [raceState, setRaceState] = useState<'countdown' | 'racing' | 'finished'>('countdown');
  const [countdown, setCountdown] = useState(3);
  const [isPaused, setIsPaused] = useState(false);
  const [raceResult, setRaceResult] = useState<RaceResultData | null>(null);
  const [leveledUp, setLeveledUp] = useState(false);
  const [newLevel, setNewLevel] = useState(profile.level);
  const [isPortrait, setIsPortrait] = useState(false);
  const [showRotatePrompt, setShowRotatePrompt] = useState(true);

  // Controls state
  const [controls, setControls] = useState({
    accelerate: false,
    brake: false,
    steerLeft: false,
    steerRight: false,
    nitro: false,
  });

  const playerCarState = profile.cars[car.id] || {
    unlocked: true,
    upgrades: { engine: 1, turbo: 1, tires: 1, brakes: 1, handling: 1, nitro: 1 },
    color: car.color,
    underglow: car.accentColor,
    rimColor: '#e0e0e0',
  };

  const opponentsCount = careerRace ? careerRace.opponentsCount : (mode === 'time_trial' ? 0 : 4);

  // Orientation Check
  useEffect(() => {
    const checkOrientation = () => {
      const portrait = window.innerHeight > window.innerWidth && window.innerWidth < 800;
      setIsPortrait(portrait);
    };
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    // Try to request screen orientation lock to landscape on Android devices
    try {
      if (screen.orientation && 'lock' in screen.orientation) {
        (screen.orientation as any).lock('landscape').catch(() => {
          // Orientation lock might require full-screen or not be permitted in iframe
        });
      }
    } catch {
      // Ignored
    }

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  // Android Back Button listener: Pauses race first instead of abrupt exit
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (raceState === 'racing' && !isPaused) {
        e.preventDefault();
        setIsPaused(true);
        if (engineRef.current) engineRef.current.setPaused(true);
        // Push state back so next back action goes to menu if desired
        window.history.pushState({ screen: 'racing' }, '');
      }
    };

    window.history.pushState({ screen: 'racing' }, '');
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [raceState, isPaused]);

  // Initialize 3D Racing Engine with device-specific optimizations
  const initEngine = () => {
    if (!mountRef.current) return;

    if (engineRef.current) {
      engineRef.current.destroy();
    }

    const engine = new RacingEngine(
      mountRef.current,
      track,
      car,
      playerCarState.upgrades,
      playerCarState.color,
      playerCarState.underglow,
      playerCarState.rimColor,
      mode,
      opponentsCount,
      careerRace?.id,
      settings.graphicsQuality || 'medium'
    );

    engine.onTelemetryUpdate = (data) => {
      setTelemetry({
        speedKmh: data.speedKmh,
        rpm: data.rpm,
        nitroPercent: data.nitroPercent,
        lap: data.lap,
        totalLaps: data.totalLaps,
        position: data.position,
        totalRacers: data.totalRacers,
        lapTimeMs: data.lapTimeMs,
        bestLapMs: data.bestLapMs,
        raceTimeMs: data.raceTimeMs,
        isDrifting: data.isDrifting,
        isNitroActive: data.isNitroActive,
      });
      setRaceState(engine.raceState);
      setCountdown(engine.countdown);
    };

    engine.onRaceFinish = (res) => {
      setRaceResult(res);
      setRaceState('finished');

      // Process rewards & XP level-ups
      const processed = StorageService.processRaceResults(profile, res);
      onUpdateProfile(processed.updatedProfile);
      setLeveledUp(processed.leveledUp);
      setNewLevel(processed.newLevel);
    };

    try {
      engineRef.current = engine;
      engine.start();
      // Ensure dimensions are adjusted after container paint
      requestAnimationFrame(() => {
        if (engineRef.current) {
          engineRef.current.onResize();
        }
      });
    } catch (err) {
      console.error('Failed to initialize Racing Engine:', err);
    }
  };

  useEffect(() => {
    // Small delay ensures DOM container has evaluated layout in React
    const timer = setTimeout(() => {
      initEngine();
    }, 20);

    return () => {
      clearTimeout(timer);
      if (engineRef.current) {
        engineRef.current.destroy();
        engineRef.current = null;
      }
    };
  }, [track.id, car.id, settings.graphicsQuality]);

  const setControlState = (key: 'accelerate' | 'brake' | 'steerLeft' | 'steerRight' | 'nitro', active: boolean) => {
    setControls(prev => ({ ...prev, [key]: active }));
    if (engineRef.current) {
      engineRef.current.controls[key] = active;
    }
  };

  const handleSetPaused = (paused: boolean) => {
    setIsPaused(paused);
    if (engineRef.current) {
      engineRef.current.setPaused(paused);
    }
  };

  const handleRestart = () => {
    setRaceResult(null);
    setIsPaused(false);
    setRaceState('countdown');
    initEngine();
  };

  const handleToggleSound = () => {
    const updated = { ...settings, soundEnabled: !settings.soundEnabled };
    onUpdateSettings(updated);
    audioEngine.updateConfig(updated.soundEnabled, updated.musicEnabled, updated.soundVolume, updated.musicVolume);
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-black select-none touch-none">
      {/* 3D WebGL Canvas Container */}
      <div ref={mountRef} className="w-full h-full touch-none" />

      {/* Race Overlay HUD */}
      <RaceHUD
        speedKmh={telemetry.speedKmh}
        rpm={telemetry.rpm}
        nitroPercent={telemetry.nitroPercent}
        lap={telemetry.lap}
        totalLaps={telemetry.totalLaps}
        position={telemetry.position}
        totalRacers={telemetry.totalRacers}
        lapTimeMs={telemetry.lapTimeMs}
        bestLapMs={telemetry.bestLapMs}
        raceTimeMs={telemetry.raceTimeMs}
        isDrifting={telemetry.isDrifting}
        isNitroActive={telemetry.isNitroActive}
        countdown={countdown}
        raceState={raceState}
        isPaused={isPaused}
        onSetPaused={handleSetPaused}
        onRestart={handleRestart}
        onExitRace={onExitToMenu}
        controls={controls}
        setControlState={setControlState}
        soundEnabled={settings.soundEnabled}
        onToggleSound={handleToggleSound}
      />

      {/* ROTATE TO LANDSCAPE PROMPT (When phone is in portrait) */}
      {isPortrait && showRotatePrompt && (
        <div className="fixed inset-0 z-40 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-3xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center mb-4 animate-bounce">
            <RotateCw className="w-8 h-8 text-orange-400" />
          </div>
          <h3 className="text-xl font-black italic tracking-wide text-white font-racing">
            ROTATE TO LANDSCAPE
          </h3>
          <p className="text-xs text-gray-300 max-w-xs mt-2 leading-relaxed">
            For the optimal mobile racing experience on Redmi A3 & Android, please turn your device sideways into landscape mode.
          </p>
          <button
            onClick={() => setShowRotatePrompt(false)}
            className="mt-6 px-6 py-2.5 rounded-full bg-orange-500 text-black font-racing font-black text-xs tracking-wider flex items-center gap-2 active:scale-95 shadow-lg shadow-orange-500/30"
          >
            <Check className="w-4 h-4" /> PLAY IN PORTRAIT ANYWAY
          </button>
        </div>
      )}

      {/* Race Result Podium Modal */}
      {raceResult && (
        <RaceResultModal
          result={raceResult}
          onContinue={onExitToMenu}
          onReplay={handleRestart}
          onGoToGarage={onGoToGarage}
          leveledUp={leveledUp}
          newLevel={newLevel}
        />
      )}
    </div>
  );
};
