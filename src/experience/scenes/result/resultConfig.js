import { WHEAT_GRAIN_ASSET } from '../../systems/wheatGrain.js'

export const RESULT_SCENE_CONFIG = {
  // The grain model, its mesh names, and its material tuning are shared with
  // Scene 2's genetics detail — see systems/wheatGrain.js.
  modelUrl: WHEAT_GRAIN_ASSET.modelUrl,
  meshName: WHEAT_GRAIN_ASSET.meshName,
  materialSourceMeshName: WHEAT_GRAIN_ASSET.materialSourceMeshName,
  background: '#001510',
  camera: {
    fov: 40,
    position: [0, 0, 6.8],
    lookAt: [0.45, 0, 0],
    pointerDamping: 3.8,
    pointerRange: [0.12, 0.08],
  },
  grain: {
    desktopPosition: [1.55, 0.15, 2],
    mobilePosition: [0.35, -0.75, 2],
    desktopScale: 1.7,
    mobileScale: 1,
    // How far below its resting spot the grain starts, rising into place
    // during the diagonal wipe transition in from Scene 4.
    wipeRise: 3,
    exitTransitionTravel: 1.5,
    // Total up/down travel (scene units) once inside the scene, and how
    // much scroll progress it takes to cover that distance. Keep this
    // range's end in sync with the closing-reveal window's end in
    // SceneOverlays.module.css (--closing-reveal) — both should finish at
    // the same progress value so the grain disappears right as the
    // closing actions land.
    travelRange: 3.5,
    travelProgressRange: [0, 0.8],
    baseRotation: WHEAT_GRAIN_ASSET.baseRotation,
  },
  inspection: {
    // Begin with the result button's exit and unfold slowly enough to read as
    // one continuous move instead of a sudden zoom after the button vanishes.
    transitionDamping: 1.4,
    grainZoom: 1.08,
    focusDamping: 3.2,
    desktopFocusOffset: [-0.18, 0.05, 0.58],
    mobileFocusOffset: [-0.08, 0.12, 0.48],
    // Each inspection angle gets a tiny compositional bias so selecting a
    // result feels like focusing on a different face, not spinning an object
    // that remains mechanically pinned in place.
    viewFocusOffsets: [
      [0, 0],
      [0.03, 0.05],
      [-0.03, -0.04],
    ],
    particleZoom: 3.15,
    particleCameraTravel: 3.25,
    particleFadeRange: [0.32, 0.9],
    rotationDamping: 5.8,
    viewRotationDuration: 1.15,
    dragRadiansPerPixel: 0.0085,
    viewStep: 2.0943951023931953,
    orbit: {
      radius: 1.42,
      verticalRadius: 0.2,
      position: [0, -0.08, 0],
      rotation: [0, 0, 0],
      mobileScale: 0.66,
      dotCount: 132,
      dotSize: 2.15,
      dotOpacity: 0.48,
      markerSize: 8.5,
      markerGlowSize: 19,
      markerOpacity: 0.92,
      markerGlowOpacity: 0.16,
      color: '#f6fbf8',
    },
  },
  material: WHEAT_GRAIN_ASSET.material,
  lighting: {
    // Only the grain uses a light-reactive PBR material in this scene; the
    // backdrop and particle systems are shader-driven. This ambient fill
    // therefore lifts the grain evenly without brightening the background.
    ambientFill: {
      color: '#fff8ec',
      intensity: 0.35,
    },
  },
  atmosphere: {
    orangeFadeRange: [0.18, 0.82],
    closingBackgroundRange: [0.2, 0.52],
    dustCount: 150,
    dustColor: '#8bd5bd',
    dustSize: 0.024,
    dustOpacity: 0.34,
    backgroundParticles: {
      // Weighted center of the particle clusters. All field rotation pivots
      // here so the composition remains anchored in the lower-left.
      fieldCenter: [-1.8, -0.8, -3.9],
      position: [0, 0, 0],
      // Master multiplier for pointer parallax and rotation. Scroll motion is
      // attenuated separately so a strong pointer response cannot displace
      // the field from its lower-left resting composition.
      motionScale: 1.55,
      pointerDamping: 2.8,
      pointerRange: [0.534, 0.522, 0.208],
      // Pointer-driven pitch, yaw, and roll in radians. These are also
      // multiplied by motionScale, so they stay in step with the parallax.
      pointerRotation: [0.035, 0.05, 0.01],
      scrollMotionScale: 0.44,
      scrollRotation: [0.04, 0.14, 0.03],
      scrollTravel: [0.42, -0.3, 0.7],
    },
  },
  network: {
    clusterCount: 14,
    nodesPerClusterRange: [2, 4],
    coreClusterRatio: 0.72,
    pointColor: '#ffffff',
    connectorColor: '#f1f5f3',
    connectorSpacing: 0.018,
    nodeSize: 8.8,
    connectorSize: 2.15,
    nodeGlowSize: 28,
    connectorGlowSize: 10,
    nodeOpacity: 0.92,
    connectorOpacity: 0.14,
    nodeGlowOpacity: 0.2,
    connectorGlowOpacity: 0.07,
    pulseSpeed: 0.12,
    connectorPulseStrength: 0.82,
    nodePulseStrength: 0.08,
    coreHorizontalRange: [-0.82, -0.42],
    coreHeight: 1.35,
    coreRadiusRange: [0.09, 0.22],
    tendrilHorizontalRange: [-1.55, -0.82],
    tendrilHeight: 2.5,
    tendrilRadiusRange: [0.22, 0.5],
    radialStretchRange: [0.8, 1.9],
    wrapDepth: 0.78,
    driftAmplitudeRange: [0.035, 0.085],
    driftSpeedRange: [0.65, 1.15],
    motionDamping: 3.2,
    pointerRange: [0.16, 0.12, 0.08],
    light: {
      color: '#8ecdf2',
      decay: 2,
      distance: 4.5,
      // Keep the network luminous without letting its front-left point light
      // flatten the stronger blue silhouette created by the rear rim light.
      intensity: 1.5,
      position: [-1.05, 0, 1.0],
    },
  },
}
