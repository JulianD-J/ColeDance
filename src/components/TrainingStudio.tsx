import React, { useState, useRef } from 'react';
import { Song, YoloCoachFrame, PoseKeyframe, Coach } from '../types/game';
import { yoloTracker } from '../services/yoloPoseTracker';
import { soundEngine } from '../services/soundEffects';
import { saveCustomTrainedSong } from '../data/songsData';
import { storeVideoBlob } from '../services/indexedDBStorage';
import { exportCdncePackage, downloadCdnceBlob } from '../services/cdncePackageService';

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
      'from-pink-600 via-purple-600 to-indigo-900',
      'from-cyan-500 via-blue-600 to-purple-900',
      'from-amber-500 via-rose-600 to-purple-900',
      'from-emerald-500 via-teal-600 to-indigo-950',
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
          colorGradient: 'from-pink-500 via-purple-600 to-indigo-900',
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-lg p-4 select-none overflow-y-auto">
      <div className="bg-[#0f0c2e] border-2 border-pink-500/60 rounded-3xl max-w-4xl w-full p-6 space-y-5 shadow-[0_0_60px_rgba(255,20,147,0.5)] my-auto text-white">
        {/* Top Header */}
        <div className="flex justify-between items-center pb-3 border-b border-white/10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center text-lg shadow-lg">
              <i className="fa-solid fa-graduation-cap text-yellow-300"></i>
            </div>
            <div>
              <h2 className="text-xl font-black italic tracking-wider text-white">
                COLEDANCE COACH CHOREOGRAPHY STUDIO
              </h2>
              <p className="text-[11px] text-white/60">
                Record exact 17-keypoint trajectories for 1 to 5 coaches via YOLOv8/11 pose estimation
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              soundEngine.playClick();
              onClose();
            }}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-sm cursor-pointer"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* Visualizer & Mode Status Bar */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-black/50 p-3 rounded-2xl border border-white/10">
          <div className="p-2.5 rounded-xl border bg-gradient-to-r from-pink-600/40 to-purple-600/40 border-pink-400 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <i className="fa-solid fa-person-running text-lg text-yellow-300"></i>
              <div>
                <div className="text-xs font-black italic uppercase text-yellow-300">
                  EXACT COACH MOVES MODE (ACTIVE)
                </div>
                <div className="text-[10px] text-white/70">
                  Direct frame-by-frame joint comparison against coach
                </div>
              </div>
            </div>
            <span className="w-5 h-5 rounded-full bg-yellow-300 flex items-center justify-center">
              <i className="fa-solid fa-check text-[10px] text-black font-black"></i>
            </span>
          </div>

          {/* Toggle YOLO Visualizer */}
          <button
            onClick={() => {
              soundEngine.playClick();
              setShowYoloVisualizer((prev) => !prev);
              yoloTracker.setShowYoloDebugOverlay(!showYoloVisualizer);
            }}
            className={`p-2.5 rounded-xl border flex items-center justify-between transition cursor-pointer ${
              showYoloVisualizer
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 border-cyan-300 shadow-lg'
                : 'bg-white/5 border-white/10'
            }`}
          >
            <div className="flex items-center space-x-2.5 text-left">
              <i className="fa-solid fa-radar text-lg text-cyan-300"></i>
              <div>
                <div className="text-xs font-black italic uppercase">
                  YOLO MAP & DETECT OVERLAY: {showYoloVisualizer ? 'VISIBLE' : 'HIDDEN'}
                </div>
                <div className="text-[10px] text-white/70">
                  Visualizes YOLOv8/11 bounding boxes & 17 COCO keypoints
                </div>
              </div>
            </div>
            <span
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                showYoloVisualizer ? 'bg-cyan-300 border-white' : 'border-white/30'
              }`}
            >
              {showYoloVisualizer && <i className="fa-solid fa-check text-[10px] text-black font-black"></i>}
            </span>
          </button>
        </div>

        {/* Main Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column: Video & YOLO Visualizer Preview */}
          <div className="space-y-4">
            <div className="relative w-full h-56 bg-black/80 rounded-2xl overflow-hidden border border-white/15 flex items-center justify-center">
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
                    width={480}
                    height={270}
                    className="absolute inset-0 w-full h-full pointer-events-none"
                  />
                </>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="text-center p-6 space-y-2 cursor-pointer hover:text-pink-400 transition"
                >
                  <i className="fa-solid fa-cloud-arrow-up text-4xl text-pink-500 animate-bounce"></i>
                  <div className="text-xs font-black uppercase tracking-wider">
                    CLICK TO UPLOAD COACH VIDEO (MP4/WEBM)
                  </div>
                  <div className="text-[10px] text-white/50">Video stays 100% local on your device</div>
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={handleVideoUpload}
            />

            {/* Video Trimmer Controls (Cut YouTube Intro & Outro Menus) */}
            {videoSrc && rawVideoDuration > 0 && (
              <div className="bg-black/60 p-3 rounded-2xl border border-white/10 space-y-2.5">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-white/70">
                    Full Video: {Math.floor(rawVideoDuration / 60)}m {rawVideoDuration % 60}s ({rawVideoDuration}s)
                  </span>
                  <span className="text-pink-400 font-black">
                    Routine Trim: {Math.floor(Math.max(0, trimEnd - trimStart) / 60)}m {Math.max(0, trimEnd - trimStart) % 60}s ({(trimEnd - trimStart).toFixed(0)}s)
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-white/60">
                    <span>Start: {trimStart}s</span>
                    <span>End: {trimEnd}s</span>
                  </div>
                  <div className="flex space-x-2">
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
                      className="w-full accent-pink-500 cursor-pointer"
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
                      className="w-full accent-cyan-400 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="flex space-x-2 pt-0.5 text-[11px]">
                  <button
                    onClick={() => {
                      soundEngine.playClick();
                      if (videoRef.current) {
                        const cur = Math.floor(videoRef.current.currentTime);
                        setTrimStart(Math.min(cur, trimEnd - 1));
                      }
                    }}
                    className="flex-1 py-1.5 bg-white/10 hover:bg-pink-600/70 rounded-lg text-white font-bold transition cursor-pointer"
                  >
                    [ [ Set Start ({trimStart}s)
                  </button>
                  <button
                    onClick={() => {
                      soundEngine.playClick();
                      if (videoRef.current) {
                        const cur = Math.ceil(videoRef.current.currentTime);
                        setTrimEnd(Math.max(cur, trimStart + 1));
                      }
                    }}
                    className="flex-1 py-1.5 bg-white/10 hover:bg-cyan-600/70 rounded-lg text-white font-bold transition cursor-pointer"
                  >
                    Set End ({trimEnd}s) ] ]
                  </button>
                  <button
                    onClick={() => {
                      soundEngine.playClick();
                      setTrimStart(0);
                      setTrimEnd(rawVideoDuration);
                    }}
                    className="px-3 py-1.5 bg-white/5 hover:bg-white/15 rounded-lg text-white/60 hover:text-white font-bold transition cursor-pointer"
                  >
                    Full
                  </button>
                </div>
              </div>
            )}

            {/* Scan Action */}
            {videoSrc && (
              <div className="space-y-2">
                <div className="flex space-x-2">
                  <button
                    onClick={handleStartScan}
                    disabled={isScanning}
                    className="flex-1 py-3 bg-gradient-to-r from-pink-500 to-purple-600 hover:scale-105 active:scale-95 disabled:opacity-50 transition font-black italic text-xs rounded-xl shadow-lg flex items-center justify-center space-x-2 border border-white/20 cursor-pointer"
                  >
                    <i className="fa-solid fa-brain"></i>
                    <span>
                      {isScanning
                        ? `RECORDING POSES... (${scanProgress}%)`
                        : 'RECORD EXACT COACH POSES VIA YOLOV8/11'}
                    </span>
                  </button>

                  <button
                    onClick={handleCaptureVideoFrame}
                    title="Capture current video frame as miniature thumbnail"
                    className="px-4 py-3 bg-indigo-900/80 hover:bg-indigo-800 border border-white/20 rounded-xl text-xs font-bold cursor-pointer flex items-center space-x-1"
                  >
                    <i className="fa-solid fa-camera"></i>
                    <span>SNAP THUMBNAIL</span>
                  </button>
                </div>

                {isScanning && (
                  <div className="w-full bg-black/60 rounded-full h-2 overflow-hidden border border-white/10">
                    <div
                      className="bg-gradient-to-r from-pink-500 via-yellow-300 to-cyan-400 h-full transition-all duration-100"
                      style={{ width: `${scanProgress}%` }}
                    ></div>
                  </div>
                )}
              </div>
            )}

            {/* Coach Count Configuration (1 to 5 coaches) */}
            <div className="bg-black/50 p-3 rounded-2xl border border-white/10 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase text-cyan-400">
                  COACHES DETECTED IN VIDEO:
                </span>
                <div className="flex space-x-1.5">
                  {[1, 2, 3, 4, 5].map((cnt) => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => setDetectedCoachCount(cnt)}
                      className={`w-7 h-7 rounded-lg text-xs font-black border transition cursor-pointer ${
                        detectedCoachCount === cnt
                          ? 'bg-pink-600 text-white border-white shadow-[0_0_10px_#ff1493]'
                          : 'bg-white/10 text-white/60 border-white/15 hover:border-pink-400'
                      }`}
                    >
                      {cnt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Coach Custom Names for 1-5 Coaches */}
              <div className="space-y-1.5 pt-1">
                {Array.from({ length: detectedCoachCount }).map((_, cIdx) => (
                  <div key={cIdx} className="flex items-center space-x-2">
                    <span className="text-[10px] font-bold text-white/70 w-16">
                      Coach {cIdx + 1}:
                    </span>
                    <input
                      type="text"
                      value={coachCustomNames[cIdx] || `Coach ${cIdx + 1}`}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCoachCustomNames((prev) => {
                          const copy = [...prev];
                          copy[cIdx] = val;
                          return copy;
                        });
                      }}
                      className="flex-1 px-2.5 py-1 bg-black/60 border border-white/20 rounded-lg text-xs font-semibold text-white focus:outline-none focus:border-pink-500"
                      placeholder={`Name for Coach ${cIdx + 1}`}
                    />
                  </div>
                ))}
              </div>

              {extractedCoachFrames.length > 0 && (
                <div className="text-[10px] text-emerald-400 font-bold pt-1">
                  ✓ {extractedCoachFrames.length} joint frames recorded for {detectedCoachCount} coach(es)
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Song Metadata & Miniature */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-black uppercase text-pink-400">Song Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Levitate Dance"
                  className="w-full px-3 py-2 bg-black/60 border border-white/20 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-pink-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-pink-400">Artist Name</label>
                <input
                  type="text"
                  value={artist}
                  onChange={(e) => setArtist(e.target.value)}
                  placeholder="e.g. Custom Artist"
                  className="w-full px-3 py-2 bg-black/60 border border-white/20 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-pink-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-black uppercase text-pink-400">Difficulty</label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as any)}
                  className="w-full px-3 py-2 bg-black/60 border border-white/20 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-pink-500 cursor-pointer"
                >
                  <option value="Easy">Easy (1 Bar)</option>
                  <option value="Medium">Medium (2 Bars)</option>
                  <option value="Hard">Hard (3 Bars)</option>
                  <option value="Extreme">Extreme (4 Bars)</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-pink-400">BPM / Tempo</label>
                <input
                  type="number"
                  value={bpm}
                  onChange={(e) => setBpm(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-black/60 border border-white/20 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-pink-500"
                />
              </div>
            </div>

            {/* Miniature Input */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-black uppercase text-pink-400">
                  Miniature Thumbnail (Fills Catalog Space)
                </label>
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="text-[10px] text-cyan-400 hover:underline cursor-pointer font-bold"
                >
                  Upload Image
                </button>
              </div>

              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleMiniatureUpload}
              />

              <div className="flex items-center space-x-3 bg-black/40 p-2.5 rounded-xl border border-white/10">
                <div className="w-24 h-16 rounded-lg overflow-hidden bg-slate-800 border border-white/20 relative flex-shrink-0">
                  {miniatureSrc ? (
                    <img src={miniatureSrc} alt="Miniature" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[9px] text-white/40 text-center p-1">
                      No Thumbnail
                    </div>
                  )}
                </div>
                <div className="text-[11px] text-white/70 space-y-1">
                  <div className="font-bold text-white">{title || 'Untitled Routine'}</div>
                  <div>Use "Snap Thumbnail" from video or upload a custom image.</div>
                </div>
              </div>
            </div>

            {/* .cdnce Package Export (Single file with original video + moves) */}
            <div className="pt-1">
              <button
                onClick={handleExportCdnce}
                disabled={isExportingCdnce}
                className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-black font-black text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center space-x-2 shadow-lg cursor-pointer border border-amber-300"
                title="Export routine as a standalone .cdnce zip containing the full-resolution video and move trajectories"
              >
                <i className={`fa-solid ${isExportingCdnce ? 'fa-spinner animate-spin' : 'fa-file-zipper'} text-sm`}></i>
                <span>{isExportingCdnce ? 'PACKAGING .CDNCE...' : 'EXPORT .CDNCE PACKAGE (VIDEO + MOVES)'}</span>
              </button>
            </div>

            {/* JSON Export & Import */}
            <div className="flex items-center space-x-2">
              <button
                onClick={handleExportJSON}
                className="flex-1 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <i className="fa-solid fa-download text-yellow-300"></i>
                <span>EXPORT MOVES JSON</span>
              </button>

              <button
                onClick={() => jsonImportRef.current?.click()}
                className="flex-1 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <i className="fa-solid fa-upload text-cyan-300"></i>
                <span>IMPORT MOVES JSON</span>
              </button>

              <input
                ref={jsonImportRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleImportJSON}
              />
            </div>

            {/* Save Button */}
            <button
              onClick={handleSaveSong}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:scale-105 active:scale-95 transition font-black italic text-sm rounded-xl shadow-xl flex items-center justify-center space-x-2 border border-white/30 cursor-pointer"
            >
              <i className="fa-solid fa-floppy-disk"></i>
              <span>SAVE {detectedCoachCount} COACH(ES) TO SONG LIST</span>
            </button>
          </div>
        </div>

        {/* Live Status Message Bar */}
        {statusMessage && (
          <div className="text-center text-xs font-bold text-yellow-300 bg-yellow-950/60 p-2.5 rounded-xl border border-yellow-500/30">
            {statusMessage}
          </div>
        )}
      </div>
    </div>
  );
};
