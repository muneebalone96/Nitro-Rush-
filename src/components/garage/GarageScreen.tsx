import React, { useState } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Lock, Check, Wrench, Palette, Coins, Zap, ShieldAlert } from 'lucide-react';
import { CarConfig, PlayerProfile } from '../../types/game';
import { CARS_DATA } from '../../data/gameData';
import { Garage3DViewer } from './Garage3DViewer';
import { StorageService } from '../../services/storageService';
import { audioEngine } from '../../services/audioEngine';

interface GarageScreenProps {
  profile: PlayerProfile;
  onUpdateProfile: (profile: PlayerProfile) => void;
  onBack: () => void;
  onGoToUpgrades: (carId: string) => void;
}

const UNDERGLOW_COLORS = [
  '#00e5ff', '#ff0055', '#ffe600', '#00ff66', '#b388ff', '#ff9100', '#ffffff',
];

const RIM_COLORS = [
  '#e0e0e0', '#1a1a1a', '#ffd700', '#00e5ff', '#ff1744', '#76ff03',
];

export const GarageScreen: React.FC<GarageScreenProps> = ({
  profile,
  onUpdateProfile,
  onBack,
  onGoToUpgrades,
}) => {
  const [selectedCarIndex, setSelectedCarIndex] = useState(() => {
    const idx = CARS_DATA.findIndex(c => c.id === profile.currentCarId);
    return idx >= 0 ? idx : 0;
  });
  const [activeTab, setActiveTab] = useState<'stats' | 'paint' | 'underglow'>('stats');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const currentCar = CARS_DATA[selectedCarIndex];
  const carState = profile.cars[currentCar.id] || {
    unlocked: false,
    upgrades: { engine: 1, turbo: 1, tires: 1, brakes: 1, handling: 1, nitro: 1 },
    color: currentCar.color,
    underglow: currentCar.accentColor,
    rimColor: '#e0e0e0',
  };

  const isCurrentCarSelected = profile.currentCarId === currentCar.id;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Switch car carousel
  const handlePrevCar = () => {
    audioEngine.playButtonClick();
    setSelectedCarIndex((prev) => (prev > 0 ? prev - 1 : CARS_DATA.length - 1));
  };

  const handleNextCar = () => {
    audioEngine.playButtonClick();
    setSelectedCarIndex((prev) => (prev < CARS_DATA.length - 1 ? prev + 1 : 0));
  };

  // Buy Car
  const handleBuyCar = () => {
    const res = StorageService.buyCar(profile, currentCar.id);
    if (res.success) {
      audioEngine.playCoinSound();
      onUpdateProfile(res.updatedProfile);
      showToast(res.message);
    } else {
      audioEngine.playCollisionSound(0.4);
      showToast(res.message);
    }
  };

  // Select Car as Active
  const handleSelectActiveCar = () => {
    audioEngine.playButtonClick();
    const updated = { ...profile, currentCarId: currentCar.id, favoriteCarId: currentCar.id };
    StorageService.saveProfile(updated);
    onUpdateProfile(updated);
    showToast(`${currentCar.name} Selected for Racing!`);
  };

  // Change Paint Color
  const handleColorChange = (newColor: string) => {
    audioEngine.playButtonClick();
    const updated = {
      ...profile,
      cars: {
        ...profile.cars,
        [currentCar.id]: {
          ...carState,
          color: newColor,
        },
      },
    };
    StorageService.saveProfile(updated);
    onUpdateProfile(updated);
  };

  // Change Underglow Neon
  const handleUnderglowChange = (newColor: string) => {
    audioEngine.playButtonClick();
    const updated = {
      ...profile,
      cars: {
        ...profile.cars,
        [currentCar.id]: {
          ...carState,
          underglow: newColor,
        },
      },
    };
    StorageService.saveProfile(updated);
    onUpdateProfile(updated);
  };

  // Change Rim Color
  const handleRimChange = (newRimColor: string) => {
    audioEngine.playButtonClick();
    const updated = {
      ...profile,
      cars: {
        ...profile.cars,
        [currentCar.id]: {
          ...carState,
          rimColor: newRimColor,
        },
      },
    };
    StorageService.saveProfile(updated);
    onUpdateProfile(updated);
  };

  // Calculate Tuned Stats with Upgrades
  const speedBonus = (carState.upgrades.engine - 1) * 6 + (carState.upgrades.turbo - 1) * 4;
  const accelBonus = (carState.upgrades.turbo - 1) * 7 + (carState.upgrades.engine - 1) * 3;
  const handlingBonus = (carState.upgrades.handling - 1) * 6 + (carState.upgrades.tires - 1) * 4;
  const brakingBonus = (carState.upgrades.brakes - 1) * 7 + (carState.upgrades.tires - 1) * 3;
  const nitroBonus = (carState.upgrades.nitro - 1) * 8;

  const currentStats = {
    speed: Math.min(100, currentCar.stats.speed + speedBonus),
    acceleration: Math.min(100, currentCar.stats.acceleration + accelBonus),
    handling: Math.min(100, currentCar.stats.handling + handlingBonus),
    braking: Math.min(100, currentCar.stats.braking + brakingBonus),
    nitro: Math.min(100, currentCar.stats.nitro + nitroBonus),
  };

  return (
    <div className="relative w-full h-full flex flex-col justify-between p-3 sm:p-6 overflow-y-auto bg-vibrant-gradient bg-vibrant-grid select-none">
      {/* Toast alert */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-full bg-gradient-to-r from-orange-500 to-amber-400 text-black font-racing font-black text-xs tracking-wider shadow-2xl animate-bounce">
          {toastMessage}
        </div>
      )}

      {/* TOP HEADER */}
      <div className="flex items-center justify-between w-full">
        <button
          id="garage-back-btn"
          onClick={() => {
            audioEngine.playButtonClick();
            onBack();
          }}
          className="p-2.5 rounded-2xl bg-black/60 backdrop-blur-md border border-white/15 text-white/80 hover:text-white hover:border-orange-400/50 transition-all flex items-center gap-2 text-xs font-racing font-bold active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" /> BACK
        </button>

        {/* Header Title */}
        <div className="text-center">
          <h1 className="text-xl sm:text-2xl font-black italic tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-yellow-200 to-orange-500 font-racing">
            CUSTOM GARAGE
          </h1>
          <p className="text-[11px] text-gray-400 tracking-wider uppercase font-semibold">
            {selectedCarIndex + 1} OF {CARS_DATA.length} VEHICLES
          </p>
        </div>

        {/* Coin Balance Badge */}
        <div className="px-3.5 py-1.5 rounded-2xl bg-black/60 backdrop-blur-md border border-yellow-500/40 flex items-center gap-2">
          <Coins className="w-4 h-4 text-yellow-400" />
          <span className="text-sm font-black text-yellow-300 font-racing">
            {profile.coins.toLocaleString()}
          </span>
        </div>
      </div>

      {/* CENTER STAGE: 3D Car Turntable + Selector Arrows */}
      <div className="relative my-3 flex-1 flex flex-col items-center justify-center min-h-[260px] sm:min-h-[340px]">
        {/* Car Navigation Arrows */}
        <button
          id="garage-prev-car-btn"
          onClick={handlePrevCar}
          className="absolute left-2 z-20 p-3 rounded-2xl bg-black/70 backdrop-blur-md border border-white/20 text-white hover:border-orange-400 hover:text-orange-400 transition-all active:scale-90 shadow-xl"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        <button
          id="garage-next-car-btn"
          onClick={handleNextCar}
          className="absolute right-2 z-20 p-3 rounded-2xl bg-black/70 backdrop-blur-md border border-white/20 text-white hover:border-orange-400 hover:text-orange-400 transition-all active:scale-90 shadow-xl"
        >
          <ChevronRight className="w-6 h-6" />
        </button>

        {/* 3D Turntable Viewer */}
        <div className="w-full h-full max-w-4xl max-h-[380px]">
          <Garage3DViewer
            car={currentCar}
            bodyColor={carState.color}
            underglowColor={carState.underglow}
            rimColor={carState.rimColor}
            spoilerLevel={carState.upgrades.turbo}
          />
        </div>

        {/* Car Name & Tier Badge */}
        <div className="absolute top-4 left-4 z-10 flex flex-col items-start pointer-events-none">
          <div className="flex items-center gap-2">
            <span className="text-2xl sm:text-3xl font-black italic tracking-wide text-white font-racing drop-shadow-md">
              {currentCar.name}
            </span>
            <span className="px-2.5 py-0.5 rounded-lg bg-orange-500 text-black font-racing font-black text-xs shadow-md">
              CLASS {currentCar.tier}
            </span>
          </div>
          <span className="text-xs text-orange-300 font-medium tracking-wide">
            {currentCar.subtitle}
          </span>
        </div>
      </div>

      {/* BOTTOM CONTROLS & STATS PANEL */}
      <div className="w-full max-w-4xl mx-auto bg-black/70 backdrop-blur-xl border border-white/10 rounded-3xl p-4 sm:p-5 shadow-2xl">
        {/* Navigation Tabs (Stats / Paint Shop / Underglow Neon) */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
          <div className="flex items-center gap-2">
            <button
              id="garage-tab-stats-btn"
              onClick={() => {
                audioEngine.playButtonClick();
                setActiveTab('stats');
              }}
              className={`px-3.5 py-1.5 rounded-xl font-racing font-bold text-xs tracking-wider transition-all ${
                activeTab === 'stats'
                  ? 'bg-orange-500 text-black shadow-lg shadow-orange-500/30'
                  : 'bg-white/5 text-gray-400 hover:text-white'
              }`}
            >
              PERFORMANCE STATS
            </button>

            {carState.unlocked && (
              <>
                <button
                  id="garage-tab-paint-btn"
                  onClick={() => {
                    audioEngine.playButtonClick();
                    setActiveTab('paint');
                  }}
                  className={`px-3.5 py-1.5 rounded-xl font-racing font-bold text-xs tracking-wider flex items-center gap-1.5 transition-all ${
                    activeTab === 'paint'
                      ? 'bg-orange-500 text-black shadow-lg shadow-orange-500/30'
                      : 'bg-white/5 text-gray-400 hover:text-white'
                  }`}
                >
                  <Palette className="w-3.5 h-3.5" /> PAINT BOOTH
                </button>

                <button
                  id="garage-tab-underglow-btn"
                  onClick={() => {
                    audioEngine.playButtonClick();
                    setActiveTab('underglow');
                  }}
                  className={`px-3.5 py-1.5 rounded-xl font-racing font-bold text-xs tracking-wider flex items-center gap-1.5 transition-all ${
                    activeTab === 'underglow'
                      ? 'bg-orange-500 text-black shadow-lg shadow-orange-500/30'
                      : 'bg-white/5 text-gray-400 hover:text-white'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" /> NEON & RIMS
                </button>
              </>
            )}
          </div>

          {/* Action Button: Drive / Buy / Upgrades */}
          <div className="flex items-center gap-2">
            {carState.unlocked ? (
              <>
                <button
                  id="garage-upgrade-nav-btn"
                  onClick={() => {
                    audioEngine.playButtonClick();
                    onGoToUpgrades(currentCar.id);
                  }}
                  className="px-4 py-2 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-racing font-bold text-xs tracking-wider flex items-center gap-1.5 transition-all active:scale-95"
                >
                  <Wrench className="w-3.5 h-3.5" /> UPGRADES
                </button>

                <button
                  id="garage-select-car-btn"
                  onClick={handleSelectActiveCar}
                  disabled={isCurrentCarSelected}
                  className={`px-5 py-2 rounded-2xl font-racing font-black text-xs tracking-wider flex items-center gap-1.5 transition-all active:scale-95 ${
                    isCurrentCarSelected
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 cursor-default'
                      : 'bg-gradient-to-r from-orange-500 via-amber-400 to-yellow-400 text-black shadow-lg shadow-orange-500/30 hover:from-orange-400'
                  }`}
                >
                  {isCurrentCarSelected ? (
                    <>
                      <Check className="w-4 h-4" /> SELECTED
                    </>
                  ) : (
                    'DRIVE THIS CAR'
                  )}
                </button>
              </>
            ) : (
              <button
                id="garage-buy-car-btn"
                onClick={handleBuyCar}
                className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-orange-500 via-amber-400 to-yellow-400 hover:from-orange-400 hover:to-yellow-300 text-black font-racing font-black text-xs tracking-wider flex items-center gap-2 shadow-[0_0_25px_rgba(249,115,22,0.5)] active:scale-95 transition-all"
              >
                <Lock className="w-4 h-4" /> UNLOCK FOR {currentCar.price.toLocaleString()} COINS
              </button>
            )}
          </div>
        </div>

        {/* TAB 1: STATS BARS */}
        {activeTab === 'stats' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">
            {/* Speed */}
            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-gray-300 uppercase tracking-wider">TOP SPEED</span>
                <span className="text-cyan-400 font-mono">{currentStats.speed} / 100</span>
              </div>
              <div className="h-2 bg-black/60 rounded-full overflow-hidden border border-white/10">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-400 rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(6,182,212,0.5)]"
                  style={{ width: `${currentStats.speed}%` }}
                />
              </div>
            </div>

            {/* Acceleration */}
            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-gray-300 uppercase tracking-wider">ACCELERATION</span>
                <span className="text-orange-400 font-mono">{currentStats.acceleration} / 100</span>
              </div>
              <div className="h-2 bg-black/60 rounded-full overflow-hidden border border-white/10">
                <div
                  className="h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(249,115,22,0.5)]"
                  style={{ width: `${currentStats.acceleration}%` }}
                />
              </div>
            </div>

            {/* Handling */}
            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-gray-300 uppercase tracking-wider">HANDLING / DRIFT</span>
                <span className="text-emerald-400 font-mono">{currentStats.handling} / 100</span>
              </div>
              <div className="h-2 bg-black/60 rounded-full overflow-hidden border border-white/10">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-green-400 rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                  style={{ width: `${currentStats.handling}%` }}
                />
              </div>
            </div>

            {/* Braking */}
            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-gray-300 uppercase tracking-wider">BRAKING</span>
                <span className="text-rose-400 font-mono">{currentStats.braking} / 100</span>
              </div>
              <div className="h-2 bg-black/60 rounded-full overflow-hidden border border-white/10">
                <div
                  className="h-full bg-gradient-to-r from-rose-500 to-red-400 rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(244,63,94,0.5)]"
                  style={{ width: `${currentStats.braking}%` }}
                />
              </div>
            </div>

            {/* Nitro */}
            <div className="sm:col-span-2">
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-gray-300 uppercase tracking-wider">NITRO BOOST</span>
                <span className="text-purple-400 font-mono">{currentStats.nitro} / 100</span>
              </div>
              <div className="h-2 bg-black/60 rounded-full overflow-hidden border border-white/10">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-fuchsia-400 rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(168,85,247,0.5)]"
                  style={{ width: `${currentStats.nitro}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PAINT BOOTH */}
        {activeTab === 'paint' && (
          <div>
            <div className="text-xs font-bold text-gray-300 mb-2 uppercase tracking-wider">
              SELECT METALLIC BODY PAINT
            </div>
            <div className="flex flex-wrap gap-3">
              {currentCar.availableColors.map((col) => (
                <button
                  key={col}
                  id={`paint-color-${col.replace('#', '')}`}
                  onClick={() => handleColorChange(col)}
                  className={`w-10 h-10 rounded-2xl border-2 transition-all active:scale-90 shadow-lg ${
                    carState.color === col ? 'border-orange-400 scale-110 shadow-[0_0_15px_rgba(249,115,22,0.6)]' : 'border-white/20'
                  }`}
                  style={{ backgroundColor: col }}
                />
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: NEON UNDERGLOW & RIMS */}
        {activeTab === 'underglow' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="text-xs font-bold text-gray-300 mb-2 uppercase tracking-wider">
                NEON UNDERGLOW COLOR
              </div>
              <div className="flex flex-wrap gap-2.5">
                {UNDERGLOW_COLORS.map((col) => (
                  <button
                    key={col}
                    id={`underglow-color-${col.replace('#', '')}`}
                    onClick={() => handleUnderglowChange(col)}
                    className={`w-9 h-9 rounded-2xl border-2 transition-all active:scale-90 shadow-lg ${
                      carState.underglow === col ? 'border-white scale-110 shadow-[0_0_20px_rgba(255,255,255,0.8)]' : 'border-white/20'
                    }`}
                    style={{ backgroundColor: col }}
                  />
                ))}
              </div>
            </div>

            <div>
              <div className="text-xs font-bold text-gray-300 mb-2 uppercase tracking-wider">
                ALLOY RIM FINISH
              </div>
              <div className="flex flex-wrap gap-2.5">
                {RIM_COLORS.map((col) => (
                  <button
                    key={col}
                    id={`rim-color-${col.replace('#', '')}`}
                    onClick={() => handleRimChange(col)}
                    className={`w-9 h-9 rounded-2xl border-2 transition-all active:scale-90 shadow-lg ${
                      carState.rimColor === col ? 'border-orange-400 scale-110 shadow-[0_0_15px_rgba(249,115,22,0.6)]' : 'border-white/20'
                    }`}
                    style={{ backgroundColor: col }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
