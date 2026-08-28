import React from 'react';
import { ArrowLeft, Star, Lock, Trophy, Play, Coins, Zap, Flag } from 'lucide-react';
import { CareerRace, PlayerProfile } from '../../types/game';
import { CAREER_RACES, TRACKS_DATA } from '../../data/gameData';
import { audioEngine } from '../../services/audioEngine';

interface CareerModeScreenProps {
  profile: PlayerProfile;
  onSelectCareerRace: (race: CareerRace) => void;
  onBack: () => void;
}

export const CareerModeScreen: React.FC<CareerModeScreenProps> = ({
  profile,
  onSelectCareerRace,
  onBack,
}) => {
  const totalStarsEarned = (Object.values(profile.careerStars || {}) as number[]).reduce((a: number, b: number) => a + Number(b || 0), 0);

  return (
    <div className="relative w-full h-full flex flex-col justify-between p-3 sm:p-6 overflow-y-auto bg-vibrant-gradient bg-vibrant-grid select-none">
      {/* HEADER */}
      <div className="flex items-center justify-between w-full">
        <button
          id="career-back-btn"
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
            CAREER CHAMPIONSHIP
          </h1>
          <p className="text-[11px] text-gray-400 tracking-wider uppercase font-semibold">
            ROAD TO STREET LEGEND STATUS
          </p>
        </div>

        {/* Total Stars Counter */}
        <div className="px-3.5 py-1.5 rounded-2xl bg-black/60 backdrop-blur-md border border-yellow-500/40 flex items-center gap-2">
          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
          <span className="text-sm font-black text-yellow-300 font-racing">
            {totalStarsEarned} STARS
          </span>
        </div>
      </div>

      {/* CAREER STAGES LIST */}
      <div className="w-full max-w-4xl mx-auto my-4 grid grid-cols-1 sm:grid-cols-2 gap-3.5 flex-1">
        {CAREER_RACES.map((race, index) => {
          const isUnlocked = totalStarsEarned >= race.requiredStars;
          const starsEarned = profile.careerStars[race.id] || 0;
          const track = TRACKS_DATA.find(t => t.id === race.trackId) || TRACKS_DATA[0];

          return (
            <div
              key={race.id}
              className={`relative p-4 sm:p-5 rounded-3xl backdrop-blur-xl border transition-all flex flex-col justify-between shadow-xl ${
                isUnlocked
                  ? 'bg-black/60 border-white/10 hover:border-orange-500/50 hover:shadow-orange-500/15'
                  : 'bg-black/40 border-gray-800 opacity-60'
              }`}
            >
              {/* Top Meta */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[10px] font-mono text-orange-400 font-bold uppercase tracking-wider">
                    CHAPTER {race.chapter} &bull; STAGE {index + 1}
                  </div>
                  <h3 className="text-lg font-black italic text-white font-racing tracking-wide mt-0.5">
                    {race.title}
                  </h3>
                  <div className="text-xs text-gray-400 font-medium">
                    {track.name} &bull; {race.laps} Laps &bull; {race.opponentsCount} Rivals
                  </div>
                </div>

                {/* Stars earned for this race */}
                <div className="flex items-center gap-1">
                  {[1, 2, 3].map((s) => (
                    <Star
                      key={s}
                      className={`w-4 h-4 ${
                        s <= starsEarned
                          ? 'text-yellow-400 fill-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]'
                          : 'text-gray-700'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Target & Rewards */}
              <div className="flex items-center justify-between my-3 p-2.5 rounded-2xl bg-black/50 border border-white/5 text-xs">
                <div className="flex items-center gap-1.5 text-cyan-300 font-semibold">
                  <Flag className="w-3.5 h-3.5 text-cyan-400" /> Target: {race.targetPosition === 1 ? '1st Place' : `Top ${race.targetPosition}`}
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-yellow-300 font-bold">
                    <Coins className="w-3.5 h-3.5 text-yellow-400" /> +{race.rewardCoins.toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1 text-orange-300 font-bold">
                    <Zap className="w-3.5 h-3.5 text-orange-400" /> +{race.rewardXp} XP
                  </span>
                </div>
              </div>

              {/* Action Button */}
              {isUnlocked ? (
                <button
                  id={`career-start-stage-${race.id}-btn`}
                  onClick={() => {
                    audioEngine.playButtonClick();
                    onSelectCareerRace(race);
                  }}
                  className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-orange-500 via-amber-400 to-yellow-400 hover:from-orange-400 text-black font-racing font-black text-xs tracking-wider flex items-center justify-center gap-1.5 shadow-lg shadow-orange-500/25 active:scale-95 transition-all"
                >
                  <Play className="w-4 h-4 fill-current" /> RACE NOW
                </button>
              ) : (
                <div className="w-full py-2.5 rounded-2xl bg-gray-900 border border-gray-800 text-gray-500 font-racing font-bold text-xs tracking-wider flex items-center justify-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" /> REQUIRES {race.requiredStars} TOTAL STARS
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
