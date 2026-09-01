import { Canvas } from '@react-three/fiber'
import { LANDING_INTRO } from '../config/landingIntro.js'
import { getQualityProfile } from './qualityTier.js'
import { SceneManager } from './SceneManager.jsx'

export function ExperienceCanvas({
  entered,
  geneticsDetailOpen,
  onReady,
  onSelectGeneticsSeed,
  onWarmupComplete,
  overlayRootRef,
  pointerRef,
  predictionTestsOpen,
  qualityTier,
  reducedMotion,
  reportPerformanceSample,
  resultInspectionOpen,
  resultInteractionRef,
  scrollRef,
  selectedGeneticsSeed,
  selectedPredictionCondition,
  selectedResultView,
  webglSupported,
}) {
  const qualityProfile = getQualityProfile(qualityTier)

  if (!webglSupported) {
    return (
      <div className="experience-canvas" aria-hidden="true">
        <div className="webgl-fallback" />
      </div>
    )
  }

  return (
    <div className="experience-canvas" aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0, LANDING_INTRO.cameraInitialRadius], fov: 42 }}
        dpr={qualityProfile.canvasDpr}
        fallback={<div className="webgl-fallback" />}
        gl={{ alpha: true, antialias: false, powerPreference: 'high-performance' }}
        onCreated={onReady}
      >
        <SceneManager
          entered={entered}
          geneticsDetailOpen={geneticsDetailOpen}
          onSelectGeneticsSeed={onSelectGeneticsSeed}
          onWarmupComplete={onWarmupComplete}
          overlayRootRef={overlayRootRef}
          pointerRef={pointerRef}
          predictionTestsOpen={predictionTestsOpen}
          qualityTier={qualityTier}
          reducedMotion={reducedMotion}
          reportPerformanceSample={reportPerformanceSample}
          resultInspectionOpen={resultInspectionOpen}
          resultInteractionRef={resultInteractionRef}
          scrollRef={scrollRef}
          selectedGeneticsSeed={selectedGeneticsSeed}
          selectedPredictionCondition={selectedPredictionCondition}
          selectedResultView={selectedResultView}
        />
      </Canvas>
    </div>
  )
}
