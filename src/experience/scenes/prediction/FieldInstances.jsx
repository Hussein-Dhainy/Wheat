import { InstancedFieldPart } from './InstancedFieldPart.jsx'

export function FieldInstances({
  asset,
  layouts,
  reducedMotion,
  weatherRef,
}) {
  return asset.parts.map((part) => (
    <InstancedFieldPart
      key={part.name}
      droughtMorphTargets={part.droughtMorphTargets}
      geometry={part.geometry}
      layouts={layouts}
      localMatrix={part.localMatrix}
      material={part.material}
      motionMode={asset.motionMode}
      morphTargetCount={part.morphTargetCount}
      name={part.name}
      reducedMotion={reducedMotion}
      weatherUniforms={part.weatherUniforms}
      weatherRef={weatherRef}
    />
  ))
}
