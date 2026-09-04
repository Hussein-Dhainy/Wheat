import { SCENE_TIMELINE_CONFIG } from '../../config/sceneTimeline.js'
import { SCENE_REGISTRY } from '../../experience/SceneRegistry.js'
import { LandingSection } from '../sections/LandingSection/LandingSection.jsx'
import { PlaceholderOverlay } from './PlaceholderOverlay.jsx'
import styles from './SceneOverlays.module.css'

export function SceneOverlays({
  entered,
  fallback,
  geneticsDetailOpen,
  overlayRootRef,
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
  return (
    <div
      className={`${styles.root} ${fallback ? styles.fallback : ''}`}
      ref={overlayRootRef}
    >
      {SCENE_REGISTRY.map((entry, index) => {
        const configuredSections = SCENE_TIMELINE_CONFIG[index].timeline.sections
        const overlaySections = configuredSections.length
          ? configuredSections
          : [{ id: 'main', label: entry.label }]

        return (
          <div
            key={entry.id}
            className={styles.layer}
            data-scene-id={entry.id}
            data-scene-index={index}
            data-scene-layer
            data-seedling-growth-active="false"
            aria-hidden={fallback ? false : index !== 0}
            style={{
              background: fallback && index > 0
                ? entry.sceneProps?.background
                : undefined,
              clipPath: fallback || index === 0 ? 'inset(0)' : 'inset(100%)',
              pointerEvents: fallback || index === 0 ? 'auto' : 'none',
              visibility: fallback || index === 0 ? 'visible' : 'hidden',
            }}
          >
            {index === 0 ? (
              <div
                data-scene-section
                data-section-id="landing"
                data-section-index="0"
                data-section-label={entry.label}
              >
                <div className="landing-vignette" />
                <LandingSection entered={entered} />
              </div>
            ) : (
              overlaySections.map((section, sectionIndex) => (
                <PlaceholderOverlay
                  key={section.id}
                  entry={entry}
                  fallback={fallback}
                  geneticsDetailOpen={geneticsDetailOpen}
                  index={index}
                  section={section}
                  sectionCount={configuredSections.length}
                  sectionIndex={sectionIndex}
                  predictionTestsOpen={predictionTestsOpen}
                  resultInspectionOpen={resultInspectionOpen}
                  resultInteractionRef={resultInteractionRef}
                  selectedPredictionCondition={selectedPredictionCondition}
                  selectedResultClosingAction={selectedResultClosingAction}
                  selectedResultView={selectedResultView}
                  setPredictionTestsOpen={setPredictionTestsOpen}
                  setGeneticsDetailOpen={setGeneticsDetailOpen}
                  setResultInspectionOpen={setResultInspectionOpen}
                  setSelectedPredictionCondition={setSelectedPredictionCondition}
                  setSelectedResultClosingAction={setSelectedResultClosingAction}
                  setSelectedResultView={setSelectedResultView}
                />
              ))
            )}
          </div>
        )
      })}

      <p
        className={styles.announcer}
        data-scene-announcer
        aria-atomic="true"
        aria-live="polite"
      />
    </div>
  )
}
