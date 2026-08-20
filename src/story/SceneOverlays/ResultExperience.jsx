import { useCallback, useEffect, useRef } from 'react'
import { RESULT_CONTENT } from '../../config/resultContent.js'
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
  RESULT_TITLE_BOX,
  RESULT_TITLE_LINE_TEXTS,
} from './sceneTitleBox.js'

export function ResultExperience({
  resultInspectionOpen,
  resultInteractionRef,
  selectedResultClosingAction,
  selectedResultView,
  setResultInspectionOpen,
  setSelectedResultClosingAction,
  setSelectedResultView,
}) {
  const triggerRef = useRef(null)
  const closeRef = useRef(null)
  const inspectionPanelRef = useRef(null)
  const closingCloseRef = useRef(null)
  const closingPanelRef = useRef(null)
  const closingTriggerRefs = useRef(new Map())
  const activeView = RESULT_CONTENT.inspection.views[selectedResultView]
    ?? RESULT_CONTENT.inspection.views[0]
  const viewCount = RESULT_CONTENT.inspection.views.length
  const viewStep = RESULT_SCENE_CONFIG.inspection.viewStep
  const activeClosingAction = RESULT_CONTENT.closing.actions.find(
    (action) => action.id === selectedResultClosingAction,
  ) ?? null

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

  const closeInspection = useCallback(() => {
    const interaction = resultInteractionRef.current
    interaction.dragging = false
    // Match the visual rotation's own close-unwind (ResultScene.jsx) so the
    // stored target doesn't stay parked several full turns away, ready to
    // spin wildly to "catch up" the next time inspection opens.
    interaction.rotationTarget = getNearestRestRotation(interaction.rotationTarget)
    setResultInspectionOpen(false)
    requestAnimationFrame(() => triggerRef.current?.focus())
  }, [resultInteractionRef, setResultInspectionOpen])

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
    <div className={styles.resultJourney}>
      <div
        className={styles.resultExperience}
        data-inspection-open={resultInspectionOpen ? 'true' : 'false'}
      >
        <div
          className={styles.resultIntro}
          aria-hidden={resultInspectionOpen}
          inert={resultInspectionOpen}
        >
        <div className={styles.resultCopy}>
          <p className={styles.eyebrow}>{RESULT_CONTENT.result.eyebrow}</p>
          <TitleParticleText
            as="h2"
            baseline={RESULT_TITLE_BOX.baseline}
            className={styles.resultTitleLines}
            fontSize={BOLD_TITLE_FONT_SIZE}
            fontWeight={BOLD_TITLE_FONT_WEIGHT}
            headingId="result-title"
            letterSpacing={BOLD_TITLE_LETTER_SPACING}
            lineHeight={BOLD_TITLE_LINE_HEIGHT}
            lines={RESULT_TITLE_LINE_TEXTS}
            text={RESULT_CONTENT.result.title}
            textAlign="left"
            textColor="#fff"
            viewBoxHeight={RESULT_TITLE_BOX.viewBoxHeight}
            viewBoxWidth={RESULT_TITLE_BOX.viewBoxWidth}
          />
          <p>{RESULT_CONTENT.result.body}</p>
        </div>

        <button
          ref={triggerRef}
          className={styles.resultOrbitAction}
          type="button"
          aria-label={RESULT_CONTENT.result.actionLabel}
          onClick={openInspection}
        >
          <span>{RESULT_CONTENT.result.actionLabel}</span>
        </button>
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
            aria-live="polite"
          >
            <p className={styles.eyebrow}>{activeView.eyebrow}</p>
            <h2>{activeView.title}</h2>
            <p>{activeView.body}</p>
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
          {RESULT_CONTENT.closing.actions.map((action) => (
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
              <span className={styles.closingActionLabel}>
                <span
                  className={`${styles.closingActionIcon} ${styles.closingActionIconLeft}`}
                  aria-hidden="true"
                >
                  ↗
                </span>
                {action.label}
              </span>
              <span
                className={`${styles.closingActionIcon} ${styles.closingActionIconRight}`}
                aria-hidden="true"
              >
                ↗
              </span>
            </button>
          ))}
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
