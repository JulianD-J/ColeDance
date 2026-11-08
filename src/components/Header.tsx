import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ScreenId, Player } from '../types/game';
import { soundEngine } from '../services/soundEffects';
import { menuMusic } from '../services/menuMusicService';
import { detectDeviceCamera, CameraStatus } from '../services/cameraDetection';
import { getRankConfig } from '../services/momentumScoring';
import {
  Button,
  IconButton,
  Avatar,
  Badge,
  Tooltip,
  SegmentedButton,
} from './ui';

interface HeaderProps {
  activeScreen?: ScreenId;
  onNavigate?: (screen: ScreenId) => void;
  onOpenTrainingStudio?: () => void;
  onOpenPhonePairing: () => void;
  onOpenYoloDiagnostic: () => void;
  onOpenProfileEditor: () => void;
  onOpenStore?: () => void;
  onOpenSettings?: () => void;
  onOpenNotifications?: () => void;
  onOpenDancerCard?: () => void;
  onImportCdnce?: (file: File) => void;
  primaryPlayer?: Player;
  roomId: string;
}

const navItems: { id: ScreenId; label: string; icon: React.ReactNode }[] = [
  { id: 'home', label: 'Spotlight', icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg> },
  { id: 'songs', label: 'Library', icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg> },
  { id: 'coaches', label: 'Coaches', icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg> },
];

export const Header: React.FC<HeaderProps> = ({
  activeScreen = 'home',
  onNavigate,
  onOpenTrainingStudio,
  onOpenPhonePairing,
  onOpenYoloDiagnostic,
  onOpenProfileEditor,
  onOpenStore,
  onOpenSettings,
  onOpenNotifications,
  onOpenDancerCard,
  onImportCdnce,
  primaryPlayer,
  roomId,
}) => {
  const [isMuted, setIsMuted] = useState(menuMusic.getMuted());
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>({
    hasCamera: true,
    isChecking: true,
    deviceCount: 1,
  });
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [notificationsCount, setNotificationsCount] = useState(3); // Demo count

  useEffect(() => {
    menuMusic.startMenuMusic();
    detectDeviceCamera().then(setCameraStatus);
  }, []);

  const toggleSound = () => {
    soundEngine.playClick();
    const muted = menuMusic.toggleMute();
    setIsMuted(muted);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onImportCdnce) {
      soundEngine.playClick();
      onImportCdnce(file);
    }
    if (e.target) e.target.value = '';
  };

  const rankConfig = primaryPlayer ? getRankConfig(primaryPlayer.rank || 'Bronze') : null;

  return (
    <motion.header
      className="relative z-[300] w-full mb-4"
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
    >
      <div className="surface-glass rounded-2xl shadow-level-2 p-3 sm:p-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Zone 1: Brand Wordmark */}
          <motion.button
            onClick={() => { soundEngine.playClick(); onNavigate?.('home'); }}
            className="flex items-baseline gap-2 shrink-0 p-1 rounded-xl hover:bg-white/5 transition-colors"
            whileTap={{ scale: 0.97 }}
            aria-label="Go to Home"
          >
            <motion.span
              className="font-black italic tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white via-brand-300 to-brand-500 drop-shadow-[0_0_20px_rgba(217,30,109,0.7)]"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              COLEDANCE
            </motion.span>
            <motion.span
              className="text-label-small font-black tracking-widest text-accent-400 uppercase opacity-90"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 500, damping: 17 }}
            >
              2026
            </motion.span>
          </motion.button>

          {/* Zone 2: Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 bg-surface-1 rounded-xl p-1 border border-outline-variant" aria-label="Main navigation">
            {navItems.map((item) => {
              const isActive = activeScreen === item.id;
              return (
                <motion.button
                  key={item.id}
                  onClick={() => { soundEngine.playClick(); onNavigate?.(item.id); }}
                  className={`
                    flex items-center gap-2 px-3 py-2 rounded-lg font-semibold text-label-large
                    transition-all motion-spring
                    ${isActive
                      ? 'text-white bg-gradient-to-r from-brand-500 to-brand-600 shadow-brand-glow'
                      : 'text-on-surface-variant hover:text-on-surface hover:bg-white/5'
                    }
                  `}
                  whileTap={{ scale: 0.97 }}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * navItems.indexOf(item) }}
                >
                  <span className="flex-shrink-0" aria-hidden="true">{item.icon}</span>
                  <span>{item.label}</span>
                </motion.button>
              );
            })}

            {/* Training Studio Nav Action */}
            {onOpenTrainingStudio && (
              <motion.button
                onClick={() => { soundEngine.playClick(); onOpenTrainingStudio(); }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg font-semibold text-label-large text-sun-400 hover:text-sun-300 hover:bg-sun-500/10 transition-all motion-spring"
                whileTap={{ scale: 0.97 }}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
              >
                <span className="flex-shrink-0" aria-hidden="true">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                    <path d="M6 12v5c3 3 9 3 12 0v-5" />
                  </svg>
                </span>
                <span>TRAINING STUDIO</span>
              </motion.button>
            )}
          </nav>

          {/* Zone 3: Player Lounge & Quick Controls */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Hidden File Input for .cdnce import */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".cdnce,.zip"
              className="hidden"
              onChange={handleFileChange}
            />

            {/* Import .cdnce Package Button */}
            <Tooltip content="Import .cdnce Routine Package (Video + Moves)" position="bottom">
              <motion.button
                onClick={() => { soundEngine.playClick(); fileInputRef.current?.click(); }}
                className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl font-semibold text-label-large text-sun-400 hover:text-sun-300 bg-sun-500/10 hover:bg-sun-500/20 border border-sun-500/20 transition-all motion-spring"
                whileTap={{ scale: 0.97 }}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <span aria-hidden="true">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </span>
                <span className="hidden sm:inline">IMPORT</span>
              </motion.button>
            </Tooltip>

            {/* Phone Pairing Quick Action */}
            <Tooltip content="Connect Smartphone Controller" position="bottom">
              <motion.button
                onClick={() => { soundEngine.playClick(); onOpenPhonePairing(); }}
                className="hidden lg:flex items-center gap-2 px-3 py-2 rounded-xl font-semibold text-label-large text-accent-400 hover:text-accent-300 bg-accent-500/10 hover:bg-accent-500/20 border border-accent-500/20 transition-all motion-spring"
                whileTap={{ scale: 0.97 }}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35 }}
              >
                <span aria-hidden="true">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                    <line x1="12" y1="18" x2="12.01" y2="18" />
                  </svg>
                </span>
                <span className="font-mono text-label-small bg-accent-500/20 text-accent-400 px-2 py-0.5 rounded">#{roomId}</span>
              </motion.button>
            </Tooltip>

            {/* Camera / Pose Diagnostic */}
            <Tooltip content={cameraStatus.hasCamera ? 'YOLO Pose Detection Active' : 'No Webcam (Controller Mode)'} position="bottom">
              <motion.button
                onClick={() => { soundEngine.playClick(); onOpenYoloDiagnostic(); }}
                className={`
                  flex items-center gap-2 px-3 py-2 rounded-xl font-semibold text-label-large transition-all motion-spring
                  ${cameraStatus.hasCamera
                    ? 'text-success-400 hover:text-success-300 bg-success-500/10 hover:bg-success-500/20 border border-success-500/20'
                    : 'text-sun-400 hover:text-sun-300 bg-sun-500/10 hover:bg-sun-500/20 border border-sun-500/20'
                  }
                `}
                whileTap={{ scale: 0.97 }}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                <span className="flex-shrink-0" aria-hidden="true">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                </span>
                <span className="hidden xl:inline text-label-small">
                  {cameraStatus.hasCamera ? 'AI CAMERA' : 'CONTROLLER'}
                </span>
                <motion.span
                  className={`w-2 h-2 rounded-full ${cameraStatus.hasCamera ? 'bg-success-400' : 'bg-sun-400'} animate-ping`}
                  aria-hidden="true"
                />
              </motion.button>
            </Tooltip>

            {/* Music Sound Toggle */}
            <Tooltip content={isMuted ? 'Unmute Menu Audio' : 'Mute Menu Audio'} position="bottom">
              <IconButton
                variant={isMuted ? 'ghost' : 'primary'}
                size="sm"
                aria-label={isMuted ? 'Unmute' : 'Mute'}
                onClick={toggleSound}
                whileTap={{ scale: 0.9 }}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.45 }}
              >
                {isMuted ? (
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    <line x1="23" y1="9" x2="17" y2="15" />
                    <line x1="17" y1="9" x2="23" y2="15" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                  </svg>
                )}
              </IconButton>
            </Tooltip>

            {/* VIP Store Button */}
            {onOpenStore && (
              <Tooltip content="VIP Pass & Store" position="bottom">
                <motion.button
                  onClick={() => { soundEngine.playClick(); onOpenStore(); }}
                  className="p-2 rounded-xl text-on-surface-variant hover:text-sun-300 hover:bg-sun-500/10 transition-all motion-spring"
                  whileTap={{ scale: 0.9 }}
                  whileHover={{ scale: 1.1, rotate: 6 }}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                </motion.button>
              </Tooltip>
            )}

            {/* Settings Button */}
            {onOpenSettings && (
              <Tooltip content="Game Settings" position="bottom">
                <motion.button
                  onClick={() => { soundEngine.playClick(); onOpenSettings(); }}
                  className="p-2 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-white/10 transition-all motion-spring"
                  whileTap={{ scale: 0.9 }}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.55 }}
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                </motion.button>
              </Tooltip>
            )}

            {/* Primary Player Dancer Profile Button */}
            {primaryPlayer && (
              <Tooltip content="Edit Dancer Card & Profile" position="bottom">
                <motion.button
                  onClick={() => { soundEngine.playClick(); onOpenProfileEditor(); }}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl bg-gradient-to-r from-purple-900/50 to-indigo-900/50 hover:from-purple-900/70 hover:to-indigo-900/70 border border-white/10 transition-all motion-spring"
                  whileTap={{ scale: 0.97 }}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  <Avatar
                    src={`https://api.dicebear.com/7.x/bottts/svg?seed=${primaryPlayer.avatarSeed}`}
                    alt={primaryPlayer.name}
                    name={primaryPlayer.name}
                    size="sm"
                    border
                    borderColor="brand"
                    status="online"
                  />
                  <div className="hidden sm:block text-left min-w-0">
                    <span className="block text-label-large font-bold text-white truncate max-w-[100px]">
                      {primaryPlayer.name.split(' ')[0]}
                    </span>
                    {rankConfig && (
                      <Badge variant="primary" size="sm" dot dotColor="brand">
                        {rankConfig.rank}
                      </Badge>
                    )}
                  </div>
                </motion.button>
              </Tooltip>
            )}

            {/* Mobile Navigation Toggle */}
            <motion.button
              onClick={() => setShowMobileMenu((v) => !v)}
              className="md:hidden p-2 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-white/10 transition-all motion-spring"
              whileTap={{ scale: 0.9 }}
              aria-label="Toggle Navigation Menu"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.65 }}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {showMobileMenu ? (
                  <line x1="18" y1="6" x2="6" y2="18" />
                ) : (
                  <>
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="18" x2="21" y2="18" />
                  </>
                )}
              </svg>
            </motion.button>
          </div>
        </div>

        {/* Mobile Drawer */}
        <AnimatePresence>
          {showMobileMenu && (
            <motion.div
              className="md:hidden absolute top-full left-0 right-0 mt-3 p-3 surface-glass rounded-2xl border border-outline-variant shadow-level-4 flex flex-col gap-2 z-[500]"
              initial={{ opacity: 0, y: -20, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -20, height: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            >
              {navItems.map((item) => (
                <motion.button
                  key={item.id}
                  onClick={() => { soundEngine.playClick(); onNavigate?.(item.id); setShowMobileMenu(false); }}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-label-large
                    transition-all motion-spring
                    ${activeScreen === item.id
                      ? 'bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-brand-glow'
                      : 'text-on-surface-variant hover:text-on-surface hover:bg-white/5'
                    }
                  `}
                  whileTap={{ scale: 0.98 }}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * navItems.indexOf(item) }}
                >
                  <span className="flex-shrink-0" aria-hidden="true">{item.icon}</span>
                  <span>{item.label}</span>
                </motion.button>
              ))}

              {onOpenTrainingStudio && (
                <motion.button
                  onClick={() => { soundEngine.playClick(); onOpenTrainingStudio(); setShowMobileMenu(false); }}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-label-large text-sun-400 hover:text-sun-300 hover:bg-sun-500/10 transition-all motion-spring"
                  whileTap={{ scale: 0.98 }}
                >
                  <span className="flex-shrink-0" aria-hidden="true">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                      <path d="M6 12v5c3 3 9 3 12 0v-5" />
                    </svg>
                  </span>
                  <span>Training Studio</span>
                </motion.button>
              )}

              <motion.button
                onClick={() => { soundEngine.playClick(); fileInputRef.current?.click(); setShowMobileMenu(false); }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-label-large text-sun-400 hover:text-sun-300 hover:bg-sun-500/10 transition-all motion-spring"
                whileTap={{ scale: 0.98 }}
              >
                <span className="flex-shrink-0" aria-hidden="true">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </span>
                <span>Import .cdnce Routine</span>
              </motion.button>

              <motion.div
                className="pt-2 border-t border-outline-variant flex justify-between items-center px-1"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <span className="text-label-medium font-bold text-accent-400">Room #{roomId}</span>
                <motion.button
                  onClick={() => { soundEngine.playClick(); onOpenPhonePairing(); setShowMobileMenu(false); }}
                  className="text-label-medium text-on-surface-variant hover:text-on-surface transition-colors"
                  whileTap={{ scale: 0.95 }}
                >
                  Connect Phone
                </motion.button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.header>
  );
};

export default Header;