import React, { useState } from 'react';
import { Song, Coach, Player } from '../types/game';
import { soundEngine } from '../services/soundEffects';

interface CoachSelectScreenProps {
  song: Song;
  players?: Player[];
  onSelectCoachAndStart: (coach: Coach, playerCoachAssignments?: Record<string, number>) => void;
  onBackToCatalog: () => void;
}

export const CoachSelectScreen: React.FC<CoachSelectScreenProps> = ({
  song,
  players = [],
  onSelectCoachAndStart,
  onBackToCatalog,
}) => {
  // Use all coaches defined for the song (1 to 5 coaches)
  const coachesList: Coach[] =
    song.coaches && song.coaches.length > 0
      ? song.coaches
      : [
          {
            id: 'c1',
            name: 'Coach 1',
            avatarSeed: 'CoachLead',
            routineName: 'Routine A',
            difficulty: song.difficulty || 'Medium',
            colorGradient: 'from-pink-600 via-purple-600 to-indigo-900',
            coachIndex: 0,
          },
        ];

  // State for which coach each player is assigned to
  const [playerAssignments, setPlayerAssignments] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    players.forEach((p, idx) => {
      // By default distribute players across available coaches
      initial[p.id] = (p.assignedCoachIndex ?? idx) % coachesList.length;
    });
    return initial;
  });

  const [activePlayerForPick, setActivePlayerForPick] = useState<string>(
    players[0]?.id || 'host-player'
  );

  const handleSelectCoachForActivePlayer = (coachIdx: number) => {
    soundEngine.playClick();
    setPlayerAssignments((prev) => ({
      ...prev,
      [activePlayerForPick]: coachIdx,
    }));
  };

  const handleStartGame = () => {
    soundEngine.playClick();
    const primaryCoachIdx = playerAssignments[players[0]?.id] ?? 0;
    const selectedCoach = coachesList[primaryCoachIdx] || coachesList[0];
    onSelectCoachAndStart(selectedCoach, playerAssignments);
  };

  return (
    <section className="flex-1 flex flex-col items-center justify-between space-y-4 select-none py-2 relative">
      {/* Top Bar with Back Button and Song Details */}
      <div className="w-full flex items-center justify-between px-2">
        <button
          onClick={() => {
            soundEngine.playClick();
            onBackToCatalog();
          }}
          className="flex items-center space-x-2 bg-indigo-950/90 hover:bg-pink-600 px-4 py-2 rounded-full border border-white/20 text-xs font-black italic shadow-lg cursor-pointer transition text-white"
        >
          <i className="fa-solid fa-arrow-left"></i>
          <span>BACK TO SONGS</span>
        </button>

        <div className="text-center">
          <h1 className="text-2xl md:text-4xl font-black italic text-pink-400 drop-shadow-[0_0_20px_rgba(255,20,147,0.8)]">
            Select your Coach
          </h1>
          <p className="text-xs font-bold text-white/80">
            {song.title} — {song.artist} •{' '}
            <span className="text-cyan-400 font-extrabold uppercase">
              {coachesList.length} {coachesList.length === 1 ? 'Coach' : 'Coaches'} Available
            </span>
          </p>
        </div>

        <div className="w-24"></div>
      </div>

      {/* Multi-Player Switcher Header if more than 1 player is connected */}
      {players.length > 1 && (
        <div className="flex items-center space-x-3 bg-black/60 px-4 py-2 rounded-2xl border border-white/15">
          <span className="text-[11px] font-black uppercase text-white/70">
            Choose Coach for:
          </span>
          <div className="flex space-x-2">
            {players.map((p) => {
              const isSelected = activePlayerForPick === p.id;
              const assignedIdx = playerAssignments[p.id] ?? 0;
              const coachName = coachesList[assignedIdx]?.name || `Coach ${assignedIdx + 1}`;

              return (
                <button
                  key={p.id}
                  onClick={() => {
                    soundEngine.playClick();
                    setActivePlayerForPick(p.id);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center space-x-2 border transition cursor-pointer ${
                    isSelected
                      ? 'bg-pink-600 text-white border-white shadow-[0_0_12px_#ff1493]'
                      : 'bg-indigo-950/70 text-white/80 border-white/20 hover:border-pink-400'
                  }`}
                >
                  <img
                    src={`https://api.dicebear.com/7.x/bottts/svg?seed=${p.avatarSeed}`}
                    className="w-4 h-4 rounded-full bg-black"
                    alt={p.name}
                  />
                  <span>{p.name.split(' ')[0]}</span>
                  <span className="text-[10px] bg-black/40 px-1.5 py-0.5 rounded text-cyan-300">
                    {coachName}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 1 to 5 Coaches Grid matching ColeDance UI Layout */}
      <div
        className={`flex flex-wrap items-center justify-center gap-4 md:gap-6 w-full max-w-6xl py-2 ${
          coachesList.length <= 2
            ? 'max-w-2xl'
            : coachesList.length === 3
            ? 'max-w-4xl'
            : 'max-w-6xl'
        }`}
      >
        {coachesList.map((coach, index) => {
          // Check which players are assigned to this coach
          const assignedPlayers = players.filter(
            (p) => (playerAssignments[p.id] ?? 0) === index
          );
          const isAssignedToActive = (playerAssignments[activePlayerForPick] ?? 0) === index;

          return (
            <div
              key={coach.id || index}
              onClick={() => handleSelectCoachForActivePlayer(index)}
              className={`group relative rounded-3xl overflow-hidden border-2 cursor-pointer transition-all duration-300 transform p-4 flex flex-col justify-between shadow-[0_15px_35px_rgba(0,0,0,0.6)] ${
                coachesList.length === 1
                  ? 'w-72 md:w-80 h-[28rem]'
                  : coachesList.length === 2
                  ? 'w-64 md:w-72 h-[27rem]'
                  : coachesList.length === 3
                  ? 'w-56 md:w-64 h-[26rem]'
                  : 'w-48 md:w-56 h-[25rem]'
              } ${
                isAssignedToActive
                  ? 'border-pink-400 ring-4 ring-pink-500/50 scale-105 -translate-y-2 bg-gradient-to-t from-[#2c0957] via-[#3a1078] to-[#1a0538]'
                  : 'border-white/20 hover:border-pink-500 bg-gradient-to-t from-[#1b0840] via-[#2a0e5b] to-[#12042d] hover:scale-102'
              }`}
            >
              {/* Pattern Background */}
              <div className="absolute inset-0 opacity-15 mix-blend-overlay bg-[radial-gradient(#ff1493_1px,transparent_1px)] [background-size:16px_16px]"></div>

              {/* Coach Badge Header */}
              <div className="flex items-center justify-between z-10">
                <span className="bg-black/70 px-3 py-1 rounded-full text-[10px] font-black text-cyan-300 border border-white/10 uppercase tracking-widest shadow">
                  COACH {index + 1}
                </span>

                <span
                  className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase border ${
                    coach.difficulty === 'Easy'
                      ? 'bg-emerald-600/80 text-white border-emerald-400'
                      : coach.difficulty === 'Medium'
                      ? 'bg-amber-600/80 text-white border-amber-400'
                      : 'bg-rose-600/80 text-white border-rose-400'
                  }`}
                >
                  {coach.difficulty}
                </span>
              </div>

              {/* Coach Avatar Illustration */}
              <div className="relative my-auto flex justify-center items-center z-10">
                <div
                  className={`absolute w-40 h-40 rounded-full blur-2xl transition ${
                    isAssignedToActive
                      ? 'bg-pink-500/50 scale-110'
                      : 'bg-pink-500/20 group-hover:bg-pink-500/40'
                  }`}
                ></div>
                <img
                  src={`https://api.dicebear.com/7.x/big-smile/svg?seed=${coach.avatarSeed || coach.name}`}
                  alt={coach.name}
                  className="w-full h-48 md:h-56 object-contain drop-shadow-[0_0_25px_rgba(255,20,147,0.7)] transform group-hover:scale-110 transition duration-300"
                />
              </div>

              {/* Assigned Players Badges */}
              <div className="z-10 min-h-[28px] flex items-center justify-center gap-1.5 flex-wrap">
                {assignedPlayers.map((ap) => (
                  <span
                    key={ap.id}
                    className="bg-black/80 border border-pink-400 text-[9px] font-black px-2 py-0.5 rounded-full text-pink-300 flex items-center space-x-1 shadow"
                  >
                    <img
                      src={`https://api.dicebear.com/7.x/bottts/svg?seed=${ap.avatarSeed}`}
                      className="w-3.5 h-3.5 rounded-full"
                      alt={ap.name}
                    />
                    <span>{ap.name.split(' ')[0]}</span>
                  </span>
                ))}
              </div>

              {/* Bottom Coach Name Pill */}
              <div className="z-10 text-center pb-1 space-y-1 mt-2">
                <div
                  className={`py-2 rounded-xl font-black italic text-sm tracking-wider text-white shadow-lg transition border border-white/20 ${
                    isAssignedToActive
                      ? 'bg-gradient-to-r from-pink-600 to-purple-600'
                      : 'bg-gradient-to-r from-blue-700 to-indigo-700 group-hover:from-pink-600 group-hover:to-purple-600'
                  }`}
                >
                  {coach.name}
                </div>
                <div className="text-[10px] text-cyan-300 font-bold truncate">
                  {coach.routineName || `Routine ${String.fromCharCode(65 + index)}`}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Prominent Action Bar */}
      <div className="w-full flex justify-center pt-2">
        <button
          onClick={handleStartGame}
          className="px-8 py-3.5 bg-gradient-to-r from-pink-500 via-rose-500 to-yellow-400 hover:from-pink-400 hover:to-yellow-300 text-black text-sm md:text-base font-black italic tracking-wider rounded-full shadow-[0_0_35px_rgba(255,20,147,0.85)] border-2 border-white cursor-pointer transform hover:scale-105 transition flex items-center space-x-3"
        >
          <i className="fa-solid fa-play text-lg"></i>
          <span>DANCE NOW WITH SELECTED COACH</span>
        </button>
      </div>
    </section>
  );
};
