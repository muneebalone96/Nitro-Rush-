import React, { useState } from 'react';
import { ArrowLeft, User, Trophy, Coins, Zap, Gauge, Award, Check, Edit2, Star, Flame } from 'lucide-react';
import { PlayerProfile } from '../../types/game';
import { ACHIEVEMENTS_DATA, CARS_DATA } from '../../data/gameData';
import { StorageService } from '../../services/storageService';
import { audioEngine } from '../../services/audioEngine';

interface ProfileScreenProps {
  profile: PlayerProfile;
  onUpdateProfile: (profile: PlayerProfile) => void;
  onBack: () => void;
}

const AVATARS = ['🏎️', '⚡', '🔥', '👑', '🐺', '💀', '🚀', '🏁'];

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  profile,
  onUpdateProfile,
  onBack,
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(profile.name);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSaveName = () => {
    if (!nameInput.trim()) return;
    const updated = { ...profile, name: nameInput.trim() };
    StorageService.saveProfile(updated);
    onUpdateProfile(updated);
    setIsEditingName(false);
    showToast('Profile name updated!');
  };

  const handleSelectAvatar = (av: string) => {
    audioEngine.playButtonClick();
    const updated = { ...profile, avatar: av };
    StorageService.saveProfile(updated);
    onUpdateProfile(updated);
  };

  const handleClaimAchievement = (achId: string) => {
    const res = StorageService.claimAchievement(profile, achId);
    if (res.success) {
      audioEngine.playCoinSound();
      onUpdateProfile(res.updatedProfile);
      showToast(`+${res.coins.toLocaleString()} Coins & +${res.xp} XP Claimed!`);
    }
  };

  const winRate = profile.totalRaces > 0 ? Math.round((profile.wins / profile.totalRaces) * 100) : 0;
  const favCar = CARS_DATA.find(c => c.id === profile.favoriteCarId) || CARS_DATA[0];
  const nextLevelXp = profile.level * 1000;
  const xpPercent = Math.min(100, (profile.xp / nextLevelXp) * 100);

  return (
    <div className="relative w-full h-full flex flex-col justify-between p-3 sm:p-6 overflow-y-auto bg-vibrant-gradient bg-vibrant-grid select-none">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-full bg-gradient-to-r from-orange-500 to-amber-400 text-black font-racing font-black text-xs tracking-wider shadow-2xl animate-bounce">
          {toastMessage}
        </div>
      )}

      {/* TOP HEADER */}
      <div className="flex items-center justify-between w-full">
        <button
          id="profile-back-btn"
          onClick={() => {
            audioEngine.playButtonClick();
            onBack();
          }}
          className="p-2.5 rounded-2xl bg-black/60 backdrop-blur-md border border-white/15 text-white/80 hover:text-white hover:border-orange-400/50 transition-all flex items-center gap-2 text-xs font-racing font-bold active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" /> BACK
        </button>

        <div className="text-center">
          <h1 className="text-xl sm:text-2xl font-black italic tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-yellow-200 to-amber-500 font-racing">
            STREET RECORD
          </h1>
          <p className="text-[11px] text-gray-400 tracking-wider uppercase font-semibold">
            PLAYER PROFILE & TROPHIES
          </p>
        </div>

        <div className="px-3.5 py-1.5 rounded-2xl bg-black/60 backdrop-blur-md border border-yellow-500/40 flex items-center gap-2">
          <Coins className="w-4 h-4 text-yellow-400" />
          <span className="text-sm font-black text-yellow-300 font-racing">
            {profile.coins.toLocaleString()}
          </span>
        </div>
      </div>

      {/* PROFILE CARD & STATS */}
      <div className="w-full max-w-4xl mx-auto my-3 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Left: User Card */}
        <div className="p-5 rounded-3xl bg-black/60 backdrop-blur-xl border border-white/10 flex flex-col items-center text-center shadow-xl">
          {/* Avatar */}
          <div className="text-5xl p-4 rounded-3xl bg-gradient-to-br from-orange-500/25 via-amber-500/20 to-cyan-500/15 border border-orange-500/40 mb-3 shadow-lg shadow-orange-500/15">
            {profile.avatar}
          </div>

          {/* Avatar selector pills */}
          <div className="flex items-center gap-1.5 mb-4">
            {AVATARS.map((av) => (
              <button
                key={av}
                onClick={() => handleSelectAvatar(av)}
                className={`w-7 h-7 rounded-lg text-sm flex items-center justify-center transition-all ${
                  profile.avatar === av ? 'bg-gradient-to-tr from-orange-500 to-amber-400 text-black scale-110 shadow-md font-bold' : 'bg-white/5 hover:bg-white/10'
                }`}
              >
                {av}
              </button>
            ))}
          </div>

          {/* Name */}
          {isEditingName ? (
            <div className="flex items-center gap-2 mb-2 w-full">
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                maxLength={16}
                className="w-full px-3 py-1 rounded-xl bg-black border border-orange-400 text-white font-racing text-center text-sm outline-none"
              />
              <button
                onClick={handleSaveName}
                className="px-3 py-1 rounded-xl bg-gradient-to-r from-orange-500 to-amber-400 text-black font-racing font-black text-xs"
              >
                SAVE
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-xl font-black italic text-white font-racing tracking-wide">
                {profile.name}
              </h2>
              <button
                onClick={() => setIsEditingName(true)}
                className="text-gray-400 hover:text-orange-400 p-1"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Level & XP */}
          <div className="w-full mt-2">
            <div className="flex justify-between text-xs font-bold font-racing mb-1">
              <span className="text-orange-400">LEVEL {profile.level}</span>
              <span className="text-gray-400">{profile.xp} / {nextLevelXp} XP</span>
            </div>
            <div className="w-full h-2.5 bg-black/80 rounded-full overflow-hidden border border-orange-500/30">
              <div
                className="h-full bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-300 rounded-full transition-all duration-300"
                style={{ width: `${xpPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Right: Career Telemetry Grid */}
        <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10 flex flex-col justify-between">
            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">TOTAL RACES</div>
            <div className="text-2xl font-black italic text-white font-racing">{profile.totalRaces}</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10 flex flex-col justify-between">
            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">1ST PLACE WINS</div>
            <div className="text-2xl font-black italic text-yellow-300 font-racing">{profile.wins}</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10 flex flex-col justify-between">
            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">PODIUMS (TOP 3)</div>
            <div className="text-2xl font-black italic text-cyan-300 font-racing">{profile.podiums}</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10 flex flex-col justify-between">
            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">WIN RATE</div>
            <div className="text-2xl font-black italic text-emerald-400 font-racing">{winRate}%</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10 flex flex-col justify-between">
            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">TOP SPEED</div>
            <div className="text-2xl font-black italic text-orange-400 font-speed">{profile.topSpeedKmh} KM/H</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10 flex flex-col justify-between">
            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">SIGNATURE CAR</div>
            <div className="text-sm font-black italic text-purple-300 font-racing truncate">{favCar.name}</div>
          </div>
        </div>
      </div>

      {/* ACHIEVEMENTS LIST */}
      <div className="w-full max-w-4xl mx-auto flex-1">
        <h3 className="text-sm font-black italic tracking-wider text-white font-racing mb-2.5 flex items-center gap-2">
          <Award className="w-4 h-4 text-orange-400" /> TROPHIES & ACHIEVEMENTS
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {ACHIEVEMENTS_DATA.map((ach) => {
            const state = profile.achievements[ach.id] || { progress: 0, unlocked: false, claimed: false };
            const isUnlocked = state.unlocked || state.progress >= ach.maxProgress;
            const isClaimed = state.claimed;
            const progPercent = Math.min(100, (state.progress / ach.maxProgress) * 100);

            return (
              <div
                key={ach.id}
                className="p-3.5 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10 hover:border-orange-500/30 flex items-center justify-between gap-3 shadow-lg transition-all"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-racing font-black text-xs text-white tracking-wide">
                      {ach.title}
                    </span>
                    {isUnlocked && (
                      <span className="px-1.5 py-0.2 rounded bg-orange-500/20 text-orange-300 text-[9px] font-bold border border-orange-500/30">
                        DONE
                      </span>
                    )}
                  </div>

                  <p className="text-[10px] text-gray-400 my-1">{ach.description}</p>

                  {/* Progress bar */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-900 rounded-full overflow-hidden border border-white/5">
                      <div
                        className="h-full bg-gradient-to-r from-orange-400 to-amber-300 rounded-full transition-all"
                        style={{ width: `${progPercent}%` }}
                      />
                    </div>
                    <span className="text-[9px] font-mono text-gray-400">
                      {state.progress}/{ach.maxProgress}
                    </span>
                  </div>
                </div>

                {/* Claim button */}
                {isClaimed ? (
                  <div className="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold flex items-center gap-1 font-racing">
                    <Check className="w-3.5 h-3.5" /> CLAIMED
                  </div>
                ) : isUnlocked ? (
                  <button
                    id={`claim-ach-${ach.id}-btn`}
                    onClick={() => handleClaimAchievement(ach.id)}
                    className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-orange-500 via-amber-400 to-yellow-400 text-black text-[10px] font-black font-racing tracking-wider shadow-lg shadow-orange-500/30 animate-pulse active:scale-95"
                  >
                    +{ach.rewardCoins} COINS
                  </button>
                ) : (
                  <div className="text-[10px] text-yellow-500/80 font-mono font-bold">
                    +{ach.rewardCoins}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
