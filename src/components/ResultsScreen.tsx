import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { Song, Coach, Player } from '../types/game';
import { generateGeminiDanceReview } from '../services/geminiService';
import { soundEngine } from '../services/soundEffects';
import { getRankConfig, getRankForScore } from '../services/momentumScoring';

interface ResultsScreenProps {
  song: Song;
  coach: Coach;
  players: Player[];
  onPlayAgain: () => void;
  onReturnHome: () => void;
}

export const ResultsScreen: React.FC<ResultsScreenProps> = ({
  song,
  coach,
  players,
  onPlayAgain,
  onReturnHome,
}) => {
  const [aiReview, setAiReview] = useState<string>('Generating Coach AI Review...');

  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  const topPlayer = sortedPlayers[0];

  useEffect(() => {
    // Confetti burst
    confetti({
      particleCount: 120,
      spread: 90,
      origin: { y: 0.6 },
    });
    soundEngine.playStarUnlock();

    // Generate Gemini Review
    const perfectCount = Math.floor(topPlayer.score / 300);
    const playerNames = players.map((p) => p.name);

    generateGeminiDanceReview(
      song.title,
      song.artist,
      topPlayer.score,
      topPlayer.stars,
      perfectCount,
      playerNames
    ).then((review) => {
      setAiReview(review);
    });
  }, [song, players]);

  return (
    <section className="flex-1 flex flex-col items-center justify-center p-4 select-none max-w-4xl mx-auto space-y-6">
      {/* Title */}
      <div className="text-center space-y-1">
        <span className="text-xs font-extrabold text-cyan-400 tracking-widest uppercase bg-black/50 px-3 py-1 rounded-full border border-white/10">
          ROUTINE COMPLETED
        </span>
        <h1 className="text-4xl md:text-5xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-yellow-300 to-cyan-400 drop-shadow-[0_0_20px_rgba(255,20,147,0.8)]">
          MEGASTAR RESULTS
        </h1>
        <p className="text-sm text-white/80 font-bold">{song.title} - {song.artist}</p>
      </div>

      {/* Leaderboard Podiums */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
        {sortedPlayers.map((p, idx) => {
          const rank = p.rank || getRankForScore(p.score);
          const rankCfg = getRankConfig(rank);
          const peakMultiplier = p.multiplier || 1;
          const bestStreak = p.maxStreak || p.streak || 0;

          return (
            <div
              key={p.id}
              className={`p-5 rounded-2xl border backdrop-blur-md flex flex-col items-center space-y-3 relative overflow-hidden transition shadow-2xl ${
                idx === 0
                  ? 'bg-gradient-to-b from-yellow-500/30 via-purple-900/80 to-indigo-950 border-yellow-400 ring-2 ring-yellow-400/50 scale-105'
                  : 'bg-[#130b33]/80 border-white/15'
              }`}
            >
              {idx === 0 && (
                <span className="absolute top-2 right-2 bg-yellow-400 text-black text-[10px] font-black px-2.5 py-0.5 rounded-full shadow">
                  👑 WINNER
                </span>
              )}

              {/* Avatar */}
              <div className="relative">
                <div
                  className="w-20 h-20 rounded-full p-1 shadow-xl"
                  style={{ background: `linear-gradient(135deg, ${p.color}, #00d2ff)` }}
                >
                  <img
                    src={`https://api.dicebear.com/7.x/bottts/svg?seed=${p.avatarSeed}`}
                    className="w-full h-full rounded-full bg-indigo-950 object-cover"
                    alt={p.name}
                  />
                </div>
              </div>

              <div className="text-center space-y-1.5 w-full">
                <div className="font-black italic text-lg text-white">{p.name}</div>

                {/* ColeDance Prestige Rank Crest */}
                <div className="flex justify-center">
                  <div
                    className={`px-3 py-1 rounded-full text-xs font-black tracking-wider text-black bg-gradient-to-r ${rankCfg.gradient} border border-white/40 shadow-lg flex items-center space-x-1.5`}
                    style={{ boxShadow: `0 0 15px ${rankCfg.badgeColor}` }}
                  >
                    <i className="fa-solid fa-crown text-[10px]"></i>
                    <span>{rankCfg.name.toUpperCase()}</span>
                  </div>
                </div>

                <div className="text-2xl font-black text-yellow-300 drop-shadow">
                  {p.score.toLocaleString()} PTS
                </div>

                {/* Stars Meter */}
                <div className="flex justify-center text-yellow-300 text-sm space-x-1">
                  {Array.from({ length: Math.min(5, p.stars) }).map((_, i) => (
                    <i key={i} className="fa-solid fa-star drop-shadow"></i>
                  ))}
                  {p.stars >= 6 && (
                    <span className="text-[9px] font-black bg-gradient-to-r from-yellow-300 to-pink-500 text-black px-2 py-0.5 rounded shadow ml-1">
                      {p.stars === 7 ? 'MEGASTAR' : 'SUPERSTAR'}
                    </span>
                  )}
                </div>

                {/* Routine Stats: Multiplier and Streak */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10 text-center w-full">
                  <div className="bg-black/40 rounded-lg p-1.5 border border-white/10">
                    <div className="text-[9px] text-white/60 font-bold uppercase">Max Streak</div>
                    <div className="text-xs font-black text-amber-300 flex items-center justify-center space-x-1">
                      <span>{bestStreak}</span>
                      <i className="fa-solid fa-fire text-amber-400 text-[10px]"></i>
                    </div>
                  </div>
                  <div className="bg-black/40 rounded-lg p-1.5 border border-white/10">
                    <div className="text-[9px] text-white/60 font-bold uppercase">Multiplier</div>
                    <div className="text-xs font-black text-cyan-300">
                      x{peakMultiplier} {peakMultiplier >= 4 ? 'MAX' : ''}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Gemini AI Coach Review Card */}
      <div className="w-full p-4 rounded-2xl bg-gradient-to-r from-purple-900/90 via-indigo-950/90 to-pink-900/90 border border-pink-500/40 shadow-2xl space-y-2">
        <div className="flex items-center space-x-2 text-pink-400 font-extrabold text-xs uppercase tracking-wider">
          <i className="fa-solid fa-sparkles text-yellow-300"></i>
          <span>GEMINI AI DANCE COACH REVIEW</span>
        </div>
        <p className="text-xs md:text-sm italic font-medium text-white/90 leading-relaxed">
          "{aiReview}"
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center space-x-4 pt-2">
        <button
          onClick={() => {
            soundEngine.playClick();
            onPlayAgain();
          }}
          className="px-8 py-3.5 bg-gradient-to-r from-pink-500 to-rose-600 hover:scale-105 font-black italic text-sm rounded-full shadow-2xl flex items-center space-x-2 border border-white/30 cursor-pointer"
        >
          <i className="fa-solid fa-rotate-right"></i>
          <span>REPLAY ROUTINE</span>
        </button>

        <button
          onClick={() => {
            soundEngine.playClick();
            onReturnHome();
          }}
          className="px-6 py-3.5 bg-black/50 hover:bg-white/20 border border-white/20 font-black italic text-xs rounded-full cursor-pointer transition text-white"
        >
          MAIN MENU
        </button>
      </div>
    </section>
  );
};
