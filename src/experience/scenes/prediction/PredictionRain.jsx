import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { NormalBlending } from 'three'
import predictionRainFragmentShader from './predictionRainFragment.glsl?raw'
import predictionRainVertexShader from './predictionRainVertex.glsl?raw'
import { PREDICTION_RENDER_CONFIG as CONFIG } from './predictionConfig.js'

const RAIN = CONFIG.weather.rain

function seededRandom(seed) {
  let state = seed >>> 0
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 4294967296
  }
}

function createRainAttributes(count) {
  const random = seededRandom(739391)
  const positions = new Float32Array(count * 3)
  const sizes = new Float32Array(count)
  const speeds = new Float32Array(count)

  for (let index = 0; index < count; index += 1) {
    const positionOffset = index * 3
    positions[positionOffset] = (random() * 2 - 1) * RAIN.horizontalRange
    positions[positionOffset + 1] = (random() * 2 - 1) * RAIN.height * 0.5
    positions[positionOffset + 2] = RAIN.depthRange[0]
      + random() * (RAIN.depthRange[1] - RAIN.depthRange[0])
    sizes[index] = 18 + random() * 24
    speeds[index] = RAIN.speedRange[0]
      + random() * (RAIN.speedRange[1] - RAIN.speedRange[0])
  }

  return { positions, sizes, speeds }
}

export function PredictionRain({ quality, reducedMotion, weatherRef }) {
  const groupRef = useRef()
  const materialRef = useRef()
  const pointsRef = useRef()
  const count = reducedMotion
    ? RAIN.reducedMotionCount
    : quality === 'low'
      ? Math.round(RAIN.count * 0.55)
      : RAIN.count
  const attributes = useMemo(() => createRainAttributes(count), [count])

  useFrame(({ camera, gl }) => {
    if (!groupRef.current || !materialRef.current || !pointsRef.current) return
    const weather = weatherRef?.current
    const strength = weather?.strength ?? 0
    pointsRef.current.visible = Boolean(weather?.active) && strength > 0.004
    if (!pointsRef.current.visible) return

    groupRef.current.position.x = camera.position.x
    groupRef.current.position.y = camera.position.y
    const uniforms = materialRef.current.uniforms
    uniforms.uTime.value = weather.time
    uniforms.uWind.value = strength
    uniforms.uStrength.value = strength
    uniforms.uFlash.value = weather.lightning
    uniforms.uPixelRatio.value = gl.getPixelRatio()
  })

  return (
    <group ref={groupRef}>
      <points ref={pointsRef} frustumCulled={false} renderOrder={20}>
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
            attach="attributes-aSpeed"
            args={[attributes.speeds, 1]}
          />
        </bufferGeometry>
        <shaderMaterial
          ref={materialRef}
          blending={NormalBlending}
          depthTest
          depthWrite={false}
          fragmentShader={predictionRainFragmentShader}
          toneMapped={false}
          transparent
          uniforms={{
            uFlash: { value: 0 },
            uHalfHeight: { value: RAIN.height * 0.5 },
            uHeight: { value: RAIN.height },
            uHorizontalRange: { value: RAIN.horizontalRange },
            uOpacity: { value: RAIN.opacity },
            uPixelRatio: { value: 1 },
            uStrength: { value: 0 },
            uTime: { value: 0 },
            uWind: { value: 0 },
          }}
          vertexShader={predictionRainVertexShader}
        />
      </points>
    </group>
  )
}
