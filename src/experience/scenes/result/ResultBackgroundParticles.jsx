import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import {
  Color,
  MathUtils,
  NormalBlending,
  Vector2,
  Vector3,
} from 'three'
import { advanceActiveSceneTime } from '../../activeSceneTime.js'
import resultBackgroundParticleFragmentShader from './resultBackgroundParticleFragment.glsl?raw'
import resultBackgroundParticleVertexShader from './resultBackgroundParticleVertex.glsl?raw'
import { RESULT_SCENE_CONFIG as CONFIG } from './resultConfig.js'

const PARTICLE_COUNT = 260
const PARTICLE_SEED = 34217
// Capped so the strongest particle still lands around 20% opacity — big and
// blurred, but always visibly transparent against the backdrop.
const PARTICLE_OPACITY_SCALE = 0.22

// Weighted, overlapping regions create broad areas of activity. The bulk of
// the weight and the widest spreads sit in the lower-left quadrant, with
// lighter, smaller accents elsewhere so the field still reaches across the
// rest of the screen instead of stopping abruptly.
const PARTICLE_CLUSTERS = [
  {
    center: [-3.8, -2.4, -3.6],
    sizeScale: 1.05,
    spread: [4.6, 3.6, 2.4],
    weight: 0.34,
  },
  {
    center: [-1.9, -3.4, -4.1],
    sizeScale: 1.0,
    spread: [4.0, 2.8, 2.2],
    weight: 0.24,
  },
  {
    center: [-3.2, 2.2, -4.0],
    sizeScale: 0.85,
    spread: [3.2, 2.6, 2.0],
    weight: 0.16,
  },
  {
    center: [3.0, 0.3, -3.4],
    sizeScale: 0.85,
    spread: [2.8, 2.8, 2.0],
    weight: 0.14,
  },
  {
    center: [0.4, 3.6, -4.8],
    sizeScale: 0.68,
    spread: [4.8, 1.3, 1.8],
    weight: 0.12,
  },
]

function createSeededRandom(seed) {
  let value = seed >>> 0

  return () => {
    value = (value * 1664525 + 1013904223) >>> 0
    return value / 4294967296
  }
}

function chooseWeightedCluster(random) {
  const selection = random()
  let accumulatedWeight = 0

  for (const cluster of PARTICLE_CLUSTERS) {
    accumulatedWeight += cluster.weight
    if (selection <= accumulatedWeight) return cluster
  }

  return PARTICLE_CLUSTERS[PARTICLE_CLUSTERS.length - 1]
}

function createParticleAttributes() {
  const random = createSeededRandom(PARTICLE_SEED)
  const positions = new Float32Array(PARTICLE_COUNT * 3)
  const sizes = new Float32Array(PARTICLE_COUNT)
  const opacities = new Float32Array(PARTICLE_COUNT)
  const colorMixes = new Float32Array(PARTICLE_COUNT)
  const phases = new Float32Array(PARTICLE_COUNT)
  const driftSpeeds = new Float32Array(PARTICLE_COUNT)
  const orbitCenters = new Float32Array(PARTICLE_COUNT * 2)
  const orbitSpeeds = new Float32Array(PARTICLE_COUNT)

  for (let particleIndex = 0; particleIndex < PARTICLE_COUNT; particleIndex += 1) {
    const positionIndex = particleIndex * 3

    const cluster = chooseWeightedCluster(random)
    const clusterAngle = random() * Math.PI * 2
    // A gentler falloff than before (1.65 -> 1.15) fills each cluster's
    // spread more evenly instead of clumping most particles near its
    // center, so the wider spread values above actually read as spread out.
    const clusterRadius = Math.pow(random(), 1.15)
    const depthOffset = (random() - 0.5) * 0.3

    positions[positionIndex] = cluster.center[0]
      + Math.cos(clusterAngle) * clusterRadius * cluster.spread[0]
    positions[positionIndex + 1] = cluster.center[1]
      + (random() - 0.5) * 2 * clusterRadius * cluster.spread[1]
    positions[positionIndex + 2] = cluster.center[2]
      + Math.sin(clusterAngle) * clusterRadius * cluster.spread[2]
      + depthOffset

    const orbitCenterIndex = particleIndex * 2
    const orbitAngle = random() * Math.PI * 2
    const orbitRadius = 0.12 + Math.pow(random(), 1.4) * 1.05
    orbitCenters[orbitCenterIndex] = positions[positionIndex]
      - Math.cos(orbitAngle) * orbitRadius
    orbitCenters[orbitCenterIndex + 1] = positions[positionIndex + 2]
      - Math.sin(orbitAngle) * orbitRadius
    orbitSpeeds[particleIndex] = (random() < 0.5 ? -1 : 1)
      * (0.05 + random() * 0.14)

    // Most particles are restrained teal. The top end of this range becomes
    // gold, while the final few percent becomes a rare ivory accent.
    const colorChoice = random()
    colorMixes[particleIndex] = colorChoice < 0.8
      ? random() * 0.48
      : colorChoice < 0.97
        ? 0.55 + random() * 0.3
        : 0.94 + random() * 0.06

    sizes[particleIndex] = (34 + Math.pow(random(), 1.6) * 132)
      * cluster.sizeScale
    opacities[particleIndex] = (
      0.32 + Math.pow(random(), 1.5) * 0.58
    ) * PARTICLE_OPACITY_SCALE
    phases[particleIndex] = random() * Math.PI * 2
    driftSpeeds[particleIndex] = 0.07 + random() * 0.1
  }

  return {
    colorMixes,
    driftSpeeds,
    opacities,
    phases,
    positions,
    sizes,
    orbitCenters,
    orbitSpeeds,
  }
}

export default function ResultBackgroundParticles({
  pointerRef,
  reducedMotion,
  sceneStateRef,
}) {
  const activeTime = useRef(0)
  const materialReference = useRef()
  const pointerOffset = useRef({ x: 0, y: 0 })
  const attributes = useMemo(createParticleAttributes, [])
  const uniforms = useMemo(() => ({
    uDeepTeal: { value: new Color('#0b3f34') },
    uFieldCenter: {
      value: new Vector3(...CONFIG.atmosphere.backgroundParticles.fieldCenter),
    },
    uGold: { value: new Color('#efb44b') },
    uIvory: { value: new Color('#f6ead0') },
    uMotionScale: {
      value: CONFIG.atmosphere.backgroundParticles.motionScale,
    },
    uPixelRatio: { value: 1 },
    uPointer: { value: new Vector2() },
    uPointerRange: {
      value: new Vector3(...CONFIG.atmosphere.backgroundParticles.pointerRange),
    },
    uPointerRotation: {
      value: new Vector3(
        ...CONFIG.atmosphere.backgroundParticles.pointerRotation,
      ),
    },
    uScrollProgress: { value: 0 },
    uScrollMotionScale: {
      value: CONFIG.atmosphere.backgroundParticles.scrollMotionScale,
    },
    uScrollRotation: {
      value: new Vector3(...CONFIG.atmosphere.backgroundParticles.scrollRotation),
    },
    uScrollTravel: {
      value: new Vector3(...CONFIG.atmosphere.backgroundParticles.scrollTravel),
    },
    uTime: { value: 0 },
  }), [])

  useFrame(({ gl }, deltaTime) => {
    if (!materialReference.current) return

    materialReference.current.uniforms.uPixelRatio.value = gl.getPixelRatio()

    if (!sceneStateRef?.current?.isActive) return

    activeTime.current = advanceActiveSceneTime(
      activeTime.current,
      deltaTime,
      !reducedMotion,
    )
    materialReference.current.uniforms.uTime.value = reducedMotion
      ? 0
      : activeTime.current

    const pointer = pointerRef?.current
    const targetPointerX = reducedMotion ? 0 : pointer?.ndcX ?? 0
    const targetPointerY = reducedMotion ? 0 : pointer?.ndcY ?? 0
    pointerOffset.current.x = MathUtils.damp(
      pointerOffset.current.x,
      targetPointerX,
      CONFIG.atmosphere.backgroundParticles.pointerDamping,
      deltaTime,
    )
    pointerOffset.current.y = MathUtils.damp(
      pointerOffset.current.y,
      targetPointerY,
      CONFIG.atmosphere.backgroundParticles.pointerDamping,
      deltaTime,
    )
    materialReference.current.uniforms.uPointer.value.set(
      pointerOffset.current.x,
      pointerOffset.current.y,
    )
    materialReference.current.uniforms.uScrollProgress.value = reducedMotion
      ? 0
      : sceneStateRef.current.motionProgress
        ?? sceneStateRef.current.progress
        ?? 0
  })

  return (
    <points
      frustumCulled={false}
      position={CONFIG.atmosphere.backgroundParticles.position}
      renderOrder={-1}
    >
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[attributes.positions, 3]}
        />
        <bufferAttribute
          attach="attributes-aSize"
          args={[attributes.sizes, 1]}
        />
        <bufferAttribute
          attach="attributes-aOpacity"
          args={[attributes.opacities, 1]}
        />
        <bufferAttribute
          attach="attributes-aColorMix"
          args={[attributes.colorMixes, 1]}
        />
        <bufferAttribute
          attach="attributes-aPhase"
          args={[attributes.phases, 1]}
        />
        <bufferAttribute
          attach="attributes-aDriftSpeed"
          args={[attributes.driftSpeeds, 1]}
        />
        <bufferAttribute
          attach="attributes-aOrbitCenter"
          args={[attributes.orbitCenters, 2]}
        />
        <bufferAttribute
          attach="attributes-aOrbitSpeed"
          args={[attributes.orbitSpeeds, 1]}
        />
      </bufferGeometry>
      <shaderMaterial
        ref={materialReference}
        uniforms={uniforms}
        vertexShader={resultBackgroundParticleVertexShader}
        fragmentShader={resultBackgroundParticleFragmentShader}
        blending={NormalBlending}
        depthWrite={false}
        transparent
      />
    </points>
  )
}
