import { useCallback, useEffect, useRef, useState } from 'react'
import {
  PRELOADER_DELAY_ENABLED,
  PRELOADER_MINIMUM_VISIBLE_MS,
} from '../config/preloader.js'
import { SCENE_TIMELINE } from '../config/sceneTimeline.js'
import { ExperienceCanvas } from '../experience/ExperienceCanvas.jsx'
import { detectWebGLSupport } from '../experience/webglSupport.js'
import { useLandingPointer } from '../hooks/useLandingPointer.js'
import { useReducedMotion } from '../hooks/useReducedMotion.js'
import { useVirtualSceneScroll } from '../hooks/useVirtualSceneScroll.js'
import { SceneOverlays } from '../story/SceneOverlays/SceneOverlays.jsx'
import { Preloader } from '../ui/Preloader/Preloader.jsx'

export function App() {
  const [webglSupported] = useState(detectWebGLSupport)
  const webglFallback = !webglSupported
  const [canvasReady, setCanvasReady] = useState(webglFallback)
  const [landingEntered, setLandingEntered] = useState(false)
  const reducedMotion = useReducedMotion()
  const overlayRootRef = useRef()
  const virtualScrollRef = useVirtualSceneScroll({
    enabled: landingEntered && !webglFallback,
    reducedMotion,
    timeline: SCENE_TIMELINE,
  })
  const { pointerRef, pointerHandlers } = useLandingPointer()
  const handleCanvasReady = useCallback(() => setCanvasReady(true), [])
  const handlePreloaderComplete = useCallback(() => setLandingEntered(true), [])

  useEffect(() => {
    document.body.classList.toggle('webgl-fallback-mode', webglFallback)
    return () => document.body.classList.remove('webgl-fallback-mode')
  }, [webglFallback])

  return (
    <main
      className={`app-shell ${webglFallback ? 'webgl-fallback-mode' : ''}`}
      {...pointerHandlers}
    >
      <ExperienceCanvas
        entered={landingEntered}
        onReady={handleCanvasReady}
        overlayRootRef={overlayRootRef}
        pointerRef={pointerRef}
        reducedMotion={reducedMotion}
        scrollRef={virtualScrollRef}
        webglSupported={webglSupported}
      />
      <SceneOverlays
        entered={landingEntered}
        fallback={webglFallback}
        overlayRootRef={overlayRootRef}
      />
      <Preloader
        minimumVisibleMs={PRELOADER_DELAY_ENABLED ? PRELOADER_MINIMUM_VISIBLE_MS : 0}
        onComplete={handlePreloaderComplete}
        ready={canvasReady}
        reducedMotion={reducedMotion}
      />
    </main>
  )
}
