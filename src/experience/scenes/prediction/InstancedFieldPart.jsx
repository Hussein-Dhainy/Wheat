import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import {
  Color,
  DynamicDrawUsage,
  Euler,
  MathUtils,
  Matrix4,
  Object3D,
  Quaternion,
  Vector3,
} from 'three'
import { updateFieldWeatherUniforms } from './fieldWeatherMaterial.js'
import {
  createLeafDroopQuaternion,
  getConditionStrength,
  getConditionTransitionActivity,
  getLeafConditionDroopProgress,
  getLeafConditionSway,
  getLeafDroughtDelay,
  getPlantSway,
  getProgressAfterDelay,
  getStemConditionBend,
  isPlantLeaf,
  updateDroughtMorphInfluences,
} from './plantConditionMotion.js'
import { PREDICTION_RENDER_CONFIG as CONFIG } from './predictionConfig.js'

export function InstancedFieldPart({
  droughtMorphTargets = [],
  geometry,
  layouts,
  localMatrix,
  material,
  motionMode,
  morphTargetCount = 0,
  name,
  reducedMotion,
  weatherUniforms,
  weatherRef,
}) {
  const meshReference = useRef()
  const lastFieldDensityStrength = useRef(-1)
  const lastDroughtMorphStrength = useRef(-1)
  const partMotion = useMemo(() => {
    if (motionMode !== 'parts') return null
    const position = new Vector3()
    const quaternion = new Quaternion()
    const scale = new Vector3()
    localMatrix.decompose(position, quaternion, scale)
    const isLeaf = isPlantLeaf(name)

    return {
      delay: isLeaf ? getLeafDroughtDelay(name) : 0,
      droopQuaternion: isLeaf
        ? createLeafDroopQuaternion(geometry)
        : new Quaternion(),
      isLeaf,
      position,
      quaternion,
      scale,
    }
  }, [geometry, localMatrix, motionMode, name])
  const morphState = useMemo(() => (
    morphTargetCount > 0 && droughtMorphTargets.length > 0
      ? { morphTargetInfluences: new Array(morphTargetCount).fill(0) }
      : null
  ), [droughtMorphTargets, morphTargetCount])
  const scratch = useMemo(() => ({
    animatedLocalMatrix: new Matrix4(),
    color: new Color(),
    combinedMatrix: new Matrix4(),
    combinedQuaternion: new Quaternion(),
    droopQuaternion: new Quaternion(),
    flutterEuler: new Euler(),
    flutterQuaternion: new Quaternion(),
    localQuaternion: new Quaternion(),
    plant: new Object3D(),
    windEuler: new Euler(),
    windQuaternion: new Quaternion(),
  }), [])

  useLayoutEffect(() => {
    meshReference.current.instanceMatrix.setUsage(DynamicDrawUsage)
    layouts.forEach((layout, index) => {
      scratch.combinedMatrix.multiplyMatrices(layout.matrix, localMatrix)
      meshReference.current.setMatrixAt(index, scratch.combinedMatrix)
      scratch.color.setRGB(
        layout.colorScale,
        layout.colorScale,
        layout.colorScale,
      )
      meshReference.current.setColorAt(index, scratch.color)
      if (morphState) meshReference.current.setMorphAt(index, morphState)
    })
    meshReference.current.instanceMatrix.needsUpdate = true
    if (meshReference.current.instanceColor) {
      meshReference.current.instanceColor.needsUpdate = true
    }
    if (meshReference.current.morphTexture) {
      meshReference.current.morphTexture.needsUpdate = true
    }
    lastDroughtMorphStrength.current = 0
  }, [layouts, localMatrix, morphState, scratch])

  useFrame(() => {
    const weather = weatherRef?.current
    if (!meshReference.current || !weather?.active) return
    if (weatherUniforms) {
      updateFieldWeatherUniforms(weatherUniforms, weather, reducedMotion)
    }

    const rawFieldDensityStrength = weather.fieldDensity ?? 0
    const fieldDensityStrength = rawFieldDensityStrength < 0.001
      ? 0
      : rawFieldDensityStrength
    const fieldDensityChanged = Math.abs(
      fieldDensityStrength - lastFieldDensityStrength.current,
    ) > 0.0002
    if (motionMode !== 'parts' && !fieldDensityChanged) return
    lastFieldDensityStrength.current = fieldDensityStrength
    const horizontalSpacingScale = MathUtils.lerp(
      1,
      CONFIG.weather.fieldDensity.horizontalSpacingScale,
      fieldDensityStrength,
    )
    const depthSpacingScale = MathUtils.lerp(
      1,
      CONFIG.weather.fieldDensity.depthSpacingScale,
      fieldDensityStrength,
    )
    const plantScale = MathUtils.lerp(
      1,
      CONFIG.weather.fieldDensity.plantScale,
      fieldDensityStrength,
    )
    const motionScale = reducedMotion ? 0.24 : 1
    const windStrength = (weather.strength ?? 0) * motionScale
    const droughtStrength = weather.drought ?? 0
    const diseaseStrength = weather.disease ?? 0
    const droughtMorphChanged = morphState && Math.abs(
      droughtStrength - lastDroughtMorphStrength.current,
    ) > 0.0002
    if (droughtMorphChanged) {
      layouts.forEach((layout, index) => {
        const instanceDelay = Math.min(
          0.36,
          (partMotion?.delay ?? 0)
            + (layout.phase / (Math.PI * 2)) * 0.1,
        )
        updateDroughtMorphInfluences(
          morphState.morphTargetInfluences,
          droughtMorphTargets,
          droughtStrength,
          instanceDelay,
        )
        meshReference.current.setMorphAt(index, morphState)
      })
      meshReference.current.morphTexture.needsUpdate = true
      lastDroughtMorphStrength.current = droughtStrength
    }
    const conditionStemBend = getStemConditionBend(
      droughtStrength,
      diseaseStrength,
      CONFIG.weather.drought.stemBend,
      CONFIG.weather.disease.stemBend,
    )
    const conditionStrength = getConditionStrength(
      droughtStrength,
      diseaseStrength,
    )
    const conditionTransitionActivity = getConditionTransitionActivity(
      droughtStrength,
      diseaseStrength,
    )

    layouts.forEach((layout, index) => {
      if (partMotion) {
        const wave = Math.sin(weather.time * 1.45 + layout.phase)
        const shake = Math.sin(weather.time * 8.8 + layout.phase * 1.73)
        const bend = -CONFIG.weather.wind.fieldSway
          * windStrength
          * layout.amplitude
          * (0.42 + weather.gust * 0.48 + wave * 0.1)
        const variedStemBend = conditionStemBend * layout.amplitude
        const ambientSway = getPlantSway(
          weather.time,
          layout.phase,
          CONFIG.weather.ambientMotion.fieldSway,
          CONFIG.weather.ambientMotion.primaryFrequency,
          CONFIG.weather.ambientMotion.secondaryFrequency,
        ) * motionScale * layout.amplitude
        const conditionSway = (
          Math.sin(
            weather.time * CONFIG.weather.conditionMotion.primaryFrequency
              + layout.phase,
          )
          + Math.sin(
            weather.time * CONFIG.weather.conditionMotion.secondaryFrequency
              + layout.phase * 1.7,
          ) * 0.35
        ) * CONFIG.weather.conditionMotion.fieldSway
          * conditionStrength
          * motionScale
          * layout.amplitude
        scratch.windEuler.set(
          wave * 0.026 * windStrength
            + shake * 0.007 * windStrength
            + Math.sin(layout.phase) * variedStemBend * 0.34
            + ambientSway * 0.55
            + conditionSway * 0.55,
          0,
          bend
            + shake * CONFIG.weather.wind.shake * 0.55 * windStrength
            - variedStemBend * (0.72 + Math.cos(layout.phase) * 0.18)
            + ambientSway
            + conditionSway,
        )
        scratch.windQuaternion.setFromEuler(scratch.windEuler)
        scratch.combinedQuaternion
          .copy(scratch.windQuaternion)
          .multiply(layout.quaternion)
      }
      scratch.plant.position.set(
        layout.position.x * horizontalSpacingScale,
        layout.position.y,
        layout.position.z * depthSpacingScale,
      )
      scratch.plant.quaternion.copy(
        partMotion ? scratch.combinedQuaternion : layout.quaternion,
      )
      scratch.plant.scale.copy(layout.scale).multiplyScalar(plantScale)
      scratch.plant.updateMatrix()
      let activeLocalMatrix = localMatrix
      if (partMotion?.isLeaf) {
        const instanceDelay = Math.min(
          0.36,
          partMotion.delay + (layout.phase / (Math.PI * 2)) * 0.1,
        )
        const droopProgress = getLeafConditionDroopProgress(
          droughtStrength,
          diseaseStrength,
          instanceDelay,
          CONFIG.weather.drought.droopAmount,
          CONFIG.weather.disease.droopAmount,
        )
        const flutter = (
          Math.sin(weather.time * 4.2 + layout.phase + partMotion.delay * 17)
          + Math.sin(weather.time * 7.1 + layout.phase * 1.7) * 0.35
        ) * 0.045 * windStrength * layout.amplitude
        const conditionLeafSway = getLeafConditionSway(
          weather.time,
          layout.phase + partMotion.delay * 17,
          droughtStrength,
          diseaseStrength,
          CONFIG.weather.conditionMotion.leafSway,
          CONFIG.weather.conditionMotion.primaryFrequency,
          CONFIG.weather.conditionMotion.secondaryFrequency,
        ) * motionScale * layout.amplitude
        const transitionDelay = Math.min(
          CONFIG.weather.conditionMotion.transitionStagger,
          partMotion.delay
            + (layout.phase / (Math.PI * 2))
              * CONFIG.weather.conditionMotion.transitionStagger * 0.45,
        )
        const variedTransitionActivity = getProgressAfterDelay(
          conditionTransitionActivity,
          transitionDelay,
        )
        const transitionShake = (
          Math.sin(
            weather.time * (
              CONFIG.weather.conditionMotion.transitionPrimaryFrequency
                + layout.amplitude * 0.8
            )
              + layout.phase * 2.31
              + partMotion.delay * 19,
          )
          + Math.sin(
            weather.time
              * CONFIG.weather.conditionMotion.transitionSecondaryFrequency
              + layout.phase * 0.83
              + partMotion.delay * 31,
          ) * 0.4
        ) * CONFIG.weather.conditionMotion.leafTransitionShake
          * variedTransitionActivity
          * motionScale
          * layout.amplitude
        scratch.droopQuaternion
          .identity()
          .slerp(partMotion.droopQuaternion, droopProgress)
        scratch.flutterEuler.set(
          flutter * 0.55 + conditionLeafSway * 0.62 + transitionShake * 0.68,
          transitionShake * 0.24,
          flutter + conditionLeafSway + transitionShake,
        )
        scratch.flutterQuaternion.setFromEuler(scratch.flutterEuler)
        scratch.localQuaternion
          .copy(partMotion.quaternion)
          .multiply(scratch.droopQuaternion)
          .multiply(scratch.flutterQuaternion)
        scratch.animatedLocalMatrix.compose(
          partMotion.position,
          scratch.localQuaternion,
          partMotion.scale,
        )
        activeLocalMatrix = scratch.animatedLocalMatrix
      }
      scratch.combinedMatrix.multiplyMatrices(
        scratch.plant.matrix,
        activeLocalMatrix,
      )
      meshReference.current.setMatrixAt(index, scratch.combinedMatrix)
    })
    meshReference.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh
      ref={meshReference}
      args={[geometry, material, layouts.length]}
      frustumCulled={false}
      name={`field-${name}`}
    />
  )
}
