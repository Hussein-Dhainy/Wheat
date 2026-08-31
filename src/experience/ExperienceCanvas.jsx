import { Canvas } from '@react-three/fiber'
import { LANDING_INTRO } from '../config/landingIntro.js'
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
  reducedMotion,
  resultInspectionOpen,
  resultInteractionRef,
  scrollRef,
  selectedGeneticsSeed,
  selectedPredictionCondition,
  selectedResultView,
  webglSupported,
}) {
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
        dpr={[1, 1.5]}
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
          reducedMotion={reducedMotion}
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
