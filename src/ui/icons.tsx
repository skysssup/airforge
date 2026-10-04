/** 16×16 line icons drawn for AirForge's 1.5px hairline style. They inherit currentColor. */

import type { ReactNode } from 'react'

function Icon({ children, filled = false }: { children: ReactNode; filled?: boolean }) {
  return (
    <svg
      className="icon"
      viewBox="0 0 16 16"
      width="16"
      height="16"
      fill={filled ? 'currentColor' : 'none'}
      stroke={filled ? 'none' : 'currentColor'}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  )
}

export const PlayIcon = () => <Icon filled><path d="M5 3.2v9.6L12.6 8z" /></Icon>
export const PauseIcon = () => <Icon><path d="M5.5 3.5v9M10.5 3.5v9" /></Icon>
export const RestartIcon = () => <Icon><path d="M3.3 8.6A4.8 4.8 0 1 0 4.8 4.2" /><path d="M4.4 1.9 4.8 4.2 2.5 4.7" /></Icon>
export const FreezeIcon = () => <Icon><path d="M8 2v12M2.8 5l10.4 6M2.8 11 13.2 5" /></Icon>
export const UndoIcon = () => <Icon><path d="M5.5 3.5 2.5 6.5l3 3" /><path d="M2.5 6.5h7a3.5 3.5 0 0 1 0 7H8" /></Icon>
export const RedoIcon = () => <Icon><path d="m10.5 3.5 3 3-3 3" /><path d="M13.5 6.5h-7a3.5 3.5 0 0 0 0 7H8" /></Icon>
export const AddBallIcon = () => <Icon><circle cx="8" cy="8" r="5.5" /><path d="M8 5.5v5M5.5 8h5" /></Icon>
export const DeleteIcon = () => <Icon><path d="M2.5 4.5h11M6.2 4.5V2.8h3.6v1.7M4 4.5l.8 9h6.4l.8-9" /></Icon>
export const ClearIcon = () => <Icon><path d="M2.5 2.5h11v11h-11z" /><path d="m5.5 5.5 5 5m0-5-5 5" /></Icon>
export const SaveIcon = () => <Icon><path d="M8 2.5v8M4.8 7.5 8 10.7l3.2-3.2M2.5 13.5h11" /></Icon>
export const LinkIcon = () => <Icon><path d="m6.5 9.5 3-3" /><path d="m7.2 4.3 1.4-1.4a2.8 2.8 0 0 1 4 4l-1.4 1.4" /><path d="m8.8 11.7-1.4 1.4a2.8 2.8 0 0 1-4-4l1.4-1.4" /></Icon>
export const OpenIcon = () => <Icon><path d="M8 10.5v-8M4.8 5.7 8 2.5l3.2 3.2M2.5 13.5h11" /></Icon>
export const CameraIcon = () => <Icon><path d="M1.5 4.5h9v7h-9z" /><path d="m10.5 7 4-2.2v6.4l-4-2.2" /></Icon>
export const HelpIcon = () => <Icon><circle cx="8" cy="8" r="6" /><path d="M6.2 6.3a1.9 1.9 0 1 1 2.7 1.7c-.6.3-.9.7-.9 1.3v.4" /><path d="M8 11.6v.1" /></Icon>
export const ThemeIcon = () => <Icon><circle cx="8" cy="8" r="5.5" /><path d="M8 2.5v11a5.5 5.5 0 0 0 0-11z" fill="currentColor" stroke="none" /></Icon>
export const ChevronIcon = () => <Icon><path d="m4.5 6.3 3.5 3.5 3.5-3.5" /></Icon>
export const CloseIcon = () => <Icon><path d="m4 4 8 8M12 4l-8 8" /></Icon>
export const SlidersIcon = () => <Icon><path d="M2.5 5h11M2.5 11h11" /><path d="M5.5 3.2v3.6M10.5 9.2v3.6" /></Icon>

/** Shape glyphs: what a stroke turns into. */
export const RampGlyph = () => <Icon><path d="M2.5 12.5 13.5 4" /><path d="m3.5 13.8 11-8.5" opacity=".45" /></Icon>
export const BallGlyph = () => <Icon><circle cx="8" cy="8" r="4.5" /></Icon>
export const PlatformGlyph = () => <Icon><path d="M2 6.5h12v3H2z" /></Icon>
