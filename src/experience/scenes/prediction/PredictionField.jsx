import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo } from 'react'
import { FieldInstances } from './FieldInstances.jsx'
import {
  createFieldAsset,
  createNearFieldAsset,
} from './fieldAssets.js'
import { PREDICTION_RENDER_CONFIG as CONFIG } from './predictionConfig.js'

const FIELD = CONFIG.field

export function PredictionField({
  farSourceScene,
  layouts,
  nearSourceScene,
  reducedMotion,
  weatherRef,
}) {
  const assets = useMemo(() => ({
    far: createFieldAsset(farSourceScene),
    near: createNearFieldAsset(nearSourceScene),
  }), [farSourceScene, nearSourceScene])

  useFrame(() => {
    const weather = weatherRef?.current
    if (!weather?.active) return

    const drought = weather.drought ?? 0
    const disease = weather.disease ?? 0
    const soil = weather.soil ?? 0
    Object.values(assets).forEach((asset) => {
      asset.parts.forEach((part) => {
        part.material.color
          .copy(part.baseColor)
          .lerp(part.droughtColor, drought)
          .lerp(part.diseaseColor, disease)
          .lerp(part.soilColor, soil * 0.24)
      })
    })
  })

  useLayoutEffect(() => () => {
    Object.values(assets).forEach((asset) => {
      asset.parts.forEach((part) => part.material.dispose())
    })
  }, [assets])

  return FIELD.layers.map((layer, layerIndex) => (
    <FieldInstances
      key={layer.id}
      asset={assets[layer.assetId]}
      layouts={layouts[layerIndex]}
      reducedMotion={reducedMotion}
      weatherRef={weatherRef}
    />
  ))
}
