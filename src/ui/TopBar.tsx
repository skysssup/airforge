import { useEffect, useRef, useState } from 'react'
import { appStore } from '../store/appStore'
import { useAppState } from './hooks'
import { EXAMPLES, openExample } from '../examples'
import { openSceneFile, saveScene } from './sceneFiles'
import { CameraIcon, ChevronIcon, HelpIcon, OpenIcon, SaveIcon, ThemeIcon } from './icons'

export function Mark() {
  return (
    <svg className="mark" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <rect x="0.5" y="0.5" width="19" height="19" fill="none" stroke="currentColor" />
      <path d="M3.5 16 14 8.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="14.6" cy="5.4" r="2.1" fill="var(--accent)" />
    </svg>
  )
}

function SceneNameInput() {
  const sceneName = useAppState((s) => s.sceneName)
  const [draft, setDraft] = useState<string | null>(null)

  function commit() {
    if (draft !== null) appStore.setSceneName(draft)
    setDraft(null)
  }

  return (
    <input
      className="scene-name"
      value={draft ?? sceneName}
      maxLength={80}
      aria-label="Scene name"
      spellCheck={false}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit()
        if (e.key === 'Escape') setDraft(null)
      }}
    />
  )
}

/** Menu button listing the examples; arrow keys move between them and Escape closes. */
function ExamplesMenu() {
  const exampleId = useAppState((s) => s.exampleId)
  const sceneName = useAppState((s) => s.sceneName)
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const items = () => Array.from(wrapRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [])
    const current = items().find((item) => item.getAttribute('aria-current') === 'true')
    ;(current ?? items()[0])?.focus()

    function onPointerDown(e: PointerEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    function onKeyDown(e: KeyboardEvent) {
      const list = items()
      const index = list.indexOf(document.activeElement as HTMLButtonElement)
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        setOpen(false)
        buttonRef.current?.focus()
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        const step = e.key === 'ArrowDown' ? 1 : -1
        list[(index + step + list.length) % list.length]?.focus()
      } else if (e.key === 'Home' || e.key === 'End') {
        e.preventDefault()
        ;(e.key === 'Home' ? list[0] : list.at(-1))?.focus()
      } else if (e.key === 'Tab') {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    wrapRef.current?.addEventListener('keydown', onKeyDown)
    const wrap = wrapRef.current
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      wrap?.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const current = EXAMPLES.find((example) => example.id === exampleId)

  return (
    <div className="menu-wrap" ref={wrapRef}>
      <button
        ref={buttonRef}
        type="button"
        className="btn menu-button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="examples-menu"
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' && !open) {
            e.preventDefault()
            setOpen(true)
          }
        }}
      >
        <span>Examples</span>
        <span className="current" aria-hidden="true">
          {current ? `${String(EXAMPLES.indexOf(current) + 1).padStart(2, '0')} ${sceneName}` : `${EXAMPLES.length} scenes`}
        </span>
        <ChevronIcon />
      </button>
      {open && (
        <div id="examples-menu" className="menu panel" role="menu" aria-label="Examples">
          {EXAMPLES.map((example, i) => (
            <button
              key={example.id}
              type="button"
              role="menuitem"
              className="menu-item"
              aria-current={example.id === exampleId ? 'true' : undefined}
              aria-labelledby={`example-${example.id}-title`}
              aria-describedby={`example-${example.id}-shows`}
              onClick={() => {
                setOpen(false)
                openExample(example)
              }}
            >
              <span className="idx" aria-hidden="true">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="menu-title" id={`example-${example.id}-title`}>
                {example.title}
              </span>
              <span className="menu-desc" id={`example-${example.id}-shows`}>
                {example.shows}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

interface Props {
  onOpenHelp: () => void
}

export function TopBar({ onOpenHelp }: Props) {
  const webcamEnabled = useAppState((s) => s.webcamEnabled)
  const theme = useAppState((s) => s.theme)
  const fileRef = useRef<HTMLInputElement>(null)
  const nextTheme = theme === 'dark' ? 'light' : 'dark'

  return (
    <header className="topbar">
      <div className="brand">
        <Mark />
        <span className="wordmark">AirForge</span>
        <span className="brand-sep" aria-hidden="true" />
        <SceneNameInput />
      </div>
      <ExamplesMenu />
      <div className="topbar-end">
        <button type="button" className="btn square" aria-label="Open" title="Open a scene file (JSON)" onClick={() => fileRef.current?.click()}>
          <OpenIcon />
        </button>
        <button type="button" className="btn square" aria-label="Save" title="Download the scene as a JSON file" onClick={saveScene}>
          <SaveIcon />
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (file) void openSceneFile(file)
          }}
        />
        <span className="topbar-sep" aria-hidden="true" />
        <button
          type="button"
          className="btn square"
          aria-label="Webcam"
          aria-pressed={webcamEnabled}
          title={webcamEnabled ? 'Stop the webcam and draw with the mouse' : 'Draw with your index finger in front of the webcam'}
          onClick={() => appStore.setWebcamEnabled(!webcamEnabled)}
        >
          <CameraIcon />
        </button>
        <button
          type="button"
          className="btn square"
          aria-label={`Switch to ${nextTheme} theme`}
          title={`Switch to ${nextTheme} theme`}
          onClick={() => appStore.setTheme(nextTheme)}
        >
          <ThemeIcon />
        </button>
        <button type="button" className="btn square" aria-label="Help" title="Controls and shortcuts (?)" onClick={onOpenHelp}>
          <HelpIcon />
        </button>
      </div>
    </header>
  )
}
