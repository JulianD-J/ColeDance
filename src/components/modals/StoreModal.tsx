import React, { useState } from 'react';
import { Player } from '../../types/game';
import { soundEngine } from '../../services/soundEffects';

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

export const StoreModal: React.FC<StoreModalProps> = ({
  player,
  onUpdatePlayer,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'pass' | 'avatars' | 'colors'>('avatars');
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
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 select-none">
      <div className="max-w-2xl w-full bg-[#130b33]/95 border-2 border-pink-500/80 rounded-3xl p-5 sm:p-7 shadow-[0_0_50px_rgba(255,20,147,0.4)] text-white space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center pb-3 border-b border-white/10">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-yellow-400 to-pink-600 flex items-center justify-center text-lg text-white shadow-lg">
              <i className="fa-solid fa-crown text-yellow-300"></i>
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black italic tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-pink-500">
                COLEDANCE+ VIP STORE
              </h2>
              <p className="text-[11px] text-white/60">Equip exclusive dancer avatars, glow themes & VIP tracks</p>
            </div>
          </div>

          <button
            onClick={() => {
              soundEngine.playClick();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-red-600/80 flex items-center justify-center text-white/70 hover:text-white transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* VIP Pass Banner */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-900/90 via-pink-900/90 to-indigo-950 border border-yellow-300/40 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-yellow-400 text-black flex items-center justify-center text-2xl shadow-lg shrink-0">
              <i className="fa-solid fa-gem"></i>
            </div>
            <div>
              <div className="text-xs font-black uppercase text-yellow-300 tracking-wider">
                COLEDANCE+ UNLIMITED VIP PASS
              </div>
              <div className="text-[11px] text-white/80">
                Unlock all signature coach outfits, custom avatars, and neon themes
              </div>
            </div>
          </div>

          <button
            onClick={handleToggleVip}
            className={`px-5 py-2.5 rounded-full font-black text-xs italic tracking-wider transition cursor-pointer shadow-lg shrink-0 ${
              isVipActive
                ? 'bg-emerald-400 text-black shadow-emerald-400/40 font-extrabold'
                : 'bg-gradient-to-r from-yellow-400 to-pink-500 text-black hover:scale-105'
            }`}
          >
            {isVipActive ? '✓ VIP ACTIVE' : '★ ACTIVATE VIP PASS'}
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-2 bg-black/40 p-1 rounded-xl border border-white/10 text-xs font-black">
          {[
            { id: 'avatars', label: 'VIP Avatars' },
            { id: 'colors', label: 'Signature Colors' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                soundEngine.playClick();
                setActiveTab(tab.id as any);
              }}
              className={`flex-1 py-2 rounded-lg transition cursor-pointer text-xs font-black ${
                activeTab === tab.id
                  ? 'bg-pink-600 text-white shadow'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab 1: Avatars */}
        {activeTab === 'avatars' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {STORE_AVATARS.map((av) => {
              const isEquipped = player.avatarSeed === av.seed;

              return (
                <div
                  key={av.seed}
                  className={`p-3 rounded-2xl bg-black/50 border transition flex flex-col items-center space-y-2 relative overflow-hidden ${
                    isEquipped ? 'border-pink-500 shadow-[0_0_20px_rgba(255,20,147,0.4)]' : 'border-white/10 hover:border-white/30'
                  }`}
                >
                  <span className="text-[9px] font-black uppercase text-yellow-300 bg-yellow-950/60 px-1.5 py-0.2 rounded border border-yellow-500/30">
                    {av.rarity}
                  </span>

                  <div className="w-16 h-16 rounded-full p-0.5 shadow-lg bg-gradient-to-tr from-yellow-300 to-pink-500">
                    <img
                      src={`https://api.dicebear.com/7.x/bottts/svg?seed=${av.seed}`}
                      alt={av.name}
                      className="w-full h-full rounded-full bg-indigo-950 object-cover"
                    />
                  </div>

                  <div className="text-xs font-black text-white truncate">{av.name}</div>

                  <button
                    onClick={() => handleEquipAvatar(av.seed)}
                    className={`w-full py-1.5 rounded-xl text-[10px] font-black transition cursor-pointer ${
                      isEquipped
                        ? 'bg-emerald-500 text-black font-extrabold cursor-default'
                        : 'bg-white/10 hover:bg-pink-600 text-white'
                    }`}
                  >
                    {isEquipped ? 'EQUIPPED' : 'EQUIP NOW'}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Tab 2: Signature Glow Colors */}
        {activeTab === 'colors' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {SIGNATURE_COLORS.map((col) => {
              const isEquipped = player.color.toLowerCase() === col.hex.toLowerCase();

              return (
                <div
                  key={col.hex}
                  className={`p-3 rounded-2xl bg-black/50 border transition flex flex-col items-center space-y-2.5 ${
                    isEquipped ? 'border-white shadow-xl' : 'border-white/10 hover:border-white/25'
                  }`}
                >
                  <div
                    className="w-12 h-12 rounded-full shadow-lg border-2 border-white/50"
                    style={{ backgroundColor: col.hex, boxShadow: `0 0 15px ${col.hex}` }}
                  ></div>

                  <div className="text-xs font-black text-white text-center">{col.name}</div>

                  <button
                    onClick={() => handleEquipColor(col.hex, col.name)}
                    className={`w-full py-1.5 rounded-xl text-[10px] font-black transition cursor-pointer ${
                      isEquipped
                        ? 'bg-emerald-500 text-black font-extrabold'
                        : 'bg-white/10 hover:bg-white/20 text-white'
                    }`}
                  >
                    {isEquipped ? 'CURRENT COLOR' : 'APPLY COLOR'}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Toast confirmation message */}
        {toastMessage && (
          <div className="py-2 px-4 rounded-xl bg-pink-500 text-white font-black text-xs text-center shadow-lg animate-bounce">
            {toastMessage}
          </div>
        )}

        {/* Footer */}
        <div className="pt-2 border-t border-white/10 flex justify-end">
          <button
            onClick={() => {
              soundEngine.playClick();
              onClose();
            }}
            className="px-6 py-2.5 bg-gradient-to-r from-pink-500 to-rose-600 text-white rounded-xl font-black text-xs shadow-lg cursor-pointer transition hover:scale-105"
          >
            DONE
          </button>
        </div>
      </div>
    </div>
  );
};
