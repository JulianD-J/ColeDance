import React, { useState, useRef } from 'react';
import { Song, Player } from '../types/game';
import { soundEngine } from '../services/soundEffects';
import { getRankConfig } from '../services/momentumScoring';
import { exportCdncePackage, downloadCdnceBlob, importCdncePackage } from '../services/cdncePackageService';

interface HomeScreenProps {
  songs: Song[];
  players: Player[];
  onSelectSong: (song: Song) => void;
  onNavigateToCatalog: () => void;
  onOpenTrainingStudio: () => void;
  onSongImported?: (song: Song) => void;
}

type FilterCategory = 'all' | '2026' | 'cardio' | 'party' | 'custom';

export const HomeScreen: React.FC<HomeScreenProps> = ({
  songs,
  players,
  onSelectSong,
  onNavigateToCatalog,
  onOpenTrainingStudio,
  onSongImported,
}) => {
  const [selectedFilter, setSelectedFilter] = useState<FilterCategory>('all');
  const [hoveredSongId, setHoveredSongId] = useState<string | null>(null);
  const [exportingSongId, setExportingSongId] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importStatus, setImportStatus] = useState<string>('');
  const cdnceFileInputRef = useRef<HTMLInputElement | null>(null);

  const heroSong = songs[0] || null;
  const primaryPlayer = players[0] || { name: 'Player 1', avatarSeed: 'PandaJD', color: '#ff1493' };
  const playerRank = getRankConfig(primaryPlayer.rank || 'Bronze');

  // Filter songs based on interactive category tabs
  const filteredSongs = songs.filter((s) => {
    if (selectedFilter === '2026') return s.year >= 2024;
    if (selectedFilter === 'cardio') return s.bpm >= 130 || s.difficulty === 'Hard' || s.difficulty === 'Extreme';
    if (selectedFilter === 'party') return (s.detectedCoachCount ?? s.coaches?.length ?? 1) >= 2;
    if (selectedFilter === 'custom') return s.isCustomTrained;
    return true;
  });

  const filterTabs: { id: FilterCategory; label: string; count: number }[] = [
    { id: 'all', label: 'All Routines', count: songs.length },
    { id: '2026', label: '2026 Releases', count: songs.filter((s) => s.year >= 2024).length },
    { id: 'cardio', label: 'High Intensity', count: songs.filter((s) => s.bpm >= 130 || s.difficulty === 'Hard' || s.difficulty === 'Extreme').length },
    { id: 'party', label: 'Multi-Coach Duos', count: songs.filter((s) => (s.detectedCoachCount ?? s.coaches?.length ?? 1) >= 2).length },
    { id: 'custom', label: 'Community Custom', count: songs.filter((s) => s.isCustomTrained).length },
  ];

  const handleExportSong = async (e: React.MouseEvent, song: Song) => {
    e.stopPropagation();
    soundEngine.playClick();
    try {
      setExportingSongId(song.id);
      const { blob, filename } = await exportCdncePackage(song);
      downloadCdnceBlob(blob, filename);
      setImportStatus(`Exported ${filename} successfully!`);
      setTimeout(() => setImportStatus(''), 4000);
    } catch (err: any) {
      console.error('Export error:', err);
      setImportStatus(`Export failed: ${err.message || 'Unknown error'}`);
    } finally {
      setExportingSongId(null);
    }
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    soundEngine.playClick();
    setIsImporting(true);
    setImportStatus('Importing .cdnce routine package (extracting high-res video and moves)...');

    try {
      const imported = await importCdncePackage(file);
      soundEngine.playStarUnlock();
      setImportStatus(`"${imported.title}" by ${imported.artist} imported successfully!`);
      onSongImported?.(imported);
      setTimeout(() => setImportStatus(''), 5000);
    } catch (err: any) {
      console.error('Import error:', err);
      setImportStatus(`Import failed: ${err.message || 'Invalid package'}`);
    } finally {
      setIsImporting(false);
      if (e.target) e.target.value = '';
    }
  };

  return (
    <section className="flex-1 flex flex-col space-y-8 select-none pb-12 max-w-7xl mx-auto w-full">
      {/* Hidden .cdnce input */}
      <input
        ref={cdnceFileInputRef}
        type="file"
        accept=".cdnce,.zip"
        className="hidden"
        onChange={handleFileImport}
      />

      {/* Import / Export Notification Banner */}
      {importStatus && (
        <div className="w-full p-3 rounded-2xl bg-gradient-to-r from-pink-950/90 via-purple-950/90 to-cyan-950/90 border border-pink-500/50 shadow-2xl flex items-center justify-between animate-fadeIn text-xs font-bold text-white">
          <div className="flex items-center space-x-2">
            <i className={`fa-solid ${isImporting ? 'fa-spinner animate-spin text-cyan-300' : 'fa-check text-emerald-400'}`}></i>
            <span>{importStatus}</span>
          </div>
          <button
            onClick={() => setImportStatus('')}
            className="text-white/60 hover:text-white px-2 cursor-pointer"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
      )}

      {/* Cinematic Stage Spotlight Hero Banner */}
      <div className="relative w-full rounded-3xl overflow-hidden border border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.8)] bg-[#0c071a]">
        {/* Real High-Fidelity Concert Arena Backdrop */}
        <div className="absolute inset-0 z-0">
          <img
            src="/src/assets/images/hero_concert_stage_1793632684690.jpg"
            alt="ColeDance Concert Stage"
            className="w-full h-full object-cover object-center transform scale-105 filter brightness-75 contrast-110"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#070312] via-[#070312]/80 to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#070312] via-transparent to-[#070312]/40"></div>
        </div>

        {/* Hero Content: Check if any songs exist in library */}
        {heroSong ? (
          <div className="relative z-10 px-6 sm:px-10 md:px-14 py-8 md:py-12 max-w-2xl flex flex-col justify-center space-y-4">
            <div className="flex items-center gap-2.5 text-xs text-white/70">
              <span className="font-black tracking-[0.2em] text-pink-400 uppercase">
                Spotlight Routine
              </span>
              <span aria-hidden="true" className="text-white/40">·</span>
              <span className="text-white/80 font-medium">ColeDance Routine</span>
              <span aria-hidden="true" className="text-white/40">·</span>
              <span className="text-cyan-300 font-medium">{heroSong.bpm} BPM</span>
            </div>

            <div className="space-y-1">
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-black italic tracking-tight text-white uppercase drop-shadow-xl text-balance">
                {heroSong.title}
              </h1>
              <p className="text-lg md:text-xl font-bold text-white/80 tracking-wide">
                {heroSong.artist}
              </p>
            </div>

            <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-xs text-white/70 font-medium pt-1">
              <span className="flex items-center space-x-1.5 text-yellow-300">
                <i className="fa-solid fa-bolt text-xs"></i>
                <span className="font-bold">{heroSong.difficulty.toUpperCase()} CHOREO</span>
              </span>
              <span aria-hidden="true" className="text-white/30">·</span>
              <span>{heroSong.coaches?.length || 1} Coaches</span>
              <span aria-hidden="true" className="text-white/30">·</span>
              <span>{heroSong.genre}</span>
            </div>

            <div className="pt-3 flex flex-wrap items-center gap-3">
              <button
                onClick={() => {
                  soundEngine.playClick();
                  onSelectSong(heroSong);
                }}
                className="px-8 py-3.5 bg-gradient-to-r from-pink-500 via-rose-500 to-amber-400 hover:from-pink-400 hover:to-amber-300 active:scale-95 transition-all text-black font-black italic text-sm tracking-wider rounded-xl shadow-[0_0_25px_rgba(255,20,147,0.7)] flex items-center space-x-2.5 cursor-pointer whitespace-nowrap"
              >
                <i className="fa-solid fa-play text-xs text-black"></i>
                <span>START DANCING</span>
              </button>

              <button
                onClick={(e) => handleExportSong(e, heroSong)}
                disabled={exportingSongId === heroSong.id}
                className="px-5 py-3.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-300 font-bold text-xs tracking-wider uppercase rounded-xl transition cursor-pointer flex items-center space-x-2 whitespace-nowrap backdrop-blur-md"
                title="Export this routine as a shareable .cdnce package (video + moves)"
              >
                <i className={`fa-solid ${exportingSongId === heroSong.id ? 'fa-spinner animate-spin' : 'fa-file-export'}`}></i>
                <span>EXPORT .CDNCE</span>
              </button>

              <button
                onClick={() => {
                  soundEngine.playClick();
                  cdnceFileInputRef.current?.click();
                }}
                className="px-4 py-3.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs tracking-wider uppercase rounded-xl transition cursor-pointer flex items-center space-x-2 whitespace-nowrap backdrop-blur-md"
              >
                <i className="fa-solid fa-file-import text-cyan-300"></i>
                <span>IMPORT .CDNCE</span>
              </button>
            </div>
          </div>
        ) : (
          /* Empty Library Hero State */
          <div className="relative z-10 px-6 sm:px-10 md:px-14 py-12 md:py-16 max-w-2xl flex flex-col justify-center space-y-4">
            <div className="flex items-center gap-2.5 text-xs text-white/70">
              <span className="font-black tracking-[0.2em] text-pink-400 uppercase">
                COLEDANCE ARENA READY
              </span>
              <span aria-hidden="true" className="text-white/40">·</span>
              <span className="text-cyan-300 font-medium">All Demos Cleared</span>
            </div>

            <div className="space-y-1">
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-black italic tracking-tight text-white uppercase drop-shadow-xl text-balance">
                YOUR STAGE AWAITS
              </h1>
              <p className="text-base sm:text-lg font-bold text-white/80 leading-relaxed">
                Import any <span className="text-amber-300">.cdnce</span> routine package or train your own choreography from any MP4 video using AI pose detection.
              </p>
            </div>

            <div className="pt-4 flex flex-wrap items-center gap-3.5">
              <button
                onClick={() => {
                  soundEngine.playClick();
                  cdnceFileInputRef.current?.click();
                }}
                className="px-8 py-4 bg-gradient-to-r from-amber-400 via-orange-500 to-pink-500 hover:from-amber-300 hover:to-pink-400 active:scale-95 transition-all text-black font-black italic text-sm tracking-wider rounded-xl shadow-[0_0_25px_rgba(245,158,11,0.6)] flex items-center space-x-2.5 cursor-pointer"
              >
                <i className="fa-solid fa-file-import text-sm"></i>
                <span>IMPORT .CDNCE PACKAGE</span>
              </button>

              <button
                onClick={() => {
                  soundEngine.playClick();
                  onOpenTrainingStudio();
                }}
                className="px-6 py-4 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs tracking-wider uppercase rounded-xl transition cursor-pointer flex items-center space-x-2 backdrop-blur-md"
              >
                <i className="fa-solid fa-graduation-cap text-yellow-400 text-sm"></i>
                <span>RECORD IN TRAINING STUDIO</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Routine Tracklist Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div>
            <h2 className="text-sm font-black tracking-[0.2em] uppercase text-white/90">
              Choreography Library ({songs.length})
            </h2>
            <p className="text-xs text-white/60">
              Export routines as .cdnce packages to transfer between computers or import friends' routines
            </p>
          </div>

          {/* Action cluster on library header */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                soundEngine.playClick();
                cdnceFileInputRef.current?.click();
              }}
              className="px-3.5 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-300 text-xs font-black rounded-lg transition cursor-pointer flex items-center space-x-1.5"
            >
              <i className="fa-solid fa-file-import text-xs"></i>
              <span>Import .cdnce</span>
            </button>

            <button
              onClick={() => {
                soundEngine.playClick();
                onOpenTrainingStudio();
              }}
              className="px-3.5 py-1.5 bg-pink-600/30 hover:bg-pink-600/50 border border-pink-400/40 text-pink-300 text-xs font-black rounded-lg transition cursor-pointer flex items-center space-x-1.5"
            >
              <i className="fa-solid fa-plus text-xs"></i>
              <span>Train Routine</span>
            </button>
          </div>
        </div>

        {/* Songs Grid */}
        {filteredSongs.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredSongs.map((song) => {
              const isHovered = hoveredSongId === song.id;
              const coachCount = song.detectedCoachCount || song.coaches?.length || 1;

              return (
                <div
                  key={song.id}
                  onMouseEnter={() => setHoveredSongId(song.id)}
                  onMouseLeave={() => setHoveredSongId(null)}
                  onClick={() => {
                    soundEngine.playClick();
                    onSelectSong(song);
                  }}
                  className={`group relative rounded-2xl overflow-hidden border transition-all duration-200 cursor-pointer bg-[#0f0920] ${
                    isHovered
                      ? 'border-pink-500/80 shadow-[0_10px_30px_rgba(255,20,147,0.35)] -translate-y-1'
                      : 'border-white/10 hover:border-white/30'
                  }`}
                >
                  {/* Cover image */}
                  <div className="relative aspect-[4/3] bg-slate-900 overflow-hidden">
                    <img
                      src={song.coverImg}
                      alt={song.title}
                      className="w-full h-full object-cover transform transition-transform duration-500 group-hover:scale-105"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none"></div>

                    {/* Coach Count Indicator */}
                    <div className="absolute top-2.5 left-2.5 px-2 py-1 rounded-md bg-black/70 backdrop-blur-md border border-white/15 text-[10px] font-extrabold text-white flex items-center space-x-1.5 shadow">
                      <i className="fa-solid fa-users text-cyan-400 text-[9px]"></i>
                      <span>{coachCount} COACH{coachCount > 1 ? 'ES' : ''}</span>
                    </div>

                    {/* Export .cdnce button */}
                    <button
                      onClick={(e) => handleExportSong(e, song)}
                      disabled={exportingSongId === song.id}
                      className="absolute top-2.5 right-2.5 px-2 py-1 rounded-md bg-amber-500/80 hover:bg-amber-400 text-black text-[10px] font-black uppercase shadow cursor-pointer transition flex items-center space-x-1"
                      title="Export .cdnce file for transfer between computers"
                    >
                      <i className={`fa-solid ${exportingSongId === song.id ? 'fa-spinner animate-spin' : 'fa-file-export'} text-[9px]`}></i>
                      <span>.CDNCE</span>
                    </button>

                    {/* Bottom Row on Card */}
                    <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between text-xs">
                      <span className="text-[11px] font-bold text-white/90">
                        {song.bpm} BPM
                      </span>
                      <span className={`text-[10px] font-black uppercase tracking-wider ${
                        song.difficulty === 'Extreme'
                          ? 'text-red-400'
                          : song.difficulty === 'Hard'
                          ? 'text-amber-300'
                          : 'text-emerald-400'
                      }`}>
                        {song.difficulty}
                      </span>
                    </div>

                    {/* Play Action Overlay on Hover */}
                    <div className={`absolute inset-0 bg-pink-950/40 backdrop-blur-[2px] flex items-center justify-center transition-opacity duration-150 ${
                      isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'
                    }`}>
                      <div className="w-12 h-12 rounded-full bg-gradient-to-r from-pink-500 to-amber-400 flex items-center justify-center text-black shadow-lg transform transition-transform group-hover:scale-110">
                        <i className="fa-solid fa-play text-sm ml-0.5"></i>
                      </div>
                    </div>
                  </div>

                  {/* Track Details */}
                  <div className="p-3.5 space-y-1">
                    <div className="font-black italic text-base text-white tracking-wide truncate group-hover:text-pink-400 transition-colors">
                      {song.title}
                    </div>
                    <div className="text-xs text-white/60 font-medium truncate">
                      {song.artist}
                    </div>
                    <div className="text-[11px] text-white/40 pt-0.5 truncate">
                      {song.genre}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-12 px-6 rounded-2xl bg-[#0f0920] border border-white/10 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-xl text-white/40 mx-auto">
              <i className="fa-solid fa-compact-disc"></i>
            </div>
            <div className="text-sm font-bold text-white/80">No choreography routines in library</div>
            <p className="text-xs text-white/50 max-w-sm mx-auto">
              Import a .cdnce file package from another machine or record any video in the AI Training Studio.
            </p>
            <div className="flex justify-center gap-3 pt-1">
              <button
                onClick={() => {
                  soundEngine.playClick();
                  cdnceFileInputRef.current?.click();
                }}
                className="px-4 py-2 bg-amber-500 text-black text-xs font-black rounded-xl cursor-pointer"
              >
                Import .cdnce
              </button>
              <button
                onClick={() => {
                  soundEngine.playClick();
                  onOpenTrainingStudio();
                }}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-black rounded-xl border border-white/20 cursor-pointer"
              >
                Open Studio
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Feature Bento Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
        {/* Card 1: .cdnce Portability */}
        <div
          onClick={() => {
            soundEngine.playClick();
            cdnceFileInputRef.current?.click();
          }}
          className="p-5 rounded-2xl bg-[#120a26] border border-white/10 hover:border-amber-400/50 transition-all cursor-pointer shadow-lg space-y-2 group"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-300 text-lg group-hover:scale-110 transition-transform">
            <i className="fa-solid fa-file-zipper"></i>
          </div>
          <div className="text-sm font-black text-white tracking-wide">
            .cdnce Routine Sharing
          </div>
          <p className="text-xs text-white/60 leading-relaxed">
            Export and import standalone .cdnce files containing the full original-resolution video and 17-point move coordinates.
          </p>
          <div className="pt-1 text-xs font-bold text-amber-300 flex items-center space-x-1">
            <span>Import or Export Package</span>
            <i className="fa-solid fa-arrow-right text-[10px] transform group-hover:translate-x-1 transition-transform"></i>
          </div>
        </div>

        {/* Card 2: Training Studio */}
        <div
          onClick={() => {
            soundEngine.playClick();
            onOpenTrainingStudio();
          }}
          className="p-5 rounded-2xl bg-[#120a26] border border-white/10 hover:border-yellow-400/50 transition-all cursor-pointer shadow-lg space-y-2 group"
        >
          <div className="w-10 h-10 rounded-xl bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center text-yellow-300 text-lg group-hover:scale-110 transition-transform">
            <i className="fa-solid fa-graduation-cap"></i>
          </div>
          <div className="text-sm font-black text-white tracking-wide">
            AI Pose Extraction Studio
          </div>
          <p className="text-xs text-white/60 leading-relaxed">
            Feed any MP4 routine to automatically extract 1 to 5 coach keypoint paths with precision trimming.
          </p>
          <div className="pt-1 text-xs font-bold text-yellow-300 flex items-center space-x-1">
            <span>Launch Studio</span>
            <i className="fa-solid fa-arrow-right text-[10px] transform group-hover:translate-x-1 transition-transform"></i>
          </div>
        </div>

        {/* Card 3: Dynamic Multiplier */}
        <div
          onClick={() => {
            soundEngine.playClick();
            onNavigateToCatalog();
          }}
          className="p-5 rounded-2xl bg-[#120a26] border border-white/10 hover:border-pink-500/50 transition-all cursor-pointer shadow-lg space-y-2 group"
        >
          <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-pink-400 text-lg group-hover:scale-110 transition-transform">
            <i className="fa-solid fa-gauge-high"></i>
          </div>
          <div className="text-sm font-black text-white tracking-wide">
            Momentum Multiplier (4x Overdrive)
          </div>
          <p className="text-xs text-white/60 leading-relaxed">
            Dance with high kinetic velocity to power up momentum and unlock ColeDance prestige ranks.
          </p>
          <div className="pt-1 text-xs font-bold text-pink-400 flex items-center space-x-1">
            <span>View Song Library</span>
            <i className="fa-solid fa-arrow-right text-[10px] transform group-hover:translate-x-1 transition-transform"></i>
          </div>
        </div>
      </div>
    </section>
  );
};
