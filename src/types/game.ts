export type ScreenId = 'home' | 'songs' | 'coaches' | 'gameplay' | 'results' | 'training';

export type TargetPoseType =
  | 'RAISE_HANDS'
  | 'SIDE_STEP'
  | 'SPIN_AROUND'
  | 'CLAP_NOW'
  | 'HIP_SHAKE'
  | 'CROSS_ARMS'
  | 'JUMP_WAVE'
  | 'DISCO_POINT'
  | 'BODY_WAVE';

// COCO 17 Keypoints used by YOLOv8-pose / YOLO11-pose
// 0: nose, 1: L eye, 2: R eye, 3: L ear, 4: R ear, 5: L shoulder, 6: R shoulder,
// 7: L elbow, 8: R elbow, 9: L wrist, 10: R wrist, 11: L hip, 12: R hip,
// 13: L knee, 14: R knee, 15: L ankle, 16: R ankle
export interface YoloKeypoint {
  x: number;
  y: number;
  confidence: number;
}

export interface YoloPersonDetection {
  id: number; // Coach/Player index 1 to 5
  bbox: { x: number; y: number; width: number; height: number };
  score: number;
  keypoints: YoloKeypoint[]; // Exactly 17 COCO keypoints
  label: string;
  motionVelocity?: number;
}

export interface YoloCoachFrame {
  timestampSeconds: number;
  coachIndex: number; // 0 to 4 (1 to 5)
  keypoints: YoloKeypoint[];
  bbox: { x: number; y: number; width: number; height: number };
}

export interface PoseKeyframe {
  timestampSeconds: number;
  detectedPose: TargetPoseType;
  armElevation: number; // -1 to 1
  elbowAngleLeft: number;
  elbowAngleRight: number;
  wristDistance: number;
  torsoDisplacementX: number;
  motionVelocity: number;
  landmarksSample?: Array<{ x: number; y: number; z: number }>;
}

export interface Pictogram {
  id: string;
  icon: string; // FontAwesome icon class
  text: string;
  targetPose: TargetPoseType;
  durationSeconds: number;
  targetMetrics?: {
    minVelocity?: number;
    armElevationTarget?: number;
    wristDistTarget?: number;
  };
}

export interface Coach {
  id: string;
  name: string;
  avatarSeed: string;
  routineName: string;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Extreme';
  colorGradient: string;
  coachIndex?: number; // 0..4 corresponding to coach 1..5 in multi-coach video
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  year: number;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Extreme';
  bpm: number;
  durationSeconds: number;
  coverImg: string;
  audioUrl: string;
  videoUrl?: string; // Optional custom video
  coaches: Coach[];
  pictograms?: Pictogram[];
  genre: string;
  mood: string;
  decade: string;
  isPlusVip?: boolean;
  isCustomTrained?: boolean;
  isUnlimitedMode?: boolean; // Unlimited Mode: records & scores EVERY frame movement without relying on pictograms
  unlimitedCoachFrames?: YoloCoachFrame[]; // Frame-by-frame 17-keypoint trajectories for each coach
  detectedCoachCount?: number; // 1 to 5 detected coaches
  trainedKeyframes?: PoseKeyframe[];
}

export type ColeDanceRank = 'Bronze' | 'Silver' | 'Gold' | 'Diamond' | 'Legend';

export interface Player {
  id: string;
  name: string;
  avatarSeed: string;
  color: string;
  score: number;
  stars: number; // 0 to 5, 6=Superstar, 7=Megastar
  lastFeedback: 'PERFECT' | 'YEAH!' | 'SUPER' | 'GOOD' | 'OK' | 'MISS' | 'READY';
  streak: number;
  momentum?: number; // 0 to 100%
  multiplier?: number; // 1, 2, 3, 4
  rank?: ColeDanceRank;
  maxStreak?: number;
  isPhoneController?: boolean;
  isCameraTracked?: boolean;
  assignedCoachIndex?: number; // Which coach (0..4) this player is following
  cameraSlot?: number; // 1..5 for multi-camera player mapping
}

export interface DanceSessionResult {
  song: Song;
  coach: Coach;
  players: Player[];
  highestScore: number;
  totalPerfects: number;
  geminiReview?: string;
  timestamp: number;
}
