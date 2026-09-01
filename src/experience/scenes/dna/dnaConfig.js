import { WHEAT_GRAIN_ASSET } from '../../systems/wheatGrain.js'
import { assetUrl } from '../../../config/assetBase.js'

export const DNA_QUALITY_PROFILES = Object.freeze({
  high: Object.freeze({
    backgroundParticleCount: 800,
    bokehParticleCount: 150,
    particlesPerFiber: 38,
    segments: 210,
    strandCount: 26,
    trailDensity: 0.82,
  }),
  medium: Object.freeze({
    backgroundParticleCount: 520,
    bokehParticleCount: 100,
    particlesPerFiber: 28,
    segments: 170,
    strandCount: 20,
    trailDensity: 0.55,
  }),
  low: Object.freeze({
    backgroundParticleCount: 300,
    bokehParticleCount: 56,
    particlesPerFiber: 18,
    segments: 130,
    strandCount: 14,
    trailDensity: 0.3,
  }),
})

export function getDNAQualityProfile(quality) {
  return DNA_QUALITY_PROFILES[quality] ?? DNA_QUALITY_PROFILES.medium
}

export const DNA_RENDER_CONFIG = {
  transitionTravel: 1.4,
  entry: {
    // Keep part of the helix visible from its first active frame so it reads
    // as entering with the scene instead of appearing after the wipe begins.
    minimumRevealProgress: 0.3,
    // The diagonal entry reveals only this much. The remaining portion grows
    // through the opening part of the genetics scene's existing scroll span.
    transitionRevealProgress: 0.65,
    revealCompletionSceneProgress: 0.2,
    // Width of the soft leading edge along the DNA's normalized height.
    // Smaller values create a sharper top-to-bottom reveal line.
    revealSoftness: 0.54,
    // Total Y-axis turn performed while the DNA settles into place.
    rotation: Math.PI * 0.85,
  },
  // The "Explore the strands" reveal: the helix flies past the camera while
  // the shared wheat grain (systems/wheatGrain.js) scales up in its place.
  detail: {
    // Damping rate for the whole reveal — DNAHelix's fly-past and the grain's
    // scale-up both run off this one mix, so they stay locked together. Lower
    // is slower: the mix settles in roughly 3 / transitionDamping seconds.
    transitionDamping: 1.2,
    dnaScale: 3.4,
    dnaTravel: [0.15, 0.2, 6.4],
    dnaFadeRange: [0.12, 0.7],
    grainRevealRange: [0.38, 0.95],
    grain: {
      // Where the grain sits as a fraction of the viewport, measured from the
      // top-left. These track .geneticsDetailRings in SceneOverlays.module.css
      // (left 27.5%/50%, top 50%/66%) so the grain stays centred inside the
      // rings at every aspect ratio rather than only at the one these numbers
      // were eyeballed on. Keep the two in sync.
      desktopAnchor: [0.275, 0.5],
      desktopScale: 0.72,
      mobileAnchor: [0.5, 0.66],
      mobileScale: 0.72,
      depth: 1,
      rotation: WHEAT_GRAIN_ASSET.baseRotation,
      rotationSpeed: 0.16,
    },
  },
  background: {
    // Null colors resolve to DNAHelix's `background` prop. This lets the
    // middle of the scene brighten into green before returning exactly to
    // the authored starting darkness for the carousel and exit.
    stops: [
      { progress: 0, color: null },
      { progress: 0.36, color: '#132016' },
      { progress: 0.68, color: '#083328' },
      { progress: 0.84, color: '#0d1c17' },
      { progress: 1, color: null },
    ],
  },
  colors: {
    hotCore: '#f58a1f',
    helixNodeCyan: '#62e8c1',
    helixNodeYellow: '#dce92d',
    particleOrange: '#f47b18',
    particleGold: '#ffc24d',
  },
  maximumRibbonWidth: 3,
  minimumRibbonWidth: 3,
  maximumRibbonOpacity: 0.8,
  minimumRibbonOpacity: 0.02,
  particleFlow: {
    cycles: 1.35,
    // Equivalent fraction of Scene 2's normal particle-scroll motion applied
    // while the DNA performs its entry/exit twist.
    entryProgress: 0.18,
    // Smooths the start and stop of that transition-driven particle flow.
    // Higher values settle sooner; lower values coast for longer.
    entryDamping: 3.5,
    backgroundStrength: 0.58,
    backgroundAxisTravel: [2.4, 1.25],
    bokehStrength: 0.82,
    bokehAxisTravel: [3, 1.65],
    trailStrength: 0.2,
    trailAxisTravel: [0.75, 0.4],
  },
  // Normalized distance from the DNA's lower endpoint. Both fibers and their
  // embedded particles fade in over this range, independent of world motion.
  bottomEndFade: {
    start: 0,
    end: 0.3,
    power: 2,
    minimumParticleScale: 0.25,
  },
  // Positions are in the DNA group's local space, so each spot stays pinned
  // to the same structural point on the helix as it rotates and scrolls.
  lightSpots: [
    { position: [0.8, -1.14, 0], radius: 0.9, intensity: 0.5 },
    { position: [-0.4, 0.18, 0.69], radius: 0.9, intensity: 0.5 },
    { position: [-0.4, 1.5, -0.69], radius: 0.9, intensity: 0.5 },
  ],
  // How strongly the light-spot value drives each visual channel. The
  // ribbons are thin and faint by default, so a noticeable glow needs
  // opacity and width pushed too, not just color.
  glow: {
    colorBoost: 1.3,
    opacityBoost: 1.8,
    widthBoost: 0.9,
  },
  // Selective additive halos keep the glow local to Scene 2 without adding a
  // full-screen bloom pass to the portal compositor. Each halo reuses its
  // source geometry, so these values only affect visual spread and intensity.
  halos: {
    dna: {
      color: '#f58a1f',
      embeddedParticleOpacity: 0.5,
      falloffPower: 1.7,
      opacity: 0.14,
      widthScale: 3.1,
    },
    nodes: {
      falloffPower: 2.2,
      maximumSize: 160,
      opacity: 0.22,
      pulseAmount: 0.045,
      sizeScale: 2.05,
    },
  },
  seeds: {
    count: 18,
    modelUrl: assetUrl('genetics/EditedWheatSeeds.glb'),
    sizeRange: [0.56, 0.86],
    horizontalRange: 2.65,
    depthRange: [-1.25, 1.35],
    streamScrollRange: [0.42, 0.8],
    streamTravel: 17,
    transitionTravel: 2.2,
    streamYRange: [-3.5, -13.5],
    streamRotationSpeed: [0.06, 0.16],
    carousel: {
      interactionStartProgress: 0.72,
      center: [-1.2, -0.05, 0],
      radius: 1.35,
      seedSize: 1.5,
      rotationDamping: 5.5,
      individualRotationSpeed: [0.1, 0.16],
      rearScale: 0.68,
      frontScale: 1.05,
      ring: {
        color: '#fffdf4',
        coreOpacity: 0.42,
        coreTubeRadius: 0.0045,
        haloFalloffPower: 2.6,
        haloOpacity: 0.025,
        haloPointCount: 144,
        haloPointSize: 18,
      },
    },
    material: {
      roughness: 0.52,
      normalScale: 0.7,
      openTint: '#f0c15f',
      semiOpenTint: '#f3c868',
      closedTint: '#ffd574',
      selectedTint: '#ffd58a',
      selectedEmissive: '#ffc04f',
      baseEmissiveIntensity: 0.04,
      selectedEmissiveIntensity: 0.16,
    },
    lighting: {
      hemisphere: {
        skyColor: '#58cdb2',
        groundColor: '#5b2c17',
        intensity: 0.5,
      },
      warmKey: {
        color: '#ffb765',
        intensity: 3.2,
        position: [-3, 5, 4],
      },
      tealRim: {
        color: '#55cdb0',
        intensity: 0.9,
        position: [4, 0, -3],
      },
    },
  },
}
