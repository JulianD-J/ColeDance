import * as ort from 'onnxruntime-web';
import { YoloPersonDetection, YoloKeypoint, YoloCoachFrame, TargetPoseType } from '../types/game';

// Configure ONNX Runtime Web WASM paths (supports subpath on GitHub Pages)
const baseUrl = import.meta.env.BASE_URL || '/';
ort.env.wasm.wasmPaths = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
ort.env.wasm.numThreads = 1;
ort.env.wasm.simd = false;

// Check if app is running in an iframe
export const isRunningInIframe = (): boolean => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
};

// COCO 17 Keypoint Skeleton connection pairs
export const COCO_POSE_CONNECTIONS: [number, number][] = [
  [0, 1], [0, 2], [1, 3], [2, 4], // Head/Face
  [5, 6], [5, 7], [7, 9], [6, 8], [8, 10], // Shoulders, Elbows, Wrists
  [5, 11], [6, 12], [11, 12], // Torso & Hips
  [11, 13], [13, 15], [12, 14], [14, 16], // Legs & Ankles
];

export const PERSON_COLORS = [
  '#ff1493', // P1: Hot Pink
  '#00d2ff', // P2: Cyan
  '#ffea00', // P3: Electric Yellow
  '#10b981', // P4: Emerald Green
  '#a855f7', // P5: Purple
];

export interface YoloEvaluationResult {
  feedback: 'PERFECT' | 'SUPER' | 'GOOD' | 'OK' | 'MISS';
  scorePoints: number;
  similarityPercentage: number;
  detectedPose: TargetPoseType | 'STATIC' | 'NO_BODY';
  motionVelocity: number;
  statusTip: string;
}

export interface CameraState {
  hasPermission: boolean;
  isActive: boolean;
  error?: string;
  deviceId?: string;
}

export class YoloPoseTracker {
  private session: ort.InferenceSession | null = null;
  private isModelLoading: boolean = false;
  private videoElement: HTMLVideoElement | null = null;
  private canvasElement: HTMLCanvasElement | null = null;
  private canvasCtx: CanvasRenderingContext2D | null = null;

  // Offscreen canvas for letterbox tensor input (preserves aspect ratio)
  private offscreenCanvas: HTMLCanvasElement;
  private offscreenCtx: CanvasRenderingContext2D | null;
  private offscreenWidth = 640;
  private offscreenHeight = 640;

  private isRunning: boolean = false;
  private isInferencing: boolean = false;
  private animFrameId: number | null = null;
  private detectionLoopPromise: Promise<void> | null = null;

  private onMultiPersonDetectionsCallback?: (detections: YoloPersonDetection[]) => void;
  private previousDetectionsMap: Map<number, YoloPersonDetection> = new Map();
  private lastDetections: YoloPersonDetection[] = [];

  private showYoloDebugOverlay: boolean = true;
  private confidenceThreshold: number = 0.35;
  private iouThreshold: number = 0.45;
  private prevFrameData: Uint8ClampedArray | null = null;

  // MediaPipe fallback
  private mpPose: any = null;
  private mpPoseInitialized: boolean = false;
  private useMediaPipe: boolean = false;

  // Camera state tracking
  private cameraState: CameraState = {
    hasPermission: false,
    isActive: false,
  };

  constructor() {
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCanvas.width = this.offscreenWidth;
    this.offscreenCanvas.height = this.offscreenHeight;
    this.offscreenCtx = this.offscreenCanvas.getContext('2d', { willReadFrequently: true });
  }

  private isUsingONNX: boolean = false;

  // Model integrity hash (update when model changes)
  private readonly MODEL_HASH = 'sha256-placeholder'; // Replace with actual hash

  async loadModel(): Promise<boolean> {
    if (this.session) return true;
    if (this.isModelLoading) return false;

    this.isModelLoading = true;
    try {
      const modelUrl = `${baseUrl.replace(/\/$/, '')}/models/yolov8n-pose.onnx`;
      console.log(`[YOLOv8-pose] Fetching model binary ${modelUrl}...`);
      const response = await fetch(modelUrl);
      if (!response.ok) {
        throw new Error(`Model fetch failed with status ${response.status}`);
      }
      const modelBuffer = await response.arrayBuffer();
      
      // TODO: Verify model integrity hash here
      // const hash = await this.computeHash(modelBuffer);
      // if (hash !== this.MODEL_HASH) throw new Error('Model integrity check failed');

      this.session = await ort.InferenceSession.create(modelBuffer, {
        executionProviders: ['wasm'],
        graphOptimizationLevel: 'basic',
      });
      console.log('[YOLOv8-pose] ONNX Model loaded successfully! Inputs:', this.session.inputNames);
      this.isModelLoading = false;
      this.isUsingONNX = true;
      this.useMediaPipe = false;
      return true;
    } catch (err) {
      console.warn('[YOLOv8-pose] ONNX WASM initialization failed, will try MediaPipe:', err);
      this.isModelLoading = false;
      this.isUsingONNX = false;
      // Don't return true here - let initialize() handle MediaPipe init
      return false;
    }
  }

  private async initMediaPipe(): Promise<boolean> {
    if (this.mpPoseInitialized) return !!this.mpPose;
    
    try {
      // Dynamic import to avoid blocking main thread
      const { PoseLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');
      
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm'
      );
      
      this.mpPose = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task',
          delegate: 'GPU', // Use WebGL acceleration
        },
        runningMode: 'VIDEO',
        numPoses: 5,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
        outputSegmentationMasks: false,
      });
      
      this.mpPoseInitialized = true;
      this.useMediaPipe = true;
      console.log('[MediaPipe] PoseLandmarker initialized with GPU delegate');
      return true;
    } catch (err) {
      console.error('[MediaPipe] Failed to initialize:', err);
      this.useMediaPipe = false;
      return false;
    }
  }

  public getIsUsingONNX(): boolean {
    return this.isUsingONNX;
  }

  public getIsUsingMediaPipe(): boolean {
    return this.useMediaPipe;
  }

  public getCameraState(): CameraState {
    return { ...this.cameraState };
  }

  async initialize(videoEl: HTMLVideoElement, canvasEl: HTMLCanvasElement): Promise<boolean> {
    this.videoElement = videoEl;
    this.canvasElement = canvasEl;
    this.canvasCtx = canvasEl.getContext('2d');
    
    // Try ONNX first
    const onnxLoaded = await this.loadModel();
    if (onnxLoaded) return true;
    
    // Fallback to MediaPipe
    console.log('[YOLOv8-pose] Initializing MediaPipe fallback...');
    return this.initMediaPipe();
  }

  async startCamera(deviceId?: string): Promise<boolean> {
    if (!this.videoElement) return false;
    
    try {
      // Request permission explicitly first
      const constraints: MediaStreamConstraints = {
        video: {
          width: { ideal: 640, min: 320, max: 1280 },
          height: { ideal: 480, min: 240, max: 720 },
          facingMode: 'user',
          ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      this.cameraState.hasPermission = true;
      this.cameraState.isActive = true;
      this.cameraState.deviceId = stream.getVideoTracks()[0]?.getSettings().deviceId;
      
      this.videoElement.srcObject = stream;
      await this.videoElement.play();
      
      this.isRunning = true;
      this.startDetectionLoop();
      return true;
    } catch (err: any) {
      console.warn('[YOLOv8-pose] Camera access error:', err);
      this.cameraState.error = err?.message || 'Camera access denied';
      this.cameraState.hasPermission = err.name === 'NotAllowedError' ? false : true;
      this.cameraState.isActive = false;
      return false;
    }
  }

  stopCamera() {
    this.isRunning = false;
    
    // Wait for detection loop to finish
    if (this.detectionLoopPromise) {
      this.detectionLoopPromise.catch(() => {});
      this.detectionLoopPromise = null;
    }
    
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    
    if (this.videoElement && this.videoElement.srcObject) {
      const stream = this.videoElement.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      this.videoElement.srcObject = null;
    }
    
    if (this.canvasCtx && this.canvasElement) {
      this.canvasCtx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
    }
    
    this.cameraState.isActive = false;
    this.lastDetections = [];
    this.previousDetectionsMap.clear();
  }

  async switchCamera(deviceId: string): Promise<boolean> {
    this.stopCamera();
    // Small delay to ensure camera is released
    await new Promise(r => setTimeout(r, 100));
    return this.startCamera(deviceId);
  }

  setShowYoloDebugOverlay(show: boolean) {
    this.showYoloDebugOverlay = show;
  }

  setOnMultiPersonDetections(cb: (detections: YoloPersonDetection[]) => void) {
    this.onMultiPersonDetectionsCallback = cb;
  }

  private startDetectionLoop() {
    let lastInferenceTime = 0;
    const targetIntervalMs = 100; // ~10 FPS for ONNX, MediaPipe can run faster

    const loop = async () => {
      // Exit condition checked FIRST
      if (!this.isRunning || !this.videoElement || !this.canvasElement || !this.canvasCtx) {
        return;
      }

      const now = performance.now();
      const shouldInfer = (
        now - lastInferenceTime >= targetIntervalMs &&
        !this.isInferencing &&
        this.videoElement.readyState >= 2 &&
        !this.videoElement.paused
      );

      if (shouldInfer) {
        lastInferenceTime = now;
        this.isInferencing = true;
        try {
          const detections = await this.detectPeopleInElement(this.videoElement);
          this.lastDetections = detections;
          if (this.onMultiPersonDetectionsCallback) {
            this.onMultiPersonDetectionsCallback(detections);
          }
        } catch (err) {
          console.error('[YOLOv8-pose] Inference error:', err);
        } finally {
          this.isInferencing = false;
        }
      }

      // Always render latest detections smoothly
      if (this.canvasCtx && this.canvasElement) {
        this.renderDetections(this.lastDetections, this.canvasCtx, this.canvasElement.width, this.canvasElement.height);
      }

      // Only schedule next frame if still running
      if (this.isRunning) {
        this.animFrameId = requestAnimationFrame(loop);
      }
    };

    this.detectionLoopPromise = (async () => {
      this.animFrameId = requestAnimationFrame(loop);
    })();
  }

  /**
   * Run YOLOv8-pose ONNX inference or MediaPipe on an HTMLVideoElement
   */
  public async detectPeopleInElement(
    sourceEl: HTMLVideoElement | HTMLCanvasElement
  ): Promise<YoloPersonDetection[]> {
    if (!this.offscreenCtx) return [];

    const srcWidth = 'videoWidth' in sourceEl ? sourceEl.videoWidth || 640 : sourceEl.width || 640;
    const srcHeight = 'videoHeight' in sourceEl ? sourceEl.videoHeight || 480 : sourceEl.height || 480;

    // Use MediaPipe if available (better for iframe, runs on GPU)
    if (this.useMediaPipe && this.mpPose && 'videoWidth' in sourceEl) {
      return this.detectWithMediaPipe(sourceEl as HTMLVideoElement, srcWidth, srcHeight);
    }

    // ONNX path with proper letterboxing (preserves aspect ratio)
    if (this.session && this.isUsingONNX) {
      return this.detectWithONNX(sourceEl, srcWidth, srcHeight);
    }

    // No valid detector available - return empty (NO fake keypoints!)
    console.warn('[YOLOv8-pose] No pose detector available');
    return [];
  }

  /**
   * MediaPipe detection - preserves aspect ratio, runs on GPU
   */
  private async detectWithMediaPipe(
    video: HTMLVideoElement,
    srcWidth: number,
    srcHeight: number
  ): Promise<YoloPersonDetection[]> {
    if (!this.mpPose) return [];

    try {
      const timestamp = performance.now();
      const mpResult = this.mpPose.detectForVideo(video, timestamp);
      
      if (!mpResult.landmarks || mpResult.landmarks.length === 0) {
        this.previousDetectionsMap.clear();
        return [];
      }

      const detections: YoloPersonDetection[] = mpResult.landmarks.map((landmarks: any[], idx: number) => {
        // MediaPipe returns 33 landmarks, we need COCO 17
        const cocoKeypoints = this.convertMediaPipeToCOCO(landmarks, srcWidth, srcHeight);
        
        // Calculate bbox from landmarks
        let minX = 1, minY = 1, maxX = 0, maxY = 0;
        for (const kp of cocoKeypoints) {
          if (kp.confidence > 0.3) {
            minX = Math.min(minX, kp.x);
            minY = Math.min(minY, kp.y);
            maxX = Math.max(maxX, kp.x);
            maxY = Math.max(maxY, kp.y);
          }
        }
        
        const padding = 0.1;
        const bbox = {
          x: Math.max(0, minX - padding),
          y: Math.max(0, minY - padding),
          width: Math.min(1, maxX - minX + padding * 2),
          height: Math.min(1, maxY - minY + padding * 2),
        };

        const prev = this.previousDetectionsMap.get(idx + 1);
        let motionVelocity = 0;
        if (prev && prev.keypoints.length === 17) {
          let diffSum = 0, count = 0;
          for (let k = 0; k < 17; k++) {
            const kp = cocoKeypoints[k];
            const pkp = prev.keypoints[k];
            if (kp.confidence > 0.25 && pkp.confidence > 0.25) {
              diffSum += Math.hypot(kp.x - pkp.x, kp.y - pkp.y);
              count++;
            }
          }
          if (count > 0) motionVelocity = diffSum / count;
        }

        const detection: YoloPersonDetection = {
          id: idx + 1,
          bbox,
          score: 0.9,
          keypoints: cocoKeypoints,
          label: `Dancer #${idx + 1} (90%)`,
          motionVelocity,
        };

        this.previousDetectionsMap.set(idx + 1, detection);
        return detection;
      });

      // Sort left to right for consistent mapping
      detections.sort((a, b) => a.bbox.x - b.bbox.x);
      return detections;
    } catch (err) {
      console.error('[MediaPipe] Detection error:', err);
      return [];
    }
  }

  /**
   * Convert MediaPipe 33 landmarks to COCO 17 format
   */
  private convertMediaPipeToCOCO(landmarks: any[], srcWidth: number, srcHeight: number): YoloKeypoint[] {
    // MediaPipe pose landmark indices mapping to COCO
    // MP: 0=nose, 2=left_eye_inner, 5=right_eye_inner, 7=left_ear, 8=right_ear
    //     11=left_shoulder, 12=right_shoulder, 13=left_elbow, 14=right_elbow
    //     15=left_wrist, 16=right_wrist, 23=left_hip, 24=right_hip
    //     25=left_knee, 26=right_knee, 27=left_ankle, 28=right_ankle
    
    const mpToCoco = [0, 2, 5, 7, 8, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];
    
    return mpToCoco.map((mpIdx, i) => {
      const lm = landmarks[mpIdx];
      if (!lm) return { x: 0, y: 0, confidence: 0 };
      return {
        x: lm.x,
        y: lm.y,
        confidence: lm.visibility ?? lm.presence ?? 0.5,
      };
    });
  }

  /**
   * ONNX detection with proper letterboxing (preserves aspect ratio)
   */
  private async detectWithONNX(
    sourceEl: HTMLVideoElement | HTMLCanvasElement,
    srcWidth: number,
    srcHeight: number
  ): Promise<YoloPersonDetection[]> {
    if (!this.offscreenCtx || !this.session) return [];

    // Calculate letterbox dimensions to preserve aspect ratio
    const scale = Math.min(this.offscreenWidth / srcWidth, this.offscreenHeight / srcHeight);
    const drawWidth = srcWidth * scale;
    const drawHeight = srcHeight * scale;
    const offsetX = (this.offscreenWidth - drawWidth) / 2;
    const offsetY = (this.offscreenHeight - drawHeight) / 2;

    // Clear and draw with letterboxing
    this.offscreenCtx.fillStyle = '#000000';
    this.offscreenCtx.fillRect(0, 0, this.offscreenWidth, this.offscreenHeight);
    this.offscreenCtx.drawImage(sourceEl, offsetX, offsetY, drawWidth, drawHeight);
    
    const imageData = this.offscreenCtx.getImageData(0, 0, this.offscreenWidth, this.offscreenHeight);
    const rgba = imageData.data;

    try {
      // Build NCHW float32 tensor [1, 3, 640, 640] normalized to [0, 1]
      const float32Data = new Float32Array(1 * 3 * 640 * 640);
      const planeSize = 640 * 640;

      for (let i = 0; i < planeSize; i++) {
        float32Data[i] = rgba[i * 4] / 255.0; // Red plane
        float32Data[planeSize + i] = rgba[i * 4 + 1] / 255.0; // Green plane
        float32Data[planeSize * 2 + i] = rgba[i * 4 + 2] / 255.0; // Blue plane
      }

      const inputTensor = new ort.Tensor('float32', float32Data, [1, 3, 640, 640]);
      const inputName = this.session.inputNames[0] || 'images';
      const feeds: Record<string, ort.Tensor> = { [inputName]: inputTensor };

      const output = await this.session.run(feeds);
      const outputName = this.session.outputNames[0] || 'output0';
      const outputData = output[outputName].data as Float32Array;

      // Need to map detections back from letterboxed coords to original
      return this.postprocessYoloOutput(outputData, srcWidth, srcHeight, scale, offsetX, offsetY);
    } catch (err) {
      console.warn('[YOLOv8-pose] ONNX run error:', err);
      this.isUsingONNX = false;
      return [];
    }
  }

  /**
   * Postprocess raw YOLOv8-pose output tensor [1, 56, 8400] with NMS
   * Now handles letterbox coordinate mapping
   */
  private postprocessYoloOutput(
    data: Float32Array,
    srcWidth: number,
    srcHeight: number,
    scale: number = 1,
    offsetX: number = 0,
    offsetY: number = 0
  ): YoloPersonDetection[] {
    const numAnchors = 8400;
    const candidates: Array<{
      box: { x: number; y: number; width: number; height: number };
      score: number;
      keypoints: YoloKeypoint[];
    }> = [];

    for (let a = 0; a < numAnchors; a++) {
      const score = data[4 * numAnchors + a];
      if (score > this.confidenceThreshold) {
        // Coordinates are in 640x640 letterboxed space
        const cx = data[0 * numAnchors + a] / 640;
        const cy = data[1 * numAnchors + a] / 640;
        const w = data[2 * numAnchors + a] / 640;
        const h = data[3 * numAnchors + a] / 640;

        // Map from letterboxed coordinates back to original image coordinates
        let x = (cx - w / 2 - offsetX / 640) / scale;
        let y = (cy - h / 2 - offsetY / 640) / scale;
        x = Math.max(0, Math.min(1, x));
        y = Math.max(0, Math.min(1, y));
        const normW = Math.max(0, Math.min(1, w / scale));
        const normH = Math.max(0, Math.min(1, h / scale));

        const keypoints: YoloKeypoint[] = [];
        for (let k = 0; k < 17; k++) {
          const kx = data[(5 + k * 3) * numAnchors + a] / 640;
          const ky = data[(5 + k * 3 + 1) * numAnchors + a] / 640;
          const kconf = data[(5 + k * 3 + 2) * numAnchors + a];
          
          // Map keypoints from letterboxed space
          let mkx = (kx - offsetX / 640) / scale;
          let mky = (ky - offsetY / 640) / scale;
          mkx = Math.max(0, Math.min(1, mkx));
          mky = Math.max(0, Math.min(1, mky));
          
          keypoints.push({ x: mkx, y: mky, confidence: kconf });
        }

        candidates.push({
          box: { x, y, width: normW, height: normH },
          score,
          keypoints,
        });
      }
    }

    if (candidates.length === 0) {
      this.previousDetectionsMap.clear();
      return [];
    }

    candidates.sort((a, b) => b.score - a.score);

    const picked: typeof candidates = [];
    const maxPersons = 5;

    for (const cand of candidates) {
      if (picked.length >= maxPersons) break;
      let keep = true;
      for (const p of picked) {
        if (this.calculateIoU(cand.box, p.box) > this.iouThreshold) {
          keep = false;
          break;
        }
      }
      if (keep) picked.push(cand);
    }

    picked.sort((a, b) => a.box.x - b.box.x);

    return picked.map((item, idx) => {
      const personId = idx + 1;
      const prev = this.previousDetectionsMap.get(personId);
      let motionVelocity = 0;

      if (prev && prev.keypoints && prev.keypoints.length === 17) {
        let diffSum = 0, count = 0;
        for (let k = 0; k < 17; k++) {
          const kp = item.keypoints[k];
          const pkp = prev.keypoints[k];
          if (kp && pkp && kp.confidence > 0.25 && pkp.confidence > 0.25) {
            diffSum += Math.hypot(kp.x - pkp.x, kp.y - pkp.y);
            count++;
          }
        }
        if (count > 0) motionVelocity = diffSum / count;
      }

      const res: YoloPersonDetection = {
        id: personId,
        bbox: item.box,
        score: item.score,
        keypoints: item.keypoints,
        label: `Dancer #${personId} (${Math.round(item.score * 100)}%)`,
        motionVelocity,
      };

      this.previousDetectionsMap.set(personId, res);
      return res;
    });
  }

  /**
   * Render compact Kinect-style dancer silhouette HUD
   */
  public renderKinectSkeleton(
    person: YoloPersonDetection | null,
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    colorHex: string = '#00ff88'
  ) {
    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = 'rgba(8, 12, 24, 0.70)';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = colorHex;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = colorHex;
    ctx.shadowBlur = 8;
    ctx.strokeRect(1, 1, width - 2, height - 2);
    ctx.shadowBlur = 0;

    if (!person || !person.keypoints || person.keypoints.length < 17) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.font = 'bold 9px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('STEP IN VIEW', width / 2, height / 2 + 3);
      return;
    }

    const kps = person.keypoints;
    const scaleX = width;
    const scaleY = height;

    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = colorHex;
    ctx.shadowColor = colorHex;
    ctx.shadowBlur = 6;

    for (const [p1Idx, p2Idx] of COCO_POSE_CONNECTIONS) {
      const p1 = kps[p1Idx];
      const p2 = kps[p2Idx];
      if (p1 && p2 && p1.confidence > 0.25 && p2.confidence > 0.25) {
        ctx.beginPath();
        ctx.moveTo(p1.x * scaleX, p1.y * scaleY);
        ctx.lineTo(p2.x * scaleX, p2.y * scaleY);
        ctx.stroke();
      }
    }

    const nose = kps[0];
    if (nose && nose.confidence > 0.25) {
      ctx.fillStyle = colorHex;
      ctx.beginPath();
      ctx.arc(nose.x * scaleX, nose.y * scaleY, 4.5, 0, 2 * Math.PI);
      ctx.fill();
    }

    ctx.fillStyle = '#ffffff';
    for (let i = 5; i < 17; i++) {
      const kp = kps[i];
      if (kp && kp.confidence > 0.25) {
        ctx.beginPath();
        ctx.arc(kp.x * scaleX, kp.y * scaleY, 2.2, 0, 2 * Math.PI);
        ctx.fill();
      }
    }
    ctx.shadowBlur = 0;
  }

  private calculateIoU(
    b1: { x: number; y: number; width: number; height: number },
    b2: { x: number; y: number; width: number; height: number }
  ): number {
    const x1 = Math.max(b1.x, b2.x);
    const y1 = Math.max(b1.y, b2.y);
    const x2 = Math.min(b1.x + b1.width, b2.x + b2.width);
    const y2 = Math.min(b1.y + b1.height, b2.y + b2.height);

    const interArea = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
    const b1Area = b1.width * b1.height;
    const b2Area = b2.width * b2.height;
    const unionArea = b1Area + b2Area - interArea;

    return unionArea > 0 ? interArea / unionArea : 0;
  }

  /**
   * Render real YOLOv8 bounding boxes, confidence tags, and 17 COCO keypoint skeleton
   */
  public renderDetections(
    detections: YoloPersonDetection[],
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ) {
    ctx.save();
    ctx.clearRect(0, 0, width, height);

    if (!detections || detections.length === 0) {
      ctx.restore();
      return;
    }

    detections.forEach((person) => {
      const color = PERSON_COLORS[(person.id - 1) % PERSON_COLORS.length];
      const bx = person.bbox.x * width;
      const by = person.bbox.y * height;
      const bw = person.bbox.width * width;
      const bh = person.bbox.height * height;

      if (this.showYoloDebugOverlay) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.setLineDash([6, 3]);
        ctx.strokeRect(bx, by, bw, bh);
        ctx.setLineDash([]);

        const tagText = `COACH/DANCER #${person.id} (${Math.round(person.score * 100)}%)`;
        ctx.fillStyle = color;
        ctx.fillRect(bx, Math.max(0, by - 22), 170, 22);
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 10px system-ui, sans-serif';
        ctx.fillText(tagText, bx + 5, Math.max(14, by - 7));
      }

      const kps = person.keypoints;
      COCO_POSE_CONNECTIONS.forEach(([i1, i2]) => {
        const kp1 = kps[i1];
        const kp2 = kps[i2];
        if (kp1 && kp2 && kp1.confidence > 0.3 && kp2.confidence > 0.3) {
          ctx.beginPath();
          ctx.moveTo(kp1.x * width, kp1.y * height);
          ctx.lineTo(kp2.x * width, kp2.y * height);
          ctx.strokeStyle = color;
          ctx.lineWidth = 3.5;
          ctx.stroke();
        }
      });

      kps.forEach((kp) => {
        if (kp.confidence > 0.3) {
          ctx.beginPath();
          ctx.arc(kp.x * width, kp.y * height, 4, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      });
    });

    ctx.restore();
  }

  /**
   * Render Coach Target Ghost Skeleton for live visual matching
   */
  public renderCoachSkeleton(
    keypoints: YoloKeypoint[],
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    color = '#ffd700',
    alpha = 0.85
  ) {
    if (!keypoints || keypoints.length < 17) return;

    ctx.save();
    ctx.globalAlpha = alpha;

    COCO_POSE_CONNECTIONS.forEach(([i1, i2]) => {
      const kp1 = keypoints[i1];
      const kp2 = keypoints[i2];
      if (kp1 && kp2 && kp1.confidence > 0.2 && kp2.confidence > 0.2) {
        ctx.beginPath();
        ctx.moveTo(kp1.x * width, kp1.y * height);
        ctx.lineTo(kp2.x * width, kp2.y * height);
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.shadowColor = color;
        ctx.shadowBlur = 6;
        ctx.stroke();
      }
    });

    keypoints.forEach((kp) => {
      if (kp.confidence > 0.2) {
        ctx.beginPath();
        ctx.arc(kp.x * width, kp.y * height, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    });

    ctx.restore();
  }

  /**
   * Evaluate a dancer's 17 COCO keypoints against target coach keypoints using OKS accuracy
   */
  public evaluateCoachVsPlayerKeypoints(
    playerKeypoints: YoloKeypoint[],
    coachKeypoints: YoloKeypoint[],
    motionVelocity?: number
  ): YoloEvaluationResult {
    return this.evaluateUnlimitedAccuracy(playerKeypoints, coachKeypoints, motionVelocity);
  }

  public evaluateUnlimitedAccuracy(
    playerKeypoints: YoloKeypoint[],
    coachKeypoints: YoloKeypoint[],
    motionVelocity?: number
  ): YoloEvaluationResult {
    if (!playerKeypoints || playerKeypoints.length < 17 || !coachKeypoints || coachKeypoints.length < 17) {
      return {
        feedback: 'MISS',
        scorePoints: 0,
        similarityPercentage: 0,
        detectedPose: 'NO_BODY',
        motionVelocity: 0,
        statusTip: 'No dancer in frame. Step into camera view!',
      };
    }

    if (motionVelocity !== undefined && motionVelocity < 0.007) {
      return {
        feedback: 'MISS',
        scorePoints: 0,
        similarityPercentage: 5,
        detectedPose: 'STATIC',
        motionVelocity,
        statusTip: 'Standing still! Follow and dance with the coach movement!',
      };
    }

    const validKeypoints = playerKeypoints.filter((k) => k.confidence > 0.3);
    if (validKeypoints.length < 5) {
      return {
        feedback: 'MISS',
        scorePoints: 0,
        similarityPercentage: 0,
        detectedPose: 'NO_BODY',
        motionVelocity: 0,
        statusTip: 'Only face/head detected! Step back so your arms & shoulders are visible.',
      };
    }

    let totalScoreSum = 0;
    let matchCount = 0;

    for (let i = 0; i < 17; i++) {
      const pkp = playerKeypoints[i];
      const ckp = coachKeypoints[i];
      if (pkp && ckp && pkp.confidence > 0.3 && ckp.confidence > 0.3) {
        const dx = pkp.x - ckp.x;
        const dy = pkp.y - ckp.y;
        const dist = Math.hypot(dx, dy);
        const jointSimilarity = Math.exp(-dist * 8);
        totalScoreSum += jointSimilarity;
        matchCount++;
      }
    }

    const similarityRatio = matchCount > 0 ? totalScoreSum / matchCount : 0;
    const similarityPercentage = Math.round(similarityRatio * 100);

    if (similarityPercentage >= 80) {
      return { feedback: 'PERFECT', scorePoints: 90, similarityPercentage, detectedPose: 'RAISE_HANDS', motionVelocity: motionVelocity ?? 0.4, statusTip: `UNLIMITED ACCURACY: ${similarityPercentage}%! PERFECT coach mirror!` };
    } else if (similarityPercentage >= 65) {
      return { feedback: 'SUPER', scorePoints: 70, similarityPercentage, detectedPose: 'RAISE_HANDS', motionVelocity: motionVelocity ?? 0.3, statusTip: `UNLIMITED ACCURACY: ${similarityPercentage}%! GREAT posture!` };
    } else if (similarityPercentage >= 45) {
      return { feedback: 'GOOD', scorePoints: 45, similarityPercentage, detectedPose: 'SIDE_STEP', motionVelocity: motionVelocity ?? 0.2, statusTip: `UNLIMITED ACCURACY: ${similarityPercentage}%! Follow coach movements!` };
    } else if (similarityPercentage >= 25) {
      return { feedback: 'OK', scorePoints: 20, similarityPercentage, detectedPose: 'SIDE_STEP', motionVelocity: motionVelocity ?? 0.15, statusTip: `UNLIMITED ACCURACY: ${similarityPercentage}%. Align arms closer to coach.` };
    }

    return { feedback: 'MISS', scorePoints: 0, similarityPercentage, detectedPose: 'STATIC', motionVelocity: motionVelocity ?? 0.05, statusTip: 'UNLIMITED ACCURACY: Below 25%. Follow the coach routine on screen!' };
  }

  public evaluateStandardPictogramPose(
    person: YoloPersonDetection,
    targetPose: TargetPoseType
  ): YoloEvaluationResult {
    const kps = person.keypoints;
    if (!kps || kps.length < 17) {
      return { feedback: 'MISS', scorePoints: 0, similarityPercentage: 0, detectedPose: 'NO_BODY', motionVelocity: 0, statusTip: 'Step in front of camera so your full body is visible!' };
    }

    const motion = person.motionVelocity || 0;
    const nose = kps[0];
    const ls = kps[5];
    const rs = kps[6];
    const lw = kps[9];
    const rw = kps[10];
    const lh = kps[11];
    const rh = kps[12];

    if (motion < 0.007) {
      return { feedback: 'MISS', scorePoints: 0, similarityPercentage: 10, detectedPose: 'STATIC', motionVelocity: motion, statusTip: 'You are standing still! Groove and move with the music!' };
    }

    const shouldersMidY = (ls.y + rs.y) / 2;
    const bothHandsAboveShoulders = lw.y < shouldersMidY && rw.y < shouldersMidY;
    const bothHandsAboveNose = lw.y < nose.y && rw.y < nose.y;
    const oneHandHigh = lw.y < nose.y || rw.y < nose.y;
    const wristDist = Math.hypot(lw.x - rw.x, lw.y - rw.y);

    let matchQuality: 'PERFECT' | 'SUPER' | 'GOOD' | 'OK' | 'MISS' = 'GOOD';
    let pts = 160;
    let sim = 65;
    let poseStatus = `${targetPose} detected!`;

    switch (targetPose) {
      case 'RAISE_HANDS':
      case 'JUMP_WAVE':
        if (bothHandsAboveNose && motion >= 0.015) { matchQuality = 'PERFECT'; pts = 90; sim = 95; poseStatus = 'PERFECT! Hands raised high in the air!'; }
        else if (bothHandsAboveShoulders) { matchQuality = 'SUPER'; pts = 70; sim = 82; poseStatus = 'SUPER! Great arm elevation!'; }
        else if (oneHandHigh) { matchQuality = 'GOOD'; pts = 45; sim = 65; poseStatus = 'GOOD! Raise both arms higher!'; }
        else { matchQuality = 'OK'; pts = 20; sim = 40; poseStatus = 'OK! Follow the Raise Hands pictogram!'; }
        break;
      case 'CLAP_NOW':
        if (wristDist < 0.20 && motion >= 0.012) { matchQuality = 'PERFECT'; pts = 90; sim = 95; poseStatus = 'PERFECT! Fast energetic clap on beat!'; }
        else if (wristDist < 0.32) { matchQuality = 'SUPER'; pts = 70; sim = 80; poseStatus = 'SUPER! Bring hands together to clap!'; }
        else { matchQuality = 'OK'; pts = 20; sim = 45; poseStatus = 'OK! Clap your hands together!'; }
        break;
      case 'DISCO_POINT':
        if (oneHandHigh && (lw.y > shouldersMidY || rw.y > shouldersMidY)) { matchQuality = 'PERFECT'; pts = 90; sim = 92; poseStatus = 'PERFECT! Disco finger pointed up high!'; }
        else if (oneHandHigh) { matchQuality = 'SUPER'; pts = 70; sim = 78; poseStatus = 'SUPER! Nice disco point!'; }
        else { matchQuality = 'GOOD'; pts = 45; sim = 60; poseStatus = 'GOOD! Point high diagonally to the sky!'; }
        break;
      case 'SIDE_STEP': case 'HIP_SHAKE': case 'BODY_WAVE':
        if (motion >= 0.022) { matchQuality = 'PERFECT'; pts = 90; sim = 92; poseStatus = 'PERFECT! Great groove & rhythmic motion!'; }
        else if (motion >= 0.012) { matchQuality = 'SUPER'; pts = 70; sim = 78; poseStatus = 'SUPER! Keep the body moving with the beat!'; }
        else { matchQuality = 'GOOD'; pts = 45; sim = 55; poseStatus = 'GOOD! Step and sway to the side!'; }
        break;
      case 'SPIN_AROUND':
        if (motion >= 0.028) { matchQuality = 'PERFECT'; pts = 90; sim = 95; poseStatus = 'PERFECT! Fantastic spin!'; }
        else { matchQuality = 'SUPER'; pts = 70; sim = 75; poseStatus = 'SUPER! Keep spinning with the beat!'; }
        break;
      case 'CROSS_ARMS':
        if (wristDist < 0.28 && lw.y < lh.y && rw.y < rh.y) { matchQuality = 'PERFECT'; pts = 90; sim = 90; poseStatus = 'PERFECT! Crisp crossed arms!'; }
        else { matchQuality = 'GOOD'; pts = 45; sim = 65; poseStatus = 'GOOD! Cross arms across chest!'; }
        break;
      default:
        if (motion >= 0.018) { matchQuality = 'PERFECT'; pts = 90; sim = 90; poseStatus = 'PERFECT! Amazing rhythm!'; }
        else { matchQuality = 'GOOD'; pts = 45; sim = 60; poseStatus = 'GOOD! Follow the coach!'; }
        break;
    }

    return { feedback: matchQuality, scorePoints: pts, similarityPercentage: sim, detectedPose: targetPose, motionVelocity: motion, statusTip: poseStatus };
  }

  public async analyzeVideoFrameForCoaches(
    video: HTMLVideoElement,
    timestampSeconds: number
  ): Promise<{ coachCount: number; coachFrames: YoloCoachFrame[]; detections: YoloPersonDetection[] }> {
    const detections = await this.detectPeopleInElement(video);
    const coachFrames: YoloCoachFrame[] = detections.map((d, idx) => ({
      timestampSeconds,
      coachIndex: idx,
      keypoints: d.keypoints,
      bbox: d.bbox,
    }));

    return { coachCount: Math.max(1, detections.length), coachFrames, detections };
  }
}

export const yoloTracker = new YoloPoseTracker();