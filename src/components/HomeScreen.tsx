import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Song, Player } from '../types/game';
import { soundEngine } from '../services/soundEffects';
import { getRankConfig } from '../services/momentumScoring';
import { exportCdncePackage, downloadCdnceBlob, importCdncePackage } from '../services/cdncePackageService';
import {
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Button,
  IconButton,
  Avatar,
  Badge,
  Chip,
  Progress,
  Skeleton,
  Tooltip,
} from './ui';

interface HomeScreenProps {
  songs: Song[];
  players: Player[];
  onSelectSong: (song: Song) => void;
  onNavigateToCatalog: () => void;
  onOpenTrainingStudio: () => void;
  onSongImported?: (song: Song) => void;
}

type FilterCategory = 'all' | '2026' | 'cardio' | 'party' | 'custom';

const filterTabs: { id: FilterCategory; label: string; icon: React.ReactNode; color: 'brand' | 'accent' | 'sun' | 'success' }[] = [
  { id: 'all', label: 'All Routines', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>, color: 'brand' },
  { id: '2026', label: '2026 Releases', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>, color: 'accent' },
  { id: 'cardio', label: 'High Intensity', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>, color: 'sun' },
  { id: 'party', label: 'Multi-Coach', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>, color: 'success' },
  { id: 'custom', label: 'Community', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>, color: 'sun' },
];

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
  const primaryPlayer = players[0] || { name: 'Player 1', avatarSeed: 'PandaJD', color: '#ff1493', rank: 'Bronze' };
  const playerRank = getRankConfig(primaryPlayer.rank || 'Bronze');

  const filteredSongs = songs.filter((s) => {
    if (selectedFilter === '2026') return s.year >= 2024;
    if (selectedFilter === 'cardio') return s.bpm >= 130 || s.difficulty === 'Hard' || s.difficulty === 'Extreme';
    if (selectedFilter === 'party') return (s.detectedCoachCount ?? s.coaches?.length ?? 1) >= 2;
    if (selectedFilter === 'custom') return s.isCustomTrained;
    return true;
  });

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
    setImportStatus('Importing .cdnce routine package...');

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

  const coachCount = heroSong?.detectedCoachCount || heroSong?.coaches?.length || 1;
  const difficultyColor = heroSong?.difficulty === 'Extreme' ? 'error' : heroSong?.difficulty === 'Hard' ? 'warning' : 'success';

  return (
    <motion.section
      className="flex-1 flex flex-col space-y-8 pb-12 max-w-7xl mx-auto w-full px-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      {/* Hidden .cdnce input */}
      <input
        ref={cdnceFileInputRef}
        type="file"
        accept=".cdnce,.zip"
        className="hidden"
        onChange={handleFileImport}
      />

      {/* Import / Export Notification Banner */}
      <AnimatePresence>
        {importStatus && (
          <motion.div
            className="w-full p-4 rounded-2xl bg-gradient-to-r from-brand-900/50 via-purple-900/50 to-accent-900/50 border border-brand-500/30 shadow-level-2 flex items-center justify-between"
            initial={{ opacity: 0, y: -20, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -20, height: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          >
            <div className="flex items-center gap-3">
              <motion.div
                className={`w-8 h-8 rounded-xl flex items-center justify-center ${isImporting ? 'bg-accent-500/20 text-accent-400 animate-spin' : 'bg-success-500/20 text-success-400'}`}
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 17 }}
              >
                {isImporting ? (
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" strokeOpacity="0.25" /><path d="M12 2a10 10 0 0 1 10 10" /></svg>
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                )}
              </motion.div>
              <span className="text-body-medium font-semibold text-white">{importStatus}</span>
            </div>
            <motion.button
              onClick={() => setImportStatus('')}
              className="p-1 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              whileTap={{ scale: 0.9 }}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cinematic Stage Spotlight Hero Banner */}
      <motion.div
        className="relative w-full rounded-3xl overflow-hidden border border-white/10 shadow-level-4 bg-surface-0"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.6, ease: 'easeOut' }}
      >
        {/* Real High-Fidelity Concert Arena Backdrop */}
        <div className="absolute inset-0 z-0">
          <img
            src="/src/assets/images/hero_concert_stage_1793632684690.jpg"
            alt="ColeDance Concert Stage"
            className="w-full h-full object-cover object-center transform scale-105 filter brightness-75 contrast-110"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-surface-0 via-surface-0/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-surface-0 via-transparent to-surface-0/40" />
        </div>

        {/* Hero Content */}
        {heroSong ? (
          <div className="relative z-10 px-6 sm:px-10 md:px-14 py-8 md:py-12 max-w-2xl flex flex-col justify-center space-y-6">
            <motion.div
              className="flex items-center gap-2.5 text-label-medium text-on-surface-variant"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <span className="font-black tracking-widest text-brand-400 uppercase">Spotlight Routine</span>
              <span aria-hidden="true" className="text-on-surface-disabled">·</span>
              <span className="text-on-surface/80 font-medium">ColeDance Routine</span>
              <span aria-hidden="true" className="text-on-surface-disabled">·</span>
              <Badge variant="secondary" size="sm" dot dotColor="accent">{heroSong.bpm} BPM</Badge>
            </motion.div>

            <motion.div className="space-y-2" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <h1 className="text-display-large font-black italic tracking-tight text-white text-balance">
                {heroSong.title}
              </h1>
              <p className="text-headline-medium font-semibold text-on-surface/80 tracking-wide">{heroSong.artist}</p>
            </motion.div>

            <motion.div
              className="flex items-center flex-wrap gap-3 text-label-medium text-on-surface-variant font-medium"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Chip variant="primary" size="sm" icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>}>
                {heroSong.difficulty.toUpperCase()} CHOREO
              </Chip>
              <span aria-hidden="true" className="text-on-surface-disabled">·</span>
              <Chip variant="secondary" size="sm" icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>}>
                {coachCount} Coach{coachCount > 1 ? 'es' : ''}
              </Chip>
              <span aria-hidden="true" className="text-on-surface-disabled">·</span>
              <Chip variant="ghost" size="sm">{heroSong.genre}</Chip>
            </motion.div>

            <motion.div
              className="pt-2 flex flex-wrap items-center gap-3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Tooltip content="Start dancing with this routine" position="top">
                <Button
                  variant="primary"
                  size="lg"
                  leadingIcon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="5 3 19 12 5 21 5 3" /></svg>}
                  onClick={() => { soundEngine.playClick(); onSelectSong(heroSong); }}
                  className="shadow-brand-glow hover:shadow-brand-glow-lg"
                >
                  START DANCING
                </Button>
              </Tooltip>

              <Tooltip content="Export this routine as a shareable .cdnce package" position="top">
                <Button
                  variant="outlined"
                  size="lg"
                  leadingIcon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>}
                  disabled={exportingSongId === heroSong.id}
                  onClick={(e) => handleExportSong(e, heroSong)}
                >
                  {exportingSongId === heroSong.id ? 'EXPORTING...' : 'EXPORT .CDNCE'}
                </Button>
              </Tooltip>

              <Tooltip content="Import a .cdnce routine package" position="top">
                <Button
                  variant="ghost"
                  size="lg"
                  leadingIcon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>}
                  onClick={() => { soundEngine.playClick(); cdnceFileInputRef.current?.click(); }}
                >
                  IMPORT .CDNCE
                </Button>
              </Tooltip>
            </motion.div>
          </div>
        ) : (
          <div className="relative z-10 px-6 sm:px-10 md:px-14 py-12 md:py-16 max-w-2xl flex flex-col justify-center space-y-6 text-center">
            <motion.div
              className="flex items-center justify-center gap-2.5 text-label-medium text-on-surface-variant"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <span className="font-black tracking-widest text-brand-400 uppercase">COLEDANCE ARENA READY</span>
              <span aria-hidden="true" className="text-on-surface-disabled">·</span>
              <span className="text-accent-400 font-medium">All Demos Cleared</span>
            </motion.div>

            <motion.div className="space-y-2" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <h1 className="text-display-large font-black italic tracking-tight text-white text-balance">
                YOUR STAGE AWAITS
              </h1>
              <p className="text-body-large font-semibold text-on-surface/80 leading-relaxed">
                Import any <span className="text-sun-400">.cdnce</span> routine package or train your own choreography from any MP4 video using AI pose detection.
              </p>
            </motion.div>

            <motion.div
              className="pt-2 flex flex-wrap items-center justify-center gap-3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Tooltip content="Import a .cdnce routine package" position="top">
                <Button
                  variant="primary"
                  size="xl"
                  leadingIcon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>}
                  onClick={() => { soundEngine.playClick(); cdnceFileInputRef.current?.click(); }}
                >
                  IMPORT .CDNCE PACKAGE
                </Button>
              </Tooltip>

              <Tooltip content="Open Training Studio to create custom routines" position="top">
                <Button
                  variant="outlined"
                  size="xl"
                  leadingIcon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" /></svg>}
                  onClick={() => { soundEngine.playClick(); onOpenTrainingStudio(); }}
                >
                  RECORD IN TRAINING STUDIO
                </Button>
              </Tooltip>
            </motion.div>
          </div>
        )}
      </motion.div>

      {/* Routine Tracklist Section */}
      <motion.section
        className="space-y-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-headline-small font-black tracking-wider text-white">Choreography Library</h2>
            <p className="text-body-small text-on-surface-variant mt-1">Export routines as .cdnce packages to transfer between computers or import friends' routines</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Tooltip content="Import .cdnce routine package from file" position="top">
              <Button
                variant="secondary"
                size="sm"
                leadingIcon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>}
                onClick={() => { soundEngine.playClick(); cdnceFileInputRef.current?.click(); }}
              >
                Import .cdnce
              </Button>
            </Tooltip>

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
          </div>
        </div>

        {/* Filter Tabs */}
        <motion.div
          className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          {filterTabs.map((tab, index) => {
            const isActive = selectedFilter === tab.id;
            const count = songs.filter((s) => {
              if (tab.id === 'all') return true;
              if (tab.id === '2026') return s.year >= 2024;
              if (tab.id === 'cardio') return s.bpm >= 130 || s.difficulty === 'Hard' || s.difficulty === 'Extreme';
              if (tab.id === 'party') return (s.detectedCoachCount ?? s.coaches?.length ?? 1) >= 2;
              if (tab.id === 'custom') return s.isCustomTrained;
              return true;
            }).length;

            return (
              <motion.button
                key={tab.id}
                onClick={() => { soundEngine.playClick(); setSelectedFilter(tab.id); }}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-label-large shrink-0
                  transition-all motion-spring
                  ${isActive
                    ? `bg-gradient-to-r from-${tab.color}-500 to-${tab.color}-600 text-white shadow-${tab.color}-glow`
                    : 'bg-surface-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-3'
                  }
                `}
                whileTap={{ scale: 0.97 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * index }}
              >
                <span aria-hidden="true">{tab.icon}</span>
                <span>{tab.label}</span>
                <span className={`
                  w-5 h-5 rounded-full flex items-center justify-center text-label-small font-black
                  ${isActive ? 'bg-white/20 text-white' : 'bg-white/10 text-on-surface-disabled'}
                `}>
                  {count}
                </span>
              </motion.button>
            );
          })}
        </motion.div>

        {/* Songs Grid */}
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedFilter}
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
                      transition={{ delay: 0.05 * index, type: 'spring', stiffness: 500, damping: 30 }}
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

                        {/* Coach Count Indicator */}
                        <div className="absolute top-3 left-3">
                          <Badge variant="secondary" size="sm" icon={<svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>}>
                            {coachCount} Coach{coachCount > 1 ? 'es' : ''}
                          </Badge>
                        </div>

                        {/* Export .cdnce button */}
                        <Tooltip content="Export .cdnce routine package" position="bottom">
                          <IconButton
                            variant="outlined"
                            size="sm"
                            aria-label="Export .cdnce"
                            onClick={(e) => handleExportSong(e, song)}
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

                        {/* Bottom Row on Card */}
                        <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center">
                          <span className="text-label-large font-bold text-white">{song.bpm} BPM</span>
                          <Badge variant={diffColor} size="sm">{song.difficulty}</Badge>
                        </div>

                        {/* Play Action Overlay on Hover */}
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-t from-brand-900/50 via-transparent to-transparent flex items-center justify-center"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: isHovered ? 1 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <motion.div
                            className="w-16 h-16 rounded-full bg-gradient-to-r from-brand-500 to-sun-400 flex items-center justify-center text-white shadow-level-3"
                            initial={{ scale: 0.8 }}
                            animate={{ scale: isHovered ? 1 : 0.8 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 17 }}
                            whileTap={{ scale: 0.9 }}
                          >
                            <svg className="w-7 h-7 ml-1" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                          </motion.div>
                        </motion.div>
                      </CardMedia>

                      <CardContent className="p-4 space-y-2">
                        <motion.h3
                          className="font-black italic text-title-medium text-white group-hover:text-brand-400 transition-colors truncate"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.05 * index }}
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
                <div className="text-body-medium font-bold text-on-surface/80">No choreography routines in library</div>
                <p className="text-body-small text-on-surface-variant max-w-sm mx-auto">Import a .cdnce file package from another machine or record any video in the AI Training Studio.</p>
                <div className="flex justify-center gap-3 pt-2">
                  <Button variant="secondary" size="sm" leadingIcon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>} onClick={() => { soundEngine.playClick(); cdnceFileInputRef.current?.click(); }}>
                    Import .cdnce
                  </Button>
                  <Button variant="outlined" size="sm" leadingIcon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" /></svg>} onClick={() => { soundEngine.playClick(); onOpenTrainingStudio(); }}>
                    Open Studio
                  </Button>
                </div>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </motion.section>

      {/* Feature Bento Strip */}
      <motion.section
        className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        {/* Card 1: .cdnce Portability */}
        <Tooltip content="Export and import standalone .cdnce files containing the full original-resolution video and 17-point move coordinates" position="top">
          <Card
            variant="filled"
            interactive
            onClick={() => { soundEngine.playClick(); cdnceFileInputRef.current?.click(); }}
            className="group h-full"
            whileHover={{ y: -4, boxShadow: 'var(--shadow-level-3)' }}
          >
            <div className="w-12 h-12 rounded-xl bg-sun-500/15 border border-sun-500/30 flex items-center justify-center text-sun-400 text-xl group-hover:scale-110 transition-transform motion-spring">
              <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
            </div>
            <div className="mt-4">
              <h3 className="text-title-medium font-black text-white tracking-wide">.cdnce Routine Sharing</h3>
              <p className="text-body-small text-on-surface-variant leading-relaxed mt-2">Export and import standalone .cdnce files containing the full original-resolution video and 17-point move coordinates.</p>
            </div>
            <div className="mt-4 text-label-medium font-bold text-sun-400 flex items-center gap-1">
              <span>Import or Export Package</span>
              <motion.svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" initial={{ x: -4 }} animate={{ x: 0 }} transition={{ delay: 0.2 }}><polyline points="5 12 19 12" /><polyline points="13 5 19 12 13 19" /></motion.svg>
            </div>
          </Card>
        </Tooltip>

        {/* Card 2: Training Studio */}
        <Tooltip content="Feed any MP4 routine to automatically extract 1 to 5 coach keypoint paths with precision trimming" position="top">
          <Card
            variant="filled"
            interactive
            onClick={() => { soundEngine.playClick(); onOpenTrainingStudio(); }}
            className="group h-full"
            whileHover={{ y: -4, boxShadow: 'var(--shadow-level-3)' }}
          >
            <div className="w-12 h-12 rounded-xl bg-accent-500/15 border border-accent-500/30 flex items-center justify-center text-accent-400 text-xl group-hover:scale-110 transition-transform motion-spring">
              <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" /></svg>
            </div>
            <div className="mt-4">
              <h3 className="text-title-medium font-black text-white tracking-wide">AI Pose Extraction Studio</h3>
              <p className="text-body-small text-on-surface-variant leading-relaxed mt-2">Feed any MP4 routine to automatically extract 1 to 5 coach keypoint paths with precision trimming.</p>
            </div>
            <div className="mt-4 text-label-medium font-bold text-accent-400 flex items-center gap-1">
              <span>Launch Studio</span>
              <motion.svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" initial={{ x: -4 }} animate={{ x: 0 }} transition={{ delay: 0.2 }}><polyline points="5 12 19 12" /><polyline points="13 5 19 12 13 19" /></motion.svg>
            </div>
          </Card>
        </Tooltip>

        {/* Card 3: Dynamic Multiplier */}
        <Tooltip content="Dance with high kinetic velocity to power up momentum and unlock ColeDance prestige ranks" position="top">
          <Card
            variant="filled"
            interactive
            onClick={() => { soundEngine.playClick(); onNavigateToCatalog(); }}
            className="group h-full"
            whileHover={{ y: -4, boxShadow: 'var(--shadow-level-3)' }}
          >
            <div className="w-12 h-12 rounded-xl bg-brand-500/15 border border-brand-500/30 flex items-center justify-center text-brand-400 text-xl group-hover:scale-110 transition-transform motion-spring">
              <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
            </div>
            <div className="mt-4">
              <h3 className="text-title-medium font-black text-white tracking-wide">Momentum Multiplier (4x Overdrive)</h3>
              <p className="text-body-small text-on-surface-variant leading-relaxed mt-2">Dance with high kinetic velocity to power up momentum and unlock ColeDance prestige ranks.</p>
            </div>
            <div className="mt-4 text-label-medium font-bold text-brand-400 flex items-center gap-1">
              <span>View Song Library</span>
              <motion.svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" initial={{ x: -4 }} animate={{ x: 0 }} transition={{ delay: 0.2 }}><polyline points="5 12 19 12" /><polyline points="13 5 19 12 13 19" /></motion.svg>
            </div>
          </Card>
        </Tooltip>
      </motion.section>
    </motion.section>
  );
};

export default HomeScreen;