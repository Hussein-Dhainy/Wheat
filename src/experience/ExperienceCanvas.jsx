import { Canvas } from '@react-three/fiber'
import { LANDING_INTRO } from '../config/landingIntro.js'
import { SceneManager } from './SceneManager.jsx'

export function ExperienceCanvas({
  entered,
  onReady,
  overlayRootRef,
  pointerRef,
  reducedMotion,
  scrollRef,
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
        dpr={[1, 1.75]}
        fallback={<div className="webgl-fallback" />}
        gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
        onCreated={onReady}
      >
        <SceneManager
          entered={entered}
          overlayRootRef={overlayRootRef}
          pointerRef={pointerRef}
          reducedMotion={reducedMotion}
          scrollRef={scrollRef}
        />
      </Canvas>
    </div>
  )
}
