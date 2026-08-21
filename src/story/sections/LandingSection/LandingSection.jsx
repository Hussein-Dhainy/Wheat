import { useRef } from 'react'
import { LANDING_INTRO } from '../../../config/landingIntro.js'
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
  const titleParticles = useRef(null)

  const updateLocalPointer = (event) => {
    const bounds = titleParticles.current?.element?.getBoundingClientRect()
    if (!bounds) return

    const svgX = ((event.clientX - bounds.left) / bounds.width) * TITLE_VIEWBOX_WIDTH
    const svgY = ((event.clientY - bounds.top) / bounds.height) * TITLE_VIEWBOX_HEIGHT
    titleParticles.current?.applyPointerPosition(svgX, svgY)
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
      onPointerMove={updateLocalPointer}
      onPointerDown={updateLocalPointer}
      onPointerLeave={() => titleParticles.current?.park()}
    >
      <div className={styles.copy}>
        <TitleParticleText
          ref={titleParticles}
          as="h1"
          baseline={TITLE_BASELINE}
          className={styles.titleGraphicWrapper}
          fontSize={TITLE_FONT_SIZE}
          fontWeight={TITLE_FONT_WEIGHT}
          headingId="landing-title"
          interactive={false}
          letterSpacing={TITLE_LETTER_SPACING}
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
