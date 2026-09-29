import { useRef } from 'react'
import { appStore } from '../store/appStore'
import { useAppState } from './hooks'
import { EXAMPLE_SCENES } from '../fixtures/scenes'
import { exportSceneJson, importSceneJson } from '../io/serialize'
import { MAX_OBJECTS } from '../physics/params'

interface Props {
  onToggleWebcam: () => void
  onOpenHelp: () => void
  onOpenReplay: () => void
}

export function Toolbar({ onToggleWebcam, onOpenHelp, onOpenReplay }: Props) {
  const { physics, objects, webcamEnabled, objectLimitHit, sceneName } = useAppState()
  const fileRef = useRef<HTMLInputElement>(null)

  const ballCount = objects.filter((o) => o.kind === 'ball').length
  const staticBalls = objects.filter((o) => o.kind === 'ball' && !o.dynamic).length

  return (
    <header className="toolbar" role="toolbar" aria-label="AirForge controls">
      <div className="toolbar-brand">
        <span className="logo" aria-hidden>
          ✦
        </span>
        <div>
          <strong>AirForge</strong>
          <span className="muted scene-name">{sceneName}</span>
        </div>
      </div>

      <div className="toolbar-group">
        <button type="button" className="btn primary" onClick={() => appStore.loadRampAndBall()}>
          Load Ramp &amp; Ball
        </button>
        <button type="button" className="btn" onClick={() => appStore.addBall()} disabled={objectLimitHit || objects.length >= MAX_OBJECTS}>
          Add ball
        </button>
        <button
          type="button"
          className="btn accent"
          onClick={() => appStore.dropBall()}
          disabled={objects.length === 0 && ballCount === 0}
        >
          Drop ball{staticBalls > 0 ? ` (${staticBalls})` : ''}
        </button>
        <button type="button" className="btn" onClick={() => appStore.undo()}>
          Undo
        </button>
        <button type="button" className="btn danger" onClick={() => appStore.resetScene()}>
          Reset
        </button>
        <button type="button" className="btn" onClick={() => appStore.togglePause()} aria-pressed={physics.paused}>
          {physics.paused ? 'Resume' : 'Pause'}
        </button>
      </div>

      <div className="toolbar-group sliders">
        <label>
          Gravity
          <input
            type="range"
            min={0}
            max={25}
            step={0.1}
            value={physics.gravity}
            onChange={(e) => appStore.setPhysics({ gravity: Number(e.target.value) })}
            aria-valuetext={`${physics.gravity.toFixed(1)}`}
          />
          <span className="val">{physics.gravity.toFixed(1)}</span>
        </label>
        <label>
          Bounce
          <input
            type="range"
            min={0}
            max={1}
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
            min={0}
            max={2}
            step={0.01}
            value={physics.friction}
            onChange={(e) => appStore.setPhysics({ friction: Number(e.target.value) })}
          />
          <span className="val">{physics.friction.toFixed(2)}</span>
        </label>
      </div>

      <div className="toolbar-group">
        <label className="select-wrap">
          <span className="sr-only">Example scenes</span>
          <select
            aria-label="Load example scene"
            defaultValue=""
            onChange={(e) => {
              const id = e.target.value
              e.target.value = ''
              const scene = EXAMPLE_SCENES.find((s) => s.id === id)
              if (scene) appStore.loadExample(scene.objects, scene.name, scene.physics)
            }}
          >
            <option value="" disabled>
              Examples…
            </option>
            {EXAMPLE_SCENES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          className="btn"
          onClick={() => {
            const json = exportSceneJson(sceneName || 'AirForge Scene', objects, physics)
            const blob = new Blob([json], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `${(sceneName || 'airforge-scene').replace(/\s+/g, '-').toLowerCase()}.json`
            a.click()
            URL.revokeObjectURL(url)
            appStore.setStatus('Scene exported as JSON (no video).')
          }}
        >
          Save JSON
        </button>
        <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
          Import
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          onChange={async (e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (!file) return
            if (file.size > 512_000) {
              appStore.setStatus('Import rejected: file too large.')
              return
            }
            const text = await file.text()
            const result = importSceneJson(text)
            if (!result.ok) {
              appStore.setStatus(`Import rejected: ${result.error}`)
              return
            }
            appStore.replaceObjects(result.objects, result.name, result.physics)
          }}
        />

        <button
          type="button"
          className={`btn ${webcamEnabled ? 'accent' : 'primary'}`}
          onClick={onToggleWebcam}
          aria-pressed={webcamEnabled}
        >
          {webcamEnabled ? 'Use mouse' : 'Enable webcam'}
        </button>
        <button type="button" className="btn" onClick={onOpenReplay}>
          Replay
        </button>
        <button type="button" className="btn" onClick={onOpenHelp}>
          Help
        </button>
      </div>

      <div className="toolbar-meta" aria-live="polite">
        Objects {objects.length}/{MAX_OBJECTS}
      </div>
    </header>
  )
}
