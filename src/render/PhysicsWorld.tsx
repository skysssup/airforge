import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Physics, RigidBody, CuboidCollider, BallCollider, type RapierRigidBody } from '@react-three/rapier'
import type { SceneObject, BallObject } from '../scene/objects'
import type { PhysicsParams } from '../physics/params'
import { BALL_DAMPING, BOUNDARY, TIME_STEP, boxFor, type Box } from '../physics/world'
import { clearLiveBallPose, setLiveBallPose } from '../physics/livePoses'

const COLORS = {
  ramp: '#5eead4',
  platform: '#38bdf8',
  ball: '#a78bfa',
  boundary: '#334155',
  selected: '#facc15',
}

interface Props {
  objects: SceneObject[]
  physics: PhysicsParams
  selectedId: string | null
}

/** Rapier world for the scene; physics/world.ts describes the same layout for headless tests. */
export function PhysicsWorld({ objects, physics, selectedId }: Props) {
  return (
    <Physics gravity={[0, -physics.gravity, 0]} timeStep={TIME_STEP} paused={physics.paused}>
      {BOUNDARY.map((box, i) => (
        <BoxBody key={`boundary-${i}`} box={box} physics={physics} color={COLORS.boundary} />
      ))}
      {objects.map((o) => {
        const selected = o.id === selectedId
        if (o.kind === 'ball') return <BallBody key={o.id} ball={o} physics={physics} selected={selected} />
        return <BoxBody key={o.id} box={boxFor(o)} physics={physics} color={selected ? COLORS.selected : COLORS[o.kind]} />
      })}
    </Physics>
  )
}

function BoxBody({ box, physics, color }: { box: Box; physics: PhysicsParams; color: string }) {
  const { center, rotationZ, halfExtents: h } = box
  return (
    <RigidBody type="fixed" position={[center.x, center.y, center.z]} rotation={[0, 0, rotationZ]} colliders={false}>
      <CuboidCollider args={[h.x, h.y, h.z]} friction={physics.friction} restitution={physics.bounce} />
      <mesh>
        <boxGeometry args={[h.x * 2, h.y * 2, h.z * 2]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.18} metalness={0.3} roughness={0.45} />
      </mesh>
    </RigidBody>
  )
}

function BallBody({ ball, physics, selected }: { ball: BallObject; physics: PhysicsParams; selected: boolean }) {
  const bodyRef = useRef<RapierRigidBody>(null)

  useEffect(() => () => clearLiveBallPose(ball.id), [ball.id])

  useFrame(() => {
    const body = bodyRef.current
    if (body && ball.dynamic) setLiveBallPose(ball.id, body.translation())
  })

  const color = selected ? COLORS.selected : COLORS.ball
  return (
    <RigidBody
      ref={bodyRef}
      // Remount when Drop/Freeze/Restart switches the body type so it starts from the stored position.
      key={ball.dynamic ? 'moving' : 'waiting'}
      type={ball.dynamic ? 'dynamic' : 'kinematicPosition'}
      position={[ball.position.x, ball.position.y, ball.position.z]}
      colliders={false}
      linearDamping={BALL_DAMPING}
      angularDamping={BALL_DAMPING}
      enabledTranslations={[true, true, false]}
    >
      <BallCollider args={[ball.radius]} friction={physics.friction} restitution={physics.bounce} />
      <mesh>
        <sphereGeometry args={[ball.radius, 32, 24]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={ball.dynamic ? 0.25 : 0.1}
          metalness={0.4}
          roughness={0.3}
          transparent={!ball.dynamic}
          opacity={ball.dynamic ? 1 : 0.7}
        />
      </mesh>
    </RigidBody>
  )
}
