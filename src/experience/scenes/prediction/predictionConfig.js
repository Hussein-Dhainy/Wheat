export const PREDICTION_RENDER_CONFIG = {
  models: {
    hero: {
      rootName: 'PredictionWheat',
      url: '/models/prediction/PredictionWheat.glb',
    },
    fieldFar: {
      meshName: 'PredictionWheat_LOD1',
      url: '/models/prediction/PredictionWheat_LOD1.glb',
    },
    fieldNear: {
      rootName: 'PredictionWheat',
      url: '/models/prediction/PredictionWheat_LOD2.glb',
    },
  },
  // At this scale the opening frame contains the complete wheat head, while
  // the closing frame settles around the stem base rather than showing the
  // entire plant at once.
  heroScale: 3.3,
  heroMaterial: {
    // Override the AI-exported glossy PBR response on the strong foreground
    // plant while retaining its base-color and normal textures.
    ior: 1.4,
    metalness: 0,
    normalStrength: 1.7,
    roughness: 0.85,
    specularIntensity: 0.18,
  },
  backdrop: {
    // Blur the complete environmental plate, not individual plant meshes.
    // The hero is rendered afterward and therefore remains fully sharp. One
    // separable pair replaces the former repeated pairs; radii compensate for
    // the lower target resolution so the apparent softness stays comparable.
    planeZ: -0.18,
    quality: {
      high: {
        blurRadius: 5.4,
        refreshIntervalFrames: 2,
        resolutionScale: 0.36,
      },
      medium: {
        blurRadius: 4.5,
        refreshIntervalFrames: 2,
        resolutionScale: 0.32,
      },
      low: {
        blurRadius: 3.3,
        refreshIntervalFrames: 2,
        resolutionScale: 0.28,
      },
    },
  },
  camera: {
    x: 0,
    startY: 3.4,
    // Stop above the physical plant origin so the stem continues below-frame
    // instead of exposing its modeled endpoint at the end of Scene 3.
    endY: 1.05,
    minimumY: 0.95,
    // Scene 3 keeps tracking down the plants while its diagonal exit reveals
    // Scene 4. This lower floor is reached only during that outgoing wipe.
    exitMinimumY: 0.45,
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
    // The displacement map tiles 54x88 times across this plane, so resolving
    // it would need well over 108 segments across just to sample each tile
    // twice. Even the previous 160x256 grid (82k triangles, the largest mesh
    // in the experience) sat below that threshold, which meant its vertices
    // were sampling the map far too sparsely to reproduce it -- they added
    // aliasing, not relief. The visible surface detail comes from the normal
    // map instead, so this grid only needs enough density to stay smooth
    // across the plane's own curvature-free span.
    segments: [32, 48],
    size: [140, 220],
    tint: '#9a806d',
  },
  shadows: {
    // Projected field shadows live inside the blurred backdrop so they can
    // include both the instanced field and a proxy for the separately
    // rendered hero without paying for a full dynamic shadow map.
    baseOpacity: 0.08,
    color: '#302215',
    direction: [0.56, -0.83],
    diseaseOpacityScale: 0.55,
    droughtOpacity: 0.58,
    heroLength: 2.15,
    heroWidth: 0.4,
    lengthScale: 0.38,
    minimumLength: 0.72,
    minimumWidth: 0.12,
    stormOpacityScale: 0.28,
    widthScale: 0.085,
    y: -0.295,
  },
  field: {
    leanRange: 0.055,
    seed: 48271,
    tint: '#ffffff',
    tintVariation: 0.12,
    layers: [
      {
        id: 'far',
        assetId: 'far',
        count: 110,
        depthRange: [4, 86],
        heroClearingRadius: 0,
        horizontalRange: [9, 58],
        scaleRange: [6.5, 29.5],
      },
      {
        id: 'mid',
        assetId: 'far',
        count: 48,
        depthRange: [1.25, 13],
        heroClearingRadius: 0,
        horizontalRange: [4.5, 14],
        scaleRange: [4.05, 7.8],
      },
      {
        id: 'near',
        assetId: 'near',
        count: 14,
        depthRange: [0.45, 1.15],
        heroClearingRadius: 0,
        horizontalRange: [4.2, 5.4],
        scaleRange: [3.8, 4.7],
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
      droopAmount: 0.4,
      // These authored LOD2 shape keys remain neutral outside drought. Their
      // weights are applied through InstancedMesh's per-instance morph data.
      nearLeafMorphTargets: {
        Drought_CarpetRoll: 1,
        Drought_Curl: 1,
      },
      fieldTint: '#d19a43',
      // Replace enough of the imported green albedo to make the field read as
      // dry golden wheat while retaining some authored texture variation.
      fieldWashStrength: 0.72,
      fieldWashTint: '#c98a35',
      heroTint: '#d49a3f',
      heroWashStrength: 0.72,
      stemBend: 0.085,
      ground: {
        roughness: 1,
        tint: '#b89961',
      },
      lighting: {
        hemisphere: {
          skyColor: '#fff8e8',
          groundColor: '#5b4524',
          intensity: 1.5,
        },
        key: {
          color: '#fffdf5',
          intensity: 4.4,
        },
        rim: {
          color: '#eee3c7',
          intensity: 1.65,
        },
      },
      transitionDamping: 0.65,
    },
    disease: {
      backgroundColor: '#28291b',
      // Disease weakens the leaves without reaching the full drought pose.
      bleachColor: '#dfd19a',
      droopAmount: 0.24,
      // Far plants use broader marks that survive the backdrop blur; the
      // separated near leaves retain a finer lesion pattern.
      farDetail: 0.42,
      stemBend: 0.05,
      fieldTint: '#b48a3b',
      ground: {
        roughness: 0.88,
        tint: '#81784c',
      },
      leafTint: '#c49a3d',
      lesionColor: '#4b2719',
      nearLeafDetail: 1,
      nearStructureDetail: 0.64,
      structureTint: '#89612e',
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
      transitionDamping: 0.7,
    },
    ambientMotion: {
      // A constant light breeze keeps every condition alive. The field moves
      // much more than the selected hero, while Wind layers gusts on top.
      fieldSway: 0.038,
      heroSway: 0.0065,
      primaryFrequency: 0.58,
      secondaryFrequency: 0.93,
    },
    conditionMotion: {
      // A slow secondary sway keeps damaged background plants visibly alive
      // while their leaves settle into the drought/disease pose. A faster,
      // transition-only tremor is phase-shifted per leaf and plant.
      fieldSway: 0.032,
      heroLeafSway: 0.045,
      heroLeafTransitionShake: 0.014,
      heroStructureSway: 0.022,
      leafSway: 0.09,
      leafTransitionShake: 0.06,
      primaryFrequency: 0.72,
      secondaryFrequency: 1.15,
      transitionPrimaryFrequency: 6.4,
      transitionSecondaryFrequency: 10.3,
      transitionStagger: 0.42,
    },
    soil: {
      // Procedural emissive points move toward each mesh's tip on isolated
      // overlay meshes that share the hero plant's surface geometry.
      activeFraction: 0.52,
      glowSize: 0.16,
      haloIntensity: 0.15,
      intensity: 3.35,
      particleColor: '#69ff87',
      particleSpacing: 22,
      particleSize: 0.06,
      fieldTint: '#8eaa72',
      reducedMotionSpeedScale: 0.3,
      // Screen pixels per second. Keeping direction in screen space prevents
      // angled leaf surfaces from turning the upward flow sideways.
      speed: 40,
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
