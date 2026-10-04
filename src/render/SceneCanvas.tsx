import { Canvas, useThree } from '@react-three/fiber'
import { Component, Suspense, useEffect, useLayoutEffect, useRef, type ReactNode } from 'react'
import { PhysicsWorld } from './PhysicsWorld'
import { useAppState } from '../ui/hooks'
import { appStore } from '../store/appStore'
import { DEFAULT_VIEW } from '../coords/transforms'
import { CAMERA_FAR, CAMERA_FOV_DEG, CAMERA_NEAR, cameraDistanceFor, viewBoundsFor } from '../coords/camera'

function CameraRig() {
  const camera = useThree((s) => s.camera)
  const { width, height } = useThree((s) => s.size)
  useLayoutEffect(() => {
    const view = viewBoundsFor(width, height)
    camera.position.set(0, view.centerY, cameraDistanceFor(view))
  }, [camera, width, height])
  return null
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
        <strong>The 3D scene could not start.</strong>
        <p>AirForge needs WebGL and WebAssembly. Try a current version of Chrome, Edge, Firefox, or Safari with hardware acceleration enabled.</p>
        <p className="muted small">Details: {this.state.error.message}</p>
      </div>
    )
  }
}

export function SceneCanvas() {
  const objects = useAppState((s) => s.objects)
  const physics = useAppState((s) => s.physics)
  const selectedId = useAppState((s) => s.selectedId)
  const sceneRevision = useAppState((s) => s.sceneRevision)
  const containerRef = useRef<HTMLDivElement>(null)

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
          gl={{ antialias: true, alpha: false }}
        >
          <CameraRig />
          <color attach="background" args={['#0b1020']} />
          <ambientLight intensity={0.55} />
          <directionalLight position={[6, 10, 8]} intensity={1.1} />
          <hemisphereLight args={['#1e293b', '#0b1020', 0.4]} />
          <Suspense fallback={null}>
            <PhysicsWorld key={sceneRevision} objects={objects} physics={physics} selectedId={selectedId} />
          </Suspense>
        </Canvas>
      </SceneErrorBoundary>
    </div>
  )
}
