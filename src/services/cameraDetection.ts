/**
 * Hardware Camera Capability Detection
 * Checks if the user device has any physical or virtual video input hardware.
 */

export interface CameraStatus {
  hasCamera: boolean;
  isChecking: boolean;
  error?: string;
  deviceCount: number;
}

let cachedStatus: CameraStatus | null = null;

export async function detectDeviceCamera(): Promise<CameraStatus> {
  if (cachedStatus && !cachedStatus.isChecking) {
    return cachedStatus;
  }

  // Check if MediaDevices API exists
  if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
    cachedStatus = {
      hasCamera: false,
      isChecking: false,
      error: 'MediaDevices API not supported on this browser/platform',
      deviceCount: 0,
    };
    return cachedStatus;
  }

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoInputs = devices.filter((d) => d.kind === 'videoinput');

    cachedStatus = {
      hasCamera: videoInputs.length > 0,
      isChecking: false,
      deviceCount: videoInputs.length,
    };
    return cachedStatus;
  } catch (err: any) {
    console.warn('[CameraDetection] enumerateDevices error:', err);
    // If permission or device query failed, assume camera might exist unless explicit NoDevice
    cachedStatus = {
      hasCamera: false,
      isChecking: false,
      error: err?.message || 'Camera detection error',
      deviceCount: 0,
    };
    return cachedStatus;
  }
}
