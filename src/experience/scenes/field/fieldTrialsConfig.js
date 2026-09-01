import { assetUrl } from '../../../config/assetBase.js'
export const FIELD_TRIALS_CONFIG = {
  textureUrl: assetUrl('field/VariedWheatField.png'),
  background: '#172315',
  planeSize: 64,
  gridSize: [16, 16],
  tint: {
    // Edit these colors to change the family of plot variations. The shader
    // assigns one palette entry to every logical field tile.
    palette: [
      '#426d2b',
      '#57833a',
      '#718744',
      '#8a8739',
      '#3c7441',
      '#65762f',
    ],
    seed: 4183,
    strength: 0.48,
    dividerDarkening: 0.18,
    dividerWidth: 0.018,
    // Add entries such as '16,16': 3 to force a plot to use palette index 3.
    overrides: {},
  },
  image: {
    brightness: 0.9,
    contrast: 1.08,
    saturation: 0.92,
  },
  screenShadow: {
    bottomOpacity: 0.8,
    cloudOpacity: 0.16,
    color: '#07110a',
    clearSceneProgress: 0.5,
    // Temporarily fast and wide so the cloud-shadow movement is unmistakable.
    driftAmount: 2.2,
    driftSpeed: 0.75,
    endFadeEnd: 0.04,
    endFadeStart: -0.08,
    fadeEnd: 0.68,
    fadeStart: 0.38,
    opacityExponent: 0.85,
    rightVignetteOpacity: 0.2,
    topVignetteOpacity: 0.36,
    // Portion of the complete shadow animation consumed while Scene 4 is
    // entering through the diagonal transition from Scene 3.
    transitionProgressShare: 0.45,
  },
  camera: {
    fov: 38,
    // The camera also pulls back and up slightly over the scene, on top of
    // the pitch/travel motion below.
    startHeight: 8.2,
    endHeight: 9.4,
    // Pitch sweeps past perpendicular rather than just easing toward it: the
    // camera opens looking backward-and-down, tips through straight-down at
    // the midpoint, then continues into a forward-and-down look by the end.
    startPitchDegrees: -110,
    midPitchDegrees: -90,
    endPitchDegrees: -70,
    startTargetZ: -1.15,
    endTargetZ: 1.15,
    pointerDamping: 3.5,
    // Mouse movement rotates the view a little (yaw/pitch) instead of
    // panning the camera's position.
    pointerYawDegrees: 6,
    pointerPitchDegrees: 4,
    // How far past the scene's own 0-1 progress range the camera keeps
    // moving while a diagonal transition is entering/leaving this scene,
    // so it never sits frozen mid-wipe.
  },
}
