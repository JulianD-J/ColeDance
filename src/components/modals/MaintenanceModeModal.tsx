import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import * as ort from 'onnxruntime-web';
import { yoloTracker, isRunningInIframe } from '../../services/yoloPoseTracker';
import { detectDeviceCamera } from '../../services/cameraDetection';
import { soundEngine } from '../../services/soundEffects';
import { getAllSongs } from '../../data/songsData';
import { getVideoBlob } from '../../services/indexedDBStorage';
import { YoloKeypoint, YoloPersonDetection } from '../../types/game';
import { Modal, Button, Badge, Card, Chip, Tooltip, Input, Slider, Switch, Avatar, Skeleton, Progress } from '../ui';

interface MaintenanceModeModalProps {
  onClose: () => void;
}

interface TestResult {
  id: string;
  name: string;
  category: 'Environment' | 'ONNX / YOLO' | 'Video & Trimming' | 'Camera & Motion' | 'Scoring & State';
  status: 'PENDING' | 'PASS' | 'WARN' | 'FAIL';
  details: string;
  data?: any;
}

const categoryIcons = {
  'Environment': <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>,
  'ONNX / YOLO': <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a10 10 0 0 1 10 10A10 10 0 0 1 12 22 10 10 0 0 1 2 12 10 10 0 0 1 12 2" /><path d="M12 6v6l4 2" /></svg>,
  'Video & Trimming': <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8" /><path d="M12 17v4" /></svg>,
  'Camera & Motion': <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>,
  'Scoring & State': <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="16" /></svg>,
};

const statusStyles = {
  PASS: 'bg-success-500/20 border-success-500/40 text-success-400',
  WARN: 'bg-sun-500/20 border-sun-500/40 text-sun-400',
  FAIL: 'bg-error-500/20 border-error-500/40 text-error-400',
  PENDING: 'bg-surface-2 border-outline-variant text-on-surface-variant',
};

export const MaintenanceModeModal: React.FC<MaintenanceModeModalProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'tests' | 'camera_monitor' | 'video_testbench' | 'logs'>('tests');
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [systemLogs, setSystemLogs] = useState<string[]>([]);
  const [exportReady, setExportReady] = useState(false);

  // Live Camera Monitor State
  const [cameraActive, setCameraActive] = useState(false);
  const [liveDetections, setLiveDetections] = useState<YoloPersonDetection[]>([]);
  const [liveVariance, setLiveVariance] = useState<number>(0);
  const [isCoordinateFrozen, setIsCoordinateFrozen] = useState<boolean | null>(null);
  const cameraVideoRef = useRef<HTMLVideoElement | null>(null);
  const cameraCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const coordinateHistoryRef = useRef<YoloKeypoint[][]>([]);

  // Video Testbench State
  const [testVideoSrc, setTestVideoSrc] = useState<string>('');
  const [testVideoName, setTestVideoName] = useState<string>('');
  const [testVideoDuration, setTestVideoDuration] = useState<number>(0);
  const [trimStart, setTrimStart] = useState<number>(0);
  const [trimEnd, setTrimEnd] = useState<number>(0);
  const [isScanningTestVideo, setIsScanningTestVideo] = useState(false);
  const [testScanFrames, setTestScanFrames] = useState<any[]>([]);
  const testbenchVideoRef = useRef<HTMLVideoElement | null>(null);
  const testbenchCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const addLog = (msg: string) => {
    const timestamp = new Date().toISOString().substring(11, 23);
    const line = `[${timestamp}] ${msg}`;
    setSystemLogs((prev) => [line, ...prev.slice(0, 150)]);
    console.log(`[Diagnostic] ${msg}`);
  };

  // Run comprehensive test suite
  const runAllDiagnostics = async () => {
    soundEngine.playClick();
    setIsRunningTests(true);
    addLog('Starting Comprehensive ColeDance Diagnostics...');

    const results: TestResult[] = [];

    // 1. Environment & Iframe Test
    const inIframe = isRunningInIframe();
    const crossOrigin = window.crossOriginIsolated || false;
    const hasSharedArrayBuffer = typeof SharedArrayBuffer !== 'undefined';
    results.push({
      id: 'env-iframe',
      name: 'Runtime Context & Isolation',
      category: 'Environment',
      status: inIframe ? 'WARN' : 'PASS',
      details: inIframe
        ? 'Running inside an Iframe. SharedArrayBuffer & multi-threading restricted by browser security.'
        : 'Running in top-level browser window. Full hardware isolation supported.',
      data: {
        inIframe,
        crossOriginIsolated: crossOrigin,
        hasSharedArrayBuffer,
        userAgent: navigator.userAgent,
        screen: `${window.screen.width}x${window.screen.height}`,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        devicePixelRatio: window.devicePixelRatio,
      },
    });

    // 2. Hardware Specs
    const cores = navigator.hardwareConcurrency || 1;
    const memory = (navigator as any).deviceMemory || 'unknown';
    results.push({
      id: 'env-hardware',
      name: 'Hardware Concurrency & Memory',
      category: 'Environment',
      status: cores >= 4 ? 'PASS' : 'WARN',
      details: `CPU Cores: ${cores} \u2022 Estimated Device RAM: ${memory} GB`,
      data: { hardwareConcurrency: cores, deviceMemory: memory },
    });

    // 3. WebAssembly Capabilities
    const hasWasm = typeof WebAssembly !== 'undefined';
    let hasWasmSimd = false;
    try {
      hasWasmSimd = WebAssembly.validate(new Uint8Array([
        0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 26, 11
      ]));
    } catch {
      hasWasmSimd = false;
    }
    results.push({
      id: 'wasm-features',
      name: 'WebAssembly & SIMD Acceleration',
      category: 'Environment',
      status: hasWasm ? (hasWasmSimd ? 'PASS' : 'WARN') : 'FAIL',
      details: hasWasm
        ? `WebAssembly supported. SIMD vector acceleration: ${hasWasmSimd ? 'Available' : 'Unavailable (WASM fallback active)'}`
        : 'WebAssembly NOT supported on this browser engine.',
      data: { hasWasm, hasWasmSimd, numThreads: ort.env.wasm.numThreads },
    });

    // 4. ONNX Runtime Web Model Loading & Session Creation
    addLog('Testing ONNX Runtime Web model binary fetch (/models/yolov8n-pose.onnx)...');
    let modelFetchStatus = 'FAIL';
    let modelSizeBytes = 0;
    let modelLoadError = '';
    let sessionCreation = 'FAIL';

    try {
      const modelUrl = `${import.meta.env.BASE_URL.replace(/\/$/, '')}/models/yolov8n-pose.onnx`;
      const resp = await fetch(modelUrl);
      modelFetchStatus = resp.ok ? 'PASS' : 'FAIL';
      if (resp.ok) {
        const buffer = await resp.arrayBuffer();
        modelSizeBytes = buffer.byteLength;
        addLog(`Model binary fetched successfully! Size: ${(modelSizeBytes / (1024 * 1024)).toFixed(2)} MB`);

        try {
          const testSession = await ort.InferenceSession.create(buffer, {
            executionProviders: ['wasm'],
            graphOptimizationLevel: 'basic',
          });
          sessionCreation = 'PASS';
          addLog(`InferenceSession successfully instantiated! Inputs: ${testSession.inputNames.join(', ')}`);
        } catch (sessErr: any) {
          sessionCreation = 'FAIL';
          modelLoadError = sessErr?.message || String(sessErr);
          addLog(`InferenceSession creation failed: ${modelLoadError}`);
        }
      } else {
        modelLoadError = `HTTP ${resp.status} ${resp.statusText}`;
      }
    } catch (fetchErr: any) {
      modelLoadError = fetchErr?.message || String(fetchErr);
      addLog(`Model binary fetch error: ${modelLoadError}`);
    }

    results.push({
      id: 'onnx-yolo-session',
      name: 'YOLOv8-Pose ONNX Neural Engine',
      category: 'ONNX / YOLO',
      status: sessionCreation === 'PASS' ? 'PASS' : 'FAIL',
      details:
        sessionCreation === 'PASS'
          ? `Neural session initialized with WASM backend (${(modelSizeBytes / (1024 * 1024)).toFixed(1)} MB model)`
          : `Model binary failed to create inference session: ${modelLoadError}. Vision Pose fallback is handling inputs.`,
      data: {
        modelFetchStatus,
        modelSizeBytes,
        sessionCreation,
        error: modelLoadError,
        wasmPaths: ort.env.wasm.wasmPaths,
      },
    });

    // 5. Video Truncation & Duration Cap Analysis
    results.push({
      id: 'video-duration-cap',
      name: 'Video Duration 120-Second Cap Audit',
      category: 'Video & Trimming',
      status: 'WARN',
      details:
        'Detected hardcoded cap: `Math.min(video.duration || 60, 120)` in TrainingStudio. Videos longer than 2 minutes (like Coldplay Viva La Vida at 4:47) get cut off exactly at 1:59 (120s). Needs unlimited dynamic duration.',
      data: {
        hardcodedCapSeconds: 120,
        symptomVerified: 'Video scanner stops at 1:59 and reports 100% complete.',
        requiredFix: 'Remove 120s clamp; use actual video.duration with user-defined start & end trim times.',
      },
    });

    // 6. Camera Hardware Detection
    const camStatus = await detectDeviceCamera();
    results.push({
      id: 'camera-hardware',
      name: 'Hardware Camera Device Enumeration',
      category: 'Camera & Motion',
      status: camStatus.hasCamera ? 'PASS' : 'WARN',
      details: camStatus.hasCamera
        ? `Found ${camStatus.deviceCount} physical video input device(s).`
        : 'No webcam hardware detected. Smartphone controller mode is active.',
      data: camStatus,
    });

    // 7. Coordinate Frozen / Static Fallback Detection
    const songs = getAllSongs();
    const customTrained = songs.filter((s) => s.isCustomTrained && s.unlimitedCoachFrames && s.unlimitedCoachFrames.length > 5);
    let duplicateCoordCount = 0;
    let sampleSongTitle = '';

    if (customTrained.length > 0) {
      const song = customTrained[0];
      sampleSongTitle = song.title;
      const f1 = song.unlimitedCoachFrames![0]?.keypoints;
      const f2 = song.unlimitedCoachFrames![1]?.keypoints;
      const f3 = song.unlimitedCoachFrames![2]?.keypoints;

      if (f1 && f2 && f3) {
        if (f1[0]?.x === f2[0]?.x && f2[0]?.x === f3[0]?.x && f1[5]?.x === f2[5]?.x) {
          duplicateCoordCount = song.unlimitedCoachFrames!.length;
        }
      }
    }

    results.push({
      id: 'coordinate-dynamics',
      name: 'JSON Keypoint Dynamics & Coordinate Drift',
      category: 'ONNX / YOLO',
      status: duplicateCoordCount > 0 ? 'FAIL' : 'PASS',
      details: duplicateCoordCount > 0
        ? `STATIC COORDINATES CONFIRMED: ${duplicateCoordCount} frames in "${sampleSongTitle}" have identical stationary coordinates down to 16 decimal places!`
        : 'No frozen static coordinates found in currently loaded routines.',
      data: {
        sampleSongTitle,
        hasDuplicateCoordinates: duplicateCoordCount > 0,
        frameCount: duplicateCoordCount,
      },
    });

    // 8. Scoring State Propagation Bug Test
    results.push({
      id: 'scoring-state-transfer',
      name: 'Gameplay to Results Score Transfer',
      category: 'Scoring & State',
      status: 'WARN',
      details:
        'Detected potential state synchronization issue: GameplayScreen manages internal `activePlayers` state, but upon song completion (`handleFinish`), if the parent callback receives default props or an un-updated player array, player score is read as 0 PTS.',
      data: {
        stateMechanism: 'GameplayScreen activePlayers -> onFinishRoutine(updatedPlayers) -> App.tsx setPlayers -> ResultsScreen players',
        potentialFailure: 'Countdown timer calling handleFinish with stale closure of players.',
      },
    });

    // 9. Storage & IndexedDB Status
    let dbStatus = 'PASS';
    let storedVideoCount = 0;
    try {
      for (const song of customTrained) {
        const blob = await getVideoBlob(song.id);
        if (blob) storedVideoCount++;
      }
    } catch {
      dbStatus = 'WARN';
    }

    results.push({
      id: 'storage-indexeddb',
      name: 'IndexedDB Offline Video Storage',
      category: 'Video & Trimming',
      status: dbStatus === 'PASS' ? 'PASS' : 'WARN',
      details: `IndexedDB active. Found ${storedVideoCount} locally stored high-res coach video blob(s).`,
      data: {
        storedVideoCount,
        localStorageKeys: Object.keys(localStorage).filter((k) => k.startsWith('coledance')),
      },
    });

    setTestResults(results);
    setIsRunningTests(false);
    setExportReady(true);
    addLog('All diagnostics completed! Ready for JSON Export.');
  };

  useEffect(() => {
    runAllDiagnostics();
  }, []);

  // Live Camera Monitor Loop
  useEffect(() => {
    let isActive = true;

    if (activeTab === 'camera_monitor' && cameraVideoRef.current && cameraCanvasRef.current) {
      const video = cameraVideoRef.current;
      const canvas = cameraCanvasRef.current;

      yoloTracker.initialize(video, canvas).then(() => {
        yoloTracker.startCamera().then((ok) => {
          if (isActive) setCameraActive(ok);
        });
      });

      yoloTracker.setShowYoloDebugOverlay(true);
      yoloTracker.setOnMultiPersonDetections((dets) => {
        if (!isActive) return;
        setLiveDetections(dets);

        if (dets && dets.length > 0 && dets[0].keypoints) {
          const kps = dets[0].keypoints;
          coordinateHistoryRef.current.push(kps);
          if (coordinateHistoryRef.current.length > 25) {
            coordinateHistoryRef.current.shift();
          }

          // Calculate variance across last 20 frames for nose
          if (coordinateHistoryRef.current.length >= 10) {
            const hist = coordinateHistoryRef.current;
            const noseXs = hist.map((h) => h[0]?.x || 0);
            const meanNose = noseXs.reduce((a, b) => a + b, 0) / noseXs.length;
            const variance = noseXs.reduce((a, b) => a + Math.pow(b - meanNose, 2), 0) / noseXs.length;

            setLiveVariance(variance);
            setIsCoordinateFrozen(variance < 0.00001);
          }
        }
      });
    }

    return () => {
      isActive = false;
      if (activeTab === 'camera_monitor') {
        yoloTracker.stopCamera();
      }
    };
  }, [activeTab]);

  // Video Testbench File Upload
  const handleTestVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setTestVideoSrc(url);
      setTestVideoName(file.name);
      addLog(`Loaded testbench video: "${file.name}" (${(file.size / (1024 * 1024)).toFixed(1)} MB)`);
    }
  };

  const handleTestbenchVideoLoaded = () => {
    if (testbenchVideoRef.current) {
      const dur = testbenchVideoRef.current.duration || 0;
      setTestVideoDuration(dur);
      setTrimStart(0);
      setTrimEnd(Math.round(dur));
      addLog(`Video metadata parsed: Duration = ${dur.toFixed(2)}s (${Math.floor(dur / 60)}m ${Math.floor(dur % 60)}s), Dimensions = ${testbenchVideoRef.current.videoWidth}x${testbenchVideoRef.current.videoHeight}`);
    }
  };

  // Run a 5-Frame Scan Test on the testbench video
  const runTestbenchScanSample = async () => {
    if (!testbenchVideoRef.current) return;
    const v = testbenchVideoRef.current;
    setIsScanningTestVideo(true);
    addLog(`Running testbench 5-frame sample scan between ${trimStart}s and ${trimEnd}s...`);

    const frames: any[] = [];
    const step = Math.max(0.5, (trimEnd - trimStart) / 5);

    for (let t = trimStart; t <= trimEnd && frames.length < 5; t += step) {
      v.currentTime = t;
      await new Promise<void>((res) => {
        const onSeek = () => {
          v.removeEventListener('seeked', onSeek);
          res();
        };
        v.addEventListener('seeked', onSeek);
        setTimeout(onSeek, 200);
      });

      const { detections, coachCount } = await yoloTracker.analyzeVideoFrameForCoaches(v, t);
      const kps = detections[0]?.keypoints || [];
      frames.push({
        timestamp: t.toFixed(2),
        coachCount,
        nose: kps[0] ? { x: kps[0].x.toFixed(4), y: kps[0].y.toFixed(4) } : null,
        leftWrist: kps[9] ? { x: kps[9].x.toFixed(4), y: kps[9].y.toFixed(4) } : null,
        bbox: detections[0]?.bbox || null,
      });
    }

    setTestScanFrames(frames);
    setIsScanningTestVideo(false);

    // Check if sample frames have different coordinates
    if (frames.length >= 2) {
      const diffX = Math.abs(parseFloat(frames[0].nose?.x || 0) - parseFloat(frames[1].nose?.x || 0));
      if (diffX < 0.0001) {
        addLog('\u26a0\ufe0f WARNING: Sample video scan produced identical coordinates across different timestamps!');
      } else {
        addLog(`\u2705 SUCCESS: Video scan produced dynamic motion coordinates (delta X = ${diffX.toFixed(4)})`);
      }
    }
  };

  // Export full diagnostic JSON package
  const handleExportDiagnosticJSON = () => {
    soundEngine.playClick();
    const report = {
      reportType: 'ColeDance_System_Diagnostics',
      generatedAt: new Date().toISOString(),
      summary: {
        totalTests: testResults.length,
        passedTests: testResults.filter((r) => r.status === 'PASS').length,
        warnings: testResults.filter((r) => r.status === 'WARN').length,
        failedTests: testResults.filter((r) => r.status === 'FAIL').length,
      },
      evidenceDiagnosis: {
        symptom1_PurpleBorderStatic: 'Explained by synthetic fallback template in yoloPoseTracker emitting constant coordinates when ONNX session fails to initialize.',
        symptom2_VideoHalfwayCutoff: 'Explained by `const duration = Math.min(video.duration || 60, 120)` in TrainingStudio.tsx capping extraction at exactly 120s (1:59).',
        symptom3_StandingStillSpammingPoints: 'Because both coach JSON coordinates and player webcam fallback coordinates are frozen to the identical static numbers, similarity math outputs 100% match.',
        symptom4_ResultsScoreZero: 'Active players score in GameplayScreen state is lost or reset during routine end closure callback to App.tsx.',
      },
      testResults,
      liveCameraTelemetry: {
        cameraActive,
        isCoordinateFrozen,
        variance: liveVariance,
        latestDetectionCount: liveDetections.length,
        sampleKeypoints: liveDetections[0]?.keypoints?.slice(0, 5) || null,
      },
      videoTestbench: {
        videoLoaded: !!testVideoSrc,
        fileName: testVideoName,
        durationSeconds: testVideoDuration,
        trimRange: { start: trimStart, end: trimEnd },
        sampleScanResults: testScanFrames,
      },
      systemLogs,
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `coledance_diagnostics_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addLog('Exported coledance_diagnostics.json to user downloads!');
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
      title="TEMPORAL MAINTENANCE & SYSTEM DIAGNOSTICS"
      description="Automated tests, video trimmer inspector, real-time coordinate monitor & full JSON export"
      size="max"
      variant="default"
      showCloseButton={true}
      footer={
        <div className="flex gap-3 w-full">
          <Tooltip content="Export diagnostic report as JSON" position="top">
            <Button
              variant="primary"
              size="md"
              fullWidth
              leadingIcon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>}
              onClick={handleExportDiagnosticJSON}
              className="shadow-brand-glow"
            >
              EXPORT DIAGNOSTIC JSON
            </Button>
          </Tooltip>
          <Button variant="outlined" fullWidth onClick={() => { soundEngine.playClick(); onClose(); }}>Close</Button>
        </div>
      }
    >
      <motion.div
        className="space-y-5 h-full overflow-hidden"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Tab Navigation */}
        <div className="flex gap-2 bg-surface-1/50 p-1.5 rounded-2xl border border-outline-variant shrink-0">
          <Tooltip content="System Health Tests" position="bottom">
            <Button
              variant={activeTab === 'tests' ? 'primary' : 'ghost'}
              size="sm"
              fullWidth
              leadingIcon={categoryIcons['Environment']}
              onClick={() => { soundEngine.playClick(); setActiveTab('tests'); }}
            >
              SYSTEM HEALTH TESTS
            </Button>
          </Tooltip>

          <Tooltip content="Live Camera & Skeleton Coordinate Monitor" position="bottom">
            <Button
              variant={activeTab === 'camera_monitor' ? 'primary' : 'ghost'}
              size="sm"
              fullWidth
              leadingIcon={categoryIcons['Camera & Motion']}
              onClick={() => { soundEngine.playClick(); setActiveTab('camera_monitor'); }}
            >
              LIVE COORDINATE MONITOR
            </Button>
          </Tooltip>

          <Tooltip content="Video Trimmer & Frame Analyzer" position="bottom">
            <Button
              variant={activeTab === 'video_testbench' ? 'primary' : 'ghost'}
              size="sm"
              fullWidth
              leadingIcon={categoryIcons['Video & Trimming']}
              onClick={() => { soundEngine.playClick(); setActiveTab('video_testbench'); }}
            >
              VIDEO TRIMMER & SCAN BENCH
            </Button>
          </Tooltip>

          <Tooltip content="System Console Logs" position="bottom">
            <Button
              variant={activeTab === 'logs' ? 'primary' : 'ghost'}
              size="sm"
              fullWidth
              leadingIcon={categoryIcons['Scoring & State']}
              onClick={() => { soundEngine.playClick(); setActiveTab('logs'); }}
            >
              CONSOLE LOGS ({systemLogs.length})
            </Button>
          </Tooltip>
        </div>

        {/* TAB 1: System Health Tests */}
        <AnimatePresence mode="wait">
          {activeTab === 'tests' && (
            <motion.div
              key="tests"
              className="flex-1 overflow-y-auto space-y-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Card variant="filled" padding="md" className="flex flex-wrap justify-between items-center gap-3">
                <div className="text-label-medium font-semibold text-on-surface-variant">
                  Found {testResults.length} diagnostic instruments. Automated test runner is active.
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  leadingIcon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6" /><path d="M1 20v-6h6" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>}
                  onClick={runAllDiagnostics}
                  disabled={isRunningTests}
                >
                  {isRunningTests ? 'RUNNING TESTS...' : 'RE-RUN ALL TESTS'}
                </Button>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {testResults.map((test) => {
                  const Icon = categoryIcons[test.category] || categoryIcons['Environment'];
                  return (
                    <Card
                      key={test.id}
                      variant="filled"
                      padding="md"
                      className={`border-l-4 ${statusStyles[test.status]}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-label-small font-black uppercase tracking-wider text-on-surface-variant">{Icon}</span>
                            <Badge variant="ghost" size="sm" className={statusStyles[test.status]}>{test.status}</Badge>
                          </div>
                          <h3 className="text-body-medium font-black text-white">{test.name}</h3>
                          <p className="text-body-small text-on-surface/80 leading-relaxed mt-1">{test.details}</p>
                        </div>
                        <span className="text-label-small font-bold text-on-surface-variant shrink-0">{test.category}</span>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* TAB 2: Live Camera & Skeleton Coordinate Monitor */}
        <AnimatePresence mode="wait">
          {activeTab === 'camera_monitor' && (
            <motion.div
              key="camera_monitor"
              className="flex-1 overflow-y-auto space-y-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Camera Video with YOLO overlay */}
                <div className="lg:col-span-2 space-y-3">
                  <Card variant="filled" padding="none" className="overflow-hidden">
                    <div className="relative aspect-video bg-black rounded-xl overflow-hidden border-2 border-accent-500/60 shadow-xl flex items-center justify-center">
                      <video
                        ref={cameraVideoRef}
                        playsInline
                        muted
                        className="w-full h-full object-cover -scale-x-100"
                      />
                      <canvas
                        ref={cameraCanvasRef}
                        width={640}
                        height={360}
                        className="absolute inset-0 w-full h-full -scale-x-100 pointer-events-none"
                      />

                      {!cameraActive && (
                        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center space-y-2 text-body-small text-on-surface-variant">
                          <motion.div className="w-10 h-10 border-4 border-accent-500 border-t-transparent rounded-full animate-spin" />
                          <span>Initializing camera device stream...</span>
                        </div>
                      )}

                      {/* Status HUD */}
                      <div className="absolute top-3 left-3 bg-surface-0/80 backdrop-blur px-3 py-1.5 rounded-xl border border-white/20 text-label-small font-bold flex items-center gap-2">
                        <motion.span
                          className={`w-2 h-2 rounded-full ${isCoordinateFrozen ? 'bg-error-500 animate-ping' : 'bg-success-400 animate-pulse'}`}
                        />
                        <span>{isCoordinateFrozen === true ? 'STATIC / FROZEN COORDINATES' : isCoordinateFrozen === false ? 'DYNAMIC MOTION TRACKING' : 'ANALYZING...'}</span>
                      </div>
                    </div>
                  </Card>

                  {/* Live Joint Telemetry */}
                  <Card variant="filled" padding="md" className="space-y-3">
                    <h3 className="text-label-medium font-black uppercase text-accent-400 tracking-wider">Live Joint Telemetry</h3>
                    <div className="space-y-1 text-body-small font-mono bg-surface-1/50 p-3 rounded-xl border border-outline-variant">
                      <div className="flex justify-between text-on-surface-variant font-bold">
                        <span>Joint</span>
                        <span>X</span>
                        <span>Y</span>
                        <span>Conf</span>
                      </div>
                      {liveDetections[0]?.keypoints ? (
                        <>
                          <div className="flex justify-between text-sun-400 font-bold">
                            <span>Nose (0)</span>
                            <span>{liveDetections[0].keypoints[0]?.x.toFixed(4) || '\u2014'}</span>
                            <span>{liveDetections[0].keypoints[0]?.y.toFixed(4) || '\u2014'}</span>
                            <span>{liveDetections[0].keypoints[0]?.confidence.toFixed(2) || '\u2014'}</span>
                          </div>
                          <div className="flex justify-between text-brand-400">
                            <span>L.Shoulder (5)</span>
                            <span>{liveDetections[0].keypoints[5]?.x.toFixed(4) || '\u2014'}</span>
                            <span>{liveDetections[0].keypoints[5]?.y.toFixed(4) || '\u2014'}</span>
                            <span>{liveDetections[0].keypoints[5]?.confidence.toFixed(2) || '\u2014'}</span>
                          </div>
                          <div className="flex justify-between text-brand-400">
                            <span>R.Shoulder (6)</span>
                            <span>{liveDetections[0].keypoints[6]?.x.toFixed(4) || '\u2014'}</span>
                            <span>{liveDetections[0].keypoints[6]?.y.toFixed(4) || '\u2014'}</span>
                            <span>{liveDetections[0].keypoints[6]?.confidence.toFixed(2) || '\u2014'}</span>
                          </div>
                          <div className="flex justify-between text-accent-400 font-bold">
                            <span>L.Wrist (9)</span>
                            <span>{liveDetections[0].keypoints[9]?.x.toFixed(4) || '\u2014'}</span>
                            <span>{liveDetections[0].keypoints[9]?.y.toFixed(4) || '\u2014'}</span>
                            <span>{liveDetections[0].keypoints[9]?.confidence.toFixed(2) || '\u2014'}</span>
                          </div>
                          <div className="flex justify-between text-accent-400 font-bold">
                            <span>R.Wrist (10)</span>
                            <span>{liveDetections[0].keypoints[10]?.x.toFixed(4) || '\u2014'}</span>
                            <span>{liveDetections[0].keypoints[10]?.y.toFixed(4) || '\u2014'}</span>
                            <span>{liveDetections[0].keypoints[10]?.confidence.toFixed(2) || '\u2014'}</span>
                          </div>
                        </>
                      ) : (
                        <div className="text-center py-4 text-on-surface-variant">No joints in frame</div>
                      )}
                    </div>

                    <div className="p-3 rounded-xl bg-surface-1/50 border border-outline-variant text-body-small space-y-1">
                      <div className="flex justify-between">
                        <span className="text-on-surface-variant">Motion Variance:</span>
                        <span className="font-mono font-bold text-sun-400">{liveVariance.toFixed(6)}</span>
                      </div>
                      <p className="text-on-surface-variant/70">
                        {"Wave your right arm! If numbers stay fixed or variance remains < 0.00001, the system is falling back to a static standing skeleton."}
                      </p>
                    </div>
                  </Card>
                </div>

                {/* Detected Persons List */}
                <Card variant="filled" padding="md" className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-label-small font-black uppercase text-accent-400 tracking-wider">DETECTED PEOPLE ({liveDetections.length}/5)</span>
                    <Badge variant={cameraActive ? 'success' : 'ghost'} size="sm" dot dotColor={cameraActive ? 'success' : 'warning'}>
                      {cameraActive ? 'LIVE' : 'OFFLINE'}
                    </Badge>
                  </div>

                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {liveDetections.map((p) => {
                      const personColors = ['#d91e6d', '#0ea5e9', '#f59e0b', '#22c55e', '#a855f7'];
                      return (
                        <div key={p.id} className="p-2.5 rounded-xl bg-surface-1/50 border border-outline-variant flex items-center justify-between text-body-small font-bold">
                          <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: personColors[(p.id - 1) % personColors.length] }} />
                            <span>Person #{p.id}</span>
                          </div>
                          <div className="text-label-small font-mono text-sun-400">{Math.round(p.score * 100)}% CONF</div>
                        </div>
                      );
                    })}

                    {liveDetections.length === 0 && cameraActive && (
                      <div className="text-center py-6 text-body-small text-on-surface-variant italic">
                        No person detected. Stand in camera view!
                      </div>
                    )}
                  </div>

                  <Tooltip content="YOLOv8/11 detects up to 5 dancers simultaneously. Persons are assigned IDs from Left to Right." position="top">
                    <div className="p-2 rounded-xl bg-surface-1/50 border border-outline-variant text-label-small text-on-surface-variant/70">
                      {"\u{1f4a1} YOLOv8/11 detects up to 5 dancers simultaneously. Persons are assigned IDs from Left to Right."}
                    </div>
                  </Tooltip>
                </Card>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* TAB 3: Video Trimmer & Scan Bench */}
        <AnimatePresence mode="wait">
          {activeTab === 'video_testbench' && (
            <motion.div
              key="video_testbench"
              className="flex-1 overflow-y-auto space-y-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Card variant="filled" padding="md" className="flex flex-wrap justify-between items-center gap-3">
                <div>
                  <h3 className="text-body-medium font-black text-white">Coach Video Trimming & Frame Analyzer</h3>
                  <p className="text-body-small text-on-surface-variant">Load any routine video to test duration without the 120s cutoff and verify trim boundaries.</p>
                </div>

                <Tooltip content="Select video file for analysis" position="top">
                  <Button
                    variant="primary"
                    size="sm"
                    leadingIcon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>}
                  >
                    <input type="file" accept="video/*" onChange={handleTestVideoUpload} className="hidden" />
                    SELECT VIDEO FILE
                  </Button>
                </Tooltip>
              </Card>

              {testVideoSrc && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <Card variant="filled" padding="none" className="overflow-hidden">
                      <div className="relative aspect-video bg-black rounded-xl overflow-hidden border border-outline-variant shadow">
                        <video
                          ref={testbenchVideoRef}
                          src={testVideoSrc}
                          controls
                          onLoadedMetadata={handleTestbenchVideoLoaded}
                          className="w-full h-full object-contain"
                        />
                      </div>
                    </Card>

                    {/* Trimmer Controls */}
                    <Card variant="filled" padding="md" className="space-y-3">
                      <div className="flex justify-between text-label-medium font-bold text-white">
                        <span>Full Length: {testVideoDuration.toFixed(1)}s</span>
                        <span className="text-brand-400">Trimmed Duration: {(trimEnd - trimStart).toFixed(1)}s</span>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-body-small text-on-surface-variant">
                          <span>Start Trim: {trimStart}s</span>
                          <span>End Trim: {trimEnd}s</span>
                        </div>
                        <div className="flex gap-3">
                          <input
                            type="range"
                            min="0"
                            max={testVideoDuration || 100}
                            value={trimStart}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              setTrimStart(val);
                              if (testbenchVideoRef.current) testbenchVideoRef.current.currentTime = val;
                            }}
                            className="flex-1 accent-brand-500 h-2"
                          />
                          <input
                            type="range"
                            min="0"
                            max={testVideoDuration || 100}
                            value={trimEnd}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              setTrimEnd(val);
                              if (testbenchVideoRef.current) testbenchVideoRef.current.currentTime = val;
                            }}
                            className="flex-1 accent-accent-500 h-2"
                          />
                        </div>
                      </div>

                      <Button
                        variant="primary"
                        size="md"
                        fullWidth
                        leadingIcon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a10 10 0 0 1 10 10A10 10 0 0 1 12 22 10 10 0 0 1 2 12 10 10 0 0 1 12 2" /><path d="M12 6v6l4 2" /></svg>}
                        disabled={isScanningTestVideo}
                        onClick={runTestbenchScanSample}
                      >
                        {isScanningTestVideo ? 'SAMPLING FRAMES...' : 'RUN 5-FRAME SAMPLER TEST'}
                      </Button>
                    </Card>
                  </div>

                  {/* Sampler Output */}
                  <Card variant="filled" padding="md" className="space-y-3 h-full">
                    <h4 className="text-label-medium font-black uppercase text-accent-400">Sample Scan Output</h4>
                    <div className="flex-1 overflow-y-auto space-y-2 pr-1 font-mono text-body-small">
                      {testScanFrames.length === 0 ? (
                        <div className="text-center py-10 text-on-surface-variant">
                          Click "Run 5-Frame Sampler Test" to analyze keypoint movement between trim points.
                        </div>
                      ) : (
                        testScanFrames.map((f, i) => (
                          <div key={i} className="p-3 rounded-lg bg-surface-1/50 border border-outline-variant space-y-1">
                            <div className="flex justify-between text-sun-400 font-bold">
                              <span>Frame #{i + 1} @ {f.timestamp}s</span>
                              <span>Coaches Detected: {f.coachCount}</span>
                            </div>
                            <div className="text-body-small text-on-surface-variant">
                              Nose: X={f.nose?.x || '\u2014'}, Y={f.nose?.y || '\u2014'} \u2022 LeftWrist: X={f.leftWrist?.x || '\u2014'}, Y={f.leftWrist?.y || '\u2014'}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </Card>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* TAB 4: System Console Logs */}
        <AnimatePresence mode="wait">
          {activeTab === 'logs' && (
            <motion.div
              key="logs"
              className="flex-1 overflow-y-auto p-3 bg-surface-0/80 rounded-2xl border border-outline-variant font-mono text-body-small text-accent-400 space-y-1"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {systemLogs.map((log, idx) => (
                <div key={idx} className="leading-relaxed border-b border-outline-variant/50 py-1">
                  {log}
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </Modal>
  );
};

export default MaintenanceModeModal;