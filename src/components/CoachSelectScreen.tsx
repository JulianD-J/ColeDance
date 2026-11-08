import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Song, Coach, Player } from '../types/game';
import { soundEngine } from '../services/soundEffects';
import {
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Button,
  IconButton,
  Avatar,
  Badge,
  Chip,
  Tooltip,
} from './ui';

interface CoachSelectScreenProps {
  song: Song;
  players?: Player[];
  onSelectCoachAndStart: (coach: Coach, playerCoachAssignments?: Record<string, number>) => void;
  onBackToCatalog: () => void;
}

export const CoachSelectScreen: React.FC<CoachSelectScreenProps> = ({
  song,
  players = [],
  onSelectCoachAndStart,
  onBackToCatalog,
}) => {
  // Use all coaches defined for the song (1 to 5 coaches)
  const coachesList: Coach[] =
    song.coaches && song.coaches.length > 0
      ? song.coaches
      : [
          {
            id: 'c1',
            name: 'Coach 1',
            avatarSeed: 'CoachLead',
            routineName: 'Routine A',
            difficulty: song.difficulty || 'Medium',
            colorGradient: 'from-brand-500 via-purple-600 to-indigo-900',
            coachIndex: 0,
          },
        ];

  // State for which coach each player is assigned to
  const [playerAssignments, setPlayerAssignments] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    players.forEach((p, idx) => {
      initial[p.id] = (p.assignedCoachIndex ?? idx) % coachesList.length;
    });
    return initial;
  });

  const [activePlayerForPick, setActivePlayerForPick] = useState<string>(
    players[0]?.id || 'host-player'
  );

  const handleSelectCoachForActivePlayer = (coachIdx: number) => {
    soundEngine.playClick();
    setPlayerAssignments((prev) => ({
      ...prev,
      [activePlayerForPick]: coachIdx,
    }));
  };

  const handleStartGame = () => {
    soundEngine.playClick();
    const primaryCoachIdx = playerAssignments[players[0]?.id] ?? 0;
    const selectedCoach = coachesList[primaryCoachIdx] || coachesList[0];
    onSelectCoachAndStart(selectedCoach, playerAssignments);
  };

  const diffColorMap: Record<string, 'success' | 'warning' | 'error'> = {
    Easy: 'success',
    Medium: 'success',
    Hard: 'warning',
    Extreme: 'error',
  };

  return (
    <motion.section
      className="flex-1 flex flex-col items-center justify-between space-y-6 py-6 relative max-w-7xl mx-auto w-full px-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      {/* Top Bar with Back Button and Song Details */}
      <motion.div
        className="w-full flex items-center justify-between px-2"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Tooltip content="Back to Song Library" position="right">
          <Button
            variant="secondary"
            size="sm"
            leadingIcon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>}
            onClick={() => { soundEngine.playClick(); onBackToCatalog(); }}
          >
            BACK TO LIBRARY
          </Button>
        </Tooltip>

        <motion.div className="text-center flex-1" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <h1 className="text-headline-large font-black italic text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-sun-400 drop-shadow-[0_0_20px_rgba(217,30,109,0.8)]">
            Select Your Coach
          </h1>
          <p className="text-body-medium font-semibold text-on-surface/80 mt-1">
            {song.title} — {song.artist} •{' '}
            <span className="text-accent-400 font-black uppercase">
              {coachesList.length} {coachesList.length === 1 ? 'Coach' : 'Coaches'} Available
            </span>
          </p>
        </motion.div>

        <div className="w-24" />
      </motion.div>

      {/* Multi-Player Switcher Header if more than 1 player is connected */}
      {players.length > 1 && (
        <motion.div
          className="flex items-center gap-3 bg-surface-1/50 backdrop-blur-xl rounded-2xl border border-outline-variant px-4 py-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <span className="text-label-small font-black uppercase text-on-surface-variant tracking-wider">Choose Coach for:</span>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {players.map((p) => {
              const isSelected = activePlayerForPick === p.id;
              const assignedIdx = playerAssignments[p.id] ?? 0;
              const coachName = coachesList[assignedIdx]?.name || `Coach ${assignedIdx + 1}`;

              return (
                <Tooltip key={p.id} content={`${p.name} → ${coachName}`} position="bottom">
                  <motion.button
                    onClick={() => { soundEngine.playClick(); setActivePlayerForPick(p.id); }}
                    className={`
                      flex items-center gap-2 px-3 py-2 rounded-xl text-label-small font-semibold shrink-0
                      transition-all motion-spring
                      ${isSelected
                        ? 'bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-brand-glow'
                        : 'bg-surface-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-3'
                      }
                    `}
                    whileTap={{ scale: 0.97 }}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 * players.indexOf(p) }}
                  >
                    <Avatar
                      src={`https://api.dicebear.com/7.x/bottts/svg?seed=${p.avatarSeed}`}
                      alt={p.name}
                      name={p.name}
                      size="xs"
                      border
                      borderColor={isSelected ? 'brand' : 'white'}
                    />
                    <span>{p.name.split(' ')[0]}</span>
                    <Badge variant="secondary" size="sm">{coachName}</Badge>
                  </motion.button>
                </Tooltip>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* 1 to 5 Coaches Grid */}
      <motion.div
        className={`
          flex flex-wrap items-center justify-center gap-5 md:gap-7 w-full
          ${coachesList.length <= 2 ? 'max-w-3xl' : coachesList.length === 3 ? 'max-w-5xl' : 'max-w-6xl'}
        `}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        {coachesList.map((coach, index) => {
          const assignedPlayers = players.filter(
            (p) => (playerAssignments[p.id] ?? 0) === index
          );
          const isAssignedToActive = (playerAssignments[activePlayerForPick] ?? 0) === index;

          return (
            <Tooltip key={coach.id || index} content={coach.name} position="top">
              <motion.button
                onClick={() => handleSelectCoachForActivePlayer(index)}
                className={`
                  group relative rounded-3xl overflow-hidden border-2 cursor-pointer transition-all motion-spring p-5 flex flex-col justify-between shadow-level-3
                  ${coachesList.length === 1 ? 'w-80 md:w-96 h-[32rem]' : coachesList.length === 2 ? 'w-72 md:w-80 h-[30rem]' : coachesList.length === 3 ? 'w-64 md:w-72 h-[28rem]' : 'w-56 md:w-64 h-[26rem]'}
                  ${
                    isAssignedToActive
                      ? 'border-brand-500 ring-2 ring-brand-500/30 scale-105 -translate-y-2 bg-gradient-to-t from-purple-900/50 via-purple-900/30 to-surface-0'
                      : 'border-outline-variant hover:border-brand-500 bg-gradient-to-t from-surface-1 via-surface-2 to-surface-1 hover:scale-102 hover:-translate-y-1'
                  }
                `}
                whileTap={{ scale: 0.99 }}
                initial={{ opacity: 0, y: 40, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.08 * index, type: 'spring', stiffness: 500, damping: 30 }}
              >
                {/* Pattern Background */}
                <motion.div
                  className="absolute inset-0 opacity-10 mix-blend-overlay bg-[radial-gradient(#ff1493_1px,transparent_1px)] [background-size:16px_16px]"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.1 }}
                  transition={{ delay: 0.3 }}
                />

                {/* Coach Badge Header */}
                <div className="flex items-center justify-between z-10 relative">
                  <motion.span
                    className="px-3 py-1 rounded-full text-label-small font-black text-accent-400 bg-accent-500/15 border border-accent-500/30 uppercase tracking-widest shadow-sm"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 * index }}
                  >
                    COACH {index + 1}
                  </motion.span>

                  <motion.span
                    className={`
                      text-label-small font-black px-2.5 py-1 rounded-full uppercase border
                      ${diffColorMap[coach.difficulty] === 'success' ? 'bg-success-500/20 text-success-400 border-success-500/30' :
                        diffColorMap[coach.difficulty] === 'warning' ? 'bg-sun-500/20 text-sun-400 border-sun-500/30' :
                        'bg-error-500/20 text-error-400 border-error-500/30'}
                    `}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 * index }}
                  >
                    {coach.difficulty}
                  </motion.span>
                </div>

                {/* Coach Avatar Illustration */}
                <motion.div className="relative my-auto flex justify-center items-center z-10 flex-1" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + 0.1 * index }}>
                  <motion.div
                    className={`
                      absolute w-48 h-48 rounded-full blur-3xl transition-all motion-spring
                      ${isAssignedToActive ? 'bg-brand-500/30 scale-110' : 'bg-brand-500/15 group-hover:bg-brand-500/25'}
                    `}
                  />
                  <Avatar
                    src={`https://api.dicebear.com/7.x/big-smile/svg?seed=${coach.avatarSeed || coach.name}`}
                    alt={coach.name}
                    name={coach.name}
                    size="4xl"
                    border
                    borderColor={isAssignedToActive ? 'brand' : 'white'}
                    className="drop-shadow-[0_0_40px_rgba(217,30,109,0.7)] group-hover:scale-105 transition-all motion-spring"
                  />
                </motion.div>

                {/* Assigned Players Badges */}
                <motion.div className="z-10 min-h-[36px] flex items-center justify-center gap-2 flex-wrap" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + 0.1 * index }}>
                  {assignedPlayers.map((ap) => (
                    <Tooltip key={ap.id} content={ap.name} position="top">
                      <motion.div
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-3/50 backdrop-blur border border-brand-500/30 text-brand-300 font-black text-label-small shadow-sm"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 17, delay: 0.05 * assignedPlayers.indexOf(ap) }}
                        whileHover={{ scale: 1.05 }}
                      >
                        <Avatar
                          src={`https://api.dicebear.com/7.x/bottts/svg?seed=${ap.avatarSeed}`}
                          alt={ap.name}
                          name={ap.name}
                          size="xs"
                          border
                          borderColor="brand"
                        />
                        <span>{ap.name.split(' ')[0]}</span>
                      </motion.div>
                    </Tooltip>
                  ))}
                  {assignedPlayers.length === 0 && (
                    <motion.span
                      className="px-3 py-1.5 rounded-full bg-surface-3/50 text-on-surface-disabled text-label-small font-medium"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      No dancers assigned
                    </motion.span>
                  )}
                </motion.div>

                {/* Bottom Coach Name Pill */}
                <motion.div className="z-10 text-center pb-1 space-y-2 mt-4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 + 0.1 * index }}>
                  <motion.div
                    className={`
                      py-3 rounded-xl font-black italic text-base tracking-wider text-white shadow-level-2 transition-all motion-spring border border-white/10
                      ${isAssignedToActive
                        ? 'bg-gradient-to-r from-brand-500 to-purple-600'
                        : 'bg-gradient-to-r from-blue-700 to-indigo-700 group-hover:from-brand-500 group-hover:to-purple-600'
                      }
                    `}
                    whileHover={{ scale: 1.02 }}
                  >
                    {coach.name}
                  </motion.div>
                  <motion.div className="text-label-small text-accent-400 font-bold truncate">
                    {coach.routineName || `Routine ${String.fromCharCode(65 + index)}`}
                  </motion.div>
                </motion.div>
              </motion.button>
            </Tooltip>
          );
        })}
      </motion.div>

      {/* Prominent Action Bar */}
      <motion.div
        className="w-full flex justify-center pt-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Tooltip content="Start dancing with the selected coach" position="top">
          <motion.button
            onClick={handleStartGame}
            className="px-10 py-4 bg-gradient-to-r from-brand-500 via-rose-500 to-sun-400 hover:from-brand-400 hover:to-sun-300 text-white text-base md:text-lg font-black italic tracking-wider rounded-full shadow-brand-glow-lg hover:shadow-brand-glow border-2 border-white/20 flex items-center gap-4"
            whileHover={{ scale: 1.03, boxShadow: 'var(--shadow-level-4)' }}
            whileTap={{ scale: 0.98 }}
          >
            <motion.svg
              className="w-6 h-6"
              viewBox="0 0 24 24"
              fill="currentColor"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 17 }}
            >
              <polygon points="5 3 19 12 5 21 5 3" />
            </motion.svg>
            <span>DANCE NOW WITH SELECTED COACH</span>
          </motion.button>
        </Tooltip>
      </motion.div>
    </motion.section>
  );
};

export default CoachSelectScreen;