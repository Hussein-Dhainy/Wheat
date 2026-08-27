import { Color } from 'three'

const FIELD_WEATHER_SHADER_KEY = 'prediction-field-weather-v3'

function replaceShaderChunk(source, chunk, replacement) {
  if (!source.includes(chunk)) {
    throw new Error(`Prediction field shader is missing chunk: ${chunk}`)
  }
  return source.replace(chunk, replacement)
}

export function installFieldWeatherMaterial(
  material,
  geometry,
  config,
  { deformVertices = true, diseaseDetail = 1 } = {},
) {
  geometry.computeBoundingBox()
  const bounds = geometry.boundingBox
  const minimumY = bounds?.min.y ?? 0
  const height = Math.max(0.0001, (bounds?.max.y ?? 1) - minimumY)
  const uniforms = {
    uFieldAmbientPrimaryFrequency: {
      value: config.ambientMotion.primaryFrequency,
    },
    uFieldAmbientSecondaryFrequency: {
      value: config.ambientMotion.secondaryFrequency,
    },
    uFieldAmbientSway: { value: config.ambientMotion.fieldSway },
    uFieldDisease: { value: 0 },
    uFieldDiseaseBleachColor: {
      value: new Color(config.disease.bleachColor),
    },
    uFieldDiseaseBend: { value: config.disease.stemBend },
    uFieldDiseaseDetail: { value: diseaseDetail },
    uFieldDiseaseDroop: { value: config.disease.droopAmount },
    uFieldDiseaseLesionColor: {
      value: new Color(config.disease.lesionColor),
    },
    uFieldConditionSway: { value: config.conditionMotion.fieldSway },
    uFieldConditionPrimaryFrequency: {
      value: config.conditionMotion.primaryFrequency,
    },
    uFieldConditionSecondaryFrequency: {
      value: config.conditionMotion.secondaryFrequency,
    },
    uFieldConditionTransitionPrimaryFrequency: {
      value: config.conditionMotion.transitionPrimaryFrequency,
    },
    uFieldConditionTransitionSecondaryFrequency: {
      value: config.conditionMotion.transitionSecondaryFrequency,
    },
    uFieldConditionTransitionShake: {
      value: config.conditionMotion.leafTransitionShake,
    },
    uFieldConditionTransitionStagger: {
      value: config.conditionMotion.transitionStagger,
    },
    uFieldDrought: { value: 0 },
    uFieldDroughtBend: { value: config.drought.stemBend },
    uFieldDroughtColor: { value: new Color(config.drought.fieldWashTint) },
    uFieldDroughtDroop: { value: config.drought.droopAmount },
    uFieldDroughtWash: { value: config.drought.fieldWashStrength },
    uFieldGust: { value: 0 },
    uFieldHeight: { value: height },
    uFieldMinimumY: { value: minimumY },
    uFieldMotionScale: { value: 1 },
    uFieldTime: { value: 0 },
    uFieldWindShake: { value: config.wind.shake },
    uFieldWindStrength: { value: 0 },
    uFieldWindSway: { value: config.wind.fieldSway },
  }

  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms)

    shader.vertexShader = replaceShaderChunk(
      shader.vertexShader,
      '#include <common>',
      `#include <common>
uniform float uFieldAmbientPrimaryFrequency;
uniform float uFieldAmbientSecondaryFrequency;
uniform float uFieldAmbientSway;
uniform float uFieldDisease;
uniform float uFieldDiseaseBend;
uniform float uFieldDiseaseDroop;
uniform float uFieldConditionSway;
uniform float uFieldConditionPrimaryFrequency;
uniform float uFieldConditionSecondaryFrequency;
uniform float uFieldConditionTransitionPrimaryFrequency;
uniform float uFieldConditionTransitionSecondaryFrequency;
uniform float uFieldConditionTransitionShake;
uniform float uFieldConditionTransitionStagger;
uniform float uFieldDrought;
uniform float uFieldDroughtBend;
uniform float uFieldDroughtDroop;
uniform float uFieldGust;
uniform float uFieldHeight;
uniform float uFieldMinimumY;
uniform float uFieldMotionScale;
uniform float uFieldTime;
uniform float uFieldWindShake;
uniform float uFieldWindStrength;
uniform float uFieldWindSway;
varying vec2 vPredictionDiseaseUv;
varying float vPredictionDiseaseSeed;

float predictionFieldHash(vec2 coordinate) {
  return fract(sin(dot(coordinate, vec2(127.1, 311.7))) * 43758.5453123);
}`,
    )
    const deformationShader = deformVertices
      ? `
float predictionHeight = clamp(
  (position.y - uFieldMinimumY) / uFieldHeight,
  0.0,
  1.0
);
float predictionBendWeight = predictionHeight * predictionHeight;
float predictionPhase = predictionStableMotionSeed * 6.28318530718;
float predictionAmplitude = mix(
  0.82,
  1.18,
  predictionFieldHash(
    vec2(predictionStableMotionSeed, predictionStableMotionSeed * 1.73)
      + vec2(19.3, 7.1)
  )
);
float predictionWave = sin(uFieldTime * 1.45 + predictionPhase);
float predictionShake = sin(uFieldTime * 8.8 + predictionPhase * 1.73);
float predictionAmbientSway = (
  sin(uFieldTime * uFieldAmbientPrimaryFrequency + predictionPhase)
  + sin(
    uFieldTime * uFieldAmbientSecondaryFrequency + predictionPhase * 1.7
  ) * 0.35
) * uFieldAmbientSway * uFieldMotionScale * predictionAmplitude;
float predictionWindBend = -uFieldWindSway
  * uFieldWindStrength
  * predictionAmplitude
  * (0.42 + uFieldGust * 0.48 + predictionWave * 0.1);
float predictionConditionTotal = uFieldDrought + uFieldDisease;
float predictionConditionStrength = clamp(predictionConditionTotal, 0.0, 1.0);
float predictionDiseaseMix = uFieldDisease / max(predictionConditionTotal, 0.0001);
float predictionConditionBend = predictionConditionStrength * mix(
  uFieldDroughtBend,
  uFieldDiseaseBend,
  predictionDiseaseMix
) * predictionAmplitude;
float predictionDroop = predictionConditionStrength * mix(
  uFieldDroughtDroop,
  uFieldDiseaseDroop,
  predictionDiseaseMix
);
float predictionConditionWave = (
  sin(uFieldTime * uFieldConditionPrimaryFrequency + predictionPhase)
  + sin(
    uFieldTime * uFieldConditionSecondaryFrequency + predictionPhase * 1.7
  ) * 0.35
) * uFieldConditionSway * predictionConditionStrength * uFieldMotionScale;
float predictionConditionTransition = clamp(
  4.0 * (
    uFieldDrought * (1.0 - uFieldDrought)
    + uFieldDisease * (1.0 - uFieldDisease)
  ),
  0.0,
  1.0
);
float predictionTransitionDelay = predictionStableMotionSeed
  * uFieldConditionTransitionStagger;
float predictionVariedConditionTransition = smoothstep(
  predictionTransitionDelay,
  1.0,
  predictionConditionTransition
);
float predictionTransitionShake = (
  sin(
    uFieldTime * (
      uFieldConditionTransitionPrimaryFrequency
      + predictionStableMotionSeed * 1.4
    ) + predictionPhase * 2.31
  )
  + sin(
    uFieldTime * uFieldConditionTransitionSecondaryFrequency
    + predictionPhase * 0.83
  ) * 0.4
) * uFieldConditionTransitionShake
  * predictionVariedConditionTransition
  * uFieldMotionScale
  * predictionAmplitude;

transformed.x += predictionBendWeight * (
  predictionWave * 0.026 * uFieldWindStrength
  + predictionShake * 0.007 * uFieldWindStrength
  + predictionAmbientSway * 0.55
  + sin(predictionPhase) * predictionConditionBend * 0.34
  + predictionConditionWave * 0.55
  + predictionTransitionShake * 0.68
);
transformed.z += predictionBendWeight * (
  predictionWindBend
  + predictionShake * uFieldWindShake * 0.55 * uFieldWindStrength
  + predictionAmbientSway
  - predictionConditionBend * (0.72 + cos(predictionPhase) * 0.18)
  + predictionConditionWave
  + predictionTransitionShake
);
transformed.y -= predictionBendWeight
  * predictionHeight
  * predictionDroop
  * 0.09;`
      : ''
    shader.vertexShader = replaceShaderChunk(
      shader.vertexShader,
      '#include <begin_vertex>',
      `#include <begin_vertex>
vec2 predictionInstanceSeed = vec2(0.0);
#ifdef USE_INSTANCING
  predictionInstanceSeed = instanceMatrix[3].xz;
#endif
float predictionStableMotionSeed = predictionFieldHash(
  predictionInstanceSeed + vec2(19.3, 7.1)
);
float predictionStableDiseaseSeed = predictionFieldHash(
  predictionInstanceSeed + vec2(5.17, 13.91)
);
#ifdef USE_INSTANCING_COLOR
  // Density and near-part animation both change instance matrices. Keep all
  // procedural variation on immutable instance color so positions can move
  // without scrambling sway phases or lesion placement between frames.
  predictionStableMotionSeed = predictionFieldHash(
    instanceColor.rg * vec2(31.73, 61.19)
  );
  predictionStableDiseaseSeed = predictionFieldHash(
    instanceColor.rg * vec2(47.31, 83.17)
  );
#endif
vPredictionDiseaseSeed = predictionStableDiseaseSeed;
#ifdef USE_UV
  vPredictionDiseaseUv = uv;
#else
  vPredictionDiseaseUv = position.xy * 0.35;
#endif
${deformationShader}`,
    )

    shader.fragmentShader = replaceShaderChunk(
      shader.fragmentShader,
      '#include <common>',
      `#include <common>
uniform float uFieldDisease;
uniform vec3 uFieldDiseaseBleachColor;
uniform float uFieldDiseaseDetail;
uniform vec3 uFieldDiseaseLesionColor;
uniform float uFieldDrought;
uniform vec3 uFieldDroughtColor;
uniform float uFieldDroughtWash;
varying vec2 vPredictionDiseaseUv;
varying float vPredictionDiseaseSeed;

float predictionDiseaseHash(vec2 coordinate) {
  return fract(sin(dot(coordinate, vec2(127.1, 311.7))) * 43758.5453123);
}

float predictionDiseaseSpot(
  vec2 sourceUv,
  vec2 scale,
  float seed,
  float threshold,
  float edge
) {
  vec2 coordinate = sourceUv * scale + vec2(seed * 7.13, seed * 11.71);
  vec2 cell = floor(coordinate);
  vec2 local = fract(coordinate) - 0.5;
  float cellSeed = predictionDiseaseHash(cell + seed * 19.37);
  vec2 offset = vec2(
    predictionDiseaseHash(cell + seed + 2.31),
    predictionDiseaseHash(cell + seed + 7.93)
  ) - 0.5;
  vec2 radius = vec2(
    mix(0.13, 0.28, predictionDiseaseHash(cell + seed + 4.61)),
    mix(0.08, 0.2, predictionDiseaseHash(cell + seed + 9.17))
  );
  float distanceToSpot = length((local - offset * 0.38) / radius);
  float spot = 1.0 - smoothstep(1.0 - edge, 1.0 + edge, distanceToSpot);
  return spot * step(threshold, cellSeed);
}`,
    )
    shader.fragmentShader = replaceShaderChunk(
      shader.fragmentShader,
      '#include <map_fragment>',
      `#include <map_fragment>
float predictionDroughtStrength = smoothstep(0.03, 0.92, uFieldDrought);
diffuseColor.rgb = mix(
  diffuseColor.rgb,
  uFieldDroughtColor,
  predictionDroughtStrength * uFieldDroughtWash
);
float predictionDiseaseStrength = smoothstep(0.03, 0.92, uFieldDisease);
vec2 predictionDiseaseUv = vPredictionDiseaseUv;
float predictionBleach = predictionDiseaseSpot(
  predictionDiseaseUv,
  mix(vec2(2.7, 4.6), vec2(3.8, 6.8), uFieldDiseaseDetail),
  vPredictionDiseaseSeed + 0.31,
  0.36,
  0.24
);
float predictionLesion = predictionDiseaseSpot(
  predictionDiseaseUv,
  mix(vec2(4.2, 7.2), vec2(6.8, 12.0), uFieldDiseaseDetail),
  vPredictionDiseaseSeed + 0.73,
  0.58,
  0.2
);
predictionBleach *= predictionDiseaseStrength * 0.78;
predictionLesion *= predictionDiseaseStrength * 0.9;
diffuseColor.rgb = mix(
  diffuseColor.rgb,
  uFieldDiseaseBleachColor,
  predictionBleach
);
diffuseColor.rgb = mix(
  diffuseColor.rgb,
  uFieldDiseaseLesionColor,
  predictionLesion
);`,
    )
  }
  material.customProgramCacheKey = () => (
    `${FIELD_WEATHER_SHADER_KEY}-${deformVertices ? 'deform' : 'static'}`
  )
  material.needsUpdate = true

  return uniforms
}

export function updateFieldWeatherUniforms(
  uniforms,
  weather,
  reducedMotion,
) {
  const motionScale = reducedMotion ? 0.22 : 1
  uniforms.uFieldDisease.value = weather.disease ?? 0
  uniforms.uFieldDrought.value = weather.drought ?? 0
  uniforms.uFieldGust.value = weather.gust ?? 0
  uniforms.uFieldMotionScale.value = motionScale
  uniforms.uFieldTime.value = weather.time ?? 0
  uniforms.uFieldWindStrength.value = (weather.strength ?? 0) * motionScale
}
