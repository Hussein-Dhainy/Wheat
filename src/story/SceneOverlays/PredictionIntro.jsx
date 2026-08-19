import { useEffect, useRef } from 'react'
import { PREDICTION_CONTENT } from '../../config/predictionContent.js'
import styles from './SceneOverlays.module.css'
import { PREDICTION_TITLE_LINES, SceneTitleLines } from './SceneTitleLines.jsx'

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
          <h2 id="prediction-title" className={styles.visuallyHidden}>
            {PREDICTION_CONTENT.title}
          </h2>
          <SceneTitleLines
            className={styles.predictionTitleLines}
            lines={PREDICTION_TITLE_LINES}
            textColor="#fff"
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
