import { useFrame, useLoader, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { Color, Euler, MathUtils, Quaternion } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { configureGLTFLoader } from '../../systems/gltfAssetLoader.js'
import { PredictionBackdrop } from './PredictionBackdrop.jsx'
import { PredictionField } from './PredictionField.jsx'
import { PredictionGround } from './PredictionGround.jsx'
import { PredictionPlantShadows } from './PredictionPlantShadows.jsx'
import { PredictionRain } from './PredictionRain.jsx'
import { PredictionSky } from './PredictionSky.jsx'
import {
  applyHeroConditionTint,
  configureHeroPlantMaterial,
} from './heroPlantMaterial.js'
import {
  getConditionTransitionActivity,
  getLeafConditionSway,
  getLeafDroughtDelay,
  getPlantSway,
  getProgressAfterDelay,
  isPlantLeaf,
} from './plantConditionMotion.js'
import { PREDICTION_RENDER_CONFIG as CONFIG } from './predictionConfig.js'
import { createFieldLayouts } from './fieldAssets.js'
import { createSoilSurfaceOverlay } from './soilSurfaceEffect.js'

const WEATHER = CONFIG.weather

function updateHemisphereLight(light, skyColor, groundColor, intensity) {
  if (!light) return
  light.color.copy(skyColor)
  light.groundColor.copy(groundColor)
  light.intensity = intensity
}

function updateLight(light, color, intensity) {
  if (!light) return
  light.color.copy(color)
  light.intensity = intensity
}

function nextDeterministicRandom(state) {
  state.seed = (Math.imul(state.seed, 1664525) + 1013904223) >>> 0
  return state.seed / 4294967296
}

function getLightningEnvelope(elapsed) {
  if (elapsed < 0 || elapsed > 0.34) return 0
  if (elapsed < 0.055) return Math.sin((elapsed / 0.055) * Math.PI)
  if (elapsed < 0.11) return (1 - (elapsed - 0.055) / 0.055) * 0.28
  if (elapsed < 0.17) {
    return Math.sin(((elapsed - 0.11) / 0.06) * Math.PI) * 0.72
  }
  return (1 - (elapsed - 0.17) / 0.17) * 0.18
}

function prepareHeroPlant(scene) {
  const sourcePlant = scene.getObjectByName(CONFIG.models.hero.rootName)

  if (!sourcePlant) {
    throw new Error(
      `Prediction model is missing required group: ${CONFIG.models.hero.rootName}`,
    )
  }

  const heroPlant = sourcePlant.clone(true)
  heroPlant.position.set(0, 0, 0)
  heroPlant.rotation.set(0, 0, 0)
  heroPlant.traverse((object) => {
    if (!object.isMesh || !object.material) return
    object.material = Array.isArray(object.material)
      ? object.material.map((material) => configureHeroPlantMaterial(
          material.clone(),
          CONFIG.heroMaterial,
          WEATHER.drought,
        ))
      : configureHeroPlantMaterial(
          object.material.clone(),
          CONFIG.heroMaterial,
          WEATHER.drought,
        )
  })
  return heroPlant
}

export function PredictionScene({
  background,
  onSceneWarmupComplete,
  pointerRef,
  predictionTestsOpen,
  quality,
  reducedMotion,
  sceneStateRef,
  selectedPredictionCondition,
}) {
  const { gl } = useThree()
  const configureLoader = configureGLTFLoader(gl)
  const { scene: heroSourceScene } = useLoader(
    GLTFLoader,
    CONFIG.models.hero.url,
    configureLoader,
  )
  const { scene: farFieldSourceScene } = useLoader(
    GLTFLoader,
    CONFIG.models.fieldFar.url,
    configureLoader,
  )
  const { scene: nearFieldSourceScene } = useLoader(
    GLTFLoader,
    CONFIG.models.fieldNear.url,
    configureLoader,
  )
  const heroPlant = useMemo(
    () => prepareHeroPlant(heroSourceScene),
    [heroSourceScene],
  )
  const fieldLayouts = useMemo(createFieldLayouts, [])
  const heroLeaves = useMemo(() => {
    const leaves = []
    heroPlant.traverse((object) => {
      if (!object.isMesh || !isPlantLeaf(object.name)) return
      const delay = getLeafDroughtDelay(object.name)
      leaves.push({
        baseQuaternion: object.quaternion.clone(),
        flutterEuler: new Euler(),
        flutterQuaternion: new Quaternion(),
        object,
        phase: delay / 0.24 * Math.PI * 2,
      })
    })
    return leaves
  }, [heroPlant])
  const heroMaterialStates = useMemo(() => {
    const states = []
    heroPlant.traverse((object) => {
      if (!object.isMesh || !object.material) return
      const objectMaterials = Array.isArray(object.material)
        ? object.material
        : [object.material]
      objectMaterials.forEach((material) => {
        if (!material.color) return
        states.push({
          baseColor: material.color.clone(),
          droughtColor: new Color(WEATHER.drought.heroTint),
          material,
        })
      })
    })
    return states
  }, [heroPlant])
  useEffect(() => () => {
    heroMaterialStates.forEach(({ material }) => material.dispose())
  }, [heroMaterialStates])
  const soilSurfaceOverlays = useMemo(() => {
    const sourceMeshes = []
    heroPlant.traverse((object) => {
      if (object.isMesh && object.geometry && object.material) {
        sourceMeshes.push(object)
      }
    })

    return sourceMeshes.map((sourceMesh) => {
      const overlay = createSoilSurfaceOverlay(
        sourceMesh,
        WEATHER.soil,
      )
      return { ...overlay, sourceMesh }
    })
  }, [heroPlant])
  useEffect(() => {
    soilSurfaceOverlays.forEach(({ mesh, sourceMesh }) => {
      sourceMesh.add(mesh)
    })

    return () => {
      soilSurfaceOverlays.forEach(({ material, mesh, sourceMesh }) => {
        sourceMesh.remove(mesh)
        material.dispose()
      })
    }
  }, [soilSurfaceOverlays])
  const verticalPointerOffset = useRef(0)
  const heroGroupRef = useRef()
  const backgroundColorRef = useRef()
  const backdropHemisphereLightRef = useRef()
  const backdropKeyLightRef = useRef()
  const backdropRimLightRef = useRef()
  const backdropLightningLightRef = useRef()
  const hemisphereLightRef = useRef()
  const keyLightRef = useRef()
  const rimLightRef = useRef()
  const lightningLightRef = useRef()
  const weatherRef = useRef({
    active: false,
    disease: 0,
    drought: 0,
    fieldDensity: 0,
    gust: 0,
    lightning: 0,
    soil: 0,
    soilTime: 0,
    strength: 0,
    time: 0,
  })
  const lightningStateRef = useRef({
    flashStart: -10,
    nextAt: WEATHER.lightning.firstDelay,
    seed: 271828,
    wasActive: false,
  })
  const colors = useMemo(() => ({
    background: new Color(background),
    displayBackground: new Color(background),
    displayGround: new Color(CONFIG.lighting.hemisphere.groundColor),
    displayKey: new Color(CONFIG.lighting.key.color),
    displayRim: new Color(CONFIG.lighting.rim.color),
    displaySky: new Color(CONFIG.lighting.hemisphere.skyColor),
    flash: new Color(WEATHER.flashColor),
    ground: new Color(CONFIG.lighting.hemisphere.groundColor),
    heroGround: new Color(CONFIG.lighting.hemisphere.groundColor),
    heroKey: new Color(CONFIG.lighting.key.color),
    heroRim: new Color(CONFIG.lighting.rim.color),
    heroSky: new Color(CONFIG.lighting.hemisphere.skyColor),
    key: new Color(CONFIG.lighting.key.color),
    rim: new Color(CONFIG.lighting.rim.color),
    sky: new Color(CONFIG.lighting.hemisphere.skyColor),
    stormBackground: new Color(WEATHER.backgroundColor),
    stormGround: new Color(WEATHER.lighting.hemisphere.groundColor),
    stormKey: new Color(WEATHER.lighting.key.color),
    stormRim: new Color(WEATHER.lighting.rim.color),
    stormSky: new Color(WEATHER.lighting.hemisphere.skyColor),
    droughtBackground: new Color(WEATHER.drought.backgroundColor),
    droughtGround: new Color(WEATHER.drought.lighting.hemisphere.groundColor),
    droughtKey: new Color(WEATHER.drought.lighting.key.color),
    droughtRim: new Color(WEATHER.drought.lighting.rim.color),
    droughtSky: new Color(WEATHER.drought.lighting.hemisphere.skyColor),
    diseaseBackground: new Color(WEATHER.disease.backgroundColor),
    diseaseGround: new Color(WEATHER.disease.lighting.hemisphere.groundColor),
    diseaseKey: new Color(WEATHER.disease.lighting.key.color),
    diseaseRim: new Color(WEATHER.disease.lighting.rim.color),
    diseaseSky: new Color(WEATHER.disease.lighting.hemisphere.skyColor),
  }), [background])

  useFrame(({ camera, gl }, deltaTime) => {
    const weather = weatherRef.current
    const sceneIsActive = Boolean(sceneStateRef?.current?.isActive)
    weather.active = sceneIsActive
    if (!sceneIsActive) return

    weather.time += deltaTime
    weather.soilTime += deltaTime * (
      reducedMotion ? WEATHER.soil.reducedMotionSpeedScale : 1
    )
    const stormRequested = predictionTestsOpen
      && selectedPredictionCondition === WEATHER.activeConditionId
    const targetStrength = stormRequested ? 1 : 0
    weather.strength = MathUtils.damp(
      weather.strength,
      targetStrength,
      WEATHER.transitionDamping,
      deltaTime,
    )
    const droughtRequested = predictionTestsOpen
      && selectedPredictionCondition === 'drought'
    weather.drought = MathUtils.damp(
      weather.drought,
      droughtRequested ? 1 : 0,
      WEATHER.drought.transitionDamping,
      deltaTime,
    )
    const diseaseRequested = predictionTestsOpen
      && selectedPredictionCondition === 'disease'
    weather.disease = MathUtils.damp(
      weather.disease,
      diseaseRequested ? 1 : 0,
      WEATHER.disease.transitionDamping,
      deltaTime,
    )
    const soilRequested = predictionTestsOpen
      && selectedPredictionCondition === 'soil'
    weather.soil = MathUtils.damp(
      weather.soil,
      soilRequested ? 1 : 0,
      WEATHER.soil.transitionDamping,
      deltaTime,
    )
    const fieldDensityRequested = predictionTestsOpen
      && selectedPredictionCondition === 'field-density'
    weather.fieldDensity = MathUtils.damp(
      weather.fieldDensity,
      fieldDensityRequested ? 1 : 0,
      WEATHER.fieldDensity.transitionDamping,
      deltaTime,
    )
    weather.gust = MathUtils.clamp(
      0.52
        + Math.sin(weather.time * 0.83) * 0.23
        + Math.sin(weather.time * 1.91 + 1.7) * 0.16,
      0,
      1,
    )

    const lightningState = lightningStateRef.current
    if (stormRequested && !lightningState.wasActive) {
      lightningState.nextAt = weather.time + WEATHER.lightning.firstDelay
      lightningState.flashStart = -10
      lightningState.wasActive = true
    } else if (!stormRequested) {
      lightningState.flashStart = -10
      lightningState.wasActive = false
    }

    if (stormRequested && weather.time >= lightningState.nextAt) {
      lightningState.flashStart = weather.time
      const [minimumInterval, maximumInterval] = WEATHER.lightning.intervalRange
      lightningState.nextAt = weather.time + MathUtils.lerp(
        minimumInterval,
        maximumInterval,
        nextDeterministicRandom(lightningState),
      )
    }

    const lightningMotionScale = reducedMotion ? 0.18 : 1
    weather.lightning = getLightningEnvelope(
      weather.time - lightningState.flashStart,
    ) * weather.strength * lightningMotionScale

    const motionScale = reducedMotion ? 0.35 : 1
    if (heroGroupRef.current) {
      const ambientStructureSway = getPlantSway(
        weather.time,
        0.85,
        WEATHER.ambientMotion.heroSway,
        WEATHER.ambientMotion.primaryFrequency,
        WEATHER.ambientMotion.secondaryFrequency,
      ) * motionScale
      const conditionStructureSway = getLeafConditionSway(
        weather.time,
        0.85,
        weather.drought,
        0,
        WEATHER.conditionMotion.heroStructureSway,
        WEATHER.conditionMotion.primaryFrequency,
        WEATHER.conditionMotion.secondaryFrequency,
      ) * motionScale
      const directionalBend = -WEATHER.wind.heroSway
        * weather.strength
        * (0.48 + weather.gust * 0.52)
      const shake = Math.sin(weather.time * 10.7)
        * WEATHER.wind.shake
        * weather.strength
      heroGroupRef.current.rotation.z = ambientStructureSway
        + (directionalBend + shake) * motionScale
        + conditionStructureSway
      heroGroupRef.current.rotation.x = (
        Math.sin(weather.time * 1.35 + 0.6) * 0.032
        + Math.sin(weather.time * 8.1) * WEATHER.wind.shake * 0.42
      ) * weather.strength * motionScale
        + ambientStructureSway * 0.28
        + conditionStructureSway * 0.35
      heroGroupRef.current.position.x = ambientStructureSway * 0.05
        + directionalBend * 0.16 * motionScale
        + conditionStructureSway * 0.08
    }
    heroLeaves.forEach((leaf) => {
      const sway = getLeafConditionSway(
        weather.time,
        leaf.phase,
        weather.drought,
        0,
        WEATHER.conditionMotion.heroLeafSway,
        WEATHER.conditionMotion.primaryFrequency,
        WEATHER.conditionMotion.secondaryFrequency,
      ) * motionScale
      const transitionActivity = getConditionTransitionActivity(
        weather.drought,
        0,
      )
      const variedTransitionActivity = getProgressAfterDelay(
        transitionActivity,
        (leaf.phase / (Math.PI * 2))
          * WEATHER.conditionMotion.transitionStagger * 0.55,
      )
      const transitionShake = (
        Math.sin(
          weather.time * (
            WEATHER.conditionMotion.transitionPrimaryFrequency
              + leaf.phase * 0.08
          ) + leaf.phase * 2.31,
        )
        + Math.sin(
          weather.time * WEATHER.conditionMotion.transitionSecondaryFrequency
            + leaf.phase * 0.83,
        ) * 0.4
      ) * WEATHER.conditionMotion.heroLeafTransitionShake
        * variedTransitionActivity
        * motionScale
      leaf.flutterEuler.set(
        sway * 0.5 + transitionShake * 0.68,
        transitionShake * 0.2,
        sway + transitionShake,
      )
      leaf.flutterQuaternion.setFromEuler(leaf.flutterEuler)
      leaf.object.quaternion
        .copy(leaf.baseQuaternion)
        .multiply(leaf.flutterQuaternion)
    })
    heroMaterialStates.forEach((state) => {
      applyHeroConditionTint(state, weather.drought)
    })
    const soilPixelsPerWorldUnit = gl.domElement.height / (
      2
      * Math.tan(MathUtils.degToRad(camera.fov) * 0.5)
      * Math.max(0.1, camera.position.z)
    )
    soilSurfaceOverlays.forEach(({ mesh, uniforms }) => {
      mesh.visible = weather.soil > 0.001
      uniforms.uSoilPixelRatio.value = gl.getPixelRatio()
      uniforms.uSoilPixelsPerWorldUnit.value = soilPixelsPerWorldUnit
      uniforms.uSoilStrength.value = weather.soil
      uniforms.uSoilTime.value = weather.soilTime
    })

    const lightning = weather.lightning
    colors.displayBackground
      .copy(colors.background)
      .lerp(colors.stormBackground, weather.strength)
      .lerp(colors.droughtBackground, weather.drought)
      .lerp(colors.diseaseBackground, weather.disease)
      .lerp(colors.flash, lightning * 0.18)
    backgroundColorRef.current?.copy(colors.displayBackground)

    colors.displaySky
      .copy(colors.sky)
      .lerp(colors.stormSky, weather.strength)
      .lerp(colors.droughtSky, weather.drought)
      .lerp(colors.diseaseSky, weather.disease)
      .lerp(colors.flash, lightning * 0.4)
    colors.displayGround
      .copy(colors.ground)
      .lerp(colors.stormGround, weather.strength)
      .lerp(colors.droughtGround, weather.drought)
      .lerp(colors.diseaseGround, weather.disease)
      .lerp(colors.flash, lightning * 0.18)
    const stormHemisphereIntensity = MathUtils.lerp(
      CONFIG.lighting.hemisphere.intensity,
      WEATHER.lighting.hemisphere.intensity,
      weather.strength,
    )
    const droughtHemisphereIntensity = MathUtils.lerp(
      stormHemisphereIntensity,
      WEATHER.drought.lighting.hemisphere.intensity,
      weather.drought,
    )
    const hemisphereIntensity = MathUtils.lerp(
      droughtHemisphereIntensity,
      WEATHER.disease.lighting.hemisphere.intensity,
      weather.disease,
    ) + lightning * 1.5
    updateHemisphereLight(
      backdropHemisphereLightRef.current,
      colors.displaySky,
      colors.displayGround,
      hemisphereIntensity,
    )

    colors.heroSky
      .copy(colors.sky)
      .lerp(colors.stormSky, weather.strength)
      .lerp(colors.droughtSky, weather.drought)
      .lerp(colors.flash, lightning * 0.4)
    colors.heroGround
      .copy(colors.ground)
      .lerp(colors.stormGround, weather.strength)
      .lerp(colors.droughtGround, weather.drought)
      .lerp(colors.flash, lightning * 0.18)
    updateHemisphereLight(
      hemisphereLightRef.current,
      colors.heroSky,
      colors.heroGround,
      droughtHemisphereIntensity + lightning * 1.5,
    )

    colors.displayKey
      .copy(colors.key)
      .lerp(colors.stormKey, weather.strength)
      .lerp(colors.droughtKey, weather.drought)
      .lerp(colors.diseaseKey, weather.disease)
      .lerp(colors.flash, lightning * 0.68)
    const stormKeyIntensity = MathUtils.lerp(
      CONFIG.lighting.key.intensity,
      WEATHER.lighting.key.intensity,
      weather.strength,
    )
    const droughtKeyIntensity = MathUtils.lerp(
      stormKeyIntensity,
      WEATHER.drought.lighting.key.intensity,
      weather.drought,
    )
    const keyIntensity = MathUtils.lerp(
      droughtKeyIntensity,
      WEATHER.disease.lighting.key.intensity,
      weather.disease,
    ) + lightning * 3.5
    updateLight(backdropKeyLightRef.current, colors.displayKey, keyIntensity)
    colors.heroKey
      .copy(colors.key)
      .lerp(colors.stormKey, weather.strength)
      .lerp(colors.droughtKey, weather.drought)
      .lerp(colors.flash, lightning * 0.68)
    updateLight(
      keyLightRef.current,
      colors.heroKey,
      droughtKeyIntensity + lightning * 3.5,
    )

    colors.displayRim
      .copy(colors.rim)
      .lerp(colors.stormRim, weather.strength)
      .lerp(colors.droughtRim, weather.drought)
      .lerp(colors.diseaseRim, weather.disease)
      .lerp(colors.flash, lightning * 0.45)
    const stormRimIntensity = MathUtils.lerp(
      CONFIG.lighting.rim.intensity,
      WEATHER.lighting.rim.intensity,
      weather.strength,
    )
    const droughtRimIntensity = MathUtils.lerp(
      stormRimIntensity,
      WEATHER.drought.lighting.rim.intensity,
      weather.drought,
    )
    const rimIntensity = MathUtils.lerp(
      droughtRimIntensity,
      WEATHER.disease.lighting.rim.intensity,
      weather.disease,
    ) + lightning * 1.8
    updateLight(backdropRimLightRef.current, colors.displayRim, rimIntensity)
    colors.heroRim
      .copy(colors.rim)
      .lerp(colors.stormRim, weather.strength)
      .lerp(colors.droughtRim, weather.drought)
      .lerp(colors.flash, lightning * 0.45)
    updateLight(
      rimLightRef.current,
      colors.heroRim,
      droughtRimIntensity + lightning * 1.8,
    )
    const lightningIntensity = lightning
      * WEATHER.lighting.lightning.intensity
    if (lightningLightRef.current) {
      lightningLightRef.current.intensity = lightningIntensity
    }
    if (backdropLightningLightRef.current) {
      backdropLightningLightRef.current.intensity = lightningIntensity
    }

    // Virtual scroll is already damped. Keeping camera progress linear avoids
    // a second ease that made the plant feel sticky at both ends of Scene 3.
    const progress = reducedMotion
      ? MathUtils.clamp(sceneStateRef.current.progress ?? 0, 0, 1)
      : sceneStateRef.current.motionProgress
        ?? sceneStateRef.current.progress
        ?? 0
    const exitProgress = reducedMotion
      ? 0
      : MathUtils.clamp(
          sceneStateRef.current.transitionMotionOffset ?? 0,
          0,
          1,
        )
    const cameraY = MathUtils.lerp(
      CONFIG.camera.startY,
      CONFIG.camera.endY,
      progress,
    )
    const pointer = pointerRef?.current
    // Translate the camera opposite the cursor so the plant appears to follow
    // it. The matching look-target offset makes this a pure pan without tilt.
    const targetVerticalOffset = reducedMotion
      ? 0
      : -(pointer?.ndcY ?? 0) * CONFIG.camera.parallax.verticalRange

    verticalPointerOffset.current = reducedMotion
      ? 0
      : MathUtils.damp(
          verticalPointerOffset.current,
          targetVerticalOffset,
          CONFIG.camera.parallax.damping,
          deltaTime,
        )
    const cameraMinimumY = MathUtils.lerp(
      CONFIG.camera.minimumY,
      CONFIG.camera.exitMinimumY,
      exitProgress,
    )
    const pointerCameraY = Math.max(
      cameraMinimumY,
      cameraY + verticalPointerOffset.current,
    )

    camera.position.set(
      CONFIG.camera.x,
      pointerCameraY,
      MathUtils.lerp(
        CONFIG.camera.z,
        WEATHER.fieldDensity.cameraZ,
        weather.fieldDensity,
      ),
    )
    camera.lookAt(
      CONFIG.camera.lookAtX,
      pointerCameraY,
      CONFIG.camera.lookAtZ,
    )
  }, -1)

  return (
    <>
      <PredictionBackdrop
        onWarmupComplete={onSceneWarmupComplete}
        quality={quality}
        sceneStateRef={sceneStateRef}
      >
        <color ref={backgroundColorRef} attach="background" args={[background]} />
        <PredictionSky weatherRef={weatherRef} />
        <hemisphereLight
          ref={backdropHemisphereLightRef}
          args={[
            CONFIG.lighting.hemisphere.skyColor,
            CONFIG.lighting.hemisphere.groundColor,
            CONFIG.lighting.hemisphere.intensity,
          ]}
        />
        <directionalLight
          ref={backdropKeyLightRef}
          {...CONFIG.lighting.key}
        />
        <directionalLight
          ref={backdropRimLightRef}
          {...CONFIG.lighting.rim}
        />
        <directionalLight
          ref={backdropLightningLightRef}
          color={WEATHER.lighting.lightning.color}
          intensity={0}
          position={WEATHER.lighting.lightning.position}
        />
        <PredictionGround weatherRef={weatherRef} />
        <PredictionPlantShadows
          fieldLayouts={fieldLayouts}
          weatherRef={weatherRef}
        />
        <PredictionField
          farSourceScene={farFieldSourceScene}
          layouts={fieldLayouts}
          nearSourceScene={nearFieldSourceScene}
          reducedMotion={reducedMotion}
          weatherRef={weatherRef}
        />
        <PredictionRain
          quality={quality}
          reducedMotion={reducedMotion}
          weatherRef={weatherRef}
        />
      </PredictionBackdrop>

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
        color={WEATHER.lighting.lightning.color}
        intensity={0}
        position={WEATHER.lighting.lightning.position}
      />

      <group ref={heroGroupRef} scale={CONFIG.heroScale}>
        <primitive object={heroPlant} />
      </group>
    </>
  )
}

// Intentionally not a useLoader.preload: KTX2 transcoding has to be told which
// compressed format the renderer supports, and no renderer exists at module
// evaluation time. Every scene mounts immediately behind the preloader overlay,
// so the in-component useLoader begins the same fetch within a frame of where a
// module-level preload would have.
