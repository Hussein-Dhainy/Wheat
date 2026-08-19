import { PREDICTION_RENDER_CONFIG as CONFIG } from './predictionConfig.js'
import { InstancedFieldPart } from './InstancedFieldPart.jsx'

const FIELD = CONFIG.field

export function FieldInstances({ assets, layouts, weatherRef }) {
  return assets.map((asset, variantIndex) => (
    <group key={FIELD.variantNames[variantIndex]}>
      {asset.parts.map((part) => (
        <InstancedFieldPart
          key={part.name}
          geometry={part.geometry}
          layouts={layouts[variantIndex]}
          localMatrix={part.localMatrix}
          material={asset.material}
          name={part.name}
          weatherRef={weatherRef}
        />
      ))}
    </group>
  ))
}
