import { createPortal, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Color, MathUtils, Scene } from 'three'
import { FieldInstances } from './FieldInstances.jsx'
import { createBlurPass, createRenderTarget } from './fieldGeometry.js'
import { PREDICTION_RENDER_CONFIG as CONFIG } from './predictionConfig.js'

export function FieldLayer({
  assets,
  background,
  layer,
  layouts,
  renderOrder,
  sceneStateRef,
  weatherRef,
}) {
  const { gl, size, viewport } = useThree()
  const [fieldScene] = useState(() => new Scene())
  const [sourceRenderTarget] = useState(() => createRenderTarget(true))
  const [horizontalBlurTarget] = useState(() => createRenderTarget(false))
  const [verticalBlurTarget] = useState(() => createRenderTarget(false))
  const blurPass = useMemo(
    () => createBlurPass(
      sourceRenderTarget.texture,
      layer.blurRadius,
    ),
    [layer.blurRadius, sourceRenderTarget],
  )
  const backdropReference = useRef()
  const hemisphereLightRef = useRef()
  const keyLightRef = useRef()
  const rimLightRef = useRef()
  const lightningLightRef = useRef()
  const savedClearColor = useMemo(() => new Color(), [])
  const weatherColors = useMemo(() => ({
    background: new Color(background),
    displayBackground: new Color(background),
    displayGround: new Color(CONFIG.lighting.hemisphere.groundColor),
    displayKey: new Color(CONFIG.lighting.key.color),
    displayRim: new Color(CONFIG.lighting.rim.color),
    displaySky: new Color(CONFIG.lighting.hemisphere.skyColor),
    flash: new Color(CONFIG.weather.flashColor),
    ground: new Color(CONFIG.lighting.hemisphere.groundColor),
    key: new Color(CONFIG.lighting.key.color),
    rim: new Color(CONFIG.lighting.rim.color),
    sky: new Color(CONFIG.lighting.hemisphere.skyColor),
    stormBackground: new Color(CONFIG.weather.backgroundColor),
    stormGround: new Color(CONFIG.weather.lighting.hemisphere.groundColor),
    stormKey: new Color(CONFIG.weather.lighting.key.color),
    stormRim: new Color(CONFIG.weather.lighting.rim.color),
    stormSky: new Color(CONFIG.weather.lighting.hemisphere.skyColor),
    droughtBackground: new Color(CONFIG.weather.drought.backgroundColor),
    droughtGround: new Color(CONFIG.weather.drought.lighting.hemisphere.groundColor),
    droughtKey: new Color(CONFIG.weather.drought.lighting.key.color),
    droughtRim: new Color(CONFIG.weather.drought.lighting.rim.color),
    droughtSky: new Color(CONFIG.weather.drought.lighting.hemisphere.skyColor),
    diseaseBackground: new Color(CONFIG.weather.disease.backgroundColor),
    diseaseGround: new Color(
      CONFIG.weather.disease.lighting.hemisphere.groundColor,
    ),
    diseaseKey: new Color(CONFIG.weather.disease.lighting.key.color),
    diseaseRim: new Color(CONFIG.weather.disease.lighting.rim.color),
    diseaseSky: new Color(CONFIG.weather.disease.lighting.hemisphere.skyColor),
  }), [background])

  useEffect(() => {
    const width = Math.max(
      1,
      Math.round(size.width * viewport.dpr * layer.blurResolutionScale),
    )
    const height = Math.max(
      1,
      Math.round(size.height * viewport.dpr * layer.blurResolutionScale),
    )
    sourceRenderTarget.setSize(width, height)
    horizontalBlurTarget.setSize(width, height)
    verticalBlurTarget.setSize(width, height)
    blurPass.material.uniforms.uTexelSize.value.set(
      1 / width,
      1 / height,
    )
  }, [
    blurPass,
    horizontalBlurTarget,
    layer.blurResolutionScale,
    size.height,
    size.width,
    sourceRenderTarget,
    verticalBlurTarget,
    viewport.dpr,
  ])

  useEffect(() => () => {
    sourceRenderTarget.dispose()
    horizontalBlurTarget.dispose()
    verticalBlurTarget.dispose()
    blurPass.geometry.dispose()
    blurPass.material.dispose()
  }, [blurPass, horizontalBlurTarget, sourceRenderTarget, verticalBlurTarget])

  useFrame(({ camera }) => {
    if (!sceneStateRef?.current?.isActive || !backdropReference.current) return

    const weather = weatherRef?.current
    const strength = weather?.strength ?? 0
    const drought = weather?.drought ?? 0
    const disease = weather?.disease ?? 0
    const lightning = weather?.lightning ?? 0

    weatherColors.displaySky
      .copy(weatherColors.sky)
      .lerp(weatherColors.stormSky, strength)
      .lerp(weatherColors.droughtSky, drought)
      .lerp(weatherColors.diseaseSky, disease)
      .lerp(weatherColors.flash, lightning * 0.4)
    weatherColors.displayGround
      .copy(weatherColors.ground)
      .lerp(weatherColors.stormGround, strength)
      .lerp(weatherColors.droughtGround, drought)
      .lerp(weatherColors.diseaseGround, disease)
      .lerp(weatherColors.flash, lightning * 0.18)
    if (hemisphereLightRef.current) {
      hemisphereLightRef.current.color.copy(weatherColors.displaySky)
      hemisphereLightRef.current.groundColor.copy(weatherColors.displayGround)
      const stormIntensity = MathUtils.lerp(
        CONFIG.lighting.hemisphere.intensity,
        CONFIG.weather.lighting.hemisphere.intensity,
        strength,
      )
      const droughtIntensity = MathUtils.lerp(
        stormIntensity,
        CONFIG.weather.drought.lighting.hemisphere.intensity,
        drought,
      )
      hemisphereLightRef.current.intensity = MathUtils.lerp(
        droughtIntensity,
        CONFIG.weather.disease.lighting.hemisphere.intensity,
        disease,
      ) + lightning * 1.5
    }

    weatherColors.displayKey
      .copy(weatherColors.key)
      .lerp(weatherColors.stormKey, strength)
      .lerp(weatherColors.droughtKey, drought)
      .lerp(weatherColors.diseaseKey, disease)
      .lerp(weatherColors.flash, lightning * 0.68)
    if (keyLightRef.current) {
      keyLightRef.current.color.copy(weatherColors.displayKey)
      const stormIntensity = MathUtils.lerp(
        CONFIG.lighting.key.intensity,
        CONFIG.weather.lighting.key.intensity,
        strength,
      )
      const droughtIntensity = MathUtils.lerp(
        stormIntensity,
        CONFIG.weather.drought.lighting.key.intensity,
        drought,
      )
      keyLightRef.current.intensity = MathUtils.lerp(
        droughtIntensity,
        CONFIG.weather.disease.lighting.key.intensity,
        disease,
      ) + lightning * 3.5
    }

    weatherColors.displayRim
      .copy(weatherColors.rim)
      .lerp(weatherColors.stormRim, strength)
      .lerp(weatherColors.droughtRim, drought)
      .lerp(weatherColors.diseaseRim, disease)
      .lerp(weatherColors.flash, lightning * 0.45)
    if (rimLightRef.current) {
      rimLightRef.current.color.copy(weatherColors.displayRim)
      const stormIntensity = MathUtils.lerp(
        CONFIG.lighting.rim.intensity,
        CONFIG.weather.lighting.rim.intensity,
        strength,
      )
      const droughtIntensity = MathUtils.lerp(
        stormIntensity,
        CONFIG.weather.drought.lighting.rim.intensity,
        drought,
      )
      rimLightRef.current.intensity = MathUtils.lerp(
        droughtIntensity,
        CONFIG.weather.disease.lighting.rim.intensity,
        disease,
      ) + lightning * 1.8
    }
    if (lightningLightRef.current) {
      lightningLightRef.current.intensity = lightning
        * CONFIG.weather.lighting.lightning.intensity
    }

    const previousRenderTarget = gl.getRenderTarget()
    const previousAutoClear = gl.autoClear
    const previousClearAlpha = gl.getClearAlpha()
    gl.getClearColor(savedClearColor)

    gl.autoClear = true
    gl.setClearColor(0x000000, 0)
    gl.setRenderTarget(sourceRenderTarget)
    gl.render(fieldScene, camera)

    let blurInput = sourceRenderTarget.texture
    for (let iteration = 0; iteration < layer.blurIterations; iteration += 1) {
      blurPass.material.uniforms.uFieldTexture.value = blurInput
      blurPass.material.uniforms.uDirection.value.set(1, 0)
      gl.setRenderTarget(horizontalBlurTarget)
      gl.render(blurPass.scene, blurPass.camera)

      blurPass.material.uniforms.uFieldTexture.value = horizontalBlurTarget.texture
      blurPass.material.uniforms.uDirection.value.set(0, 1)
      gl.setRenderTarget(verticalBlurTarget)
      gl.render(blurPass.scene, blurPass.camera)
      blurInput = verticalBlurTarget.texture
    }

    gl.setRenderTarget(previousRenderTarget)
    gl.setClearColor(savedClearColor, previousClearAlpha)
    gl.autoClear = previousAutoClear

    const distance = camera.position.z - layer.blurPlaneZ
    const height = 2 * Math.tan(MathUtils.degToRad(camera.fov) / 2) * distance
    const width = height * camera.aspect
    backdropReference.current.position.set(
      camera.position.x,
      camera.position.y,
      layer.blurPlaneZ,
    )
    backdropReference.current.scale.set(width / 2, height / 2, 1)
  }, 0.5)

  return (
    <>
      {createPortal(
        <>
          <hemisphereLight
            ref={hemisphereLightRef}
            args={[
              CONFIG.lighting.hemisphere.skyColor,
              CONFIG.lighting.hemisphere.groundColor,
              CONFIG.lighting.hemisphere.intensity,
            ]}
          />
          <directionalLight ref={keyLightRef} {...CONFIG.lighting.key} />
          <directionalLight ref={rimLightRef} {...CONFIG.lighting.rim} />
          <directionalLight
            ref={lightningLightRef}
            color={CONFIG.weather.lighting.lightning.color}
            intensity={0}
            position={CONFIG.weather.lighting.lightning.position}
          />
          <FieldInstances
            assets={assets}
            layouts={layouts}
            weatherRef={weatherRef}
          />
        </>,
        fieldScene,
      )}
      <mesh
        ref={backdropReference}
        position={[0, 0, layer.blurPlaneZ]}
        renderOrder={renderOrder}
      >
        <planeGeometry args={[2, 2]} />
        <meshBasicMaterial
          depthWrite={false}
          map={verticalBlurTarget.texture}
          toneMapped={false}
          transparent
        />
      </mesh>
    </>
  )
}
