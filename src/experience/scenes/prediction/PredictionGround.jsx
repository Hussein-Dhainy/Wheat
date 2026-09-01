import { useFrame, useLoader, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import {
  Color,
  MathUtils,
  RepeatWrapping,
  SRGBColorSpace,
  TextureLoader,
  Vector2,
} from 'three'
import { PREDICTION_RENDER_CONFIG as CONFIG } from './predictionConfig.js'

const GROUND = CONFIG.ground
const GROUND_TEXTURE_URLS = [
  GROUND.colorMapUrl,
  GROUND.normalMapUrl,
]

export function PredictionGround({ weatherRef }) {
  const { gl } = useThree()
  const [colorMap, normalMap] = useLoader(
    TextureLoader,
    GROUND_TEXTURE_URLS,
  )
  const normalScale = useMemo(
    () => new Vector2(GROUND.normalScale, GROUND.normalScale),
    [],
  )
  const materialRef = useRef()
  const colors = useMemo(() => ({
    base: new Color(GROUND.tint),
    disease: new Color(CONFIG.weather.disease.ground.tint),
    drought: new Color(CONFIG.weather.drought.ground.tint),
    display: new Color(GROUND.tint),
    storm: new Color(CONFIG.weather.ground.tint),
  }), [])

  useEffect(() => {
    const maximumAnisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy())

    [colorMap, normalMap].forEach((texture) => {
      texture.wrapS = RepeatWrapping
      texture.wrapT = RepeatWrapping
      texture.repeat.set(...GROUND.repeat)
      texture.anisotropy = maximumAnisotropy
      texture.needsUpdate = true
    })
    colorMap.colorSpace = SRGBColorSpace
  }, [colorMap, gl, normalMap])

  useFrame(() => {
    const weather = weatherRef?.current
    if (!materialRef.current || !weather?.active) return
    const weatherStrength = weather.strength ?? 0
    const droughtStrength = weather.drought ?? 0
    const diseaseStrength = weather.disease ?? 0
    colors.display
      .copy(colors.base)
      .lerp(colors.storm, weatherStrength)
      .lerp(colors.drought, droughtStrength)
      .lerp(colors.disease, diseaseStrength)
    materialRef.current.color.copy(colors.display)
    const stormRoughness = MathUtils.lerp(
      1,
      CONFIG.weather.ground.roughness,
      weatherStrength,
    )
    const droughtRoughness = MathUtils.lerp(
      stormRoughness,
      CONFIG.weather.drought.ground.roughness,
      droughtStrength,
    )
    materialRef.current.roughness = MathUtils.lerp(
      droughtRoughness,
      CONFIG.weather.disease.ground.roughness,
      diseaseStrength,
    )
  })

  return (
    // No receiveShadow here: the renderer never enables a shadow map, and
    // grounding is faked by PredictionPlantShadows precisely so this scene
    // does not have to pay for one.
    <mesh
      position={GROUND.position}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <planeGeometry
        args={[
          GROUND.size[0],
          GROUND.size[1],
          GROUND.segments[0],
          GROUND.segments[1],
        ]}
      />
      <meshStandardMaterial
        ref={materialRef}
        color={GROUND.tint}
        map={colorMap}
        metalness={0}
        normalMap={normalMap}
        normalScale={normalScale}
        roughness={1}
      />
    </mesh>
  )
}

useLoader.preload(TextureLoader, GROUND_TEXTURE_URLS)
