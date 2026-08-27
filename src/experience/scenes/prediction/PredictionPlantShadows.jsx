import { useFrame } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import {
  Color,
  DynamicDrawUsage,
  MathUtils,
  Object3D,
  PlaneGeometry,
  ShaderMaterial,
} from 'three'
import { PREDICTION_RENDER_CONFIG as CONFIG } from './predictionConfig.js'
import {
  createPredictionShadowDescriptors,
  getPredictionShadowOpacity,
} from './predictionPlantShadows.js'
import fragmentShader from './predictionPlantShadowFragment.glsl?raw'
import vertexShader from './predictionPlantShadowVertex.glsl?raw'

const SHADOWS = CONFIG.shadows

export function PredictionPlantShadows({ fieldLayouts, weatherRef }) {
  const meshRef = useRef()
  const lastDensity = useRef(-1)
  const descriptors = useMemo(
    () => createPredictionShadowDescriptors(fieldLayouts, CONFIG),
    [fieldLayouts],
  )
  const geometry = useMemo(() => {
    const plane = new PlaneGeometry(1, 1)
    plane.rotateX(-Math.PI / 2)
    return plane
  }, [])
  const uniforms = useMemo(() => ({
    uColor: { value: new Color(SHADOWS.color) },
    uOpacity: { value: SHADOWS.baseOpacity },
  }), [])
  const material = useMemo(() => new ShaderMaterial({
    depthTest: true,
    depthWrite: false,
    fragmentShader,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
    transparent: true,
    uniforms,
    vertexShader,
  }), [uniforms])
  const scratch = useMemo(() => new Object3D(), [])
  const directionLength = Math.hypot(...SHADOWS.direction)
  const directionX = SHADOWS.direction[0] / directionLength
  const directionZ = SHADOWS.direction[1] / directionLength
  const shadowRotation = Math.atan2(directionX, directionZ)

  const updateMatrices = (densityStrength) => {
    if (!meshRef.current) return
    const horizontalSpacing = MathUtils.lerp(
      1,
      CONFIG.weather.fieldDensity.horizontalSpacingScale,
      densityStrength,
    )
    const depthSpacing = MathUtils.lerp(
      1,
      CONFIG.weather.fieldDensity.depthSpacingScale,
      densityStrength,
    )
    const densityScale = MathUtils.lerp(
      1,
      CONFIG.weather.fieldDensity.plantScale,
      densityStrength,
    )

    descriptors.forEach((descriptor, index) => {
      const scale = descriptor.isHero
        ? 1
        : descriptor.scale * densityScale
      const length = descriptor.isHero
        ? SHADOWS.heroLength
        : Math.max(SHADOWS.minimumLength, scale * SHADOWS.lengthScale)
      const width = descriptor.isHero
        ? SHADOWS.heroWidth
        : Math.max(SHADOWS.minimumWidth, scale * SHADOWS.widthScale)
      const x = descriptor.position.x * (descriptor.isHero ? 1 : horizontalSpacing)
      const z = descriptor.position.z * (descriptor.isHero ? 1 : depthSpacing)

      scratch.position.set(
        x + directionX * length * 0.5,
        SHADOWS.y,
        z + directionZ * length * 0.5,
      )
      scratch.rotation.set(0, shadowRotation, 0)
      scratch.scale.set(width, 1, length)
      scratch.updateMatrix()
      meshRef.current.setMatrixAt(index, scratch.matrix)
    })
    meshRef.current.instanceMatrix.needsUpdate = true
  }

  useLayoutEffect(() => {
    meshRef.current.instanceMatrix.setUsage(DynamicDrawUsage)
    updateMatrices(0)
  })

  useEffect(() => () => {
    geometry.dispose()
    material.dispose()
  }, [geometry, material])

  useFrame(() => {
    const weather = weatherRef?.current
    if (!weather?.active) return
    uniforms.uOpacity.value = getPredictionShadowOpacity(weather, SHADOWS)
    const density = weather.fieldDensity ?? 0
    if (Math.abs(density - lastDensity.current) > 0.0002) {
      lastDensity.current = density
      updateMatrices(density)
    }
  })

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, descriptors.length]}
      frustumCulled={false}
      renderOrder={-1}
    />
  )
}
