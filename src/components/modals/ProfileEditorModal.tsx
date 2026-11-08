import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Player } from '../../types/game';
import { soundEngine } from '../../services/soundEffects';
import { Modal, Button, Avatar, Chip, Tooltip } from '../ui';

interface ProfileEditorModalProps {
  player: Player;
  onSaveProfile: (updatedPlayer: Player) => void;
  onClose: () => void;
}

const avatarSeeds = [
  'PandaJD', 'SunnyD', 'Jazzy', 'Eunji', 'Iseul', 'Byeol',
  'Gaga', 'CyberBot', 'ChappellG', 'VelvetQueen',
];

const colors = ['#ff1493', '#00d2ff', '#ffea00', '#10b981', '#a855f7', '#f97316'];

export const ProfileEditorModal: React.FC<ProfileEditorModalProps> = ({
  player,
  onSaveProfile,
  onClose,
}) => {
  const [name, setName] = useState(player.name || 'Dancer 1');
  const [avatarSeed, setAvatarSeed] = useState(player.avatarSeed || 'PandaJD');
  const [color, setColor] = useState(player.color || '#ff1493');

  const handleSave = () => {
    soundEngine.playClick();
    onSaveProfile({
      ...player,
      name: name.trim() || 'Dancer 1',
      avatarSeed,
      color,
    });
    onClose();
  };

  return (
    <Modal
      isOpen={true}
      onClose={() => { soundEngine.playClick(); onClose(); }}
      title="EDIT DANCER PROFILE"
      description="Customize your dancer avatar, name, and glow color"
      size="md"
      variant="form"
      showCloseButton={true}
      footer={
        <div className="flex gap-3 w-full">
          <Button variant="outlined" fullWidth onClick={() => { soundEngine.playClick(); onClose(); }}>Cancel</Button>
          <Button variant="primary" fullWidth onClick={handleSave} className="shadow-brand-glow">SAVE PROFILE</Button>
        </div>
      }
    >
      <motion.div
        className="space-y-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Live Avatar Preview */}
        <motion.div className="flex flex-col items-center space-y-3" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Tooltip content="Your dancer avatar" position="bottom">
            <Avatar
              src={`https://api.dicebear.com/7.x/bottts/svg?seed=${avatarSeed}`}
              alt={name}
              name={name}
              size="3xl"
              border
              borderColor="brand"
              className="drop-shadow-[0_0_30px_rgba(217,30,109,0.5)]"
            />
          </Tooltip>
          <motion.h2 className="text-headline-small font-black italic text-yellow-300" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 17 }}>
            {name || 'Dancer'}
          </motion.h2>
        </motion.div>

        {/* Form Inputs */}
        <div className="space-y-5 text-left">
          <div>
            <label className="block text-label-medium font-semibold text-on-surface-variant mb-2">Username</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter Username"
              className="w-full px-4 py-3 bg-surface-1 border-2 border-outline-variant rounded-xl text-body-medium font-bold text-white focus:outline-none focus:border-brand-500 transition-colors placeholder:text-on-surface-disabled"
            />
          </div>

          <div>
            <label className="block text-label-medium font-semibold text-on-surface-variant mb-3">Choose Avatar Style</label>
            <div className="flex flex-wrap gap-2">
              {avatarSeeds.map((seed) => (
                <Tooltip key={seed} content={seed} position="top">
                  <motion.button
                    type="button"
                    onClick={() => { soundEngine.playClick(); setAvatarSeed(seed); }}
                    className={`
                      w-12 h-12 rounded-xl border-2 p-1 transition-all motion-spring
                      ${avatarSeed === seed
                        ? 'border-yellow-400 scale-110 shadow-brand-glow bg-brand-500/20'
                        : 'border-outline-variant bg-surface-2 hover:border-brand-500 hover:scale-105'
                      }
                    `}
                    whileTap={{ scale: 0.9 }}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.03 * avatarSeeds.indexOf(seed), type: 'spring', stiffness: 500, damping: 17 }}
                  >
                    <Avatar src={`https://api.dicebear.com/7.x/bottts/svg?seed=${seed}`} alt={seed} name={seed} size="xl" />
                  </motion.button>
                </Tooltip>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-label-medium font-semibold text-on-surface-variant mb-3">Glow Color</label>
            <div className="flex gap-2">
              {colors.map((c) => (
                <Tooltip key={c} content={`Glow: ${c}`} position="top">
                  <motion.button
                    type="button"
                    onClick={() => { soundEngine.playClick(); setColor(c); }}
                    className={`
                      w-10 h-10 rounded-full border-3 transition-all motion-spring
                      ${color === c ? 'border-white scale-125 shadow-lg' : 'border-transparent opacity-70 hover:opacity-100 hover:scale-110'
                    }`}
                    style={{ backgroundColor: c }}
                    whileTap={{ scale: 0.9 }}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.03 * colors.indexOf(c), type: 'spring', stiffness: 500, damping: 17 }}
                    aria-label={`Select color ${c}`}
                  />
                </Tooltip>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </Modal>
  );
};

export default ProfileEditorModal;