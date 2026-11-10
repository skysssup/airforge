import { useEffect, useRef, type ReactNode } from 'react'
import { appStore } from '../store/appStore'
import { useAppState, useNarrow } from './hooks'
import { clearScene, useControlState } from './controlState'
import { copySceneLink, saveScene } from './sceneFiles'
import {
  AddBallIcon,
  CameraIcon,
  ClearIcon,
  CloseIcon,
  FreezeIcon,
  HelpIcon,
  LinkIcon,
  MotionIcon,
  OpenIcon,
  RedoIcon,
  SaveIcon,
  SlidersIcon,
  ThemeIcon,
} from './icons'

/** The hidden file input lives in the top bar so Playwright and the Open button share it. */
export const SCENE_FILE_INPUT_ID = 'scene-file-input'

interface RowProps {
  label: string
  /** Accessible name when it differs from the word (the theme row). */
  name?: string
  icon: ReactNode
  pressed?: boolean
  disabled?: boolean
  detail?: string
  onClick: () => void
}

function Row({ label, name, icon, pressed, disabled, detail, onClick }: RowProps) {
  return (
    <button type="button" className="btn sheet-row" aria-label={name ?? label} aria-pressed={pressed} disabled={disabled} onClick={onClick}>
      {icon}
      <span className="label">{label}</span>
      {detail && <kbd aria-hidden="true">{detail}</kbd>}
    </button>
  )
}

/**
 * The phone's More sheet (SPEC-v3 §9): everything that does not fit the one-row bars, as named rows.
 * The upper half is the scene and the app (Open, Save, Copy link, Webcam, Theme, Help); the lower half
 * the run and edit controls the bottom bar has no room for (Freeze, Motion, World, Add ball, Clear, and Redo below 360px).
 */
export function MoreSheet({ onClose, onOpenWorld, onOpenHelp }: { onClose: () => void; onOpenWorld: () => void; onOpenHelp: () => void }) {
  const ref = useRef<HTMLElement>(null)
  const webcamEnabled = useAppState((s) => s.webcamEnabled)
  const motion = useAppState((s) => s.motion)
  const theme = useAppState((s) => s.theme)
  const narrow = useNarrow()
  const { moving, empty, full, canRedo } = useControlState()
  const nextTheme = theme === 'dark' ? 'light' : 'dark'

  useEffect(() => {
    const sheet = ref.current
    sheet?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus()
    const openers = () => Array.from(document.querySelectorAll<HTMLElement>('[aria-controls="more-sheet"]'))
    const opener = openers().find((el) => el === document.activeElement) ?? null
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node
      if (!sheet?.contains(target) && !openers().some((el) => el.contains(target))) onClose()
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      onClose()
      const visible = openers().find((el) => el.offsetParent !== null)
      visible?.focus()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown, true)
      if (opener?.isConnected && sheet?.contains(document.activeElement)) opener.focus()
    }
  }, [onClose])

  const run = (action: () => void) => () => {
    onClose()
    action()
  }

  return (
    <section ref={ref} id="more-sheet" className="panel more-sheet" aria-label="More">
      <div className="panel-head">
        <h2>More</h2>
        <button type="button" className="btn square" aria-label="Close more" title="Close" onClick={onClose}>
          <CloseIcon />
        </button>
      </div>
      <div className="sheet-rows">
        <Row label="Open" icon={<OpenIcon />} onClick={run(() => document.getElementById(SCENE_FILE_INPUT_ID)?.click())} />
        <Row label="Save" icon={<SaveIcon />} onClick={run(saveScene)} />
        <Row label="Copy link" icon={<LinkIcon />} onClick={run(() => void copySceneLink())} />
        <Row label="Webcam" icon={<CameraIcon />} pressed={webcamEnabled} onClick={run(() => appStore.setWebcamEnabled(!webcamEnabled))} />
        <Row label={nextTheme === 'dark' ? 'Dark theme' : 'Light theme'} name={`Switch to ${nextTheme} theme`} icon={<ThemeIcon />} onClick={run(() => appStore.setTheme(nextTheme))} />
        <Row label="Help" icon={<HelpIcon />} onClick={run(onOpenHelp)} />
      </div>
      <div className="sheet-rows">
        {narrow && <Row label="Redo" icon={<RedoIcon />} disabled={!canRedo} onClick={run(() => appStore.redo())} />}
        <Row label="Freeze" icon={<FreezeIcon />} disabled={moving === 0} onClick={run(() => appStore.freezeBalls())} />
        <Row label="Motion" icon={<MotionIcon />} pressed={motion} onClick={run(() => appStore.toggleMotion())} />
        <Row label="World" icon={<SlidersIcon />} onClick={run(onOpenWorld)} />
        <Row label="Add ball" icon={<AddBallIcon />} disabled={full} onClick={run(() => appStore.addBall())} />
        <Row label="Clear" icon={<ClearIcon />} disabled={empty} onClick={run(clearScene)} />
      </div>
    </section>
  )
}
