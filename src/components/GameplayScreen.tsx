import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Song, Coach, Player, YoloPersonDetection, YoloCoachFrame } from '../types/game';
import { soundEngine } from '../services/soundEffects';
import { yoloTracker, isRunningInIframe } from '../services/yoloPoseTracker';
import { socketService } from '../services/socketService';
import { menuMusic } from '../services/menuMusicService';
import { getVideoBlob } from '../services/indexedDBStorage';
import { calculateMomentumMoveScore, getRankConfig, COLEDANCE_RANKS } from '../services/momentumScoring';
import confetti from 'canvas-confetti';
import {
  Card,
  Button,
  IconButton,
  Avatar,
  Badge,
  Progress,
  CircularProgress,
  Switch,
  AvatarProgress,
  Tooltip,
} from './ui';

interface GameplayScreenProps {
  song: Song;
  coach: Coach;
  players: Player[];
  hasCamera?: boolean;
  onFinishRoutine: (updatedPlayers: Player[]) => void;
  onExit: () => void;
}

export const GameplayScreen: React.FC<GameplayScreenProps> = ({
  song,
  coach,
  players: initialPlayers,
  hasCamera = true,
  onFinishRoutine,
  onExit,
}) => {
  const [activePlayers, setActivePlayers] = useState<Player[]>(initialPlayers);
  const [showWebcamPreview, setShowWebcamPreview] = useState<boolean>(true);
  const [showKinectSkeleton, setShowKinectSkeleton] = useState<boolean>(true);
  const [videoFitMode, setVideoFitMode] = useState<'cover' | 'contain'>('cover');
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [musicVolume, setMusicVolume] = useState<number>(0.9);
  const [sfxVolume, setSfxVolume] = useState<number>(0.9);
  const [cameraActive, setCameraActive] = useState(false);
  const [beatProgress, setBeatProgress] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(song.durationSeconds);
  const [statusTip, setStatusTip] = useState<string>('Follow and mirror the coach movements!');
  const [customVideoUrl, setCustomVideoUrl] = useState<string | null>(null);
  const [isAudioBlocked, setIsAudioBlocked] = useState<boolean>(false);
  const [dismissIframeBanner, setDismissIframeBanner] = useState<boolean>(false);
  const [showPauseMenu, setShowPauseMenu] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Big feedback animations state for player 1
  const [currentFeedbackAnim, setCurrentFeedbackAnim] = useState<{
    text: 'PERFECT' | 'SUPER' | 'GOOD' | 'OK' | 'MISS' | null;
    key: number;
  }>({ text: null, key: 0 });

  const [milestoneCelebration, setMilestoneCelebration] = useState<
    'SUPERSTAR' | 'MEGASTAR' | 'LEGENDARY DANCER' | 'DIAMOND DANCER' | null
  >(null);

  // Refs for camera tracking (persistent, not tied to preview visibility)
  const trackingVideoRef = useRef<HTMLVideoElement | null>(null);
  const trackingCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const kinectCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const coachVideoRef = useRef<HTMLVideoElement | null>(null);

  // References to keep beat-driven scoring precise
  const latestDetectionsRef = useRef<YoloPersonDetection[]>([]);
  const hasScoredCurrentBeatRef = useRef<boolean>(false);
  const activePlayersRef = useRef<Player[]>(activePlayers);
  activePlayersRef.current = activePlayers;
  const isPausedRef = useRef<boolean>(isPaused);
  isPausedRef.current = isPaused;
  const hasCelebratedMegastarRef = useRef<boolean>(false);
  const hasCelebratedSuperstarRef = useRef<boolean>(false);

  const inIframe = isRunningInIframe();

  // Selected coach keyframe getter based on player's assigned coach and current playback second
  const getCoachFrameForPlayer = useCallback(
    (assignedCoachIdx: number, currentSec: number): YoloCoachFrame | null => {
      const frames = song.unlimitedCoachFrames || [];
      if (frames.length === 0) return null;

      const coachFrames = frames.filter((f) => f.coachIndex === assignedCoachIdx);
      const pool = coachFrames.length > 0 ? coachFrames : frames;

      return (
        pool.find((f) => Math.abs(f.timestampSeconds - currentSec) < 0.45) ||
        pool[0] ||
        null
      );
    },
    [song.unlimitedCoachFrames]
  );

  const triggerMoveScore = useCallback((
    feedback: 'PERFECT' | 'SUPER' | 'GOOD' | 'OK' | 'MISS',
    pts: number,
    playerIdx: number
  ) => {
    if (feedback !== 'MISS' && feedback !== 'OK') {
      soundEngine.playScoreFeedback(feedback);
    } else if (feedback === 'MISS') {
      soundEngine.playBuzzerMiss();
    }

    if (playerIdx === 0) {
      setCurrentFeedbackAnim({ text: feedback, key: Date.now() });
    }

    setActivePlayers((prev) => {
      const updated = [...prev];
      if (updated[playerIdx]) {
        const p = updated[playerIdx];
        const motionVel = latestDetectionsRef.current[playerIdx]?.motionVelocity ?? 0.25;
        const result = calculateMomentumMoveScore(p, feedback, motionVel);

        if (result.multiplierUpgraded) {
          soundEngine.playMultiplierUpgrade(result.newMultiplier);
        }

        if (result.rankPromoted) {
          soundEngine.playRankPromoted(result.newRank);
        }

        if (result.newRank === 'Legend' && !hasCelebratedMegastarRef.current) {
          hasCelebratedMegastarRef.current = true;
          setMilestoneCelebration('LEGENDARY DANCER');
          soundEngine.playMegastarFanfare();
          try {
            confetti({
              particleCount: 80,
              spread: 110,
              origin: { y: 0.6 },
              colors: ['#d91e6d', '#f59e0b', '#22c55e', '#0ea5e9'],
            });
          } catch {}
          setTimeout(() => setMilestoneCelebration(null), 3500);
        } else if (
          result.newRank === 'Diamond' &&
          !hasCelebratedSuperstarRef.current &&
          !hasCelebratedMegastarRef.current
        ) {
          hasCelebratedSuperstarRef.current = true;
          setMilestoneCelebration('DIAMOND DANCER');
          soundEngine.playStarUnlock();
          try {
            confetti({
              particleCount: 45,
              spread: 80,
              origin: { y: 0.6 },
              colors: ['#0ea5e9', '#a855f7', '#ffffff'],
            });
          } catch {}
          setTimeout(() => setMilestoneCelebration(null), 3000);
        }

        const newStars =
          Math.min(5, Math.floor(result.newScore / 2200)) +
          (result.newRank === 'Legend' ? 2 : result.newRank === 'Diamond' ? 1 : 0);

        if (p.isPhoneController) {
          socketService.sendScoreFeedback(p.id, feedback, result.awardedPoints, result.newScore);
        }

        updated[playerIdx] = {
          ...p,
          score: result.newScore,
          stars: newStars,
          lastFeedback: feedback,
          streak: result.newStreak,
          maxStreak: result.newMaxStreak,
          momentum: result.newMomentum,
          multiplier: result.newMultiplier,
          rank: result.newRank,
        };
      }
      return updated;
    });
  }, []);

  // Try playing song audio or custom video
  const startAudio = useCallback(() => {
    if (audioRef.current && !customVideoUrl) {
      audioRef.current.volume = musicVolume;
      audioRef.current
        .play()
        .then(() => setIsAudioBlocked(false))
        .catch((e) => {
          console.warn('Audio autoplay blocked by browser policy:', e);
          setIsAudioBlocked(true);
        });
    }

    if (coachVideoRef.current && customVideoUrl) {
      coachVideoRef.current.volume = musicVolume;
      coachVideoRef.current
        .play()
        .then(() => setIsAudioBlocked(false))
        .catch((e) => {
          console.warn('Video autoplay blocked by browser policy:', e);
          setIsAudioBlocked(true);
        });
    }
  }, [customVideoUrl, musicVolume]);

  const pauseMedia = useCallback(() => {
    if (audioRef.current) audioRef.current.pause();
    if (coachVideoRef.current) coachVideoRef.current.pause();
  }, []);

  const resumeMedia = useCallback(() => {
    if (audioRef.current && !customVideoUrl) {
      audioRef.current.play().catch(console.warn);
    }
    if (coachVideoRef.current && customVideoUrl) {
      coachVideoRef.current.play().catch(console.warn);
    }
  }, [customVideoUrl]);

  const togglePause = useCallback(() => {
    soundEngine.playClick();
    setIsPaused((prev) => {
      const next = !prev;
      if (next) {
        pauseMedia();
        setShowPauseMenu(true);
      } else {
        resumeMedia();
        setShowPauseMenu(false);
      }
      return next;
    });
  }, [pauseMedia, resumeMedia]);

  const handleRestart = () => {
    soundEngine.playClick();
    setIsPaused(false);
    setShowPauseMenu(false);
    hasCelebratedMegastarRef.current = false;
    hasCelebratedSuperstarRef.current = false;
    setTimeRemaining(song.durationSeconds);
    setActivePlayers((prev) =>
      prev.map((p) => ({
        ...p,
        score: 0,
        stars: 0,
        streak: 0,
        maxStreak: 0,
        momentum: 0,
        multiplier: 1,
        rank: 'Bronze',
        lastFeedback: 'READY',
      }))
    );
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(console.warn);
    }
    if (coachVideoRef.current) {
      coachVideoRef.current.currentTime = 0;
      coachVideoRef.current.play().catch(console.warn);
    }
  };

  // Keyboard shortcut: Escape or Space to pause
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.code === 'Space') {
        e.preventDefault();
        togglePause();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePause]);

  // Load custom video if trained locally in IndexedDB
  useEffect(() => {
    menuMusic.stopMenuMusic();

    if (song.isCustomTrained) {
      getVideoBlob(song.id).then((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          setCustomVideoUrl(url);
        }
      });
    }

    return () => {
      menuMusic.startMenuMusic();
      if (customVideoUrl) URL.revokeObjectURL(customVideoUrl);
    };
  }, [song.id]);

  // Initialize camera tracking ONCE - persistent tracking independent of preview visibility
  useEffect(() => {
    let mounted = true;

    const initTracking = async () => {
      if (!hasCamera) {
        setCameraActive(false);
        setStatusTip('Groove to the rhythm with your Phone Controller or Keyboard arrow keys!');
        return;
      }

      // Create persistent video element for tracking (not tied to preview visibility)
      if (!trackingVideoRef.current) {
        trackingVideoRef.current = document.createElement('video');
        trackingVideoRef.current.playsInline = true;
        trackingVideoRef.current.muted = true;
        trackingVideoRef.current.style.display = 'none'; // Hidden from DOM
      }

      if (!trackingCanvasRef.current) {
        trackingCanvasRef.current = document.createElement('canvas');
        trackingCanvasRef.current.width = 640;
        trackingCanvasRef.current.height = 480;
      }

      try {
        const initOk = await yoloTracker.initialize(trackingVideoRef.current, trackingCanvasRef.current);
        if (!initOk) {
          // Try MediaPipe fallback
          console.log('[Gameplay] ONNX not available, using MediaPipe');
        }

        const camOk = await yoloTracker.startCamera();
        if (mounted) {
          setCameraActive(camOk);
          if (!camOk) {
            setCameraError('Camera access denied or not available');
            setStatusTip('Camera unavailable. Using phone controller or keyboard.');
          }
        }
      } catch (err: any) {
        console.error('[Gameplay] Camera init error:', err);
        if (mounted) {
          setCameraActive(false);
          setCameraError(err?.message || 'Camera initialization failed');
          setStatusTip('Camera error. Using phone controller or keyboard.');
        }
      }

      yoloTracker.setShowYoloDebugOverlay(true);

      // Multi-person detections callback
      yoloTracker.setOnMultiPersonDetections((detections: YoloPersonDetection[]) => {
        latestDetectionsRef.current = detections;

        if (!detections || detections.length === 0) {
          setStatusTip('No dancer in camera frame. Step into view to mirror the coach!');
        } else {
          const p1 = detections[0];
          if (p1.motionVelocity !== undefined && p1.motionVelocity < 0.007) {
            setStatusTip('You are standing still! Groove with the coach moves!');
          }
        }
      });
    };

    initTracking();

    // Start audio
    startAudio();

    // Phone controller sync
    if (socketService.socket) {
      socketService.socket.on(
        'player_motion',
        (data: { playerId: string; intensity: number; gesture?: string }) => {
          if (isPausedRef.current) return;
          const pIdx = activePlayersRef.current.findIndex((p) => p.id === data.playerId);
          if (pIdx >= 0) {
            let feedback: 'PERFECT' | 'SUPER' | 'GOOD' | 'OK' = 'GOOD';
            let pts = 160;
            if (data.intensity > 18) {
              feedback = 'PERFECT';
              pts = 350;
            } else if (data.intensity > 12) {
              feedback = 'SUPER';
              pts = 260;
            }
            triggerMoveScore(feedback, pts, pIdx);
          }
        }
      );
    }

    return () => {
      mounted = false;
      yoloTracker.stopCamera();
      if (audioRef.current) audioRef.current.pause();
      if (coachVideoRef.current) coachVideoRef.current.pause();
    };
  }, [hasCamera, startAudio, triggerMoveScore]);

  // Continuous Kinect Mini Skeleton Rendering - INDEPENDENT of preview visibility
  useEffect(() => {
    let animId: number;
    const renderKinect = () => {
      if (kinectCanvasRef.current && showKinectSkeleton) {
        const canvas = kinectCanvasRef.current;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const p1Detection = latestDetectionsRef.current[0] || null;
          yoloTracker.renderKinectSkeleton(p1Detection, ctx, canvas.width, canvas.height, '#00ff88');
        }
      }
      animId = requestAnimationFrame(renderKinect);
    };
    animId = requestAnimationFrame(renderKinect);
    return () => cancelAnimationFrame(animId);
  }, [showKinectSkeleton]);

  // Song countdown timer
  useEffect(() => {
    const songTimer = setInterval(() => {
      if (isPausedRef.current) return;

      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(songTimer);
          handleFinish();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(songTimer);
  }, []);

  // BPM-synchronized Beat Measure Loop
  useEffect(() => {
    const beatDurationMs = (60 / (song.bpm || 120)) * 2 * 1000;
    hasScoredCurrentBeatRef.current = false;
    setBeatProgress(0);

    const stepMs = beatDurationMs / 25;
    const progressTimer = setInterval(() => {
      if (isPausedRef.current) return;
      setBeatProgress((prev) => {
        const next = prev + 4;
        return next > 100 ? 100 : next;
      });
    }, stepMs);

    const resetTimer = setInterval(() => {
      if (isPausedRef.current) return;
      hasScoredCurrentBeatRef.current = false;
      setBeatProgress(0);
    }, beatDurationMs);

    return () => {
      clearInterval(progressTimer);
      clearInterval(resetTimer);
    };
  }, [song.bpm]);

  // Exact Coach Moves vs Player Moves Evaluation (fires on beat pulse)
  useEffect(() => {
    if (isPaused) return;

    if (beatProgress >= 85 && !hasScoredCurrentBeatRef.current) {
      hasScoredCurrentBeatRef.current = true;

      const currentSec = song.durationSeconds - timeRemaining;
      const detections = latestDetectionsRef.current;

      activePlayersRef.current.forEach((player, pIdx) => {
        if (player.isPhoneController) return;

        const person = detections[pIdx];

        if (!person) {
          triggerMoveScore('MISS', 0, pIdx);
          return;
        }

        const assignedCoachIdx = player.assignedCoachIndex ?? coach.coachIndex ?? 0;
        const targetCoachFrame = getCoachFrameForPlayer(assignedCoachIdx, currentSec);

        if (!targetCoachFrame) {
          triggerMoveScore('GOOD', 160, pIdx);
          return;
        }

        const evalRes = yoloTracker.evaluateCoachVsPlayerKeypoints(
          person.keypoints,
          targetCoachFrame.keypoints,
          person.motionVelocity
        );

        setStatusTip(evalRes.statusTip);
        triggerMoveScore(evalRes.feedback, evalRes.scorePoints, pIdx);
      });
    }
  }, [beatProgress, coach.coachIndex, getCoachFrameForPlayer, isPaused, song.durationSeconds, timeRemaining, triggerMoveScore]);

  const handleFinish = () => {
    soundEngine.playStarUnlock();
    onFinishRoutine(activePlayersRef.current);
  };

  // Helper to get feedback color
  const getFeedbackStyle = (feedback: string) => {
    switch (feedback) {
      case 'PERFECT': return { bg: 'from-success-500 to-emerald-500', text: 'text-white', glow: 'shadow-success-glow', icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg> };
      case 'SUPER': return { bg: 'from-accent-500 to-blue-500', text: 'text-white', glow: 'shadow-accent-glow', icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg> };
      case 'GOOD': return { bg: 'from-blue-600 to-indigo-600', text: 'text-white', glow: '', icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg> };
      case 'OK': return { bg: 'from-sun-500 to-sun-600', text: 'text-white', glow: 'shadow-sun-glow', icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /></svg> };
      case 'MISS': return { bg: 'from-error-500 to-error-600', text: 'text-white', glow: '', icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg> };
      default: return { bg: 'from-surface-3', text: 'text-on-surface-variant', glow: '', icon: null };
    }
  };

  // Rank config for player
  const getPlayerRankConfig = (rank: string) => getRankConfig(rank as any);

  return (
    <motion.section
      className="fixed inset-0 z-[400] bg-surface-0 flex flex-col justify-between p-3 md:p-5 overflow-hidden select-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {!customVideoUrl && (
        <audio
          ref={audioRef}
          src={song.audioUrl}
          loop={false}
          onPlay={() => setIsAudioBlocked(false)}
        />
      )}

      {/* Backdrop: Coach Video stretched to fit screen */}
      <motion.div className="absolute inset-0 z-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        {customVideoUrl ? (
          <motion.video
            ref={coachVideoRef}
            src={customVideoUrl}
            playsInline
            className={`w-full h-full ${videoFitMode === 'cover' ? 'object-cover' : 'object-contain'} opacity-95`}
            onPlay={() => setIsAudioBlocked(false)}
            initial={{ scale: 1.05 }}
            animate={{ scale: 1 }}
            transition={{ duration: 10, ease: 'linear' }}
          />
        ) : (
          <>
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1600&auto=format&fit=crop')] bg-cover bg-center opacity-30 mix-blend-color-dodge" />
            <div className="absolute inset-0 bg-gradient-to-t from-surface-0 via-purple-900/50 to-surface-0/85" />
          </>
        )}
      </motion.div>

      {/* Iframe Notice Overlay */}
      <AnimatePresence>
        {inIframe && !dismissIframeBanner && (
          <motion.div
            className="absolute top-4 inset-x-4 z-[500] flex justify-center pointer-events-auto"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card variant="modal" className="max-w-xl w-full p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent-500/20 flex items-center justify-center text-accent-400 shrink-0">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>
                </div>
                <div className="flex-1 text-body-small text-on-surface">
                  <strong className="text-accent-400">Iframe Runtime:</strong> WebAssembly threading is disabled inside iframes. For 60FPS YOLO neural acceleration, open the direct browser link. (Vision Pose Tracking is active).
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={window.location.href}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-accent-500 hover:bg-accent-400 text-white text-label-small font-black rounded-lg"
                  >
                    OPEN DIRECT
                  </a>
                  <Button variant="ghost" size="sm" onClick={() => setDismissIframeBanner(true)}>
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Unmute/Play Audio Banner */}
      <AnimatePresence>
        {isAudioBlocked && (
          <motion.div
            className="absolute top-16 inset-x-4 z-[500] flex justify-center"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Tooltip content="Click to unmute and start the music" position="bottom">
              <Button
                variant="primary"
                size="lg"
                leadingIcon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" /></svg>}
                onClick={() => { soundEngine.playClick(); startAudio(); }}
                className="animate-bounce shadow-brand-glow-lg"
              >
                CLICK TO UNMUTE / PLAY SONG MUSIC
              </Button>
            </Tooltip>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOP BAR: Pause Button & Player Scoring Cards with Kinect HUD */}
      <motion.div
        className="relative z-[300] flex justify-between items-start gap-4 pt-1"
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        {/* Pause Button (Left) */}
        <Tooltip content="Pause (Esc / Space)" position="right">
          <IconButton
            variant="outlined"
            size="md"
            aria-label="Pause"
            onClick={togglePause}
            className="bg-surface-1/90 backdrop-blur"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
          </IconButton>
        </Tooltip>

        {/* Players Scoring Cards with Kinect Mini Silhouette Frame */}
        <motion.div
          className="flex justify-center items-start gap-3 md:gap-5 flex-1 overflow-x-auto scrollbar-hide pb-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          {activePlayers.map((p, idx) => {
            const rankCfg = getPlayerRankConfig(p.rank || 'Bronze');
            const momentumPct = Math.round(p.momentum ?? 0);
            const multiplier = p.multiplier ?? 1;
            const feedbackStyle = getFeedbackStyle(p.lastFeedback);

            return (
              <Tooltip key={p.id || idx} content={`${p.name} - ${p.lastFeedback}`} position="bottom">
                <motion.div
                  className={`flex flex-col items-center space-y-2 transition-all motion-spring ${idx === 0 ? 'scale-105' : 'scale-95'}`}
                  whileHover={{ scale: idx === 0 ? 1.08 : 1.03 }}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * idx }}
                >
                  {/* Kinect Dancer Silhouette Frame - ALWAYS RENDERS if enabled, independent of camera preview */}
                  {showKinectSkeleton && (
                    <motion.div
                      className="relative w-24 h-18 md:w-28 md:h-20 rounded-xl overflow-hidden border-2 border-success-400/70 shadow-success-glow bg-surface-0/80 flex items-center justify-center"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                    >
                      <canvas
                        ref={idx === 0 ? kinectCanvasRef : undefined}
                        width={96}
                        height={72}
                        className="w-full h-full pointer-events-none -scale-x-100"
                      />
                      <span className="absolute top-1 right-1 text-[7px] font-black text-success-300 uppercase tracking-widest opacity-80">KINECT</span>
                    </motion.div>
                  )}

                  {/* Player Name Banner */}
                  <motion.div
                    className="text-label-small md:text-label-medium font-black text-white bg-surface-1/90 backdrop-blur px-3 py-1 rounded-full border border-outline-variant truncate max-w-[120px] shadow-level-1"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    {p.name.split(' ')[0]}
                  </motion.div>

                  {/* ColeDance Prestige Rank Crest */}
                  <motion.div
                    className={`
                      px-3 py-1 rounded-full text-label-small font-black tracking-wider text-black
                      bg-gradient-to-r ${rankCfg.gradient} border border-white/40
                      shadow-level-1 flex items-center gap-1.5
                    `}
                    style={{ boxShadow: `0 0 15px ${rankCfg.badgeColor}` }}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 17 }}
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                    <span>{rankCfg.rank.toUpperCase()}</span>
                  </motion.div>

                  {/* Dynamic Momentum Gauge Bar */}
                  <motion.div className="w-28 md:w-32 flex flex-col items-center space-y-1.5" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                    <div className="w-full flex justify-between items-center text-[10px] font-black text-on-surface-variant px-1">
                      <span className="text-accent-400">MOMENTUM</span>
                      <span className="text-sun-400 font-extrabold tabular-nums">{momentumPct}%</span>
                    </div>
                    <div className="w-full h-2 bg-surface-3 rounded-full border border-outline-variant overflow-hidden relative p-[1px]">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-accent-400 via-brand-500 to-sun-400"
                        initial={{ width: 0 }}
                        animate={{ width: `${momentumPct}%` }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      />
                    </div>
                  </motion.div>

                  {/* Multiplier Pill & Streak */}
                  <motion.div className="flex items-center space-x-2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                    <motion.div
                      className={`
                        px-3 py-1 rounded-full text-[10px] md:text-label-small font-black tracking-wider
                        transition-all motion-spring
                        ${multiplier >= 4
                          ? 'bg-gradient-to-r from-error-500 via-brand-500 to-sun-400 text-white animate-pulse shadow-brand-glow-lg'
                          : multiplier === 3
                          ? 'bg-gradient-to-r from-sun-500 to-orange-500 text-black font-extrabold shadow-sun-glow'
                          : multiplier === 2
                          ? 'bg-gradient-to-r from-accent-400 to-blue-500 text-black shadow-accent-glow'
                          : 'bg-surface-3 text-on-surface-variant'
                        }
                      `}
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 17 }}
                      whileHover={{ scale: 1.1 }}
                    >
                      {multiplier >= 4 ? 'x4 OVERDRIVE' : `x${multiplier}`}
                    </motion.div>
                    {(p.streak ?? 0) > 2 && (
                      <motion.span
                        className="text-label-small font-black text-sun-400 tracking-tight flex items-center gap-1"
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 17 }}
                      >
                        <span className="tabular-nums">{p.streak}</span>
                        <svg className="w-4 h-4 text-sun-400 animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" /></svg>
                      </motion.span>
                    )}
                  </motion.div>

                  {/* Stars Meter */}
                  <motion.div className="flex text-sun-400 text-label-medium space-x-1" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    {Array.from({ length: Math.min(5, p.stars) }).map((_, i) => (
                      <motion.span
                        key={i}
                        className="fa-solid fa-star drop-shadow-[0_0_6px_rgba(245,158,11,0.9)]"
                        initial={{ opacity: 0, scale: 0, rotate: -90 }}
                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 17, delay: 0.05 * i }}
                      >
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                      </motion.span>
                    ))}
                    {p.stars >= 6 && (
                      <motion.span
                        className="text-[10px] font-black bg-gradient-to-r from-sun-400 to-brand-500 text-black px-2 py-1 rounded shadow-level-1"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                      >
                        {p.stars === 7 ? 'MEGASTAR' : 'SUPERSTAR'}
                      </motion.span>
                    )}
                  </motion.div>

                  {/* Last Move Feedback Badge */}
                  <motion.div
                    className={`
                      text-label-small md:text-label-medium font-black uppercase tracking-wider px-4 py-1.5 rounded-lg shadow-level-2 transition-all motion-spring
                      ${p.lastFeedback === 'PERFECT'
                        ? 'bg-gradient-to-r from-success-500 to-emerald-500 text-white shadow-success-glow scale-110 font-extrabold'
                        : p.lastFeedback === 'SUPER'
                        ? 'bg-gradient-to-r from-accent-500 to-blue-500 text-white shadow-accent-glow scale-105'
                        : p.lastFeedback === 'GOOD'
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                        : p.lastFeedback === 'OK'
                        ? 'bg-gradient-to-r from-sun-500 to-sun-600 text-white shadow-sun-glow'
                        : 'bg-gradient-to-r from-error-500 to-error-600 text-white animate-pulse'
                      }
                    `}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {p.lastFeedback === 'MISS' ? (
                      <span className="font-black text-white/90 flex items-center gap-1">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                        <span>MISS</span>
                      </span>
                    ) : (
                      p.lastFeedback
                    )}
                  </motion.div>

                  {/* Score Number */}
                  <motion.div
                    className="text-label-large md:text-title-small font-black tracking-wider text-sun-400 drop-shadow tabular-nums"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    {p.score.toLocaleString()}
                  </motion.div>
                </motion.div>
              </Tooltip>
            );
          })}
        </motion.div>

        {/* Quick Camera & Skeleton Visibility Toggles (Right) */}
        <motion.div
          className="flex items-center space-x-2"
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Tooltip content="Toggle Live Camera Preview Box" position="left">
            <IconButton
              variant={showWebcamPreview ? 'secondary' : 'ghost'}
              size="sm"
              aria-label="Toggle Live Camera Preview Box"
              onClick={() => setShowWebcamPreview((v) => !v)}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
                { !showWebcamPreview && <line x1="3" y1="3" x2="21" y2="21" /> }
              </svg>
            </IconButton>
          </Tooltip>
          <Tooltip content="Toggle Kinect Skeleton HUD" position="left">
            <IconButton
              variant={showKinectSkeleton ? 'success' : 'ghost'}
              size="sm"
              aria-label="Toggle Kinect Skeleton HUD"
              onClick={() => setShowKinectSkeleton((v) => !v)}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </IconButton>
          </Tooltip>
        </motion.div>
      </motion.div>

      {/* CENTER STAGE: Huge Celebration Animations */}
      <motion.div
        className="relative z-[100] flex-1 flex justify-center items-center pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {/* Big Move Feedback Burst */}
        <AnimatePresence>
          {currentFeedbackAnim.text && (
            <motion.div
              key={currentFeedbackAnim.key}
              className="absolute z-[200] flex flex-col items-center justify-center"
              initial={{ opacity: 0, scale: 0.5, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.2, y: -50 }}
              transition={{ type: 'spring', stiffness: 500, damping: 17 }}
            >
              {currentFeedbackAnim.text === 'PERFECT' && (
                <motion.div className="flex flex-col items-center">
                  <motion.div
                    className="text-5xl md:text-8xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-sun-300 via-success-300 to-sun-200 drop-shadow-[0_0_40px_rgba(34,197,94,0.9)]"
                    initial={{ opacity: 0, scale: 0.3 }}
                    animate={{ opacity: 1, scale: [1, 1.1, 1] }}
                    transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                  >
                    PERFECT!
                  </motion.div>
                  <motion.div
                    className="flex space-x-2 text-sun-300 text-xl md:text-3xl mt-2 drop-shadow-[0_0_20px_#f59e0b]"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    {[1,2,3].map(i => (
                      <motion.svg key={i} className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor" initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 10, delay: 0.1 * i }}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></motion.svg>
                    ))}
                  </motion.div>
                </motion.div>
              )}

              {currentFeedbackAnim.text === 'SUPER' && (
                <motion.div
                  className="text-4xl md:text-7xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-accent-300 via-blue-400 to-indigo-200 drop-shadow-[0_0_35px_rgba(14,165,233,0.9)]"
                  initial={{ opacity: 0, scale: 0.3 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                >
                  SUPER!
                </motion.div>
              )}

              {currentFeedbackAnim.text === 'GOOD' && (
                <motion.div
                  className="flex items-center space-x-3 bg-blue-600/90 text-white px-8 py-3 rounded-2xl border-2 border-sun-300 shadow-[0_0_30px_rgba(59,130,246,0.8)]"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 17 }}
                >
                  <svg className="w-8 h-8 text-sun-300" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                  <span className="text-3xl md:text-5xl font-black italic tracking-wider">GOOD</span>
                </motion.div>
              )}

              {currentFeedbackAnim.text === 'MISS' && (
                <motion.div
                  className="flex items-center justify-center w-24 h-24 md:w-32 md:h-32 rounded-2xl bg-error-600/90 border-4 border-error-400 shadow-[0_0_50px_rgba(239,68,68,0.95)]"
                  initial={{ opacity: 0, scale: 0.5, rotate: -12 }}
                  animate={{ 
                    opacity: 1, 
                    scale: [1, 1.15, 1], 
                    rotate: [0, -5, 5, 0] 
                  }}
                  transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                >
                  <svg className="w-12 h-12 md:w-16 md:h-16 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Milestone Celebration Banner */}
        <AnimatePresence>
          {milestoneCelebration && (
            <motion.div
              className="absolute z-[300] inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="text-6xl md:text-9xl font-black italic tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-brand-400 via-sun-300 to-accent-300 drop-shadow-[0_0_60px_rgba(217,30,109,0.9)]"
                initial={{ opacity: 0, scale: 0.3, y: 50 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 15 }}
              >
                {milestoneCelebration}!
              </motion.div>
              <motion.div
                className="text-body-medium md:text-lg font-extrabold text-white mt-4 tracking-widest uppercase"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                {milestoneCelebration === 'MEGASTAR' ? '★ 7 STARS REACHED! MASTER DANCER! ★' : '★ 6 STARS UNLOCKED! INCREDIBLE! ★'}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Optional Live Camera Preview Box - Only shows preview, tracking continues in background */}
        {showWebcamPreview && cameraActive && (
          <motion.div
            className="absolute top-4 left-4 z-[150] w-56 h-36 md:w-72 md:h-48 rounded-2xl overflow-hidden border-2 border-accent-400/80 shadow-level-4 bg-surface-0/90 pointer-events-auto"
            initial={{ opacity: 0, scale: 0.8, x: -50, y: -50 }}
            animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          >
            <video
              ref={trackingVideoRef}
              playsInline
              muted
              className="w-full h-full object-cover -scale-x-100"
            />
            <canvas
              ref={trackingCanvasRef}
              width={280}
              height={180}
              className="absolute inset-0 w-full h-full -scale-x-100 pointer-events-none"
            />

            <div className="absolute top-2 left-2 bg-surface-0/80 text-[10px] font-bold px-2 py-1 rounded text-accent-300 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-success-400 animate-ping"></span>
              <span>YOLO TRACKER</span>
            </div>

            <Tooltip content="Hide Camera Preview (Tracking Continues)" position="bottom">
              <IconButton
                variant="ghost"
                size="xs"
                aria-label="Hide Camera Preview"
                onClick={() => setShowWebcamPreview(false)}
                className="absolute top-2 right-2"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </IconButton>
            </Tooltip>

            <motion.div
              className="absolute bottom-2 left-2 right-2 bg-surface-0/90 backdrop-blur text-[10px] font-semibold text-sun-400 px-3 py-1.5 rounded border border-outline-variant truncate text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {statusTip}
            </motion.div>
          </motion.div>
        )}

        {/* Camera Error Banner */}
        {cameraError && !cameraActive && (
          <motion.div
            className="absolute top-4 left-1/2 -translate-x-1/2 z-[150] max-w-md px-4 py-3 rounded-2xl bg-error-500/20 border border-error-500/50 shadow-level-3 text-center"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center justify-center gap-2 text-error-400">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
              <span className="text-body-small font-semibold">{cameraError}</span>
            </div>
            <div className="text-body-small text-on-surface-variant mt-1">Tracking disabled. Use phone controller or keyboard.</div>
          </motion.div>
        )}

        {/* Default animated coach avatar if no custom video is playing */}
        {!customVideoUrl && (
          <motion.div
            className="relative flex items-center justify-center"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
          >
            <motion.div
              className="absolute w-96 h-96 rounded-full bg-brand-500/20 blur-3xl"
              initial={{ scale: 0.8 }}
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            />
            <Avatar
              src={`https://api.dicebear.com/7.x/big-smile/svg?seed=${coach.avatarSeed}`}
              alt={coach.name}
              name={coach.name}
              size="4xl"
              border
              borderColor="brand"
              className="drop-shadow-[0_0_50px_rgba(217,30,109,0.8)]"
            />
          </motion.div>
        )}
      </motion.div>

      {/* BOTTOM BAR: Exit & Song Status */}
      <motion.div
        className="relative z-[200] flex justify-between items-center space-x-4"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Tooltip content="Exit Routine" position="top">
          <Button
            variant="danger"
            size="sm"
            leadingIcon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>}
            onClick={() => { soundEngine.playClick(); onExit(); }}
          >
            Exit Routine
          </Button>
        </Tooltip>

        <motion.div
          className="flex flex-col items-center bg-surface-1/80 backdrop-blur-xl px-5 py-2 rounded-2xl border border-outline-variant shadow-level-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="text-label-medium font-black italic text-white truncate max-w-xs">
            {song.title} — {coach.name}
          </div>
          <div className="text-label-small text-accent-400 font-bold">
            {timeRemaining}s remaining • Exact Coach Movements Mode
          </div>
        </motion.div>

        <div className="w-28" />
      </motion.div>

      {/* PAUSE MENU OVERLAY */}
      <AnimatePresence>
        {isPaused && showPauseMenu && (
          <motion.div
            className="fixed inset-0 z-[500] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => { soundEngine.playClick(); togglePause(); }}
          >
            <motion.div className="absolute inset-0 bg-black/85 backdrop-blur-md" />
            <motion.div
              className="relative max-w-md w-full bg-surface-3/95 backdrop-blur-xl border-2 border-brand-500/80 rounded-3xl p-6 shadow-level-4 space-y-6 text-white"
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            >
              <div className="text-center space-y-2">
                <h2 className="text-headline-large font-black italic tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-accent-300">
                  COLEDANCE PAUSED
                </h2>
                <p className="text-body-small text-on-surface-variant">
                  {song.title} • {coach.name}
                </p>
              </div>

              {/* Main Action Buttons */}
              <div className="space-y-3">
                <Tooltip content="Resume Dancing" position="right">
                  <Button
                    variant="primary"
                    size="lg"
                    fullWidth
                    leadingIcon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="5 3 19 12 5 21 5 3" /></svg>}
                    onClick={() => { soundEngine.playClick(); togglePause(); }}
                    className="shadow-brand-glow hover:shadow-brand-glow-lg"
                  >
                    RESUME DANCING
                  </Button>
                </Tooltip>

                <Tooltip content="Restart Routine" position="right">
                  <Button
                    variant="outlined"
                    size="md"
                    fullWidth
                    leadingIcon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6" /><path d="M1 20v-6h6" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>}
                    onClick={handleRestart}
                  >
                    RESTART ROUTINE
                  </Button>
                </Tooltip>
              </div>

              {/* Settings Options */}
              <div className="space-y-4 pt-2 border-t border-outline-variant text-body-small">
                <div className="font-black text-brand-400 tracking-wider uppercase text-label-small">
                  ROUTINE DISPLAY & AUDIO SETTINGS
                </div>

                {/* Toggle Kinect Skeleton */}
                <div className="flex items-center justify-between">
                  <span className="text-body-medium text-on-surface">Kinect Mini Skeleton HUD</span>
                  <Switch
                    checked={showKinectSkeleton}
                    onChange={(v) => setShowKinectSkeleton(v)}
                    size="md"
                  />
                </div>

                {/* Toggle Live Camera Preview Box */}
                <div className="flex items-center justify-between">
                  <span className="text-body-medium text-on-surface">Live Camera Preview Box</span>
                  <Switch
                    checked={showWebcamPreview}
                    onChange={(v) => setShowWebcamPreview(v)}
                    size="md"
                  />
                </div>

                {/* Video Stretch Mode */}
                <div className="flex items-center justify-between">
                  <span className="text-body-medium text-on-surface">Video Screen Stretch</span>
                  <Tooltip content={videoFitMode === 'cover' ? 'Fill Screen (Cover)' : 'Aspect Fit (Contain)'} position="left">
                    <Button
                      variant="outlined"
                      size="sm"
                      onClick={() => setVideoFitMode((m) => (m === 'cover' ? 'contain' : 'cover'))}
                    >
                      {videoFitMode === 'cover' ? 'FILL SCREEN' : 'ASPECT FIT'}
                    </Button>
                  </Tooltip>
                </div>

                {/* Volume Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between text-label-small text-on-surface-variant">
                    <span>Music Volume</span>
                    <span className="font-bold text-brand-400 tabular-nums">{Math.round(musicVolume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={musicVolume}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setMusicVolume(val);
                      if (audioRef.current) audioRef.current.volume = val;
                      if (coachVideoRef.current) coachVideoRef.current.volume = val;
                    }}
                    className="w-full accent-brand-500 cursor-pointer h-2"
                  />
                </div>
              </div>

              {/* Quit Button */}
              <div className="pt-2 border-t border-outline-variant">
                <Tooltip content="Quit to Song Selection" position="top">
                  <Button
                    variant="danger"
                    size="md"
                    fullWidth
                    leadingIcon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>}
                    onClick={() => { soundEngine.playClick(); onExit(); }}
                  >
                    QUIT TO SONG SELECTION
                  </Button>
                </Tooltip>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
};

export default GameplayScreen;