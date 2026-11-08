import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Song, YoloCoachFrame, PoseKeyframe, Coach } from '../types/game';
import { yoloTracker } from '../services/yoloPoseTracker';
import { soundEngine } from '../services/soundEffects';
import { saveCustomTrainedSong } from '../data/songsData';
import { storeVideoBlob } from '../services/indexedDBStorage';
import { exportCdncePackage, downloadCdnceBlob } from '../services/cdncePackageService';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardActions,
  Button,
  IconButton,
  Input,
  Select,
  Badge,
  Chip,
  Progress,
  Slider,
  Switch,
  Avatar,
  Skeleton,
  Tooltip,
  Modal,
} from './ui';

interface TrainingStudioProps {
  onClose: () => void;
  onSongSaved: (newSong: Song) => void;
}

export const TrainingStudio: React.FC<TrainingStudioProps> = ({ onClose, onSongSaved }) => {
  const [videoSrc, setVideoSrc] = useState<string>('');
  const [videoFileName, setVideoFileName] = useState<string>('');
  const [videoFileBlob, setVideoFileBlob] = useState<Blob | null>(null);

  // Song Metadata
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [bpm, setBpm] = useState<number>(120);
  const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard' | 'Extreme'>('Medium');
  const [genre, setGenre] = useState('Pop');
  const [miniatureSrc, setMiniatureSrc] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);

  // YOLO Visualizer Toggle
  const [showYoloVisualizer, setShowYoloVisualizer] = useState<boolean>(true);

  // Coach Count & Custom Coach Names (1 to 5 coaches)
  const [detectedCoachCount, setDetectedCoachCount] = useState<number>(1);
  const [coachCustomNames, setCoachCustomNames] = useState<string[]>([
    'Lead Coach',
    'Duet Coach',
    'Trio Coach',
    'Squad Coach',
    'Wing Coach',
  ]);

  // Video Trimming & Scaling (Unlimited Duration Engine)
  const [trimStart, setTrimStart] = useState<number>(0);
  const [trimEnd, setTrimEnd] = useState<number>(0);
  const [rawVideoDuration, setRawVideoDuration] = useState<number>(0);

  // Extracted trajectories
  const [extractedKeyframes, setExtractedKeyframes] = useState<PoseKeyframe[]>([]);
  const [extractedCoachFrames, setExtractedCoachFrames] = useState<YoloCoachFrame[]>([]);
  const [statusMessage, setStatusMessage] = useState<string>('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const jsonImportRef = useRef<HTMLInputElement | null>(null);

  // Handle Video Upload
  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFileBlob(file);
      const url = URL.createObjectURL(file);
      setVideoSrc(url);
      setVideoFileName(file.name);
      setTrimStart(0);
      setTrimEnd(0);
      const cleanName = file.name.replace(/\.[^/.]+$/, '');
      if (!title) setTitle(cleanName);
      if (!artist) setArtist('Custom Coach');
      setStatusMessage(`Loaded "${file.name}". Ready for YOLOv8/11 coach movement mapping!`);
    }
  };

  // Capture Current Video Frame as Miniature Thumbnail
  const handleCaptureVideoFrame = () => {
    soundEngine.playClick();
    if (!videoRef.current) return;
    const v = videoRef.current;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = v.videoWidth || 640;
    tempCanvas.height = v.videoHeight || 360;
    const ctx = tempCanvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(v, 0, 0, tempCanvas.width, tempCanvas.height);
      const dataUrl = tempCanvas.toDataURL('image/jpeg', 0.85);
      setMiniatureSrc(dataUrl);
      setStatusMessage('Thumbnail snapshot captured from coach video!');
    }
  };

  // Upload Custom Image Thumbnail
  const handleMiniatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setMiniatureSrc(event.target.result as string);
          setStatusMessage('Custom miniature thumbnail uploaded!');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Run YOLOv8 / YOLO11 Movement Extraction on Video (Unlimited Duration + Trimming Support)
  const handleStartScan = async () => {
    if (!videoRef.current || !videoSrc) return;
    soundEngine.playClick();
    setIsScanning(true);
    setScanProgress(0);
    setStatusMessage('RECORDING EXACT COACH TRAJECTORIES: Mapping 17 COCO joints frame-by-frame...');

    const video = videoRef.current;
    video.pause();

    const scanStartTime = Math.max(0, trimStart);
    const scanEndTime = trimEnd > scanStartTime ? trimEnd : (video.duration || 180);
    const totalScanSpan = Math.max(1, scanEndTime - scanStartTime);
    const sampleStep = 0.35; // Sample every 350ms
    const unlimitedFrames: YoloCoachFrame[] = [];
    const keyframes: PoseKeyframe[] = [];
    let maxCoachCountFound = 1;

    // Downscale for 4K video training to eliminate memory crashes while keeping crisp resolution
    if (canvasRef.current) {
      const targetW = Math.min(1280, video.videoWidth || 640);
      const targetH = Math.round(targetW * ((video.videoHeight || 360) / (video.videoWidth || 640)));
      canvasRef.current.width = targetW;
      canvasRef.current.height = targetH;
      await yoloTracker.initialize(video, canvasRef.current);
      yoloTracker.setShowYoloDebugOverlay(showYoloVisualizer);
    }

    let currentTime = scanStartTime;

    const scanNext = async () => {
      if (currentTime >= scanEndTime) {
        setIsScanning(false);
        setScanProgress(100);
        finishExtraction(unlimitedFrames, keyframes, maxCoachCountFound);
        return;
      }

      video.currentTime = currentTime;
      await new Promise<void>((resolve) => {
        let isDone = false;
        const onFinish = () => {
          if (!isDone) {
            isDone = true;
            video.removeEventListener('seeked', onFinish);
            resolve();
          }
        };
        video.addEventListener('seeked', onFinish, { once: true });
        setTimeout(onFinish, 180);
      });

      // Analyze frame for multi-coach tracking (up to 5 coaches)
      const { detections, coachCount, coachFrames } =
        await yoloTracker.analyzeVideoFrameForCoaches(video, currentTime);

      if (coachCount > maxCoachCountFound) {
        maxCoachCountFound = Math.min(5, coachCount);
      }

      // Record frames with timestamp normalized relative to routine start
      const routineRelativeTime = parseFloat((currentTime - scanStartTime).toFixed(2));
      coachFrames.forEach((cf) =>
        unlimitedFrames.push({
          ...cf,
          timestampSeconds: routineRelativeTime,
        })
      );

      // Draw video frame & real YOLO detection overlay directly on the canvas
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          if (showYoloVisualizer) {
            yoloTracker.renderDetections(detections, ctx, canvas.width, canvas.height);
          }
        }
      }

      if (coachFrames.length > 0) {
        const c1 = coachFrames[0];
        keyframes.push({
          timestampSeconds: routineRelativeTime,
          detectedPose: 'RAISE_HANDS',
          armElevation: 0.5,
          elbowAngleLeft: 90,
          elbowAngleRight: 90,
          wristDistance: 0.4,
          torsoDisplacementX: c1.bbox.x,
          motionVelocity: 0.3,
        });
      }

      const elapsed = currentTime - scanStartTime;
      setScanProgress(Math.min(100, Math.floor((elapsed / totalScanSpan) * 100)));
      setStatusMessage(
        `Scanning: ${Math.min(100, Math.round((elapsed / totalScanSpan) * 100))}% — Mapped ${coachCount} coach(es) at ${(currentTime).toFixed(1)}s`
      );
      currentTime += sampleStep;
      setTimeout(scanNext, 30);
    };

    scanNext();
  };

  const finishExtraction = (
    unlimitedFrames: YoloCoachFrame[],
    keyframes: PoseKeyframe[],
    coachCount: number
  ) => {
    setExtractedCoachFrames(unlimitedFrames);
    setExtractedKeyframes(keyframes);
    setDetectedCoachCount(coachCount);

    setStatusMessage(
      `EXACT COACH TRAJECTORY READY! Mapped ${unlimitedFrames.length} joint frames across ${coachCount} coach(es).`
    );
    soundEngine.playStarUnlock();
  };

  // Save to Song Catalog
  const handleSaveSong = async () => {
    if (!title.trim()) {
      alert('Please enter a song title.');
      return;
    }

    soundEngine.playClick();
    const songId = `custom-${Date.now()}`;

    if (videoFileBlob) {
      try {
        await storeVideoBlob(songId, videoFileBlob);
      } catch (err) {
        console.warn('Could not store video in IndexedDB:', err);
      }
    }

    // Build 1 to 5 coach profiles with individual names and routines
    const coaches: Coach[] = [];
    const colorGradients = [
      'from-brand-500 via-purple-600 to-indigo-900',
      'from-accent-500 via-blue-600 to-purple-900',
      'from-sun-500 via-rose-600 to-purple-900',
      'from-success-500 via-teal-600 to-indigo-950',
      'from-rose-500 via-purple-600 to-blue-900',
    ];

    for (let c = 0; c < detectedCoachCount; c++) {
      const coachName = coachCustomNames[c] || `Coach ${c + 1}`;
      coaches.push({
        id: `c_${songId}_${c + 1}`,
        name: coachName,
        avatarSeed: `Coach_${title.replace(/\s+/g, '')}_${c + 1}`,
        routineName: `${coachName} Routine`,
        difficulty,
        colorGradient: colorGradients[c % colorGradients.length],
        coachIndex: c,
      });
    }

    const newSong: Song = {
      id: songId,
      title: title.trim(),
      artist: artist.trim() || 'Custom Coach',
      year: new Date().getFullYear(),
      difficulty,
      bpm: Number(bpm) || 120,
      durationSeconds: Math.max(10, Math.round(trimEnd - trimStart) || Math.floor(videoRef.current?.duration || 180)),
      coverImg:
        miniatureSrc ||
        'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
      audioUrl: videoSrc || '/audio/80s_vibe.mp3',
      videoUrl: videoSrc || undefined,
      genre,
      mood: 'Custom Trained',
      decade: '2020s',
      isCustomTrained: true,
      isUnlimitedMode: true,
      unlimitedCoachFrames: extractedCoachFrames,
      detectedCoachCount,
      trainedKeyframes: extractedKeyframes,
      coaches,
    };

    saveCustomTrainedSong(newSong);
    onSongSaved(newSong);
    setStatusMessage(`Saved to Song Catalog! ${detectedCoachCount} coach(es) ready in Coach Selection.`);
  };

  // Export JSON
  const handleExportJSON = () => {
    soundEngine.playClick();
    const exportData = {
      title,
      artist,
      bpm,
      difficulty,
      genre,
      isUnlimitedMode: true,
      detectedCoachCount,
      coachCustomNames: coachCustomNames.slice(0, detectedCoachCount),
      coverImg: miniatureSrc,
      extractedCoachFrames,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.toLowerCase().replace(/\s+/g, '_')}_exact_coach_moves.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const [isExportingCdnce, setIsExportingCdnce] = useState<boolean>(false);

  const handleExportCdnce = async () => {
    soundEngine.playClick();
    if (!videoFileBlob) {
      alert('Please select or record a video first before exporting a .cdnce package.');
      return;
    }
    if (!title) {
      alert('Please enter a routine title before exporting.');
      return;
    }

    try {
      setIsExportingCdnce(true);
      setStatusMessage('Packaging original video (preserving full resolution) and moves into .cdnce...');

      const songObj: Song = {
        id: `custom-cdnce-${Date.now()}`,
        title: title || 'Custom Routine',
        artist: artist || 'Various Artists',
        year: new Date().getFullYear(),
        difficulty,
        bpm,
        durationSeconds: Math.max(1, Math.floor(rawVideoDuration - trimStart - (rawVideoDuration - (trimEnd || rawVideoDuration)))),
        coverImg: miniatureSrc || '/src/assets/images/cover_viva_dance_1793632687217.jpg',
        audioUrl: '',
        genre,
        mood: 'High Energy',
        decade: '2020s',
        isUnlimitedMode: true,
        detectedCoachCount,
        coaches: coachCustomNames.slice(0, detectedCoachCount).map((cName, idx) => ({
          id: `c_${idx}`,
          name: cName,
          avatarSeed: `Coach${idx}_${cName}`,
          routineName: `${cName} Choreo`,
          difficulty,
          colorGradient: 'from-brand-500 via-purple-600 to-indigo-900',
          coachIndex: idx,
        })),
        unlimitedCoachFrames: extractedCoachFrames,
        isCustomTrained: true,
      };

      await storeVideoBlob(songObj.id, videoFileBlob);
      const { blob, filename } = await exportCdncePackage(songObj);
      downloadCdnceBlob(blob, filename);

      setStatusMessage(`Exported ${filename} successfully! Share this package across computers.`);
    } catch (err: any) {
      console.error('CDNCE export error:', err);
      setStatusMessage(`Export failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsExportingCdnce(false);
    }
  };

  // Import JSON
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target?.result as string);
          if (data.title) setTitle(data.title);
          if (data.artist) setArtist(data.artist);
          if (data.bpm) setBpm(data.bpm);
          if (data.difficulty) setDifficulty(data.difficulty);
          if (data.coverImg) setMiniatureSrc(data.coverImg);
          if (data.detectedCoachCount) setDetectedCoachCount(data.detectedCoachCount);
          if (data.coachCustomNames) setCoachCustomNames(data.coachCustomNames);
          if (data.extractedCoachFrames) setExtractedCoachFrames(data.extractedCoachFrames);
          setStatusMessage(`Imported routine "${data.title}" successfully with ${data.detectedCoachCount || 1} coach(es)!`);
          soundEngine.playClick();
        } catch (err) {
          alert('Invalid JSON file format.');
        }
      };
      reader.readAsText(file);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Modal
      isOpen={true}
      onClose={() => { soundEngine.playClick(); onClose(); }}
      title="COLEDANCE COACH CHOREOGRAPHY STUDIO"
      description="Record exact 17-keypoint trajectories for 1 to 5 coaches via YOLOv8/11 pose estimation"
      size="max"
      variant="form"
      showCloseButton={true}
      footer={
        <div className="w-full flex justify-end gap-3">
          <Button variant="outlined" onClick={() => { soundEngine.playClick(); onClose(); }}>Cancel</Button>
          <Button variant="primary" size="lg" onClick={handleSaveSong} className="shadow-brand-glow">
            SAVE {detectedCoachCount} COACH(ES) TO SONG LIST
          </Button>
        </div>
      }
    >
      <motion.div
        className="space-y-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Visualizer & Mode Status Bar */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card variant="filled" padding="md" className="bg-gradient-to-r from-brand-500/20 to-purple-500/20 border-brand-500/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-500/20 flex items-center justify-center text-brand-400">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
              </div>
              <div>
                <div className="text-label-large font-black italic uppercase text-brand-400">EXACT COACH MOVES MODE</div>
                <div className="text-body-small text-on-surface-variant">Direct frame-by-frame joint comparison against coach</div>
              </div>
            </div>
          </Card>

          <Card variant="filled" padding="md" className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Tooltip content={showYoloVisualizer ? 'Hide YOLO detection overlay' : 'Show YOLO detection overlay'} position="top">
                <Button
                  variant={showYoloVisualizer ? 'secondary' : 'ghost'}
                  size="sm"
                  leadingIcon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>}
                  onClick={() => {
                    soundEngine.playClick();
                    setShowYoloVisualizer((prev) => !prev);
                    yoloTracker.setShowYoloDebugOverlay(!showYoloVisualizer);
                  }}
                >
                  YOLO MAP & DETECT: {showYoloVisualizer ? 'VISIBLE' : 'HIDDEN'}
                </Button>
              </Tooltip>
            </div>
          </Card>
        </div>

        {/* Main Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Video & YOLO Visualizer Preview */}
          <div className="space-y-5 lg:space-y-6">
            {/* Video Player with Canvas Overlay */}
            <Card variant="filled" padding="none" className="overflow-hidden">
              <div className="relative w-full aspect-video bg-surface-0">
                {videoSrc ? (
                  <>
                    <video
                      ref={videoRef}
                      src={videoSrc}
                      controls
                      playsInline
                      onLoadedMetadata={() => {
                        if (videoRef.current) {
                          const dur = Math.round(videoRef.current.duration || 0);
                          setRawVideoDuration(dur);
                          setTrimStart(0);
                          setTrimEnd(dur);
                        }
                      }}
                      className="w-full h-full object-contain"
                    />
                    <canvas
                      ref={canvasRef}
                      className="absolute inset-0 w-full h-full pointer-events-none"
                    />
                  </>
                ) : (
                  <Tooltip content="Click to upload coach video (MP4/WebM)" position="top">
                    <motion.div
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full h-full flex flex-col items-center justify-center gap-4 p-8 cursor-pointer"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <motion.div
                        className="w-20 h-20 rounded-2xl bg-brand-500/15 border border-brand-500/30 flex items-center justify-center text-brand-400 text-3xl"
                        initial={{ scale: 0 }}
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ type: 'spring', stiffness: 500, damping: 17, duration: 2, repeat: Infinity }}
                      >
                        <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                      </motion.div>
                      <div className="text-center">
                        <div className="text-label-large font-black uppercase text-brand-400 tracking-wider">CLICK TO UPLOAD COACH VIDEO</div>
                        <div className="text-body-small text-on-surface-variant mt-1">MP4, WebM • Video stays 100% local on your device</div>
                      </div>
                    </motion.div>
                  </Tooltip>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={handleVideoUpload}
              />
            </Card>

            {/* Video Trimmer Controls */}
            {videoSrc && rawVideoDuration > 0 && (
              <Card variant="filled" padding="md" className="space-y-4">
                <CardHeader>
                  <CardTitle level="h4">VIDEO TRIMMER</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center text-body-small font-semibold">
                    <span className="text-on-surface-variant">Full Video: {formatTime(rawVideoDuration)} ({rawVideoDuration}s)</span>
                    <span className="text-brand-400">Routine Trim: {formatTime(Math.max(0, trimEnd - trimStart))} ({(trimEnd - trimStart).toFixed(0)}s)</span>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between text-label-small text-on-surface-disabled">
                      <span>Start: {formatTime(trimStart)}</span>
                      <span>End: {formatTime(trimEnd)}</span>
                    </div>
                    <div className="flex gap-3">
                      <input
                        type="range"
                        min="0"
                        max={rawVideoDuration}
                        value={trimStart}
                        onChange={(e) => {
                          const v = Math.min(parseFloat(e.target.value), trimEnd - 2);
                          setTrimStart(v);
                          if (videoRef.current) videoRef.current.currentTime = v;
                        }}
                        className="flex-1 accent-brand-500 h-2"
                      />
                      <input
                        type="range"
                        min="0"
                        max={rawVideoDuration}
                        value={trimEnd}
                        onChange={(e) => {
                          const v = Math.max(parseFloat(e.target.value), trimStart + 2);
                          setTrimEnd(v);
                          if (videoRef.current) videoRef.current.currentTime = v;
                        }}
                        className="flex-1 accent-accent-500 h-2"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outlined"
                      size="sm"
                      onClick={() => {
                        soundEngine.playClick();
                        if (videoRef.current) {
                          const cur = Math.floor(videoRef.current.currentTime);
                          setTrimStart(Math.min(cur, trimEnd - 1));
                        }
                      }}
                    >
                      [[ Set Start ({formatTime(trimStart)})
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        soundEngine.playClick();
                        if (videoRef.current) {
                          const cur = Math.ceil(videoRef.current.currentTime);
                          setTrimEnd(Math.max(cur, trimStart + 1));
                        }
                      }}
                    >
                      Set End ({formatTime(trimEnd)}) ]]
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => { soundEngine.playClick(); setTrimStart(0); setTrimEnd(rawVideoDuration); }}>
                      Full Video
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Scan Action */}
            {videoSrc && (
              <Card variant="filled" padding="md" className="space-y-4">
                <CardHeader>
                  <CardTitle level="h4">YOLO POSE EXTRACTION</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-3">
                    <Tooltip content="Start recording exact coach poses via YOLOv8/11" position="top">
                      <Button
                        variant="primary"
                        size="lg"
                        fullWidth
                        leadingIcon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a10 10 0 0 1 10 10A10 10 0 0 1 12 22 10 10 0 0 1 2 12 10 10 0 0 1 12 2" /><path d="M12 6v6l4 2" /></svg>}
                        disabled={isScanning}
                        onClick={handleStartScan}
                        className="shadow-brand-glow"
                      >
                        {isScanning ? `RECORDING POSES... (${scanProgress}%)` : 'RECORD EXACT COACH POSES VIA YOLOv8/11'}
                      </Button>
                    </Tooltip>

                    <Tooltip content="Capture current video frame as miniature thumbnail" position="top">
                      <Button
                        variant="outlined"
                        size="lg"
                        leadingIcon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>}
                        onClick={handleCaptureVideoFrame}
                      >
                        SNAP THUMBNAIL
                      </Button>
                    </Tooltip>
                  </div>

                  {isScanning && (
                    <Progress value={scanProgress} size="lg" variant="gradient" animated striped showLabel />
                  )}

                  {extractedCoachFrames.length > 0 && !isScanning && (
                    <div className="p-3 rounded-xl bg-success-500/15 border border-success-500/30">
                      <div className="flex items-center gap-2 text-success-400 font-semibold">
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                        <span>✓ {extractedCoachFrames.length} joint frames recorded for {detectedCoachCount} coach(es)</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Coach Count Configuration (1 to 5 coaches) */}
            <Card variant="filled" padding="md" className="space-y-4">
              <CardHeader>
                <CardTitle level="h4">COACH CONFIGURATION</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-label-small font-black uppercase text-accent-400 tracking-wider">COACHES IN ROUTINE:</span>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((cnt) => (
                      <Tooltip key={cnt} content={`${cnt} Coach${cnt > 1 ? 'es' : ''}`} position="top">
                        <motion.button
                          type="button"
                          onClick={() => { soundEngine.playClick(); setDetectedCoachCount(cnt); }}
                          className={`
                            w-12 h-12 rounded-xl text-label-large font-black border transition-all motion-spring
                            ${detectedCoachCount === cnt
                              ? 'bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-brand-glow border-transparent'
                              : 'bg-surface-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-3 hover:border-brand-500'
                            }
                          `}
                          whileTap={{ scale: 0.9 }}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.05 * cnt, type: 'spring', stiffness: 500, damping: 17 }}
                        >
                          {cnt}
                        </motion.button>
                      </Tooltip>
                    ))}
                  </div>
                </div>

                {/* Coach Custom Names for 1-5 Coaches */}
                <div className="space-y-3 pt-2 border-t border-outline-variant">
                  {Array.from({ length: detectedCoachCount }).map((_, cIdx) => (
                    <motion.div
                      key={cIdx}
                      className="flex items-center gap-3"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05 * cIdx }}
                    >
                      <span className="text-label-small font-bold text-on-surface-variant w-24 shrink-0">Coach {cIdx + 1}:</span>
                      <Input
                        value={coachCustomNames[cIdx] || `Coach ${cIdx + 1}`}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCoachCustomNames((prev) => {
                            const copy = [...prev];
                            copy[cIdx] = val;
                            return copy;
                          });
                        }}
                        placeholder={`Name for Coach ${cIdx + 1}`}
                        size="md"
                        fullWidth
                      />
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Song Metadata & Miniature */}
          <div className="space-y-5 lg:space-y-6">
            {/* Song Metadata */}
            <Card variant="filled" padding="lg" className="space-y-5">
              <CardHeader>
                <CardTitle level="h4">ROUTINE METADATA</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Song Title"
                    placeholder="e.g. Levitate Dance"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    size="md"
                  />
                  <Input
                    label="Artist Name"
                    placeholder="e.g. Custom Artist"
                    value={artist}
                    onChange={(e) => setArtist(e.target.value)}
                    size="md"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Select
                    label="Difficulty"
                    value={difficulty}
                    options={[
                      { value: 'Easy', label: 'Easy (1 Bar)' },
                      { value: 'Medium', label: 'Medium (2 Bars)' },
                      { value: 'Hard', label: 'Hard (3 Bars)' },
                      { value: 'Extreme', label: 'Extreme (4 Bars)' },
                    ]}
                    onChange={(e) => setDifficulty(e.target.value as any)}
                    size="md"
                  />
                  <Input
                    label="BPM / Tempo"
                    type="number"
                    value={String(bpm)}
                    onChange={(e) => setBpm(Number(e.target.value))}
                    size="md"
                  />
                </div>

                <Select
                  label="Genre"
                  value={genre}
                  options={[
                    { value: 'Pop', label: 'Pop' },
                    { value: 'K-Pop', label: 'K-Pop' },
                    { value: 'Electro-Dance', label: 'Electro-Dance' },
                    { value: 'Hip-Hop', label: 'Hip-Hop' },
                    { value: 'Rock', label: 'Rock' },
                    { value: 'EDM', label: 'EDM' },
                  ]}
                  onChange={(e) => setGenre(e.target.value)}
                  size="md"
                />
              </CardContent>
            </Card>

            {/* Miniature Input */}
            <Card variant="filled" padding="lg" className="space-y-4">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle level="h4">MINIATURE THUMBNAIL</CardTitle>
                  <Tooltip content="Upload custom thumbnail image" position="top">
                    <Button variant="ghost" size="sm" onClick={() => imageInputRef.current?.click()}>
                      UPLOAD IMAGE
                    </Button>
                  </Tooltip>
                </div>
              </CardHeader>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleMiniatureUpload}
              />
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="relative w-32 h-20 md:w-40 md:h-24 rounded-xl overflow-hidden bg-surface-2 border border-outline-variant flex-shrink-0">
                    {miniatureSrc ? (
                      <img src={miniatureSrc} alt="Miniature" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-body-small text-on-surface-variant">
                        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                        <span>No Thumbnail</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-white truncate">{title || 'Untitled Routine'}</div>
                    <div className="text-body-small text-on-surface-variant">Use "Snap Thumbnail" from video or upload a custom image.</div>
                    <div className="text-label-small text-accent-400 mt-1">Recommended: 16:9 aspect ratio, 640x360px</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Export Actions */}
            <Card variant="filled" padding="lg" className="space-y-4">
              <CardHeader>
                <CardTitle level="h4">EXPORT & SHARE</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Tooltip content="Export routine as a standalone .cdnce zip containing the full-resolution video and move trajectories" position="top">
                  <Button
                    variant="secondary"
                    size="lg"
                    fullWidth
                    leadingIcon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>}
                    disabled={isExportingCdnce || !videoFileBlob}
                    onClick={handleExportCdnce}
                    className="shadow-sun-glow"
                  >
                    {isExportingCdnce ? 'PACKAGING .CDNCE...' : 'EXPORT .CDNCE PACKAGE (VIDEO + MOVES)'}
                  </Button>
                </Tooltip>

                <div className="grid grid-cols-2 gap-3">
                  <Tooltip content="Export pose data as JSON" position="top">
                    <Button variant="outlined" fullWidth leadingIcon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>} onClick={handleExportJSON}>
                      EXPORT MOVES JSON
                    </Button>
                  </Tooltip>
                  <Tooltip content="Import pose data from JSON" position="top">
                    <Button variant="ghost" fullWidth onClick={() => jsonImportRef.current?.click()}>
                      IMPORT MOVES JSON
                    </Button>
                  </Tooltip>
                  <input
                    ref={jsonImportRef}
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={handleImportJSON}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Live Status Message Bar */}
        <AnimatePresence>
          {statusMessage && (
            <motion.div
              className="p-4 rounded-2xl bg-sun-900/40 border border-sun-500/30 text-center"
              initial={{ opacity: 0, height: 0, y: -10 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -10 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            >
              <p className="text-body-small font-bold text-sun-400">{statusMessage}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </Modal>
  );
};

export default TrainingStudio;