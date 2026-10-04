import { useEffect, useRef, type CSSProperties } from 'react'
import { appStore } from '../store/appStore'
import { useAppState } from './hooks'
import { BOUNCE_MAX, BOUNCE_MIN, FRICTION_MAX, FRICTION_MIN, GRAVITY_MAX, GRAVITY_MIN, MAX_OBJECTS } from '../physics/params'
import { CloseIcon } from './icons'

interface SliderProps {
  id: string
  label: string
  value: number
  display: string
  min: number
  max: number
  step: number
  onChange: (value: number) => void
}

function Slider({ id, label, value, display, min, max, step, onChange }: SliderProps) {
  return (
    <div className="field">
      <label className="t-ui" htmlFor={id}>
        {label}
      </label>
      <output htmlFor={id}>{display}</output>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        style={{ '--fill': `${((value - min) / (max - min)) * 100}%` } as CSSProperties}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  )
}

/** Gravity, Bounce, and Friction for the whole scene, plus what the scene contains. Opens above the World button. */
export function WorldPanel({ onClose }: { onClose: () => void }) {
  const physics = useAppState((s) => s.physics)
  const objects = useAppState((s) => s.objects)
  const ref = useRef<HTMLElement>(null)
  const ramps = objects.filter((o) => o.kind === 'ramp').length
  const balls = objects.filter((o) => o.kind === 'ball').length
  const curves = objects.filter((o) => o.kind === 'curve').length
  const platforms = objects.length - ramps - balls - curves

  useEffect(() => {
    const toggle = () => document.querySelector<HTMLElement>('[aria-controls="world-panel"]')
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node
      if (!ref.current?.contains(target) && !toggle()?.contains(target)) onClose()
    }
    // Escape closes the panel before it does anything else, such as clearing the selection,
    // unless focus is in an open menu, which closes first.
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape' || document.activeElement?.closest('[role="menu"]')) return
      e.stopPropagation()
      const hadFocus = ref.current?.contains(document.activeElement)
      onClose()
      if (hadFocus) toggle()?.focus()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown, true)
    }
  }, [onClose])

  return (
    <section
      ref={ref}
      id="world-panel"
      className="panel world"
      aria-label="World"
    >
      <div className="panel-head">
        <span>World</span>
        <button type="button" className="btn square" aria-label="Close world settings" title="Close" onClick={onClose}>
          <CloseIcon />
        </button>
      </div>
      <div className="panel-body">
        <Slider id="gravity" label="Gravity" value={physics.gravity} display={String(Number(physics.gravity.toFixed(2)))} min={GRAVITY_MIN} max={GRAVITY_MAX} step={0.1} onChange={(gravity) => appStore.setPhysics({ gravity })} />
        <Slider id="bounce" label="Bounce" value={physics.bounce} display={physics.bounce.toFixed(2)} min={BOUNCE_MIN} max={BOUNCE_MAX} step={0.01} onChange={(bounce) => appStore.setPhysics({ bounce })} />
        <Slider id="friction" label="Friction" value={physics.friction} display={physics.friction.toFixed(2)} min={FRICTION_MIN} max={FRICTION_MAX} step={0.01} onChange={(friction) => appStore.setPhysics({ friction })} />
      </div>
      <dl className="counts">
        <div>
          <dt className="t-label">{ramps === 1 ? 'Ramp' : 'Ramps'}</dt>
          <dd>{ramps}</dd>
        </div>
        <div>
          <dt className="t-label">{balls === 1 ? 'Ball' : 'Balls'}</dt>
          <dd>{balls}</dd>
        </div>
        <div>
          <dt className="t-label">{platforms === 1 ? 'Platform' : 'Platforms'}</dt>
          <dd>{platforms}</dd>
        </div>
        <div>
          <dt className="t-label">{curves === 1 ? 'Curve' : 'Curves'}</dt>
          <dd>{curves}</dd>
        </div>
        <div>
          <dt className="t-label">Limit</dt>
          <dd>
            {objects.length}
            <span className="muted">/{MAX_OBJECTS}</span>
          </dd>
        </div>
      </dl>
    </section>
  )
}
