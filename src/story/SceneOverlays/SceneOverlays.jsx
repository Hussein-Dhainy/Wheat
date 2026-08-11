import { SCENE_TIMELINE_CONFIG } from '../../config/sceneTimeline.js'
import { SCENE_REGISTRY } from '../../experience/SceneRegistry.js'
import { LandingSection } from '../sections/LandingSection/LandingSection.jsx'
import styles from './SceneOverlays.module.css'

function PlaceholderOverlay({
  entry,
  fallback,
  index,
  section,
  sectionCount,
  sectionIndex,
}) {
  const titleId = `scene-${index + 1}-section-${sectionIndex + 1}-title`
  const label = section?.label ?? entry.label
  const description = section?.description ?? entry.description

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
      aria-labelledby={titleId}
      aria-hidden={fallback ? false : sectionIndex !== 0}
      inert={fallback ? false : sectionIndex !== 0}
    >
      <header className={styles.header}>
        <span>W / {String(index + 1).padStart(2, '0')}</span>
        <span>{entry.chapter}</span>
      </header>

      <div className={styles.copy}>
        <p className={styles.eyebrow}>
          {sectionCount > 1
            ? `Prototype section ${sectionIndex + 1} / ${sectionCount}`
            : 'Prototype scene'}
        </p>
        <h2 id={titleId}>{label}</h2>
        <p>{description}</p>
      </div>

      <p className={styles.hint}>Scroll · Swipe · Arrow keys</p>
    </section>
  )
}

export function SceneOverlays({ entered, fallback, overlayRootRef }) {
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
            data-scene-index={index}
            data-scene-layer
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
                  index={index}
                  section={section}
                  sectionCount={configuredSections.length}
                  sectionIndex={sectionIndex}
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
