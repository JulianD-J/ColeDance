import React from 'react';
import { Player } from '../../types/game';
import { soundEngine } from '../../services/soundEffects';

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
  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 select-none">
      <div className="max-w-md w-full bg-[#130b33]/95 border-2 border-pink-500/80 rounded-3xl p-5 sm:p-7 shadow-[0_0_50px_rgba(255,20,147,0.4)] text-white space-y-5">
        {/* Header */}
        <div className="flex justify-between items-center pb-2 border-b border-white/10">
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-black bg-pink-600 text-white px-2 py-0.5 rounded uppercase tracking-wider">
              OFFICIAL DANCER CARD
            </span>
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

        {/* Card Body */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div
            className="w-24 h-24 rounded-full p-1 shadow-2xl relative"
            style={{
              background: `linear-gradient(135deg, ${player.color}, #00d2ff)`,
              boxShadow: `0 0 25px ${player.color}`,
            }}
          >
            <img
              src={`https://api.dicebear.com/7.x/bottts/svg?seed=${player.avatarSeed}`}
              alt={player.name}
              className="w-full h-full rounded-full bg-indigo-950 object-cover"
            />
            <div className="absolute -bottom-1 -right-1 bg-yellow-400 text-black font-black text-xs w-7 h-7 rounded-full flex items-center justify-center border-2 border-indigo-950 shadow">
              ★
            </div>
          </div>

          <div>
            <h3 className="text-xl font-black italic tracking-wide text-white">{player.name}</h3>
            <div className="text-xs text-cyan-300 font-bold flex items-center justify-center space-x-1.5 mt-0.5">
              <span>{player.isPhoneController ? 'Smartphone Sync Controller' : 'YOLOv8 AI Camera Dancer'}</span>
            </div>
          </div>

          {/* Stats Badges */}
          <div className="grid grid-cols-3 gap-2 w-full pt-1">
            <div className="p-3 bg-white/5 rounded-2xl border border-white/10 text-center">
              <div className="text-[10px] text-white/50 font-bold uppercase">Rank</div>
              <div className="text-base font-black text-yellow-300">MEGASTAR</div>
            </div>
            <div className="p-3 bg-white/5 rounded-2xl border border-white/10 text-center">
              <div className="text-[10px] text-white/50 font-bold uppercase">Stars</div>
              <div className="text-base font-black text-pink-400">★★★★★</div>
            </div>
            <div className="p-3 bg-white/5 rounded-2xl border border-white/10 text-center">
              <div className="text-[10px] text-white/50 font-bold uppercase">Accuracy</div>
              <div className="text-base font-black text-emerald-400">96.8%</div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-2 border-t border-white/10">
          <button
            onClick={() => {
              soundEngine.playClick();
              onClose();
              onOpenProfileEditor();
            }}
            className="w-full py-2.5 bg-gradient-to-r from-pink-500 to-rose-600 hover:scale-[1.01] text-white rounded-xl text-xs font-black italic shadow-lg cursor-pointer transition flex items-center justify-center space-x-2"
          >
            <i className="fa-solid fa-user-pen"></i>
            <span>CUSTOMIZE AVATAR & NAME</span>
          </button>
        </div>
      </div>
    </div>
  );
};
