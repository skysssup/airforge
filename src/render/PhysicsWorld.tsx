import { useEffect, useMemo, useRef } from 'react'
import { extend, useFrame, type ThreeElement } from '@react-three/fiber'
import { Physics, RigidBody, CuboidCollider, BallCollider, type RapierRigidBody } from '@react-three/rapier'
import { Shape, type Group } from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import type { SceneObject, BallObject } from '../scene/objects'
import type { PhysicsParams } from '../physics/params'
import { BALL_DAMPING, BOUNDARY, TIME_STEP, boxFor, type Box } from '../physics/world'
import { clearLiveBallPose, setLiveBallPose } from '../physics/livePoses'
import type { ScenePalette } from './palette'
import { TrailRibbon } from './trail'
import { BALL_SHADOW_SPAN, SHADOW_OFFSET, SHADOW_Z, ballShadowTexture } from './shadows'

extend({ RoundedBoxGeometry })

declare module '@react-three/fiber' {
  interface ThreeElements {
    roundedBoxGeometry: ThreeElement<typeof RoundedBoxGeometry>
  }
}

/** Selection outline gap from the silhouette and line width, in CSS pixels. */
const OUTLINE_GAP = 4
const OUTLINE_WIDTH = 1.5
/** Edge radius of ramps and platforms; the colliders stay sharp-edged boxes. */
const EDGE_RADIUS = 0.07

interface Props {
  objects: SceneObject[]
  physics: PhysicsParams
  selectedId: string | null
  palette: ScenePalette
  /** World units per CSS pixel on the drawing plane, for hairlines that stay crisp at any size. */
  pixel: number
}

/** Rapier world for the scene; physics/world.ts describes the same layout for headless tests. */
export function PhysicsWorld({ objects, physics, selectedId, palette, pixel }: Props) {
  return (
    <Physics gravity={[0, -physics.gravity, 0]} timeStep={TIME_STEP} paused={physics.paused}>
      {BOUNDARY.map((box, i) => (
        // The floor and walls are drawn on the sheet behind the canvas, so they only need colliders.
        <RigidBody key={`boundary-${i}`} type="fixed" position={[box.center.x, box.center.y, box.center.z]} colliders={false}>
          <CuboidCollider
            args={[box.halfExtents.x, box.halfExtents.y, box.halfExtents.z]}
            friction={physics.friction}
            restitution={physics.bounce}
          />
        </RigidBody>
      ))}
      {objects.map((o) => {
        const selected = o.id === selectedId
        if (o.kind === 'ball') {
          return <BallBody key={o.id} ball={o} physics={physics} palette={palette} pixel={pixel} selected={selected} />
        }
        return <SolidBody key={o.id} box={boxFor(o)} physics={physics} palette={palette} pixel={pixel} selected={selected} />
      })}
    </Physics>
  )
}

interface BodyProps {
  physics: PhysicsParams
  palette: ScenePalette
  pixel: number
  selected: boolean
}

function SolidBody({ box, physics, palette, pixel, selected }: BodyProps & { box: Box }) {
  const { center, rotationZ, halfExtents: h } = box
  return (
    <RigidBody type="fixed" position={[center.x, center.y, center.z]} rotation={[0, 0, rotationZ]} colliders={false}>
      <CuboidCollider args={[h.x, h.y, h.z]} friction={physics.friction} restitution={physics.bounce} />
      <mesh>
        <roundedBoxGeometry args={[h.x * 2, h.y * 2, h.z * 2, 4, Math.min(EDGE_RADIUS, h.x, h.y, h.z)]} />
        <meshStandardMaterial color={palette.ink} roughness={palette.roughness} metalness={0} />
      </mesh>
      {selected && <BoxOutline halfWidth={h.x} halfHeight={h.y} z={h.z} pixel={pixel} color={palette.accent} />}
    </RigidBody>
  )
}

function roundedRect(shape: Shape, halfWidth: number, halfHeight: number, radius: number): Shape {
  const r = Math.min(radius, halfWidth, halfHeight)
  shape.moveTo(-halfWidth + r, -halfHeight)
  shape.lineTo(halfWidth - r, -halfHeight)
  shape.absarc(halfWidth - r, -halfHeight + r, r, -Math.PI / 2, 0, false)
  shape.lineTo(halfWidth, halfHeight - r)
  shape.absarc(halfWidth - r, halfHeight - r, r, 0, Math.PI / 2, false)
  shape.lineTo(-halfWidth + r, halfHeight)
  shape.absarc(-halfWidth + r, halfHeight - r, r, Math.PI / 2, Math.PI, false)
  shape.lineTo(-halfWidth, -halfHeight + r)
  shape.absarc(-halfWidth + r, -halfHeight + r, r, Math.PI, Math.PI * 1.5, false)
  return shape
}

/** A hairline frame a few pixels outside a box's front face. */
function BoxOutline({ halfWidth, halfHeight, z, pixel, color }: { halfWidth: number; halfHeight: number; z: number; pixel: number; color: string }) {
  const shape = useMemo(() => {
    const gap = OUTLINE_GAP * pixel
    const width = OUTLINE_WIDTH * pixel
    const radius = EDGE_RADIUS + gap
    const outer = roundedRect(new Shape(), halfWidth + gap + width, halfHeight + gap + width, radius + width)
    outer.holes.push(roundedRect(new Shape(), halfWidth + gap, halfHeight + gap, radius))
    return outer
  }, [halfWidth, halfHeight, pixel])

  return (
    <mesh position={[0, 0, z + 0.001]} renderOrder={10}>
      <shapeGeometry args={[shape, 16]} />
      <meshBasicMaterial color={color} depthTest={false} toneMapped={false} />
    </mesh>
  )
}

/** A hairline circle facing the camera. */
function Ring({ inner, width, z, color, order = 0 }: { inner: number; width: number; z: number; color: string; order?: number }) {
  return (
    <mesh position={[0, 0, z]} renderOrder={order}>
      <ringGeometry args={[inner, inner + width, 96]} />
      <meshBasicMaterial color={color} depthTest={order === 0} toneMapped={false} />
    </mesh>
  )
}

function BallBody({ ball, physics, palette, pixel, selected }: BodyProps & { ball: BallObject }) {
  const bodyRef = useRef<RapierRigidBody>(null)
  const followRef = useRef<Group>(null)
  const { radius: r, position } = ball
  // A new trail for each run: Drop and Restart remount the body with `dynamic` flipped.
  const trail = useMemo(() => (ball.dynamic ? new TrailRibbon() : null), [ball.dynamic])

  useEffect(() => () => clearLiveBallPose(ball.id), [ball.id])
  useEffect(() => () => trail?.dispose(), [trail])
  useEffect(() => trail?.setColor(palette.accent), [trail, palette.accent])

  useFrame((_, delta) => {
    const body = bodyRef.current
    if (!body || !ball.dynamic) return
    const p = body.translation()
    setLiveBallPose(ball.id, p)
    followRef.current?.position.set(p.x, p.y, 0)
    if (!physics.paused) trail?.add(p.x, p.y, delta, pixel)
  })

  // In the plane through the ball's center, where its outline is; a ring at the front would shift with perspective.
  const outline = selected && <Ring inner={r + OUTLINE_GAP * pixel} width={OUTLINE_WIDTH * pixel} z={0} color={palette.accent} order={10} />

  return (
    <>
      <RigidBody
        ref={bodyRef}
        // Remount when Drop/Freeze/Restart switches the body type so it starts from the stored position.
        key={ball.dynamic ? 'moving' : 'waiting'}
        type={ball.dynamic ? 'dynamic' : 'kinematicPosition'}
        position={[position.x, position.y, position.z]}
        colliders={false}
        linearDamping={BALL_DAMPING}
        angularDamping={BALL_DAMPING}
        enabledTranslations={[true, true, false]}
      >
        <BallCollider args={[r]} friction={physics.friction} restitution={physics.bounce} />
        {ball.dynamic ? (
          <>
            <mesh>
              <sphereGeometry args={[r, 48, 32]} />
              <meshStandardMaterial color={palette.accent} roughness={0.38} metalness={0} />
            </mesh>
            {/* A great circle through the poles: the line across the ball shows it spinning. */}
            <mesh rotation={[0, Math.PI / 2, 0]}>
              <torusGeometry args={[r, (OUTLINE_WIDTH / 2) * pixel, 6, 96]} />
              <meshBasicMaterial color={palette.paper} toneMapped={false} />
            </mesh>
          </>
        ) : (
          <WaitingBall radius={r} pixel={pixel} palette={palette} />
        )}
        {!ball.dynamic && outline}
      </RigidBody>
      {trail && (
        <>
          <group ref={followRef} position={[position.x, position.y, 0]}>
            {outline}
            <mesh position={[SHADOW_OFFSET.x, SHADOW_OFFSET.y, SHADOW_Z]} scale={r * BALL_SHADOW_SPAN * 2} renderOrder={-1}>
              <planeGeometry />
              <meshBasicMaterial map={ballShadowTexture()} color="#000000" transparent opacity={palette.shadowOpacity} depthWrite={false} toneMapped={false} />
            </mesh>
          </group>
          <mesh geometry={trail.geometry} renderOrder={1} frustumCulled={false}>
            <meshBasicMaterial vertexColors transparent depthWrite={false} toneMapped={false} />
          </mesh>
        </>
      )}
    </>
  )
}

/** A ball waiting for Drop is drawn flat, like a circle on the sheet: tinted fill, outline, and center mark. */
function WaitingBall({ radius, pixel, palette }: { radius: number; pixel: number; palette: ScenePalette }) {
  const line = OUTLINE_WIDTH * pixel
  const mark = Math.min(radius * 0.7, 10 * pixel)
  return (
    <group>
      <mesh>
        <circleGeometry args={[radius, 96]} />
        <meshBasicMaterial color={palette.waitingFill} toneMapped={false} />
      </mesh>
      <Ring inner={radius - line} width={line} z={0.002} color={palette.accent} />
      <mesh position={[0, 0, 0.002]}>
        <planeGeometry args={[mark, line]} />
        <meshBasicMaterial color={palette.accent} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0, 0.002]}>
        <planeGeometry args={[line, mark]} />
        <meshBasicMaterial color={palette.accent} toneMapped={false} />
      </mesh>
    </group>
  )
}
