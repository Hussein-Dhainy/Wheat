import { MathUtils } from 'three'

export function createPredictionShadowDescriptors(fieldLayouts, config) {
  const descriptors = fieldLayouts.flatMap((layouts) => layouts.map((layout) => ({
    isHero: false,
    phase: layout.phase,
    position: layout.position,
    scale: layout.scale.x,
  })))

  descriptors.push({
    isHero: true,
    phase: 0,
    position: { x: 0, y: 0, z: 0 },
    scale: config.heroScale,
  })
  return descriptors
}

export function getPredictionShadowOpacity(weather, config) {
  const drought = weather?.drought ?? 0
  const storm = weather?.strength ?? 0
  const disease = weather?.disease ?? 0
  const sunlightOpacity = MathUtils.lerp(
    config.baseOpacity,
    config.droughtOpacity,
    drought,
  )

  return sunlightOpacity
    * MathUtils.lerp(1, config.stormOpacityScale, storm)
    * MathUtils.lerp(1, config.diseaseOpacityScale, disease)
}
