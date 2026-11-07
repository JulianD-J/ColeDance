import React, { useState, useEffect, useRef } from 'react';
import { ScreenId, Player } from '../types/game';
import { soundEngine } from '../services/soundEffects';
import { menuMusic } from '../services/menuMusicService';
import { detectDeviceCamera, CameraStatus } from '../services/cameraDetection';
import { getRankConfig } from '../services/momentumScoring';

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
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [cameraStatus, setCameraStatus] = useState<CameraStatus>({
    hasCamera: true,
    isChecking: true,
    deviceCount: 1,
  });

  useEffect(() => {
    menuMusic.startMenuMusic();
    detectDeviceCamera().then(setCameraStatus);
  }, []);

  const toggleSound = () => {
    soundEngine.playClick();
    const muted = menuMusic.toggleMute();
    setIsMuted(muted);
  };

  const navItems: { id: ScreenId; label: string; icon: string }[] = [
    { id: 'home', label: 'Spotlight', icon: 'fa-house' },
    { id: 'songs', label: 'Song Library', icon: 'fa-compact-disc' },
    { id: 'coaches', label: 'Coaches', icon: 'fa-users' },
  ];

  const rankConfig = primaryPlayer ? getRankConfig(primaryPlayer.rank || 'Bronze') : null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onImportCdnce) {
      soundEngine.playClick();
      onImportCdnce(file);
    }
    // reset input
    if (e.target) e.target.value = '';
  };

  return (
    <header className="relative z-30 w-full mb-4 px-3 sm:px-5 py-2.5 flex items-center justify-between gap-3 border-b border-white/10 backdrop-blur-xl bg-[#080414]/85 rounded-2xl select-none shadow-xl">
      {/* Zone 1: Brand Wordmark (Single-line, athletic, refined) */}
      <div
        className="flex items-baseline space-x-2 cursor-pointer shrink-0"
        onClick={() => {
          soundEngine.playClick();
          onNavigate?.('home');
        }}
      >
        <span className="text-xl sm:text-2xl font-black italic tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white via-pink-300 to-pink-500 drop-shadow-[0_0_20px_rgba(255,20,147,0.7)]">
          COLEDANCE
        </span>
        <span className="text-[10px] sm:text-xs font-black tracking-widest text-cyan-400 uppercase opacity-90">
          2026
        </span>
      </div>

      {/* Zone 2: Navigation Links (Clean single-line text links with subtle active glow) */}
      <nav className="hidden md:flex items-center gap-6 lg:gap-8 text-xs font-bold uppercase tracking-wider shrink-0">
        {navItems.map((item) => {
          const isActive = activeScreen === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                soundEngine.playClick();
                onNavigate?.(item.id);
              }}
              className={`relative py-1.5 transition whitespace-nowrap shrink-0 flex items-center space-x-1.5 cursor-pointer ${
                isActive
                  ? 'text-pink-400 font-black'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              <i className={`fa-solid ${item.icon} text-[10px] opacity-75`}></i>
              <span>{item.label}</span>
              {isActive && (
                <span className="absolute -bottom-2.5 left-0 right-0 h-[2px] bg-gradient-to-r from-pink-500 via-rose-400 to-yellow-300 shadow-[0_0_8px_#ff1493]"></span>
              )}
            </button>
          );
        })}

        {/* Training Studio Nav Action */}
        <button
          onClick={() => {
            soundEngine.playClick();
            onOpenTrainingStudio?.();
          }}
          className="relative py-1.5 text-yellow-300/90 hover:text-yellow-200 transition whitespace-nowrap shrink-0 flex items-center space-x-1.5 font-black cursor-pointer"
        >
          <i className="fa-solid fa-graduation-cap text-xs text-yellow-400"></i>
          <span>TRAINING STUDIO</span>
        </button>
      </nav>

      {/* Zone 3: Player Lounge & Quick Controls */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
        {/* Hidden File Input for .cdnce import */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".cdnce,.zip"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Import .cdnce Package Button */}
        <button
          onClick={() => {
            soundEngine.playClick();
            fileInputRef.current?.click();
          }}
          title="Import .cdnce Routine Package (Video + Moves)"
          className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-black text-amber-300 hover:text-white bg-amber-950/40 hover:bg-amber-900/60 border border-amber-400/30 rounded-xl transition cursor-pointer whitespace-nowrap shadow"
        >
          <i className="fa-solid fa-file-import text-amber-400 text-xs"></i>
          <span className="hidden sm:inline">IMPORT .CDNCE</span>
        </button>

        {/* Phone Pairing Quick Action */}
        <button
          onClick={() => {
            soundEngine.playClick();
            onOpenPhonePairing();
          }}
          title="Connect Smartphone Controller"
          className="hidden lg:flex items-center space-x-1.5 px-3 py-1.5 text-xs font-extrabold text-cyan-300 hover:text-white bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-400/30 rounded-xl transition cursor-pointer whitespace-nowrap"
        >
          <i className="fa-solid fa-mobile-screen text-cyan-400 text-xs"></i>
          <span>ROOM #{roomId}</span>
        </button>

        {/* Camera / Pose Diagnostic prober */}
        <button
          onClick={() => {
            soundEngine.playClick();
            onOpenYoloDiagnostic();
          }}
          title={cameraStatus.hasCamera ? 'YOLO Pose Detection Active' : 'No Webcam (Controller Mode)'}
          className="p-2 sm:px-2.5 sm:py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center space-x-1.5 bg-black/40 hover:bg-white/10 border-white/15 text-white/80"
        >
          <i
            className={`fa-solid fa-video ${
              cameraStatus.hasCamera ? 'text-emerald-400' : 'text-amber-400'
            }`}
          ></i>
          <span className="hidden xl:inline text-[11px]">
            {cameraStatus.hasCamera ? 'AI CAMERA' : 'CONTROLLER'}
          </span>
        </button>

        {/* Music Sound Toggle */}
        <button
          onClick={toggleSound}
          title={isMuted ? 'Unmute Menu Audio' : 'Mute Menu Audio'}
          className={`p-2 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center justify-center ${
            !isMuted
              ? 'text-pink-400 bg-pink-950/30 border-pink-500/40'
              : 'text-white/40 bg-black/40 border-white/10 hover:text-white'
          }`}
        >
          <i className={`fa-solid ${isMuted ? 'fa-volume-xmark' : 'fa-volume-high'}`}></i>
        </button>

        {/* VIP Store Button */}
        {onOpenStore && (
          <button
            onClick={() => {
              soundEngine.playClick();
              onOpenStore();
            }}
            title="VIP Pass & Store"
            className="p-2 rounded-xl text-xs font-bold border border-white/10 bg-black/40 text-yellow-300/80 hover:text-yellow-200 transition cursor-pointer"
          >
            <i className="fa-solid fa-crown text-xs"></i>
          </button>
        )}

        {/* Settings Button */}
        {onOpenSettings && (
          <button
            onClick={() => {
              soundEngine.playClick();
              onOpenSettings();
            }}
            title="Game Settings"
            className="p-2 rounded-xl text-xs font-bold border border-white/10 bg-black/40 text-white/60 hover:text-white transition cursor-pointer"
          >
            <i className="fa-solid fa-gear text-xs"></i>
          </button>
        )}

        {/* Primary Player Dancer Profile Button */}
        {primaryPlayer && (
          <button
            onClick={() => {
              soundEngine.playClick();
              onOpenProfileEditor();
            }}
            title="Edit Dancer Card & Profile"
            className="flex items-center space-x-2 pl-1.5 pr-2.5 py-1 bg-gradient-to-r from-purple-950/80 to-indigo-950/80 hover:from-purple-900 hover:to-indigo-900 border border-white/20 rounded-xl transition cursor-pointer shadow"
          >
            <div className="w-6 h-6 rounded-lg overflow-hidden bg-indigo-950 border border-white/30 shrink-0">
              <img
                src={`https://api.dicebear.com/7.x/bottts/svg?seed=${primaryPlayer.avatarSeed}`}
                className="w-full h-full object-cover"
                alt={primaryPlayer.name}
              />
            </div>
            <div className="hidden sm:flex flex-col text-left leading-none">
              <span className="text-[11px] font-black text-white truncate max-w-[80px]">
                {primaryPlayer.name.split(' ')[0]}
              </span>
              {rankConfig && (
                <span
                  className="text-[8px] font-black uppercase tracking-wider"
                  style={{ color: rankConfig.badgeColor }}
                >
                  {rankConfig.rank}
                </span>
              )}
            </div>
          </button>
        )}

        {/* Mobile Navigation Toggle (replaces redundant second bottom navbar) */}
        <button
          onClick={() => setShowMobileMenu((v) => !v)}
          className="md:hidden p-2 rounded-xl text-xs font-bold bg-white/10 text-white/80 hover:text-white cursor-pointer"
          title="Toggle Navigation Menu"
        >
          <i className={`fa-solid ${showMobileMenu ? 'fa-xmark' : 'fa-bars'}`}></i>
        </button>
      </div>

      {/* Mobile Drawer (Only visible when hamburger clicked on small devices) */}
      {showMobileMenu && (
        <div className="md:hidden absolute top-full left-0 right-0 mt-2 p-3 bg-[#0c071d]/95 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-2xl flex flex-col space-y-2 z-50">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                soundEngine.playClick();
                onNavigate?.(item.id);
                setShowMobileMenu(false);
              }}
              className={`p-2.5 rounded-xl text-left text-xs font-bold flex items-center space-x-2.5 ${
                activeScreen === item.id ? 'bg-pink-600 text-white' : 'text-white/70 hover:bg-white/10'
              }`}
            >
              <i className={`fa-solid ${item.icon} text-sm`}></i>
              <span>{item.label}</span>
            </button>
          ))}

          <button
            onClick={() => {
              soundEngine.playClick();
              onOpenTrainingStudio?.();
              setShowMobileMenu(false);
            }}
            className="p-2.5 rounded-xl text-left text-xs font-black text-yellow-300 hover:bg-white/10 flex items-center space-x-2.5"
          >
            <i className="fa-solid fa-graduation-cap text-sm"></i>
            <span>Training Studio</span>
          </button>

          <button
            onClick={() => {
              soundEngine.playClick();
              fileInputRef.current?.click();
              setShowMobileMenu(false);
            }}
            className="p-2.5 rounded-xl text-left text-xs font-black text-amber-300 hover:bg-white/10 flex items-center space-x-2.5"
          >
            <i className="fa-solid fa-file-import text-sm"></i>
            <span>Import .cdnce Routine</span>
          </button>

          <div className="pt-2 border-t border-white/10 flex justify-between items-center px-1">
            <span className="text-[11px] text-cyan-300 font-bold">Room #{roomId}</span>
            <button
              onClick={() => {
                soundEngine.playClick();
                onOpenPhonePairing();
                setShowMobileMenu(false);
              }}
              className="text-xs text-white/70 hover:text-white"
            >
              Connect Phone
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
