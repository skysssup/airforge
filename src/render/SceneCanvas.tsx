import { Canvas } from '@react-three/fiber'
import { Grid, OrbitControls } from '@react-three/drei'
import { Suspense, useEffect, useRef } from 'react'
import { PhysicsWorld } from './PhysicsWorld'
import { InkOverlay } from './InkOverlay'
import { useAppState } from '../ui/hooks'
import { appStore } from '../store/appStore'
import { GROUND_Y } from '../physics/params'

export function SceneCanvas() {
  const { objects, physics, liveStroke, view } = useAppState()
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const cr = entries[0]?.contentRect
      if (!cr) return
      appStore.setView({ width: cr.width, height: cr.height })
    })
    ro.observe(el)
    appStore.setView({ width: el.clientWidth, height: el.clientHeight })
    return () => ro.disconnect()
  }, [])

  return (
    <div ref={containerRef} className="scene-canvas" aria-label="Physics playground">
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [0, 1.2, 12], fov: 42, near: 0.1, far: 80 }}
        gl={{ antialias: true, alpha: false }}
        onCreated={({ gl }) => {
          gl.setClearColor('#0b1020')
        }}
      >
        <color attach="background" args={['#0b1020']} />
        <ambientLight intensity={0.45} />
        <directionalLight
          castShadow
          position={[6, 10, 6]}
          intensity={1.1}
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        <hemisphereLight args={['#1e293b', '#0b1020', 0.4]} />

        <Suspense fallback={null}>
          <PhysicsWorld objects={objects} physics={physics} />
          <InkOverlay points={liveStroke} view={view} />
        </Suspense>

        <Grid
          position={[0, GROUND_Y + 0.21, 0]}
          args={[40, 40]}
          cellSize={0.5}
          cellThickness={0.6}
          cellColor="#1e293b"
          sectionSize={2}
          sectionThickness={1.1}
          sectionColor="#334155"
          fadeDistance={28}
          fadeStrength={1.5}
          infiniteGrid
        />

        <OrbitControls
          enablePan={false}
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={Math.PI / 2.05}
          minDistance={8}
          maxDistance={22}
          target={[0, 0, 0]}
        />
      </Canvas>
    </div>
  )
}
