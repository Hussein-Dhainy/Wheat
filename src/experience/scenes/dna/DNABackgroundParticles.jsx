import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { AdditiveBlending, Color, Vector2 } from 'three'
import { advanceActiveSceneTime } from '../../activeSceneTime.js'
import { DNA_RENDER_CONFIG } from './dnaConfig.js'
import backgroundParticleFragmentShader from './backgroundParticleFragment.glsl?raw'
import backgroundParticleVertexShader from './backgroundParticleVertex.glsl?raw'

const PARTICLE_SEED = 94721
const PARTICLE_OPACITY_SCALE = 0.5
// How far (world units) particles travel upward across the scene's full
// scroll range, before per-particle parallax and the wrap-around loop.
const SCROLL_TRAVEL = 9
const SCROLL_WRAP_RANGE = 11

// Weighted, overlapping regions create broad areas of activity. Their edges
// deliberately cross the center so particles can pass behind the DNA.
const PARTICLE_CLUSTERS = [
  {
    center: [-3.15, 2.35, -2.65],
    sizeScale: 0.9,
    spread: [2.35, 1.85, 1.75],
    weight: 0.18,
  },
  {
    center: [-3.25, -1.55, -3.35],
    sizeScale: 1.12,
    spread: [2.65, 2.55, 1.95],
    weight: 0.22,
  },
  {
    center: [3.05, 2.3, -3.3],
    sizeScale: 0.95,
    spread: [2.5, 2.0, 1.9],
    weight: 0.2,
  },
  {
    center: [3.2, -2.0, -2.7],
    sizeScale: 1.08,
    spread: [2.45, 2.4, 1.8],
    weight: 0.22,
  },
  {
    center: [0.15, 3.85, -4.55],
    sizeScale: 0.72,
    spread: [3.25, 1.1, 1.75],
    weight: 0.08,
  },
  {
    center: [-0.25, -3.8, -4.6],
    sizeScale: 0.78,
    spread: [3.45, 1.2, 1.85],
    weight: 0.1,
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

function createParticleAttributes(particleCount) {
  const random = createSeededRandom(PARTICLE_SEED)
  const positions = new Float32Array(particleCount * 3)
  const sizes = new Float32Array(particleCount)
  const opacities = new Float32Array(particleCount)
  const colorMixes = new Float32Array(particleCount)
  const phases = new Float32Array(particleCount)
  const driftSpeeds = new Float32Array(particleCount)
  const orbitCenters = new Float32Array(particleCount * 2)
  const orbitSpeeds = new Float32Array(particleCount)

  for (let particleIndex = 0; particleIndex < particleCount; particleIndex += 1) {
    const positionIndex = particleIndex * 3

    const cluster = chooseWeightedCluster(random)
    const clusterAngle = random() * Math.PI * 2
    const clusterRadius = Math.pow(random(), 1.65)
    const depthOffset = (random() - 0.5) * 0.28

    positions[positionIndex] = cluster.center[0]
      + Math.cos(clusterAngle) * clusterRadius * cluster.spread[0]
    positions[positionIndex + 1] = cluster.center[1]
      + (random() - 0.5) * 2 * clusterRadius * cluster.spread[1]
    positions[positionIndex + 2] = cluster.center[2]
      + Math.sin(clusterAngle) * clusterRadius * cluster.spread[2]
      + depthOffset

    const depthFactor = Math.min(
      1,
      Math.max(0, (-positions[positionIndex + 2] - 1.2) / 5.2),
    )

    const orbitCenterIndex = particleIndex * 2
    const orbitAngle = random() * Math.PI * 2
    const orbitRadius = 0.12 + Math.pow(random(), 1.4) * 1.05
    orbitCenters[orbitCenterIndex] = positions[positionIndex]
      - Math.cos(orbitAngle) * orbitRadius
    orbitCenters[orbitCenterIndex + 1] = positions[positionIndex + 2]
      - Math.sin(orbitAngle) * orbitRadius
    orbitSpeeds[particleIndex] = (random() < 0.5 ? -1 : 1)
      * (0.055 + random() * 0.16)

    // Most particles are restrained teal. The top end of this range becomes
    // emerald, while the final few percent becomes the rare pink accent.
    const colorChoice = random()
    colorMixes[particleIndex] = colorChoice < 0.8
      ? random() * 0.48
      : colorChoice < 0.97
        ? 0.55 + random() * 0.3
        : 0.94 + random() * 0.06

    sizes[particleIndex] = (2.5 + Math.pow(random(), 1.75) * 48)
      * cluster.sizeScale
      * (1 - depthFactor * 0.28)
    opacities[particleIndex] = (
      0.12 + Math.pow(random(), 1.65) * 0.48
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

export default function DNABackgroundParticles({
  entryFlowRef,
  particleCount,
  reducedMotion,
  sceneStateRef,
}) {
  const activeTime = useRef(0)
  const materialReference = useRef()
  const attributes = useMemo(
    () => createParticleAttributes(particleCount),
    [particleCount],
  )
  const uniforms = useMemo(() => ({
    uDarkTeal: { value: new Color('#07543f') },
    uEmerald: { value: new Color('#19cf82') },
    uPink: { value: new Color('#ef315f') },
    uPixelRatio: { value: 1 },
    uScrollProgress: { value: 0 },
    uScrollAxisTravel: {
      value: new Vector2(...DNA_RENDER_CONFIG.particleFlow.backgroundAxisTravel),
    },
    uScrollFlowCycles: { value: DNA_RENDER_CONFIG.particleFlow.cycles },
    uScrollFlowStrength: {
      value: DNA_RENDER_CONFIG.particleFlow.backgroundStrength,
    },
    uScrollTravel: { value: SCROLL_TRAVEL },
    uScrollWrapRange: { value: SCROLL_WRAP_RANGE },
    uTime: { value: 0 },
  }), [])

  useFrame(({ gl }, deltaTime) => {
    if (!materialReference.current) return
    if (!sceneStateRef?.current?.isActive) return

    materialReference.current.uniforms.uPixelRatio.value = gl.getPixelRatio()

    const sceneProgress = reducedMotion
      ? Math.min(1, Math.max(0, sceneStateRef.current.progress))
      : sceneStateRef.current.motionProgress
        ?? sceneStateRef.current.progress
    const entryFlowProgress = (entryFlowRef?.current ?? 0)
      * DNA_RENDER_CONFIG.particleFlow.entryProgress
    materialReference.current.uniforms.uScrollProgress.value = (
      sceneProgress + entryFlowProgress
    )

    activeTime.current = advanceActiveSceneTime(
      activeTime.current,
      deltaTime,
      !reducedMotion,
    )
    materialReference.current.uniforms.uTime.value = reducedMotion
      ? 0
      : activeTime.current
  })

  return (
    <points frustumCulled={false} renderOrder={-1}>
      <bufferGeometry key={particleCount}>
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
        vertexShader={backgroundParticleVertexShader}
        fragmentShader={backgroundParticleFragmentShader}
        blending={AdditiveBlending}
        depthWrite={false}
        transparent
      />
    </points>
  )
}
