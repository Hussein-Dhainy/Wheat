import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { AdditiveBlending, Color, Vector2 } from 'three'
import { advanceActiveSceneTime } from '../../activeSceneTime.js'
import { DNA_RENDER_CONFIG } from './dnaConfig.js'
import bokehParticleFragmentShader from './bokehParticleFragment.glsl?raw'
import bokehParticleVertexShader from './bokehParticleVertex.glsl?raw'

const BOKEH_PARTICLE_COUNT = 180
const BOKEH_PARTICLE_SEED = 63827
// Furthest-back, largest layer — moves the most of the three particle
// systems to sell the strongest parallax.
const SCROLL_TRAVEL = 14
const SCROLL_WRAP_RANGE = 13

// Bokeh clusters echo the denser ambient regions but remain broader and
// slightly offset, creating soft depth behind the sharper point clusters.
const BOKEH_CLUSTERS = [
  {
    center: [-3.35, 1.65, -4.15],
    sizeScale: 1.08,
    spread: [2.45, 2.6, 1.75],
    weight: 0.25,
  },
  {
    center: [-2.75, -2.75, -5.0],
    sizeScale: 0.82,
    spread: [2.75, 1.75, 1.55],
    weight: 0.18,
  },
  {
    center: [3.1, 2.25, -4.55],
    sizeScale: 0.9,
    spread: [2.55, 2.0, 1.6],
    weight: 0.22,
  },
  {
    center: [3.35, -1.9, -3.85],
    sizeScale: 1.15,
    spread: [2.35, 2.65, 1.85],
    weight: 0.27,
  },
  {
    center: [0.0, -4.0, -5.5],
    sizeScale: 0.68,
    spread: [3.4, 1.15, 1.4],
    weight: 0.08,
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

  for (const cluster of BOKEH_CLUSTERS) {
    accumulatedWeight += cluster.weight
    if (selection <= accumulatedWeight) return cluster
  }

  return BOKEH_CLUSTERS[BOKEH_CLUSTERS.length - 1]
}

function createBokehAttributes() {
  const random = createSeededRandom(BOKEH_PARTICLE_SEED)
  const positions = new Float32Array(BOKEH_PARTICLE_COUNT * 3)
  const sizes = new Float32Array(BOKEH_PARTICLE_COUNT)
  const opacities = new Float32Array(BOKEH_PARTICLE_COUNT)
  const colorMixes = new Float32Array(BOKEH_PARTICLE_COUNT)
  const phases = new Float32Array(BOKEH_PARTICLE_COUNT)
  const driftSpeeds = new Float32Array(BOKEH_PARTICLE_COUNT)
  const orbitCenters = new Float32Array(BOKEH_PARTICLE_COUNT * 2)
  const orbitSpeeds = new Float32Array(BOKEH_PARTICLE_COUNT)

  for (
    let particleIndex = 0;
    particleIndex < BOKEH_PARTICLE_COUNT;
    particleIndex += 1
  ) {
    const positionIndex = particleIndex * 3
    const cluster = chooseWeightedCluster(random)
    const clusterAngle = random() * Math.PI * 2
    const clusterRadius = Math.pow(random(), 1.45)

    positions[positionIndex] = cluster.center[0]
      + Math.cos(clusterAngle) * clusterRadius * cluster.spread[0]
    positions[positionIndex + 1] = cluster.center[1]
      + (random() - 0.5) * 2 * clusterRadius * cluster.spread[1]
    positions[positionIndex + 2] = cluster.center[2]
      + Math.sin(clusterAngle) * clusterRadius * cluster.spread[2]

    const depthFactor = Math.min(
      1,
      Math.max(0, (-positions[positionIndex + 2] - 2.4) / 4.2),
    )

    const orbitCenterIndex = particleIndex * 2
    const orbitAngle = random() * Math.PI * 2
    const orbitRadius = 0.3 + Math.pow(random(), 1.2) * 1.7
    orbitCenters[orbitCenterIndex] = positions[positionIndex]
      - Math.cos(orbitAngle) * orbitRadius
    orbitCenters[orbitCenterIndex + 1] = positions[positionIndex + 2]
      - Math.sin(orbitAngle) * orbitRadius
    orbitSpeeds[particleIndex] = (random() < 0.5 ? -1 : 1)
      * (0.018 + random() * 0.052)

    sizes[particleIndex] = (28 + Math.pow(random(), 1.35) * 210)
      * cluster.sizeScale
      * (1 - depthFactor * 0.18)
    opacities[particleIndex] = 0.018 + Math.pow(random(), 2.1) * 0.082
    colorMixes[particleIndex] = random()
    phases[particleIndex] = random() * Math.PI * 2
    driftSpeeds[particleIndex] = 0.025 + random() * 0.045
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

export default function DNABokehParticles({
  entryFlowRef,
  reducedMotion,
  sceneStateRef,
}) {
  const activeTime = useRef(0)
  const materialReference = useRef()
  const attributes = useMemo(createBokehAttributes, [])
  const uniforms = useMemo(() => ({
    uDeepTeal: { value: new Color('#063d32') },
    uForestGreen: { value: new Color('#0b6847') },
    uPixelRatio: { value: 1 },
    uScrollProgress: { value: 0 },
    uScrollAxisTravel: {
      value: new Vector2(...DNA_RENDER_CONFIG.particleFlow.bokehAxisTravel),
    },
    uScrollFlowCycles: { value: DNA_RENDER_CONFIG.particleFlow.cycles },
    uScrollFlowStrength: {
      value: DNA_RENDER_CONFIG.particleFlow.bokehStrength,
    },
    uScrollTravel: { value: SCROLL_TRAVEL },
    uScrollWrapRange: { value: SCROLL_WRAP_RANGE },
    uTime: { value: 0 },
  }), [])

  useFrame(({ gl }, deltaTime) => {
    if (!materialReference.current) return

    materialReference.current.uniforms.uPixelRatio.value = gl.getPixelRatio()

    if (!sceneStateRef?.current?.isActive) return

    const sceneProgress = Math.min(
      1,
      Math.max(0, sceneStateRef.current.progress),
    )
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
    <points frustumCulled={false} renderOrder={-2}>
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
        vertexShader={bokehParticleVertexShader}
        fragmentShader={bokehParticleFragmentShader}
        blending={AdditiveBlending}
        depthWrite={false}
        transparent
      />
    </points>
  )
}
