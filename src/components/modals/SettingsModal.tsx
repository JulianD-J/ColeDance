import React, { useState } from 'react';
import { soundEngine } from '../../services/soundEffects';
import { menuMusic } from '../../services/menuMusicService';

interface SettingsModalProps {
  onClose: () => void;
  onResetLibrary?: () => void;
  hasCamera?: boolean;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  onClose,
  onResetLibrary,
  hasCamera = true,
}) => {
  const [activeTab, setActiveTab] = useState<'audio' | 'camera' | 'display' | 'data'>('audio');
  const [musicVol, setMusicVol] = useState<number>(() => {
    return parseFloat(localStorage.getItem('coledance_music_vol') || '0.8');
  });
  const [sfxVol, setSfxVol] = useState<number>(() => {
    return parseFloat(localStorage.getItem('coledance_sfx_vol') || '0.9');
  });
  const [isMuted, setIsMuted] = useState(menuMusic.getMuted());
  const [sensitivity, setSensitivity] = useState<'low' | 'normal' | 'high'>('normal');
  const [fpsMode, setFpsMode] = useState<'60' | '30'>('60');
  const [videoFit, setVideoFit] = useState<'cover' | 'contain'>(() => {
    return (localStorage.getItem('coledance_video_fit') as any) || 'cover';
  });
  const [showStatusToast, setShowStatusToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setShowStatusToast(msg);
    setTimeout(() => setShowStatusToast(null), 2500);
  };

  const handleMusicChange = (val: number) => {
    setMusicVol(val);
    localStorage.setItem('coledance_music_vol', val.toString());
    menuMusic.setVolume(val);
  };

  const handleSfxChange = (val: number) => {
    setSfxVol(val);
    localStorage.setItem('coledance_sfx_vol', val.toString());
  };

  const handleMuteToggle = () => {
    soundEngine.playClick();
    const muted = menuMusic.toggleMute();
    setIsMuted(muted);
    showToast(muted ? 'Audio muted' : 'Audio unmuted');
  };

  const handleVideoFitChange = (fit: 'cover' | 'contain') => {
    soundEngine.playClick();
    setVideoFit(fit);
    localStorage.setItem('coledance_video_fit', fit);
    showToast(`Video fit set to ${fit === 'cover' ? 'Fill Screen (Cover)' : 'Aspect Ratio (Contain)'}`);
  };

  const handleClearCache = () => {
    soundEngine.playClick();
    if (confirm('Clear all locally saved dance data, high scores and restore default songs?')) {
      localStorage.removeItem('coledance_custom_trained_songs_v3');
      localStorage.removeItem('coledance_deleted_songs_v1');
      if (onResetLibrary) onResetLibrary();
      showToast('Cache cleared! Default library restored.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 select-none">
      <div className="max-w-xl w-full bg-[#130b33]/95 border-2 border-pink-500/80 rounded-3xl p-5 sm:p-7 shadow-[0_0_50px_rgba(255,20,147,0.4)] text-white space-y-5">
        {/* Header */}
        <div className="flex justify-between items-center pb-3 border-b border-white/10">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center text-lg text-white shadow-lg">
              <i className="fa-solid fa-gear"></i>
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black italic tracking-wide text-white">
                COLEDANCE SETTINGS
              </h2>
              <p className="text-[11px] text-white/60">Configure audio, camera motion, and display</p>
            </div>
          </div>

          <button
            onClick={() => {
              soundEngine.playClick();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-red-600/80 flex items-center justify-center text-white/70 hover:text-white transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1.5 bg-black/50 p-1.5 rounded-2xl border border-white/10 text-xs font-black">
          {[
            { id: 'audio', label: 'Audio & SFX', icon: 'fa-volume-high' },
            { id: 'camera', label: 'Motion Tracking', icon: 'fa-camera' },
            { id: 'display', label: 'Display & Video', icon: 'fa-tv' },
            { id: 'data', label: 'Data & Cache', icon: 'fa-database' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                soundEngine.playClick();
                setActiveTab(tab.id as any);
              }}
              className={`flex-1 py-2 rounded-xl transition cursor-pointer flex items-center justify-center space-x-1.5 text-[11px] sm:text-xs ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-lg font-black'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <i className={`fa-solid ${tab.icon} text-xs`}></i>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab 1: Audio & SFX */}
        {activeTab === 'audio' && (
          <div className="space-y-4 text-xs">
            {/* Master Mute Toggle */}
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/10">
              <div>
                <div className="font-black text-sm text-white">Master Sound & Music</div>
                <div className="text-[11px] text-white/60">Toggle all background music and sound effects</div>
              </div>
              <button
                onClick={handleMuteToggle}
                className={`px-4 py-2 rounded-xl font-black text-xs transition cursor-pointer flex items-center space-x-1.5 ${
                  !isMuted ? 'bg-emerald-500 text-black shadow' : 'bg-red-600 text-white shadow'
                }`}
              >
                <i className={`fa-solid ${!isMuted ? 'fa-volume-high' : 'fa-volume-xmark'}`}></i>
                <span>{!isMuted ? 'ENABLED' : 'MUTED'}</span>
              </button>
            </div>

            {/* Music Volume Slider */}
            <div className="space-y-1.5 p-3 bg-white/5 rounded-2xl border border-white/10">
              <div className="flex justify-between items-center font-bold">
                <span>Menu & Song Music Volume</span>
                <span className="text-pink-400 font-black">{Math.round(musicVol * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={musicVol}
                onChange={(e) => handleMusicChange(parseFloat(e.target.value))}
                className="w-full accent-pink-500 cursor-pointer"
              />
            </div>

            {/* SFX Volume Slider */}
            <div className="space-y-1.5 p-3 bg-white/5 rounded-2xl border border-white/10">
              <div className="flex justify-between items-center font-bold">
                <span>Sound Effects (Clicks, Perfect Chimes, Buzzers)</span>
                <span className="text-cyan-400 font-black">{Math.round(sfxVol * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={sfxVol}
                onChange={(e) => handleSfxChange(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* Tab 2: Motion Tracking & Hardware */}
        {activeTab === 'camera' && (
          <div className="space-y-4 text-xs">
            {/* Device Camera Status */}
            <div className="p-3 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-between">
              <div>
                <div className="font-black text-sm text-white flex items-center space-x-1.5">
                  <i className={`fa-solid ${hasCamera ? 'fa-video text-emerald-400' : 'fa-video-slash text-amber-400'}`}></i>
                  <span>Camera Hardware Status</span>
                </div>
                <div className="text-[11px] text-white/60">
                  {hasCamera
                    ? 'Webcam active for 1-Player YOLO AI Pose Tracking'
                    : 'No camera hardware found. ColeDance is using Smartphone Controller Sync'}
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-[10px] font-black ${
                hasCamera ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40' : 'bg-amber-500/20 text-amber-300 border border-amber-400/40'
              }`}>
                {hasCamera ? 'CAMERA DETECTED' : 'PHONE SYNC MODE'}
              </span>
            </div>

            {/* Sensitivity Selection */}
            <div className="p-3 bg-white/5 rounded-2xl border border-white/10 space-y-2">
              <div className="font-black text-sm text-white">Pose Evaluation Sensitivity</div>
              <div className="text-[11px] text-white/60">Adjust how strictly player keypoints are scored against coach trajectories</div>
              <div className="grid grid-cols-3 gap-2 pt-1">
                {(['low', 'normal', 'high'] as const).map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => {
                      soundEngine.playClick();
                      setSensitivity(lvl);
                      showToast(`Sensitivity set to ${lvl.toUpperCase()}`);
                    }}
                    className={`py-2 rounded-xl font-black uppercase text-xs transition cursor-pointer ${
                      sensitivity === lvl
                        ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/40 font-black'
                        : 'bg-white/10 text-white/70 hover:bg-white/15'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Display & Video */}
        {activeTab === 'display' && (
          <div className="space-y-4 text-xs">
            {/* Video Stretch Mode */}
            <div className="p-3 bg-white/5 rounded-2xl border border-white/10 space-y-2">
              <div className="font-black text-sm text-white">Video Screen Scaling</div>
              <div className="text-[11px] text-white/60">Choose how routine videos fill the dancing screen</div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => handleVideoFitChange('cover')}
                  className={`py-2.5 px-3 rounded-xl font-black text-xs transition cursor-pointer flex items-center justify-center space-x-2 ${
                    videoFit === 'cover'
                      ? 'bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-lg'
                      : 'bg-white/10 text-white/70 hover:bg-white/15'
                  }`}
                >
                  <i className="fa-solid fa-expand"></i>
                  <span>FILL SCREEN (COVER)</span>
                </button>

                <button
                  onClick={() => handleVideoFitChange('contain')}
                  className={`py-2.5 px-3 rounded-xl font-black text-xs transition cursor-pointer flex items-center justify-center space-x-2 ${
                    videoFit === 'contain'
                      ? 'bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-lg'
                      : 'bg-white/10 text-white/70 hover:bg-white/15'
                  }`}
                >
                  <i className="fa-solid fa-compress"></i>
                  <span>ORIGINAL RATIO (CONTAIN)</span>
                </button>
              </div>
            </div>

            {/* Target FPS */}
            <div className="p-3 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-between">
              <div>
                <div className="font-black text-sm text-white">Target Frame Rate</div>
                <div className="text-[11px] text-white/60">60 FPS recommended for modern displays</div>
              </div>
              <button
                onClick={() => {
                  soundEngine.playClick();
                  setFpsMode((m) => (m === '60' ? '30' : '60'));
                  showToast(`Frame rate target set to ${fpsMode === '60' ? '30 FPS' : '60 FPS'}`);
                }}
                className="px-4 py-2 rounded-xl bg-purple-600 text-white font-black text-xs cursor-pointer shadow"
              >
                {fpsMode} FPS
              </button>
            </div>
          </div>
        )}

        {/* Tab 4: Data & Cache */}
        {activeTab === 'data' && (
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-3">
              <div>
                <div className="font-black text-sm text-white">Reset & Purge Local Data</div>
                <div className="text-[11px] text-white/60">
                  Clears cached songs, restores default catalog, and resets high scores.
                </div>
              </div>

              <button
                onClick={handleClearCache}
                className="w-full py-2.5 bg-red-600/80 hover:bg-red-600 text-white rounded-xl font-black text-xs transition cursor-pointer flex items-center justify-center space-x-2 shadow-lg"
              >
                <i className="fa-solid fa-trash-can"></i>
                <span>CLEAR CACHE & RESTORE DEFAULT CATALOG</span>
              </button>
            </div>
          </div>
        )}

        {/* Toast confirmation message */}
        {showStatusToast && (
          <div className="py-2 px-4 rounded-xl bg-emerald-500 text-black font-black text-xs text-center shadow-lg animate-bounce">
            {showStatusToast}
          </div>
        )}

        {/* Footer */}
        <div className="pt-2 border-t border-white/10 flex justify-end">
          <button
            onClick={() => {
              soundEngine.playClick();
              onClose();
            }}
            className="px-6 py-2.5 bg-gradient-to-r from-pink-500 to-rose-600 text-white rounded-xl font-black text-xs shadow-lg cursor-pointer transition hover:scale-105"
          >
            DONE
          </button>
        </div>
      </div>
    </div>
  );
};
