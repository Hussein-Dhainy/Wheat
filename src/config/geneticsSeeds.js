// Provisional editorial copy for the three Scene 2 model views. Keeping this
// beside the option IDs lets the HTML controls and WebGL carousel share one
// source of truth while the final story copy is still being written.
export const GENETICS_SEED_OPTIONS = [
  {
    id: 'open',
    label: 'Open seed',
    meshName: 'Open_Seed_LowPoly',
    heroMeshName: 'Open_Seed',
    description: 'An expanded view reveals the seed\u2019s layered construction.',
  },
  {
    id: 'semiOpen',
    label: 'Semi-open seed',
    meshName: 'Semi_Open_Seed_LowPoly',
    heroMeshName: 'Semi_Open_Seed',
    description: 'A partial view brings the internal form and outer shell together.',
  },
  {
    id: 'closed',
    label: 'Closed seed',
    meshName: 'Closed_Seed_LowPoly',
    heroMeshName: 'Closed_Seed',
    description: 'The complete grain returns the focus to the selected candidate.',
  },
]

export const DEFAULT_GENETICS_SEED_ID = 'closed'

// Shared by the WebGL reveal and its HTML controls so neither layer becomes
// interactive before the other is visible. The reveal now finishes exactly
// at the scene's own end (1) instead of leaving dead scroll room between a
// fully revealed carousel and the transition into Scene 3.
export const GENETICS_SEED_TIMING = {
  carouselRevealRange: [0.8, 1],
}
