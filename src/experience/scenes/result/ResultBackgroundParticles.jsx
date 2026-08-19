import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { AdditiveBlending, Color } from 'three'
import { advanceActiveSceneTime } from '../../activeSceneTime.js'
import resultBackgroundParticleFragmentShader from './resultBackgroundParticleFragment.glsl?raw'
import resultBackgroundParticleVertexShader from './resultBackgroundParticleVertex.glsl?raw'

const PARTICLE_COUNT = 420
const PARTICLE_SEED = 34217
const PARTICLE_OPACITY_SCALE = 0.42

// Weighted, overlapping regions create broad areas of activity around the
// grain, mirroring the genetics scene's clustered background field.
const PARTICLE_CLUSTERS = [
  {
    center: [-3.1, 1.9, -3.4],
    sizeScale: 0.95,
    spread: [2.6, 2.2, 1.8],
    weight: 0.24,
  },
  {
    center: [-2.6, -2.1, -3.9],
    sizeScale: 1.05,
    spread: [2.4, 2.1, 1.9],
    weight: 0.22,
  },
  {
    center: [3.3, 2.1, -3.2],
    sizeScale: 0.92,
    spread: [2.3, 2.0, 1.7],
    weight: 0.22,
  },
  {
    center: [2.9, -2.3, -3.7],
    sizeScale: 1.0,
    spread: [2.5, 2.2, 1.9],
    weight: 0.22,
  },
  {
    center: [0.2, 3.5, -4.6],
    sizeScale: 0.7,
    spread: [3.4, 1.1, 1.7],
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
    const clusterRadius = Math.pow(random(), 1.65)
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

    sizes[particleIndex] = (2.5 + Math.pow(random(), 1.75) * 44)
      * cluster.sizeScale
    opacities[particleIndex] = (
      0.12 + Math.pow(random(), 1.65) * 0.46
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

export default function ResultBackgroundParticles({ reducedMotion, sceneStateRef }) {
  const activeTime = useRef(0)
  const materialReference = useRef()
  const attributes = useMemo(createParticleAttributes, [])
  const uniforms = useMemo(() => ({
    uDeepTeal: { value: new Color('#0b3f34') },
    uGold: { value: new Color('#efb44b') },
    uIvory: { value: new Color('#f6ead0') },
    uPixelRatio: { value: 1 },
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
  })

  return (
    <points frustumCulled={false} renderOrder={-1}>
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
        blending={AdditiveBlending}
        depthWrite={false}
        transparent
      />
    </points>
  )
}
