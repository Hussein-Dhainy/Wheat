import { createPortal } from '@react-three/fiber'

export function PortalScene({
  camera,
  entry,
  entered,
  geneticsDetailOpen,
  onSelectGeneticsSeed,
  onSceneWarmupComplete,
  pointerRef,
  predictionTestsOpen,
  qualityTier,
  reducedMotion,
  resultInspectionOpen,
  resultInteractionRef,
  scene,
  sceneStateRef,
  selectedGeneticsSeed,
  selectedPredictionCondition,
  selectedResultView,
}) {
  const SceneComponent = entry.component

  return createPortal(
    <SceneComponent
      {...entry.sceneProps}
      entered={entered}
      geneticsDetailOpen={geneticsDetailOpen}
      onSelectGeneticsSeed={onSelectGeneticsSeed}
      onSceneWarmupComplete={onSceneWarmupComplete}
      pointerRef={pointerRef}
      predictionTestsOpen={predictionTestsOpen}
      quality={qualityTier}
      reducedMotion={reducedMotion}
      resultInspectionOpen={resultInspectionOpen}
      resultInteractionRef={resultInteractionRef}
      sceneStateRef={sceneStateRef}
      selectedGeneticsSeed={selectedGeneticsSeed}
      selectedPredictionCondition={selectedPredictionCondition}
      selectedResultView={selectedResultView}
    />,
    scene,
    {
      camera,
      events: { enabled: entry.id === 'genetics' },
    },
  )
}
