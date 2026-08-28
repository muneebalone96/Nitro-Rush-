import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, Coins, Zap, RotateCcw, ArrowRight, Gauge, Timer, Star } from 'lucide-react';
import { RaceResultData } from '../../types/game';
import { audioEngine } from '../../services/audioEngine';

interface RaceResultModalProps {
  result: RaceResultData;
  onContinue: () => void;
  onReplay: () => void;
  onGoToGarage: () => void;
  leveledUp: boolean;
  newLevel: number;
}

export const RaceResultModal: React.FC<RaceResultModalProps> = ({
  result,
  onContinue,
  onReplay,
  onGoToGarage,
  leveledUp,
  newLevel,
}) => {
  useEffect(() => {
    if (result.position <= 3) {
      confetti({
        particleCount: result.position === 1 ? 120 : 60,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#00f0ff', '#ff0055', '#ffe600', '#00ff66', '#ffffff'],
      });
    }
  }, [result.position]);

  const formatTime = (ms: number) => {
    if (!ms || ms <= 0) return '00:00.00';
    const totalSecs = ms / 1000;
    const minutes = Math.floor(totalSecs / 60);
    const seconds = Math.floor(totalSecs % 60);
    const centiseconds = Math.floor((ms % 1000) / 10);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
  };

  const getPositionBadge = (pos: number) => {
    if (pos === 1) {
      return {
        label: '1ST PLACE',
        color: 'from-amber-400 via-yellow-300 to-amber-500',
        textShadow: 'shadow-[0_0_30px_rgba(251,191,36,0.6)]',
        title: 'VICTORY!',
        textColor: 'text-amber-300',
      };
    } else if (pos === 2) {
      return {
        label: '2ND PLACE',
        color: 'from-gray-300 via-slate-100 to-gray-400',
        textShadow: 'shadow-[0_0_30px_rgba(203,213,225,0.5)]',
        title: 'PODIUM FINISH',
        textColor: 'text-slate-200',
      };
    } else if (pos === 3) {
      return {
        label: '3RD PLACE',
        color: 'from-amber-700 via-orange-600 to-amber-800',
        textShadow: 'shadow-[0_0_30px_rgba(217,119,6,0.5)]',
        title: 'PODIUM FINISH',
        textColor: 'text-amber-500',
      };
    }
    return {
      label: `${pos}TH PLACE`,
      color: 'from-gray-700 to-gray-900',
      textShadow: '',
      title: 'RACE FINISHED',
      textColor: 'text-gray-400',
    };
  };

  const posBadge = getPositionBadge(result.position);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-2xl animate-fade-in overflow-y-auto">
      <div className="w-full max-w-md bg-gradient-to-b from-[#1c120c] via-[#120a06] to-[#0a0604] border border-orange-500/40 rounded-3xl p-5 sm:p-7 shadow-[0_0_60px_rgba(249,115,22,0.3)] text-center my-auto">
        {/* HEADER: Trophy & Position */}
        <div className="relative flex flex-col items-center">
          <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-tr ${posBadge.color} flex items-center justify-center shadow-2xl ${posBadge.textShadow} mb-3`}>
            <Trophy className="w-10 h-10 sm:w-12 sm:h-12 text-black fill-current" />
          </div>

          <h2 className="text-3xl sm:text-4xl font-black italic tracking-wider text-white font-racing drop-shadow-md">
            {posBadge.title}
          </h2>
          <div className={`text-lg sm:text-xl font-extrabold tracking-widest ${posBadge.textColor} font-racing`}>
            {posBadge.label}
          </div>

          {/* Career Stars */}
          {result.careerRaceId && (
            <div className="flex items-center gap-1.5 mt-2">
              {[1, 2, 3].map((star) => (
                <Star
                  key={star}
                  className={`w-6 h-6 ${
                    star <= result.starsEarned
                      ? 'text-yellow-400 fill-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.8)]'
                      : 'text-gray-700'
                  }`}
                />
              ))}
            </div>
          )}

          {/* Level Up Alert Banner */}
          {leveledUp && (
            <div className="mt-3 px-4 py-1.5 rounded-full bg-gradient-to-r from-orange-500 via-amber-400 to-yellow-400 text-black font-racing font-black text-xs tracking-wider animate-bounce shadow-lg">
              LEVEL UP! REACHED LEVEL {newLevel}
            </div>
          )}
        </div>

        {/* REWARDS GRID */}
        <div className="grid grid-cols-2 gap-2.5 mt-5">
          <div className="p-3 rounded-2xl bg-black/60 border border-yellow-500/40 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-yellow-500/20 text-yellow-400">
              <Coins className="w-5 h-5" />
            </div>
            <div className="text-left">
              <div className="text-[10px] text-gray-400 font-bold uppercase">REWARD</div>
              <div className="text-lg font-black text-yellow-300 font-racing">
                +{result.coinsEarned.toLocaleString()}
              </div>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-black/60 border border-orange-500/40 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-orange-500/20 text-orange-400">
              <Zap className="w-5 h-5" />
            </div>
            <div className="text-left">
              <div className="text-[10px] text-gray-400 font-bold uppercase">EXP</div>
              <div className="text-lg font-black text-orange-300 font-racing">
                +{result.xpEarned} XP
              </div>
            </div>
          </div>
        </div>

        {/* RACE TELEMETRY STATS */}
        <div className="mt-4 p-3.5 rounded-2xl bg-black/60 border border-white/10 flex flex-col gap-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 flex items-center gap-1.5">
              <Timer className="w-3.5 h-3.5 text-cyan-400" /> TOTAL TIME:
            </span>
            <span className="font-mono font-bold text-white text-sm">{formatTime(result.totalTimeMs)}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-gray-400 flex items-center gap-1.5">
              <Timer className="w-3.5 h-3.5 text-emerald-400" /> BEST LAP:
            </span>
            <span className="font-mono font-bold text-emerald-300 text-sm">{formatTime(result.bestLapMs)}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-gray-400 flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 text-orange-400" /> TOP SPEED:
            </span>
            <span className="font-racing font-bold text-orange-300 text-sm">{result.topSpeedKmh} KM/H</span>
          </div>
        </div>

        {/* ACTION BUTTONS */}
        <div className="flex flex-col gap-2.5 mt-5">
          <button
            id="result-continue-btn"
            onClick={() => {
              audioEngine.playButtonClick();
              onContinue();
            }}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 via-amber-400 to-yellow-400 hover:from-orange-400 text-black font-racing font-black text-sm tracking-wider flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(249,115,22,0.45)] active:scale-95 transition-all"
          >
            CONTINUE <ArrowRight className="w-4 h-4" />
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              id="result-replay-btn"
              onClick={() => {
                audioEngine.playButtonClick();
                onReplay();
              }}
              className="py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-racing font-bold text-xs tracking-wider flex items-center justify-center gap-1.5 border border-white/10 active:scale-95 transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" /> REPLAY
            </button>

            <button
              id="result-garage-btn"
              onClick={() => {
                audioEngine.playButtonClick();
                onGoToGarage();
              }}
              className="py-3 rounded-2xl bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 font-racing font-bold text-xs tracking-wider flex items-center justify-center gap-1.5 border border-orange-500/40 active:scale-95 transition-all"
            >
              GARAGE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
