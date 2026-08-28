import React, { useState } from 'react';
import { X, Volume2, VolumeX, Music, Monitor, Smartphone, RotateCcw, Info, AlertTriangle, Vibrate, Zap } from 'lucide-react';
import { GameSettings } from '../../types/game';
import { audioEngine } from '../../services/audioEngine';

interface SettingsModalProps {
  settings: GameSettings;
  onUpdateSettings: (settings: GameSettings) => void;
  onResetProgress: () => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onUpdateSettings,
  onResetProgress,
  onClose,
}) => {
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleToggleSound = () => {
    const updated = { ...settings, soundEnabled: !settings.soundEnabled };
    onUpdateSettings(updated);
    audioEngine.updateConfig(updated.soundEnabled, updated.musicEnabled, updated.soundVolume, updated.musicVolume);
  };

  const handleToggleMusic = () => {
    const updated = { ...settings, musicEnabled: !settings.musicEnabled };
    onUpdateSettings(updated);
    audioEngine.updateConfig(updated.soundEnabled, updated.musicEnabled, updated.soundVolume, updated.musicVolume);
  };

  const handleSoundVolume = (vol: number) => {
    const updated = { ...settings, soundVolume: vol };
    onUpdateSettings(updated);
    audioEngine.updateConfig(updated.soundEnabled, updated.musicEnabled, vol, updated.musicVolume);
  };

  const handleMusicVolume = (vol: number) => {
    const updated = { ...settings, musicVolume: vol };
    onUpdateSettings(updated);
    audioEngine.updateConfig(updated.soundEnabled, updated.musicEnabled, updated.soundVolume, vol);
  };

  const handleGraphics = (q: 'low' | 'medium' | 'high') => {
    audioEngine.playButtonClick();
    onUpdateSettings({ ...settings, graphicsQuality: q });
  };

  const handleToggleVibration = () => {
    audioEngine.playButtonClick();
    const updated = { ...settings, vibrationEnabled: !settings.vibrationEnabled };
    onUpdateSettings(updated);
    if (updated.vibrationEnabled && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(30);
    }
  };

  const handleConfirmReset = () => {
    audioEngine.playCollisionSound(0.5);
    onResetProgress();
    setShowResetConfirm(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-xl animate-fade-in select-none">
      <div className="w-full max-w-md bg-gradient-to-b from-[#1c120c] via-[#120a06] to-[#0a0604] border border-orange-500/40 rounded-3xl p-5 sm:p-7 shadow-[0_0_60px_rgba(249,115,22,0.25)] relative max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-orange-400" />
            <h2 className="text-xl sm:text-2xl font-black italic tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-yellow-200 to-amber-500 font-racing">
              GAME SETTINGS
            </h2>
          </div>
          <button
            id="settings-close-btn"
            onClick={() => {
              audioEngine.playButtonClick();
              onClose();
            }}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Device optimization badge */}
        <div className="mb-4 p-2.5 rounded-2xl bg-orange-500/10 border border-orange-500/25 flex items-center gap-2.5">
          <Zap className="w-4 h-4 text-orange-400 shrink-0" />
          <div className="text-[11px] text-gray-300">
            <span className="font-bold text-orange-300">Optimized for Xiaomi Redmi A3 & Android:</span> Touchscreen multi-touch controls enabled.
          </div>
        </div>

        {/* 1. AUDIO SECTION */}
        <div className="space-y-4 mb-6">
          <div className="text-xs font-mono text-orange-400 font-bold uppercase tracking-wider">
            AUDIO PREFERENCES
          </div>

          {/* Sound FX Toggle & Slider */}
          <div className="p-3.5 rounded-2xl bg-black/50 border border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-racing font-bold text-white">
                {settings.soundEnabled ? <Volume2 className="w-4 h-4 text-orange-400" /> : <VolumeX className="w-4 h-4 text-gray-500" />}
                SOUND EFFECTS
              </div>
              <button
                id="settings-toggle-sfx-btn"
                onClick={handleToggleSound}
                className={`px-3 py-1 rounded-xl text-xs font-racing font-bold transition-all ${
                  settings.soundEnabled ? 'bg-gradient-to-r from-orange-500 to-amber-400 text-black font-black' : 'bg-gray-800 text-gray-400'
                }`}
              >
                {settings.soundEnabled ? 'ON' : 'OFF'}
              </button>
            </div>
            {settings.soundEnabled && (
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.soundVolume}
                onChange={(e) => handleSoundVolume(parseFloat(e.target.value))}
                className="w-full accent-orange-400 cursor-pointer h-1.5 bg-gray-800 rounded-lg"
              />
            )}
          </div>

          {/* Music Toggle & Slider */}
          <div className="p-3.5 rounded-2xl bg-black/50 border border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-racing font-bold text-white">
                <Music className="w-4 h-4 text-amber-400" />
                RACING SYNTH MUSIC
              </div>
              <button
                id="settings-toggle-music-btn"
                onClick={handleToggleMusic}
                className={`px-3 py-1 rounded-xl text-xs font-racing font-bold transition-all ${
                  settings.musicEnabled ? 'bg-gradient-to-r from-amber-400 to-yellow-400 text-black font-black' : 'bg-gray-800 text-gray-400'
                }`}
              >
                {settings.musicEnabled ? 'ON' : 'OFF'}
              </button>
            </div>
            {settings.musicEnabled && (
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.musicVolume}
                onChange={(e) => handleMusicVolume(parseFloat(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer h-1.5 bg-gray-800 rounded-lg"
              />
            )}
          </div>

          {/* Vibration / Haptics Toggle */}
          <div className="p-3.5 rounded-2xl bg-black/50 border border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-racing font-bold text-white">
              <Vibrate className="w-4 h-4 text-orange-400" />
              TOUCH HAPTIC VIBRATION
            </div>
            <button
              id="settings-toggle-vibration-btn"
              onClick={handleToggleVibration}
              className={`px-3 py-1 rounded-xl text-xs font-racing font-bold transition-all ${
                settings.vibrationEnabled ? 'bg-gradient-to-r from-orange-500 to-amber-400 text-black font-black' : 'bg-gray-800 text-gray-400'
              }`}
            >
              {settings.vibrationEnabled ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>

        {/* 2. GRAPHICS QUALITY */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center justify-between">
            <div className="text-xs font-mono text-orange-400 font-bold uppercase tracking-wider">
              GRAPHICS PERFORMANCE
            </div>
            <span className="text-[10px] text-gray-400">FPS / Battery Tuning</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'low', label: 'LOW', desc: 'Max FPS' },
              { id: 'medium', label: 'BALANCED', desc: 'Redmi A3' },
              { id: 'high', label: 'ULTRA', desc: '60 FPS+' },
            ].map(({ id, label, desc }) => (
              <button
                key={id}
                id={`settings-graphics-${id}-btn`}
                onClick={() => handleGraphics(id as any)}
                className={`py-2.5 px-2 rounded-2xl font-racing border transition-all flex flex-col items-center justify-center ${
                  settings.graphicsQuality === id
                    ? 'bg-gradient-to-r from-orange-500 to-amber-400 text-black border-orange-400 shadow-lg shadow-orange-500/25 font-black'
                    : 'bg-black/40 border-white/10 text-gray-400 hover:text-white'
                }`}
              >
                <span className="text-xs font-black uppercase tracking-wider">{label}</span>
                <span className={`text-[9px] ${settings.graphicsQuality === id ? 'text-black/80 font-bold' : 'text-gray-500'}`}>
                  {desc}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* 3. RESET PROGRESS */}
        <div className="border-t border-white/10 pt-4 mt-6">
          {showResetConfirm ? (
            <div className="p-3.5 rounded-2xl bg-red-950/60 border border-red-500/40 text-center space-y-3">
              <div className="flex items-center justify-center gap-2 text-red-400 font-bold text-xs font-racing">
                <AlertTriangle className="w-4 h-4" /> ERASE ALL CARS & COINS?
              </div>
              <p className="text-[11px] text-gray-300">
                This action cannot be undone. All unlocked cars, upgrades, and stars will be reset.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  id="settings-confirm-reset-btn"
                  onClick={handleConfirmReset}
                  className="py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-racing font-bold text-xs"
                >
                  YES, RESET ALL
                </button>
                <button
                  id="settings-cancel-reset-btn"
                  onClick={() => setShowResetConfirm(false)}
                  className="py-2 rounded-xl bg-white/10 text-gray-300 font-racing font-bold text-xs"
                >
                  CANCEL
                </button>
              </div>
            </div>
          ) : (
            <button
              id="settings-reset-progress-btn"
              onClick={() => setShowResetConfirm(true)}
              className="w-full py-3 rounded-2xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 font-racing font-bold text-xs tracking-wider flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <RotateCcw className="w-4 h-4" /> RESET GAME PROGRESS
            </button>
          )}
        </div>

        {/* About info */}
        <div className="mt-4 text-center text-[10px] text-gray-500 font-mono">
          NITRO RUSH: STREET LEGENDS &bull; Android &bull; Redmi A3 Edition
        </div>
      </div>
    </div>
  );
};
