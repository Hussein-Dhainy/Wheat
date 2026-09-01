export const QUALITY_TIERS = ['low', 'medium', 'high']

export const QUALITY_PROFILES = Object.freeze({
  high: Object.freeze({
    canvasDpr: Object.freeze([1, 1.5]),
    compositorRenderScale: 0.85,
  }),
  medium: Object.freeze({
    canvasDpr: Object.freeze([1, 1.25]),
    compositorRenderScale: 0.76,
  }),
  low: Object.freeze({
    canvasDpr: Object.freeze([1, 1]),
    compositorRenderScale: 0.68,
  }),
})

const MINIMUM_RUNTIME_SAMPLE_MS = 2500
const MINIMUM_RUNTIME_SAMPLE_FRAMES = 12

function isFinitePositive(value) {
  return Number.isFinite(value) && value > 0
}

export function normalizeQualityTier(value) {
  return QUALITY_TIERS.includes(value) ? value : null
}

export function readQualityOverride(search = '') {
  const normalizedSearch = typeof search === 'string' ? search : ''
  return normalizeQualityTier(
    new URLSearchParams(normalizedSearch).get('quality')?.toLowerCase(),
  )
}

export function resolveInitialQualityTier({
  deviceMemory,
  hardwareConcurrency,
  pixelRatio = 1,
  saveData = false,
  viewportHeight = 0,
  viewportWidth = 0,
} = {}) {
  if (saveData) return 'low'

  const safePixelRatio = isFinitePositive(pixelRatio)
    ? Math.min(pixelRatio, 2)
    : 1
  const renderedPixelCount = Math.max(0, viewportWidth)
    * Math.max(0, viewportHeight)
    * safePixelRatio ** 2

  // Blend independent pressure signals instead of treating device type as a
  // proxy for GPU speed. The runtime sampler can correct this initial choice.
  let pressure = 0

  if (isFinitePositive(deviceMemory)) {
    if (deviceMemory <= 2) pressure += 3
    else if (deviceMemory <= 4) pressure += 1
  }

  if (isFinitePositive(hardwareConcurrency)) {
    if (hardwareConcurrency <= 2) pressure += 3
    else if (hardwareConcurrency <= 4) pressure += 1
  }

  if (renderedPixelCount >= 7_000_000) pressure += 3
  else if (renderedPixelCount >= 3_500_000) pressure += 1

  if (pressure >= 3) return 'low'
  if (pressure >= 1) return 'medium'
  return 'high'
}

export function getQualityProfile(tier) {
  return QUALITY_PROFILES[normalizeQualityTier(tier) ?? 'medium']
}

export function selectLowerQualityTier(currentTier, candidateTier) {
  const current = normalizeQualityTier(currentTier) ?? 'medium'
  const candidate = normalizeQualityTier(candidateTier) ?? current
  return QUALITY_TIERS.indexOf(candidate) < QUALITY_TIERS.indexOf(current)
    ? candidate
    : current
}

export function getRuntimeQualityTier(currentTier, {
  averageFrameMs = 0,
  frameCount = 0,
  sampleDurationMs = 0,
  slowFrameRatio = 0,
} = {}) {
  const current = normalizeQualityTier(currentTier) ?? 'medium'

  if (
    current === 'low'
    || sampleDurationMs < MINIMUM_RUNTIME_SAMPLE_MS
    || frameCount < MINIMUM_RUNTIME_SAMPLE_FRAMES
  ) {
    return current
  }

  if (current === 'high') {
    return averageFrameMs >= 20.5 || slowFrameRatio >= 0.16
      ? 'medium'
      : current
  }

  return averageFrameMs >= 27.5 || slowFrameRatio >= 0.32
    ? 'low'
    : current
}
