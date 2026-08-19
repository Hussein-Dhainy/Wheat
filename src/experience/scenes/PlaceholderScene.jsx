import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { Color, MathUtils } from 'three'
import { advanceActiveSceneTime } from '../activeSceneTime.js'

const BACKGROUND_COLOR_DAMPING = 5
const GENETICS_EXIT_Y = 5.5

function getGeneticsExitProgress(sceneState) {
  if (sceneState.sectionIndex < 0) return 0
  if (sceneState.sectionIndex === 0) return sceneState.sectionProgress
  return 1
}

function GeneticsPlaceholder() {
  return (
    <mesh>
      <icosahedronGeometry args={[1.55, 2]} />
      <meshStandardMaterial
        color="#b9d86b"
        emissive="#244d27"
        emissiveIntensity={0.42}
        metalness={0.08}
        roughness={0.44}
        wireframe
      />
    </mesh>
  )
}

function FieldPlaceholder() {
  return (
    <group position={[0, -1.4, 0]}>
      {[-1.4, -0.7, 0, 0.7, 1.4].map((x, index) => (
        <group key={x} position={[x, Math.abs(index - 2) * -0.12, 0]}>
          <mesh position={[0, 1.25, 0]}>
            <cylinderGeometry args={[0.045, 0.07, 2.5, 8]} />
            <meshStandardMaterial color="#8cac4e" roughness={0.78} />
          </mesh>
          <mesh position={[0, 2.45, 0]} scale={[0.35, 0.78, 0.35]}>
            <dodecahedronGeometry args={[0.62, 0]} />
            <meshStandardMaterial color="#e3b94d" roughness={0.66} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function ResultPlaceholder() {
  return (
    <mesh scale={[0.82, 1.4, 0.82]}>
      <capsuleGeometry args={[0.8, 1.6, 12, 24]} />
      <meshStandardMaterial
        color="#f0b84c"
        emissive="#6d2b0b"
        emissiveIntensity={0.24}
        metalness={0.12}
        roughness={0.38}
      />
    </mesh>
  )
}

const PLACEHOLDER_GEOMETRY = {
  field: FieldPlaceholder,
  genetics: GeneticsPlaceholder,
  result: ResultPlaceholder,
}

export function PlaceholderScene({
  background,
  reducedMotion,
  sceneStateRef,
  sectionBackgrounds,
  variant,
}) {
  const activeTime = useRef(0)
  const backgroundColor = useRef()
  const backgroundTarget = useRef(new Color(background))
  const fog = useRef()
  const object = useRef()
  const PlaceholderGeometry = PLACEHOLDER_GEOMETRY[variant]

  useFrame((_, delta) => {
    if (!sceneStateRef.current.isActive) return

    activeTime.current = advanceActiveSceneTime(
      activeTime.current,
      delta,
      !reducedMotion,
    )
    const sceneState = sceneStateRef.current
    const visibility = sceneState.visibility
    const targetScale = 0.86 + visibility * 0.14
    const idleRotation = reducedMotion
      ? 0
      : activeTime.current * 0.12
    const sectionBackground = sectionBackgrounds?.[sceneState.sectionId]
      ?? background

    backgroundTarget.current.set(sectionBackground)
    if (reducedMotion) {
      backgroundColor.current.copy(backgroundTarget.current)
    } else {
      backgroundColor.current.lerp(
        backgroundTarget.current,
        1 - Math.exp(-BACKGROUND_COLOR_DAMPING * delta),
      )
    }
    fog.current.color.copy(backgroundColor.current)

    if (variant === 'genetics') {
      const exitProgress = getGeneticsExitProgress(sceneState)
      object.current.position.y = reducedMotion
        ? exitProgress >= 1 ? GENETICS_EXIT_Y : 0
        : MathUtils.lerp(
            0,
            GENETICS_EXIT_Y,
            MathUtils.smootherstep(exitProgress, 0, 1),
          )
    }

    object.current.rotation.y = MathUtils.damp(
      object.current.rotation.y,
      idleRotation,
      3,
      delta,
    )
    object.current.rotation.x = MathUtils.damp(
      object.current.rotation.x,
      reducedMotion ? 0 : Math.sin(activeTime.current * 0.35) * 0.08,
      3,
      delta,
    )
    object.current.scale.setScalar(
      reducedMotion
        ? targetScale
        : MathUtils.damp(object.current.scale.x, targetScale, 5, delta),
    )
  })

  return (
    <>
      <color ref={backgroundColor} attach="background" args={[background]} />
      <fog ref={fog} attach="fog" args={[background, 8, 17]} />
      <ambientLight color="#fff8dc" intensity={0.72} />
      <directionalLight color="#fff2bb" intensity={3.4} position={[4, 5, 5]} />
      <directionalLight color="#86c5aa" intensity={1.1} position={[-4, -1, -3]} />

      <group ref={object} scale={0.86}>
        <PlaceholderGeometry />
      </group>
    </>
  )
}
