import { useEffect, useRef } from 'react'
import { MENU_CHAPTERS } from '../../config/menuChapters.js'
import { SCENE_TIMELINE } from '../../config/sceneTimeline.js'
import { resolveChapterProgress } from './chapterProgress.js'
import styles from './ChapterProgress.module.css'

const RADIUS = 18
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const CHAPTER_LABEL_VISIBLE_MS = 1800

export function ChapterProgress({ reducedMotion, scrollRef, visible }) {
  const rootRef = useRef()
  const itemRefs = useRef([])

  useEffect(() => {
    const root = rootRef.current
    if (!root || !visible) {
      if (root) root.dataset.visible = 'false'
      return undefined
    }

    let frameId
    let previousActiveIndex = -2
    let previousProgress = -1
    const labelTimeouts = new Map()

    const revealChapterLabel = (item, index) => {
      const existingTimeout = labelTimeouts.get(index)
      if (existingTimeout) window.clearTimeout(existingTimeout)

      item.dataset.labelVisible = 'true'
      labelTimeouts.set(index, window.setTimeout(() => {
        item.dataset.labelVisible = 'false'
        labelTimeouts.delete(index)
      }, CHAPTER_LABEL_VISIBLE_MS))
    }

    const update = () => {
      const state = resolveChapterProgress(
        scrollRef?.current?.current ?? SCENE_TIMELINE.initialPosition,
        SCENE_TIMELINE,
      )
      root.dataset.visible = String(state.visible)

      if (state.activeIndex !== previousActiveIndex) {
        itemRefs.current.forEach((item, index) => {
          if (!item) return
          const active = state.visible && index === state.activeIndex
          item.dataset.active = String(active)
          if (active) {
            item.setAttribute('aria-current', 'step')
            revealChapterLabel(item, index)
          } else {
            item.removeAttribute('aria-current')
            item.dataset.labelVisible = 'false'
            const existingTimeout = labelTimeouts.get(index)
            if (existingTimeout) window.clearTimeout(existingTimeout)
            labelTimeouts.delete(index)
          }
        })
        previousActiveIndex = state.activeIndex
      }

      if (Math.abs(state.progress - previousProgress) >= 0.001) {
        root.style.setProperty(
          '--chapter-progress-offset',
          String(CIRCUMFERENCE * (1 - state.progress)),
        )
        root.setAttribute('aria-valuenow', String(Math.round(state.progress * 100)))
        root.setAttribute(
          'aria-valuetext',
          state.visible
            ? `${MENU_CHAPTERS[state.activeIndex].title}, ${Math.round(state.progress * 100)}% complete`
            : 'Before chapter one',
        )
        previousProgress = state.progress
      }

      frameId = window.requestAnimationFrame(update)
    }

    update()
    return () => {
      window.cancelAnimationFrame(frameId)
      labelTimeouts.forEach((timeoutId) => window.clearTimeout(timeoutId))
    }
  }, [scrollRef, visible])

  return (
    <div
      aria-label="Story chapter progress"
      aria-valuemax="100"
      aria-valuemin="0"
      aria-valuenow="0"
      className={`${styles.progress} ${reducedMotion ? styles.reducedMotion : ''}`}
      data-visible="false"
      ref={rootRef}
      role="progressbar"
    >
      {MENU_CHAPTERS.map((chapter, index) => (
        <span
          className={styles.chapter}
          data-active="false"
          data-label-visible="false"
          key={chapter.sceneId}
          ref={(element) => { itemRefs.current[index] = element }}
        >
          <span aria-hidden="true" className={styles.label}>
            {chapter.title}
          </span>
          <svg aria-hidden="true" className={styles.ring} viewBox="0 0 48 48">
            <circle
              className={styles.track}
              cx="24"
              cy="24"
              fill="none"
              r={RADIUS}
            />
            <circle
              className={styles.fill}
              cx="24"
              cy="24"
              fill="none"
              r={RADIUS}
              strokeDasharray={CIRCUMFERENCE}
            />
          </svg>
          <span className={styles.dot} />
          <span className={styles.srOnly}>
            Chapter {chapter.number}: {chapter.title}
          </span>
        </span>
      ))}
    </div>
  )
}
