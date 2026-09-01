export function createBackdropRefreshState() {
  return {
    framesSinceRefresh: 0,
    wasActive: false,
  }
}

export function shouldRefreshBackdrop(
  state,
  active,
  refreshIntervalFrames = 2,
) {
  if (!active) {
    state.framesSinceRefresh = 0
    state.wasActive = false
    return false
  }

  if (!state.wasActive) {
    state.framesSinceRefresh = 0
    state.wasActive = true
    return true
  }

  const interval = Number.isFinite(refreshIntervalFrames)
    ? Math.max(1, Math.round(refreshIntervalFrames))
    : 1
  state.framesSinceRefresh += 1

  if (state.framesSinceRefresh < interval) return false

  state.framesSinceRefresh = 0
  return true
}
