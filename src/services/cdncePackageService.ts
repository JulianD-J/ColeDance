import JSZip from 'jszip';
import { Song } from '../types/game';
import { getVideoBlob, storeVideoBlob } from './indexedDBStorage';
import { saveCustomTrainedSong } from '../data/songsData';

/**
 * Service to package and unpack .cdnce dance routine archives.
 * A .cdnce package is a standard ZIP archive containing:
 * - routine.json: Complete choreography coordinates, BPM, duration, coaches & metadata
 * - video.mp4 (or video.webm): Original high-resolution video maintaining full quality
 */

export interface ExportCdnceResult {
  blob: Blob;
  filename: string;
}

export async function exportCdncePackage(song: Song): Promise<ExportCdnceResult> {
  const zip = new JSZip();

  // 1. Fetch original high-resolution video blob from IndexedDB if available
  try {
    const videoBlob = await getVideoBlob(song.id);
    if (videoBlob) {
      const mime = videoBlob.type || 'video/mp4';
      const ext = mime.includes('webm') ? 'webm' : 'mp4';
      // Use STORE (no recompression) for video to keep full resolution and speed up export
      zip.file(`video.${ext}`, videoBlob, { compression: 'STORE' });
    }
  } catch (err) {
    console.warn('[CDNCE Export] Could not retrieve stored video blob:', err);
  }

  // 2. Format choreography and metadata
  const routinePayload = {
    format: 'cdnce',
    formatVersion: '1.0',
    app: 'ColeDance 2026',
    exportedAt: new Date().toISOString(),
    song: {
      ...song,
      isCustomTrained: true,
    },
  };

  zip.file('routine.json', JSON.stringify(routinePayload, null, 2));

  // 3. Compile the .cdnce package
  const zipBlob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/octet-stream',
  });

  const cleanTitle = (song.title || 'routine').replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanArtist = (song.artist || 'artist').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `${cleanTitle}_${cleanArtist}.cdnce`;

  return { blob: zipBlob, filename };
}

export function downloadCdnceBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export async function importCdncePackage(file: File | Blob): Promise<Song> {
  const zip = await JSZip.loadAsync(file);

  // 1. Find routine.json
  const jsonEntry =
    zip.file('routine.json') ||
    Object.values(zip.files).find((f) => !f.dir && f.name.toLowerCase().endsWith('.json'));

  if (!jsonEntry) {
    throw new Error('Invalid .cdnce file: Could not find routine.json inside archive.');
  }

  const jsonContent = await jsonEntry.async('text');
  const parsed = JSON.parse(jsonContent);
  const songData: Song = parsed.song || parsed;

  if (!songData.title) {
    throw new Error('Invalid .cdnce routine metadata: missing song title.');
  }

  // Generate safe unique ID to avoid overwriting existing songs with the same name
  const uniqueId = `custom-cdnce-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const importedSong: Song = {
    ...songData,
    id: uniqueId,
    isCustomTrained: true,
  };

  // 2. Locate video inside archive
  const videoEntry = Object.values(zip.files).find(
    (f) =>
      !f.dir &&
      (f.name.toLowerCase().endsWith('.mp4') ||
        f.name.toLowerCase().endsWith('.webm') ||
        f.name.toLowerCase().endsWith('.mkv') ||
        f.name.toLowerCase().startsWith('video.'))
  );

  if (videoEntry) {
    const videoBlob = await videoEntry.async('blob');
    await storeVideoBlob(importedSong.id, videoBlob);
  }

  // 3. Persist imported routine into library
  saveCustomTrainedSong(importedSong);

  return importedSong;
}
