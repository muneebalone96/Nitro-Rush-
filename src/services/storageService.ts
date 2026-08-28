import { PlayerProfile, GameSettings, CarUpgradeLevels, RaceResultData } from '../types/game';
import { DEFAULT_PROFILE, DEFAULT_SETTINGS, ACHIEVEMENTS_DATA, UPGRADE_COSTS, CARS_DATA } from '../data/gameData';

const PROFILE_STORAGE_KEY = 'nitro_rush_profile_v1';
const SETTINGS_STORAGE_KEY = 'nitro_rush_settings_v1';

export class StorageService {
  public static loadProfile(): PlayerProfile {
    try {
      const saved = localStorage.getItem(PROFILE_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Merge with defaults to ensure missing fields are populated safely
        return {
          ...DEFAULT_PROFILE,
          ...parsed,
          cars: {
            ...DEFAULT_PROFILE.cars,
            ...(parsed.cars || {}),
          },
          careerStars: {
            ...DEFAULT_PROFILE.careerStars,
            ...(parsed.careerStars || {}),
          },
          bestTimes: {
            ...DEFAULT_PROFILE.bestTimes,
            ...(parsed.bestTimes || {}),
          },
          achievements: {
            ...DEFAULT_PROFILE.achievements,
            ...(parsed.achievements || {}),
          },
        };
      }
    } catch {
      // LocalStorage access error
    }
    return DEFAULT_PROFILE;
  }

  public static saveProfile(profile: PlayerProfile): void {
    try {
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
    } catch {
      // Ignored
    }
  }

  public static loadSettings(): GameSettings {
    try {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      }
    } catch {
      // Ignored
    }
    return DEFAULT_SETTINGS;
  }

  public static saveSettings(settings: GameSettings): void {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Ignored
    }
  }

  public static resetAllProgress(): PlayerProfile {
    try {
      localStorage.removeItem(PROFILE_STORAGE_KEY);
    } catch {
      // Ignored
    }
    return DEFAULT_PROFILE;
  }

  public static processRaceResults(profile: PlayerProfile, result: RaceResultData): { updatedProfile: PlayerProfile; leveledUp: boolean; newLevel: number } {
    const updated = { ...profile };

    // Update Coin balance & XP
    updated.coins += result.coinsEarned;
    updated.xp += result.xpEarned;
    updated.totalRaces += 1;

    if (result.position === 1) {
      updated.wins += 1;
    }
    if (result.position <= 3) {
      updated.podiums += 1;
    }

    if (result.topSpeedKmh > updated.topSpeedKmh) {
      updated.topSpeedKmh = result.topSpeedKmh;
    }

    // Save best time
    const prevBest = updated.bestTimes[result.trackId];
    if (!prevBest || result.bestLapMs < prevBest) {
      updated.bestTimes[result.trackId] = result.bestLapMs;
    }

    // Update Career Stars
    if (result.careerRaceId && result.starsEarned > 0) {
      const prevStars = updated.careerStars[result.careerRaceId] || 0;
      if (result.starsEarned > prevStars) {
        updated.careerStars[result.careerRaceId] = result.starsEarned;
      }
    }

    // Level up calculation: XP required = level * 1000
    const prevLevel = updated.level;
    let requiredXpForNext = updated.level * 1000;
    while (updated.xp >= requiredXpForNext) {
      updated.xp -= requiredXpForNext;
      updated.level += 1;
      requiredXpForNext = updated.level * 1000;
    }
    const leveledUp = updated.level > prevLevel;

    // Check Achievements progress
    this.updateAchievements(updated, result);

    this.saveProfile(updated);
    return { updatedProfile: updated, leveledUp, newLevel: updated.level };
  }

  private static updateAchievements(profile: PlayerProfile, result: RaceResultData) {
    if (!profile.achievements) profile.achievements = {};

    ACHIEVEMENTS_DATA.forEach((ach) => {
      let currentProg = profile.achievements[ach.id]?.progress || 0;
      let unlocked = profile.achievements[ach.id]?.unlocked || false;
      const claimed = profile.achievements[ach.id]?.claimed || false;

      if (ach.id === 'first_victory' && result.position === 1) {
        currentProg = 1;
        unlocked = true;
      } else if (ach.id === 'speed_demon') {
        currentProg = Math.max(currentProg, result.topSpeedKmh);
        if (currentProg >= ach.maxProgress) unlocked = true;
      } else if (ach.id === 'nitro_master') {
        currentProg += result.nitroUsedSeconds;
        if (currentProg >= ach.maxProgress) unlocked = true;
      } else if (ach.id === 'ten_wins') {
        currentProg = profile.wins;
        if (currentProg >= ach.maxProgress) unlocked = true;
      } else if (ach.id === 'car_collector') {
        const unlockedCarsCount = Object.values(profile.cars).filter(c => c.unlocked).length;
        currentProg = unlockedCarsCount;
        if (currentProg >= ach.maxProgress) unlocked = true;
      } else if (ach.id === 'track_legend') {
        const totalStars = Object.values(profile.careerStars).reduce((a, b) => a + b, 0);
        currentProg = totalStars;
        if (currentProg >= ach.maxProgress) unlocked = true;
      }

      profile.achievements[ach.id] = {
        progress: currentProg,
        unlocked,
        claimed,
      };
    });
  }

  public static buyCar(profile: PlayerProfile, carId: string): { success: boolean; updatedProfile: PlayerProfile; message: string } {
    const carData = CARS_DATA.find(c => c.id === carId);
    if (!carData) return { success: false, updatedProfile: profile, message: 'Car not found' };

    if (profile.coins < carData.price) {
      return { success: false, updatedProfile: profile, message: 'Not enough coins!' };
    }

    const updated = { ...profile };
    updated.coins -= carData.price;
    updated.cars[carId] = {
      unlocked: true,
      upgrades: { engine: 1, turbo: 1, tires: 1, brakes: 1, handling: 1, nitro: 1 },
      color: carData.color,
      underglow: carData.accentColor,
      rimColor: '#e0e0e0',
    };
    updated.currentCarId = carId;

    this.saveProfile(updated);
    return { success: true, updatedProfile: updated, message: `${carData.name} Unlocked!` };
  }

  public static upgradeCarPart(
    profile: PlayerProfile,
    carId: string,
    part: keyof CarUpgradeLevels
  ): { success: boolean; updatedProfile: PlayerProfile; message: string } {
    const carState = profile.cars[carId];
    if (!carState || !carState.unlocked) {
      return { success: false, updatedProfile: profile, message: 'Car is locked' };
    }

    const currentLevel = carState.upgrades[part] || 1;
    if (currentLevel >= 5) {
      return { success: false, updatedProfile: profile, message: 'Already max level!' };
    }

    const nextLevel = currentLevel + 1;
    const cost = UPGRADE_COSTS[nextLevel] || 2000;

    if (profile.coins < cost) {
      return { success: false, updatedProfile: profile, message: `Need ${cost.toLocaleString()} coins!` };
    }

    const updated = { ...profile };
    updated.coins -= cost;
    updated.cars[carId] = {
      ...carState,
      upgrades: {
        ...carState.upgrades,
        [part]: nextLevel,
      },
    };

    // Check apex tuner achievement
    if (nextLevel === 5) {
      if (!updated.achievements['max_tuner']) {
        updated.achievements['max_tuner'] = { unlocked: true, claimed: false, progress: 5 };
      } else {
        updated.achievements['max_tuner'].unlocked = true;
        updated.achievements['max_tuner'].progress = 5;
      }
    }

    this.saveProfile(updated);
    return { success: true, updatedProfile: updated, message: `${part.toUpperCase()} Upgraded to Lv.${nextLevel}!` };
  }

  public static claimAchievement(profile: PlayerProfile, achId: string): { success: boolean; updatedProfile: PlayerProfile; coins: number; xp: number } {
    const achData = ACHIEVEMENTS_DATA.find(a => a.id === achId);
    const achState = profile.achievements[achId];

    if (!achData || !achState || !achState.unlocked || achState.claimed) {
      return { success: false, updatedProfile: profile, coins: 0, xp: 0 };
    }

    const updated = { ...profile };
    updated.coins += achData.rewardCoins;
    updated.xp += achData.rewardXp;
    updated.achievements[achId].claimed = true;

    this.saveProfile(updated);
    return { success: true, updatedProfile: updated, coins: achData.rewardCoins, xp: achData.rewardXp };
  }
}
