import { ColeDanceRank, Player } from '../types/game';

export interface MomentumScoreResult {
  awardedPoints: number;
  newScore: number;
  newMomentum: number;
  newMultiplier: number;
  multiplierUpgraded: boolean;
  newStreak: number;
  newMaxStreak: number;
  newRank: ColeDanceRank;
  rankPromoted: boolean;
  velocityBonusPercent: number;
}

export interface RankConfig {
  rank: ColeDanceRank;
  name: string;
  minPoints: number;
  badgeColor: string;
  gradient: string;
  borderGlow: string;
  icon: string;
  tagline: string;
}

export const COLEDANCE_RANKS: RankConfig[] = [
  {
    rank: 'Bronze',
    name: 'Bronze Dancer',
    minPoints: 0,
    badgeColor: '#cd7f32',
    gradient: 'from-amber-700 via-amber-800 to-amber-950',
    borderGlow: 'border-amber-600/70 shadow-[0_0_15px_rgba(205,127,50,0.4)]',
    icon: 'fa-shield-halved',
    tagline: 'Warm-up groove in motion',
  },
  {
    rank: 'Silver',
    name: 'Silver Groove',
    minPoints: 2500,
    badgeColor: '#c0c0c0',
    gradient: 'from-slate-400 via-zinc-500 to-slate-700',
    borderGlow: 'border-slate-300 shadow-[0_0_18px_rgba(192,192,192,0.5)]',
    icon: 'fa-award',
    tagline: 'Smooth rhythmic coordination',
  },
  {
    rank: 'Gold',
    name: 'Gold Megastar',
    minPoints: 5500,
    badgeColor: '#ffd700',
    gradient: 'from-amber-400 via-yellow-500 to-amber-600',
    borderGlow: 'border-yellow-300 shadow-[0_0_25px_rgba(255,215,0,0.6)]',
    icon: 'fa-star',
    tagline: 'Electric high-momentum performance',
  },
  {
    rank: 'Diamond',
    name: 'Diamond Elite',
    minPoints: 9000,
    badgeColor: '#00d2ff',
    gradient: 'from-cyan-400 via-sky-500 to-indigo-600',
    borderGlow: 'border-cyan-300 shadow-[0_0_30px_rgba(0,210,255,0.7)]',
    icon: 'fa-gem',
    tagline: 'Flawless precision mastery',
  },
  {
    rank: 'Legend',
    name: 'Legend of ColeDance',
    minPoints: 12000,
    badgeColor: '#ff1493',
    gradient: 'from-pink-500 via-purple-600 to-amber-400',
    borderGlow: 'border-pink-400 shadow-[0_0_35px_rgba(255,20,147,0.85)]',
    icon: 'fa-crown',
    tagline: 'Supreme dancing mastery achieved',
  },
];

export function getRankForScore(score: number): ColeDanceRank {
  if (score >= 12000) return 'Legend';
  if (score >= 9000) return 'Diamond';
  if (score >= 5500) return 'Gold';
  if (score >= 2500) return 'Silver';
  return 'Bronze';
}

export function getRankConfig(rank: ColeDanceRank): RankConfig {
  return COLEDANCE_RANKS.find((r) => r.rank === rank) || COLEDANCE_RANKS[0];
}

/**
 * Unique ColeDance Scoring Engine
 * Evaluates points based on Move Accuracy, Dynamic Momentum Gauge, and 1x-4x Combo Multiplier.
 */
export function calculateMomentumMoveScore(
  player: Player,
  feedback: 'PERFECT' | 'SUPER' | 'GOOD' | 'OK' | 'MISS',
  motionVelocity: number = 0.25
): MomentumScoreResult {
  const currentMomentum = player.momentum ?? 0;
  const currentMultiplier = player.multiplier ?? 1;
  const currentStreak = player.streak ?? 0;
  const currentMaxStreak = player.maxStreak ?? currentStreak;
  const currentRank = player.rank ?? getRankForScore(player.score);

  // 1. Determine base points & momentum delta
  let basePoints = 0;
  let momentumDelta = 0;
  let isMiss = false;

  switch (feedback) {
    case 'PERFECT':
      basePoints = 100;
      momentumDelta = 25;
      break;
    case 'SUPER':
      basePoints = 75;
      momentumDelta = 16;
      break;
    case 'GOOD':
      basePoints = 45;
      momentumDelta = 8;
      break;
    case 'OK':
      basePoints = 20;
      momentumDelta = 0;
      break;
    case 'MISS':
    default:
      basePoints = 0;
      momentumDelta = -35;
      isMiss = true;
      break;
  }

  // 2. Compute new momentum (clamped 0 to 100%)
  const newMomentum = Math.max(0, Math.min(100, currentMomentum + momentumDelta));

  // 3. Compute new streak
  const newStreak = isMiss ? 0 : currentStreak + 1;
  const newMaxStreak = Math.max(currentMaxStreak, newStreak);

  // 4. Compute active combo multiplier (1x to 4x Overdrive)
  let newMultiplier = 1;
  if (newStreak >= 16 || newMomentum >= 95) {
    newMultiplier = 4; // Overdrive
  } else if (newStreak >= 10 || newMomentum >= 65) {
    newMultiplier = 3;
  } else if (newStreak >= 5 || newMomentum >= 30) {
    newMultiplier = 2;
  } else {
    newMultiplier = 1;
  }

  const multiplierUpgraded = newMultiplier > currentMultiplier;

  // 5. Energetic physical execution velocity bonus (0% up to +15%)
  let velocityBonusPercent = 0;
  if (!isMiss && motionVelocity > 0.35) {
    velocityBonusPercent = Math.min(15, Math.round((motionVelocity - 0.35) * 40));
  }

  // 6. Calculate total move points
  const rawPoints = basePoints * newMultiplier * (1 + velocityBonusPercent / 100);
  const awardedPoints = Math.round(rawPoints);
  const newScore = player.score + awardedPoints;

  // 7. Determine rank advancement
  const newRank = getRankForScore(newScore);
  const rankPromoted = newRank !== currentRank && newScore >= (getRankConfig(newRank).minPoints);

  return {
    awardedPoints,
    newScore,
    newMomentum,
    newMultiplier,
    multiplierUpgraded,
    newStreak,
    newMaxStreak,
    newRank,
    rankPromoted,
    velocityBonusPercent,
  };
}
