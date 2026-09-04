// The breeder-refinement beat takes over after the editorial bridge. Its GLB
// animation is sampled directly from progress so reverse scrolling rewinds it.
export const GENETICS_GROWTH_TIMING = {
  ambientParticleFadeRange: [0.75, 0.84],
  ambientParticleFinalOpacity: 0.1,
  entryRange: [0.75, 0.98],
  revealRange: [0.75, 0.81],
  animationRange: [0.85, 0.98],
  titleFadeDurationMs: 520,
}

export const GENETICS_SEEDLING_LIGHTING = {
  hemisphere: {
    skyColor: '#244b45',
    groundColor: '#0d0705',
    intensity: 0.3,
  },
  warmKey: {
    color: '#ffd39a',
    intensity: 34,
    position: [-3.8, 4.8, 4.5],
    angle: 0.52,
    penumbra: 0.78,
    distance: 14,
    decay: 1.35,
  },
  blueRim: {
    color: '#54a9cf',
    intensity: 1.15,
    position: [-5, 0.8, 3.2],
  },
  tealBacklight: {
    color: '#59d9bd',
    intensity: 0.55,
    position: [4, 3, -4],
  },
  seedHighlight: {
    color: '#ffe0a8',
    intensity: 48,
    distance: 8,
    decay: 1.4,
    xOffset: 2.7,
    height: 1.42,
    zOffset: 2.1,
  },
  targetHeight: 1.25,
  grounding: {
    color: '#050302',
    opacity: 0.3,
    y: -0.012,
  },
}

export const GENETICS_SEEDLING_MODEL = {
  // The model is rotated -90deg around Y at runtime, so negative local X
  // pushes the living plant assembly away from the camera and into the soil.
  plantDepthOffset: -0.035,
}

export function getGeneticsAmbientParticleOpacity(progress) {
  const [start, end] = GENETICS_GROWTH_TIMING.ambientParticleFadeRange
  const normalized = Math.min(1, Math.max(0, (progress - start) / (end - start)))
  const eased = normalized * normalized * (3 - 2 * normalized)
  return 1 + (
    GENETICS_GROWTH_TIMING.ambientParticleFinalOpacity - 1
  ) * eased
}

export const GENETICS_INTRO_TIMING = {
  activeRange: [0, 0.4],
}

export function isGeneticsIntroActive(progress) {
  const [, end] = GENETICS_INTRO_TIMING.activeRange
  return progress < end
}

export function crossedIntoGeneticsIntro(previousProgress, progress) {
  const [, end] = GENETICS_INTRO_TIMING.activeRange
  return Number.isFinite(previousProgress)
    && previousProgress >= end
    && progress < end
}

// Scene 2's DNA introduction clears near 40%, while the selectable seed views
// do not begin until 80%. This editorial beat owns the space between them.
export const GENETICS_BRIDGE_TIMING = {
  activeRange: [0.38, 0.7],
  fadeDurationMs: 520,
}

export function isGeneticsBridgeActive(progress) {
  const [start, end] = GENETICS_BRIDGE_TIMING.activeRange
  return progress >= start && progress < end
}
