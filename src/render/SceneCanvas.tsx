import { Canvas, useThree } from '@react-three/fiber'
import { Component, Suspense, useEffect, useLayoutEffect, useMemo, useRef, type ReactNode } from 'react'
import { NeutralToneMapping, PMREMGenerator } from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { PhysicsWorld } from './PhysicsWorld'
import { SCENE_PALETTES, type ScenePalette } from './palette'
import { useAppState } from '../ui/hooks'
import { appStore } from '../store/appStore'
import { DEFAULT_VIEW } from '../coords/transforms'
import { CAMERA_FAR, CAMERA_FOV_DEG, CAMERA_NEAR, cameraDistanceFor, viewBoundsFor } from '../coords/camera'

/** Light from the upper left, matching the shadows; a weak fill from the lower right keeps far edges readable. */
const KEY_LIGHT_POSITION: [number, number, number] = [-5, 8, 7]
const FILL_LIGHT_POSITION: [number, number, number] = [6, -3, 8]
/** How strongly the studio environment shows in reflections. */
const ENVIRONMENT_INTENSITY = 0.35

function CameraRig() {
  const camera = useThree((s) => s.camera)
  const { width, height } = useThree((s) => s.size)
  useLayoutEffect(() => {
    const view = viewBoundsFor(width, height)
    camera.position.set(0, view.centerY, cameraDistanceFor(view))
  }, [camera, width, height])
  return null
}

/** Soft studio reflections from three's procedural room, so rounded edges catch the light. */
function StudioEnvironment() {
  const gl = useThree((s) => s.gl)
  const target = useMemo(() => {
    const pmrem = new PMREMGenerator(gl)
    const room = new RoomEnvironment()
    const rendered = pmrem.fromScene(room, 0.04)
    room.dispose()
    pmrem.dispose()
    return rendered
  }, [gl])
  useEffect(() => () => target.dispose(), [target])
  return <primitive attach="environment" object={target.texture} />
}

function Lights({ palette }: { palette: ScenePalette }) {
  return (
    <>
      <ambientLight intensity={palette.ambientLight} />
      <directionalLight position={KEY_LIGHT_POSITION} intensity={palette.keyLight} />
      <directionalLight position={FILL_LIGHT_POSITION} intensity={palette.fillLight} />
    </>
  )
}

/** Shows a message instead of a blank page when WebGL or the physics engine cannot start. */
class SceneErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="scene-error" role="alert">
        <div className="panel">
          <div className="panel-head">Scene unavailable</div>
          <div className="panel-body">
            <p className="scene-error-title">The 3D scene could not start.</p>
            <p>AirForge needs WebGL and WebAssembly. Try a current version of Chrome, Edge, Firefox, or Safari with hardware acceleration enabled.</p>
            <p className="muted details">Details: {this.state.error.message}</p>
          </div>
        </div>
      </div>
    )
  }
}

export function SceneCanvas() {
  const objects = useAppState((s) => s.objects)
  const physics = useAppState((s) => s.physics)
  const selectedId = useAppState((s) => s.selectedId)
  const sceneRevision = useAppState((s) => s.sceneRevision)
  const theme = useAppState((s) => s.theme)
  const view = useAppState((s) => s.view)
  const containerRef = useRef<HTMLDivElement>(null)
  const palette = SCENE_PALETTES[theme]
  const pixel = view.height > 0 ? (2 * view.worldHalfHeight) / view.height : 0.01

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const cr = entries[0]?.contentRect
      if (cr) appStore.setView(viewBoundsFor(cr.width, cr.height))
    })
    ro.observe(el)
    appStore.setView(viewBoundsFor(el.clientWidth, el.clientHeight))
    return () => ro.disconnect()
  }, [])

  return (
    <div ref={containerRef} className="scene-canvas">
      <SceneErrorBoundary>
        <Canvas
          dpr={[1, 2]}
          camera={{ position: [0, 0, cameraDistanceFor(DEFAULT_VIEW)], fov: CAMERA_FOV_DEG, near: CAMERA_NEAR, far: CAMERA_FAR }}
          gl={{ antialias: true, alpha: true, toneMapping: NeutralToneMapping }}
          scene={{ environmentIntensity: ENVIRONMENT_INTENSITY }}
        >
          <CameraRig />
          <StudioEnvironment />
          <Lights palette={palette} />
          <Suspense fallback={null}>
            <PhysicsWorld key={sceneRevision} objects={objects} physics={physics} selectedId={selectedId} palette={palette} pixel={pixel} />
          </Suspense>
        </Canvas>
      </SceneErrorBoundary>
    </div>
  )
}
