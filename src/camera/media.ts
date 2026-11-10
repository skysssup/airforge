/** getUserMedia wrapper that turns browser errors into messages a user can act on. */

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
      'Camera requires HTTPS (or localhost). Keep drawing with touch or the mouse.',
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
      'Camera permission denied. Keep drawing with touch or the mouse.',
    )
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return new CameraError(
      'not_found',
      'No webcam detected on this device. Touch and mouse drawing still work.',
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
      return 'Allow camera access in the browser address bar, or keep drawing with touch or the mouse.'
    case 'not_found':
      return 'Plug in a webcam, or keep drawing with touch or the mouse.'
    case 'in_use':
      return 'Close other apps using the camera, then retry.'
    case 'secure_context':
      return 'Serve the app over HTTPS or localhost.'
    case 'not_supported':
      return 'Switch browsers, or keep drawing with touch or the mouse.'
    default:
      return 'Mouse and touch drawing still work without a camera.'
  }
}
