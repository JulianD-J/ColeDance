import React from 'react';
import { motion } from 'motion/react';
import { Player } from '../../types/game';
import { soundEngine } from '../../services/soundEffects';
import { Modal, Button, Avatar, Badge, Tooltip, Card } from '../ui';

interface DancerCardModalProps {
  player: Player;
  onOpenProfileEditor: () => void;
  onClose: () => void;
}

export const DancerCardModal: React.FC<DancerCardModalProps> = ({
  player,
  onOpenProfileEditor,
  onClose,
}) => {
  const rankColors = {
    Bronze: 'from-amber-700 via-amber-800 to-amber-950',
    Silver: 'from-slate-400 via-zinc-500 to-slate-700',
    Gold: 'from-amber-400 via-yellow-500 to-amber-600',
    Diamond: 'from-cyan-400 via-sky-500 to-indigo-600',
    Legend: 'from-pink-500 via-purple-600 to-amber-400',
  };

  const rankColorMap = {
    Bronze: 'text-amber-400',
    Silver: 'text-slate-400',
    Gold: 'text-yellow-400',
    Diamond: 'text-cyan-400',
    Legend: 'text-pink-400',
  };

  const rankDotColors = {
    Bronze: 'sun' as const,
    Silver: 'accent' as const,
    Gold: 'sun' as const,
    Diamond: 'accent' as const,
    Legend: 'brand' as const,
  };

  return (
    <Modal
      isOpen={true}
      onClose={() => { soundEngine.playClick(); onClose(); }}
      title="OFFICIAL DANCER CARD"
      description={`${player.name} • ${player.isPhoneController ? 'Smartphone Sync Controller' : 'YOLOv8 AI Camera Dancer'}`}
      size="md"
      variant="default"
      showCloseButton={true}
      footer={
        <div className="flex gap-3 w-full">
          <Tooltip content="Edit your dancer profile" position="top">
            <Button
              variant="primary"
              size="md"
              fullWidth
              leadingIcon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>}
              onClick={() => { soundEngine.playClick(); onClose(); onOpenProfileEditor(); }}
              className="shadow-brand-glow"
            >
              CUSTOMIZE AVATAR & NAME
            </Button>
          </Tooltip>
          <Button variant="outlined" fullWidth onClick={() => { soundEngine.playClick(); onClose(); }}>Close</Button>
        </div>
      }
    >
      <motion.div
        className="flex flex-col items-center text-center space-y-5"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Live Avatar Preview */}
        <Tooltip content={`${player.name}'s avatar`} position="bottom">
          <motion.div
            className="relative w-28 h-28"
            initial={{ scale: 0, rotate: -12 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 17 }}
          >
            <div
              className="w-full h-full rounded-full p-1.5 shadow-2xl"
              style={{
                background: `linear-gradient(135deg, ${player.color}, #0ea5e9)`,
                boxShadow: `0 0 30px ${player.color}`,
              }}
            >
              <Avatar
                src={`https://api.dicebear.com/7.x/bottts/svg?seed=${player.avatarSeed}`}
                alt={player.name}
                name={player.name}
                size="4xl"
              />
            </div>
            <motion.div
              className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-gradient-to-r from-sun-400 to-sun-500 text-black font-black flex items-center justify-center border-2 border-surface-0 shadow-sun-glow"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 17, delay: 0.2 }}
            >
              ★
            </motion.div>
          </motion.div>
        </Tooltip>

        <motion.div className="space-y-1" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <h2 className="text-headline-small font-black italic text-white">{player.name}</h2>
          <p className="text-body-small text-on-surface-variant flex items-center justify-center gap-1.5">
            <span className="px-2 py-0.5 rounded-full text-label-small font-semibold bg-surface-2 border border-outline-variant">
              {player.isPhoneController ? 'Smartphone Controller' : 'YOLOv8 AI Camera'}
            </span>
          </p>
        </motion.div>

        {/* Stats Badges */}
        <motion.div
          className="grid grid-cols-3 gap-3 w-full"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card variant="filled" padding="md" className="text-center">
            <div className="text-label-small text-on-surface-variant font-bold uppercase tracking-wider">Rank</div>
            <motion.div
              className="text-body-large font-black flex items-center justify-center gap-1 mt-1"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 17 }}
            >
              <Badge variant="ghost" size="sm" className={rankColors[player.rank || 'Bronze']} dot dotColor={rankDotColors[player.rank || 'Bronze']}>
                {player.rank || 'Bronze'}
              </Badge>
              {player.stars && player.stars >= 6 && (
                <span className="text-sun-400">★ {player.stars === 7 ? 'MEGASTAR' : 'SUPERSTAR'}</span>
              )}
            </motion.div>
          </Card>

          <Card variant="filled" padding="md" className="text-center">
            <div className="text-label-small text-on-surface-variant font-bold uppercase tracking-wider">Stars</div>
            <motion.div
              className="flex items-center justify-center gap-1 mt-1"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 17, delay: 0.05 }}
            >
              {Array.from({ length: Math.min(5, player.stars || 0) }).map((_, i) => (
                <motion.svg
                  key={i}
                  className="w-5 h-5 text-sun-400 drop-shadow-[0_0_6px_rgba(245,158,11,0.9)]"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  initial={{ scale: 0, rotate: -90 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 10, delay: 0.05 * i }}
                >
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </motion.svg>
              ))}
            </motion.div>
          </Card>

          <Card variant="filled" padding="md" className="text-center">
            <div className="text-label-small text-on-surface-variant font-bold uppercase tracking-wider">Score</div>
            <motion.div
              className="text-body-large font-black text-brand-400 tabular-nums mt-1"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 17, delay: 0.1 }}
            >
              {(player.score || 0).toLocaleString()}
            </motion.div>
          </Card>
        </motion.div>

        {/* Additional Stats */}
        <motion.div
          className="grid grid-cols-3 gap-3 w-full pt-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card variant="outlined" padding="md" className="text-center">
            <div className="text-label-small text-on-surface-variant font-bold uppercase tracking-wider">Streak</div>
            <div className="text-body-large font-black text-sun-400 flex items-center justify-center gap-1 mt-1">
              <span className="tabular-nums">{player.streak || 0}</span>
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" /></svg>
            </div>
          </Card>

          <Card variant="outlined" padding="md" className="text-center">
            <div className="text-label-small text-on-surface-variant font-bold uppercase tracking-wider">Multiplier</div>
            <motion.div
              className="text-body-large font-black flex items-center justify-center gap-1 mt-1"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 17 }}
            >
              x{player.multiplier || 1}
              {(player.multiplier || 1) >= 4 && (
                <span className="text-label-small font-black bg-gradient-to-r from-error-500 to-brand-500 text-white px-1.5 py-0.5 rounded">OVERDRIVE</span>
              )}
            </motion.div>
          </Card>

          <Card variant="outlined" padding="md" className="text-center">
            <div className="text-label-small text-on-surface-variant font-bold uppercase tracking-wider">Momentum</div>
            <div className="text-body-large font-black text-accent-400 mt-1">
              {Math.round(player.momentum || 0)}%
            </div>
          </Card>
        </motion.div>
      </motion.div>
    </Modal>
  );
};

export default DancerCardModal;