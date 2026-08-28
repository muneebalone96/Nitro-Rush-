import React, { useState } from 'react';
import { ArrowLeft, Play, Lock, Trophy, Timer, Flame, MapPin, Gauge, ShieldAlert } from 'lucide-react';
import { TrackConfig, GameMode, PlayerProfile } from '../../types/game';
import { TRACKS_DATA } from '../../data/gameData';
import { audioEngine } from '../../services/audioEngine';

interface TrackSelectScreenProps {
  profile: PlayerProfile;
  onStartRace: (track: TrackConfig, mode: GameMode) => void;
  onBack: () => void;
}

interface GameModeOption {
  id: GameMode;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const GAME_MODES: GameModeOption[] = [
  {
    id: 'quick',
    title: 'QUICK RACE',
    subtitle: 'Standard 4-car street sprint',
    icon: Play,
    color: 'from-cyan-500 to-blue-600',
  },
  {
    id: 'time_trial',
    title: 'TIME TRIAL',
    subtitle: 'Solo track record lap challenge',
    icon: Timer,
    color: 'from-emerald-500 to-teal-600',
  },
  {
    id: 'championship',
    title: 'GRAND PRIX',
    subtitle: 'High stakes 5-racer tournament',
    icon: Trophy,
    color: 'from-amber-500 to-orange-600',
  },
  {
    id: 'endless',
    title: 'ENDLESS HIGHWAY',
    subtitle: 'High-speed survival sprint',
    icon: Flame,
    color: 'from-purple-500 to-fuchsia-600',
  },
];

export const TrackSelectScreen: React.FC<TrackSelectScreenProps> = ({
  profile,
  onStartRace,
  onBack,
}) => {
  const [selectedTrackId, setSelectedTrackId] = useState<string>('neon_city');
  const [selectedMode, setSelectedMode] = useState<GameMode>('quick');

  const selectedTrack = TRACKS_DATA.find(t => t.id === selectedTrackId) || TRACKS_DATA[0];
  const totalStars = (Object.values(profile.careerStars || {}) as number[]).reduce((a: number, b: number) => a + Number(b || 0), 0);

  const isTrackUnlocked = (track: TrackConfig) => {
    if (!track.unlockRequirement) return true;
    if (track.unlockRequirement.level && profile.level < track.unlockRequirement.level) return false;
    if (track.unlockRequirement.careerStars && totalStars < track.unlockRequirement.careerStars) return false;
    return true;
  };

  const formatTime = (ms: number) => {
    if (!ms || ms <= 0) return '--:--.--';
    const totalSecs = ms / 1000;
    const minutes = Math.floor(totalSecs / 60);
    const seconds = Math.floor(totalSecs % 60);
    const centiseconds = Math.floor((ms % 1000) / 10);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
  };

  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case 'EASY': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'MEDIUM': return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
      case 'HARD': return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'EXTREME': return 'bg-red-500/20 text-red-300 border-red-500/40';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/40';
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col justify-between p-3 sm:p-6 overflow-y-auto bg-vibrant-gradient bg-vibrant-grid select-none">
      {/* TOP HEADER */}
      <div className="flex items-center justify-between w-full">
        <button
          id="track-select-back-btn"
          onClick={() => {
            audioEngine.playButtonClick();
            onBack();
          }}
          className="p-2.5 rounded-2xl bg-black/60 backdrop-blur-md border border-white/15 text-white/80 hover:text-white hover:border-orange-400/50 transition-all flex items-center gap-2 text-xs font-racing font-bold active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" /> BACK
        </button>

        {/* Title */}
        <div className="text-center">
          <h1 className="text-xl sm:text-2xl font-black italic tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-yellow-200 to-orange-500 font-racing">
            EVENT & TRACK SELECT
          </h1>
          <p className="text-[11px] text-gray-400 tracking-wider uppercase font-semibold">
            CHOOSE ENVIRONMENT & GAME MODE
          </p>
        </div>

        <div className="w-16" />
      </div>

      {/* GAME MODES SELECTOR */}
      <div className="my-3 grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-w-4xl mx-auto w-full">
        {GAME_MODES.map((mode) => {
          const Icon = mode.icon;
          const isSelected = selectedMode === mode.id;
          return (
            <button
              key={mode.id}
              id={`game-mode-${mode.id}-btn`}
              onClick={() => {
                audioEngine.playButtonClick();
                setSelectedMode(mode.id);
              }}
              className={`p-3 rounded-2xl border transition-all text-left flex flex-col justify-between ${
                isSelected
                  ? 'bg-gradient-to-br from-orange-500/25 via-amber-500/20 to-cyan-500/20 border-orange-400 shadow-lg shadow-orange-500/25 scale-[1.02]'
                  : 'bg-black/60 border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <div className={`p-2 rounded-xl bg-gradient-to-br ${mode.color} text-black shadow-md`}>
                  <Icon className="w-4 h-4" />
                </div>
                {isSelected && (
                  <span className="w-2 h-2 rounded-full bg-orange-400 shadow-[0_0_8px_#f97316]" />
                )}
              </div>
              <div>
                <div className="font-racing font-black text-xs text-white tracking-wide">
                  {mode.title}
                </div>
                <div className="text-[10px] text-gray-400 leading-tight">
                  {mode.subtitle}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* TRACKS CAROUSEL / GRID */}
      <div className="w-full max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-5 gap-3 flex-1 my-2">
        {TRACKS_DATA.map((track) => {
          const unlocked = isTrackUnlocked(track);
          const isSelected = selectedTrackId === track.id;
          const bestTime = profile.bestTimes[track.id];

          return (
            <div
              key={track.id}
              onClick={() => {
                if (unlocked) {
                  audioEngine.playButtonClick();
                  setSelectedTrackId(track.id);
                }
              }}
              className={`relative p-3.5 rounded-3xl backdrop-blur-xl border transition-all flex flex-col justify-between cursor-pointer ${
                isSelected
                  ? 'bg-black/80 border-orange-400 shadow-[0_0_25px_rgba(249,115,22,0.35)] scale-[1.02]'
                  : unlocked
                  ? 'bg-black/50 border-white/10 hover:border-orange-500/40'
                  : 'bg-black/40 border-gray-800 opacity-50 cursor-not-allowed'
              }`}
            >
              {/* Top info */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`px-2 py-0.5 rounded-md border text-[9px] font-racing font-bold ${getDifficultyColor(track.difficulty)}`}>
                    {track.difficulty}
                  </span>
                  {track.id === 'neon_city' && <span className="text-xs">🌃</span>}
                  {track.id === 'desert_storm' && <span className="text-xs">🏜️</span>}
                  {track.id === 'mountain_rush' && <span className="text-xs">🏔️</span>}
                  {track.id === 'coastal_drive' && <span className="text-xs">🌊</span>}
                  {track.id === 'cyber_circuit' && <span className="text-xs">⚡</span>}
                </div>

                <h3 className="text-base font-black italic text-white font-racing tracking-wide">
                  {track.name}
                </h3>
                <div className="text-[10px] text-gray-400 line-clamp-2 mt-1">
                  {track.subtitle}
                </div>
              </div>

              {/* Stats */}
              <div className="my-2 p-2 rounded-xl bg-black/40 border border-white/5 text-[10px] space-y-1">
                <div className="flex justify-between text-gray-400">
                  <span>DISTANCE:</span>
                  <span className="font-mono text-cyan-300 font-bold">{track.lengthKm} KM</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>BEST LAP:</span>
                  <span className="font-mono text-green-300 font-bold">{formatTime(bestTime)}</span>
                </div>
              </div>

              {/* Status */}
              {!unlocked && (
                <div className="text-[9px] text-amber-400 font-mono flex items-center gap-1 font-bold">
                  <Lock className="w-3 h-3" /> REQ LV.{track.unlockRequirement?.level || 1}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* BOTTOM ACTION BAR */}
      <div className="w-full max-w-4xl mx-auto bg-black/70 backdrop-blur-xl border border-white/10 rounded-3xl p-4 flex items-center justify-between shadow-2xl">
        <div className="flex flex-col">
          <span className="text-xs text-gray-400 font-mono uppercase tracking-wider">SELECTED EVENT</span>
          <span className="text-base sm:text-lg font-black italic text-white font-racing">
            {selectedTrack.name} &bull; {selectedMode.toUpperCase().replace('_', ' ')}
          </span>
        </div>

        <button
          id="track-start-race-btn"
          onClick={() => {
            audioEngine.playButtonClick();
            onStartRace(selectedTrack, selectedMode);
          }}
          className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 via-amber-400 to-yellow-400 hover:from-orange-400 hover:to-yellow-300 text-black font-racing font-black text-sm tracking-wider flex items-center gap-2 shadow-[0_0_30px_rgba(249,115,22,0.5)] active:scale-95 transition-all"
        >
          <Play className="w-5 h-5 fill-current" /> LAUNCH RACE
        </button>
      </div>
    </div>
  );
};
