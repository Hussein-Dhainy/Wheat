import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo } from 'react'
import { FieldLayer } from './FieldLayer.jsx'
import { createFieldAssets, createFieldLayouts } from './fieldGeometry.js'
import { PREDICTION_RENDER_CONFIG as CONFIG } from './predictionConfig.js'

const FIELD = CONFIG.field

export function PredictionField({
  background,
  sceneStateRef,
  sourceScene,
  weatherRef,
}) {
  const layouts = useMemo(createFieldLayouts, [])
  const assets = useMemo(
    () => createFieldAssets(sourceScene),
    [sourceScene],
  )

  useFrame(() => {
    const disease = weatherRef?.current?.disease ?? 0
    assets.forEach(({ baseColor, diseaseColor, material }) => {
      material.color
        .copy(baseColor)
        .lerp(diseaseColor, disease)
    })
  })

  useLayoutEffect(() => () => {
    assets.forEach((asset) => asset.material.dispose())
  }, [assets])

  return FIELD.layers.map((layer, layerIndex) => (
    <FieldLayer
      key={layer.id}
      assets={assets}
      background={background}
      layer={layer}
      layouts={layouts[layerIndex]}
      renderOrder={layerIndex - FIELD.layers.length}
      sceneStateRef={sceneStateRef}
      weatherRef={weatherRef}
    />
  ))
}
