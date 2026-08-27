import { Color } from 'three'

const HERO_DROUGHT_SHADER_KEY = 'prediction-hero-drought-v1'

function replaceShaderChunk(source, chunk, replacement) {
  if (!source.includes(chunk)) {
    throw new Error(`Prediction hero shader is missing chunk: ${chunk}`)
  }
  return source.replace(chunk, replacement)
}

function installHeroDroughtWash(material, droughtConfig) {
  const previousOnBeforeCompile = material.onBeforeCompile
  const uniforms = {
    uHeroDrought: { value: 0 },
    uHeroDroughtColor: { value: new Color(droughtConfig.heroTint) },
    uHeroDroughtWash: { value: droughtConfig.heroWashStrength },
  }

  material.onBeforeCompile = (shader, renderer) => {
    previousOnBeforeCompile.call(material, shader, renderer)
    Object.assign(shader.uniforms, uniforms)
    shader.fragmentShader = replaceShaderChunk(
      shader.fragmentShader,
      '#include <common>',
      `#include <common>
uniform float uHeroDrought;
uniform vec3 uHeroDroughtColor;
uniform float uHeroDroughtWash;`,
    )
    shader.fragmentShader = replaceShaderChunk(
      shader.fragmentShader,
      '#include <map_fragment>',
      `#include <map_fragment>
float predictionHeroDroughtStrength = smoothstep(0.03, 0.92, uHeroDrought);
diffuseColor.rgb = mix(
  diffuseColor.rgb,
  uHeroDroughtColor,
  predictionHeroDroughtStrength * uHeroDroughtWash
);`,
    )
  }
  material.customProgramCacheKey = () => HERO_DROUGHT_SHADER_KEY
  material.userData.predictionHeroDroughtUniforms = uniforms
}

export function configureHeroPlantMaterial(material, config, droughtConfig) {
  // The exported metallic/roughness texture averages much glossier than a
  // wheat plant should. A uniform matte response is more reliable here while
  // the existing normal texture keeps the surface detail.
  material.roughnessMap = null
  material.roughness = config.roughness
  material.metalnessMap = null
  material.metalness = config.metalness

  if (material.normalMap && material.normalScale) {
    material.normalScale.setScalar(config.normalStrength)
  }
  if ('specularIntensity' in material) {
    material.specularIntensity = config.specularIntensity
  }
  if (material.specularColor?.setRGB) {
    material.specularColor.setRGB(1, 1, 1)
  }
  if ('ior' in material) {
    material.ior = config.ior
  }
  if (droughtConfig) {
    installHeroDroughtWash(material, droughtConfig)
  }

  material.needsUpdate = true
  return material
}

export function applyHeroConditionTint(
  state,
  droughtStrength,
) {
  state.material.color
    .copy(state.baseColor)
    .lerp(state.droughtColor, droughtStrength)
  const droughtUniforms = state.material.userData
    .predictionHeroDroughtUniforms
  if (droughtUniforms) {
    droughtUniforms.uHeroDrought.value = droughtStrength
  }
}
