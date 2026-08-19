export const PREDICTION_RENDER_CONFIG = {
  modelUrl: '/models/prediction/WheatPlants.glb',
  heroPlantName: 'WheatPlant1',
  // At this scale the opening frame contains the complete wheat head, while
  // the closing frame settles around the stem base rather than showing the
  // entire plant at once.
  heroScale: 2.45,
  camera: {
    x: 0,
    startY: 3.4,
    // Stop above the physical plant origin so the stem continues below-frame
    // instead of exposing its modeled endpoint at the end of Scene 3.
    endY: 1.05,
    minimumY: 0.95,
    z: 1.8,
    lookAtX: 0,
    lookAtZ: 0,
    parallax: {
      damping: 3,
      verticalRange: 0.1,
    },
  },
  sky: {
    distance: -24,
    hazeStrength: 0.58,
    horizonY: 0.38,
    size: [70, 36],
    verticalOffset: 1.1,
    palettes: {
      base: {
        bottom: '#756a4f',
        horizon: '#899078',
        top: '#29423f',
      },
      storm: {
        bottom: '#343b3d',
        horizon: '#687377',
        top: '#1c282c',
      },
      drought: {
        bottom: '#b49662',
        horizon: '#fff4d8',
        top: '#bfc4b4',
      },
      disease: {
        bottom: '#696139',
        horizon: '#aaa45f',
        top: '#42482d',
      },
    },
  },
  ground: {
    colorMapUrl: '/models/prediction/ground/Ground048_1K-JPG_Color.jpg',
    displacementBias: -0.02,
    displacementMapUrl: '/models/prediction/ground/Ground048_1K-JPG_Displacement.jpg',
    displacementScale: 0.04,
    normalMapUrl: '/models/prediction/ground/Ground048_1K-JPG_NormalGL.jpg',
    normalScale: 0.72,
    // Extend past the portal camera's far clip so no finite rear edge can
    // project onto the visible horizon.
    position: [0, -0.34, -65],
    repeat: [54, 88],
    roughnessMapUrl: '/models/prediction/ground/Ground048_1K-JPG_Roughness.jpg',
    segments: [160, 256],
    size: [140, 220],
    tint: '#9a806d',
  },
  field: {
    leanRange: 0.055,
    seed: 48271,
    variantNames: ['WheatPlant1', 'WheatPlant2'],
    variantTints: ['#78916b', '#82966c'],
    layers: [
      {
        id: 'far',
        // Fewer separable passes reduce fill-rate cost. The larger radius
        // preserves approximately the same accumulated softness.
        blurIterations: 1,
        blurPlaneZ: -5.3,
        blurRadius: 2.6,
        blurResolutionScale: 0.35,
        count: 520,
        depthRange: [4, 86],
        heroClearingRadius: 0,
        horizontalRange: [9, 58],
        scaleRange: [4.8, 22],
      },
      {
        id: 'mid',
        blurIterations: 1,
        blurPlaneZ: -1.35,
        blurRadius: 1.7,
        blurResolutionScale: 0.55,
        count: 240,
        depthRange: [0.65, 13],
        heroClearingRadius: 0.85,
        horizontalRange: [4.5, 14],
        scaleRange: [3, 5.8],
      },
    ],
  },
  lighting: {
    hemisphere: {
      skyColor: '#e5d39c',
      groundColor: '#162d24',
      intensity: 1.15,
    },
    key: {
      color: '#ffd98a',
      intensity: 3.4,
      position: [-2.5, 4, 3],
    },
    rim: {
      color: '#66c9ae',
      intensity: 1.25,
      position: [3, 1, -2],
    },
  },
  weather: {
    activeConditionId: 'wind',
    backgroundColor: '#242a2c',
    flashColor: '#d9e8ee',
    transitionDamping: 2.4,
    ground: {
      roughness: 0.72,
      tint: '#535957',
    },
    drought: {
      backgroundColor: '#302817',
      droopAmount: 0.68,
      stemBend: 0.065,
      ground: {
        roughness: 1,
        tint: '#b89961',
      },
      lighting: {
        hemisphere: {
          skyColor: '#fff8e8',
          groundColor: '#5b4524',
          intensity: 1.75,
        },
        key: {
          color: '#fffdf5',
          intensity: 9.25,
        },
        rim: {
          color: '#eee3c7',
          intensity: 1.65,
        },
      },
      transitionDamping: 1.25,
    },
    disease: {
      backgroundColor: '#28291b',
      // Disease weakens the leaves without reaching the full drought pose.
      droopAmount: 0.38,
      stemBend: 0.032,
      fieldTints: ['#a9a33f', '#b5ad48'],
      ground: {
        roughness: 0.88,
        tint: '#81784c',
      },
      leafTint: '#b7ae42',
      structureTint: '#958b43',
      lighting: {
        hemisphere: {
          skyColor: '#c8ca8a',
          groundColor: '#3d3a20',
          intensity: 0.92,
        },
        key: {
          color: '#dbd58e',
          intensity: 2.65,
        },
        rim: {
          color: '#9ca96e',
          intensity: 0.82,
        },
      },
      transitionDamping: 1.4,
    },
    soil: {
      // Procedural emissive points move toward each mesh's tip on isolated
      // overlay meshes that share the hero plant's surface geometry.
      activeFraction: 0.52,
      glowSize: 0.16,
      haloIntensity: 0.15,
      intensity: 3.35,
      particleColor: '#69ff87',
      particleDensity: 64,
      particleSize: 0.06,
      reducedMotionSpeedScale: 0.3,
      speed: 0.1,
      transitionDamping: 3.2,
    },
    fieldDensity: {
      // Repack the existing instances instead of adding more geometry. This
      // keeps draw calls and vertex count unchanged while making the plot feel
      // substantially tighter around the hero plant.
      cameraZ: 1.58,
      depthSpacingScale: 0.72,
      horizontalSpacingScale: 0.58,
      plantScale: 1.06,
      transitionDamping: 2.2,
    },
    lighting: {
      hemisphere: {
        skyColor: '#78858a',
        groundColor: '#111719',
        intensity: 0.5,
      },
      key: {
        color: '#aeb9bd',
        intensity: 1.15,
      },
      rim: {
        color: '#73868d',
        intensity: 0.65,
      },
      lightning: {
        color: '#eaf8ff',
        intensity: 8.5,
        position: [-4, 8, 4],
      },
    },
    wind: {
      fieldSway: 0.105,
      heroSway: 0.13,
      shake: 0.025,
    },
    rain: {
      count: 900,
      reducedMotionCount: 360,
      depthRange: [-13, 1],
      height: 13,
      horizontalRange: 9,
      opacity: 0.72,
      speedRange: [8.5, 14],
    },
    lightning: {
      firstDelay: 2.4,
      intervalRange: [4.8, 9.2],
    },
  },
}
