import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import {
  DynamicDrawUsage,
  Euler,
  MathUtils,
  Matrix4,
  Object3D,
  Quaternion,
  Vector3,
} from 'three'
import {
  createLeafDroopQuaternion,
  getLeafDroughtDelay,
  getLeafConditionDroopProgress,
  getStemConditionBend,
  isPlantLeaf,
} from './plantConditionMotion.js'
import { PREDICTION_RENDER_CONFIG as CONFIG } from './predictionConfig.js'

const FULL_CIRCLE = Math.PI * 2

export function InstancedFieldPart({
  geometry,
  layouts,
  localMatrix,
  material,
  name,
  weatherRef,
}) {
  const meshReference = useRef()
  const lastDiseaseStrength = useRef(-1)
  const lastDroughtStrength = useRef(-1)
  const lastFieldDensityStrength = useRef(-1)
  const lastWindStrength = useRef(-1)
  const leafMotion = useMemo(() => {
    if (!isPlantLeaf(name)) return null

    const position = new Vector3()
    const quaternion = new Quaternion()
    const scale = new Vector3()
    localMatrix.decompose(position, quaternion, scale)
    return {
      delay: getLeafDroughtDelay(name),
      droopQuaternion: createLeafDroopQuaternion(geometry),
      position,
      quaternion,
      scale,
    }
  }, [geometry, localMatrix, name])
  const scratch = useMemo(() => ({
    animatedLocalMatrix: new Matrix4(),
    combinedMatrix: new Matrix4(),
    combinedQuaternion: new Quaternion(),
    droopQuaternion: new Quaternion(),
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
    })
    meshReference.current.instanceMatrix.needsUpdate = true
  }, [layouts, localMatrix, scratch])

  useFrame(() => {
    const weather = weatherRef?.current
    if (!meshReference.current || !weather?.active) return

    const strength = weather.strength < 0.001 ? 0 : weather.strength
    const droughtStrength = weather.drought < 0.001 ? 0 : weather.drought
    const diseaseStrength = weather.disease < 0.001 ? 0 : weather.disease
    const rawFieldDensityStrength = weather.fieldDensity ?? 0
    const fieldDensityStrength = rawFieldDensityStrength < 0.001
      ? 0
      : rawFieldDensityStrength
    const droughtChanged = Math.abs(
      droughtStrength - lastDroughtStrength.current,
    ) > 0.0002
    const diseaseChanged = Math.abs(
      diseaseStrength - lastDiseaseStrength.current,
    ) > 0.0002
    const fieldDensityChanged = Math.abs(
      fieldDensityStrength - lastFieldDensityStrength.current,
    ) > 0.0002
    if (
      strength === 0
      && lastWindStrength.current === 0
      && !droughtChanged
      && !diseaseChanged
      && !fieldDensityChanged
    ) return
    lastWindStrength.current = strength
    lastDroughtStrength.current = droughtStrength
    lastDiseaseStrength.current = diseaseStrength
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
    const conditionStemBend = getStemConditionBend(
      droughtStrength,
      diseaseStrength,
      CONFIG.weather.drought.stemBend,
      CONFIG.weather.disease.stemBend,
    )

    layouts.forEach((layout, index) => {
      const wave = Math.sin(weather.time * 1.45 + layout.phase)
      const shake = Math.sin(weather.time * 8.8 + layout.phase * 1.73)
      const bend = -CONFIG.weather.wind.fieldSway
        * strength
        * layout.amplitude
        * (0.42 + weather.gust * 0.48 + wave * 0.1)
      const variedStemBend = conditionStemBend * layout.amplitude
      scratch.windEuler.set(
        wave * 0.026 * strength
          + shake * 0.007 * strength
          + Math.sin(layout.phase) * variedStemBend * 0.34,
        0,
        bend
          + shake * CONFIG.weather.wind.shake * 0.55 * strength
          - variedStemBend * (0.72 + Math.cos(layout.phase) * 0.18),
      )
      scratch.windQuaternion.setFromEuler(scratch.windEuler)
      scratch.combinedQuaternion
        .copy(scratch.windQuaternion)
        .multiply(layout.quaternion)
      scratch.plant.position.set(
        layout.position.x * horizontalSpacingScale,
        layout.position.y,
        layout.position.z * depthSpacingScale,
      )
      scratch.plant.quaternion.copy(scratch.combinedQuaternion)
      scratch.plant.scale.copy(layout.scale).multiplyScalar(plantScale)
      scratch.plant.updateMatrix()
      let activeLocalMatrix = localMatrix
      if (leafMotion) {
        const instanceDelay = Math.min(
          0.36,
          leafMotion.delay + (layout.phase / FULL_CIRCLE) * 0.1,
        )
        const droopProgress = getLeafConditionDroopProgress(
          droughtStrength,
          diseaseStrength,
          instanceDelay,
          CONFIG.weather.drought.droopAmount,
          CONFIG.weather.disease.droopAmount,
        )
        scratch.droopQuaternion
          .identity()
          .slerp(leafMotion.droopQuaternion, droopProgress)
        scratch.localQuaternion
          .copy(leafMotion.quaternion)
          .multiply(scratch.droopQuaternion)
        scratch.animatedLocalMatrix.compose(
          leafMotion.position,
          scratch.localQuaternion,
          leafMotion.scale,
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
