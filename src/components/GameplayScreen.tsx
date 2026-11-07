import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Song, Coach, Player, YoloPersonDetection, YoloCoachFrame } from '../types/game';
import { soundEngine } from '../services/soundEffects';
import { yoloTracker, isRunningInIframe } from '../services/yoloPoseTracker';
import { socketService } from '../services/socketService';
import { menuMusic } from '../services/menuMusicService';
import { getVideoBlob } from '../services/indexedDBStorage';
import { calculateMomentumMoveScore, getRankConfig, COLEDANCE_RANKS } from '../services/momentumScoring';
import confetti from 'canvas-confetti';

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
  const [showWebcam, setShowWebcam] = useState<boolean>(true);
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

  // Big feedback animations state for player 1
  const [currentFeedbackAnim, setCurrentFeedbackAnim] = useState<{
    text: 'PERFECT' | 'SUPER' | 'GOOD' | 'OK' | 'MISS' | null;
    key: number;
  }>({ text: null, key: 0 });

  const [milestoneCelebration, setMilestoneCelebration] = useState<
    'SUPERSTAR' | 'MEGASTAR' | 'LEGENDARY DANCER' | 'DIAMOND DANCER' | null
  >(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
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

        // Sound cues for momentum multiplier increases
        if (result.multiplierUpgraded) {
          soundEngine.playMultiplierUpgrade(result.newMultiplier);
        }

        // Sound cues for rank promotions
        if (result.rankPromoted) {
          soundEngine.playRankPromoted(result.newRank);
        }

        // Diamond & Legend milestone celebrations (burst once per routine)
        if (result.newRank === 'Legend' && !hasCelebratedMegastarRef.current) {
          hasCelebratedMegastarRef.current = true;
          setMilestoneCelebration('LEGENDARY DANCER');
          soundEngine.playMegastarFanfare();
          try {
            confetti({
              particleCount: 80,
              spread: 110,
              origin: { y: 0.6 },
              colors: ['#ff1493', '#ffea00', '#00ff88', '#00d2ff'],
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
              colors: ['#00d2ff', '#b388ff', '#ffffff'],
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
      } else {
        resumeMedia();
      }
      return next;
    });
  }, [pauseMedia, resumeMedia]);

  const handleRestart = () => {
    soundEngine.playClick();
    setIsPaused(false);
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

  // Audio start & YOLO camera tracking initialization
  useEffect(() => {
    startAudio();

    if (hasCamera && videoRef.current && canvasRef.current) {
      yoloTracker.initialize(videoRef.current, canvasRef.current).then(() => {
        yoloTracker.startCamera().then((ok) => setCameraActive(ok));
      });

      yoloTracker.setShowYoloDebugOverlay(true);

      // Multi-person detections callback updates tracking references and status
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
    } else if (!hasCamera) {
      setCameraActive(false);
      setStatusTip('Groove to the rhythm with your Phone Controller or Keyboard arrow keys!');
    }

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
      yoloTracker.stopCamera();
      if (audioRef.current) audioRef.current.pause();
      if (coachVideoRef.current) coachVideoRef.current.pause();
    };
  }, [customVideoUrl, startAudio, triggerMoveScore]);

  // Continuous Kinect Mini Skeleton Rendering (Screenshot_20261031-035647.png)
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

  return (
    <section className="fixed inset-0 z-50 bg-[#070314] flex flex-col justify-between p-3 md:p-5 overflow-hidden select-none">
      {!customVideoUrl && (
        <audio
          ref={audioRef}
          src={song.audioUrl}
          loop={false}
          onPlay={() => setIsAudioBlocked(false)}
        />
      )}

      {/* Backdrop: Coach Video stretched to fit screen matching UI upgrade 4 */}
      {customVideoUrl ? (
        <video
          ref={coachVideoRef}
          src={customVideoUrl}
          playsInline
          className={`absolute inset-0 w-full h-full ${
            videoFitMode === 'cover' ? 'object-cover' : 'object-contain'
          } opacity-95 transition-all duration-300`}
          onPlay={() => setIsAudioBlocked(false)}
        />
      ) : (
        <>
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1600&auto=format&fit=crop')] bg-cover bg-center opacity-30 mix-blend-color-dodge"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-black via-purple-950/70 to-black/85"></div>
        </>
      )}

      {/* Iframe Notice Overlay if running inside an iframe */}
      {inIframe && !dismissIframeBanner && (
        <div className="absolute top-2 inset-x-4 z-50 flex justify-center pointer-events-auto">
          <div className="max-w-xl bg-black/80 backdrop-blur-md border border-cyan-400/60 rounded-xl px-4 py-2 text-xs text-white flex items-center justify-between space-x-3 shadow-[0_0_20px_rgba(0,210,255,0.4)]">
            <div className="flex items-center space-x-2">
              <i className="fa-solid fa-circle-info text-cyan-400 text-sm"></i>
              <span>
                <strong className="text-cyan-300">Iframe Runtime:</strong> WebAssembly threading is disabled inside iframes. For 60FPS YOLO neural acceleration, open the direct browser link. (Vision Pose Tracking is active).
              </span>
            </div>
            <div className="flex items-center space-x-2 shrink-0">
              <a
                href={window.location.href}
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1 bg-cyan-500 hover:bg-cyan-400 text-black font-black text-[10px] rounded cursor-pointer"
              >
                OPEN DIRECT
              </a>
              <button
                onClick={() => setDismissIframeBanner(true)}
                className="text-white/60 hover:text-white text-xs px-1"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unmute/Play Audio Banner if browser autoplay was blocked */}
      {isAudioBlocked && (
        <div className="absolute top-12 inset-x-0 z-50 flex justify-center">
          <button
            onClick={() => {
              soundEngine.playClick();
              startAudio();
            }}
            className="px-5 py-2.5 bg-gradient-to-r from-pink-500 to-yellow-400 text-black font-black text-xs rounded-full shadow-[0_0_25px_rgba(255,20,147,0.8)] border border-white flex items-center space-x-2 animate-bounce cursor-pointer"
          >
            <i className="fa-solid fa-volume-high text-base"></i>
            <span>CLICK TO UNMUTE / PLAY SONG MUSIC</span>
          </button>
        </div>
      )}

      {/* TOP BAR: Pause Button & Player Scoring Cards with Kinect HUD */}
      <div className="relative z-20 flex justify-between items-start gap-3 pt-1">
        {/* Pause Button (Left) */}
        <button
          onClick={togglePause}
          className="px-3.5 py-2 bg-black/70 hover:bg-pink-600/90 text-white rounded-xl border border-white/20 text-xs font-black shadow-lg cursor-pointer transition flex items-center space-x-1.5 backdrop-blur-md"
          title="Pause (Esc / Space)"
        >
          <i className="fa-solid fa-pause text-pink-400"></i>
          <span className="hidden sm:inline">PAUSE</span>
        </button>

        {/* Players Scoring Cards with Kinect Mini Silhouette Frame matching Screenshot_20261031-035647.png */}
        <div className="flex justify-center items-start gap-3 md:gap-5 flex-1">
          {activePlayers.map((p, idx) => {
            const rankCfg = getRankConfig(p.rank || 'Bronze');
            const momentumPct = Math.round(p.momentum ?? 0);
            const multiplier = p.multiplier ?? 1;

            return (
              <div
                key={p.id || idx}
                className={`flex flex-col items-center space-y-1.5 transition transform duration-150 ${
                  idx === 0 ? 'scale-105' : 'scale-95'
                }`}
              >
                {/* Kinect Dancer Silhouette Frame (Matches JD Kinect HUD from user screenshot) */}
                {showKinectSkeleton && (
                  <div className="relative w-20 h-14 md:w-24 md:h-16 rounded-lg overflow-hidden border border-emerald-400/70 shadow-[0_0_12px_rgba(16,185,129,0.35)] bg-black/75 flex items-center justify-center">
                    <canvas
                      ref={idx === 0 ? kinectCanvasRef : undefined}
                      width={96}
                      height={64}
                      className="w-full h-full pointer-events-none transform -scale-x-100"
                    />
                    <span className="absolute top-0.5 right-1 text-[7px] font-black text-emerald-300 uppercase tracking-widest opacity-80">
                      KINECT
                    </span>
                  </div>
                )}

                {/* Player Name Banner */}
                <div className="text-[10px] md:text-xs font-black text-white bg-black/80 px-2.5 py-0.5 rounded-full border border-white/20 truncate max-w-[100px] shadow">
                  {p.name.split(' ')[0]}
                </div>

                {/* ColeDance Prestige Rank Crest */}
                <div
                  className={`px-2 py-0.5 rounded-full text-[8px] md:text-[9px] font-black tracking-wider text-black bg-gradient-to-r ${rankCfg.gradient} border border-white/40 shadow-sm flex items-center space-x-1`}
                  style={{ boxShadow: `0 0 10px ${rankCfg.badgeColor}` }}
                >
                  <i className="fa-solid fa-crown text-[7px]"></i>
                  <span>{rankCfg.name.toUpperCase()}</span>
                </div>

                {/* Dynamic Momentum Gauge Bar */}
                <div className="w-24 md:w-28 flex flex-col items-center space-y-0.5">
                  <div className="w-full flex justify-between items-center text-[7px] font-black text-white/70 px-0.5">
                    <span className="text-cyan-400">MOMENTUM</span>
                    <span className="text-yellow-300 font-extrabold">{momentumPct}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-black/60 rounded-full border border-white/20 overflow-hidden relative p-[1px]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-pink-500 to-yellow-300 transition-all duration-200"
                      style={{ width: `${momentumPct}%` }}
                    />
                  </div>
                </div>

                {/* Multiplier Pill & Streak */}
                <div className="flex items-center space-x-1.5">
                  <div
                    className={`px-2 py-0.2 rounded text-[8px] md:text-[9px] font-black tracking-wider transition-transform ${
                      multiplier >= 4
                        ? 'bg-gradient-to-r from-pink-500 via-red-500 to-yellow-400 text-white animate-pulse shadow-[0_0_12px_#ff1493]'
                        : multiplier === 3
                        ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-black font-extrabold shadow-[0_0_8px_#f59e0b]'
                        : multiplier === 2
                        ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-black shadow-[0_0_6px_#00d2ff]'
                        : 'bg-white/10 text-white/70'
                    }`}
                  >
                    {multiplier >= 4 ? 'x4 OVERDRIVE' : `x${multiplier}`}
                  </div>
                  {(p.streak ?? 0) > 2 && (
                    <span className="text-[8px] font-black text-yellow-300 tracking-tight flex items-center">
                      <span>{p.streak}</span>
                      <i className="fa-solid fa-fire text-amber-400 ml-0.5 text-[7px]"></i>
                    </span>
                  )}
                </div>

                {/* Stars Meter */}
                <div className="flex text-yellow-300 text-[9px] md:text-[11px] space-x-0.5">
                  {Array.from({ length: Math.min(5, p.stars) }).map((_, i) => (
                    <i key={i} className="fa-solid fa-star drop-shadow-[0_0_6px_rgba(255,234,0,0.9)]"></i>
                  ))}
                  {p.stars >= 6 && (
                    <span className="text-[8px] font-black bg-gradient-to-r from-yellow-300 to-pink-500 text-black px-1.5 py-0.2 rounded shadow">
                      {p.stars === 7 ? 'MEGASTAR' : 'SUPERSTAR'}
                    </span>
                  )}
                </div>

                {/* Last Move Feedback Badge */}
                <div
                  className={`text-xs md:text-sm font-black uppercase tracking-wider px-3 py-0.5 rounded-md shadow-lg transition-all duration-100 ${
                    p.lastFeedback === 'PERFECT'
                      ? 'bg-gradient-to-r from-emerald-400 to-emerald-500 text-black shadow-[0_0_20px_#10b981] scale-110 font-extrabold'
                      : p.lastFeedback === 'SUPER'
                      ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-black shadow-[0_0_15px_#00d2ff] scale-105'
                      : p.lastFeedback === 'GOOD'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow'
                      : p.lastFeedback === 'OK'
                      ? 'bg-amber-600 text-white'
                      : 'bg-red-600 text-white animate-pulse'
                  }`}
                >
                  {p.lastFeedback === 'MISS' ? (
                    <span className="font-black text-red-100 flex items-center space-x-1">
                      <i className="fa-solid fa-xmark text-red-200"></i>
                      <span>MISS</span>
                    </span>
                  ) : (
                    p.lastFeedback
                  )}
                </div>

                {/* Score Number */}
                <div className="text-[11px] md:text-xs font-black tracking-wider text-yellow-300 drop-shadow">
                  {p.score.toLocaleString()}
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Camera & Skeleton Visibility Toggles (Right) */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowWebcam((v) => !v)}
            className={`p-2 rounded-xl text-xs font-black border transition cursor-pointer backdrop-blur-md shadow ${
              showWebcam
                ? 'bg-black/70 text-cyan-400 border-cyan-400/50'
                : 'bg-black/40 text-white/40 border-white/10'
            }`}
            title="Toggle Live Camera Box"
          >
            <i className={`fa-solid ${showWebcam ? 'fa-video' : 'fa-video-slash'}`}></i>
          </button>
          <button
            onClick={() => setShowKinectSkeleton((v) => !v)}
            className={`p-2 rounded-xl text-xs font-black border transition cursor-pointer backdrop-blur-md shadow ${
              showKinectSkeleton
                ? 'bg-black/70 text-emerald-400 border-emerald-400/50'
                : 'bg-black/40 text-white/40 border-white/10'
            }`}
            title="Toggle Kinect Skeleton HUD"
          >
            <i className="fa-solid fa-person-walking"></i>
          </button>
        </div>
      </div>

      {/* CENTER STAGE: Huge Celebration Animations (PERFECT, SUPER, GOOD, X, SUPERSTAR, MEGASTAR) */}
      <div className="relative z-10 flex-1 flex justify-center items-center pointer-events-none">
        {/* Big Move Feedback Burst (PERFECT / SUPER / GOOD / X) */}
        {currentFeedbackAnim.text && (
          <div
            key={currentFeedbackAnim.key}
            className="absolute z-40 flex flex-col items-center justify-center animate-[ping_0.5s_cubic-bezier(0,0,0.2,1)_1]"
          >
            {currentFeedbackAnim.text === 'PERFECT' && (
              <div className="flex flex-col items-center">
                <div className="text-4xl md:text-7xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-emerald-300 to-yellow-200 drop-shadow-[0_0_35px_rgba(16,185,129,0.9)] animate-pulse">
                  PERFECT!
                </div>
                <div className="flex space-x-2 text-yellow-300 text-lg md:text-2xl mt-1 drop-shadow-[0_0_15px_#ffea00]">
                  <i className="fa-solid fa-star"></i>
                  <i className="fa-solid fa-star"></i>
                  <i className="fa-solid fa-star"></i>
                </div>
              </div>
            )}

            {currentFeedbackAnim.text === 'SUPER' && (
              <div className="text-3xl md:text-6xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-blue-400 to-indigo-200 drop-shadow-[0_0_30px_rgba(0,210,255,0.9)]">
                SUPER!
              </div>
            )}

            {currentFeedbackAnim.text === 'GOOD' && (
              <div className="flex items-center space-x-2 bg-blue-600/90 text-white px-6 py-2 rounded-2xl border-2 border-yellow-300 shadow-[0_0_25px_rgba(59,130,246,0.8)]">
                <i className="fa-solid fa-star text-yellow-300 text-2xl"></i>
                <span className="text-2xl md:text-4xl font-black italic tracking-wider">GOOD</span>
              </div>
            )}

            {currentFeedbackAnim.text === 'MISS' && (
              <div className="flex items-center justify-center w-20 h-20 md:w-28 md:h-28 rounded-2xl bg-red-600/90 border-4 border-red-400 shadow-[0_0_40px_rgba(239,68,68,0.95)] animate-bounce">
                <i className="fa-solid fa-xmark text-white text-5xl md:text-7xl font-black"></i>
              </div>
            )}
          </div>
        )}

        {/* Milestone Celebration Banner (SUPERSTAR / MEGASTAR) */}
        {milestoneCelebration && (
          <div className="absolute z-50 inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm animate-pulse">
            <div className="text-5xl md:text-8xl font-black italic tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-yellow-300 to-cyan-300 drop-shadow-[0_0_50px_rgba(255,20,147,0.9)]">
              {milestoneCelebration}!
            </div>
            <div className="text-sm md:text-base font-extrabold text-white mt-2 tracking-widest uppercase">
              {milestoneCelebration === 'MEGASTAR' ? '★ 7 STARS REACHED! MASTER DANCER! ★' : '★ 6 STARS UNLOCKED! INCREDIBLE! ★'}
            </div>
          </div>
        )}

        {/* Optional Live Camera Box (Can be hidden via toggle button or pause menu) */}
        {showWebcam && (
          <div className="absolute top-2 left-2 z-30 w-48 h-32 md:w-60 md:h-40 rounded-2xl overflow-hidden border-2 border-cyan-400/80 shadow-2xl bg-black/90 pointer-events-auto">
            <video
              ref={videoRef}
              playsInline
              muted
              className="w-full h-full object-cover transform -scale-x-100"
            />
            <canvas
              ref={canvasRef}
              width={240}
              height={160}
              className="absolute inset-0 w-full h-full transform -scale-x-100 pointer-events-none"
            />

            <div className="absolute top-1.5 left-1.5 bg-black/80 text-[8px] font-bold px-1.5 py-0.5 rounded text-cyan-300 flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              <span>YOLO TRACKER</span>
            </div>

            <button
              onClick={() => setShowWebcam(false)}
              className="absolute top-1.5 right-1.5 bg-black/70 hover:bg-red-600 text-white/70 hover:text-white rounded-full w-4 h-4 flex items-center justify-center text-[9px] cursor-pointer"
              title="Hide Camera Box"
            >
              ✕
            </button>

            <div className="absolute bottom-1 left-1 right-1 bg-black/85 backdrop-blur-sm text-[8px] font-semibold text-yellow-300 px-2 py-0.5 rounded border border-white/10 truncate text-center">
              {statusTip}
            </div>
          </div>
        )}

        {/* Default animated coach avatar if no custom video is playing */}
        {!customVideoUrl && (
          <div className="relative flex items-center justify-center">
            <div className="absolute w-80 h-80 rounded-full bg-pink-500/30 blur-3xl animate-pulse"></div>
            <img
              src={`https://api.dicebear.com/7.x/big-smile/svg?seed=${coach.avatarSeed}`}
              alt={coach.name}
              className="h-72 md:h-96 object-contain drop-shadow-[0_0_40px_rgba(255,20,147,0.8)] transition-all duration-300 transform scale-105 animate-pulse"
            />
          </div>
        )}
      </div>

      {/* BOTTOM BAR: Exit & Song Status (Bottom-right box removed per UI upgrade 3) */}
      <div className="relative z-20 flex justify-between items-center space-x-4">
        <button
          onClick={() => {
            soundEngine.playClick();
            onExit();
          }}
          className="px-4 py-2.5 bg-red-600/90 hover:bg-red-600 text-white text-xs font-black rounded-full border border-white/20 shadow-xl cursor-pointer flex items-center space-x-1.5 transition"
        >
          <i className="fa-solid fa-xmark"></i>
          <span>Exit Routine</span>
        </button>

        <div className="flex flex-col items-center bg-black/70 px-4 py-1.5 rounded-2xl border border-white/15 shadow backdrop-blur-sm">
          <div className="text-xs font-black italic text-white truncate max-w-xs">
            {song.title} — {coach.name}
          </div>
          <div className="text-[10px] text-cyan-300 font-bold">
            {timeRemaining}s remaining • Exact Coach Movements Mode
          </div>
        </div>

        <div className="w-24"></div>
      </div>

      {/* ColeDance PAUSE MENU OVERLAY (UI Upgrade 6) */}
      {isPaused && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#130b33]/95 border-2 border-pink-500/80 rounded-3xl p-6 shadow-[0_0_40px_rgba(255,20,147,0.5)] space-y-5 text-white">
            <div className="text-center space-y-1">
              <h2 className="text-3xl font-black italic tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-cyan-300">
                COLEDANCE PAUSED
              </h2>
              <p className="text-xs text-white/60">
                {song.title} • {coach.name}
              </p>
            </div>

            {/* Main Action Buttons */}
            <div className="space-y-2.5">
              <button
                onClick={togglePause}
                className="w-full py-3 bg-gradient-to-r from-pink-500 to-rose-600 hover:scale-[1.02] text-white text-sm font-black italic rounded-2xl shadow-[0_0_20px_rgba(255,20,147,0.6)] cursor-pointer transition flex items-center justify-center space-x-2"
              >
                <i className="fa-solid fa-play"></i>
                <span>RESUME DANCING</span>
              </button>

              <button
                onClick={handleRestart}
                className="w-full py-2.5 bg-indigo-900/80 hover:bg-indigo-800 text-white text-xs font-black rounded-2xl border border-white/15 cursor-pointer transition flex items-center justify-center space-x-2"
              >
                <i className="fa-solid fa-rotate-left"></i>
                <span>RESTART ROUTINE</span>
              </button>
            </div>

            {/* Settings Options */}
            <div className="space-y-3 pt-2 border-t border-white/10 text-xs">
              <div className="font-black text-pink-400 tracking-wider uppercase text-[10px]">
                ROUTINE DISPLAY & AUDIO SETTINGS
              </div>

              {/* Toggle Kinect Skeleton */}
              <div className="flex items-center justify-between">
                <span>Kinect Mini Skeleton HUD</span>
                <button
                  onClick={() => setShowKinectSkeleton((v) => !v)}
                  className={`px-3 py-1 rounded-lg text-[10px] font-black cursor-pointer ${
                    showKinectSkeleton ? 'bg-emerald-500 text-black' : 'bg-white/20 text-white'
                  }`}
                >
                  {showKinectSkeleton ? 'ENABLED' : 'DISABLED'}
                </button>
              </div>

              {/* Toggle Live Camera Pip */}
              <div className="flex items-center justify-between">
                <span>Live Camera Box Overlay</span>
                <button
                  onClick={() => setShowWebcam((v) => !v)}
                  className={`px-3 py-1 rounded-lg text-[10px] font-black cursor-pointer ${
                    showWebcam ? 'bg-cyan-400 text-black' : 'bg-white/20 text-white'
                  }`}
                >
                  {showWebcam ? 'SHOWN' : 'HIDDEN'}
                </button>
              </div>

              {/* Video Stretch Mode */}
              <div className="flex items-center justify-between">
                <span>Video Screen Stretch</span>
                <button
                  onClick={() => setVideoFitMode((m) => (m === 'cover' ? 'contain' : 'cover'))}
                  className="px-3 py-1 rounded-lg text-[10px] font-black bg-purple-600 text-white cursor-pointer"
                >
                  {videoFitMode === 'cover' ? 'FILL SCREEN (COVER)' : 'ASPECT FIT (CONTAIN)'}
                </button>
              </div>

              {/* Volume Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-white/70">
                  <span>Music Volume</span>
                  <span>{Math.round(musicVolume * 100)}%</span>
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
                  className="w-full accent-pink-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Quit Button */}
            <div className="pt-2 border-t border-white/10">
              <button
                onClick={() => {
                  soundEngine.playClick();
                  onExit();
                }}
                className="w-full py-2 bg-red-600/80 hover:bg-red-600 text-white text-xs font-black rounded-xl transition cursor-pointer flex items-center justify-center space-x-1.5"
              >
                <i className="fa-solid fa-door-open"></i>
                <span>QUIT TO SONG SELECTION</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
