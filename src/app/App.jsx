import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ASSET_LOAD_TIMEOUT_MS,
  PRELOADER_DELAY_ENABLED,
  PRELOADER_INTRO_MINIMUM_MS,
  PRELOADER_MINIMUM_VISIBLE_MS,
} from '../config/preloader.js'
import { SCENE_TIMELINE } from '../config/sceneTimeline.js'
import { DEFAULT_GENETICS_SEED_ID } from '../config/geneticsSeeds.js'
import {
  DEFAULT_PREDICTION_CONDITION_ID,
  PREDICTION_TEST_AUTO_SELECT_DELAY_MS,
} from '../config/predictionContent.js'
import { ExperienceCanvas } from '../experience/ExperienceCanvas.jsx'
import { getNearestSceneStartPosition } from '../experience/sceneTimeline.js'
import { jumpVirtualScrollToPosition } from '../experience/virtualScroll.js'
import { detectWebGLSupport } from '../experience/webglSupport.js'
import { useAssetLoadingProgress } from '../hooks/useAssetLoadingProgress.js'
import { useLandingPointer } from '../hooks/useLandingPointer.js'
import { useQualityTier } from '../hooks/useQualityTier.js'
import { useReducedMotion } from '../hooks/useReducedMotion.js'
import { useVirtualSceneScroll } from '../hooks/useVirtualSceneScroll.js'
import { SceneOverlays } from '../story/SceneOverlays/SceneOverlays.jsx'
import { MenuOverlay } from '../ui/Menu/MenuOverlay.jsx'
import { Navbar } from '../ui/Navbar/Navbar.jsx'
import { Preloader } from '../ui/Preloader/Preloader.jsx'

export function App() {
  const [webglSupported] = useState(detectWebGLSupport)
  const webglFallback = !webglSupported
  const [canvasCreated, setCanvasCreated] = useState(webglFallback)
  const [assetLoadTimedOut, setAssetLoadTimedOut] = useState(false)
  const [warmupComplete, setWarmupComplete] = useState(webglFallback)
  const [warmupTimedOut, setWarmupTimedOut] = useState(false)
  const { progress: assetProgress, done: assetsLoaded } = useAssetLoadingProgress()
  const canvasReady = webglFallback
    || (canvasCreated
      && (assetsLoaded || assetLoadTimedOut)
      && (warmupComplete || warmupTimedOut))
  const [landingEntered, setLandingEntered] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [selectedGeneticsSeed, setSelectedGeneticsSeed] = useState(
    DEFAULT_GENETICS_SEED_ID,
  )
  const [geneticsDetailOpen, setGeneticsDetailOpen] = useState(false)
  const [predictionTestsOpen, setPredictionTestsOpen] = useState(false)
  const [selectedPredictionCondition, setSelectedPredictionCondition] = useState(
    DEFAULT_PREDICTION_CONDITION_ID,
  )
  const [resultInspectionOpen, setResultInspectionOpen] = useState(false)
  const [
    selectedResultClosingAction,
    setSelectedResultClosingAction,
  ] = useState(null)
  const [selectedResultView, setSelectedResultView] = useState(0)
  const resultInteractionRef = useRef({
    dragging: false,
    pointerStartX: 0,
    rotationCurrent: 0,
    rotationStart: 0,
    rotationTarget: 0,
    rotationTransitionId: 0,
  })
  const reducedMotion = useReducedMotion()
  const { qualityTier, reportPerformanceSample } = useQualityTier()
  const overlayRootRef = useRef()
  const virtualScrollRef = useVirtualSceneScroll({
    enabled: landingEntered
      && !webglFallback
      && !geneticsDetailOpen
      && !resultInspectionOpen
      && !menuOpen
      && selectedResultClosingAction === null,
    reducedMotion,
    timeline: SCENE_TIMELINE,
  })
  const { pointerRef, pointerHandlers } = useLandingPointer()
  const handleCanvasReady = useCallback(() => setCanvasCreated(true), [])
  const handleWarmupComplete = useCallback(() => setWarmupComplete(true), [])
  const handlePreloaderComplete = useCallback(() => setLandingEntered(true), [])
  const handleToggleMenu = useCallback(() => setMenuOpen((open) => !open), [])
  const handleCloseMenu = useCallback(() => setMenuOpen(false), [])
  const handleNavigateToScene = useCallback((sceneId) => {
    setMenuOpen(false)
    setGeneticsDetailOpen(false)
    jumpVirtualScrollToPosition(
      virtualScrollRef.current,
      getNearestSceneStartPosition(
        SCENE_TIMELINE,
        sceneId,
        virtualScrollRef.current.current,
      ),
    )
  }, [virtualScrollRef])
  useEffect(() => {
    document.body.classList.toggle('webgl-fallback-mode', webglFallback)
    return () => document.body.classList.remove('webgl-fallback-mode')
  }, [webglFallback])

  useEffect(() => {
    if (webglFallback || assetsLoaded) return undefined

    const timeoutId = window.setTimeout(() => {
      setAssetLoadTimedOut(true)
    }, ASSET_LOAD_TIMEOUT_MS)

    return () => window.clearTimeout(timeoutId)
  }, [assetsLoaded, webglFallback])

  // Fail-safe: onWarmupComplete should always fire once SceneManager mounts,
  // but if the canvas falls back to its own error state after passing our
  // WebGL support check, it never would — don't trap the user behind the
  // preloader forever waiting on it.
  useEffect(() => {
    if (webglFallback || warmupComplete) return undefined

    const timeoutId = window.setTimeout(() => {
      setWarmupTimedOut(true)
    }, ASSET_LOAD_TIMEOUT_MS)

    return () => window.clearTimeout(timeoutId)
  }, [warmupComplete, webglFallback])

  useEffect(() => {
    if (!predictionTestsOpen || selectedPredictionCondition !== null) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => {
      setSelectedPredictionCondition(DEFAULT_PREDICTION_CONDITION_ID)
    }, PREDICTION_TEST_AUTO_SELECT_DELAY_MS)

    return () => window.clearTimeout(timeoutId)
  }, [predictionTestsOpen, selectedPredictionCondition])

  return (
    <main
      className={`app-shell ${webglFallback ? 'webgl-fallback-mode' : ''}`}
      data-quality-tier={qualityTier}
      {...pointerHandlers}
    >
      <div className={`scene-layer ${menuOpen ? 'menu-open' : ''}`}>
        <ExperienceCanvas
          entered={landingEntered}
          geneticsDetailOpen={geneticsDetailOpen}
          onReady={handleCanvasReady}
          onSelectGeneticsSeed={setSelectedGeneticsSeed}
          onWarmupComplete={handleWarmupComplete}
          overlayRootRef={overlayRootRef}
          pointerRef={pointerRef}
          qualityTier={qualityTier}
          reducedMotion={reducedMotion}
          reportPerformanceSample={reportPerformanceSample}
          scrollRef={virtualScrollRef}
          selectedGeneticsSeed={selectedGeneticsSeed}
          predictionTestsOpen={predictionTestsOpen}
          resultInspectionOpen={resultInspectionOpen}
          resultInteractionRef={resultInteractionRef}
          selectedPredictionCondition={selectedPredictionCondition}
          selectedResultView={selectedResultView}
          webglSupported={webglSupported}
        />
        <SceneOverlays
          entered={landingEntered}
          fallback={webglFallback}
          geneticsDetailOpen={geneticsDetailOpen}
          overlayRootRef={overlayRootRef}
          predictionTestsOpen={predictionTestsOpen}
          resultInspectionOpen={resultInspectionOpen}
          resultInteractionRef={resultInteractionRef}
          selectedGeneticsSeed={selectedGeneticsSeed}
          selectedPredictionCondition={selectedPredictionCondition}
          selectedResultClosingAction={selectedResultClosingAction}
          selectedResultView={selectedResultView}
          setResultInspectionOpen={setResultInspectionOpen}
          setSelectedResultClosingAction={setSelectedResultClosingAction}
          setSelectedResultView={setSelectedResultView}
          setPredictionTestsOpen={setPredictionTestsOpen}
          setGeneticsDetailOpen={setGeneticsDetailOpen}
          setSelectedGeneticsSeed={setSelectedGeneticsSeed}
          setSelectedPredictionCondition={setSelectedPredictionCondition}
        />
      </div>
      <Navbar
        menuOpen={menuOpen}
        onToggleMenu={handleToggleMenu}
        reducedMotion={reducedMotion}
        visible={landingEntered}
      />
      <MenuOverlay
        onClose={handleCloseMenu}
        onNavigate={handleNavigateToScene}
        open={menuOpen}
        reducedMotion={reducedMotion}
      />
      <Preloader
        minimumVisibleMs={PRELOADER_DELAY_ENABLED
          ? (reducedMotion ? PRELOADER_MINIMUM_VISIBLE_MS : PRELOADER_INTRO_MINIMUM_MS)
          : 0}
        onComplete={handlePreloaderComplete}
        progress={assetProgress}
        ready={canvasReady}
        reducedMotion={reducedMotion}
      />
    </main>
  )
}
