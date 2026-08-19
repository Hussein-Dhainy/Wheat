export const MAX_ACTIVE_SCENE_TIME_STEP_SECONDS = 0.1

function assertFiniteNumber(value, name) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`${name} must be a finite number`)
  }
}

export function advanceActiveSceneTime(
  currentTime,
  deltaSeconds,
  running = true,
) {
  assertFiniteNumber(currentTime, 'currentTime')
  assertFiniteNumber(deltaSeconds, 'deltaSeconds')

  if (!running || deltaSeconds <= 0) return currentTime

  return currentTime + Math.min(
    deltaSeconds,
    MAX_ACTIVE_SCENE_TIME_STEP_SECONDS,
  )
}
