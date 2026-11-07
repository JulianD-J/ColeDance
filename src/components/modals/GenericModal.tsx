import React from 'react';
import { soundEngine } from '../../services/soundEffects';

interface GenericModalProps {
  title: string;
  body: string;
  onClose: () => void;
}

export const GenericModal: React.FC<GenericModalProps> = ({ title, body, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 select-none">
      <div className="bg-[#0f0c2e] border-2 border-pink-500/50 rounded-3xl p-6 max-w-sm w-full space-y-4 text-center shadow-2xl">
        <div className="w-12 h-12 bg-pink-500/20 text-pink-500 rounded-2xl flex items-center justify-center mx-auto text-xl border border-pink-500/40 shadow-lg">
          <i className="fa-solid fa-sparkles text-yellow-300"></i>
        </div>
        <h3 className="text-xl font-black italic text-white drop-shadow">{title}</h3>
        <p className="text-xs text-white/80 font-medium leading-relaxed">{body}</p>
        <button
          onClick={() => {
            soundEngine.playClick();
            onClose();
          }}
          className="w-full py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs font-black rounded-xl shadow-lg hover:scale-105 transition cursor-pointer"
        >
          CLOSE
        </button>
      </div>
    </div>
  );
};
