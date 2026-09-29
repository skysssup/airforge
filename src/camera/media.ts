/**
 * getUserMedia wrapper with typed permission / device errors.
 * Always keep a mouse fallback — webcam is optional.
 */

export type CameraErrorCode =
  | 'not_supported'
  | 'permission_denied'
  | 'not_found'
  | 'in_use'
  | 'secure_context'
  | 'unknown'

export class CameraError extends Error {
  code: CameraErrorCode
  constructor(code: CameraErrorCode, message: string) {
    super(message)
    this.name = 'CameraError'
    this.code = code
  }
}

export function isCameraSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === 'function'
  )
}

export function isSecureContext(): boolean {
  return typeof window !== 'undefined' && window.isSecureContext
}

export interface CameraStreamOptions {
  width?: number
  height?: number
  facingMode?: 'user' | 'environment'
}

export async function openCamera(
  options: CameraStreamOptions = {},
): Promise<MediaStream> {
  if (!isSecureContext()) {
    throw new CameraError(
      'secure_context',
      'Camera requires HTTPS (or localhost). Use mouse mode instead.',
    )
  }
  if (!isCameraSupported()) {
    throw new CameraError(
      'not_supported',
      'getUserMedia is not available in this browser.',
    )
  }

  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: options.facingMode ?? 'user',
        width: { ideal: options.width ?? 1280 },
        height: { ideal: options.height ?? 720 },
      },
    })
  } catch (err) {
    throw mapCameraError(err)
  }
}

export function stopCamera(stream: MediaStream | null): void {
  if (!stream) return
  for (const track of stream.getTracks()) {
    track.stop()
  }
}

function mapCameraError(err: unknown): CameraError {
  const name = err instanceof DOMException ? err.name : ''
  const msg = err instanceof Error ? err.message : String(err)
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return new CameraError(
      'permission_denied',
      'Camera permission denied. You can keep using mouse drawing.',
    )
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return new CameraError(
      'not_found',
      'No webcam detected on this device. Mouse mode still works.',
    )
  }
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return new CameraError(
      'in_use',
      'Camera is already in use by another application.',
    )
  }
  return new CameraError('unknown', msg || 'Could not open camera.')
}

export function cameraErrorHint(code: CameraErrorCode): string {
  switch (code) {
    case 'permission_denied':
      return 'Allow camera access in the browser address bar, or continue with mouse.'
    case 'not_found':
      return 'Plug in a webcam or keep drawing with the mouse.'
    case 'in_use':
      return 'Close other apps using the camera, then retry.'
    case 'secure_context':
      return 'Serve the app over HTTPS or localhost.'
    case 'not_supported':
      return 'Switch browsers or use mouse drawing.'
    default:
      return 'Fall back to mouse drawing — the hero demo does not need a camera.'
  }
}
