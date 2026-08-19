export const FIELD_TRIALS_CONFIG = {
  textureUrl: '/models/field/VariedWheatField.png',
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
  camera: {
    fov: 38,
    height: 8.2,
    startTiltDegrees: -7,
    endTiltDegrees: 7,
    startTargetZ: 1.15,
    endTargetZ: -1.15,
    pointerDamping: 3.5,
    pointerPanX: 0.38,
    pointerPanZ: 0.24,
  },
}
