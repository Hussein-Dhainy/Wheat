import {
  DEFAULT_GENETICS_SEED_ID,
  GENETICS_SEED_OPTIONS,
} from '../../config/geneticsSeeds.js'
import { PredictionIntro } from './PredictionIntro.jsx'
import { ResultExperience } from './ResultExperience.jsx'
import styles from './SceneOverlays.module.css'
import { FIELD_TITLE_LINES, SceneTitleLines } from './SceneTitleLines.jsx'

export function PlaceholderOverlay({
  entry,
  fallback,
  index,
  section,
  sectionCount,
  sectionIndex,
  predictionTestsOpen,
  resultInspectionOpen,
  resultInteractionRef,
  selectedGeneticsSeed,
  selectedPredictionCondition,
  selectedResultClosingAction,
  selectedResultView,
  setPredictionTestsOpen,
  setResultInspectionOpen,
  setSelectedGeneticsSeed,
  setSelectedPredictionCondition,
  setSelectedResultClosingAction,
  setSelectedResultView,
}) {
  const titleId = `scene-${index + 1}-section-${sectionIndex + 1}-title`
  const label = section?.label ?? entry.label
  const description = section?.description ?? entry.description
  const hidesPlaceholderContent = entry.id === 'prediction' || entry.id === 'result'
  const selectedSeed = GENETICS_SEED_OPTIONS.find(
    (option) => option.id === selectedGeneticsSeed,
  ) ?? GENETICS_SEED_OPTIONS.find(
    (option) => option.id === DEFAULT_GENETICS_SEED_ID,
  )

  return (
    <section
      className={styles.placeholder}
      data-scene-section
      data-section-id={section?.id ?? 'main'}
      data-section-index={sectionIndex}
      data-section-label={label}
      style={{
        '--scene-accent': entry.accent,
        background: fallback
          ? entry.sceneProps?.sectionBackgrounds?.[section?.id]
            ?? entry.sceneProps?.background
          : undefined,
      }}
      aria-label={hidesPlaceholderContent ? label : undefined}
      aria-labelledby={hidesPlaceholderContent
        ? undefined
        : entry.id !== 'genetics'
          ? titleId
          : 'genetics-seed-title'}
      aria-hidden={fallback ? false : sectionIndex !== 0}
      inert={fallback ? false : sectionIndex !== 0}
    >
      {entry.id !== 'genetics' && !hidesPlaceholderContent && (
        <>
          <div className={styles.copy}>
            <p className={styles.eyebrow}>
              {sectionCount > 1
                ? `Prototype section ${sectionIndex + 1} / ${sectionCount}`
                : 'Prototype scene'}
            </p>
            <h2 id={titleId} className={styles.visuallyHidden}>{label}</h2>
            <SceneTitleLines
              className={styles.fieldTitleLines}
              lines={FIELD_TITLE_LINES}
              textColor="#f5f1e7"
            />
            <p>{description}</p>
          </div>

          <p className={styles.hint}>Scroll · Swipe · Arrow keys</p>
        </>
      )}

      {entry.id === 'genetics' && (
        <div className={styles.seedSelector}>
          <div className={styles.seedCopy}>
            <p className={styles.eyebrow}>Explore the candidates</p>
            <h2 id="genetics-seed-title">{selectedSeed.label}</h2>
            <p aria-live="polite">{selectedSeed.description}</p>
          </div>

          <div className={styles.seedOptions} aria-label="Seed views">
            {GENETICS_SEED_OPTIONS.map((option, optionIndex) => (
              <button
                key={option.id}
                type="button"
                aria-pressed={option.id === selectedSeed.id}
                onClick={() => setSelectedGeneticsSeed(option.id)}
              >
                <span>{String(optionIndex + 1).padStart(2, '0')}</span>
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {entry.id === 'prediction' && (
        <PredictionIntro
          predictionTestsOpen={predictionTestsOpen}
          selectedPredictionCondition={selectedPredictionCondition}
          setPredictionTestsOpen={setPredictionTestsOpen}
          setSelectedPredictionCondition={setSelectedPredictionCondition}
        />
      )}

      {entry.id === 'result' && (
        <ResultExperience
          resultInspectionOpen={resultInspectionOpen}
          resultInteractionRef={resultInteractionRef}
          selectedResultClosingAction={selectedResultClosingAction}
          selectedResultView={selectedResultView}
          setResultInspectionOpen={setResultInspectionOpen}
          setSelectedResultClosingAction={setSelectedResultClosingAction}
          setSelectedResultView={setSelectedResultView}
        />
      )}
    </section>
  )
}
