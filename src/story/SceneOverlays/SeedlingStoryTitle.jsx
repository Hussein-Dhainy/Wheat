import { useCallback, useEffect, useRef, useState } from 'react'
import { GENETICS_GROWTH_TIMING } from '../../config/geneticsSeeds.js'
import { LANDING_INTRO } from '../../config/landingIntro.js'
import {
  SEEDLING_GROWTH_ENTER_EVENT,
  SEEDLING_GROWTH_EXIT_EVENT,
} from '../../experience/sceneManagerState.js'
import { TitleParticleText } from '../components/TitleParticleText/TitleParticleText.jsx'
import {
  BOLD_TITLE_FONT_SIZE,
  BOLD_TITLE_FONT_WEIGHT,
  BOLD_TITLE_LETTER_SPACING,
  BOLD_TITLE_LINE_HEIGHT,
  computeBoldTitleBox,
} from './sceneTitleBox.js'
import styles from './SceneOverlays.module.css'

const TITLE_LINES = ['STRONG IDEAS', 'TAKE ROOT.']
const TITLE_BOX = computeBoldTitleBox(TITLE_LINES)
const ENTRY_DELAY_MS = 90
const EXIT_RESET_BUFFER_MS = 40

export function SeedlingStoryTitle({ fallback }) {
  const wrapperReference = useRef(null)
  const titleParticles = useRef(null)
  const replayFrame = useRef(0)
  const replayTimer = useRef(0)
  const resetTimer = useRef(0)
  const active = useRef(fallback)
  const [introState, setIntroState] = useState(
    fallback ? 'complete' : 'waiting',
  )

  const resetIntro = useCallback(() => {
    active.current = false
    cancelAnimationFrame(replayFrame.current)
    window.clearTimeout(replayTimer.current)
    window.clearTimeout(resetTimer.current)
    titleParticles.current?.setHoldActive(false)
    titleParticles.current?.park()

    resetTimer.current = window.setTimeout(() => {
      if (!active.current) setIntroState('waiting')
    }, GENETICS_GROWTH_TIMING.titleFadeDurationMs + EXIT_RESET_BUFFER_MS)
  }, [])

  const replayIntro = useCallback(() => {
    active.current = true
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
        if (active.current) setIntroState('playing')
      })
    }, ENTRY_DELAY_MS)
  }, [])

  useEffect(() => {
    const sceneLayer = wrapperReference.current?.closest('[data-scene-layer]')
    if (!sceneLayer || fallback) return undefined

    sceneLayer.addEventListener(SEEDLING_GROWTH_ENTER_EVENT, replayIntro)
    sceneLayer.addEventListener(SEEDLING_GROWTH_EXIT_EVENT, resetIntro)
    if (sceneLayer.dataset.seedlingGrowthActive === 'true') replayIntro()

    return () => {
      active.current = false
      cancelAnimationFrame(replayFrame.current)
      window.clearTimeout(replayTimer.current)
      window.clearTimeout(resetTimer.current)
      sceneLayer.removeEventListener(SEEDLING_GROWTH_ENTER_EVENT, replayIntro)
      sceneLayer.removeEventListener(SEEDLING_GROWTH_EXIT_EVENT, resetIntro)
    }
  }, [fallback, replayIntro, resetIntro])

  return (
    <div
      ref={wrapperReference}
      className={styles.seedlingStory}
      data-intro-state={introState}
      aria-hidden={!fallback && introState === 'waiting'}
      style={{
        '--seedling-title-fade-duration': `${GENETICS_GROWTH_TIMING.titleFadeDurationMs}ms`,
      }}
    >
      <div className={styles.seedlingStoryCopy}>
        <p className={styles.geneticsEyebrow}>Breeder refinement</p>
        <TitleParticleText
          ref={titleParticles}
          as="h2"
          baseline={TITLE_BOX.baseline}
          className={styles.seedlingStoryTitle}
          effectsEnabled={introState === 'complete'}
          fontSize={BOLD_TITLE_FONT_SIZE}
          fontWeight={BOLD_TITLE_FONT_WEIGHT}
          headingId="genetics-seedling-title"
          introState={introState}
          letterSpacing={BOLD_TITLE_LETTER_SPACING}
          lineHeight={BOLD_TITLE_LINE_HEIGHT}
          lines={TITLE_LINES}
          onIntroComplete={() => {
            if (active.current) setIntroState('complete')
          }}
          outlineColor="rgb(255 255 255 / 72%)"
          outlineHighlights
          outlineWidth={0.8}
          seed={7463}
          style={{
            '--title-reveal-delay': `${LANDING_INTRO.titleDelayMs}ms`,
            '--title-reveal-duration': `${LANDING_INTRO.titleDurationMs}ms`,
          }}
          text="Strong ideas take root."
          textAlign="left"
          textColor="#fff"
          viewBoxHeight={TITLE_BOX.viewBoxHeight}
          viewBoxWidth={TITLE_BOX.viewBoxWidth}
        />
        <p className={styles.seedlingStoryBody}>
          <span>
            Controlled selection helps breeders focus on promising wheat
            lines. Early root and shoot development reveal which plants are
            ready for field testing.
          </span>
        </p>
      </div>
    </div>
  )
}

