import { useCallback, useEffect, useRef, useState } from 'react'
import { LANDING_INTRO } from '../../../config/landingIntro.js'
import { SCENE_VISIBILITY_ENTER_EVENT } from '../../../experience/sceneManagerState.js'
import { LANDING_TITLE } from '../../content.js'
import { TitleParticleText } from '../../components/TitleParticleText/TitleParticleText.jsx'
import styles from './LandingSection.module.css'

const TITLE_VIEWBOX_WIDTH = 1080
const TITLE_VIEWBOX_HEIGHT = 220
const TITLE_TEXT = LANDING_TITLE
const TITLE_FONT_SIZE = 127
const TITLE_BASELINE = 153
const TITLE_LETTER_SPACING = -9
const TITLE_FONT_WEIGHT = 500

export function LandingSection({ entered }) {
  const landingSection = useRef(null)
  const titleParticles = useRef(null)
  const replayFrame = useRef(0)
  const [titleIntroState, setTitleIntroState] = useState('waiting')
  const titleIntroComplete = titleIntroState === 'complete'

  useEffect(() => {
    setTitleIntroState(entered ? 'playing' : 'waiting')
  }, [entered])

  useEffect(() => {
    const sceneLayer = landingSection.current?.closest('[data-scene-layer]')
    if (!sceneLayer) return undefined

    const replayTitleIntro = () => {
      titleParticles.current?.setHoldActive(false)
      titleParticles.current?.park()
      setTitleIntroState('waiting')

      cancelAnimationFrame(replayFrame.current)
      replayFrame.current = requestAnimationFrame(() => {
        setTitleIntroState('playing')
      })
    }

    sceneLayer.addEventListener(
      SCENE_VISIBILITY_ENTER_EVENT,
      replayTitleIntro,
    )

    return () => {
      cancelAnimationFrame(replayFrame.current)
      sceneLayer.removeEventListener(
        SCENE_VISIBILITY_ENTER_EVENT,
        replayTitleIntro,
      )
    }
  }, [])

  const handleTitleIntroComplete = useCallback(() => {
    setTitleIntroState('complete')
  }, [])

  const updateLocalPointer = (event) => {
    if (!titleIntroComplete) return

    const bounds = titleParticles.current?.element?.getBoundingClientRect()
    if (!bounds) return

    const svgX = ((event.clientX - bounds.left) / bounds.width) * TITLE_VIEWBOX_WIDTH
    const svgY = ((event.clientY - bounds.top) / bounds.height) * TITLE_VIEWBOX_HEIGHT
    titleParticles.current?.applyPointerPosition(svgX, svgY)
  }

  const handlePointerDown = (event) => {
    if (!titleIntroComplete || event.button !== 0) return

    updateLocalPointer(event)
    titleParticles.current?.setHoldActive(true)
  }

  const handlePointerEnd = () => {
    if (titleIntroComplete) titleParticles.current?.setHoldActive(false)
  }

  return (
    <section
      className={`${styles.landing} ${entered ? styles.entered : ''}`}
      style={{
        '--interaction-hint-delay': `${LANDING_INTRO.interactionHintDelayMs}ms`,
        '--supporting-content-delay': `${LANDING_INTRO.supportingContentDelayMs}ms`,
        '--supporting-content-duration': `${LANDING_INTRO.supportingContentDurationMs}ms`,
        '--title-reveal-delay': `${LANDING_INTRO.titleDelayMs}ms`,
        '--title-reveal-duration': `${LANDING_INTRO.titleDurationMs}ms`,
      }}
      aria-labelledby="landing-title"
      onPointerCancel={handlePointerEnd}
      onPointerDown={handlePointerDown}
      onPointerLeave={() => {
        if (titleIntroComplete) titleParticles.current?.park()
      }}
      onPointerMove={updateLocalPointer}
      onPointerUp={handlePointerEnd}
      ref={landingSection}
    >
      <div className={styles.copy}>
        <TitleParticleText
          ref={titleParticles}
          as="h1"
          baseline={TITLE_BASELINE}
          className={styles.titleGraphicWrapper}
          effectsEnabled={titleIntroComplete}
          fontSize={TITLE_FONT_SIZE}
          fontWeight={TITLE_FONT_WEIGHT}
          headingId="landing-title"
          interactive={false}
          introState={titleIntroState}
          letterSpacing={TITLE_LETTER_SPACING}
          onIntroComplete={handleTitleIntroComplete}
          outlineColor="rgb(245 241 231 / 72%)"
          outlineHighlights
          outlineWidth={0.8}
          text={TITLE_TEXT}
          textColor="#f5f1e7"
          viewBoxHeight={TITLE_VIEWBOX_HEIGHT}
          viewBoxWidth={TITLE_VIEWBOX_WIDTH}
        />

        <p className={styles.body}>
          From grain to field, discover how science shapes the future of wheat.
        </p>
      </div>

      <p id="landing-interaction-hint" className={styles.hint}>
        <span className={styles.hintLine} aria-hidden="true" />
        Move to explore
      </p>
    </section>
  )
}
