import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { Color } from 'three'
import predictionSkyFragmentShader from './predictionSkyFragment.glsl?raw'
import predictionSkyVertexShader from './predictionSkyVertex.glsl?raw'
import { PREDICTION_RENDER_CONFIG as CONFIG } from './predictionConfig.js'

const SKY = CONFIG.sky

function createPalette(palette) {
  return {
    bottom: new Color(palette.bottom),
    horizon: new Color(palette.horizon),
    top: new Color(palette.top),
  }
}

export function PredictionSky({ weatherRef }) {
  const meshRef = useRef()
  const palettes = useMemo(() => ({
    base: createPalette(SKY.palettes.base),
    disease: createPalette(SKY.palettes.disease),
    drought: createPalette(SKY.palettes.drought),
    flash: new Color(CONFIG.weather.flashColor),
    storm: createPalette(SKY.palettes.storm),
  }), [])
  const uniforms = useMemo(() => ({
    uBottomColor: { value: palettes.base.bottom.clone() },
    uHazeStrength: { value: SKY.hazeStrength },
    uHorizonColor: { value: palettes.base.horizon.clone() },
    uHorizonY: { value: SKY.horizonY },
    uTopColor: { value: palettes.base.top.clone() },
  }), [palettes])

  useFrame(({ camera }) => {
    const weather = weatherRef?.current
    if (!meshRef.current || !weather?.active) return

    meshRef.current.position.set(
      camera.position.x,
      camera.position.y + SKY.verticalOffset,
      SKY.distance,
    )

    const storm = weather.strength ?? 0
    const drought = weather.drought ?? 0
    const disease = weather.disease ?? 0
    const lightning = weather.lightning ?? 0

    uniforms.uTopColor.value
      .copy(palettes.base.top)
      .lerp(palettes.storm.top, storm)
      .lerp(palettes.drought.top, drought)
      .lerp(palettes.disease.top, disease)
      .lerp(palettes.flash, lightning * 0.58)
    uniforms.uHorizonColor.value
      .copy(palettes.base.horizon)
      .lerp(palettes.storm.horizon, storm)
      .lerp(palettes.drought.horizon, drought)
      .lerp(palettes.disease.horizon, disease)
      .lerp(palettes.flash, lightning * 0.82)
    uniforms.uBottomColor.value
      .copy(palettes.base.bottom)
      .lerp(palettes.storm.bottom, storm)
      .lerp(palettes.drought.bottom, drought)
      .lerp(palettes.disease.bottom, disease)
      .lerp(palettes.flash, lightning * 0.42)
  })

  return (
    <mesh ref={meshRef} frustumCulled={false} renderOrder={-100}>
      <planeGeometry args={SKY.size} />
      <shaderMaterial
        depthTest={false}
        depthWrite={false}
        fragmentShader={predictionSkyFragmentShader}
        toneMapped={false}
        uniforms={uniforms}
        vertexShader={predictionSkyVertexShader}
      />
    </mesh>
  )
}
