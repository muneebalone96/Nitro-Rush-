import React, { useState } from 'react';
import { ArrowLeft, Cpu, Zap, Disc, Shield, Sliders, Flame, Coins, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { CarUpgradeLevels, PlayerProfile } from '../../types/game';
import { CARS_DATA, UPGRADE_COSTS } from '../../data/gameData';
import { StorageService } from '../../services/storageService';
import { audioEngine } from '../../services/audioEngine';

interface UpgradeScreenProps {
  profile: PlayerProfile;
  initialCarId?: string;
  onUpdateProfile: (profile: PlayerProfile) => void;
  onBack: () => void;
}

interface UpgradeCategoryConfig {
  key: keyof CarUpgradeLevels;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  statAffected: string;
}

const UPGRADE_CATEGORIES: UpgradeCategoryConfig[] = [
  {
    key: 'engine',
    title: 'Engine Block',
    description: 'High-compression forged pistons and ECU remap for top speed.',
    icon: Cpu,
    color: 'from-cyan-500 to-blue-600',
    statAffected: 'Top Speed +7 km/h',
  },
  {
    key: 'turbo',
    title: 'Twin Turbo',
    description: 'Large ceramic ball-bearing turbos for instantaneous boost acceleration.',
    icon: Zap,
    color: 'from-amber-500 to-orange-600',
    statAffected: 'Acceleration +8%',
  },
  {
    key: 'tires',
    title: 'Sport Tires',
    description: 'Semi-slick competition compound for razor-sharp drift grip.',
    icon: Disc,
    color: 'from-emerald-500 to-green-600',
    statAffected: 'Drift Grip +6%',
  },
  {
    key: 'brakes',
    title: 'Carbon Brakes',
    description: 'Ventilated carbon-ceramic rotors with 6-piston monobloc calipers.',
    icon: Shield,
    color: 'from-rose-500 to-red-600',
    statAffected: 'Braking Force +8%',
  },
  {
    key: 'handling',
    title: 'Suspension',
    description: 'Adjustable coilover suspension and lightweight anti-roll bars.',
    icon: Sliders,
    color: 'from-purple-500 to-indigo-600',
    statAffected: 'Handling +7%',
  },
  {
    key: 'nitro',
    title: 'Nitro System',
    description: 'Dual pressurized NOS bottles with high-flow direct injection nozzle.',
    icon: Flame,
    color: 'from-fuchsia-500 to-pink-600',
    statAffected: 'Nitro Output +10%',
  },
];

export const UpgradeScreen: React.FC<UpgradeScreenProps> = ({
  profile,
  initialCarId,
  onUpdateProfile,
  onBack,
}) => {
  const [selectedCarId, setSelectedCarId] = useState(initialCarId || profile.currentCarId || 'street_hawk');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const carData = CARS_DATA.find(c => c.id === selectedCarId) || CARS_DATA[0];
  const carState = profile.cars[carData.id] || {
    unlocked: false,
    upgrades: { engine: 1, turbo: 1, tires: 1, brakes: 1, handling: 1, nitro: 1 },
    color: carData.color,
    underglow: carData.accentColor,
    rimColor: '#e0e0e0',
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleUpgrade = (category: keyof CarUpgradeLevels) => {
    const res = StorageService.upgradeCarPart(profile, carData.id, category);
    if (res.success) {
      audioEngine.playUpgradeSound();
      onUpdateProfile(res.updatedProfile);
      showToast(res.message);
    } else {
      audioEngine.playCollisionSound(0.4);
      showToast(res.message);
    }
  };

  const unlockedCars = CARS_DATA.filter(c => profile.cars[c.id]?.unlocked);

  const switchCar = (delta: number) => {
    if (unlockedCars.length <= 1) return;
    const currIdx = unlockedCars.findIndex(c => c.id === selectedCarId);
    const nextIdx = (currIdx + delta + unlockedCars.length) % unlockedCars.length;
    setSelectedCarId(unlockedCars[nextIdx].id);
    audioEngine.playButtonClick();
  };

  return (
    <div className="relative w-full h-full flex flex-col justify-between p-3 sm:p-6 overflow-y-auto bg-vibrant-gradient bg-vibrant-grid select-none">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-full bg-gradient-to-r from-orange-500 to-amber-400 text-black font-racing font-black text-xs tracking-wider shadow-2xl animate-bounce">
          {toastMessage}
        </div>
      )}

      {/* TOP HEADER */}
      <div className="flex items-center justify-between w-full">
        <button
          id="upgrade-back-btn"
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
          <h1 className="text-xl sm:text-2xl font-black italic tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-yellow-200 to-amber-500 font-racing">
            TUNING WORKSHOP
          </h1>
          <p className="text-[11px] text-gray-400 tracking-wider uppercase font-semibold">
            PERFORMANCE UPGRADES (LEVEL 1 → 5)
          </p>
        </div>

        {/* Coins */}
        <div className="px-3.5 py-1.5 rounded-2xl bg-black/60 backdrop-blur-md border border-yellow-500/40 flex items-center gap-2">
          <Coins className="w-4 h-4 text-yellow-400" />
          <span className="text-sm font-black text-yellow-300 font-racing">
            {profile.coins.toLocaleString()}
          </span>
        </div>
      </div>

      {/* CAR SWITCHER BAR */}
      <div className="flex items-center justify-center gap-4 my-3">
        <button
          id="upgrade-prev-car-btn"
          onClick={() => switchCar(-1)}
          disabled={unlockedCars.length <= 1}
          className="p-2 rounded-xl bg-black/60 border border-white/10 text-white disabled:opacity-30 hover:border-orange-400 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="px-5 py-2 rounded-2xl bg-black/70 backdrop-blur-md border border-orange-500/30 text-center">
          <div className="text-base font-black text-white font-racing tracking-wide">
            {carData.name}
          </div>
          <div className="text-[10px] text-orange-400 font-mono">
            CLASS {carData.tier} &bull; {carData.subtitle}
          </div>
        </div>

        <button
          id="upgrade-next-car-btn"
          onClick={() => switchCar(1)}
          disabled={unlockedCars.length <= 1}
          className="p-2 rounded-xl bg-black/60 border border-white/10 text-white disabled:opacity-30 hover:border-orange-400 transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* 6 UPGRADE TILES GRID */}
      <div className="w-full max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 flex-1">
        {UPGRADE_CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const currentLevel = carState.upgrades[cat.key] || 1;
          const isMax = currentLevel >= 5;
          const nextLevel = currentLevel + 1;
          const cost = UPGRADE_COSTS[nextLevel] || 0;
          const canAfford = profile.coins >= cost;

          return (
            <div
              key={cat.key}
              className="p-4 rounded-3xl bg-black/60 backdrop-blur-xl border border-white/10 hover:border-orange-500/40 transition-all flex flex-col justify-between shadow-xl"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-2xl bg-gradient-to-br ${cat.color} text-black shadow-lg`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-racing font-black text-sm text-white tracking-wide">
                      {cat.title}
                    </h3>
                    <div className="text-[10px] font-mono text-orange-300 font-bold">
                      {cat.statAffected}
                    </div>
                  </div>
                </div>

                <span className="px-2 py-0.5 rounded-md bg-white/10 text-white font-racing font-bold text-xs">
                  LV.{currentLevel}
                </span>
              </div>

              {/* Description */}
              <p className="text-[11px] text-gray-400 my-2.5 leading-relaxed">
                {cat.description}
              </p>

              {/* Level Progress Pips (5 bars) */}
              <div className="flex items-center gap-1.5 mb-3">
                {[1, 2, 3, 4, 5].map((lvl) => (
                  <div
                    key={lvl}
                    className={`h-2 flex-1 rounded-full transition-all duration-300 ${
                      lvl <= currentLevel
                        ? 'bg-gradient-to-r from-orange-400 to-amber-300 shadow-[0_0_8px_rgba(249,115,22,0.8)]'
                        : 'bg-gray-800 border border-white/10'
                    }`}
                  />
                ))}
              </div>

              {/* Upgrade Button */}
              {isMax ? (
                <div className="py-2.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-racing font-bold text-xs tracking-wider flex items-center justify-center gap-1.5">
                  <Check className="w-4 h-4" /> MAX LEVEL REACHED
                </div>
              ) : (
                <button
                  id={`upgrade-part-${cat.key}-btn`}
                  onClick={() => handleUpgrade(cat.key)}
                  disabled={!canAfford}
                  className={`w-full py-2.5 rounded-2xl font-racing font-black text-xs tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg ${
                    canAfford
                      ? 'bg-gradient-to-r from-orange-500 via-amber-400 to-yellow-400 hover:from-orange-400 text-black shadow-orange-500/25'
                      : 'bg-gray-800/80 border border-gray-700 text-gray-400 opacity-60 cursor-not-allowed'
                  }`}
                >
                  <Coins className="w-4 h-4" /> UPGRADE FOR {cost.toLocaleString()} COINS
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
