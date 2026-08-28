import React from 'react';
import {
  Play,
  Wrench,
  Trophy,
  User,
  Settings,
  Flame,
  Coins,
  Zap,
  ChevronRight,
  Gauge,
  Car,
  Compass,
  Sparkles
} from 'lucide-react';
import { PlayerProfile, GameSettings } from '../../types/game';
import { CARS_DATA } from '../../data/gameData';
import { audioEngine } from '../../services/audioEngine';

interface MainMenuProps {
  profile: PlayerProfile;
  settings: GameSettings;
  onPlayCareer: () => void;
  onQuickRace: () => void;
  onOpenTracks?: () => void;
  onOpenGarage: () => void;
  onOpenUpgrades: () => void;
  onOpenProfile: () => void;
  onOpenSettings: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  profile,
  settings,
  onPlayCareer,
  onQuickRace,
  onOpenTracks,
  onOpenGarage,
  onOpenUpgrades,
  onOpenProfile,
  onOpenSettings,
}) => {
  const currentCar = CARS_DATA.find(c => c.id === profile.currentCarId) || CARS_DATA[0];
  const carState = profile.cars[currentCar.id] || {
    unlocked: true,
    upgrades: { engine: 1, turbo: 1, tires: 1, brakes: 1, handling: 1, nitro: 1 },
    color: currentCar.color,
    underglow: currentCar.accentColor,
    rimColor: '#e0e0e0',
  };

  const totalStars = (Object.values(profile.careerStars || {}) as number[]).reduce((a: number, b: number) => a + Number(b || 0), 0);
  const nextLevelXp = profile.level * 1000;
  const xpPercent = Math.min(100, (profile.xp / nextLevelXp) * 100);

  return (
    <div className="relative w-full h-full flex flex-col justify-between p-3 sm:p-6 overflow-y-auto bg-vibrant-gradient bg-vibrant-grid select-none pb-20 sm:pb-6">
      {/* BACKGROUND AMBIENT VIBRANT NEON GLOWS */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] sm:w-[580px] h-[340px] sm:h-[580px] bg-gradient-to-br from-orange-500/20 via-amber-500/10 to-transparent rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[260px] h-[260px] bg-amber-600/15 rounded-full blur-[90px] pointer-events-none" />

      {/* TOP STATUS BAR: Profile Badge, Level, XP, Coins, Settings */}
      <div className="relative z-10 pt-safe flex items-center justify-between w-full max-w-4xl mx-auto gap-2">
        {/* Profile Card Summary */}
        <button
          id="menu-profile-btn"
          onClick={() => {
            audioEngine.playButtonClick();
            onOpenProfile();
          }}
          className="flex items-center gap-2.5 p-1.5 pr-3.5 rounded-2xl bg-black/65 backdrop-blur-xl border border-white/15 hover:border-orange-500/50 transition-all active:scale-95 shadow-xl group min-h-[48px]"
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-orange-500/35 via-amber-500/25 to-yellow-500/20 border border-orange-400/50 flex items-center justify-center text-lg shadow-md group-hover:scale-105 transition-all">
            {profile.avatar}
          </div>
          <div className="text-left">
            <div className="flex items-center gap-1.5">
              <span className="font-racing font-black text-xs sm:text-sm text-white tracking-wide truncate max-w-[90px] sm:max-w-[120px]">
                {profile.name}
              </span>
              <span className="px-1.5 py-0.2 rounded bg-orange-500/20 text-orange-300 text-[9px] font-bold font-mono border border-orange-500/30">
                LV.{profile.level}
              </span>
            </div>
            {/* Mini XP Bar */}
            <div className="w-20 sm:w-24 h-1 bg-gray-900 rounded-full overflow-hidden mt-1 border border-white/10">
              <div
                className="h-full bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-300 rounded-full"
                style={{ width: `${xpPercent}%` }}
              />
            </div>
          </div>
        </button>

        {/* Right Header Controls (Coins, Stars, Settings) */}
        <div className="flex items-center gap-2">
          {/* Career Stars */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-black/65 backdrop-blur-xl border border-amber-500/40 shadow-xl min-h-[44px]">
            <Trophy className="w-4 h-4 text-amber-400 fill-amber-400/20" />
            <span className="text-xs font-black text-amber-300 font-racing">
              {totalStars}
            </span>
          </div>

          {/* Coins Balance */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-black/65 backdrop-blur-xl border border-yellow-500/40 shadow-xl min-h-[44px]">
            <Coins className="w-4 h-4 text-yellow-400" />
            <span className="text-xs sm:text-sm font-black text-yellow-300 font-racing">
              {profile.coins.toLocaleString()}
            </span>
          </div>

          {/* Settings Button */}
          <button
            id="menu-settings-btn"
            onClick={() => {
              audioEngine.playButtonClick();
              onOpenSettings();
            }}
            className="p-2.5 rounded-2xl bg-black/65 backdrop-blur-xl border border-white/15 hover:border-orange-400 text-white/80 hover:text-white transition-all active:scale-95 shadow-xl min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Settings"
          >
            <Settings className="w-5 h-5 text-orange-400" />
          </button>
        </div>
      </div>

      {/* CENTER HERO SECTION: LOGO, ACTIVE CAR & PRIMARY PLAY BUTTONS */}
      <div className="relative z-10 my-auto flex flex-col items-center justify-center text-center py-4">
        {/* Mobile Header Badge */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/15 border border-orange-500/40 text-orange-300 text-[10px] sm:text-xs font-mono font-bold tracking-widest uppercase mb-1.5 animate-pulse shadow-sm">
          <Flame className="w-3.5 h-3.5 text-orange-400" /> STREET RACING SIMULATOR
        </div>

        <h1 className="text-4xl sm:text-6xl md:text-7xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-orange-400 via-yellow-100 to-orange-500 font-racing drop-shadow-[0_0_30px_rgba(249,115,22,0.45)]">
          NITRO RUSH
        </h1>
        <div className="text-base sm:text-xl font-black tracking-[0.35em] text-transparent bg-clip-text bg-gradient-to-r from-orange-500 via-yellow-300 to-amber-400 font-racing mb-4">
          STREET LEGENDS
        </div>

        {/* ACTIVE CAR BADGE */}
        <div
          id="menu-active-car-card"
          onClick={() => {
            audioEngine.playButtonClick();
            onOpenGarage();
          }}
          className="cursor-pointer group flex items-center gap-3 px-4 py-2 rounded-2xl bg-black/65 backdrop-blur-xl border border-orange-500/35 hover:border-orange-400 transition-all shadow-xl active:scale-95 mb-5 max-w-xs w-full justify-between"
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-3.5 h-3.5 rounded-full border border-white/40 shadow-sm"
              style={{ backgroundColor: carState.color }}
            />
            <div className="text-left">
              <div className="text-[9px] text-gray-400 font-mono uppercase tracking-wider">SELECTED CAR</div>
              <div className="text-xs sm:text-sm font-black italic text-white font-racing tracking-wide">
                {currentCar.name} &bull; <span className="text-orange-400">CLASS {currentCar.tier}</span>
              </div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-orange-400 group-hover:translate-x-1 transition-transform" />
        </div>

        {/* PRIMARY PLAY ACTION BUTTONS */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full max-w-sm">
          {/* 🏁 PLAY (QUICK RACE) */}
          <button
            id="menu-play-quick-btn"
            onClick={() => {
              audioEngine.playButtonClick();
              onQuickRace();
            }}
            className="w-full py-3.5 sm:py-4 rounded-2xl bg-gradient-to-r from-orange-500 via-amber-400 to-yellow-400 hover:from-orange-400 text-black font-racing font-black text-base sm:text-lg tracking-wider flex items-center justify-center gap-2.5 shadow-[0_0_25px_rgba(249,115,22,0.5)] active:scale-95 transition-all min-h-[52px]"
          >
            <Play className="w-5 h-5 fill-current" /> 🏁 PLAY (QUICK RACE)
          </button>

          {/* 🏆 CAREER */}
          <button
            id="menu-play-career-btn"
            onClick={() => {
              audioEngine.playButtonClick();
              onPlayCareer();
            }}
            className="w-full py-3 sm:py-3.5 rounded-2xl bg-black/75 hover:bg-black/90 text-amber-300 border border-amber-500/40 hover:border-amber-400 font-racing font-bold text-xs sm:text-sm tracking-wider flex items-center justify-center gap-2 active:scale-95 transition-all shadow-xl min-h-[48px]"
          >
            <Trophy className="w-4 h-4 text-amber-400" /> 🏆 CAREER MODE
          </button>
        </div>
      </div>

      {/* MOBILE-FRIENDLY ACTION GRID (GARAGE, UPGRADES, TRACKS, PROFILE) */}
      <div className="relative z-10 w-full max-w-md mx-auto grid grid-cols-4 gap-1.5 sm:gap-2 mb-2">
        {/* 🚗 GARAGE */}
        <button
          id="menu-btn-garage"
          onClick={() => {
            audioEngine.playButtonClick();
            onOpenGarage();
          }}
          className="p-2.5 sm:p-3 rounded-2xl bg-black/65 backdrop-blur-xl border border-white/10 hover:border-orange-500/40 active:scale-95 transition-all flex flex-col items-center justify-center text-center group shadow-xl min-h-[72px]"
        >
          <div className="p-1.5 rounded-xl bg-orange-500/20 text-orange-400 mb-1 group-hover:scale-105 transition-transform">
            <Car className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <span className="font-racing font-bold text-[10px] sm:text-xs text-white">GARAGE</span>
        </button>

        {/* ⚡ UPGRADES */}
        <button
          id="menu-btn-upgrades"
          onClick={() => {
            audioEngine.playButtonClick();
            onOpenUpgrades();
          }}
          className="p-2.5 sm:p-3 rounded-2xl bg-black/65 backdrop-blur-xl border border-white/10 hover:border-amber-500/40 active:scale-95 transition-all flex flex-col items-center justify-center text-center group shadow-xl min-h-[72px]"
        >
          <div className="p-1.5 rounded-xl bg-amber-500/20 text-amber-400 mb-1 group-hover:scale-105 transition-transform">
            <Wrench className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <span className="font-racing font-bold text-[10px] sm:text-xs text-white">TUNING</span>
        </button>

        {/* 🗺️ TRACKS / MODES */}
        <button
          id="menu-btn-tracks"
          onClick={() => {
            audioEngine.playButtonClick();
            if (onOpenTracks) onOpenTracks();
          }}
          className="p-2.5 sm:p-3 rounded-2xl bg-black/65 backdrop-blur-xl border border-white/10 hover:border-cyan-500/40 active:scale-95 transition-all flex flex-col items-center justify-center text-center group shadow-xl min-h-[72px]"
        >
          <div className="p-1.5 rounded-xl bg-cyan-500/20 text-cyan-400 mb-1 group-hover:scale-105 transition-transform">
            <Compass className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <span className="font-racing font-bold text-[10px] sm:text-xs text-white">TRACKS</span>
        </button>

        {/* 👤 PROFILE */}
        <button
          id="menu-btn-profile"
          onClick={() => {
            audioEngine.playButtonClick();
            onOpenProfile();
          }}
          className="p-2.5 sm:p-3 rounded-2xl bg-black/65 backdrop-blur-xl border border-white/10 hover:border-yellow-500/40 active:scale-95 transition-all flex flex-col items-center justify-center text-center group shadow-xl min-h-[72px]"
        >
          <div className="p-1.5 rounded-xl bg-yellow-500/20 text-yellow-400 mb-1 group-hover:scale-105 transition-transform">
            <User className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <span className="font-racing font-bold text-[10px] sm:text-xs text-white">PROFILE</span>
        </button>
      </div>

      {/* MOBILE BOTTOM THUMB BAR (Sticky on small screens) */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-black/85 backdrop-blur-2xl border-t border-orange-500/30 px-3 py-2 flex items-center justify-around pb-safe">
        <button
          onClick={() => {
            audioEngine.playButtonClick();
            onQuickRace();
          }}
          className="flex flex-col items-center text-orange-400 p-1 min-w-[54px] active:scale-95"
        >
          <Play className="w-5 h-5 fill-current" />
          <span className="text-[10px] font-racing font-bold mt-0.5">PLAY</span>
        </button>

        <button
          onClick={() => {
            audioEngine.playButtonClick();
            onOpenGarage();
          }}
          className="flex flex-col items-center text-gray-300 hover:text-orange-400 p-1 min-w-[54px] active:scale-95"
        >
          <Car className="w-5 h-5" />
          <span className="text-[10px] font-racing font-bold mt-0.5">GARAGE</span>
        </button>

        <button
          onClick={() => {
            audioEngine.playButtonClick();
            onPlayCareer();
          }}
          className="flex flex-col items-center text-gray-300 hover:text-amber-400 p-1 min-w-[54px] active:scale-95"
        >
          <Trophy className="w-5 h-5" />
          <span className="text-[10px] font-racing font-bold mt-0.5">CAREER</span>
        </button>

        <button
          onClick={() => {
            audioEngine.playButtonClick();
            onOpenUpgrades();
          }}
          className="flex flex-col items-center text-gray-300 hover:text-orange-400 p-1 min-w-[54px] active:scale-95"
        >
          <Wrench className="w-5 h-5" />
          <span className="text-[10px] font-racing font-bold mt-0.5">UPGRADES</span>
        </button>

        <button
          onClick={() => {
            audioEngine.playButtonClick();
            onOpenSettings();
          }}
          className="flex flex-col items-center text-gray-300 hover:text-orange-400 p-1 min-w-[54px] active:scale-95"
        >
          <Settings className="w-5 h-5" />
          <span className="text-[10px] font-racing font-bold mt-0.5">SETTINGS</span>
        </button>
      </div>
    </div>
  );
};
