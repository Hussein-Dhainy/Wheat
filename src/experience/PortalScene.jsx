import { createPortal } from '@react-three/fiber'

export function PortalScene({
  camera,
  entry,
  entered,
  geneticsDetailOpen,
  onSceneWarmupComplete,
  pointerRef,
  predictionTestsOpen,
  qualityTier,
  reducedMotion,
  resultInspectionOpen,
  resultInteractionRef,
  scene,
  sceneStateRef,
  selectedPredictionCondition,
  selectedResultView,
}) {
  const SceneComponent = entry.component

  return createPortal(
    <SceneComponent
      {...entry.sceneProps}
      entered={entered}
      geneticsDetailOpen={geneticsDetailOpen}
      onSceneWarmupComplete={onSceneWarmupComplete}
      pointerRef={pointerRef}
      predictionTestsOpen={predictionTestsOpen}
      quality={qualityTier}
      reducedMotion={reducedMotion}
      resultInspectionOpen={resultInspectionOpen}
      resultInteractionRef={resultInteractionRef}
      sceneStateRef={sceneStateRef}
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
