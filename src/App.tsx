import React, { useState, useEffect } from 'react';
import { PlayerProfile, GameSettings, TrackConfig, CarConfig, GameMode, CareerRace } from './types/game';
import { CARS_DATA, TRACKS_DATA, CAREER_RACES } from './data/gameData';
import { StorageService } from './services/storageService';
import { audioEngine } from './services/audioEngine';
import { MainMenu } from './components/menu/MainMenu';
import { GarageScreen } from './components/garage/GarageScreen';
import { UpgradeScreen } from './components/upgrades/UpgradeScreen';
import { TrackSelectScreen } from './components/racing/TrackSelectScreen';
import { CareerModeScreen } from './components/racing/CareerModeScreen';
import { ProfileScreen } from './components/profile/ProfileScreen';
import { SettingsModal } from './components/settings/SettingsModal';
import { RacingGameView } from './components/racing/RacingGameView';

type AppScreen = 'menu' | 'racing' | 'garage' | 'upgrades' | 'tracks' | 'career' | 'profile';

export default function App() {
  const [screen, setScreen] = useState<AppScreen>('menu');
  const [profile, setProfile] = useState<PlayerProfile>(() => StorageService.loadProfile());
  const [settings, setSettings] = useState<GameSettings>(() => StorageService.loadSettings());
  const [showSettings, setShowSettings] = useState(false);

  // Active Race Configuration
  const [selectedTrack, setSelectedTrack] = useState<TrackConfig>(TRACKS_DATA[0]);
  const [selectedMode, setSelectedMode] = useState<GameMode>('quick');
  const [selectedCareerRace, setSelectedCareerRace] = useState<CareerRace | undefined>(undefined);
  const [upgradeInitialCarId, setUpgradeInitialCarId] = useState<string>('street_hawk');

  // Initialize audio config with loaded settings
  useEffect(() => {
    audioEngine.updateConfig(
      settings.soundEnabled,
      settings.musicEnabled,
      settings.soundVolume,
      settings.musicVolume
    );
  }, []);

  // Global first-touch listener to initialize Web Audio API
  useEffect(() => {
    const handleFirstUserGesture = () => {
      audioEngine.init();
      window.removeEventListener('click', handleFirstUserGesture);
      window.removeEventListener('touchstart', handleFirstUserGesture);
    };
    window.addEventListener('click', handleFirstUserGesture);
    window.addEventListener('touchstart', handleFirstUserGesture);
    return () => {
      window.removeEventListener('click', handleFirstUserGesture);
      window.removeEventListener('touchstart', handleFirstUserGesture);
    };
  }, []);

  const handleUpdateProfile = (newProfile: PlayerProfile) => {
    setProfile(newProfile);
    StorageService.saveProfile(newProfile);
  };

  const handleUpdateSettings = (newSettings: GameSettings) => {
    setSettings(newSettings);
    StorageService.saveSettings(newSettings);
  };

  const handleResetProgress = () => {
    const fresh = StorageService.resetAllProgress();
    setProfile(fresh);
  };

  // Launch quick/track race
  const handleStartRace = (track: TrackConfig, mode: GameMode) => {
    setSelectedTrack(track);
    setSelectedMode(mode);
    setSelectedCareerRace(undefined);
    setScreen('racing');
  };

  // Launch career race
  const handleSelectCareerRace = (race: CareerRace) => {
    const track = TRACKS_DATA.find(t => t.id === race.trackId) || TRACKS_DATA[0];
    setSelectedTrack(track);
    setSelectedMode('career');
    setSelectedCareerRace(race);
    setScreen('racing');
  };

  // Active car
  const activeCar = CARS_DATA.find(c => c.id === profile.currentCarId) || CARS_DATA[0];

  return (
    <div className="relative w-full h-[100dvh] overflow-hidden bg-vibrant-gradient bg-vibrant-grid text-white">
      {/* SCREEN ROUTING */}
      {screen === 'menu' && (
        <MainMenu
          profile={profile}
          settings={settings}
          onPlayCareer={() => setScreen('career')}
          onQuickRace={() => {
            handleStartRace(selectedTrack || TRACKS_DATA[0], 'quick');
          }}
          onOpenTracks={() => setScreen('tracks')}
          onOpenGarage={() => setScreen('garage')}
          onOpenUpgrades={() => {
            setUpgradeInitialCarId(profile.currentCarId);
            setScreen('upgrades');
          }}
          onOpenProfile={() => setScreen('profile')}
          onOpenSettings={() => setShowSettings(true)}
        />
      )}

      {screen === 'racing' && (
        <RacingGameView
          track={selectedTrack}
          car={activeCar}
          mode={selectedMode}
          careerRace={selectedCareerRace}
          profile={profile}
          settings={settings}
          onUpdateProfile={handleUpdateProfile}
          onUpdateSettings={handleUpdateSettings}
          onExitToMenu={() => setScreen('menu')}
          onGoToGarage={() => setScreen('garage')}
        />
      )}

      {screen === 'garage' && (
        <GarageScreen
          profile={profile}
          onUpdateProfile={handleUpdateProfile}
          onBack={() => setScreen('menu')}
          onGoToUpgrades={(carId) => {
            setUpgradeInitialCarId(carId);
            setScreen('upgrades');
          }}
        />
      )}

      {screen === 'upgrades' && (
        <UpgradeScreen
          profile={profile}
          initialCarId={upgradeInitialCarId}
          onUpdateProfile={handleUpdateProfile}
          onBack={() => setScreen('garage')}
        />
      )}

      {screen === 'tracks' && (
        <TrackSelectScreen
          profile={profile}
          onStartRace={handleStartRace}
          onBack={() => setScreen('menu')}
        />
      )}

      {screen === 'career' && (
        <CareerModeScreen
          profile={profile}
          onSelectCareerRace={handleSelectCareerRace}
          onBack={() => setScreen('menu')}
        />
      )}

      {screen === 'profile' && (
        <ProfileScreen
          profile={profile}
          onUpdateProfile={handleUpdateProfile}
          onBack={() => setScreen('menu')}
        />
      )}

      {/* SETTINGS MODAL */}
      {showSettings && (
        <SettingsModal
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          onResetProgress={handleResetProgress}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
