import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { AdditiveBlending, Color } from 'three'
import { advanceActiveSceneTime } from '../activeSceneTime.js'
import {
  backgroundParticleFragmentShader,
  backgroundParticleVertexShader,
} from '../shaders/backgroundParticles.js'

const BACKGROUND_PARTICLES = {
  count: 440,
  minimumSize: 12,
  maximumSize: 82,
  opacity: 0.2,
  minimumOrbitSpeed: 0.05,
  maximumOrbitSpeed: 0.1,
}

// Screen-space composition controls live here. Each group stays gathered around
// its own center while the shader circulates every particle within that group.
const PARTICLE_CLUSTERS = [
  {
    count: 342,
    center: [-4.35, 1.75, -5],
    spread: [8.15, 8.65],
    direction: -1,
  },
  {
    count: 298,
    center: [2.35, -1.55, -5.1],
    spread: [6.25, 6.55],
    direction: -1,
  },
]

function createSeededRandom(seed = 8041) {
  let value = seed >>> 0

  return () => {
    value = (value * 1664525 + 1013904223) >>> 0
    return value / 4294967296
  }
}

function createBackgroundParticleAttributes() {
  const random = createSeededRandom()
  const positions = new Float32Array(BACKGROUND_PARTICLES.count * 3)
  const phases = new Float32Array(BACKGROUND_PARTICLES.count)
  const sizes = new Float32Array(BACKGROUND_PARTICLES.count)
  const shapes = new Float32Array(BACKGROUND_PARTICLES.count)
  const orbitSpeeds = new Float32Array(BACKGROUND_PARTICLES.count)
  const orbitCenters = new Float32Array(BACKGROUND_PARTICLES.count * 3)

  let particleIndex = 0

  PARTICLE_CLUSTERS.forEach((cluster) => {
    for (let clusterIndex = 0; clusterIndex < cluster.count; clusterIndex += 1) {
      const positionIndex = particleIndex * 3
      const centerIndex = particleIndex * 3
      const angle = random() * Math.PI * 2
      const radius = 0.12 + Math.pow(random(), 1.8) * 0.88

      positions[positionIndex] = cluster.center[0]
        + Math.cos(angle) * radius * cluster.spread[0]
      positions[positionIndex + 1] = cluster.center[1]
        + (random() - 0.5) * 2 * radius * cluster.spread[1]
      positions[positionIndex + 2] = cluster.center[2]
        + Math.sin(angle) * radius * cluster.spread[0]
      orbitCenters[centerIndex] = cluster.center[0]
      orbitCenters[centerIndex + 1] = cluster.center[1]
      orbitCenters[centerIndex + 2] = cluster.center[2]
      phases[particleIndex] = random() * Math.PI * 2
      sizes[particleIndex] = BACKGROUND_PARTICLES.minimumSize
        + Math.pow(random(), 1.7)
        * (BACKGROUND_PARTICLES.maximumSize - BACKGROUND_PARTICLES.minimumSize)
      shapes[particleIndex] = random() > 0.3 ? 6 : 5
      orbitSpeeds[particleIndex] = cluster.direction * (
        BACKGROUND_PARTICLES.minimumOrbitSpeed
        + random() * (
          BACKGROUND_PARTICLES.maximumOrbitSpeed
          - BACKGROUND_PARTICLES.minimumOrbitSpeed
        )
      )
      particleIndex += 1
    }
  })

  return { positions, phases, sizes, shapes, orbitSpeeds, orbitCenters }
}

export function BackgroundParticles({ reducedMotion, sceneStateRef }) {
  const activeTime = useRef(0)
  const material = useRef()
  const attributes = useMemo(createBackgroundParticleAttributes, [])
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uOpacity: { value: BACKGROUND_PARTICLES.opacity },
      uGold: { value: new Color('#dcae43') },
      uRed: { value: new Color('#8f3933') },
    }),
    [],
  )

  useFrame((_, delta) => {
    if (sceneStateRef && !sceneStateRef.current.isActive) return

    activeTime.current = advanceActiveSceneTime(
      activeTime.current,
      delta,
      !reducedMotion,
    )
    material.current.uniforms.uTime.value = reducedMotion ? 0 : activeTime.current
  })

  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[attributes.positions, 3]}
        />
        <bufferAttribute attach="attributes-aPhase" args={[attributes.phases, 1]} />
        <bufferAttribute attach="attributes-aSize" args={[attributes.sizes, 1]} />
        <bufferAttribute attach="attributes-aShape" args={[attributes.shapes, 1]} />
        <bufferAttribute
          attach="attributes-aOrbitSpeed"
          args={[attributes.orbitSpeeds, 1]}
        />
        <bufferAttribute
          attach="attributes-aOrbitCenter"
          args={[attributes.orbitCenters, 3]}
        />
      </bufferGeometry>
      <shaderMaterial
        ref={material}
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
