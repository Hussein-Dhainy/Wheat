import { TitleParticleText } from '../components/TitleParticleText/TitleParticleText.jsx'
import { FieldIntro } from './FieldIntro.jsx'
import { GeneticsBridgeTitle } from './GeneticsBridgeTitle.jsx'
import { GeneticsIntro } from './GeneticsIntro.jsx'
import { PredictionIntro } from './PredictionIntro.jsx'
import { ResultExperience } from './ResultExperience.jsx'
import { SeedlingStoryTitle } from './SeedlingStoryTitle.jsx'
import {
  BOLD_TITLE_FONT_SIZE,
  BOLD_TITLE_FONT_WEIGHT,
  BOLD_TITLE_LETTER_SPACING,
  BOLD_TITLE_LINE_HEIGHT,
  FIELD_TITLE_BOX,
  FIELD_TITLE_LINE_TEXTS,
} from './sceneTitleBox.js'
import styles from './SceneOverlays.module.css'

export function PlaceholderOverlay({
  entry,
  fallback,
  geneticsDetailOpen,
  index,
  section,
  sectionCount,
  sectionIndex,
  predictionTestsOpen,
  resultInspectionOpen,
  resultInteractionRef,
  selectedPredictionCondition,
  selectedResultClosingAction,
  selectedResultView,
  setPredictionTestsOpen,
  setGeneticsDetailOpen,
  setResultInspectionOpen,
  setSelectedPredictionCondition,
  setSelectedResultClosingAction,
  setSelectedResultView,
}) {
  const titleId = `scene-${index + 1}-section-${sectionIndex + 1}-title`
  const label = section?.label ?? entry.label
  const description = section?.description ?? entry.description
  const hidesPlaceholderContent = entry.id === 'prediction' || entry.id === 'result'

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
          : geneticsDetailOpen
            ? 'genetics-detail-title'
            : 'genetics-title'}
      aria-hidden={fallback ? false : sectionIndex !== 0}
      inert={fallback ? false : sectionIndex !== 0}
    >
      {entry.id !== 'genetics' && entry.id !== 'field' && !hidesPlaceholderContent && (
        <>
          <div className={styles.copy}>
            <p className={styles.eyebrow}>
              {sectionCount > 1
                ? `Prototype section ${sectionIndex + 1} / ${sectionCount}`
                : 'Prototype scene'}
            </p>
            <TitleParticleText
              as="h2"
              baseline={FIELD_TITLE_BOX.baseline}
              className={styles.fieldTitleLines}
              fontSize={BOLD_TITLE_FONT_SIZE}
              fontWeight={BOLD_TITLE_FONT_WEIGHT}
              headingId={titleId}
              letterSpacing={BOLD_TITLE_LETTER_SPACING}
              lineHeight={BOLD_TITLE_LINE_HEIGHT}
              lines={FIELD_TITLE_LINE_TEXTS}
              text={label}
              textAlign="left"
              textColor="#f5f1e7"
              viewBoxHeight={FIELD_TITLE_BOX.viewBoxHeight}
              viewBoxWidth={FIELD_TITLE_BOX.viewBoxWidth}
            />
            <p>{description}</p>
          </div>

          <p className={styles.hint}>Scroll · Swipe · Arrow keys</p>
        </>
      )}

      {entry.id === 'field' && (
        <>
          <FieldIntro
            description={description}
            fallback={fallback}
            title={label}
            titleId={titleId}
          />
          <p className={styles.hint}>Scroll · Swipe · Arrow keys</p>
        </>
      )}

      {entry.id === 'genetics' && (
        <>
          <GeneticsIntro
            fallback={fallback}
            geneticsDetailOpen={geneticsDetailOpen}
            setGeneticsDetailOpen={setGeneticsDetailOpen}
          />

          <GeneticsBridgeTitle fallback={fallback} />

          <SeedlingStoryTitle fallback={fallback} />
        </>
      )}

      {entry.id === 'prediction' && (
        <PredictionIntro
          fallback={fallback}
          predictionTestsOpen={predictionTestsOpen}
          selectedPredictionCondition={selectedPredictionCondition}
          setPredictionTestsOpen={setPredictionTestsOpen}
          setSelectedPredictionCondition={setSelectedPredictionCondition}
        />
      )}

      {entry.id === 'result' && (
        <ResultExperience
          fallback={fallback}
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
