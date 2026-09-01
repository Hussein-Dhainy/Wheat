import { useCallback, useEffect, useRef, useState } from 'react'
import { GENETICS_BRIDGE_TIMING } from '../../config/geneticsSeeds.js'
import { LANDING_INTRO } from '../../config/landingIntro.js'
import {
  GENETICS_BRIDGE_ENTER_EVENT,
  GENETICS_BRIDGE_EXIT_EVENT,
} from '../../experience/sceneManagerState.js'
import { TitleParticleText } from '../components/TitleParticleText/TitleParticleText.jsx'
import styles from './SceneOverlays.module.css'
import {
  BOLD_TITLE_FONT_SIZE,
  BOLD_TITLE_FONT_WEIGHT,
  BOLD_TITLE_LETTER_SPACING,
  BOLD_TITLE_LINE_HEIGHT,
  computeBoldTitleBox,
} from './sceneTitleBox.js'

const TITLE_LINES = ['COMPUTERS', 'NARROW THE', 'CANDIDATES.']
const TITLE_BOX = computeBoldTitleBox(TITLE_LINES)
const ENTRY_DELAY_MS = 90
const EXIT_RESET_BUFFER_MS = 40

export function GeneticsBridgeTitle({ fallback }) {
  const bridgeRef = useRef(null)
  const titleParticles = useRef(null)
  const replayFrame = useRef(0)
  const replayTimer = useRef(0)
  const resetTimer = useRef(0)
  const bridgeIsActive = useRef(fallback)
  const [introState, setIntroState] = useState(
    fallback ? 'complete' : 'waiting',
  )

  const resetIntro = useCallback(() => {
    bridgeIsActive.current = false
    cancelAnimationFrame(replayFrame.current)
    window.clearTimeout(replayTimer.current)
    window.clearTimeout(resetTimer.current)
    titleParticles.current?.setHoldActive(false)
    titleParticles.current?.park()

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setIntroState('waiting')
      return
    }

    // Keep the completed glyphs rendered while the wrapper fades. Resetting
    // the particle intro on this same frame would make the title disappear
    // before the opacity transition has anything left to animate.
    resetTimer.current = window.setTimeout(() => {
      if (!bridgeIsActive.current) setIntroState('waiting')
    }, GENETICS_BRIDGE_TIMING.fadeDurationMs + EXIT_RESET_BUFFER_MS)
  }, [])

  const replayIntro = useCallback(() => {
    bridgeIsActive.current = true
    cancelAnimationFrame(replayFrame.current)
    window.clearTimeout(replayTimer.current)
    window.clearTimeout(resetTimer.current)
    titleParticles.current?.setHoldActive(false)
    titleParticles.current?.park()
    setIntroState('waiting')

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setIntroState('complete')
      return
    }

    replayTimer.current = window.setTimeout(() => {
      replayFrame.current = requestAnimationFrame(() => {
        if (bridgeIsActive.current) setIntroState('playing')
      })
    }, ENTRY_DELAY_MS)
  }, [])

  useEffect(() => {
    const sceneLayer = bridgeRef.current?.closest('[data-scene-layer]')
    if (!sceneLayer || fallback) return undefined

    sceneLayer.addEventListener(GENETICS_BRIDGE_ENTER_EVENT, replayIntro)
    sceneLayer.addEventListener(GENETICS_BRIDGE_EXIT_EVENT, resetIntro)

    if (sceneLayer.dataset.geneticsBridgeActive === 'true') replayIntro()

    return () => {
      bridgeIsActive.current = false
      cancelAnimationFrame(replayFrame.current)
      window.clearTimeout(replayTimer.current)
      window.clearTimeout(resetTimer.current)
      sceneLayer.removeEventListener(GENETICS_BRIDGE_ENTER_EVENT, replayIntro)
      sceneLayer.removeEventListener(GENETICS_BRIDGE_EXIT_EVENT, resetIntro)
    }
  }, [fallback, replayIntro, resetIntro])

  return (
    <div
      className={styles.geneticsBridge}
      data-intro-state={introState}
      aria-hidden={!fallback && introState === 'waiting'}
      ref={bridgeRef}
      style={{
        '--genetics-bridge-fade-duration': `${GENETICS_BRIDGE_TIMING.fadeDurationMs}ms`,
      }}
    >
      <div className={styles.geneticsBridgeCopy}>
        <TitleParticleText
          ref={titleParticles}
          as="h2"
          baseline={TITLE_BOX.baseline}
          className={styles.geneticsBridgeTitle}
          effectsEnabled={introState === 'complete'}
          fontSize={BOLD_TITLE_FONT_SIZE}
          fontWeight={BOLD_TITLE_FONT_WEIGHT}
          headingId="genetics-bridge-title"
          introState={introState}
          letterSpacing={BOLD_TITLE_LETTER_SPACING}
          lineHeight={BOLD_TITLE_LINE_HEIGHT}
          lines={TITLE_LINES}
          onIntroComplete={() => {
            if (bridgeIsActive.current) setIntroState('complete')
          }}
          outlineColor="rgb(255 255 255 / 72%)"
          outlineHighlights
          outlineWidth={0.8}
          seed={6673}
          style={{
            '--title-reveal-delay': `${LANDING_INTRO.titleDelayMs}ms`,
            '--title-reveal-duration': `${LANDING_INTRO.titleDurationMs}ms`,
          }}
          text="Computers narrow the candidates."
          textAlign="left"
          textColor="#fff"
          viewBoxHeight={TITLE_BOX.viewBoxHeight}
          viewBoxWidth={TITLE_BOX.viewBoxWidth}
        />

        <p className={styles.geneticsBridgeBody}>
          <span>
            Digital evaluation compares more possibilities than can be tested
            in the field, bringing the strongest candidates forward.
          </span>
        </p>
      </div>
    </div>
  )
}
