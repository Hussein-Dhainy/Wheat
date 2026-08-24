import { useCallback, useEffect, useRef, useState } from 'react'
import { LANDING_INTRO } from '../../config/landingIntro.js'
import { SCENE_VISIBILITY_ENTER_EVENT } from '../../experience/sceneManagerState.js'
import { TitleParticleText } from '../components/TitleParticleText/TitleParticleText.jsx'
import styles from './SceneOverlays.module.css'
import {
  BOLD_TITLE_FONT_SIZE,
  BOLD_TITLE_FONT_WEIGHT,
  BOLD_TITLE_LETTER_SPACING,
  BOLD_TITLE_LINE_HEIGHT,
  FIELD_TITLE_BOX,
  FIELD_TITLE_LINE_TEXTS,
} from './sceneTitleBox.js'

export function FieldIntro({ description, fallback, title, titleId }) {
  const copyRef = useRef(null)
  const replayFrame = useRef(0)
  const titleParticles = useRef(null)
  const [titleIntroState, setTitleIntroState] = useState(
    fallback ? 'playing' : 'waiting',
  )
  const titleIntroComplete = titleIntroState === 'complete'

  const handleTitleIntroComplete = useCallback(() => {
    setTitleIntroState('complete')
  }, [])

  useEffect(() => {
    const sceneLayer = copyRef.current?.closest('[data-scene-layer]')
    if (!sceneLayer || fallback) return undefined

    const replayTitleIntro = () => {
      titleParticles.current?.setHoldActive(false)
      titleParticles.current?.park()
      setTitleIntroState('waiting')

      cancelAnimationFrame(replayFrame.current)
      replayFrame.current = requestAnimationFrame(() => {
        setTitleIntroState('playing')
      })
    }

    sceneLayer.addEventListener(SCENE_VISIBILITY_ENTER_EVENT, replayTitleIntro)

    return () => {
      cancelAnimationFrame(replayFrame.current)
      sceneLayer.removeEventListener(SCENE_VISIBILITY_ENTER_EVENT, replayTitleIntro)
    }
  }, [fallback])

  return (
    <div
      className={styles.copy}
      data-field-intro-state={titleIntroState}
      ref={copyRef}
    >
      <TitleParticleText
        ref={titleParticles}
        as="h2"
        baseline={FIELD_TITLE_BOX.baseline}
        className={styles.fieldTitleLines}
        effectsEnabled={titleIntroComplete}
        fontSize={BOLD_TITLE_FONT_SIZE}
        fontWeight={BOLD_TITLE_FONT_WEIGHT}
        headingId={titleId}
        introState={titleIntroState}
        letterSpacing={BOLD_TITLE_LETTER_SPACING}
        lineHeight={BOLD_TITLE_LINE_HEIGHT}
        lines={FIELD_TITLE_LINE_TEXTS}
        onIntroComplete={handleTitleIntroComplete}
        outlineColor="rgb(245 241 231 / 72%)"
        outlineHighlights
        outlineWidth={0.8}
        seed={8423}
        style={{
          '--title-reveal-delay': `${LANDING_INTRO.titleDelayMs}ms`,
          '--title-reveal-duration': `${LANDING_INTRO.titleDurationMs}ms`,
        }}
        text={title}
        textAlign="left"
        textColor="#f5f1e7"
        viewBoxHeight={FIELD_TITLE_BOX.viewBoxHeight}
        viewBoxWidth={FIELD_TITLE_BOX.viewBoxWidth}
      />
      <p className={styles.fieldSubtitle}>
        <span>{description}</span>
      </p>
    </div>
  )
}
