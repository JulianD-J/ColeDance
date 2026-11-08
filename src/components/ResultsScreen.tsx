import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { Song, Coach, Player } from '../types/game';
import { generateGeminiDanceReview } from '../services/geminiService';
import { soundEngine } from '../services/soundEffects';
import { getRankConfig, getRankForScore } from '../services/momentumScoring';
import {
  Card,
  CardContent,
  Button,
  Avatar,
  Badge,
  Progress,
  CircularProgress,
  Tooltip,
} from './ui';

interface ResultsScreenProps {
  song: Song;
  coach: Coach;
  players: Player[];
  onPlayAgain: () => void;
  onReturnHome: () => void;
}

export const ResultsScreen: React.FC<ResultsScreenProps> = ({
  song,
  coach,
  players,
  onPlayAgain,
  onReturnHome,
}) => {
  const [aiReview, setAiReview] = useState<string>('Generating Coach AI Review...');
  const [confettiFired, setConfettiFired] = useState(false);

  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  const topPlayer = sortedPlayers[0];

  useEffect(() => {
    if (!confettiFired) {
      setConfettiFired(true);
      // Confetti burst
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.5 },
        colors: ['#d91e6d', '#f59e0b', '#0ea5e9', '#22c55e', '#a855f7'],
        scalar: 1.2,
      });
      // Second burst
      setTimeout(() => {
        confetti({
          particleCount: 80,
          spread: 120,
          origin: { y: 0.3, x: 0.2 },
          colors: ['#d91e6d', '#f59e0b'],
        });
        confetti({
          particleCount: 80,
          spread: 120,
          origin: { y: 0.3, x: 0.8 },
          colors: ['#0ea5e9', '#a855f7'],
        });
      }, 300);
      soundEngine.playStarUnlock();

      // Generate Gemini Review
      const perfectCount = Math.floor(topPlayer.score / 300);
      const playerNames = players.map((p) => p.name);

      generateGeminiDanceReview(
        song.title,
        song.artist,
        topPlayer.score,
        topPlayer.stars,
        perfectCount,
        playerNames
      ).then((review) => {
        setAiReview(review);
      });
    }
  }, [song, players, confettiFired]);

  const podiumPositions = [
    { x: 0, y: 0, scale: 1.15, z: 30, place: '1st', color: 'from-sun-400 to-sun-500', glow: 'shadow-sun-glow' },
    { x: -1, y: 0.15, scale: 1, z: 20, place: '2nd', color: 'from-slate-400 to-slate-500', glow: '' },
    { x: 1, y: 0.25, scale: 0.85, z: 10, place: '3rd', color: 'from-amber-700 to-amber-800', glow: '' },
  ];

  return (
    <motion.section
      className="flex-1 flex flex-col items-center justify-center p-4 select-none max-w-6xl mx-auto space-y-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      {/* Title */}
      <motion.div
        className="text-center space-y-3"
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <motion.span
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-500/20 text-brand-400 text-label-small font-black uppercase tracking-widest border border-brand-500/30"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 17 }}
        >
          <motion.span className="w-2 h-2 rounded-full bg-brand-400 animate-ping" />
          ROUTINE COMPLETED
        </motion.span>
        <motion.h1
          className="text-display-large md:text-display-medium font-black italic text-transparent bg-clip-text bg-gradient-to-r from-brand-500 via-sun-400 to-accent-400 drop-shadow-[0_0_30px_rgba(217,30,109,0.8)]"
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.15, type: 'spring', stiffness: 400, damping: 17 }}
        >
          MEGASTAR RESULTS
        </motion.h1>
        <motion.p
          className="text-body-large font-semibold text-on-surface/80"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {song.title} - {song.artist}
        </motion.p>
      </motion.div>

      {/* Leaderboard Podiums */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        {sortedPlayers.map((p, idx) => {
          const rank = p.rank || getRankForScore(p.score);
          const rankCfg = getRankConfig(rank);
          const peakMultiplier = p.multiplier || 1;
          const bestStreak = p.maxStreak || p.streak || 0;
          const podiumPos = podiumPositions[idx] || podiumPositions[2];
          const isWinner = idx === 0;

          return (
            <motion.article
              key={p.id}
              className={`
                relative p-6 rounded-3xl backdrop-blur-xl border flex flex-col items-center space-y-4
                ${isWinner
                  ? 'bg-gradient-to-b from-sun-500/20 via-purple-900/50 to-indigo-950 border-sun-400/50 ring-2 ring-sun-400/30'
                  : 'bg-surface-1/80 border-outline-variant'
                }
                shadow-level-3
                transition-all motion-spring
              `}
              style={{ zIndex: podiumPos.z }}
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.1 * (idx + 1), type: 'spring', stiffness: 500, damping: 30 }}
              whileHover={{ y: -8, scale: isWinner ? 1.02 : 1.03 }}
            >
              {isWinner && (
                <motion.div
                  className="absolute -top-6 left-1/2 -translate-x-1/2"
                  initial={{ opacity: 0, scale: 0.5, rotate: -12 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 17, delay: 0.3 }}
                >
                  <Badge variant="warning" size="md" className="shadow-sun-glow">
                    👑 WINNER
                  </Badge>
                </motion.div>
              )}

              {/* Podium Base */}
              <motion.div
                className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-4 rounded-t-lg"
                style={{
                  background: `linear-gradient(135deg, ${podiumPos.color})`,
                  transform: `translateY(${podiumPos.y * 100}%) scale(${podiumPos.scale})`,
                }}
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ delay: 0.2 * (idx + 1), type: 'spring', stiffness: 400, damping: 20 }}
              />

              {/* Avatar */}
              <motion.div
                className="relative z-10"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 * (idx + 1) }}
              >
                <div
                  className="w-28 h-28 md:w-32 md:h-32 rounded-full p-1.5 shadow-level-3"
                  style={{ background: `linear-gradient(135deg, ${p.color}, #0ea5e9)` }}
                >
                  <Avatar
                    src={`https://api.dicebear.com/7.x/bottts/svg?seed=${p.avatarSeed}`}
                    alt={p.name}
                    name={p.name}
                    size="4xl"
                    border
                    borderColor={isWinner ? 'sun' : 'white'}
                  />
                </div>
                {isWinner && (
                  <motion.div
                    className="absolute -bottom-2 right-2 w-8 h-8 rounded-full bg-sun-400 flex items-center justify-center text-white shadow-level-2 animate-ping"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                  </motion.div>
                )}
              </motion.div>

              <div className="text-center space-y-3 w-full">
                <motion.div
                  className="font-black italic text-headline-small text-white"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {p.name}
                </motion.div>

                {/* ColeDance Prestige Rank Crest */}
                <motion.div
                  className="flex justify-center"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 17 }}
                >
                  <div
                    className={`
                      px-4 py-1.5 rounded-full text-label-medium font-black tracking-wider text-black
                      bg-gradient-to-r ${rankCfg.gradient} border border-white/40
                      shadow-level-2 flex items-center gap-2
                    `}
                    style={{ boxShadow: `0 0 20px ${rankCfg.badgeColor}` }}
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                    <span>{rankCfg.rank.toUpperCase()}</span>
                  </div>
                </motion.div>

                <motion.div
                  className="text-3xl md:text-4xl font-black text-sun-400 drop-shadow-[0_0_20px_rgba(245,158,11,0.5)] tabular-nums"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 17, delay: 0.1 }}
                >
                  {p.score.toLocaleString()} PTS
                </motion.div>

                {/* Stars Meter */}
                <motion.div
                  className="flex justify-center text-sun-400 text-xl space-x-1"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  {Array.from({ length: Math.min(5, p.stars) }).map((_, i) => (
                    <motion.span
                      key={i}
                      className="drop-shadow-[0_0_8px_rgba(245,158,11,0.9)]"
                      initial={{ opacity: 0, scale: 0, rotate: -90 }}
                      animate={{ opacity: 1, scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 10, delay: 0.05 * i }}
                    >
                      <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                    </motion.span>
                  ))}
                  {p.stars >= 6 && (
                    <motion.span
                      className="text-label-small font-black bg-gradient-to-r from-sun-400 to-brand-500 text-black px-3 py-1 rounded shadow-level-2"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 17 }}
                    >
                      {p.stars === 7 ? 'MEGASTAR' : 'SUPERSTAR'}
                    </motion.span>
                  )}
                </motion.div>

                {/* Routine Stats: Multiplier and Streak */}
                <motion.div
                  className="grid grid-cols-2 gap-3 pt-2 border-t border-outline-variant text-center w-full"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                >
                  <div className="p-4 rounded-2xl bg-surface-0/50 border border-outline-variant">
                    <div className="text-label-small text-on-surface-variant font-bold uppercase tracking-wider">Max Streak</div>
                    <div className="text-title-medium font-black text-sun-400 flex items-center justify-center gap-1 mt-1">
                      <span className="tabular-nums">{bestStreak}</span>
                      <svg className="w-5 h-5 text-sun-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" /></svg>
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-surface-0/50 border border-outline-variant">
                    <div className="text-label-small text-on-surface-variant font-bold uppercase tracking-wider">Multiplier</div>
                    <motion.div
                      className={`
                        text-title-medium font-black flex items-center justify-center gap-1
                        ${peakMultiplier >= 4 ? 'text-error-400' : peakMultiplier >= 3 ? 'text-sun-400' : peakMultiplier >= 2 ? 'text-accent-400' : 'text-on-surface-variant'}
                      `}
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 17 }}
                      whileHover={{ scale: 1.1 }}
                    >
                      x{peakMultiplier} {peakMultiplier >= 4 && <span className="text-label-small font-black bg-error-500 text-white px-1.5 py-0.5 rounded">MAX</span>}
                    </motion.div>
                  </div>
                </motion.div>
              </div>
            </motion.article>
          );
        })}
      </motion.div>

      {/* Gemini AI Coach Review Card */}
      <motion.div
        className="w-full p-6 rounded-3xl bg-gradient-to-r from-purple-900/60 via-indigo-900/60 to-brand-900/60 border border-brand-500/30 shadow-level-4 space-y-4"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <motion.div
          className="flex items-center gap-3 text-brand-400 font-black text-label-small uppercase tracking-wider"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <motion.svg className="w-5 h-5 text-sun-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" initial={{ rotate: -180, scale: 0 }} animate={{ rotate: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 17 }}>
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </motion.svg>
          <span>GEMINI AI DANCE COACH REVIEW</span>
        </motion.div>
        <motion.p
          className="text-body-medium md:text-body-large italic font-medium text-white/90 leading-relaxed"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          "{aiReview}"
        </motion.p>
      </motion.div>

      {/* Action Buttons */}
      <motion.div
        className="flex items-center justify-center space-x-4 pt-2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Tooltip content="Play this routine again" position="top">
          <Button
            variant="primary"
            size="xl"
            leadingIcon={<svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M23 4v6h-6" /><path d="M1 20v-6h6" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>}
            onClick={() => { soundEngine.playClick(); onPlayAgain(); }}
            className="shadow-brand-glow-lg hover:shadow-brand-glow"
          >
            REPLAY ROUTINE
          </Button>
        </Tooltip>

        <Tooltip content="Return to main menu" position="top">
          <Button
            variant="outlined"
            size="lg"
            leadingIcon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>}
            onClick={() => { soundEngine.playClick(); onReturnHome(); }}
          >
            MAIN MENU
          </Button>
        </Tooltip>
      </motion.div>
    </motion.section>
  );
};

export default ResultsScreen;