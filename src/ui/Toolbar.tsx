import { useRef, useState } from 'react'
import { appStore } from '../store/appStore'
import { useAppState } from './hooks'
import { EXAMPLES, findExample, openExample, setExampleParam } from '../examples'
import { exportSceneJson, importSceneJson } from '../io/serialize'
import { BOUNCE_MAX, BOUNCE_MIN, FRICTION_MAX, FRICTION_MIN, GRAVITY_MAX, GRAVITY_MIN, MAX_OBJECTS } from '../physics/params'
import { MAX_JSON_BYTES } from '../io/schema'

interface Props {
  onToggleWebcam: () => void
  onOpenHelp: () => void
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
      className="scene-name-input"
      value={draft ?? sceneName}
      maxLength={80}
      aria-label="Scene name"
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit()
        if (e.key === 'Escape') setDraft(null)
      }}
    />
  )
}

function fileNameFor(sceneName: string): string {
  const slug = sceneName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  return `${slug || 'airforge-scene'}.json`
}

function saveScene() {
  const { name, objects, physics } = appStore.exportState()
  const url = URL.createObjectURL(new Blob([exportSceneJson(name, objects, physics)], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = fileNameFor(name)
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  appStore.setStatus(`Saved ${link.download}.`)
}

async function openSceneFile(file: File) {
  if (file.size > MAX_JSON_BYTES) {
    appStore.setStatus(`Could not open ${file.name}: files over ${MAX_JSON_BYTES / 1000} KB are not accepted.`)
    return
  }
  let text: string
  try {
    text = await file.text()
  } catch {
    appStore.setStatus(`Could not read ${file.name}.`)
    return
  }
  const result = importSceneJson(text)
  if (!result.ok) {
    appStore.setStatus(`Could not open ${file.name}: ${result.error}`)
    return
  }
  setExampleParam(null)
  appStore.loadScene(result, { message: `Opened “${result.name}” from ${file.name}.` })
}

export function Toolbar({ onToggleWebcam, onOpenHelp }: Props) {
  const { physics, objects, webcamEnabled, selectedId, undoStack, redoStack } = useAppState()
  const fileRef = useRef<HTMLInputElement>(null)

  const balls = objects.filter((o) => o.kind === 'ball')
  const waiting = balls.filter((b) => !b.dynamic).length
  const moving = balls.filter((b) => b.dynamic).length
  const released = balls.some((b) => b.releasedFrom)
  const full = objects.length >= MAX_OBJECTS

  return (
    <header className="toolbar" role="toolbar" aria-label="AirForge controls">
      <div className="toolbar-brand">
        <span className="logo" aria-hidden>
          ✦
        </span>
        <div>
          <strong>AirForge</strong>
          <SceneNameInput />
        </div>
      </div>

      <div className="toolbar-group">
        <select
          aria-label="Open an example"
          value=""
          onChange={(e) => {
            const example = findExample(e.target.value)
            if (example) openExample(example)
          }}
        >
          <option value="" disabled>
            Examples…
          </option>
          {EXAMPLES.map((example) => (
            <option key={example.id} value={example.id}>
              {example.title}
            </option>
          ))}
        </select>
        <button type="button" className="btn accent" onClick={() => appStore.drop()} title="Release waiting balls (D)">
          Drop{waiting > 0 ? ` (${waiting})` : ''}
        </button>
        <button type="button" className="btn" onClick={() => appStore.restart()} disabled={!released} title="Put released balls back (R)">
          Restart
        </button>
        <button type="button" className="btn" onClick={() => appStore.togglePause()} aria-pressed={physics.paused} title="Pause or resume (Space)">
          {physics.paused ? 'Resume' : 'Pause'}
        </button>
        <button type="button" className="btn" onClick={() => appStore.freezeBalls()} disabled={moving === 0} title="Stop moving balls where they are (F)">
          Freeze
        </button>
      </div>

      <div className="toolbar-group">
        <button type="button" className="btn" onClick={() => appStore.undo()} disabled={undoStack.length === 0} title="Undo (Z or Ctrl+Z)">
          Undo
        </button>
        <button type="button" className="btn" onClick={() => appStore.redo()} disabled={redoStack.length === 0} title="Redo (Shift+Z or Ctrl+Shift+Z)">
          Redo
        </button>
        <button type="button" className="btn" onClick={() => appStore.addBall()} disabled={full} title="Add a waiting ball">
          Add ball
        </button>
        <button type="button" className="btn" onClick={() => appStore.deleteSelected()} disabled={!selectedId} title="Delete the selected shape (Delete)">
          Delete
        </button>
        <button
          type="button"
          className="btn danger"
          onClick={() => {
            setExampleParam(null)
            appStore.clearScene()
          }}
          disabled={objects.length === 0}
          title="Remove everything (undoable)"
        >
          Clear
        </button>
      </div>

      <div className="toolbar-group sliders">
        <label>
          Gravity
          <input
            type="range"
            min={GRAVITY_MIN}
            max={GRAVITY_MAX}
            step={0.1}
            value={physics.gravity}
            onChange={(e) => appStore.setPhysics({ gravity: Number(e.target.value) })}
          />
          <span className="val">{Number(physics.gravity.toFixed(2))}</span>
        </label>
        <label>
          Bounce
          <input
            type="range"
            min={BOUNCE_MIN}
            max={BOUNCE_MAX}
            step={0.01}
            value={physics.bounce}
            onChange={(e) => appStore.setPhysics({ bounce: Number(e.target.value) })}
          />
          <span className="val">{physics.bounce.toFixed(2)}</span>
        </label>
        <label>
          Friction
          <input
            type="range"
            min={FRICTION_MIN}
            max={FRICTION_MAX}
            step={0.01}
            value={physics.friction}
            onChange={(e) => appStore.setPhysics({ friction: Number(e.target.value) })}
          />
          <span className="val">{physics.friction.toFixed(2)}</span>
        </label>
      </div>

      <div className="toolbar-group">
        <button type="button" className="btn" onClick={saveScene} title="Download the scene as a JSON file">
          Save
        </button>
        <button type="button" className="btn" onClick={() => fileRef.current?.click()} title="Open a scene JSON file">
          Open
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
        <button type="button" className="btn" onClick={onToggleWebcam} aria-pressed={webcamEnabled} title="Draw with your index finger">
          Webcam
        </button>
        <button type="button" className="btn" onClick={onOpenHelp} title="Controls and shortcuts (?)">
          Help
        </button>
      </div>
    </header>
  )
}
