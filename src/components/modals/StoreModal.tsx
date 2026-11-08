import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Player } from '../../types/game';
import { soundEngine } from '../../services/soundEffects';
import { Modal, Button, Badge, Chip, Avatar, Tooltip, Card } from '../ui';

interface StoreModalProps {
  player: Player;
  onUpdatePlayer: (updated: Player) => void;
  onClose: () => void;
}

const STORE_AVATARS = [
  { seed: 'CyberRobot', name: 'Cyber Mech', rarity: 'VIP Legendary', color: '#00d2ff' },
  { seed: 'DiscoQueen', name: 'Disco Diva', rarity: 'VIP Epic', color: '#ff1493' },
  { seed: 'GoldenPanda', name: 'Golden Panda', rarity: 'VIP Mythic', color: '#ffea00' },
  { seed: 'NeonFox', name: 'Neon Fox', rarity: 'VIP Rare', color: '#10b981' },
  { seed: 'AlienDancer', name: 'Cosmic Alien', rarity: 'VIP Epic', color: '#a855f7' },
  { seed: 'GalaxyKing', name: 'Galaxy Monarch', rarity: 'VIP Legendary', color: '#f97316' },
];

const SIGNATURE_COLORS = [
  { name: 'Hot Neon Pink', hex: '#ff1493' },
  { name: 'Cyber Electric Cyan', hex: '#00d2ff' },
  { name: 'Kinect Emerald Green', hex: '#00ff88' },
  { name: 'Golden Megastar', hex: '#ffea00' },
  { name: 'Ultra Purple', hex: '#a855f7' },
  { name: 'Flame Sunset Orange', hex: '#f97316' },
];

const rarityStyles = {
  'VIP Legendary': 'text-sun-400 bg-sun-500/15 border-sun-500/30',
  'VIP Epic': 'text-brand-400 bg-brand-500/15 border-brand-500/30',
  'VIP Mythic': 'text-sun-400 bg-sun-500/15 border-sun-500/30',
  'VIP Rare': 'text-success-400 bg-success-500/15 border-success-500/30',
};

export const StoreModal: React.FC<StoreModalProps> = ({
  player,
  onUpdatePlayer,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'avatars' | 'colors'>('avatars');
  const [isVipActive, setIsVipActive] = useState<boolean>(() => {
    return localStorage.getItem('coledance_vip_active') === 'true';
  });
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleToggleVip = () => {
    soundEngine.playClick();
    const next = !isVipActive;
    setIsVipActive(next);
    localStorage.setItem('coledance_vip_active', next ? 'true' : 'false');
    soundEngine.playStarUnlock();
    showToast(next ? '🎉 ColeDance+ VIP Pass Activated! All VIP items unlocked!' : 'VIP Pass paused.');
  };

  const handleEquipAvatar = (seed: string) => {
    soundEngine.playClick();
    onUpdatePlayer({ ...player, avatarSeed: seed });
    soundEngine.playScoreFeedback('PERFECT');
    showToast(`Equipped avatar: ${seed}!`);
  };

  const handleEquipColor = (colorHex: string, colorName: string) => {
    soundEngine.playClick();
    onUpdatePlayer({ ...player, color: colorHex });
    soundEngine.playScoreFeedback('SUPER');
    showToast(`Signature color set to ${colorName}!`);
  };

  return (
    <Modal
      isOpen={true}
      onClose={() => { soundEngine.playClick(); onClose(); }}
      title="COLEDANCE+ VIP STORE"
      description="Equip exclusive dancer avatars, glow themes & VIP tracks"
      size="xl"
      variant="form"
      showCloseButton={true}
      footer={
        <Button variant="primary" size="md" onClick={() => { soundEngine.playClick(); onClose(); }} className="shadow-brand-glow">
          DONE
        </Button>
      }
    >
      <motion.div
        className="space-y-5"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* VIP Pass Banner */}
        <Card variant="filled" padding="md" className="bg-gradient-to-r from-purple-900/60 via-pink-900/60 to-indigo-900/60 border-yellow-400/40 flex flex-col sm:flex-row items-center justify-between gap-4">
          <motion.div
            className="flex items-center gap-4"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <motion.div
              className="w-12 h-12 rounded-2xl bg-gradient-to-r from-sun-400 to-sun-500 text-black flex items-center justify-center text-2xl shadow-sun-glow shrink-0"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 17 }}
            >
              <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
            </motion.div>
            <div>
              <div className="text-label-small font-black uppercase text-sun-400 tracking-wider">COLEDANCE+ UNLIMITED VIP PASS</div>
              <div className="text-body-small text-on-surface-variant">Unlock all signature coach outfits, custom avatars, and neon themes</div>
            </div>
          </motion.div>

          <Tooltip content={isVipActive ? 'Deactivate VIP Pass' : 'Activate VIP Pass'} position="left">
            <Button
              variant={isVipActive ? 'success' : 'secondary'}
              size="md"
              onClick={handleToggleVip}
              className={isVipActive ? 'shadow-success-glow' : 'shadow-sun-glow'}
            >
              {isVipActive ? '✓ VIP ACTIVE' : '★ ACTIVATE VIP PASS'}
            </Button>
          </Tooltip>
        </Card>

        {/* Tab Navigation */}
        <div className="flex gap-2 bg-surface-1/50 p-1.5 rounded-2xl border border-outline-variant">
          {[
            { id: 'avatars', label: 'VIP Avatars', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg> },
            { id: 'colors', label: 'Signature Colors', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg> },
          ].map((tab) => (
            <Tooltip key={tab.id} content={tab.label} position="bottom">
              <Button
                variant={activeTab === tab.id ? 'primary' : 'ghost'}
                size="sm"
                fullWidth
                leadingIcon={tab.icon}
                onClick={() => { soundEngine.playClick(); setActiveTab(tab.id as any); }}
              >
                {tab.label}
              </Button>
            </Tooltip>
          ))}
        </div>

        {/* Tab 1: Avatars */}
        <AnimatePresence mode="wait">
          {activeTab === 'avatars' && (
            <motion.div
              key="avatars"
              className="grid grid-cols-2 sm:grid-cols-3 gap-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {STORE_AVATARS.map((av, index) => {
                const isEquipped = player.avatarSeed === av.seed;
                const rarityStyle = rarityStyles[av.rarity as keyof typeof rarityStyles] || rarityStyles['VIP Rare'];

                return (
                  <Tooltip key={av.seed} content={`${av.name} • ${av.rarity}`} position="top">
                    <motion.div
                      className={`
                        p-4 rounded-2xl bg-surface-1/50 border transition-all motion-spring flex flex-col items-center space-y-3 relative overflow-hidden
                        ${isEquipped ? 'border-brand-500 shadow-brand-glow ring-1 ring-brand-500/20' : 'border-outline-variant hover:border-brand-500'}
                      `}
                      whileHover={{ y: -4, scale: 1.02 }}
                      initial={{ opacity: 0, y: 20, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ delay: 0.05 * index, type: 'spring', stiffness: 500, damping: 30 }}
                    >
                      <Badge variant="ghost" size="sm" className={rarityStyle}>
                        {av.rarity}
                      </Badge>

                      <motion.div
                        className="w-20 h-20 rounded-full p-0.5 shadow-level-2 bg-gradient-to-tr from-sun-400 to-brand-500"
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 17, delay: 0.1 }}
                      >
                        <Avatar src={`https://api.dicebear.com/7.x/bottts/svg?seed=${av.seed}`} alt={av.name} name={av.name} size="3xl" />
                      </motion.div>

                      <motion.h4 className="text-body-medium font-black text-white text-center truncate w-full" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>{av.name}</motion.h4>

                      <Tooltip content={isEquipped ? 'Currently equipped' : 'Equip this avatar'} position="bottom">
                        <Button
                          variant={isEquipped ? 'success' : 'primary'}
                          size="sm"
                          fullWidth
                          onClick={() => handleEquipAvatar(av.seed)}
                          disabled={isEquipped}
                        >
                          {isEquipped ? 'EQUIPPED' : 'EQUIP NOW'}
                        </Button>
                      </Tooltip>
                    </motion.div>
                  </Tooltip>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tab 2: Signature Glow Colors */}
        <AnimatePresence mode="wait">
          {activeTab === 'colors' && (
            <motion.div
              key="colors"
              className="grid grid-cols-2 sm:grid-cols-3 gap-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {SIGNATURE_COLORS.map((col, index) => {
                const isEquipped = player.color.toLowerCase() === col.hex.toLowerCase();

                return (
                  <Tooltip key={col.hex} content={col.name} position="top">
                    <motion.div
                      className={`
                        p-4 rounded-2xl bg-surface-1/50 border transition-all motion-spring flex flex-col items-center space-y-3
                        ${isEquipped ? 'border-white shadow-xl ring-2 ring-white/20' : 'border-outline-variant hover:border-white/30'}
                      `}
                      whileHover={{ y: -4, scale: 1.02 }}
                      initial={{ opacity: 0, y: 20, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ delay: 0.05 * index, type: 'spring', stiffness: 500, damping: 30 }}
                    >
                      <motion.div
                        className="w-16 h-16 rounded-full shadow-lg border-2 border-white/30"
                        style={{ backgroundColor: col.hex, boxShadow: `0 0 20px ${col.hex}` }}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 17, delay: 0.05 * index }}
                      />

                      <motion.h4 className="text-body-small font-black text-white text-center truncate w-full" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>{col.name}</motion.h4>

                      <Tooltip content={isEquipped ? 'Currently active color' : 'Apply this signature color'} position="bottom">
                        <Button
                          variant={isEquipped ? 'success' : 'outlined'}
                          size="sm"
                          fullWidth
                          onClick={() => handleEquipColor(col.hex, col.name)}
                          disabled={isEquipped}
                        >
                          {isEquipped ? 'CURRENT COLOR' : 'APPLY COLOR'}
                        </Button>
                      </Tooltip>
                    </motion.div>
                  </Tooltip>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Toast confirmation message */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              className="p-3 rounded-xl bg-brand-500/20 border border-brand-500/30 text-center"
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -10, height: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            >
              <span className="text-body-small font-black text-brand-400">{toastMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </Modal>
  );
};

export default StoreModal;