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

export function updateDroughtMorphInfluences(
  influences,
  morphTargets,
  droughtProgress,
  delay = 0,
) {
  influences.fill(0)
  const progress = getProgressAfterDelay(
    MathUtils.clamp(droughtProgress, 0, 1),
    delay,
  )

  morphTargets.forEach(({ index, weight }) => {
    influences[index] = progress * weight
  })

  return progress
}

export function getConditionStrength(droughtProgress, diseaseProgress) {
  return MathUtils.clamp(
    MathUtils.clamp(droughtProgress, 0, 1)
      + MathUtils.clamp(diseaseProgress, 0, 1),
    0,
    1,
  )
}

export function getConditionTransitionActivity(
  droughtProgress,
  diseaseProgress,
) {
  const drought = MathUtils.clamp(droughtProgress, 0, 1)
  const disease = MathUtils.clamp(diseaseProgress, 0, 1)

  // Each damped condition contributes only while it is between endpoints.
  // The combined envelope works for neutral entry/exit and direct handoffs.
  return MathUtils.clamp(
    4 * (drought * (1 - drought) + disease * (1 - disease)),
    0,
    1,
  )
}

function getConditionPoseAmount(
  droughtProgress,
  diseaseProgress,
  droughtAmount,
  diseaseAmount,
) {
  const drought = MathUtils.clamp(droughtProgress, 0, 1)
  const disease = MathUtils.clamp(diseaseProgress, 0, 1)
  const total = drought + disease
  if (total < 0.000001) return 0

  const strength = MathUtils.clamp(total, 0, 1)
  const diseaseMix = disease / total
  return strength * MathUtils.lerp(droughtAmount, diseaseAmount, diseaseMix)
}

export function getLeafConditionDroopProgress(
  droughtProgress,
  diseaseProgress,
  delay,
  droughtDroopAmount,
  diseaseDroopAmount,
) {
  const conditionStrength = getConditionStrength(
    droughtProgress,
    diseaseProgress,
  )
  const delayedStrength = getProgressAfterDelay(
    conditionStrength,
    delay,
  )
  const poseAmount = getConditionPoseAmount(
    droughtProgress,
    diseaseProgress,
    droughtDroopAmount,
    diseaseDroopAmount,
  )

  // Apply the stagger only to the shared damage envelope. During a direct
  // drought/disease switch the envelope stays active while the pose amount
  // blends between conditions, preventing a temporary return toward upright.
  return MathUtils.clamp(
    poseAmount * delayedStrength / Math.max(0.000001, conditionStrength),
    0,
    1,
  )
}

export function getStemConditionBend(
  droughtProgress,
  diseaseProgress,
  droughtBend,
  diseaseBend,
) {
  return getConditionPoseAmount(
    droughtProgress,
    diseaseProgress,
    droughtBend,
    diseaseBend,
  )
}

export function getPlantSway(
  time,
  phase,
  amplitude,
  primaryFrequency,
  secondaryFrequency,
) {
  return (
    Math.sin(time * primaryFrequency + phase)
    + Math.sin(time * secondaryFrequency + phase * 1.7) * 0.35
  ) * amplitude
}

export function getLeafConditionSway(
  time,
  phase,
  droughtProgress,
  diseaseProgress,
  amplitude,
  primaryFrequency,
  secondaryFrequency,
) {
  const conditionStrength = getConditionStrength(
    droughtProgress,
    diseaseProgress,
  )

  return getPlantSway(
    time,
    phase,
    amplitude,
    primaryFrequency,
    secondaryFrequency,
  ) * conditionStrength
}
