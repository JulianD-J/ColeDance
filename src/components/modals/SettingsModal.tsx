import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { soundEngine } from '../../services/soundEffects';
import { menuMusic } from '../../services/menuMusicService';
import { clearAllCustomSongs } from '../../data/songsData';
import { Modal, Button, Badge, Chip, Tooltip, Card, Slider, Switch } from '../ui';

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

  const handleClearCache = async () => {
    soundEngine.playClick();
    if (confirm('Clear all locally saved dance data, high scores and restore default songs?')) {
      await clearAllCustomSongs();
      if (onResetLibrary) onResetLibrary();
      showToast('Cache cleared! Default library restored.');
    }
  };

  const tabs: { id: 'audio' | 'camera' | 'display' | 'data'; label: string; icon: React.ReactNode }[] = [
    { id: 'audio', label: 'Audio & SFX', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" /></svg> },
    { id: 'camera', label: 'Motion Tracking', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg> },
    { id: 'display', label: 'Display & Video', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8" /><path d="M12 17v4" /></svg> },
    { id: 'data', label: 'Data & Cache', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" /></svg> },
  ];

  return (
    <Modal
      isOpen={true}
      onClose={() => { soundEngine.playClick(); onClose(); }}
      title="COLEDANCE SETTINGS"
      description="Configure audio, camera motion, and display"
      size="lg"
      variant="form"
      showCloseButton={true}
      footer={
        <Button variant="primary" size="md" onClick={() => { soundEngine.playClick(); onClose(); }} className="shadow-brand-glow">
          DONE
        </Button>
      }
    >
      <motion.div
        className="space-y-5"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Tab Navigation */}
        <div className="flex gap-2 bg-surface-1/50 p-1.5 rounded-2xl border border-outline-variant">
          {tabs.map((tab) => (
            <Tooltip key={tab.id} content={tab.label} position="bottom">
              <Button
                variant={activeTab === tab.id ? 'primary' : 'ghost'}
                size="sm"
                fullWidth
                leadingIcon={tab.icon}
                onClick={() => { soundEngine.playClick(); setActiveTab(tab.id); }}
              >
                {tab.label}
              </Button>
            </Tooltip>
          ))}
        </div>

        {/* Toast confirmation message */}
        <AnimatePresence>
          {showStatusToast && (
            <motion.div
              className="p-3 rounded-xl bg-success-500/20 border border-success-500/30 text-center"
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -10, height: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            >
              <span className="text-body-small font-black text-success-400">{showStatusToast}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tab 1: Audio & SFX */}
        <AnimatePresence mode="wait">
          {activeTab === 'audio' && (
            <motion.div
              key="audio"
              className="space-y-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {/* Master Mute Toggle */}
              <Card variant="filled" padding="md" className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="font-black text-body-medium text-white">Master Sound & Music</div>
                  <div className="text-body-small text-on-surface-variant mt-0.5">Toggle all background music and sound effects</div>
                </div>
                <Tooltip content={isMuted ? 'Unmute all audio' : 'Mute all audio'} position="left">
                  <Button
                    variant={!isMuted ? 'success' : 'danger'}
                    size="md"
                    leadingIcon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">{!isMuted ? (
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    ) : (
                      <>
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                        <line x1="23" y1="9" x2="17" y2="15" />
                        <line x1="17" y1="9" x2="23" y2="15" />
                      </>
                    )}</svg>}
                    onClick={handleMuteToggle}
                  >
                    {!isMuted ? 'ENABLED' : 'MUTED'}
                  </Button>
                </Tooltip>
              </Card>

              {/* Music Volume Slider */}
              <Card variant="filled" padding="md">
                <div className="flex justify-between items-center font-black text-body-small mb-2">
                  <span>Menu & Song Music Volume</span>
                  <span className="text-brand-400 tabular-nums">{Math.round(musicVol * 100)}%</span>
                </div>
                <Slider
                  value={musicVol * 100}
                  onChange={(v) => handleMusicChange((Array.isArray(v) ? v[0] : v) / 100)}
                  min={0}
                  max={100}
                  step={5}
                  showValue={false}
                />
              </Card>

              {/* SFX Volume Slider */}
              <Card variant="filled" padding="md">
                <div className="flex justify-between items-center font-black text-body-small mb-2">
                  <span>Sound Effects (Clicks, Perfect Chimes, Buzzers)</span>
                  <span className="text-accent-400 tabular-nums">{Math.round(sfxVol * 100)}%</span>
                </div>
                <Slider
                  value={sfxVol * 100}
                  onChange={(v) => handleSfxChange((Array.isArray(v) ? v[0] : v) / 100)}
                  min={0}
                  max={100}
                  step={5}
                  showValue={false}
                />
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tab 2: Motion Tracking & Hardware */}
        <AnimatePresence mode="wait">
          {activeTab === 'camera' && (
            <motion.div
              key="camera"
              className="space-y-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {/* Device Camera Status */}
              <Card variant="filled" padding="md" className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 font-black text-body-medium text-white mb-1">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                      {!hasCamera && <line x1="3" y1="3" x2="21" y2="21" />}
                      <circle cx="12" cy="13" r="4" />
                    </svg>
                    <span>Camera Hardware Status</span>
                  </div>
                  <div className="text-body-small text-on-surface-variant">
                    {hasCamera
                      ? 'Webcam active for 1-Player YOLO AI Pose Tracking'
                      : 'No camera hardware found. ColeDance is using Smartphone Controller Sync'}
                  </div>
                </div>
                <Badge
                  variant={hasCamera ? 'success' : 'warning'}
                  size="md"
                  dot
                  dotColor={hasCamera ? 'success' : 'warning'}
                >
                  {hasCamera ? 'CAMERA DETECTED' : 'PHONE SYNC MODE'}
                </Badge>
              </Card>

              {/* Sensitivity Selection */}
              <Card variant="filled" padding="md" className="space-y-3">
                <div>
                  <div className="font-black text-body-medium text-white mb-1">Pose Evaluation Sensitivity</div>
                  <div className="text-body-small text-on-surface-variant">Adjust how strictly player keypoints are scored against coach trajectories</div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(['low', 'normal', 'high'] as const).map((lvl) => (
                    <Tooltip key={lvl} content={`Sensitivity: ${lvl}`} position="top">
                      <Button
                        variant={sensitivity === lvl ? 'primary' : 'ghost'}
                        size="sm"
                        fullWidth
                        onClick={() => { soundEngine.playClick(); setSensitivity(lvl); showToast(`Sensitivity set to ${lvl.toUpperCase()}`); }}
                      >
                        {lvl.toUpperCase()}
                      </Button>
                    </Tooltip>
                  ))}
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tab 3: Display & Video */}
        <AnimatePresence mode="wait">
          {activeTab === 'display' && (
            <motion.div
              key="display"
              className="space-y-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {/* Video Stretch Mode */}
              <Card variant="filled" padding="md" className="space-y-3">
                <div>
                  <div className="font-black text-body-medium text-white mb-1">Video Screen Scaling</div>
                  <div className="text-body-small text-on-surface-variant">Choose how routine videos fill the dancing screen</div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Tooltip content="Fill screen, may crop edges" position="top">
                    <Button
                      variant={videoFit === 'cover' ? 'primary' : 'ghost'}
                      size="md"
                      fullWidth
                      leadingIcon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3H5a2 2 0 0 0-2 2v3" /><path d="M21 8V5a2 2 0 0 0-2-2h-3" /><path d="M3 16v3a2 2 0 0 0 2 2h3" /><path d="M16 21h3a2 2 0 0 0 2-2v-3" /></svg>}
                      onClick={() => handleVideoFitChange('cover')}
                    >
                      FILL SCREEN (COVER)
                    </Button>
                  </Tooltip>
                  <Tooltip content="Preserve aspect ratio, may show bars" position="top">
                    <Button
                      variant={videoFit === 'contain' ? 'primary' : 'ghost'}
                      size="md"
                      fullWidth
                      leadingIcon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3H5a2 2 0 0 0-2 2v3" /><path d="M21 8V5a2 2 0 0 0-2-2h-3" /><path d="M3 16v3a2 2 0 0 0 2 2h3" /><path d="M16 21h3a2 2 0 0 0 2-2v-3" /><path d="M12 8v8" /><path d="M8 12h8" /></svg>}
                      onClick={() => handleVideoFitChange('contain')}
                    >
                      ASPECT RATIO (CONTAIN)
                    </Button>
                  </Tooltip>
                </div>
              </Card>

              {/* Target FPS */}
              <Card variant="filled" padding="md" className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-black text-body-medium text-white mb-1">Target Frame Rate</div>
                  <div className="text-body-small text-on-surface-variant">60 FPS recommended for modern displays</div>
                </div>
                <Tooltip content="Toggle between 60 and 30 FPS" position="left">
                  <Button
                    variant="outlined"
                    size="md"
                    onClick={() => { soundEngine.playClick(); setFpsMode((m) => (m === '60' ? '30' : '60')); showToast(`Frame rate target set to ${fpsMode === '60' ? '30 FPS' : '60 FPS'}`); }}
                  >
                    {fpsMode} FPS
                  </Button>
                </Tooltip>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tab 4: Data & Cache */}
        <AnimatePresence mode="wait">
          {activeTab === 'data' && (
            <motion.div
              key="data"
              className="space-y-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Card variant="filled" padding="lg" className="space-y-4">
                <div className="space-y-2">
                  <div className="font-black text-body-medium text-white">Reset & Purge Local Data</div>
                  <div className="text-body-small text-on-surface-variant">
                    Clears cached songs, restores default catalog, and resets high scores.
                  </div>
                </div>

                <Tooltip content="This action cannot be undone" position="top">
                  <Button
                    variant="danger"
                    size="lg"
                    fullWidth
                    leadingIcon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>}
                    onClick={handleClearCache}
                    className="shadow-error-glow"
                  >
                    CLEAR CACHE & RESTORE DEFAULT CATALOG
                  </Button>
                </Tooltip>

                <div className="pt-4 border-t border-outline-variant space-y-2 text-body-small text-on-surface-variant">
                  <p>Music Volume: <span className="text-brand-400 font-bold">{Math.round(musicVol * 100)}%</span></p>
                  <p>SFX Volume: <span className="text-accent-400 font-bold">{Math.round(sfxVol * 100)}%</span></p>
                  <p>Video Fit: <span className="text-sun-400 font-bold">{videoFit === 'cover' ? 'Fill Screen' : 'Aspect Ratio'}</span></p>
                  <p>Camera: <span className="text-success-400 font-bold">{hasCamera ? 'Detected' : 'Phone Sync'}</span></p>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </Modal>
  );
};

export default SettingsModal;