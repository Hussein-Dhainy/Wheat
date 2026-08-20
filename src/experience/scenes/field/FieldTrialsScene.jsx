import { useFrame, useLoader, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import {
  Color,
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
import { advanceActiveSceneTime } from '../../activeSceneTime.js'
import { FIELD_TRIALS_CONFIG as CONFIG } from './fieldTrialsConfig.js'
import fieldShadowFragmentShader from './fieldShadowFragment.glsl?raw'
import fieldShadowVertexShader from './fieldShadowVertex.glsl?raw'
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
  const pointerLook = useRef({ pitch: 0, yaw: 0 })
  const shadowMaterialRef = useRef()
  const shadowTime = useRef(0)
  const shadowUniforms = useMemo(() => ({
    uBottomOpacity: { value: CONFIG.screenShadow.bottomOpacity },
    uCloudOpacity: { value: CONFIG.screenShadow.cloudOpacity },
    uDriftAmount: { value: CONFIG.screenShadow.driftAmount },
    uDriftSpeed: { value: CONFIG.screenShadow.driftSpeed },
    uEndFadeEnd: { value: CONFIG.screenShadow.endFadeEnd },
    uEndFadeStart: { value: CONFIG.screenShadow.endFadeStart },
    uFadeEnd: { value: CONFIG.screenShadow.fadeEnd },
    uFadeStart: { value: CONFIG.screenShadow.fadeStart },
    uOpacityExponent: { value: CONFIG.screenShadow.opacityExponent },
    uRightVignetteOpacity: { value: CONFIG.screenShadow.rightVignetteOpacity },
    uShadowColor: { value: new Color(CONFIG.screenShadow.color) },
    uShadowProgress: { value: 0 },
    uTime: { value: 0 },
    uTopVignetteOpacity: { value: CONFIG.screenShadow.topVignetteOpacity },
  }), [])
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
    camera.up.set(0, 1, 0)
    camera.position.set(0, CONFIG.camera.startHeight, CONFIG.camera.startTargetZ)
    camera.quaternion.identity()
    camera.rotateX(CONFIG.camera.startPitchDegrees * DEGREES_TO_RADIANS)
    camera.updateProjectionMatrix()
  }, [camera, fieldTexture, gl])

  useEffect(() => () => tintTexture.dispose(), [tintTexture])

  useFrame((_, delta) => {
    const sceneState = sceneStateRef?.current
    if (!sceneState?.isActive) return

    // Narrative progress stays clamped for shadow/content stages, while
    // motionProgress continues below 0 or beyond 1 through either wipe.
    const visibility = MathUtils.clamp(sceneState.visibility ?? 0, 0, 1)
    const sceneProgress = MathUtils.clamp(sceneState.progress ?? 0, 0, 1)
    const progress = reducedMotion
      ? sceneProgress
      : sceneState.motionProgress ?? sceneProgress

    const height = MathUtils.lerp(
      CONFIG.camera.startHeight,
      CONFIG.camera.endHeight,
      progress,
    )
    const targetZ = MathUtils.lerp(
      CONFIG.camera.startTargetZ,
      CONFIG.camera.endTargetZ,
      progress,
    )
    // Angled at both ends, dipping through perpendicular (straight down) at
    // the midpoint rather than easing linearly between the two.
    const basePitchDegrees = progress < 0.5
      ? MathUtils.lerp(
          CONFIG.camera.startPitchDegrees,
          CONFIG.camera.midPitchDegrees,
          progress / 0.5,
        )
      : MathUtils.lerp(
          CONFIG.camera.midPitchDegrees,
          CONFIG.camera.endPitchDegrees,
          (progress - 0.5) / 0.5,
        )

    const pointer = pointerRef?.current
    // rotateY's positive direction turns the camera toward -X (screen-left)
    // for our forward/up convention, so this is negated to make mouse-right
    // turn the camera right.
    const pointerTargetYaw = reducedMotion
      ? 0
      : -(pointer?.ndcX ?? 0) * CONFIG.camera.pointerYawDegrees * DEGREES_TO_RADIANS
    const pointerTargetPitch = reducedMotion
      ? 0
      : (pointer?.ndcY ?? 0) * CONFIG.camera.pointerPitchDegrees * DEGREES_TO_RADIANS

    pointerLook.current.yaw = reducedMotion
      ? pointerTargetYaw
      : MathUtils.damp(
          pointerLook.current.yaw,
          pointerTargetYaw,
          CONFIG.camera.pointerDamping,
          delta,
        )
    pointerLook.current.pitch = reducedMotion
      ? pointerTargetPitch
      : MathUtils.damp(
          pointerLook.current.pitch,
          pointerTargetPitch,
          CONFIG.camera.pointerDamping,
          delta,
        )

    camera.position.set(0, height, targetZ)
    // Rotating in the camera's own local frame (rather than composing a
    // fixed-axis Euler angle) keeps mouse-look correct at any pitch,
    // including looking nearly straight down — a world-axis yaw becomes a
    // roll (the image spins in place) once "forward" and "up" are nearly
    // parallel, which is exactly what was happening before this.
    camera.quaternion.identity()
    camera.rotateX(basePitchDegrees * DEGREES_TO_RADIANS)
    camera.rotateY(pointerLook.current.yaw)
    camera.rotateX(pointerLook.current.pitch)

    const atSceneThreeBoundary = sceneState.phase === 'transition'
      && sceneProgress === 0
    const transitionShare = CONFIG.screenShadow.transitionProgressShare
    const shadowProgress = atSceneThreeBoundary
      ? MathUtils.smoothstep(visibility, 0, 1) * transitionShare
      : transitionShare + MathUtils.smoothstep(
          sceneProgress,
          0,
          CONFIG.screenShadow.clearSceneProgress,
        ) * (1 - transitionShare)
    const clampedShadowProgress = MathUtils.clamp(shadowProgress, 0, 1)
    shadowTime.current = advanceActiveSceneTime(
      shadowTime.current,
      delta,
      !reducedMotion,
    )
    shadowUniforms.uShadowProgress.value = clampedShadowProgress
    shadowUniforms.uTime.value = reducedMotion ? 0 : shadowTime.current
    if (shadowMaterialRef.current) {
      shadowMaterialRef.current.uniforms.uShadowProgress.value = (
        clampedShadowProgress
      )
      shadowMaterialRef.current.uniforms.uTime.value = reducedMotion
        ? 0
        : shadowTime.current
    }

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

      <mesh frustumCulled={false} renderOrder={10}>
        <planeGeometry args={[2, 2]} />
        <shaderMaterial
          ref={shadowMaterialRef}
          depthTest={false}
          depthWrite={false}
          fragmentShader={fieldShadowFragmentShader}
          toneMapped={false}
          transparent
          uniforms={shadowUniforms}
          vertexShader={fieldShadowVertexShader}
        />
      </mesh>
    </>
  )
}
