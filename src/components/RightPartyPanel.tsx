import React from 'react';
import { motion } from 'motion/react';
import { Player } from '../types/game';
import { soundEngine } from '../services/soundEffects';
import { IconButton, Avatar, Tooltip, Badge, Card } from './ui';

interface RightPartyPanelProps {
  players: Player[];
  onOpenPhonePairing: () => void;
  onOpenProfileEditor: () => void;
  onOpenDancerCard: (player: Player) => void;
}

export const RightPartyPanel: React.FC<RightPartyPanelProps> = ({
  players,
  onOpenPhonePairing,
  onOpenProfileEditor,
  onOpenDancerCard,
}) => {
  return (
    <motion.aside
      className="hidden lg:flex fixed right-0 top-0 bottom-0 w-16 z-[350] flex-col items-center justify-between py-5 bg-surface-0/95 border-l border-outline-variant backdrop-blur-xl select-none"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.2, type: 'spring', stiffness: 500, damping: 30 }}
    >
      {/* Top: Party Lounge Icon */}
      <Tooltip content="Party Lobby & Smartphone Controllers" position="left">
        <IconButton
          variant="secondary"
          size="md"
          aria-label="Open Phone Pairing"
          onClick={() => { soundEngine.playClick(); onOpenPhonePairing(); }}
          className="shadow-accent-glow"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2" /><line x1="12" y1="18" x2="12.01" y2="18" /></svg>
        </IconButton>
      </Tooltip>

      {/* Center: Dancers Stack */}
      <motion.div
        className="flex flex-col items-center space-y-3 flex-1"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <motion.span
          className="text-label-small font-black tracking-widest text-on-surface-variant uppercase"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 17 }}
        >
          LOBBY
        </motion.span>

        {players.map((p, idx) => (
          <Tooltip key={p.id || idx} content={`${p.name} • ${p.isPhoneController ? 'Phone' : 'Camera'}`} position="left">
            <motion.div
              onClick={() => {
                soundEngine.playClick();
                if (idx === 0) {
                  onOpenProfileEditor();
                } else {
                  onOpenDancerCard(p);
                }
              }}
              className="relative group cursor-pointer"
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 * idx, type: 'spring', stiffness: 500, damping: 30 }}
            >
              <Avatar
                src={`https://api.dicebear.com/7.x/bottts/svg?seed=${p.avatarSeed}`}
                alt={p.name}
                name={p.name}
                size="lg"
                border
                borderColor={p.isPhoneController ? 'success' : 'brand'}
                status={p.isPhoneController ? 'online' : 'online'}
                statusPosition="bottom-right"
              />

              {/* Player Number Badge */}
              <motion.div
                className="absolute -bottom-1 -left-1 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-white"
                style={{ background: `linear-gradient(135deg, ${p.color}, #0ea5e9)` }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 17, delay: 0.1 }}
              >
                {idx + 1}
              </motion.div>
            </motion.div>
          </Tooltip>
        ))}
      </motion.div>

      {/* Bottom: Invite / Pair More Dancers */}
      <Tooltip content="Connect Smartphone or Camera Dancers" position="left">
        <IconButton
          variant="primary"
          size="md"
          aria-label="Add Dancer"
          onClick={() => { soundEngine.playClick(); onOpenPhonePairing(); }}
          className="shadow-brand-glow"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" /></svg>
        </IconButton>
      </Tooltip>
    </motion.aside>
  );
};

export default RightPartyPanel;