import { useFrame, useLoader, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import {
  DataTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  MathUtils,
  NearestFilter,
  RGBAFormat,
  SRGBColorSpace,
  TextureLoader,
  UnsignedByteType,
  Vector2,
} from 'three'
import { FIELD_TRIALS_CONFIG as CONFIG } from './fieldTrialsConfig.js'
import fieldTrialsFragmentShader from './fieldTrialsFragment.glsl?raw'
import { createFieldTintData } from './fieldTintLayout.js'
import fieldTrialsVertexShader from './fieldTrialsVertex.glsl?raw'

const DEGREES_TO_RADIANS = Math.PI / 180

export function FieldTrialsScene({
  pointerRef,
  reducedMotion,
  sceneStateRef,
}) {
  const { camera, gl } = useThree()
  const fieldTexture = useLoader(TextureLoader, CONFIG.textureUrl)
  const pointerPosition = useRef({ x: 0, z: 0 })
  const tintTexture = useMemo(() => {
    const { data } = createFieldTintData({
      gridSize: CONFIG.gridSize,
      overrides: CONFIG.tint.overrides,
      palette: CONFIG.tint.palette,
      seed: CONFIG.tint.seed,
    })
    const texture = new DataTexture(
      data,
      CONFIG.gridSize[0],
      CONFIG.gridSize[1],
      RGBAFormat,
      UnsignedByteType,
    )
    texture.minFilter = NearestFilter
    texture.magFilter = NearestFilter
    texture.generateMipmaps = false
    texture.needsUpdate = true
    return texture
  }, [])
  const uniforms = useMemo(() => ({
    uBrightness: { value: CONFIG.image.brightness },
    uContrast: { value: CONFIG.image.contrast },
    uDividerDarkening: { value: CONFIG.tint.dividerDarkening },
    uDividerWidth: { value: CONFIG.tint.dividerWidth },
    uFieldTexture: { value: fieldTexture },
    uGridSize: { value: new Vector2(...CONFIG.gridSize) },
    uSaturation: { value: CONFIG.image.saturation },
    uTintStrength: { value: CONFIG.tint.strength },
    uTintTexture: { value: tintTexture },
  }), [fieldTexture, tintTexture])

  useEffect(() => {
    fieldTexture.colorSpace = SRGBColorSpace
    fieldTexture.minFilter = LinearMipmapLinearFilter
    fieldTexture.magFilter = LinearFilter
    fieldTexture.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy())
    fieldTexture.needsUpdate = true

    camera.fov = CONFIG.camera.fov
    camera.up.set(0, 0, -1)
    camera.position.set(
      0,
      CONFIG.camera.height,
      CONFIG.camera.startTargetZ
        + Math.tan(CONFIG.camera.startTiltDegrees * DEGREES_TO_RADIANS)
          * CONFIG.camera.height,
    )
    camera.lookAt(0, 0, CONFIG.camera.startTargetZ)
    camera.updateProjectionMatrix()
  }, [camera, fieldTexture, gl])

  useEffect(() => () => tintTexture.dispose(), [tintTexture])

  useFrame((_, delta) => {
    if (!sceneStateRef?.current?.isActive) return

    const progress = MathUtils.clamp(
      sceneStateRef.current.progress ?? 0,
      0,
      1,
    )
    const pointer = pointerRef?.current
    const pointerTargetX = reducedMotion
      ? 0
      : (pointer?.ndcX ?? 0) * CONFIG.camera.pointerPanX
    const pointerTargetZ = reducedMotion
      ? 0
      : (pointer?.ndcY ?? 0) * CONFIG.camera.pointerPanZ

    pointerPosition.current.x = reducedMotion
      ? pointerTargetX
      : MathUtils.damp(
          pointerPosition.current.x,
          pointerTargetX,
          CONFIG.camera.pointerDamping,
          delta,
        )
    pointerPosition.current.z = reducedMotion
      ? pointerTargetZ
      : MathUtils.damp(
          pointerPosition.current.z,
          pointerTargetZ,
          CONFIG.camera.pointerDamping,
          delta,
        )

    const targetZ = MathUtils.lerp(
      CONFIG.camera.startTargetZ,
      CONFIG.camera.endTargetZ,
      progress,
    ) + pointerPosition.current.z
    const tiltDegrees = MathUtils.lerp(
      CONFIG.camera.startTiltDegrees,
      CONFIG.camera.endTiltDegrees,
      reducedMotion ? 0.5 : progress,
    )
    const cameraZ = targetZ
      + Math.tan(tiltDegrees * DEGREES_TO_RADIANS) * CONFIG.camera.height

    camera.position.set(
      pointerPosition.current.x,
      CONFIG.camera.height,
      cameraZ,
    )
    camera.lookAt(pointerPosition.current.x, 0, targetZ)
  })

  return (
    <>
      <color attach="background" args={[CONFIG.background]} />
      <mesh rotation-x={-Math.PI / 2}>
        <planeGeometry args={[CONFIG.planeSize, CONFIG.planeSize]} />
        <shaderMaterial
          fragmentShader={fieldTrialsFragmentShader}
          toneMapped
          uniforms={uniforms}
          vertexShader={fieldTrialsVertexShader}
        />
      </mesh>
    </>
  )
}
