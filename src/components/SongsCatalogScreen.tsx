import React, { useState, useRef } from 'react';
import { Song, Player } from '../types/game';
import { soundEngine } from '../services/soundEffects';
import { exportCdncePackage, downloadCdnceBlob, importCdncePackage } from '../services/cdncePackageService';

interface SongsCatalogScreenProps {
  songs: Song[];
  primaryPlayer?: Player;
  onSelectSong: (song: Song) => void;
  onOpenTrainingStudio?: () => void;
  onDeleteSong?: (songId: string) => void;
  onSongImported?: (song: Song) => void;
}

export const SongsCatalogScreen: React.FC<SongsCatalogScreenProps> = ({
  songs,
  primaryPlayer = { name: 'Player 1', avatarSeed: 'PandaJD', color: '#ff1493' } as Player,
  onSelectSong,
  onOpenTrainingStudio,
  onDeleteSong,
  onSongImported,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLetterTab, setSelectedLetterTab] = useState('ALL');
  const [selectedGenre, setSelectedGenre] = useState<string>('ALL');
  const [selectedDiff, setSelectedDiff] = useState<string>('ALL');
  const [selectedMood, setSelectedMood] = useState<string>('ALL');
  const [sortOrder, setSortOrder] = useState<'A-Z' | 'DIFF' | 'BPM'>('A-Z');
  const [expandedAccordion, setExpandedAccordion] = useState<string | null>('GENRES');
  const [hoveredSongId, setHoveredSongId] = useState<string | null>(null);
  const [exportingSongId, setExportingSongId] = useState<string | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [songToDelete, setSongToDelete] = useState<Song | null>(null);
  const [statusBanner, setStatusBanner] = useState<string>('');
  const catalogFileInputRef = useRef<HTMLInputElement | null>(null);

  const handleExportCdnce = async (e: React.MouseEvent, song: Song) => {
    e.stopPropagation();
    soundEngine.playClick();
    try {
      setExportingSongId(song.id);
      const { blob, filename } = await exportCdncePackage(song);
      downloadCdnceBlob(blob, filename);
      setStatusBanner(`Exported ${filename} successfully!`);
      setTimeout(() => setStatusBanner(''), 4000);
    } catch (err: any) {
      console.error('Export error:', err);
      setStatusBanner(`Export failed: ${err.message || 'Unknown error'}`);
    } finally {
      setExportingSongId(null);
    }
  };

  const handleImportCdnce = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    soundEngine.playClick();
    setStatusBanner('Importing .cdnce routine package...');
    try {
      const imported = await importCdncePackage(file);
      soundEngine.playStarUnlock();
      setStatusBanner(`"${imported.title}" by ${imported.artist} imported successfully!`);
      onSongImported?.(imported);
      setTimeout(() => setStatusBanner(''), 4000);
    } catch (err: any) {
      console.error('Import error:', err);
      setStatusBanner(`Import failed: ${err.message || 'Invalid package'}`);
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  // Alphabetical ranges
  const letterTabs = ['ALL', 'A-E', 'F-J', 'K-O', 'P-T', 'U-Z'];

  const filteredSongs = songs
    .filter((s) => {
      const matchesSearch =
        s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.artist.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesGenre = selectedGenre === 'ALL' || s.genre.toLowerCase().includes(selectedGenre.toLowerCase());
      const matchesDiff = selectedDiff === 'ALL' || s.difficulty === selectedDiff;
      const matchesMood = selectedMood === 'ALL' || (s.mood && s.mood.toLowerCase().includes(selectedMood.toLowerCase()));

      let matchesLetter = true;
      if (selectedLetterTab !== 'ALL') {
        const firstLetter = s.title.trim().toUpperCase()[0];
        if (selectedLetterTab === 'A-E') matchesLetter = firstLetter >= 'A' && firstLetter <= 'E';
        else if (selectedLetterTab === 'F-J') matchesLetter = firstLetter >= 'F' && firstLetter <= 'J';
        else if (selectedLetterTab === 'K-O') matchesLetter = firstLetter >= 'K' && firstLetter <= 'O';
        else if (selectedLetterTab === 'P-T') matchesLetter = firstLetter >= 'P' && firstLetter <= 'T';
        else if (selectedLetterTab === 'U-Z') matchesLetter = firstLetter >= 'U' && firstLetter <= 'Z';
      }

      return matchesSearch && matchesGenre && matchesDiff && matchesMood && matchesLetter;
    })
    .sort((a, b) => {
      if (sortOrder === 'A-Z') return a.title.localeCompare(b.title);
      if (sortOrder === 'DIFF') {
        const rank = { Easy: 1, Medium: 2, Hard: 3, Extreme: 4 };
        return rank[b.difficulty] - rank[a.difficulty];
      }
      return b.bpm - a.bpm;
    });

  const handleSpinWheel = () => {
    soundEngine.playClick();
    if (songs.length === 0) return;
    setIsSpinning(true);
    let spins = 0;
    const interval = setInterval(() => {
      soundEngine.playClick();
      spins++;
      if (spins > 10) {
        clearInterval(interval);
        setIsSpinning(false);
        const randomSong = songs[Math.floor(Math.random() * songs.length)];
        onSelectSong(randomSong);
      }
    }, 110);
  };

  const handleResetFilters = () => {
    soundEngine.playClick();
    setSearchTerm('');
    setSelectedLetterTab('ALL');
    setSelectedGenre('ALL');
    setSelectedDiff('ALL');
    setSelectedMood('ALL');
    setSortOrder('A-Z');
  };

  const renderDifficultyBattery = (difficulty: string) => {
    const barsCount =
      difficulty === 'Easy' ? 1 : difficulty === 'Medium' ? 2 : difficulty === 'Hard' ? 3 : 4;

    return (
      <div className="flex items-center space-x-0.5 bg-black/60 px-1.5 py-0.5 rounded border border-white/20">
        <div className="flex space-x-0.5 items-center">
          {[1, 2, 3, 4].map((bar) => (
            <div
              key={bar}
              className={`w-1 h-2 rounded-[1px] ${
                bar <= barsCount ? 'bg-yellow-300' : 'bg-white/20'
              }`}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <section className="flex-1 flex flex-col lg:flex-row space-y-4 lg:space-y-0 lg:space-x-6 select-none pb-8">
      {/* Left Main Catalog Content */}
      <div className="flex-1 space-y-4">
        {/* Top Header Bar: "YOUR SONGS" and Tab categories */}
        <div className="flex flex-wrap justify-between items-center gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black italic tracking-wide text-white drop-shadow">
              YOUR SONGS
            </h1>
            <div className="flex space-x-1 bg-black/40 p-1 rounded-xl border border-white/10 overflow-x-auto scrollbar-none">
              {letterTabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => {
                    soundEngine.playClick();
                    setSelectedLetterTab(tab);
                  }}
                  className={`px-2 sm:px-2.5 py-1 rounded-lg text-[10px] sm:text-[11px] font-black transition cursor-pointer shrink-0 ${
                    selectedLetterTab === tab
                      ? 'bg-pink-600 text-white shadow-lg'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              ref={catalogFileInputRef}
              type="file"
              accept=".cdnce,.zip"
              className="hidden"
              onChange={handleImportCdnce}
            />

            <button
              onClick={() => {
                soundEngine.playClick();
                catalogFileInputRef.current?.click();
              }}
              className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-300 rounded-xl text-xs font-black italic transition cursor-pointer flex items-center space-x-1.5 shadow"
              title="Import .cdnce routine package from file"
            >
              <i className="fa-solid fa-file-import text-amber-400"></i>
              <span>IMPORT .CDNCE</span>
            </button>

            {onOpenTrainingStudio && (
              <button
                onClick={() => {
                  soundEngine.playClick();
                  onOpenTrainingStudio();
                }}
                className="px-3 py-1.5 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-400/40 text-yellow-300 rounded-xl text-xs font-black italic transition cursor-pointer flex items-center space-x-1.5 shadow"
              >
                <i className="fa-solid fa-graduation-cap"></i>
                <span>+ ADD ROUTINE</span>
              </button>
            )}
          </div>
        </div>

        {statusBanner && (
          <div className="p-3 bg-amber-950/60 border border-amber-500/40 rounded-xl text-xs font-bold text-amber-300 flex items-center justify-between">
            <span>{statusBanner}</span>
            <button onClick={() => setStatusBanner('')} className="text-white/60 hover:text-white cursor-pointer">
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        )}

        {/* Random Song Wheel Banner */}
        <div
          onClick={handleSpinWheel}
          className={`w-full p-3 rounded-2xl bg-gradient-to-r from-indigo-900 via-purple-800 to-pink-600 flex items-center justify-between cursor-pointer hover:scale-[1.01] transition shadow-xl border border-white/20 ${
            isSpinning ? 'animate-pulse ring-4 ring-pink-500' : ''
          }`}
        >
          <div className="flex items-center space-x-3">
            <div
              className={`w-10 h-10 rounded-xl bg-yellow-300 text-black flex items-center justify-center text-lg font-black shadow shrink-0 ${
                isSpinning ? 'animate-spin' : ''
              }`}
            >
              <i className="fa-solid fa-shuffle"></i>
            </div>
            <div>
              <div className="text-xs font-black uppercase text-yellow-300 tracking-wider">
                ¡Sorpréndeme! / Surprise Me!
              </div>
              <div className="text-[11px] text-white/80 line-clamp-1">
                Spin the wheel to jump into a random routine from your library
              </div>
            </div>
          </div>

          <button className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-500 hover:scale-105 text-white text-xs font-black italic rounded-full shadow-lg border border-white/20 cursor-pointer shrink-0">
            {isSpinning ? 'SPINNING...' : '¡DANCE!'}
          </button>
        </div>

        {/* Search Input */}
        <div className="relative">
          <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-white/40 text-xs"></i>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search songs, artists, or genres..."
            className="w-full pl-10 pr-4 py-2.5 bg-[#130b33]/80 border border-white/15 rounded-xl text-xs font-medium text-white placeholder-white/40 focus:outline-none focus:border-pink-500 transition shadow-inner"
          />
        </div>

        {/* Mobile Quick Filter Chips (Visible on mobile/tablet) */}
        <div className="flex lg:hidden overflow-x-auto space-x-1.5 py-1 scrollbar-none">
          {['ALL', 'Easy', 'Medium', 'Hard', 'Extreme'].map((d) => (
            <button
              key={d}
              onClick={() => {
                soundEngine.playClick();
                setSelectedDiff(d);
              }}
              className={`px-3 py-1 rounded-full text-[10px] font-black transition cursor-pointer shrink-0 ${
                selectedDiff === d ? 'bg-pink-600 text-white shadow' : 'bg-white/10 text-white/70'
              }`}
            >
              {d === 'ALL' ? 'ALL DIFFICULTIES' : d.toUpperCase()}
            </button>
          ))}
          {['Pop', 'Electro-Dance', 'K-Pop'].map((g) => (
            <button
              key={g}
              onClick={() => {
                soundEngine.playClick();
                setSelectedGenre(selectedGenre === g ? 'ALL' : g);
              }}
              className={`px-3 py-1 rounded-full text-[10px] font-black transition cursor-pointer shrink-0 ${
                selectedGenre === g ? 'bg-cyan-500 text-black shadow' : 'bg-white/10 text-white/70'
              }`}
            >
              {g}
            </button>
          ))}
        </div>

        {/* Responsive Songs Grid: 2 cols on mobile, 3 cols on tablet, 3-4 cols on desktop */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {filteredSongs.map((song) => {
            const isHovered = hoveredSongId === song.id;

            return (
              <div
                key={song.id}
                onMouseEnter={() => setHoveredSongId(song.id)}
                onMouseLeave={() => setHoveredSongId(null)}
                onClick={() => {
                  soundEngine.playClick();
                  onSelectSong(song);
                }}
                className={`group relative bg-[#0f0920] rounded-2xl overflow-hidden border cursor-pointer transition-all duration-200 ${
                  isHovered
                    ? 'border-pink-500/80 shadow-[0_10px_30px_rgba(255,20,147,0.35)] -translate-y-1 z-20'
                    : 'border-white/10 hover:border-white/30'
                }`}
              >
                <div className="h-32 sm:h-36 bg-slate-900 relative overflow-hidden">
                  <img
                    src={song.coverImg}
                    alt={song.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none"></div>

                  {/* Delete custom song button */}
                  {song.isCustomTrained && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        soundEngine.playClick();
                        setSongToDelete(song);
                      }}
                      className="absolute top-2 left-2 bg-black/80 hover:bg-red-600 text-white/70 hover:text-white p-1.5 rounded-lg text-[10px] transition z-30 cursor-pointer shadow border border-white/10"
                      title="Delete Custom Routine"
                    >
                      <i className="fa-solid fa-trash-can"></i>
                    </button>
                  )}

                  {/* Export .cdnce Package Button */}
                  <button
                    onClick={(e) => handleExportCdnce(e, song)}
                    disabled={exportingSongId === song.id}
                    className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-amber-500/80 hover:bg-amber-400 text-black text-[10px] font-black uppercase shadow cursor-pointer transition flex items-center space-x-1 z-30"
                    title="Export .cdnce routine package (video + moves)"
                  >
                    <i className={`fa-solid ${exportingSongId === song.id ? 'fa-spinner animate-spin' : 'fa-file-export'} text-[9px]`}></i>
                    <span>.CDNCE</span>
                  </button>

                  {/* Coach count badge */}
                  <div className="absolute top-2 right-20 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded-md text-[10px] text-cyan-300 font-bold border border-white/10 shadow">
                    {song.detectedCoachCount || song.coaches?.length || 1}{' '}
                    {(song.detectedCoachCount || song.coaches?.length || 1) > 1 ? 'COACHES' : 'COACH'}
                  </div>

                  {/* Bottom row on card: BPM on left, Difficulty on right */}
                  <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center text-xs">
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

                  {/* Play Action Hover Glow */}
                  <div className={`absolute inset-0 bg-pink-950/40 backdrop-blur-[2px] flex items-center justify-center transition-opacity duration-150 ${
                    isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'
                  }`}>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-pink-500 to-amber-400 flex items-center justify-center text-black shadow-lg">
                      <i className="fa-solid fa-play text-xs ml-0.5"></i>
                    </div>
                  </div>
                </div>

                <div className="p-3 space-y-1">
                  <div className="font-black italic text-sm text-white group-hover:text-pink-400 transition truncate leading-snug">
                    {song.title}
                  </div>
                  <div className="text-[11px] text-white/60 truncate">{song.artist}</div>
                  <div className="flex items-center justify-between text-[10px] text-white/40 pt-0.5">
                    <span className="truncate max-w-[70%]">{song.genre}</span>
                    {song.isCustomTrained && (
                      <span className="text-[9px] bg-yellow-400 text-black font-black px-1.5 py-0.2 rounded">
                        CUSTOM
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {filteredSongs.length === 0 && (
            <div className="col-span-full text-center py-12 text-white/50 text-xs font-bold space-y-2">
              <div>No songs found matching your filters.</div>
              <button
                onClick={handleResetFilters}
                className="px-4 py-2 bg-pink-600 text-white rounded-full text-xs font-bold cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right Filter Sidebar (Desktop/Laptop) */}
      <div className="hidden lg:block w-72 bg-[#0f0c2e]/90 rounded-2xl p-4 border border-white/10 space-y-3 h-fit backdrop-blur-md shadow-2xl">
        <div className="text-xs font-black text-white/60 uppercase tracking-widest pb-1 border-b border-white/10 flex justify-between items-center">
          <span>Filter & Sort</span>
          <i className="fa-solid fa-filter text-pink-400"></i>
        </div>

        {/* Sort Dropdown */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-white/50 uppercase">Sort by</label>
          <select
            value={sortOrder}
            onChange={(e) => {
              soundEngine.playClick();
              setSortOrder(e.target.value as any);
            }}
            className="w-full px-3 py-2 bg-black/60 border border-white/15 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-pink-500 cursor-pointer"
          >
            <option value="A-Z">Alphabetically (A to Z)</option>
            <option value="DIFF">By Difficulty</option>
            <option value="BPM">By BPM Tempo</option>
          </select>
        </div>

        {/* Difficulty Filter */}
        <div className="space-y-1">
          <div className="text-[10px] font-bold text-white/50 uppercase">Difficulty</div>
          <div className="grid grid-cols-2 gap-1.5">
            {['ALL', 'Easy', 'Medium', 'Hard', 'Extreme'].map((diff) => (
              <button
                key={diff}
                onClick={() => {
                  soundEngine.playClick();
                  setSelectedDiff(diff);
                }}
                className={`py-1.5 px-2 rounded-lg text-[10px] font-black transition cursor-pointer ${
                  selectedDiff === diff
                    ? 'bg-pink-500 text-white shadow'
                    : 'bg-white/10 hover:bg-white/20 text-white/70'
                }`}
              >
                {diff}
              </button>
            ))}
          </div>
        </div>

        {/* Interactive Expandable Category Filters */}
        <div className="space-y-2 pt-1 border-t border-white/10">
          {/* Music Genres */}
          <div className="space-y-1">
            <button
              onClick={() => {
                soundEngine.playClick();
                setExpandedAccordion(expandedAccordion === 'GENRES' ? null : 'GENRES');
              }}
              className="w-full text-left text-xs font-black py-2 px-3 rounded-xl bg-white/10 hover:bg-white/15 transition cursor-pointer flex justify-between items-center text-white"
            >
              <div className="flex items-center space-x-2">
                <i className="fa-solid fa-music text-[9px] text-cyan-400"></i>
                <span>MUSIC GENRES {selectedGenre !== 'ALL' && `(${selectedGenre})`}</span>
              </div>
              <i className={`fa-solid text-[9px] text-white/50 transition ${expandedAccordion === 'GENRES' ? 'fa-chevron-down' : 'fa-chevron-right'}`}></i>
            </button>

            {expandedAccordion === 'GENRES' && (
              <div className="grid grid-cols-2 gap-1.5 p-2 bg-black/40 rounded-xl border border-white/10">
                {['ALL', 'Pop', 'K-Pop', 'Electro-Dance'].map((g) => (
                  <button
                    key={g}
                    onClick={() => {
                      soundEngine.playClick();
                      setSelectedGenre(g);
                    }}
                    className={`py-1 px-2 rounded-lg text-[10px] font-black transition cursor-pointer truncate ${
                      selectedGenre === g ? 'bg-cyan-500 text-black shadow' : 'bg-white/10 text-white/70 hover:bg-white/20'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Moods Filter */}
          <div className="space-y-1">
            <button
              onClick={() => {
                soundEngine.playClick();
                setExpandedAccordion(expandedAccordion === 'MOODS' ? null : 'MOODS');
              }}
              className="w-full text-left text-xs font-black py-2 px-3 rounded-xl bg-white/10 hover:bg-white/15 transition cursor-pointer flex justify-between items-center text-white"
            >
              <div className="flex items-center space-x-2">
                <i className="fa-solid fa-face-smile text-[9px] text-yellow-300"></i>
                <span>MOODS {selectedMood !== 'ALL' && `(${selectedMood})`}</span>
              </div>
              <i className={`fa-solid text-[9px] text-white/50 transition ${expandedAccordion === 'MOODS' ? 'fa-chevron-down' : 'fa-chevron-right'}`}></i>
            </button>

            {expandedAccordion === 'MOODS' && (
              <div className="grid grid-cols-2 gap-1.5 p-2 bg-black/40 rounded-xl border border-white/10">
                {['ALL', 'Party', 'Cyber', 'Energetic'].map((m) => (
                  <button
                    key={m}
                    onClick={() => {
                      soundEngine.playClick();
                      setSelectedMood(m);
                    }}
                    className={`py-1 px-2 rounded-lg text-[10px] font-black transition cursor-pointer truncate ${
                      selectedMood === m ? 'bg-yellow-400 text-black shadow' : 'bg-white/10 text-white/70 hover:bg-white/20'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Reset Filters Button */}
        <button
          onClick={handleResetFilters}
          className="w-full py-2.5 bg-black/50 hover:bg-white/10 border border-white/20 rounded-xl text-xs font-black uppercase tracking-wider text-white/80 hover:text-white transition cursor-pointer mt-2"
        >
          RESET FILTERS
        </button>
      </div>

      {/* Delete Dance Routine Confirmation Modal */}
      {songToDelete && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-sm w-full bg-[#130b33] border-2 border-pink-500/80 rounded-3xl p-6 shadow-[0_0_40px_rgba(255,20,147,0.5)] text-white space-y-4 text-center">
            <div className="w-14 h-14 rounded-full bg-red-600/20 text-red-400 border border-red-500/50 flex items-center justify-center text-2xl mx-auto shadow-[0_0_20px_rgba(239,68,68,0.4)]">
              <i className="fa-solid fa-trash-can"></i>
            </div>
            <div className="space-y-1.5">
              <h3 className="text-xl font-black italic tracking-wide">Delete Dance Routine?</h3>
              <p className="text-xs text-white/70">
                Are you sure you want to delete <strong className="text-pink-400">"{songToDelete.title}"</strong> by {songToDelete.artist} from your catalog?
              </p>
            </div>
            <div className="flex space-x-3 pt-2">
              <button
                onClick={() => setSongToDelete(null)}
                className="flex-1 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold cursor-pointer transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  soundEngine.playClick();
                  if (onDeleteSong) onDeleteSong(songToDelete.id);
                  setSongToDelete(null);
                }}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black italic cursor-pointer shadow-lg transition"
              >
                Delete Routine
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
