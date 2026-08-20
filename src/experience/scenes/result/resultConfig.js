export const RESULT_SCENE_CONFIG = {
  modelUrl: '/models/result/HunyonWheatSeed.glb',
  meshName: 'node_0',
  materialSourceMeshName: 'node_0',
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
    baseRotation: [-0.05, -0.42, 0],
  },
  inspection: {
    transitionDamping: 4.4,
    particleZoom: 3.15,
    particleCameraTravel: 3.25,
    particleFadeRange: [0.32, 0.9],
    rotationDamping: 5.8,
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
  material: {
    colorTint: '#dad36c',
    emissive: '#554414',
    emissiveIntensity: 0.12,
    // Higher roughness broadens the specular response so the key light
    // reads as a soft sheen instead of a sharp glint, and a lower
    // normalScale keeps fine surface bumps from flecking that sheen with
    // little sparkles — both matched against the reference photo, which
    // has no hard highlight anywhere on the grain.
    roughness: 0.96,
    normalScale: 0.4,
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
      // A bounded continuous sway preserves the lower-left composition. An
      // accumulating yaw eventually turns the whole field out of frame.
      idleYawRange: 0.05,
      idleYawSpeed: 0.16,
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
