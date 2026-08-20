import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import {
  AdditiveBlending,
  CatmullRomCurve3,
  Color,
  Vector2,
  Vector3,
} from 'three'
import { advanceActiveSceneTime } from '../../activeSceneTime.js'
import { DNA_RENDER_CONFIG } from './dnaConfig.js'
import trailParticleFragmentShader from './trailParticleFragment.glsl?raw'
import trailParticleVertexShader from './trailParticleVertex.glsl?raw'

const TRAIL_SEED = 37109
// Each whole trail drifts together (see trailParticleVertex.glsl) so its
// dotted path never tears apart as it scrolls and wraps.
const SCROLL_TRAVEL = 8
const SCROLL_WRAP_RANGE = 10

// Each entry is one art-directed path. They deliberately occupy different
// depths and regions so they read as atmosphere surrounding the DNA rather
// than as another part of its geometry.
const TRAIL_DEFINITIONS = [
  {
    closed: true,
    loop: {
      center: [0, 0, -2.85],
      controlPointCount: 11,
      depthVariation: 0.85,
      irregularity: 0.18,
      radius: [3.65, 1.65],
    },
    orbitCenter: [0, 0],
    orbitSpeed: 0.028,
    particleCount: 148,
  },
  {
    closed: true,
    loop: {
      center: [-3.65, 1.25, -3.8],
      controlPointCount: 8,
      depthVariation: 0.62,
      irregularity: 0.3,
      radius: [2.05, 0.78],
    },
    particleCount: 72,
  },
  {
    closed: true,
    loop: {
      center: [3.75, -1.65, -3.55],
      controlPointCount: 9,
      depthVariation: 0.68,
      irregularity: 0.26,
      radius: [2.2, 0.82],
    },
    particleCount: 78,
  },
  {
    points: [[-5.1, 2.8, -4.4], [-4.05, 3.05, -3.15], [-3.25, 2.62, -2.35], [-1.95, 2.9, -3.75]],
    particleCount: 84,
  },
  {
    points: [[-5.25, -1.65, -2.25], [-4.15, -1.38, -3.65], [-3.35, -1.88, -4.2], [-2.15, -1.52, -2.9]],
    particleCount: 76,
  },
  {
    points: [[-3.3, -3.15, -4.65], [-2.25, -2.75, -3.2], [-1.25, -3.28, -2.55], [0.15, -2.9, -4.0]],
    particleCount: 72,
  },
  {
    points: [[0.75, 2.82, -4.4], [1.85, 3.1, -2.85], [2.85, 2.58, -2.25], [4.15, 2.9, -3.8]],
    particleCount: 80,
  },
  {
    points: [[5.3, 1.35, -2.2], [4.35, 1.72, -3.7], [3.35, 1.15, -4.35], [2.0, 1.48, -2.8]],
    particleCount: 88,
  },
  {
    points: [[5.25, -2.7, -4.5], [4.2, -2.32, -3.05], [3.25, -2.85, -2.4], [1.9, -2.42, -3.85]],
    particleCount: 80,
  },
  {
    points: [[-0.4, -3.85, -2.25], [0.75, -3.48, -3.8], [1.8, -4.0, -4.45], [3.15, -3.62, -2.9]],
    particleCount: 70,
  },
  {
    points: [[-3.55, 3.82, -4.75], [-2.25, 4.08, -3.2], [-0.9, 3.55, -2.55], [0.55, 3.85, -4.15]],
    particleCount: 68,
  },
  {
    orbitCenter: [0, -3.75],
    orbitSpeed: 0.018,
    points: [
      [-5.4, 0.55, -4.8],
      [-3.1, 0.82, -2.85],
      [-0.9, 0.38, -4.5],
      [1.2, 0.72, -2.65],
      [3.4, 0.42, -4.7],
      [5.45, 0.68, -3.1],
    ],
    particleCount: 128,
  },
  {
    orbitCenter: [0, -3.9],
    orbitSpeed: -0.022,
    points: [
      [-5.25, -0.7, -2.7],
      [-3.2, -0.38, -4.75],
      [-1.15, -0.82, -2.95],
      [1.0, -0.45, -4.85],
      [3.15, -0.78, -2.75],
      [5.35, -0.5, -4.55],
    ],
    particleCount: 124,
  },
]

const TOTAL_PARTICLE_COUNT = TRAIL_DEFINITIONS.reduce(
  (total, trail) => total + trail.particleCount,
  0,
)

function createSeededRandom(seed) {
  let value = seed >>> 0

  return () => {
    value = (value * 1664525 + 1013904223) >>> 0
    return value / 4294967296
  }
}

function createLoopControlPoints(loop, random) {
  const points = []
  const depthPhase = random() * Math.PI * 2

  for (
    let controlPointIndex = 0;
    controlPointIndex < loop.controlPointCount;
    controlPointIndex += 1
  ) {
    const angle = controlPointIndex / loop.controlPointCount * Math.PI * 2
    const radiusVariation = 1
      + (random() - 0.5) * 2 * loop.irregularity
    const verticalVariation = 1
      + (random() - 0.5) * loop.irregularity

    points.push(new Vector3(
      loop.center[0]
        + Math.cos(angle) * loop.radius[0] * radiusVariation,
      loop.center[1]
        + Math.sin(angle) * loop.radius[1] * verticalVariation,
      loop.center[2]
        + Math.sin(angle * 2 + depthPhase) * loop.depthVariation,
    ))
  }

  return points
}

function createTrailAttributes() {
  const random = createSeededRandom(TRAIL_SEED)
  const positions = new Float32Array(TOTAL_PARTICLE_COUNT * 3)
  const sizes = new Float32Array(TOTAL_PARTICLE_COUNT)
  const opacities = new Float32Array(TOTAL_PARTICLE_COUNT)
  const colorMixes = new Float32Array(TOTAL_PARTICLE_COUNT)
  const trailProgresses = new Float32Array(TOTAL_PARTICLE_COUNT)
  const trailPhases = new Float32Array(TOTAL_PARTICLE_COUNT)
  const driftSpeeds = new Float32Array(TOTAL_PARTICLE_COUNT)
  const orbitCenters = new Float32Array(TOTAL_PARTICLE_COUNT * 2)
  const orbitSpeeds = new Float32Array(TOTAL_PARTICLE_COUNT)

  let particleIndex = 0

  TRAIL_DEFINITIONS.forEach((trailDefinition, trailIndex) => {
    const controlPoints = trailDefinition.loop
      ? createLoopControlPoints(trailDefinition.loop, random)
      : trailDefinition.points.map((point) => (
        new Vector3(point[0], point[1], point[2])
      ))
    const curve = new CatmullRomCurve3(
      controlPoints,
      Boolean(trailDefinition.closed),
      'centripetal',
    )
    const trailPhase = random() * Math.PI * 2
    const driftSpeed = 0.045 + random() * 0.055
    const averageX = controlPoints.reduce(
      (sum, point) => sum + point.x,
      0,
    ) / controlPoints.length
    const averageZ = controlPoints.reduce(
      (sum, point) => sum + point.z,
      0,
    ) / controlPoints.length
    const orbitCenterX = trailDefinition.orbitCenter?.[0]
      ?? averageX + (random() - 0.5) * 0.9
    const orbitCenterZ = trailDefinition.orbitCenter?.[1]
      ?? averageZ + (random() - 0.5) * 0.9
    const orbitSpeed = trailDefinition.orbitSpeed
      ?? (random() < 0.5 ? -1 : 1) * (0.025 + random() * 0.055)

    for (
      let trailParticleIndex = 0;
      trailParticleIndex < trailDefinition.particleCount;
      trailParticleIndex += 1
    ) {
      const positionIndex = particleIndex * 3
      const progressDivisor = trailDefinition.closed
        ? trailDefinition.particleCount
        : Math.max(1, trailDefinition.particleCount - 1)
      const progress = trailParticleIndex / progressDivisor
      const point = curve.getPointAt(progress)

      // A tiny seeded offset prevents the trails from feeling mechanically
      // perfect while retaining their clearly readable dotted paths.
      positions[positionIndex] = point.x + (random() - 0.5) * 0.035
      positions[positionIndex + 1] = point.y + (random() - 0.5) * 0.035
      positions[positionIndex + 2] = point.z + (random() - 0.5) * 0.16

      sizes[particleIndex] = 4.25 + random() * 3.25
      opacities[particleIndex] = 0.28 + random() * 0.42

      const accentChoice = random()
      colorMixes[particleIndex] = accentChoice < 0.93
        ? 0.3 + random() * 0.58
        : 0.96 + random() * 0.04

      trailProgresses[particleIndex] = progress
      trailPhases[particleIndex] = trailPhase + trailIndex * 0.17
      driftSpeeds[particleIndex] = driftSpeed
      orbitCenters[particleIndex * 2] = orbitCenterX
      orbitCenters[particleIndex * 2 + 1] = orbitCenterZ
      orbitSpeeds[particleIndex] = orbitSpeed
      particleIndex += 1
    }
  })

  return {
    colorMixes,
    driftSpeeds,
    opacities,
    positions,
    sizes,
    trailPhases,
    trailProgresses,
    orbitCenters,
    orbitSpeeds,
  }
}

export default function DNAParticleTrails({
  entryFlowRef,
  reducedMotion,
  sceneStateRef,
}) {
  const activeTime = useRef(0)
  const materialReference = useRef()
  const attributes = useMemo(createTrailAttributes, [])
  const uniforms = useMemo(() => ({
    uDeepGreen: { value: new Color('#08704f') },
    uEmerald: { value: new Color('#22e596') },
    uPink: { value: new Color('#ff315f') },
    uPixelRatio: { value: 1 },
    uScrollProgress: { value: 0 },
    uScrollAxisTravel: {
      value: new Vector2(...DNA_RENDER_CONFIG.particleFlow.trailAxisTravel),
    },
    uScrollFlowCycles: { value: DNA_RENDER_CONFIG.particleFlow.cycles },
    uScrollFlowStrength: {
      value: DNA_RENDER_CONFIG.particleFlow.trailStrength,
    },
    uScrollTravel: { value: SCROLL_TRAVEL },
    uScrollWrapRange: { value: SCROLL_WRAP_RANGE },
    uTime: { value: 0 },
  }), [])
  useFrame(({ gl }, deltaTime) => {
    if (!materialReference.current) return

    materialReference.current.uniforms.uPixelRatio.value = gl.getPixelRatio()

    if (!sceneStateRef?.current?.isActive) return

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
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[attributes.positions, 3]} />
        <bufferAttribute attach="attributes-aSize" args={[attributes.sizes, 1]} />
        <bufferAttribute attach="attributes-aOpacity" args={[attributes.opacities, 1]} />
        <bufferAttribute attach="attributes-aColorMix" args={[attributes.colorMixes, 1]} />
        <bufferAttribute attach="attributes-aTrailProgress" args={[attributes.trailProgresses, 1]} />
        <bufferAttribute attach="attributes-aTrailPhase" args={[attributes.trailPhases, 1]} />
        <bufferAttribute attach="attributes-aDriftSpeed" args={[attributes.driftSpeeds, 1]} />
        <bufferAttribute attach="attributes-aOrbitCenter" args={[attributes.orbitCenters, 2]} />
        <bufferAttribute attach="attributes-aOrbitSpeed" args={[attributes.orbitSpeeds, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={materialReference}
        uniforms={uniforms}
        vertexShader={trailParticleVertexShader}
        fragmentShader={trailParticleFragmentShader}
        blending={AdditiveBlending}
        depthWrite={false}
        transparent
      />
    </points>
  )
}
