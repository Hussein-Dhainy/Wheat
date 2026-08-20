export const DEFAULT_TRANSITION_MOTION_DISTANCE = 0.2

function clampTransitionProgress(progress) {
  return Math.min(1, Math.max(0, progress))
}

export function applyOutgoingSceneMotion(
  state,
  phase,
  sceneProgress,
  transitionProgress,
  exitDistance,
) {
  if (phase !== 'transition') {
    state.motionProgress = sceneProgress
    state.transitionMotionOffset = 0
    return
  }

  const progress = clampTransitionProgress(transitionProgress)
  state.motionProgress = sceneProgress + progress * exitDistance
  state.transitionMotionOffset = progress
}

export function applyIncomingSceneMotion(
  state,
  phase,
  transitionProgress,
  entryDistance,
) {
  if (phase !== 'transition') {
    state.motionProgress = 0
    state.transitionMotionOffset = 0
    return
  }

  const offset = clampTransitionProgress(transitionProgress) - 1
  state.motionProgress = offset * entryDistance
  state.transitionMotionOffset = offset
}
