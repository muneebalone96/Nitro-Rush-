import React, { useEffect, useState } from 'react';
import { Flame, Gauge, Zap, Play, Smartphone } from 'lucide-react';
import { audioEngine } from '../../services/audioEngine';

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState(15);
  const [statusText, setStatusText] = useState('OPTIMIZING FOR ANDROID...');

  useEffect(() => {
    const timer1 = setTimeout(() => {
      setProgress(45);
      setStatusText('WARMING UP TIRES & TURBO BOOST...');
    }, 450);

    const timer2 = setTimeout(() => {
      setProgress(80);
      setStatusText('CONFIGURING TOUCH CONTROLS...');
    }, 950);

    const timer3 = setTimeout(() => {
      setProgress(100);
      setStatusText('READY TO RACE!');
    }, 1450);

    const timer4 = setTimeout(() => {
      onComplete();
    }, 1900);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, [onComplete]);

  const handleSkip = () => {
    audioEngine.playButtonClick();
    onComplete();
  };

  return (
    <div
      onClick={handleSkip}
      className="fixed inset-0 z-50 flex flex-col justify-between items-center p-6 bg-gradient-to-b from-[#120804] via-[#090503] to-[#040202] text-white select-none cursor-pointer overflow-hidden"
    >
      {/* Background Ambient Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] sm:w-[500px] h-[340px] sm:h-[500px] bg-gradient-to-tr from-orange-500/25 via-amber-500/15 to-yellow-500/10 rounded-full blur-[110px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[200px] h-[200px] bg-red-600/15 rounded-full blur-[90px] pointer-events-none" />

      {/* Top Mobile Badge */}
      <div className="relative z-10 pt-safe flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-orange-500/30 text-orange-300 text-[11px] font-mono font-bold tracking-widest uppercase">
        <Smartphone className="w-3.5 h-3.5 text-orange-400" />
        <span>MOBILE EDITION &bull; REDMI A3 OPTIMIZED</span>
      </div>

      {/* Main Title & Logo */}
      <div className="relative z-10 flex flex-col items-center text-center my-auto">
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/15 border border-orange-500/40 text-orange-400 text-xs font-mono font-bold tracking-widest uppercase mb-3 animate-pulse">
          <Flame className="w-4 h-4 text-orange-500 fill-orange-500" />
          <span>STREET RACING SIMULATOR</span>
        </div>

        <h1 className="text-5xl sm:text-7xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-orange-400 via-yellow-100 to-amber-500 font-racing drop-shadow-[0_0_40px_rgba(249,115,22,0.6)]">
          NITRO RUSH
        </h1>

        <div className="text-xl sm:text-2xl font-black tracking-[0.4em] text-transparent bg-clip-text bg-gradient-to-r from-orange-500 via-yellow-300 to-amber-400 font-racing mt-1.5">
          STREET LEGENDS
        </div>

        {/* Dynamic Turbo RPM Graphic */}
        <div className="mt-8 relative flex items-center justify-center">
          <div className="w-20 h-20 rounded-full border-2 border-orange-500/30 flex items-center justify-center animate-spin" style={{ animationDuration: '3s' }}>
            <Zap className="w-8 h-8 text-orange-400 fill-orange-400" />
          </div>
          <div className="absolute font-speed text-xl font-bold text-yellow-300">
            {progress}%
          </div>
        </div>
      </div>

      {/* Bottom Loading Progress Bar */}
      <div className="relative z-10 w-full max-w-sm flex flex-col items-center pb-safe">
        <div className="text-[11px] font-mono font-bold tracking-widest text-orange-300 mb-2 uppercase">
          {statusText}
        </div>

        <div className="w-full h-2 bg-black/80 rounded-full overflow-hidden border border-orange-500/30 p-0.5 shadow-lg">
          <div
            className="h-full bg-gradient-to-r from-orange-500 via-amber-400 to-yellow-300 rounded-full transition-all duration-300 shadow-[0_0_12px_rgba(249,115,22,0.8)]"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="text-[10px] text-gray-400 font-mono tracking-wider mt-3 flex items-center gap-1">
          <span>TAP ANYWHERE TO START</span>
          <Play className="w-3 h-3 text-orange-400 fill-orange-400 inline" />
        </div>
      </div>
    </div>
  );
};
