export type GameMode = 'quick' | 'career' | 'time_trial' | 'championship' | 'endless';

export type TrackTheme = 'neon_city' | 'desert_storm' | 'mountain_rush' | 'coastal_drive' | 'cyber_circuit';

export interface CarBaseStats {
  speed: number; // 0-100 base
  acceleration: number; // 0-100 base
  handling: number; // 0-100 base
  braking: number; // 0-100 base
  nitro: number; // 0-100 base
}

export interface CarUpgradeLevels {
  engine: number; // 1-5
  turbo: number; // 1-5
  tires: number; // 1-5
  brakes: number; // 1-5
  handling: number; // 1-5
  nitro: number; // 1-5
}

export interface CarConfig {
  id: string;
  name: string;
  subtitle: string;
  tier: 'D' | 'C' | 'B' | 'A' | 'S';
  price: number;
  unlockedByDefault?: boolean;
  unlockLevel: number;
  stats: CarBaseStats;
  color: string;
  availableColors: string[];
  description: string;
  bodyStyle: 'coupe' | 'supercar' | 'hypercar' | 'muscle' | 'cyber';
  accentColor: string;
}

export interface TrackConfig {
  id: string;
  name: string;
  subtitle: string;
  theme: TrackTheme;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'EXTREME';
  lengthKm: number;
  laps: number;
  description: string;
  skyColor: string;
  groundColor: string;
  roadColor: string;
  kerbColor1: string;
  kerbColor2: string;
  accentColor: string;
  fogDensity: number;
  musicBpm: number;
  unlockRequirement?: {
    level?: number;
    careerStars?: number;
  };
}

export interface OpponentConfig {
  name: string;
  carId: string;
  color: string;
  skillLevel: number; // 0.6 - 1.2 multiplier
  aggressiveness: number;
}

export interface PlayerCarState {
  unlocked: boolean;
  upgrades: CarUpgradeLevels;
  color: string;
  underglow: string;
  rimColor: string;
}

export interface CareerRace {
  id: string;
  title: string;
  subtitle: string;
  chapter: number;
  trackId: string;
  laps: number;
  opponentsCount: number;
  requiredStars: number;
  rewardCoins: number;
  rewardXp: number;
  targetPosition: number; // e.g. 1 for 1st, 3 for podium
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  category: 'RACING' | 'SPEED' | 'COLLECTION' | 'UPGRADES';
  rewardCoins: number;
  rewardXp: number;
  unlocked: boolean;
  claimed: boolean;
  progress: number;
  maxProgress: number;
}

export interface PlayerProfile {
  name: string;
  avatar: string;
  level: number;
  xp: number;
  coins: number;
  totalRaces: number;
  wins: number;
  podiums: number;
  totalDistanceKm: number;
  topSpeedKmh: number;
  favoriteCarId: string;
  currentCarId: string;
  cars: Record<string, PlayerCarState>;
  bestTimes: Record<string, number>; // trackId -> ms
  careerStars: Record<string, number>; // raceId -> stars (1-3)
  achievements: Record<string, { unlocked: boolean; claimed: boolean; progress: number }>;
}

export interface GameSettings {
  soundEnabled: boolean;
  musicEnabled: boolean;
  soundVolume: number; // 0-1
  musicVolume: number; // 0-1
  graphicsQuality: 'low' | 'medium' | 'high';
  controlType: 'touch_buttons' | 'touch_slider' | 'tilt';
  steeringSensitivity: number; // 0.5 - 1.5
  cameraDistance: 'close' | 'normal' | 'far';
  vibrationEnabled: boolean;
}

export interface RaceResultData {
  trackId: string;
  mode: GameMode;
  position: number;
  totalRacers: number;
  totalTimeMs: number;
  bestLapMs: number;
  topSpeedKmh: number;
  coinsEarned: number;
  xpEarned: number;
  starsEarned: number;
  isNewBestTime: boolean;
  driftPoints: number;
  nitroUsedSeconds: number;
  careerRaceId?: string;
}
