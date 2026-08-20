import { useEffect, useRef } from 'react'
import { PREDICTION_CONTENT } from '../../config/predictionContent.js'
import { TitleParticleText } from '../components/TitleParticleText/TitleParticleText.jsx'
import styles from './SceneOverlays.module.css'
import {
  BOLD_TITLE_FONT_SIZE,
  BOLD_TITLE_FONT_WEIGHT,
  BOLD_TITLE_LETTER_SPACING,
  BOLD_TITLE_LINE_HEIGHT,
  PREDICTION_TITLE_BOX,
  PREDICTION_TITLE_LINE_TEXTS,
} from './sceneTitleBox.js'

export function PredictionIntro({
  predictionTestsOpen,
  selectedPredictionCondition,
  setPredictionTestsOpen,
  setSelectedPredictionCondition,
}) {
  const introButtonRef = useRef(null)
  const exitButtonRef = useRef(null)
  const selectedCondition = PREDICTION_CONTENT.conditions.find(
    (condition) => condition.id === selectedPredictionCondition,
  ) ?? null

  const openTests = () => {
    // Every visit begins with a neutral field. App owns the five-second
    // fallback timer and cancels it as soon as a condition is selected.
    setSelectedPredictionCondition(null)
    setPredictionTestsOpen(true)
    requestAnimationFrame(() => exitButtonRef.current?.focus())
  }

  const closeTests = () => {
    setPredictionTestsOpen(false)
    requestAnimationFrame(() => introButtonRef.current?.focus())
  }

  useEffect(() => {
    if (!predictionTestsOpen) return undefined

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') closeTests()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [predictionTestsOpen])

  return (
    <div
      className={styles.predictionExperience}
      data-tests-open={predictionTestsOpen ? 'true' : 'false'}
    >
      <div
        className={styles.predictionIntro}
        aria-hidden={predictionTestsOpen}
        inert={predictionTestsOpen}
      >
        <div className={styles.predictionCopy}>
          <TitleParticleText
            as="h2"
            baseline={PREDICTION_TITLE_BOX.baseline}
            className={styles.predictionTitleLines}
            fontSize={BOLD_TITLE_FONT_SIZE}
            fontWeight={BOLD_TITLE_FONT_WEIGHT}
            headingId="prediction-title"
            letterSpacing={BOLD_TITLE_LETTER_SPACING}
            lineHeight={BOLD_TITLE_LINE_HEIGHT}
            lines={PREDICTION_TITLE_LINE_TEXTS}
            text={PREDICTION_CONTENT.title}
            textAlign="left"
            textColor="#fff"
            viewBoxHeight={PREDICTION_TITLE_BOX.viewBoxHeight}
            viewBoxWidth={PREDICTION_TITLE_BOX.viewBoxWidth}
          />
          <p>{PREDICTION_CONTENT.body}</p>
        </div>

        <div className={styles.testActionOrbit}>
          <button
            ref={introButtonRef}
            className={styles.testAction}
            type="button"
            onClick={openTests}
          >
            <span>{PREDICTION_CONTENT.actionLabel}</span>
          </button>
        </div>
      </div>

      <div
        className={styles.predictionTests}
        aria-hidden={!predictionTestsOpen}
        inert={!predictionTestsOpen}
      >
        <button
          ref={exitButtonRef}
          className={styles.testsExit}
          type="button"
          aria-label="Exit field tests"
          onClick={closeTests}
        >
          <span aria-hidden="true" />
        </button>

        <div className={styles.conditionPanel}>
          <div
            key={selectedCondition?.id ?? 'condition-selection'}
            className={styles.conditionCopy}
            aria-live="polite"
          >
            <p>{PREDICTION_CONTENT.conditionPrompt}</p>
            <h2>
              {selectedCondition?.title ?? PREDICTION_CONTENT.selectionTitle}
            </h2>
            <p>
              {selectedCondition?.body ?? PREDICTION_CONTENT.selectionBody}
            </p>
          </div>
        </div>

        <div className={styles.conditionOptions} aria-label="Field conditions">
          {PREDICTION_CONTENT.conditions.map((condition) => (
            <button
              key={condition.id}
              type="button"
              aria-pressed={condition.id === selectedCondition?.id}
              onClick={() => setSelectedPredictionCondition(condition.id)}
            >
              <span>{condition.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
