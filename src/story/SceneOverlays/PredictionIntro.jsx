import { useCallback, useEffect, useRef, useState } from 'react'
import { LANDING_INTRO } from '../../config/landingIntro.js'
import { PREDICTION_CONTENT } from '../../config/predictionContent.js'
import { SCENE_VISIBILITY_ENTER_EVENT } from '../../experience/sceneManagerState.js'
import { TitleParticleText } from '../components/TitleParticleText/TitleParticleText.jsx'
import styles from './SceneOverlays.module.css'
import {
  BOLD_TITLE_FONT_SIZE,
  BOLD_TITLE_FONT_WEIGHT,
  BOLD_TITLE_LETTER_SPACING,
  BOLD_TITLE_LINE_HEIGHT,
  computeBoldTitleBox,
  PREDICTION_TITLE_BOX,
  PREDICTION_TITLE_LINE_TEXTS,
} from './sceneTitleBox.js'

const CONDITION_SELECTION_TITLE_LINES = ['CHOOSE A', 'CONDITION.']
const CONDITION_SELECTION_TITLE_BOX = computeBoldTitleBox(
  CONDITION_SELECTION_TITLE_LINES,
)

const CONDITION_TITLE_LINES = {
  wind: ['WIND REVEALS', 'FLEXIBILITY.'],
  drought: ['DROUGHT TESTS', 'ENDURANCE.'],
  disease: ['DISEASE TESTS', 'DEFENSE.'],
  soil: ['SOIL SHAPES', 'EVERY ROOT.'],
  'field-density': ['SPACE CHANGES', 'THE FIELD.'],
}

const CONDITION_TITLE_SEEDS = {
  wind: 8501,
  drought: 8513,
  disease: 8521,
  soil: 8537,
  'field-density': 8543,
}

const CONDITION_TITLE_BOXES = Object.fromEntries(
  Object.entries(CONDITION_TITLE_LINES).map(([id, lines]) => [
    id,
    computeBoldTitleBox(lines),
  ]),
)

function SelectedConditionTitle({ condition, fallback }) {
  const [introState, setIntroState] = useState(
    fallback ? 'complete' : 'playing',
  )
  const lines = CONDITION_TITLE_LINES[condition.id]
  const box = CONDITION_TITLE_BOXES[condition.id]

  return (
    <TitleParticleText
      as="h2"
      baseline={box.baseline}
      className={styles.conditionSelectionTitle}
      effectsEnabled={introState === 'complete'}
      fontSize={BOLD_TITLE_FONT_SIZE}
      fontWeight={BOLD_TITLE_FONT_WEIGHT}
      headingId={`prediction-condition-${condition.id}-title`}
      introState={introState}
      letterSpacing={BOLD_TITLE_LETTER_SPACING}
      lineHeight={BOLD_TITLE_LINE_HEIGHT}
      lines={lines}
      onIntroComplete={() => setIntroState('complete')}
      outlineColor="rgb(255 255 255 / 72%)"
      outlineHighlights
      outlineWidth={0.8}
      seed={CONDITION_TITLE_SEEDS[condition.id]}
      style={{
        '--title-reveal-delay': '0ms',
        '--title-reveal-duration': `${LANDING_INTRO.titleDurationMs}ms`,
      }}
      text={condition.title}
      textAlign="left"
      textColor="#fff"
      viewBoxHeight={box.viewBoxHeight}
      viewBoxWidth={box.viewBoxWidth}
    />
  )
}

export function PredictionIntro({
  fallback,
  predictionTestsOpen,
  selectedPredictionCondition,
  setPredictionTestsOpen,
  setSelectedPredictionCondition,
}) {
  const experienceRef = useRef(null)
  const introButtonRef = useRef(null)
  const exitButtonRef = useRef(null)
  const replayFrame = useRef(0)
  const conditionReplayFrame = useRef(0)
  const exitReplayFrame = useRef(0)
  const restoreIntroButtonFocus = useRef(false)
  const titleParticles = useRef(null)
  const conditionTitleParticles = useRef(null)
  const [titleIntroState, setTitleIntroState] = useState(
    fallback ? 'playing' : 'waiting',
  )
  const titleIntroComplete = titleIntroState === 'complete'
  const [introControlsReady, setIntroControlsReady] = useState(fallback)
  const [conditionIntroState, setConditionIntroState] = useState(
    fallback ? 'complete' : 'waiting',
  )
  const [conditionTitleReplayKey, setConditionTitleReplayKey] = useState(0)
  const [testExitState, setTestExitState] = useState(
    fallback ? 'complete' : 'waiting',
  )
  const selectedCondition = PREDICTION_CONTENT.conditions.find(
    (condition) => condition.id === selectedPredictionCondition,
  ) ?? null

  const openTests = () => {
    // Every visit begins with a neutral field. App owns the five-second
    // fallback timer and cancels it as soon as a condition is selected.
    setSelectedPredictionCondition(null)
    setPredictionTestsOpen(true)
    const skipMotion = fallback
      || window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (skipMotion) {
      setConditionIntroState('complete')
      setTestExitState('complete')
      requestAnimationFrame(() => exitButtonRef.current?.focus())
    } else {
      setConditionIntroState('waiting')
      setTestExitState('waiting')
      cancelAnimationFrame(conditionReplayFrame.current)
      cancelAnimationFrame(exitReplayFrame.current)
      conditionReplayFrame.current = requestAnimationFrame(() => {
        setConditionIntroState('playing')
      })
      exitReplayFrame.current = requestAnimationFrame(() => {
        setTestExitState('playing')
      })
    }
  }

  const finishCloseTests = () => {
    setPredictionTestsOpen(false)
    setTestExitState(fallback ? 'complete' : 'waiting')
    restoreIntroButtonFocus.current = true
    if (fallback) {
      setTitleIntroState('complete')
      setIntroControlsReady(true)
    } else {
      replayTitleIntro()
    }
  }

  const closeTests = () => {
    if (testExitState !== 'complete') return

    if (fallback || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      finishCloseTests()
    } else {
      setTestExitState('exiting')
    }
  }

  const handleTestExitAnimationComplete = (event) => {
    if (event.target !== event.currentTarget) return

    if (testExitState === 'playing') {
      setTestExitState('complete')
      requestAnimationFrame(() => exitButtonRef.current?.focus())
    } else if (testExitState === 'exiting') {
      finishCloseTests()
    }
  }

  const handleTitleIntroComplete = useCallback(() => {
    setTitleIntroState('complete')
  }, [])

  const handleOuterRingDrawComplete = useCallback((event) => {
    if (event.target !== event.currentTarget) return
    setIntroControlsReady(true)
  }, [])

  const replayTitleIntro = useCallback(() => {
    titleParticles.current?.setHoldActive(false)
    titleParticles.current?.park()
    setIntroControlsReady(false)
    setTitleIntroState('waiting')

    cancelAnimationFrame(replayFrame.current)
    replayFrame.current = requestAnimationFrame(() => {
      replayFrame.current = requestAnimationFrame(() => {
        setTitleIntroState('playing')
      })
    })
  }, [])

  useEffect(() => {
    const sceneLayer = experienceRef.current?.closest('[data-scene-layer]')
    if (!sceneLayer || fallback) return undefined

    sceneLayer.addEventListener(
      SCENE_VISIBILITY_ENTER_EVENT,
      replayTitleIntro,
    )

    return () => {
      cancelAnimationFrame(replayFrame.current)
      cancelAnimationFrame(conditionReplayFrame.current)
      cancelAnimationFrame(exitReplayFrame.current)
      sceneLayer.removeEventListener(
        SCENE_VISIBILITY_ENTER_EVENT,
        replayTitleIntro,
      )
    }
  }, [fallback, replayTitleIntro])

  useEffect(() => {
    if (fallback || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setIntroControlsReady(true)
      return undefined
    }

    if (titleIntroState === 'waiting') {
      setIntroControlsReady(false)
    }
  }, [fallback, titleIntroState])

  useEffect(() => {
    if (!introControlsReady || !restoreIntroButtonFocus.current) return
    restoreIntroButtonFocus.current = false
    requestAnimationFrame(() => introButtonRef.current?.focus())
  }, [introControlsReady])

  useEffect(() => {
    if (!predictionTestsOpen) return undefined

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') closeTests()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [predictionTestsOpen, testExitState])

  return (
    <div
      className={styles.predictionExperience}
      data-controls-ready={introControlsReady ? 'true' : 'false'}
      data-intro-state={titleIntroState}
      data-tests-open={predictionTestsOpen ? 'true' : 'false'}
      ref={experienceRef}
    >
      <div
        className={styles.predictionIntro}
        aria-hidden={predictionTestsOpen}
        inert={predictionTestsOpen}
      >
        <div className={styles.predictionCopy}>
          <TitleParticleText
            ref={titleParticles}
            as="h2"
            baseline={PREDICTION_TITLE_BOX.baseline}
            className={styles.predictionTitleLines}
            effectsEnabled={titleIntroComplete}
            fontSize={BOLD_TITLE_FONT_SIZE}
            fontWeight={BOLD_TITLE_FONT_WEIGHT}
            headingId="prediction-title"
            introState={titleIntroState}
            letterSpacing={BOLD_TITLE_LETTER_SPACING}
            lineHeight={BOLD_TITLE_LINE_HEIGHT}
            lines={PREDICTION_TITLE_LINE_TEXTS}
            onIntroComplete={handleTitleIntroComplete}
            outlineColor="rgb(255 255 255 / 72%)"
            outlineHighlights
            outlineWidth={0.8}
            seed={7319}
            style={{
              '--title-reveal-delay': `${LANDING_INTRO.titleDelayMs}ms`,
              '--title-reveal-duration': `${LANDING_INTRO.titleDurationMs}ms`,
            }}
            text={PREDICTION_CONTENT.title}
            textAlign="left"
            textColor="#fff"
            viewBoxHeight={PREDICTION_TITLE_BOX.viewBoxHeight}
            viewBoxWidth={PREDICTION_TITLE_BOX.viewBoxWidth}
          />
          <p className={styles.predictionSubtitle}>
            <span>{PREDICTION_CONTENT.body}</span>
          </p>
        </div>

        <div className={styles.testActionOrbit}>
          <svg
            className={styles.testActionRings}
            viewBox="0 0 140 140"
            aria-hidden="true"
          >
            <circle
              className={styles.testActionOuterRing}
              cx="70"
              cy="70"
              r="66"
              pathLength="1"
              onAnimationEnd={handleOuterRingDrawComplete}
            />
            <circle
              className={styles.testActionInnerRing}
              cx="70"
              cy="70"
              r="58"
              pathLength="1"
            />
            <circle
              className={styles.testActionOrbitHighlight}
              cx="70"
              cy="70"
              r="66"
              pathLength="1"
            />
          </svg>
          <button
            ref={introButtonRef}
            className={styles.testAction}
            type="button"
            disabled={!introControlsReady}
            onClick={openTests}
          >
            <span>{PREDICTION_CONTENT.actionLabel}</span>
          </button>
        </div>
      </div>

      <div
        className={styles.predictionTests}
        data-exit-state={testExitState}
        aria-hidden={!predictionTestsOpen}
        inert={!predictionTestsOpen}
      >
        <button
          ref={exitButtonRef}
          className={styles.testsExit}
          type="button"
          aria-label="Exit field tests"
          disabled={testExitState !== 'complete'}
          onClick={closeTests}
        >
          <svg
            className={styles.testsExitRing}
            viewBox="0 0 100 100"
            aria-hidden="true"
          >
            <circle
              cx="50"
              cy="50"
              r="48"
              pathLength="1"
              onAnimationEnd={handleTestExitAnimationComplete}
            />
          </svg>
          <span aria-hidden="true" />
        </button>

        <div className={styles.conditionPanel}>
          <div
            key={`${selectedCondition?.id ?? 'condition-selection'}-${conditionTitleReplayKey}`}
            className={styles.conditionCopy}
            data-intro-state={selectedCondition ? 'complete' : conditionIntroState}
            aria-live="polite"
          >
            <p>{PREDICTION_CONTENT.conditionPrompt}</p>
            {selectedCondition ? (
              <SelectedConditionTitle
                condition={selectedCondition}
                fallback={fallback}
              />
            ) : (
              <TitleParticleText
                ref={conditionTitleParticles}
                as="h2"
                baseline={CONDITION_SELECTION_TITLE_BOX.baseline}
                className={styles.conditionSelectionTitle}
                effectsEnabled={conditionIntroState === 'complete'}
                fontSize={BOLD_TITLE_FONT_SIZE}
                fontWeight={BOLD_TITLE_FONT_WEIGHT}
                headingId="prediction-condition-selection-title"
                introState={conditionIntroState}
                letterSpacing={BOLD_TITLE_LETTER_SPACING}
                lineHeight={BOLD_TITLE_LINE_HEIGHT}
                lines={CONDITION_SELECTION_TITLE_LINES}
                onIntroComplete={() => setConditionIntroState('complete')}
                outlineColor="rgb(255 255 255 / 72%)"
                outlineHighlights
                outlineWidth={0.8}
                seed={8437}
                style={{
                  '--title-reveal-delay': '260ms',
                  '--title-reveal-duration': `${LANDING_INTRO.titleDurationMs}ms`,
                }}
                text={PREDICTION_CONTENT.selectionTitle}
                textAlign="left"
                textColor="#fff"
                viewBoxHeight={CONDITION_SELECTION_TITLE_BOX.viewBoxHeight}
                viewBoxWidth={CONDITION_SELECTION_TITLE_BOX.viewBoxWidth}
              />
            )}
            <p className={styles.conditionBody}>
              <span>
                {selectedCondition?.body ?? PREDICTION_CONTENT.selectionBody}
              </span>
            </p>
          </div>
        </div>

        <div className={styles.conditionOptions} aria-label="Field conditions">
          {PREDICTION_CONTENT.conditions.map((condition) => (
            <button
              key={condition.id}
              type="button"
              aria-pressed={condition.id === selectedCondition?.id}
              disabled={testExitState === 'exiting'}
              onClick={() => {
                setSelectedPredictionCondition(condition.id)
                setConditionTitleReplayKey((key) => key + 1)
              }}
            >
              {condition.id === 'wind' ? (
                <span className={styles.conditionWindIcon} aria-hidden="true">
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                </span>
              ) : null}
              {condition.id === 'drought' ? (
                <span className={styles.conditionDroughtIcon} aria-hidden="true">
                  <span className={styles.droughtCore} />
                  <span className={styles.droughtRays}>
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                  </span>
                </span>
              ) : null}
              {condition.id === 'disease' ? (
                <svg
                  className={styles.conditionDiseaseIcon}
                  viewBox="0 0 64 64"
                  aria-hidden="true"
                >
                  <defs>
                    <clipPath id="prediction-disease-leaf-clip">
                      <path d="M32 5C20 18 17 30 19 40C20.7 49 26 56 32 60C38 56 43.3 49 45 40C47 30 44 18 32 5Z" />
                    </clipPath>
                  </defs>
                  <g clipPath="url(#prediction-disease-leaf-clip)">
                    <circle className={styles.diseaseSpot} cx="26" cy="22" r="2.2" />
                    <circle className={styles.diseaseSpot} cx="38" cy="18" r="1.6" />
                    <circle className={styles.diseaseSpot} cx="38" cy="32" r="2.5" />
                    <circle className={styles.diseaseSpot} cx="26" cy="39" r="1.7" />
                    <circle className={styles.diseaseSpot} cx="37" cy="48" r="2" />
                  </g>
                  <path
                    className={styles.diseaseLeafOutline}
                    d="M32 5C20 18 17 30 19 40C20.7 49 26 56 32 60C38 56 43.3 49 45 40C47 30 44 18 32 5Z"
                  />
                  <path className={styles.diseaseLeafVein} d="M32 6V59" />
                </svg>
              ) : null}
              {condition.id === 'soil' ? (
                <span className={styles.conditionSoilIcon} aria-hidden="true">
                  <span className={styles.soilGrid}>
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                  </span>
                </span>
              ) : null}
              {condition.id === 'field-density' ? (
                <span className={styles.conditionDensityIcon} aria-hidden="true">
                  <span className={styles.densityGrid} />
                </span>
              ) : null}
              <span className={styles.conditionLabel}>{condition.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
