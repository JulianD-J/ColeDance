import { Song, YoloCoachFrame, YoloKeypoint } from '../types/game';
import { deleteVideoBlob, clearAllVideoBlobs } from '../services/indexedDBStorage';

/**
 * Generates realistic frame-by-frame 17 COCO keypoint trajectories for each coach (1 to 5).
 * Generates natural dance movements synchronized with BPM and dance choreography cycles.
 */
export function generateCoachTrajectories(
  coachCount: number,
  durationSeconds: number,
  bpm: number
): YoloCoachFrame[] {
  const frames: YoloCoachFrame[] = [];
  const fps = 4; // 4 samples per second (every 250ms) for ultra-accurate smooth matching
  const totalFrames = Math.floor(durationSeconds * fps);
  const beatDuration = 60 / bpm;

  for (let f = 0; f < totalFrames; f++) {
    const t = Number((f / fps).toFixed(2));
    const beat = t / beatDuration;
    const phrase = Math.floor(beat / 4); // 4-beat phrase cycles

    for (let c = 0; c < coachCount; c++) {
      // Center X position for coach in multi-coach formation
      const formationOffset = (c - (coachCount - 1) / 2) * 0.12;
      const cx = 0.5 + formationOffset;
      const coachPhase = beat * Math.PI + c * 0.8;

      // Base vertical bounce
      const bounce = Math.abs(Math.sin(coachPhase)) * 0.025;

      // Nose / Head
      const noseX = cx + Math.sin(coachPhase * 0.5) * 0.015;
      const noseY = 0.20 + bounce;

      // Shoulders
      const shoulderY = 0.30 + bounce;
      const lsX = cx - 0.10;
      const rsX = cx + 0.10;

      // Wrists and Elbows choreo variations based on phrase & coach
      let lwX = cx - 0.16;
      let lwY = 0.44;
      let rwX = cx + 0.16;
      let rwY = 0.44;

      const choreoCycle = (phrase + c) % 6;
      if (choreoCycle === 0) {
        // High Hands Wave (Wrists high in the air)
        lwX = cx - 0.16 + Math.sin(coachPhase) * 0.05;
        lwY = 0.14 + Math.cos(coachPhase) * 0.04;
        rwX = cx + 0.16 - Math.sin(coachPhase) * 0.05;
        rwY = 0.14 - Math.cos(coachPhase) * 0.04;
      } else if (choreoCycle === 1) {
        // Disco Point (Right arm points up-right, left on hip)
        rwX = cx + 0.28 + Math.sin(coachPhase * 2) * 0.03;
        rwY = 0.16;
        lwX = cx - 0.09;
        lwY = 0.52;
      } else if (choreoCycle === 2) {
        // Clapping in front of chest
        const clapDistance = Math.abs(Math.sin(coachPhase * 2)) * 0.12;
        lwX = cx - 0.02 - clapDistance;
        lwY = 0.32;
        rwX = cx + 0.02 + clapDistance;
        rwY = 0.32;
      } else if (choreoCycle === 3) {
        // Body Wave / Side sway (Wrists flow horizontally)
        lwX = cx - 0.22 + Math.sin(coachPhase) * 0.06;
        lwY = 0.38 + Math.cos(coachPhase) * 0.04;
        rwX = cx + 0.06 + Math.sin(coachPhase) * 0.06;
        rwY = 0.38 + Math.cos(coachPhase) * 0.04;
      } else if (choreoCycle === 4) {
        // Cross Arms Grooving
        lwX = cx + 0.05 + Math.sin(coachPhase) * 0.02;
        lwY = 0.36;
        rwX = cx - 0.05 - Math.sin(coachPhase) * 0.02;
        rwY = 0.36;
      } else {
        // Side Step Arms Pump
        lwX = cx - 0.24 + Math.sin(coachPhase * 2) * 0.04;
        lwY = 0.40 - Math.abs(Math.sin(coachPhase)) * 0.08;
        rwX = cx + 0.24 + Math.sin(coachPhase * 2) * 0.04;
        rwY = 0.40 - Math.abs(Math.cos(coachPhase)) * 0.08;
      }

      // Elbows positioned midpoint between shoulder and wrist
      const leX = (lsX + lwX) / 2 - 0.03;
      const leY = (shoulderY + lwY) / 2 + 0.02;
      const reX = (rsX + rwX) / 2 + 0.03;
      const reY = (shoulderY + rwY) / 2 + 0.02;

      // Hips
      const hipShift = Math.sin(coachPhase) * 0.03;
      const hipY = 0.55 + bounce * 0.6;
      const lhX = cx - 0.07 + hipShift;
      const rhX = cx + 0.07 + hipShift;

      // Knees & Ankles
      const lkX = lhX - 0.01;
      const lkY = 0.73 + Math.abs(Math.sin(coachPhase)) * 0.03;
      const rkX = rhX + 0.01;
      const rkY = 0.73 + Math.abs(Math.cos(coachPhase)) * 0.03;

      const laX = lkX - 0.01;
      const laY = 0.90;
      const raX = rkX + 0.01;
      const raY = 0.90;

      const keypoints: YoloKeypoint[] = [
        { x: noseX, y: noseY, confidence: 0.96 }, // 0: nose
        { x: noseX - 0.015, y: noseY - 0.01, confidence: 0.95 }, // 1: left_eye
        { x: noseX + 0.015, y: noseY - 0.01, confidence: 0.95 }, // 2: right_eye
        { x: noseX - 0.03, y: noseY, confidence: 0.92 }, // 3: left_ear
        { x: noseX + 0.03, y: noseY, confidence: 0.92 }, // 4: right_ear
        { x: lsX, y: shoulderY, confidence: 0.98 }, // 5: left_shoulder
        { x: rsX, y: shoulderY, confidence: 0.98 }, // 6: right_shoulder
        { x: leX, y: leY, confidence: 0.96 }, // 7: left_elbow
        { x: reX, y: reY, confidence: 0.96 }, // 8: right_elbow
        { x: lwX, y: lwY, confidence: 0.96 }, // 9: left_wrist
        { x: rwX, y: rwY, confidence: 0.96 }, // 10: right_wrist
        { x: lhX, y: hipY, confidence: 0.98 }, // 11: left_hip
        { x: rhX, y: hipY, confidence: 0.98 }, // 12: right_hip
        { x: lkX, y: lkY, confidence: 0.96 }, // 13: left_knee
        { x: rkX, y: rkY, confidence: 0.96 }, // 14: right_knee
        { x: laX, y: laY, confidence: 0.95 }, // 15: left_ankle
        { x: raX, y: raY, confidence: 0.95 }, // 16: right_ankle
      ];

      frames.push({
        timestampSeconds: t,
        coachIndex: c,
        keypoints,
        bbox: {
          x: cx - 0.16,
          y: noseY - 0.05,
          width: 0.32,
          height: 0.78,
        },
      });
    }
  }

  return frames;
}

// All demo songs deleted per user request; catalog is purely user-trained and imported .cdnce routines
export const DEFAULT_SONGS: Song[] = [];

const LOCAL_STORAGE_KEY = 'coledance_custom_trained_songs_v3';
const DELETED_SONGS_KEY = 'coledance_deleted_songs_v1';

export function getDeletedSongIds(): string[] {
  try {
    const raw = localStorage.getItem(DELETED_SONGS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

const BANNED_DEMO_IDS = new Set([
  'dynamite-bts',
  'bluey-theme',
  'good-luck-babe',
  'psycho-red-velvet',
  'apt-rose-bruno',
  'abracadabra-gaga',
  'viva-la-vida-coldplay',
]);

export function getCustomTrainedSongs(): Song[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    const deleted = getDeletedSongIds();
    const songs: Song[] = JSON.parse(raw);
    const cleaned = songs.filter(
      (s) => !deleted.includes(s.id) && !BANNED_DEMO_IDS.has(s.id)
    );
    // If banned items were present, clean localStorage
    if (cleaned.length !== songs.length) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cleaned));
    }
    return cleaned;
  } catch (e) {
    console.error('Error loading custom songs:', e);
    return [];
  }
}

export function saveCustomTrainedSong(song: Song): void {
  try {
    const existing = getCustomTrainedSongs();
    const updated = [song, ...existing.filter((s) => s.id !== song.id)];
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Error saving custom song:', e);
  }
}

export async function deleteCustomTrainedSong(songId: string): Promise<void> {
  try {
    const existing = getCustomTrainedSongs();
    const updated = existing.filter((s) => s.id !== songId);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));

    // Also mark as deleted in the deleted song IDs list so default songs can be deleted too
    const deleted = getDeletedSongIds();
    if (!deleted.includes(songId)) {
      deleted.push(songId);
      localStorage.setItem(DELETED_SONGS_KEY, JSON.stringify(deleted));
    }

    // Delete associated video blob from IndexedDB
    await deleteVideoBlob(songId);
  } catch (e) {
    console.error('Error deleting song:', e);
  }
}

export async function clearAllCustomSongs(): Promise<void> {
  try {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    localStorage.removeItem(DELETED_SONGS_KEY);
    await clearAllVideoBlobs();
  } catch (e) {
    console.error('Error clearing all songs:', e);
  }
}

export function getAllSongs(): Song[] {
  const custom = getCustomTrainedSongs();
  const deleted = getDeletedSongIds();
  const activeDefaults = DEFAULT_SONGS.filter((s) => !deleted.includes(s.id));
  return [...custom, ...activeDefaults];
}