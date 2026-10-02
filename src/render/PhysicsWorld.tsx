import { type ReactNode, useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Physics, RigidBody, CuboidCollider, BallCollider, type RapierRigidBody } from '@react-three/rapier'
import type { SceneObject, RampObject, BallObject, PlatformObject } from '../scene/objects'
import { rampPose } from '../scene/objects'
import type { PhysicsParams } from '../physics/params'
import { GROUND_HALF_HEIGHT, GROUND_Y, MESH_THICKNESS } from '../physics/params'
import { clearLiveBallPose, setLiveBallPose } from '../physics/livePoses'

interface Props {
  objects: SceneObject[]
  physics: PhysicsParams
  children?: ReactNode
}

export function PhysicsWorld({ objects, physics, children }: Props) {
  const gravity: [number, number, number] = useMemo(
    () => [0, physics.paused ? 0 : -physics.gravity, 0],
    [physics.gravity, physics.paused],
  )

  return (
    <Physics gravity={gravity} timeStep="vary" paused={physics.paused}>
      {/* Invisible ground plane — CuboidCollider half-height is GROUND_HALF_HEIGHT */}
      <RigidBody type="fixed" position={[0, GROUND_Y, 0]} colliders={false} name="ground">
        <CuboidCollider
          args={[20, GROUND_HALF_HEIGHT, 4]}
          friction={physics.friction}
          restitution={physics.bounce * 0.3}
        />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, GROUND_HALF_HEIGHT, 0]} receiveShadow>
          <planeGeometry args={[40, 8]} />
          <meshStandardMaterial color="#12182a" metalness={0.2} roughness={0.85} />
        </mesh>
      </RigidBody>

      {/* Soft side walls to keep balls in view */}
      <RigidBody type="fixed" position={[-9, 0, 0]} colliders={false}>
        <CuboidCollider args={[0.2, 8, 2]} />
      </RigidBody>
      <RigidBody type="fixed" position={[9, 0, 0]} colliders={false}>
        <CuboidCollider args={[0.2, 8, 2]} />
      </RigidBody>

      {objects.map((o) => (
        <SceneBody key={o.id} object={o} physics={physics} />
      ))}
      {children}
    </Physics>
  )
}

function SceneBody({
  object,
  physics,
}: {
  object: SceneObject
  physics: PhysicsParams
}) {
  if (object.kind === 'ramp') return <RampBody ramp={object} physics={physics} />
  if (object.kind === 'ball') return <BallBody ball={object} physics={physics} />
  return <PlatformBody platform={object} physics={physics} />
}

function RampBody({ ramp, physics }: { ramp: RampObject; physics: PhysicsParams }) {
  const { center, length, rotationZ } = rampPose(ramp)
  const halfLen = Math.max(length / 2, 0.1)
  const halfW = ramp.width
  const halfZ = (ramp.thickness ?? MESH_THICKNESS) / 2

  return (
    <RigidBody
      type="fixed"
      position={[center.x, center.y, center.z]}
      rotation={[0, 0, rotationZ]}
      colliders={false}
      name={ramp.id}
    >
      <CuboidCollider
        args={[halfLen, halfW, halfZ]}
        friction={physics.friction}
        restitution={physics.bounce * 0.4}
      />
      <mesh castShadow receiveShadow>
        <boxGeometry args={[halfLen * 2, halfW * 2, halfZ * 2]} />
        <meshStandardMaterial
          color="#5eead4"
          emissive="#134e4a"
          emissiveIntensity={0.35}
          metalness={0.4}
          roughness={0.35}
        />
      </mesh>
    </RigidBody>
  )
}

function BallBody({ ball, physics }: { ball: BallObject; physics: PhysicsParams }) {
  const bodyRef = useRef<RapierRigidBody>(null)
  const type = ball.dynamic ? 'dynamic' : 'kinematicPosition'

  useEffect(() => {
    return () => clearLiveBallPose(ball.id)
  }, [ball.id])

  useFrame(() => {
    const body = bodyRef.current
    if (!body || !ball.dynamic) return
    const t = body.translation()
    setLiveBallPose(ball.id, { x: t.x, y: t.y, z: t.z })
  })

  return (
    <RigidBody
      ref={bodyRef}
      key={`${ball.id}-${ball.dynamic ? 'dyn' : 'kin'}`}
      type={type}
      position={[ball.position.x, ball.position.y, ball.position.z]}
      colliders={false}
      name={ball.id}
      linearDamping={0.05}
      angularDamping={0.05}
      enabledTranslations={[true, true, false]}
      enabledRotations={[true, true, true]}
    >
      <BallCollider
        args={[ball.radius]}
        friction={physics.friction}
        restitution={physics.bounce}
        mass={1}
      />
      <mesh castShadow>
        <sphereGeometry args={[ball.radius, 32, 32]} />
        <meshStandardMaterial
          color="#a78bfa"
          emissive="#4c1d95"
          emissiveIntensity={0.4}
          metalness={0.55}
          roughness={0.25}
        />
      </mesh>
    </RigidBody>
  )
}

function PlatformBody({
  platform,
  physics,
}: {
  platform: PlatformObject
  physics: PhysicsParams
}) {
  const hx = platform.halfExtents.x
  const hy = platform.halfExtents.y
  const hz = platform.halfExtents.z
  return (
    <RigidBody
      type="fixed"
      position={[platform.center.x, platform.center.y, platform.center.z]}
      rotation={[0, 0, platform.rotationZ]}
      colliders={false}
      name={platform.id}
    >
      <CuboidCollider
        args={[hx, hy, hz]}
        friction={physics.friction}
        restitution={physics.bounce * 0.35}
      />
      <mesh castShadow receiveShadow>
        <boxGeometry args={[hx * 2, hy * 2, hz * 2]} />
        <meshStandardMaterial
          color="#38bdf8"
          emissive="#0c4a6e"
          emissiveIntensity={0.3}
          metalness={0.35}
          roughness={0.4}
        />
      </mesh>
    </RigidBody>
  )
}
