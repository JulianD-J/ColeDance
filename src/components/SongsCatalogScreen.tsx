import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Song, Player } from '../types/game';
import { soundEngine } from '../services/soundEffects';
import { exportCdncePackage, downloadCdnceBlob, importCdncePackage } from '../services/cdncePackageService';
import {
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Button,
  IconButton,
  Badge,
  Chip,
  Input,
  Select,
  Avatar,
  Skeleton,
  Tooltip,
} from './ui';

interface SongsCatalogScreenProps {
  songs: Song[];
  primaryPlayer?: Player;
  onSelectSong: (song: Song) => void;
  onOpenTrainingStudio?: () => void;
  onDeleteSong?: (songId: string) => void;
  onSongImported?: (song: Song) => void;
}

const letterTabs = ['ALL', 'A-E', 'F-J', 'K-O', 'P-T', 'U-Z'];

const difficultyOptions = [
  { value: 'ALL', label: 'All' },
  { value: 'Easy', label: 'Easy' },
  { value: 'Medium', label: 'Medium' },
  { value: 'Hard', label: 'Hard' },
  { value: 'Extreme', label: 'Extreme' },
];

const genreOptions = [
  { value: 'ALL', label: 'All Genres' },
  { value: 'Pop', label: 'Pop' },
  { value: 'K-Pop', label: 'K-Pop' },
  { value: 'Electro-Dance', label: 'Electro-Dance' },
];

const moodOptions = [
  { value: 'ALL', label: 'All Moods' },
  { value: 'Party', label: 'Party' },
  { value: 'Cyber', label: 'Cyber' },
  { value: 'Energetic', label: 'Energetic' },
];

const sortOptions = [
  { value: 'A-Z', label: 'Alphabetically (A to Z)' },
  { value: 'DIFF', label: 'By Difficulty' },
  { value: 'BPM', label: 'By BPM Tempo' },
];

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
  const [selectedGenre, setSelectedGenre] = useState('ALL');
  const [selectedDiff, setSelectedDiff] = useState('ALL');
  const [selectedMood, setSelectedMood] = useState('ALL');
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

  return (
    <motion.section
      className="flex-1 flex flex-col lg:flex-row space-y-6 lg:space-y-0 lg:space-x-6 pb-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      {/* Left Main Catalog Content */}
      <motion.div
        className="flex-1 space-y-6"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
      >
        {/* Top Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <motion.h1
              className="text-headline-medium font-black italic tracking-wide text-white"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              YOUR SONGS
            </motion.h1>

            {/* Letter Tabs */}
            <motion.div
              className="flex gap-1 bg-surface-1 rounded-xl p-1 border border-outline-variant overflow-x-auto scrollbar-hide"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              {letterTabs.map((tab, index) => (
                <motion.button
                  key={tab}
                  onClick={() => { soundEngine.playClick(); setSelectedLetterTab(tab); }}
                  className={`
                    px-3 py-1.5 rounded-lg text-label-small font-semibold shrink-0
                    transition-all motion-spring
                    ${selectedLetterTab === tab
                      ? 'bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-brand-glow'
                      : 'text-on-surface-variant hover:text-on-surface hover:bg-white/5'
                    }
                  `}
                  whileTap={{ scale: 0.95 }}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.02 * index }}
                >
                  {tab}
                </motion.button>
              ))}
            </motion.div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <input
              ref={catalogFileInputRef}
              type="file"
              accept=".cdnce,.zip"
              className="hidden"
              onChange={handleImportCdnce}
            />

            <Tooltip content="Import .cdnce routine package from file" position="top">
              <Button
                variant="secondary"
                size="sm"
                leadingIcon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>}
                onClick={() => { soundEngine.playClick(); catalogFileInputRef.current?.click(); }}
              >
                Import .cdnce
              </Button>
            </Tooltip>

            {onOpenTrainingStudio && (
              <Tooltip content="Open Training Studio to create custom routines" position="top">
                <Button
                  variant="outlined"
                  size="sm"
                  leadingIcon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" /></svg>}
                  onClick={() => { soundEngine.playClick(); onOpenTrainingStudio(); }}
                >
                  + Add Routine
                </Button>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Status Banner */}
        <AnimatePresence>
          {statusBanner && (
            <motion.div
              className="p-4 rounded-2xl bg-sun-900/50 border border-sun-500/30 flex items-center justify-between"
              initial={{ opacity: 0, y: -20, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -20, height: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-sun-500/20 flex items-center justify-center text-sun-400">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>
                </div>
                <span className="text-body-medium font-semibold text-white">{statusBanner}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setStatusBanner('')}>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Random Song Wheel Banner */}
        <Tooltip content="Spin the wheel to jump into a random routine from your library" position="top">
          <motion.button
            onClick={handleSpinWheel}
            className={`
              w-full p-4 rounded-2xl flex items-center justify-between cursor-pointer hover:scale-[1.01] transition-all motion-spring
              bg-gradient-to-r from-indigo-900/50 via-purple-900/50 to-brand-900/50
              border border-white/10 shadow-level-2
              ${isSpinning ? 'animate-pulse ring-2 ring-brand-500/50' : ''}
            `}
            whileTap={{ scale: 0.99 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <motion.div
              className={`flex items-center gap-4 w-12 h-12 rounded-xl bg-gradient-to-r from-sun-400 to-sun-500 text-white flex items-center justify-center text-xl font-black shadow-sun-glow shrink-0 ${isSpinning ? 'animate-spin' : ''}`}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 17 }}
              whileTap={{ scale: 0.95 }}
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>
            </motion.div>
            <div className="flex-1 min-w-0">
              <div className="text-label-large font-black uppercase text-sun-400 tracking-wider">Surprise Me!</div>
              <div className="text-body-small text-on-surface/80 line-clamp-1">Spin the wheel to jump into a random routine from your library</div>
            </div>
            <motion.button
              className="px-5 py-2.5 bg-gradient-to-r from-purple-500 to-brand-500 hover:from-purple-400 hover:to-brand-400 text-white text-label-large font-black italic rounded-full shadow-level-2 border border-white/20 shrink-0"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              disabled={isSpinning}
            >
              {isSpinning ? 'SPINNING...' : '¡DANCE!'}
            </motion.button>
          </motion.button>
        </Tooltip>

        {/* Search Input */}
        <motion.div
          className="relative"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Input
            type="search"
            placeholder="Search songs, artists, or genres..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leadingIcon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>}
            size="md"
            fullWidth
          />
        </motion.div>

        {/* Mobile Quick Filter Chips */}
        <motion.div
          className="flex lg:hidden overflow-x-auto gap-2 py-2 scrollbar-hide"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {difficultyOptions.map((d) => (
            <Chip
              key={d.value}
              label={d.value === 'ALL' ? 'All Difficulties' : d.value.toUpperCase()}
              variant={selectedDiff === d.value ? 'primary' : 'filter'}
              selected={selectedDiff === d.value}
              onClick={() => { soundEngine.playClick(); setSelectedDiff(d.value); }}
            />
          ))}
          {genreOptions.slice(1).map((g) => (
            <Chip
              key={g.value}
              label={g.value}
              variant={selectedGenre === g.value ? 'secondary' : 'filter'}
              selected={selectedGenre === g.value}
              onClick={() => { soundEngine.playClick(); setSelectedGenre(selectedGenre === g.value ? 'ALL' : g.value); }}
            />
          ))}
        </motion.div>

        {/* Responsive Songs Grid */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`${selectedLetterTab}-${selectedGenre}-${selectedDiff}-${selectedMood}-${sortOrder}`}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            {filteredSongs.length > 0 ? (
              filteredSongs.map((song, index) => {
                const isHovered = hoveredSongId === song.id;
                const coachCount = song.detectedCoachCount || song.coaches?.length || 1;
                const diffColor = song.difficulty === 'Extreme' ? 'error' : song.difficulty === 'Hard' ? 'warning' : 'success';

                return (
                  <Tooltip key={song.id} content={`${song.title} by ${song.artist}`} position="top">
                    <Card
                      variant="filled"
                      interactive
                      onClick={() => { soundEngine.playClick(); onSelectSong(song); }}
                      className="group overflow-hidden"
                      whileHover={{ y: -8, boxShadow: 'var(--shadow-level-4)' }}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.03 * index, type: 'spring', stiffness: 500, damping: 30 }}
                    >
                      <CardMedia aspectRatio="video" rounded="none">
                        <motion.img
                          src={song.coverImg}
                          alt={song.title}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                          initial={{ scale: 1.1 }}
                          animate={{ scale: 1 }}
                          transition={{ duration: 0.5 }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

                        {/* Delete custom song button */}
                        {song.isCustomTrained && onDeleteSong && (
                          <Tooltip content="Delete Custom Routine" position="top">
                            <IconButton
                              variant="ghost"
                              size="sm"
                              aria-label="Delete routine"
                              onClick={(e) => { e.stopPropagation(); soundEngine.playClick(); setSongToDelete(song); }}
                              className="absolute top-3 left-3"
                            >
                              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                            </IconButton>
                          </Tooltip>
                        )}

                        {/* Export .cdnce Package Button */}
                        <Tooltip content="Export .cdnce routine package (video + moves)" position="top">
                          <IconButton
                            variant="outlined"
                            size="sm"
                            aria-label="Export .cdnce"
                            onClick={(e) => handleExportCdnce(e, song)}
                            disabled={exportingSongId === song.id}
                            className="absolute top-3 right-3"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: isHovered ? 1 : 0, x: isHovered ? 0 : 20 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                          >
                            {exportingSongId === song.id ? (
                              <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" strokeOpacity="0.25" /><path d="M12 2a10 10 0 0 1 10 10" /></svg>
                            ) : (
                              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                            )}
                          </IconButton>
                        </Tooltip>

                        {/* Coach count badge */}
                        <motion.div
                          className="absolute top-3 right-3 bg-surface-1/90 backdrop-blur px-2 py-1 rounded-lg text-label-small font-bold text-accent-400 border border-outline-variant"
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                        >
                          {coachCount} {coachCount > 1 ? 'Coaches' : 'Coach'}
                        </motion.div>

                        {/* Bottom row on card */}
                        <motion.div
                          className="absolute bottom-3 left-3 right-3 flex justify-between items-center"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.1 }}
                        >
                          <span className="text-label-large font-bold text-white">{song.bpm} BPM</span>
                          <Badge variant={diffColor} size="sm">{song.difficulty}</Badge>
                        </motion.div>

                        {/* Play Action Hover Glow */}
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-t from-brand-900/50 via-transparent to-transparent flex items-center justify-center"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: isHovered ? 1 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <motion.div
                            className="w-12 h-12 rounded-full bg-gradient-to-r from-brand-500 to-sun-400 flex items-center justify-center text-white shadow-level-3"
                            initial={{ scale: 0.8 }}
                            animate={{ scale: isHovered ? 1 : 0.8 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 17 }}
                            whileTap={{ scale: 0.9 }}
                          >
                            <svg className="w-6 h-6 ml-1" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                          </motion.div>
                        </motion.div>
                      </CardMedia>

                      <CardContent className="p-4 space-y-2">
                        <motion.h3
                          className="font-black italic text-title-small text-white group-hover:text-brand-400 transition-colors truncate"
                        >
                          {song.title}
                        </motion.h3>
                        <p className="text-body-small text-on-surface-variant truncate">{song.artist}</p>
                        <div className="flex items-center justify-between text-label-small text-on-surface-disabled pt-1">
                          <span className="truncate max-w-[70%]">{song.genre}</span>
                          {song.isCustomTrained && (
                            <Badge variant="warning" size="sm" dot dotColor="sun">CUSTOM</Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </Tooltip>
                );
              })
            ) : (
              <motion.div
                className="col-span-full py-16 px-6 rounded-2xl bg-surface-1 border border-outline-variant text-center space-y-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <motion.div className="w-16 h-16 rounded-2xl bg-surface-2 border border-outline mx-auto flex items-center justify-center text-2xl text-on-surface-variant" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 17 }}>
                  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
                </motion.div>
                <div className="text-body-medium font-bold text-on-surface/80">No songs found matching your filters</div>
                <Button variant="primary" size="sm" onClick={handleResetFilters}>
                  Reset Filters
                </Button>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* Right Filter Sidebar (Desktop/Laptop) */}
      <motion.aside
        className="hidden lg:block w-80 lg:w-80 bg-surface-1/90 backdrop-blur-xl rounded-2xl p-5 border border-outline-variant space-y-5 h-fit shadow-level-3"
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="text-label-small font-black text-on-surface-variant uppercase tracking-widest pb-2 border-b border-outline-variant flex justify-between items-center">
          <span>Filter & Sort</span>
          <svg className="w-5 h-5 text-brand-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>
        </div>

        {/* Sort Dropdown */}
        <div className="space-y-2">
          <label className="text-label-small font-semibold text-on-surface-variant uppercase tracking-wider">Sort by</label>
          <Select
            value={sortOrder}
            options={sortOptions}
            onChange={(e) => { soundEngine.playClick(); setSortOrder(e.target.value as any); }}
            size="md"
            fullWidth
          />
        </div>

        {/* Difficulty Filter */}
        <div className="space-y-2">
          <label className="text-label-small font-semibold text-on-surface-variant uppercase tracking-wider">Difficulty</label>
          <div className="grid grid-cols-2 gap-2">
            {difficultyOptions.map((diff) => (
              <motion.button
                key={diff.value}
                onClick={() => { soundEngine.playClick(); setSelectedDiff(diff.value); }}
                className={`
                  py-2 px-3 rounded-xl text-label-small font-semibold transition-all motion-spring
                  ${selectedDiff === diff.value
                    ? 'bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-brand-glow'
                    : 'bg-surface-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-3'
                  }
                `}
                whileTap={{ scale: 0.97 }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.03 * difficultyOptions.indexOf(diff) }}
              >
                {diff.value}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Interactive Expandable Category Filters */}
        <div className="space-y-3 pt-2 border-t border-outline-variant">
          {/* Music Genres */}
          <div className="space-y-2">
            <motion.button
              onClick={() => { soundEngine.playClick(); setExpandedAccordion(expandedAccordion === 'GENRES' ? null : 'GENRES'); }}
              className="w-full text-left text-label-small font-black py-3 px-3 rounded-xl bg-surface-2 hover:bg-surface-3 transition-colors flex justify-between items-center"
              whileTap={{ scale: 0.99 }}
            >
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-accent-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>
                <span>Music Genres {selectedGenre !== 'ALL' && `(${selectedGenre})`}</span>
              </div>
              <motion.svg
                className="w-4 h-4 text-on-surface-disabled"
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                animate={{ rotate: expandedAccordion === 'GENRES' ? 180 : 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              >
                <polyline points="6 9 12 15 18 9" />
              </motion.svg>
            </motion.button>

            <AnimatePresence>
              {expandedAccordion === 'GENRES' && (
                <motion.div
                  className="grid grid-cols-2 gap-2 p-2 bg-surface-1 rounded-xl border border-outline-variant"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                >
                  {genreOptions.map((g) => (
                    <motion.button
                      key={g.value}
                      onClick={() => { soundEngine.playClick(); setSelectedGenre(g.value); }}
                      className={`
                        py-2 px-3 rounded-lg text-label-small font-semibold truncate transition-all motion-spring
                        ${selectedGenre === g.value
                          ? 'bg-gradient-to-r from-accent-500 to-accent-600 text-white shadow-accent-glow'
                          : 'bg-surface-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-3'
                        }
                      `}
                      whileTap={{ scale: 0.97 }}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.02 * genreOptions.indexOf(g) }}
                    >
                      {g.label}
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Moods Filter */}
          <div className="space-y-2">
            <motion.button
              onClick={() => { soundEngine.playClick(); setExpandedAccordion(expandedAccordion === 'MOODS' ? null : 'MOODS'); }}
              className="w-full text-left text-label-small font-black py-3 px-3 rounded-xl bg-surface-2 hover:bg-surface-3 transition-colors flex justify-between items-center"
              whileTap={{ scale: 0.99 }}
            >
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-sun-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><line x1="9" y1="9" x2="9.01" y2="9" /><line x1="15" y1="9" x2="15.01" y2="9" /></svg>
                <span>Moods {selectedMood !== 'ALL' && `(${selectedMood})`}</span>
              </div>
              <motion.svg
                className="w-4 h-4 text-on-surface-disabled"
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                animate={{ rotate: expandedAccordion === 'MOODS' ? 180 : 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              >
                <polyline points="6 9 12 15 18 9" />
              </motion.svg>
            </motion.button>

            <AnimatePresence>
              {expandedAccordion === 'MOODS' && (
                <motion.div
                  className="grid grid-cols-2 gap-2 p-2 bg-surface-1 rounded-xl border border-outline-variant"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                >
                  {moodOptions.map((m) => (
                    <motion.button
                      key={m.value}
                      onClick={() => { soundEngine.playClick(); setSelectedMood(m.value); }}
                      className={`
                        py-2 px-3 rounded-lg text-label-small font-semibold truncate transition-all motion-spring
                        ${selectedMood === m.value
                          ? 'bg-gradient-to-r from-sun-500 to-sun-600 text-white shadow-sun-glow'
                          : 'bg-surface-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-3'
                        }
                      `}
                      whileTap={{ scale: 0.97 }}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.02 * moodOptions.indexOf(m) }}
                    >
                      {m.label}
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Reset Filters Button */}
        <Button
          variant="outlined"
          fullWidth
          size="md"
          onClick={handleResetFilters}
          className="mt-2"
        >
          RESET FILTERS
        </Button>
      </motion.aside>

      {/* Delete Dance Routine Confirmation Modal */}
      <AnimatePresence>
        {songToDelete && (
          <motion.div
            className="fixed inset-0 z-[500] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSongToDelete(null)}
          >
            <motion.div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div
              className="relative max-w-md w-full bg-surface-3 border-2 border-brand-500/50 rounded-3xl p-6 shadow-level-4 space-y-5 text-center"
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            >
              <motion.div className="w-16 h-16 rounded-full bg-error-500/20 text-error-400 border border-error-500/50 flex items-center justify-center text-3xl mx-auto shadow-error-glow" initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 17 }}>
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
              </motion.div>
              <div className="space-y-2">
                <h3 className="text-headline-small font-black italic tracking-wide text-white">Delete Dance Routine?</h3>
                <p className="text-body-medium text-on-surface-variant">
                  Are you sure you want to delete <strong className="text-brand-400">"{songToDelete.title}"</strong> by {songToDelete.artist} from your catalog?
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outlined" fullWidth onClick={() => setSongToDelete(null)}>Cancel</Button>
                <Button variant="danger" fullWidth onClick={() => { soundEngine.playClick(); if (onDeleteSong) onDeleteSong(songToDelete.id); setSongToDelete(null); }}>
                  Delete Routine
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
};

export default SongsCatalogScreen;