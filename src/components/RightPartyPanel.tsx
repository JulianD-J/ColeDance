import React from 'react';
import { Player } from '../types/game';
import { soundEngine } from '../services/soundEffects';

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
    <aside className="hidden lg:flex fixed right-0 top-0 bottom-0 w-16 z-40 flex-col items-center justify-between py-5 bg-[#070312]/95 border-l border-white/10 backdrop-blur-xl select-none">
      {/* Top: Party Lounge Icon */}
      <button
        onClick={() => {
          soundEngine.playClick();
          onOpenPhonePairing();
        }}
        title="Party Lobby & Smartphone Controllers"
        className="w-10 h-10 rounded-xl bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-400/30 flex items-center justify-center text-xs text-cyan-300 transition cursor-pointer shadow"
      >
        <i className="fa-solid fa-mobile-screen text-sm"></i>
      </button>

      {/* Center: Dancers Stack */}
      <div className="flex flex-col items-center space-y-3.5">
        <span className="text-[9px] font-black tracking-widest text-white/40 uppercase">
          LOBBY
        </span>

        {players.map((p, idx) => (
          <div
            key={p.id || idx}
            onClick={() => {
              soundEngine.playClick();
              if (idx === 0) {
                onOpenProfileEditor();
              } else {
                onOpenDancerCard(p);
              }
            }}
            title={`${p.name} (Click to view dancer card)`}
            className="relative group cursor-pointer transition transform hover:scale-110"
          >
            <div
              className="w-10 h-10 rounded-xl p-[2px] shadow-lg"
              style={{
                background: `linear-gradient(135deg, ${p.color}, #00d2ff)`,
              }}
            >
              <img
                src={`https://api.dicebear.com/7.x/bottts/svg?seed=${p.avatarSeed}`}
                className="w-full h-full rounded-[10px] bg-indigo-950 object-cover"
                alt={p.name}
              />
            </div>

            {/* Input hardware type indicator */}
            <span
              className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border border-black flex items-center justify-center text-[7px] font-bold ${
                p.isPhoneController ? 'bg-emerald-400 text-black' : 'bg-pink-500 text-white'
              }`}
            >
              <i className={`fa-solid ${p.isPhoneController ? 'fa-mobile-screen' : 'fa-video'}`}></i>
            </span>

            {/* Hover Tooltip */}
            <div className="absolute right-14 top-1/2 -translate-y-1/2 bg-[#0d0720] text-white text-[10px] font-bold px-2.5 py-1 rounded-lg border border-white/20 opacity-0 group-hover:opacity-100 transition whitespace-nowrap pointer-events-none z-50 shadow-xl">
              P{idx + 1}: {p.name}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom: Invite / Pair More Dancers */}
      <button
        onClick={() => {
          soundEngine.playClick();
          onOpenPhonePairing();
        }}
        title="Connect Smartphone or Camera Dancers"
        className="w-10 h-10 rounded-xl bg-pink-950/40 hover:bg-pink-600 border border-pink-500/40 transition flex items-center justify-center text-pink-300 hover:text-white text-xs shadow-md cursor-pointer group"
      >
        <i className="fa-solid fa-user-plus text-xs"></i>
      </button>
    </aside>
  );
};
