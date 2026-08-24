import { useCallback, useEffect, useRef, useState } from 'react'
import { LANDING_INTRO } from '../../config/landingIntro.js'
import { RESULT_CONTENT } from '../../config/resultContent.js'
import { SCENE_VISIBILITY_ENTER_EVENT } from '../../experience/sceneManagerState.js'
import { RESULT_SCENE_CONFIG } from '../../experience/scenes/result/resultConfig.js'
import {
  getNearestRestRotation,
  getNearestResultViewRotation,
  snapResultView,
} from '../../experience/scenes/result/resultInspection.js'
import { TitleParticleText } from '../components/TitleParticleText/TitleParticleText.jsx'
import styles from './SceneOverlays.module.css'
import {
  BOLD_TITLE_FONT_SIZE,
  BOLD_TITLE_FONT_WEIGHT,
  BOLD_TITLE_LETTER_SPACING,
  BOLD_TITLE_LINE_HEIGHT,
  computeBoldTitleBox,
  RESULT_TITLE_BOX,
  RESULT_TITLE_LINE_TEXTS,
} from './sceneTitleBox.js'

const CLOSING_ACTION_TITLES = RESULT_CONTENT.closing.actions.map((action) => {
  const text = action.label.toUpperCase()
  return {
    box: computeBoldTitleBox([text]),
    text,
  }
})

const INSPECTION_TITLE_LINES = {
  balance: ['BALANCED', 'POTENTIAL'],
  consistency: ['FIELD', 'CONSISTENCY'],
  resilience: ['BUILT FOR', 'RESILIENCE'],
}

const INSPECTION_TITLES = RESULT_CONTENT.inspection.views.map((view) => {
  const lines = INSPECTION_TITLE_LINES[view.id] ?? [view.title.toUpperCase()]
  return {
    box: computeBoldTitleBox(lines),
    lines,
  }
})

export function ResultExperience({
  fallback,
  resultInspectionOpen,
  resultInteractionRef,
  selectedResultClosingAction,
  selectedResultView,
  setResultInspectionOpen,
  setSelectedResultClosingAction,
  setSelectedResultView,
}) {
  const experienceRef = useRef(null)
  const triggerRef = useRef(null)
  const closeRef = useRef(null)
  const inspectionPanelRef = useRef(null)
  const closingCloseRef = useRef(null)
  const closingPanelRef = useRef(null)
  const closingTriggerRefs = useRef(new Map())
  const progressFrame = useRef(0)
  const replayFrame = useRef(0)
  const closingReplayFrame = useRef(0)
  const inspectionReplayFrame = useRef(0)
  const restoreResultTriggerFocus = useRef(false)
  const titleParticles = useRef(null)
  const inspectionTitleParticles = useRef(null)
  const wasClosingVisible = useRef(false)
  const [titleIntroState, setTitleIntroState] = useState(
    fallback ? 'playing' : 'waiting',
  )
  const titleIntroComplete = titleIntroState === 'complete'
  const [resultControlsReady, setResultControlsReady] = useState(fallback)
  const [resultControlExiting, setResultControlExiting] = useState(false)
  const [closingIntroState, setClosingIntroState] = useState(
    fallback ? 'complete' : 'waiting',
  )
  const [inspectionIntroState, setInspectionIntroState] = useState(
    fallback ? 'complete' : 'waiting',
  )
  const activeView = RESULT_CONTENT.inspection.views[selectedResultView]
    ?? RESULT_CONTENT.inspection.views[0]
  const activeInspectionTitle = INSPECTION_TITLES[selectedResultView]
    ?? INSPECTION_TITLES[0]
  const viewCount = RESULT_CONTENT.inspection.views.length
  const viewStep = RESULT_SCENE_CONFIG.inspection.viewStep
  const activeClosingAction = RESULT_CONTENT.closing.actions.find(
    (action) => action.id === selectedResultClosingAction,
  ) ?? null

  const handleTitleIntroComplete = useCallback(() => {
    setTitleIntroState('complete')
  }, [])

  const replayTitleIntro = useCallback(() => {
    titleParticles.current?.setHoldActive(false)
    titleParticles.current?.park()
    setTitleIntroState('waiting')

    cancelAnimationFrame(replayFrame.current)
    replayFrame.current = requestAnimationFrame(() => {
      setTitleIntroState('playing')
    })
  }, [])

  const playClosingIntro = useCallback(() => {
    setClosingIntroState('waiting')
    cancelAnimationFrame(closingReplayFrame.current)
    closingReplayFrame.current = requestAnimationFrame(() => {
      setClosingIntroState('playing')
    })
  }, [])

  useEffect(() => {
    const sceneLayer = experienceRef.current?.closest('[data-scene-layer]')
    if (!sceneLayer || fallback) return undefined

    const replayVisibleResultIntro = () => {
      const closingVisible = Number(sceneLayer.dataset.sectionProgress ?? 0) >= 0.3
      wasClosingVisible.current = closingVisible

      if (closingVisible) {
        playClosingIntro()
      } else {
        setResultControlExiting(false)
        setClosingIntroState('waiting')
        replayTitleIntro()
      }
    }

    const monitorResultSection = () => {
      const sectionProgress = Number(sceneLayer.dataset.sectionProgress ?? 0)
      const closingVisible = sectionProgress >= 0.3

      if (wasClosingVisible.current && !closingVisible) {
        replayTitleIntro()
        setClosingIntroState('waiting')
      } else if (!wasClosingVisible.current && closingVisible) {
        playClosingIntro()
      }

      wasClosingVisible.current = closingVisible
      progressFrame.current = requestAnimationFrame(monitorResultSection)
    }

    sceneLayer.addEventListener(SCENE_VISIBILITY_ENTER_EVENT, replayVisibleResultIntro)
    progressFrame.current = requestAnimationFrame(monitorResultSection)

    return () => {
      cancelAnimationFrame(progressFrame.current)
      cancelAnimationFrame(replayFrame.current)
      cancelAnimationFrame(closingReplayFrame.current)
      sceneLayer.removeEventListener(
        SCENE_VISIBILITY_ENTER_EVENT,
        replayVisibleResultIntro,
      )
    }
  }, [fallback, playClosingIntro, replayTitleIntro])

  useEffect(() => {
    if (fallback || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setResultControlsReady(true)
      return undefined
    }

    if (titleIntroState === 'waiting') setResultControlsReady(false)
  }, [fallback, titleIntroState])

  useEffect(() => {
    if (!resultInspectionOpen) {
      setInspectionIntroState(fallback ? 'complete' : 'waiting')
      return undefined
    }

    inspectionTitleParticles.current?.setHoldActive(false)
    inspectionTitleParticles.current?.park()
    setInspectionIntroState('waiting')
    cancelAnimationFrame(inspectionReplayFrame.current)
    inspectionReplayFrame.current = requestAnimationFrame(() => {
      setInspectionIntroState('playing')
    })

    return () => cancelAnimationFrame(inspectionReplayFrame.current)
  }, [fallback, resultInspectionOpen, selectedResultView])

  const openInspection = () => {
    const interaction = resultInteractionRef.current
    interaction.dragging = false
    interaction.rotationTarget = getNearestResultViewRotation(
      interaction.rotationTarget,
      selectedResultView,
      viewStep,
      viewCount,
    )
    setResultInspectionOpen(true)
    requestAnimationFrame(() => closeRef.current?.focus())
  }

  const beginInspectionOpen = () => {
    if (!resultControlsReady || resultControlExiting) return

    if (fallback || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      openInspection()
      return
    }

    setResultControlsReady(false)
    setResultControlExiting(true)
  }

  const handleResultOuterRingAnimationComplete = (event) => {
    if (event.target !== event.currentTarget) return

    if (resultControlExiting) {
      openInspection()
    } else {
      setResultControlsReady(true)
      if (restoreResultTriggerFocus.current) {
        restoreResultTriggerFocus.current = false
        requestAnimationFrame(() => triggerRef.current?.focus())
      }
    }
  }

  const closeInspection = useCallback(() => {
    const interaction = resultInteractionRef.current
    interaction.dragging = false
    // Match the visual rotation's own close-unwind (ResultScene.jsx) so the
    // stored target doesn't stay parked several full turns away, ready to
    // spin wildly to "catch up" the next time inspection opens.
    interaction.rotationTarget = getNearestRestRotation(interaction.rotationTarget)
    setResultInspectionOpen(false)
    setResultControlExiting(false)
    if (fallback || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setResultControlsReady(true)
      requestAnimationFrame(() => triggerRef.current?.focus())
    } else {
      restoreResultTriggerFocus.current = true
      setResultControlsReady(false)
    }
  }, [fallback, resultInteractionRef, setResultInspectionOpen])

  const openClosingDetail = (actionId) => {
    setSelectedResultClosingAction(actionId)
    requestAnimationFrame(() => closingCloseRef.current?.focus())
  }

  const closeClosingDetail = useCallback(() => {
    const actionId = selectedResultClosingAction
    setSelectedResultClosingAction(null)
    requestAnimationFrame(() => closingTriggerRefs.current.get(actionId)?.focus())
  }, [selectedResultClosingAction, setSelectedResultClosingAction])

  const selectView = useCallback((viewIndex) => {
    const interaction = resultInteractionRef.current
    interaction.dragging = false
    interaction.rotationTarget = getNearestResultViewRotation(
      interaction.rotationTarget,
      viewIndex,
      viewStep,
      viewCount,
    )
    setSelectedResultView(viewIndex)
  }, [resultInteractionRef, setSelectedResultView, viewCount, viewStep])

  const finishDrag = useCallback((event) => {
    const interaction = resultInteractionRef.current
    if (!interaction.dragging) return

    interaction.dragging = false
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    const snapped = snapResultView(
      interaction.rotationTarget,
      viewStep,
      viewCount,
    )
    interaction.rotationTarget = snapped.rotation
    setSelectedResultView(snapped.index)
  }, [resultInteractionRef, setSelectedResultView, viewCount, viewStep])

  const handlePointerDown = (event) => {
    if (!resultInspectionOpen || event.button !== 0) return

    const interaction = resultInteractionRef.current
    interaction.dragging = true
    interaction.pointerStartX = event.clientX
    interaction.rotationStart = interaction.rotationTarget
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event) => {
    const interaction = resultInteractionRef.current
    if (!interaction.dragging) return

    interaction.rotationTarget = interaction.rotationStart
      + (event.clientX - interaction.pointerStartX)
      * RESULT_SCENE_CONFIG.inspection.dragRadiansPerPixel
  }

  const handleRotationKeyDown = (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return

    event.preventDefault()
    const direction = event.key === 'ArrowRight' ? 1 : -1
    selectView((selectedResultView + direction + viewCount) % viewCount)
  }

  useEffect(() => {
    if (!resultInspectionOpen) return undefined

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeInspection()
        return
      }

      if (event.key !== 'Tab') return
      const focusable = Array.from(inspectionPanelRef.current?.querySelectorAll(
        'button:not([disabled]), [tabindex="0"]',
      ) ?? [])
      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [closeInspection, resultInspectionOpen])

  useEffect(() => {
    if (selectedResultClosingAction === null) return undefined

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeClosingDetail()
        return
      }

      if (event.key !== 'Tab') return
      const focusable = Array.from(closingPanelRef.current?.querySelectorAll(
        'button:not([disabled]), [tabindex="0"]',
      ) ?? [])
      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [closeClosingDetail, selectedResultClosingAction])

  return (
    <div className={styles.resultJourney} ref={experienceRef}>
      <div
        className={styles.resultExperience}
        data-control-exiting={resultControlExiting ? 'true' : 'false'}
        data-controls-ready={resultControlsReady ? 'true' : 'false'}
        data-inspection-open={resultInspectionOpen ? 'true' : 'false'}
        data-result-intro-state={titleIntroState}
      >
        <div
          className={styles.resultIntro}
          aria-hidden={resultInspectionOpen}
          inert={resultInspectionOpen}
        >
        <div
          className={styles.resultCopy}
          data-result-intro-state={titleIntroState}
        >
          <p className={`${styles.eyebrow} ${styles.resultIntroEyebrow}`}>
            <span>{RESULT_CONTENT.result.eyebrow}</span>
          </p>
          <TitleParticleText
            ref={titleParticles}
            as="h2"
            baseline={RESULT_TITLE_BOX.baseline}
            className={styles.resultTitleLines}
            effectsEnabled={titleIntroComplete}
            fontSize={BOLD_TITLE_FONT_SIZE}
            fontWeight={BOLD_TITLE_FONT_WEIGHT}
            headingId="result-title"
            introState={titleIntroState}
            letterSpacing={BOLD_TITLE_LETTER_SPACING}
            lineHeight={BOLD_TITLE_LINE_HEIGHT}
            lines={RESULT_TITLE_LINE_TEXTS}
            onIntroComplete={handleTitleIntroComplete}
            outlineColor="rgb(255 255 255 / 72%)"
            outlineHighlights
            outlineWidth={0.8}
            seed={9531}
            style={{
              '--title-reveal-delay': `${LANDING_INTRO.titleDelayMs}ms`,
              '--title-reveal-duration': `${LANDING_INTRO.titleDurationMs}ms`,
            }}
            text={RESULT_CONTENT.result.title}
            textAlign="left"
            textColor="#fff"
            viewBoxHeight={RESULT_TITLE_BOX.viewBoxHeight}
            viewBoxWidth={RESULT_TITLE_BOX.viewBoxWidth}
          />
          <p className={styles.resultSubtitle}>
            <span>{RESULT_CONTENT.result.body}</span>
          </p>
        </div>

        <div className={styles.resultOrbitControl}>
          <svg
            className={styles.resultActionRings}
            viewBox="0 0 140 140"
            aria-hidden="true"
          >
            <circle
              className={styles.resultActionOuterRing}
              cx="70"
              cy="70"
              r="66"
              pathLength="1"
              onAnimationEnd={handleResultOuterRingAnimationComplete}
            />
            <circle
              className={styles.resultActionInnerRing}
              cx="70"
              cy="70"
              r="58"
              pathLength="1"
            />
            <circle
              className={styles.resultActionOrbitHighlight}
              cx="70"
              cy="70"
              r="66"
              pathLength="1"
            />
          </svg>
          <button
            ref={triggerRef}
            className={styles.resultOrbitAction}
            type="button"
            aria-label={RESULT_CONTENT.result.actionLabel}
            disabled={!resultControlsReady}
            onClick={beginInspectionOpen}
          >
            <span>{RESULT_CONTENT.result.actionLabel}</span>
          </button>
        </div>
        </div>

        <div
          ref={inspectionPanelRef}
          className={styles.resultInspection}
          aria-hidden={!resultInspectionOpen}
          inert={!resultInspectionOpen}
        >
          <button
            ref={closeRef}
            className={styles.resultInspectionClose}
            type="button"
            aria-label={RESULT_CONTENT.inspection.closeLabel}
            onClick={closeInspection}
          >
            <span aria-hidden="true">×</span>
          </button>

          <div
            key={activeView.id}
            className={styles.resultInspectionCopy}
            data-intro-state={inspectionIntroState}
            aria-live="polite"
          >
            <p className={styles.eyebrow}>{activeView.eyebrow}</p>
            <TitleParticleText
              ref={inspectionTitleParticles}
              as="h2"
              baseline={activeInspectionTitle.box.baseline}
              className={styles.resultInspectionTitle}
              effectsEnabled={inspectionIntroState === 'complete'}
              fontSize={BOLD_TITLE_FONT_SIZE}
              fontWeight={BOLD_TITLE_FONT_WEIGHT}
              headingId={`result-inspection-title-${activeView.id}`}
              introState={inspectionIntroState}
              letterSpacing={BOLD_TITLE_LETTER_SPACING}
              lineHeight={BOLD_TITLE_LINE_HEIGHT}
              lines={activeInspectionTitle.lines}
              onIntroComplete={() => setInspectionIntroState('complete')}
              outlineColor="rgb(255 255 255 / 72%)"
              outlineHighlights
              outlineWidth={0.8}
              seed={12791 + selectedResultView * 1013}
              style={{
                '--title-reveal-delay': '100ms',
                '--title-reveal-duration': '1250ms',
              }}
              text={activeView.title}
              textAlign="left"
              textColor="#fff"
              viewBoxHeight={activeInspectionTitle.box.viewBoxHeight}
              viewBoxWidth={activeInspectionTitle.box.viewBoxWidth}
            />
            <p className={styles.resultInspectionBody}>
              <span>{activeView.body}</span>
            </p>
          </div>

          <div
            className={styles.resultGrainDragSurface}
            role="group"
            tabIndex="0"
            aria-label={RESULT_CONTENT.inspection.instruction}
            onKeyDown={handleRotationKeyDown}
            onPointerCancel={finishDrag}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={finishDrag}
          />

          <div className={styles.resultViewControls} aria-label="Grain views">
            {RESULT_CONTENT.inspection.views.map((view, viewIndex) => (
              <button
                key={view.id}
                type="button"
                aria-label={`View ${viewIndex + 1}: ${view.title}`}
                aria-pressed={viewIndex === selectedResultView}
                onClick={() => selectView(viewIndex)}
              >
                {viewIndex + 1}
              </button>
            ))}
          </div>

          <p className={styles.resultInspectionInstruction}>
            {RESULT_CONTENT.inspection.instruction}
          </p>
        </div>
      </div>

      <div
        className={styles.resultClosingExperience}
        data-detail-open={activeClosingAction ? 'true' : 'false'}
        data-intro-state={closingIntroState}
      >
        <div
          className={styles.closingIntro}
          aria-hidden={Boolean(activeClosingAction)}
          inert={Boolean(activeClosingAction)}
        >
        <nav
          className={styles.closingActions}
          aria-label={RESULT_CONTENT.closing.eyebrow}
        >
          {RESULT_CONTENT.closing.actions.map((action, actionIndex) => {
            const title = CLOSING_ACTION_TITLES[actionIndex]
            const isLastAction = actionIndex === RESULT_CONTENT.closing.actions.length - 1

            return (
            <button
              key={action.id}
              ref={(node) => {
                if (node) closingTriggerRefs.current.set(action.id, node)
                else closingTriggerRefs.current.delete(action.id)
              }}
              type="button"
              data-selected={action.id === selectedResultClosingAction}
              onClick={() => openClosingDetail(action.id)}
            >
              <span
                className={styles.closingActionLabel}
                style={{
                  '--closing-action-width': `${title.box.viewBoxWidth / BOLD_TITLE_FONT_SIZE}em`,
                }}
              >
                <span
                  className={`${styles.closingActionIcon} ${styles.closingActionIconLeft}`}
                  aria-hidden="true"
                >
                  ↗
                </span>
                <TitleParticleText
                  as="span"
                  baseline={title.box.baseline}
                  className={styles.closingActionTitle}
                  effectsEnabled={false}
                  fontSize={BOLD_TITLE_FONT_SIZE}
                  fontWeight={BOLD_TITLE_FONT_WEIGHT}
                  headingId={`closing-action-${action.id}`}
                  interactive={false}
                  introState={closingIntroState}
                  letterSpacing={BOLD_TITLE_LETTER_SPACING}
                  lineHeight={BOLD_TITLE_LINE_HEIGHT}
                  lines={[title.text]}
                  onIntroComplete={isLastAction
                    ? () => setClosingIntroState('complete')
                    : undefined}
                  outlineColor="rgb(255 255 255 / 72%)"
                  outlineHighlights
                  outlineWidth={0.8}
                  seed={1117 + actionIndex * 937}
                  style={{
                    '--title-reveal-delay': `${actionIndex * 105}ms`,
                    '--title-reveal-duration': '1200ms',
                  }}
                  text={action.label}
                  textAlign="center"
                  textColor="#fff"
                  viewBoxHeight={title.box.viewBoxHeight}
                  viewBoxWidth={title.box.viewBoxWidth}
                />
              </span>
              <span
                className={`${styles.closingActionIcon} ${styles.closingActionIconRight}`}
                aria-hidden="true"
              >
                ↗
              </span>
            </button>
            )
          })}
        </nav>

        <div className={styles.closingFooter}>
          {RESULT_CONTENT.closing.footer.map((label) => (
            <button key={label} type="button">{label}</button>
          ))}
        </div>
        </div>

        <div
          ref={closingPanelRef}
          className={styles.closingDetail}
          aria-hidden={!activeClosingAction}
          inert={!activeClosingAction}
        >
          <button
            ref={closingCloseRef}
            className={styles.resultInspectionClose}
            type="button"
            aria-label="Close this detail"
            onClick={closeClosingDetail}
          >
            <span aria-hidden="true">&times;</span>
          </button>

          {activeClosingAction && (
            <article
              key={activeClosingAction.id}
              className={styles.closingDetailCopy}
              aria-live="polite"
            >
              <p className={styles.eyebrow}>{activeClosingAction.eyebrow}</p>
              <h2>{activeClosingAction.title}</h2>
              <p>{activeClosingAction.body}</p>
            </article>
          )}
        </div>
      </div>
    </div>
  )
}
