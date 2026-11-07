import React, { useState } from 'react';
import { Player } from '../../types/game';
import { soundEngine } from '../../services/soundEffects';

interface ProfileEditorModalProps {
  player: Player;
  onSaveProfile: (updatedPlayer: Player) => void;
  onClose: () => void;
}

export const ProfileEditorModal: React.FC<ProfileEditorModalProps> = ({
  player,
  onSaveProfile,
  onClose,
}) => {
  const [name, setName] = useState(player.name || 'Dancer 1');
  const [avatarSeed, setAvatarSeed] = useState(player.avatarSeed || 'PandaJD');
  const [color, setColor] = useState(player.color || '#ff1493');

  const avatarSeeds = [
    'PandaJD',
    'SunnyD',
    'Jazzy',
    'Eunji',
    'Iseul',
    'Byeol',
    'Gaga',
    'CyberBot',
    'ChappellG',
    'VelvetQueen',
  ];

  const colors = ['#ff1493', '#00d2ff', '#ffea00', '#10b981', '#a855f7', '#f97316'];

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 select-none">
      <div className="bg-[#0f0c2e] border-2 border-pink-500/60 rounded-3xl max-w-sm w-full p-6 space-y-5 text-center shadow-2xl text-white">
        {/* Header */}
        <div className="flex justify-between items-center pb-2 border-b border-white/10">
          <div className="flex items-center space-x-2 text-pink-400 font-black italic">
            <i className="fa-solid fa-user-gear"></i>
            <span>EDIT DANCER PROFILE</span>
          </div>
          <button
            onClick={() => {
              soundEngine.playClick();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-xs text-white cursor-pointer"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* Live Avatar Preview */}
        <div className="relative my-2 flex flex-col items-center space-y-2">
          <div
            className="w-24 h-24 rounded-full p-1 shadow-2xl transition transform hover:scale-105"
            style={{ background: `linear-gradient(135deg, ${color}, #00d2ff)` }}
          >
            <img
              src={`https://api.dicebear.com/7.x/bottts/svg?seed=${avatarSeed}`}
              alt="Avatar"
              className="w-full h-full rounded-full bg-indigo-950 object-cover"
            />
          </div>
          <div className="text-sm font-black italic text-yellow-300">{name || 'Dancer'}</div>
        </div>

        {/* Form Inputs */}
        <div className="space-y-3 text-left">
          <div>
            <label className="text-[10px] font-black uppercase text-pink-400">Username</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter Username"
              className="w-full px-3.5 py-2.5 bg-black/60 border border-white/20 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-pink-500"
            />
          </div>

          <div>
            <label className="text-[10px] font-black uppercase text-pink-400">Choose Avatar Style</label>
            <div className="flex flex-wrap gap-1.5 pt-1 max-h-24 overflow-y-auto">
              {avatarSeeds.map((seed) => (
                <button
                  key={seed}
                  onClick={() => {
                    soundEngine.playClick();
                    setAvatarSeed(seed);
                  }}
                  className={`w-9 h-9 rounded-xl border p-0.5 transition cursor-pointer ${
                    avatarSeed === seed
                      ? 'border-yellow-300 scale-110 shadow-lg bg-pink-600'
                      : 'border-white/20 bg-black/40 hover:border-white'
                  }`}
                >
                  <img
                    src={`https://api.dicebear.com/7.x/bottts/svg?seed=${seed}`}
                    alt={seed}
                    className="w-full h-full rounded-lg bg-indigo-950 object-cover"
                  />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black uppercase text-pink-400">Glow Color</label>
            <div className="flex justify-between items-center pt-1">
              {colors.map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    soundEngine.playClick();
                    setColor(c);
                  }}
                  className={`w-7 h-7 rounded-full border-2 transition cursor-pointer ${
                    color === c ? 'scale-125 border-white shadow-lg' : 'border-transparent opacity-70'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={handleSave}
          className="w-full py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs font-black italic rounded-xl shadow-lg hover:scale-105 transition cursor-pointer"
        >
          SAVE PROFILE
        </button>
      </div>
    </div>
  );
};
