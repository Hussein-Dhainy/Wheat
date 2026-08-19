import { MathUtils, Quaternion, Vector3 } from 'three'

const UP = new Vector3(0, 1, 0)

export function isPlantLeaf(name = '') {
  return name.toLowerCase().includes('leaf')
}

export function createLeafDroopQuaternion(geometry) {
  geometry.computeBoundingBox()
  const center = geometry.boundingBox.getCenter(new Vector3())
  const horizontalDirection = new Vector3(center.x, 0, center.z)

  if (horizontalDirection.lengthSq() < 0.000001) {
    horizontalDirection.set(1, 0, 0)
  } else {
    horizontalDirection.normalize()
  }

  const damagedDirection = horizontalDirection
    .multiplyScalar(0.78)
    .setY(-0.62)
    .normalize()
  return new Quaternion().setFromUnitVectors(UP, damagedDirection)
}

export function getLeafDroughtDelay(name = '') {
  let hash = 2166136261
  for (let index = 0; index < name.length; index += 1) {
    hash ^= name.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return ((hash >>> 0) % 1000) / 1000 * 0.24
}

export function getProgressAfterDelay(progress, delay) {
  return MathUtils.smootherstep(
    MathUtils.clamp((progress - delay) / Math.max(0.001, 1 - delay), 0, 1),
    0,
    1,
  )
}

export function getLeafConditionDroopProgress(
  droughtProgress,
  diseaseProgress,
  delay,
  droughtDroopAmount,
  diseaseDroopAmount,
) {
  const droughtDroop = getProgressAfterDelay(droughtProgress, delay)
    * droughtDroopAmount
  const diseaseDroop = getProgressAfterDelay(diseaseProgress, delay)
    * diseaseDroopAmount

  // Conditions overlap briefly while changing selection. Keep the stronger
  // deformation instead of adding them into an exaggerated pose.
  return MathUtils.clamp(Math.max(droughtDroop, diseaseDroop), 0, 1)
}

export function getStemConditionBend(
  droughtProgress,
  diseaseProgress,
  droughtBend,
  diseaseBend,
) {
  const droughtResponse = MathUtils.clamp(droughtProgress, 0, 1) * droughtBend
  const diseaseResponse = MathUtils.clamp(diseaseProgress, 0, 1) * diseaseBend

  // A condition switch briefly overlaps both damped states. Keep the stronger
  // bend so their values cannot add into an unintended sharp lean.
  return Math.max(droughtResponse, diseaseResponse)
}
