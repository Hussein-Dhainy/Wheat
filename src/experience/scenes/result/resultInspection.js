export function normalizeResultViewIndex(index, viewCount) {
  return ((index % viewCount) + viewCount) % viewCount
}

export function snapResultView(rotation, viewStep, viewCount) {
  const stepIndex = Math.round(rotation / viewStep)

  return {
    index: normalizeResultViewIndex(stepIndex, viewCount),
    rotation: stepIndex * viewStep,
  }
}

export function getNearestResultViewRotation(
  currentRotation,
  targetIndex,
  viewStep,
  viewCount,
) {
  const currentStep = Math.round(currentRotation / viewStep)
  const currentIndex = normalizeResultViewIndex(currentStep, viewCount)
  let stepDelta = targetIndex - currentIndex

  if (stepDelta > viewCount / 2) stepDelta -= viewCount
  if (stepDelta < -viewCount / 2) stepDelta += viewCount

  return (currentStep + stepDelta) * viewStep
}

export function getResultOrbitMarkerAngle(viewIndex, viewStep) {
  return Math.PI / 2 + viewIndex * viewStep
}

// Closing inspection always returns to "no offset" (rotation 0), but the
// grain may have been spun through several full turns while it was open.
// Snapping to the nearest whole-turn equivalent of 0 — rather than the
// literal value — keeps the close animation short instead of unwinding
// every turn back to a fixed absolute angle.
export function getNearestRestRotation(rotation, turnLength = Math.PI * 2) {
  return Math.round(rotation / turnLength) * turnLength
}
