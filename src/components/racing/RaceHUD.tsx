import React, { useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  Flame,
  RotateCcw,
  Home,
  Volume2,
  VolumeX,
  Gauge,
  Zap,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';
import { audioEngine } from '../../services/audioEngine';

interface RaceHUDProps {
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
  countdown: number;
  raceState: 'countdown' | 'racing' | 'finished';
  isPaused: boolean;
  onSetPaused: (paused: boolean) => void;
  onRestart: () => void;
  onExitRace: () => void;
  controls: {
    accelerate: boolean;
    brake: boolean;
    steerLeft: boolean;
    steerRight: boolean;
    nitro: boolean;
  };
  setControlState: (key: 'accelerate' | 'brake' | 'steerLeft' | 'steerRight' | 'nitro', active: boolean) => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export const RaceHUD: React.FC<RaceHUDProps> = ({
  speedKmh,
  rpm,
  nitroPercent,
  lap,
  totalLaps,
  position,
  totalRacers,
  lapTimeMs,
  bestLapMs,
  raceTimeMs,
  isDrifting,
  isNitroActive,
  countdown,
  raceState,
  isPaused,
  onSetPaused,
  onRestart,
  onExitRace,
  controls,
  setControlState,
  soundEnabled,
  onToggleSound,
}) => {
  // Format milliseconds into MM:SS.mmm
  const formatTime = (ms: number) => {
    if (!ms || ms <= 0) return '00:00.00';
    const totalSecs = ms / 1000;
    const minutes = Math.floor(totalSecs / 60);
    const seconds = Math.floor(totalSecs % 60);
    const centiseconds = Math.floor((ms % 1000) / 10);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
  };

  const triggerHaptic = useCallback((durationMs = 25) => {
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(durationMs);
      }
    } catch {
      // Ignore vibration errors
    }
  }, []);

  // Multi-touch button helper with pointer capture
  const handlePointerDown = (key: 'accelerate' | 'brake' | 'steerLeft' | 'steerRight' | 'nitro', e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // Ignored
    }
    setControlState(key, true);
    if (key === 'nitro') {
      triggerHaptic(40);
    } else {
      triggerHaptic(15);
    }
  };

  const handlePointerUp = (key: 'accelerate' | 'brake' | 'steerLeft' | 'steerRight' | 'nitro', e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignored
    }
    setControlState(key, false);
  };

  // Physical Keyboard Support for Laptop / PC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent default scrolling for game keys
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }

      if (e.code === 'Escape' || e.code === 'KeyP') {
        onSetPaused(!isPaused);
        return;
      }

      if (e.code === 'KeyR' && (isPaused || raceState === 'finished')) {
        onRestart();
        return;
      }

      if (isPaused || raceState === 'finished') return;

      if (e.code === 'KeyW' || e.code === 'ArrowUp') setControlState('accelerate', true);
      if (e.code === 'KeyS' || e.code === 'ArrowDown') setControlState('brake', true);
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') setControlState('steerLeft', true);
      if (e.code === 'KeyD' || e.code === 'ArrowRight') setControlState('steerRight', true);
      if (e.code === 'Space' || e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyN') {
        setControlState('nitro', true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'KeyW' || e.code === 'ArrowUp') setControlState('accelerate', false);
      if (e.code === 'KeyS' || e.code === 'ArrowDown') setControlState('brake', false);
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') setControlState('steerLeft', false);
      if (e.code === 'KeyD' || e.code === 'ArrowRight') setControlState('steerRight', false);
      if (e.code === 'Space' || e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyN') {
        setControlState('nitro', false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isPaused, raceState, setControlState, onSetPaused, onRestart]);

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-10 flex flex-col justify-between p-2 sm:p-4 overflow-hidden pt-safe pb-safe pl-safe pr-safe">
      {/* NITRO SCREEN WARP BORDER EFFECT */}
      {isNitroActive && (
        <div className="absolute inset-0 border-4 border-orange-400/80 shadow-[inset_0_0_100px_rgba(249,115,22,0.6)] pointer-events-none animate-pulse" />
      )}

      {/* 3-2-1-GO COUNTDOWN ANIMATION */}
      {raceState === 'countdown' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
          <div className="text-center transform scale-110 sm:scale-125 animate-bounce">
            <div className="text-7xl sm:text-9xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 via-orange-400 to-red-500 drop-shadow-[0_0_40px_rgba(249,115,22,0.9)] font-racing">
              {countdown > 0 ? countdown : 'GO!'}
            </div>
            <div className="text-xs sm:text-base font-black text-amber-300 tracking-widest mt-2 uppercase font-racing">
              {countdown > 0 ? 'GET READY' : 'PEDAL TO THE METAL!'}
            </div>
          </div>
        </div>
      )}

      {/* DRIFT NOTIFIER */}
      {isDrifting && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 pointer-events-none animate-pulse">
          <div className="px-3 py-1 rounded-full bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-400 border border-yellow-300 text-black font-racing font-black text-xs sm:text-sm tracking-wider shadow-[0_0_20px_rgba(249,115,22,0.8)]">
            DRIFT BOOST! +NITRO
          </div>
        </div>
      )}

      {/* TOP BAR: Position, Laps, Timer, Sound & Pause */}
      <div className="flex items-start justify-between w-full pointer-events-auto">
        {/* Left: Position Rank & Lap Count */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Position */}
          <div className="px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-2xl bg-black/75 backdrop-blur-md border border-orange-500/40 shadow-xl flex items-baseline gap-1">
            <span className="text-[10px] sm:text-xs font-semibold text-gray-400 uppercase tracking-wider">POS</span>
            <span className="text-xl sm:text-3xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-300 font-racing">
              {position}
            </span>
            <span className="text-[10px] sm:text-xs text-gray-400 font-medium">/{totalRacers}</span>
          </div>

          {/* Lap */}
          <div className="px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-2xl bg-black/75 backdrop-blur-md border border-white/15 shadow-xl">
            <div className="text-[9px] sm:text-[10px] text-gray-400 font-bold uppercase tracking-wider">LAP</div>
            <div className="text-sm sm:text-lg font-black text-white font-racing leading-tight">
              {lap}<span className="text-[10px] text-gray-400">/{totalLaps}</span>
            </div>
          </div>
        </div>

        {/* Center: Live Timer */}
        <div className="flex flex-col items-center px-3 py-1 sm:px-4 sm:py-1.5 rounded-2xl bg-black/75 backdrop-blur-md border border-yellow-500/30 shadow-xl">
          <div className="text-xs sm:text-sm text-yellow-300 font-mono tracking-widest font-bold">
            {formatTime(raceTimeMs)}
          </div>
          {bestLapMs > 0 && (
            <div className="text-[9px] sm:text-[10px] text-emerald-400 font-mono">
              BEST: {formatTime(bestLapMs)}
            </div>
          )}
        </div>

        {/* Right: Sound toggle & Pause Button */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            id="hud-sound-toggle-btn"
            onClick={() => {
              audioEngine.playButtonClick();
              onToggleSound();
            }}
            className="p-2 sm:p-2.5 rounded-2xl bg-black/75 backdrop-blur-md border border-white/15 text-white/80 hover:text-white hover:border-orange-400/50 transition-all active:scale-95 shadow-xl min-w-[40px] min-h-[40px] flex items-center justify-center"
            aria-label="Toggle Sound"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 text-orange-400" /> : <VolumeX className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />}
          </button>

          <button
            id="hud-pause-btn"
            onClick={() => {
              audioEngine.playButtonClick();
              onSetPaused(true);
            }}
            className="p-2 sm:p-2.5 rounded-2xl bg-black/75 backdrop-blur-md border border-white/15 text-white/80 hover:text-white hover:border-orange-400/50 transition-all active:scale-95 shadow-xl min-w-[40px] min-h-[40px] flex items-center justify-center"
            aria-label="Pause Race"
          >
            <Pause className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>

      {/* CENTER BOTTOM: Compact Speedometer & Nitro Pill (Non-obstructive) */}
      <div className="self-center flex flex-col items-center pointer-events-none mb-1">
        {/* Speedometer */}
        <div className="flex items-baseline">
          <span className="text-3xl sm:text-5xl font-black italic tracking-tighter text-white font-speed drop-shadow-[0_0_20px_rgba(249,115,22,0.4)]">
            {speedKmh}
          </span>
          <span className="ml-1 text-[10px] sm:text-xs font-black text-orange-400 tracking-wider font-racing">
            KM/H
          </span>
        </div>

        {/* RPM Mini Bar */}
        <div className="w-28 sm:w-40 h-1 bg-black/80 rounded-full overflow-hidden border border-white/20 p-0.2 mt-0.5">
          <div
            className={`h-full rounded-full transition-all duration-75 ${
              rpm > 7000 ? 'bg-red-500 shadow-[0_0_8px_#ef4444]' : rpm > 5000 ? 'bg-yellow-400' : 'bg-orange-500'
            }`}
            style={{ width: `${Math.min(100, (rpm / 8500) * 100)}%` }}
          />
        </div>

        {/* Nitro Energy Pill */}
        <div className="mt-1 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/85 backdrop-blur-md border border-orange-500/40 shadow-[0_0_15px_rgba(249,115,22,0.25)]">
          <Flame className={`w-3 h-3 ${nitroPercent > 30 ? 'text-orange-400 animate-pulse' : 'text-gray-500'}`} />
          <div className="w-16 sm:w-24 h-1.5 bg-gray-900 rounded-full overflow-hidden border border-orange-500/30">
            <div
              className="h-full bg-gradient-to-r from-orange-500 via-amber-400 to-yellow-300 rounded-full transition-all duration-100"
              style={{ width: `${nitroPercent}%` }}
            />
          </div>
          <span className="text-[9px] font-mono font-bold text-orange-300">
            {nitroPercent}%
          </span>
        </div>
      </div>

      {/* BOTTOM CONTROLS: Large Ergonomic Touch Controls for Redmi A3 & Mobile */}
      <div className="flex items-end justify-between w-full pointer-events-auto gap-2">
        {/* Left Side: ◀ LEFT STEER and ▶ RIGHT STEER Buttons */}
        <div className="flex items-center gap-2 sm:gap-3 touch-none">
          {/* ◀ LEFT STEER */}
          <button
            id="control-steer-left-btn"
            onPointerDown={(e) => handlePointerDown('steerLeft', e)}
            onPointerUp={(e) => handlePointerUp('steerLeft', e)}
            onPointerCancel={(e) => handlePointerUp('steerLeft', e)}
            onPointerLeave={(e) => handlePointerUp('steerLeft', e)}
            className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl backdrop-blur-xl border-2 transition-all flex flex-col items-center justify-center active:scale-90 shadow-2xl touch-none select-none ${
              controls.steerLeft
                ? 'bg-orange-500/50 border-orange-300 shadow-[0_0_25px_rgba(249,115,22,0.8)] scale-95'
                : 'bg-black/60 border-white/25 text-white hover:border-orange-400/50'
            }`}
            aria-label="Steer Left"
          >
            <span className="text-2xl sm:text-3xl font-black leading-none">◀</span>
            <span className="text-[8px] sm:text-[9px] font-black tracking-widest text-gray-300 font-racing mt-1">LEFT</span>
          </button>

          {/* ▶ RIGHT STEER */}
          <button
            id="control-steer-right-btn"
            onPointerDown={(e) => handlePointerDown('steerRight', e)}
            onPointerUp={(e) => handlePointerUp('steerRight', e)}
            onPointerCancel={(e) => handlePointerUp('steerRight', e)}
            onPointerLeave={(e) => handlePointerUp('steerRight', e)}
            className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl backdrop-blur-xl border-2 transition-all flex flex-col items-center justify-center active:scale-90 shadow-2xl touch-none select-none ${
              controls.steerRight
                ? 'bg-orange-500/50 border-orange-300 shadow-[0_0_25px_rgba(249,115,22,0.8)] scale-95'
                : 'bg-black/60 border-white/25 text-white hover:border-orange-400/50'
            }`}
            aria-label="Steer Right"
          >
            <span className="text-2xl sm:text-3xl font-black leading-none">▶</span>
            <span className="text-[8px] sm:text-[9px] font-black tracking-widest text-gray-300 font-racing mt-1">RIGHT</span>
          </button>
        </div>

        {/* Right Side: ⚡ NITRO, 🛑 BRAKE/REVERSE, 🚗 ACCELERATE (GAS) */}
        <div className="flex items-end gap-2 sm:gap-2.5 touch-none">
          {/* ⚡ NITRO BUTTON */}
          <button
            id="control-nitro-btn"
            onPointerDown={(e) => {
              if (nitroPercent >= 5) handlePointerDown('nitro', e);
            }}
            onPointerUp={(e) => handlePointerUp('nitro', e)}
            onPointerCancel={(e) => handlePointerUp('nitro', e)}
            onPointerLeave={(e) => handlePointerUp('nitro', e)}
            disabled={nitroPercent < 5}
            className={`w-15 h-15 sm:w-18 sm:h-18 rounded-full backdrop-blur-xl border-2 transition-all flex flex-col items-center justify-center active:scale-90 shadow-2xl touch-none select-none ${
              nitroPercent < 5
                ? 'bg-gray-900/60 border-gray-700 opacity-40 cursor-not-allowed'
                : controls.nitro
                ? 'bg-gradient-to-br from-orange-400 via-amber-400 to-yellow-300 border-white text-black shadow-[0_0_35px_rgba(249,115,22,0.9)] scale-95'
                : 'bg-gradient-to-br from-orange-500/50 to-amber-600/50 border-orange-400/90 text-orange-200 shadow-[0_0_20px_rgba(249,115,22,0.4)] animate-pulse'
            }`}
            aria-label="Nitro Boost"
          >
            <Flame className="w-5 h-5 sm:w-6 sm:h-6 text-white fill-current" />
            <span className="text-[8px] font-black tracking-widest text-white font-racing">NITRO</span>
          </button>

          {/* 🛑 BRAKE / REVERSE BUTTON */}
          <button
            id="control-brake-btn"
            onPointerDown={(e) => handlePointerDown('brake', e)}
            onPointerUp={(e) => handlePointerUp('brake', e)}
            onPointerCancel={(e) => handlePointerUp('brake', e)}
            onPointerLeave={(e) => handlePointerUp('brake', e)}
            className={`w-14 h-16 sm:w-16 sm:h-20 rounded-2xl backdrop-blur-xl border-2 transition-all flex flex-col items-center justify-center active:scale-90 shadow-2xl touch-none select-none ${
              controls.brake
                ? 'bg-red-500/60 border-red-300 text-white shadow-[0_0_25px_rgba(239,68,68,0.8)] scale-95'
                : 'bg-black/60 border-red-500/40 text-red-400 hover:border-red-400'
            }`}
            aria-label="Brake and Reverse"
          >
            <span className="text-lg sm:text-xl font-black leading-none">■</span>
            <span className="text-[8px] sm:text-[9px] font-bold tracking-wider text-red-300 font-racing mt-1">BRAKE</span>
          </button>

          {/* 🚗 ACCELERATE / GAS PEDAL */}
          <button
            id="control-gas-btn"
            onPointerDown={(e) => handlePointerDown('accelerate', e)}
            onPointerUp={(e) => handlePointerUp('accelerate', e)}
            onPointerCancel={(e) => handlePointerUp('accelerate', e)}
            onPointerLeave={(e) => handlePointerUp('accelerate', e)}
            className={`w-16 h-20 sm:w-20 sm:h-24 rounded-2xl backdrop-blur-xl border-2 transition-all flex flex-col items-center justify-center active:scale-90 shadow-2xl touch-none select-none ${
              controls.accelerate
                ? 'bg-gradient-to-t from-emerald-500 to-green-400 border-white text-black shadow-[0_0_35px_rgba(34,197,94,0.9)] scale-95'
                : 'bg-gradient-to-t from-emerald-950/90 to-emerald-800/60 border-emerald-500/70 text-emerald-300 hover:border-emerald-400'
            }`}
            aria-label="Accelerate"
          >
            <span className="text-2xl sm:text-3xl font-black leading-none">▲</span>
            <span className="text-[9px] sm:text-[10px] font-black tracking-widest font-racing mt-1">GAS</span>
          </button>
        </div>
      </div>

      {/* PAUSE MODAL OVERLAY */}
      {isPaused && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-xl flex items-center justify-center p-4 z-50 pointer-events-auto">
          <div className="w-full max-w-xs sm:max-w-sm bg-gradient-to-b from-[#1c120c] via-[#120a06] to-[#0a0604] border border-orange-500/40 rounded-3xl p-5 sm:p-6 shadow-[0_0_60px_rgba(249,115,22,0.3)] text-center">
            <h2 className="text-2xl sm:text-3xl font-black italic tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-yellow-200 to-amber-500 font-racing">
              RACE PAUSED
            </h2>
            <p className="text-xs text-gray-400 mt-1">Street Legend in Standby</p>

            <div className="flex flex-col gap-2.5 mt-5">
              <button
                id="pause-resume-btn"
                onClick={() => {
                  audioEngine.playButtonClick();
                  onSetPaused(false);
                }}
                className="w-full py-3 sm:py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 via-amber-400 to-yellow-400 hover:from-orange-400 text-black font-racing font-black text-sm tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-orange-500/30 active:scale-95 transition-all min-h-[48px]"
              >
                <Play className="w-4 h-4 fill-current" /> RESUME RACE
              </button>

              <button
                id="pause-restart-btn"
                onClick={() => {
                  audioEngine.playButtonClick();
                  onRestart();
                }}
                className="w-full py-2.5 sm:py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-racing font-semibold text-xs tracking-wider flex items-center justify-center gap-2 border border-white/10 active:scale-95 transition-all min-h-[44px]"
              >
                <RotateCcw className="w-4 h-4" /> RESTART RACE
              </button>

              <button
                id="pause-quit-btn"
                onClick={() => {
                  audioEngine.playButtonClick();
                  onExitRace();
                }}
                className="w-full py-2.5 sm:py-3 rounded-2xl bg-red-500/20 hover:bg-red-500/30 text-red-300 font-racing font-semibold text-xs tracking-wider flex items-center justify-center gap-2 border border-red-500/30 active:scale-95 transition-all min-h-[44px]"
              >
                <Home className="w-4 h-4" /> QUIT TO MENU
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
