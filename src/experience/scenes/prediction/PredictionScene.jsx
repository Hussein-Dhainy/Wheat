import { useFrame, useLoader } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { Color, MathUtils } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { PredictionField } from './PredictionField.jsx'
import { PredictionGround } from './PredictionGround.jsx'
import { PredictionRain } from './PredictionRain.jsx'
import { PredictionSky } from './PredictionSky.jsx'
import {
  createLeafDroopQuaternion,
  getLeafDroughtDelay,
  getLeafConditionDroopProgress,
  getStemConditionBend,
  isPlantLeaf,
} from './plantConditionMotion.js'
import { PREDICTION_RENDER_CONFIG as CONFIG } from './predictionConfig.js'
import { createSoilSurfaceOverlay } from './soilSurfaceEffect.js'

const WEATHER = CONFIG.weather

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
  const sourcePlant = scene.getObjectByName(CONFIG.heroPlantName)

  if (!sourcePlant) {
    throw new Error(
      `Prediction model is missing required group: ${CONFIG.heroPlantName}`,
    )
  }

  const heroPlant = sourcePlant.clone(true)
  heroPlant.position.set(0, 0, 0)
  heroPlant.rotation.set(0, 0, 0)
  heroPlant.traverse((object) => {
    if (!object.isMesh || !object.material) return
    object.material = Array.isArray(object.material)
      ? object.material.map((material) => material.clone())
      : object.material.clone()
  })
  return heroPlant
}

export function PredictionScene({
  background,
  pointerRef,
  predictionTestsOpen,
  quality,
  reducedMotion,
  sceneStateRef,
  selectedPredictionCondition,
}) {
  const { scene } = useLoader(GLTFLoader, CONFIG.modelUrl)
  const heroPlant = useMemo(() => prepareHeroPlant(scene), [scene])
  const heroLeaves = useMemo(() => {
    const leaves = []
    heroPlant.traverse((object) => {
      if (!object.isMesh || !isPlantLeaf(object.name)) return
      leaves.push({
        baseQuaternion: object.quaternion.clone(),
        delay: getLeafDroughtDelay(object.name),
        droopQuaternion: createLeafDroopQuaternion(object.geometry),
        object,
        workingQuaternion: object.quaternion.clone(),
      })
    })
    return leaves
  }, [heroPlant])
  const heroMaterialStates = useMemo(() => {
    const states = []
    heroPlant.traverse((object) => {
      if (!object.isMesh || !object.material) return
      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material]
      materials.forEach((material) => {
        if (!material.color) return
        states.push({
          baseColor: material.color.clone(),
          diseaseColor: new Color(
            isPlantLeaf(object.name)
              ? WEATHER.disease.leafTint
              : WEATHER.disease.structureTint,
          ),
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
        CONFIG.heroScale,
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

  useFrame(({ camera }, deltaTime) => {
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
      const conditionStemBend = getStemConditionBend(
        weather.drought,
        weather.disease,
        WEATHER.drought.stemBend,
        WEATHER.disease.stemBend,
      )
      const directionalBend = -WEATHER.wind.heroSway
        * weather.strength
        * (0.48 + weather.gust * 0.52)
      const shake = Math.sin(weather.time * 10.7)
        * WEATHER.wind.shake
        * weather.strength
      heroGroupRef.current.rotation.z = (directionalBend + shake) * motionScale
        - conditionStemBend
      heroGroupRef.current.rotation.x = (
        Math.sin(weather.time * 1.35 + 0.6) * 0.032
        + Math.sin(weather.time * 8.1) * WEATHER.wind.shake * 0.42
      ) * weather.strength * motionScale + conditionStemBend * 0.22
      heroGroupRef.current.position.x = directionalBend * 0.16 * motionScale
    }

    heroLeaves.forEach((leaf) => {
      const droopProgress = getLeafConditionDroopProgress(
        weather.drought,
        weather.disease,
        leaf.delay,
        WEATHER.drought.droopAmount,
        WEATHER.disease.droopAmount,
      )
      leaf.workingQuaternion
        .identity()
        .slerp(leaf.droopQuaternion, droopProgress)
      leaf.object.quaternion
        .copy(leaf.baseQuaternion)
        .multiply(leaf.workingQuaternion)
    })
    heroMaterialStates.forEach(({ baseColor, diseaseColor, material }) => {
      material.color
        .copy(baseColor)
        .lerp(diseaseColor, weather.disease)
    })
    soilSurfaceOverlays.forEach(({ mesh, uniforms }) => {
      mesh.visible = weather.soil > 0.001
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
    if (hemisphereLightRef.current) {
      hemisphereLightRef.current.color.copy(colors.displaySky)
      hemisphereLightRef.current.groundColor.copy(colors.displayGround)
      const stormIntensity = MathUtils.lerp(
        CONFIG.lighting.hemisphere.intensity,
        WEATHER.lighting.hemisphere.intensity,
        weather.strength,
      )
      const droughtIntensity = MathUtils.lerp(
        stormIntensity,
        WEATHER.drought.lighting.hemisphere.intensity,
        weather.drought,
      )
      hemisphereLightRef.current.intensity = MathUtils.lerp(
        droughtIntensity,
        WEATHER.disease.lighting.hemisphere.intensity,
        weather.disease,
      ) + lightning * 1.5
    }

    colors.displayKey
      .copy(colors.key)
      .lerp(colors.stormKey, weather.strength)
      .lerp(colors.droughtKey, weather.drought)
      .lerp(colors.diseaseKey, weather.disease)
      .lerp(colors.flash, lightning * 0.68)
    if (keyLightRef.current) {
      keyLightRef.current.color.copy(colors.displayKey)
      const stormIntensity = MathUtils.lerp(
        CONFIG.lighting.key.intensity,
        WEATHER.lighting.key.intensity,
        weather.strength,
      )
      const droughtIntensity = MathUtils.lerp(
        stormIntensity,
        WEATHER.drought.lighting.key.intensity,
        weather.drought,
      )
      keyLightRef.current.intensity = MathUtils.lerp(
        droughtIntensity,
        WEATHER.disease.lighting.key.intensity,
        weather.disease,
      ) + lightning * 3.5
    }

    colors.displayRim
      .copy(colors.rim)
      .lerp(colors.stormRim, weather.strength)
      .lerp(colors.droughtRim, weather.drought)
      .lerp(colors.diseaseRim, weather.disease)
      .lerp(colors.flash, lightning * 0.45)
    if (rimLightRef.current) {
      rimLightRef.current.color.copy(colors.displayRim)
      const stormIntensity = MathUtils.lerp(
        CONFIG.lighting.rim.intensity,
        WEATHER.lighting.rim.intensity,
        weather.strength,
      )
      const droughtIntensity = MathUtils.lerp(
        stormIntensity,
        WEATHER.drought.lighting.rim.intensity,
        weather.drought,
      )
      rimLightRef.current.intensity = MathUtils.lerp(
        droughtIntensity,
        WEATHER.disease.lighting.rim.intensity,
        weather.disease,
      ) + lightning * 1.8
    }
    if (lightningLightRef.current) {
      lightningLightRef.current.intensity = lightning
        * WEATHER.lighting.lightning.intensity
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
      <color ref={backgroundColorRef} attach="background" args={[background]} />
      <PredictionSky weatherRef={weatherRef} />
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

      <PredictionGround weatherRef={weatherRef} />
      <PredictionField
        background={background}
        sceneStateRef={sceneStateRef}
        sourceScene={scene}
        weatherRef={weatherRef}
      />
      <PredictionRain
        quality={quality}
        reducedMotion={reducedMotion}
        weatherRef={weatherRef}
      />

      <group ref={heroGroupRef} scale={CONFIG.heroScale}>
        <primitive object={heroPlant} />
      </group>
    </>
  )
}

useLoader.preload(GLTFLoader, CONFIG.modelUrl)
