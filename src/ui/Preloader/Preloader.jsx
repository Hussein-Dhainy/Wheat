import { useEffect, useRef, useState } from 'react'
import { Logo } from '../Logo/Logo.jsx'
import styles from './Preloader.module.css'

const FADE_DURATION_MS = 650
// The browser only reports coarse, per-file progress (e.g. "2 of 6 assets"),
// which jumps in big uneven steps whenever a large file finishes. Rather
// than display that raw signal, the bar continuously creeps toward this
// ceiling on its own — real progress can pull it forward faster, but it
// never sits still — and only leaps to 100% once loading has actually
// finished.
const TRICKLE_CEILING = 0.92
const TRICKLE_TIME_CONSTANT_MS = 1700
const TRICKLE_SMOOTHING_RATE = 4.5
const SNAP_SMOOTHING_RATE = 12

export function Preloader({
  minimumVisibleMs = 0,
  onComplete,
  progress = 0,
  ready,
  reducedMotion,
}) {
  const [visible, setVisible] = useState(true)
  const [exiting, setExiting] = useState(false)
  const mountedAt = useRef(performance.now())
  const smoothedProgressRef = useRef(0)
  const lastFrameAt = useRef(mountedAt.current)
  const readyRef = useRef(ready)
  const progressRef = useRef(progress)
  const rafId = useRef()
  const progressBarRef = useRef(null)
  const percentTextRef = useRef(null)

  readyRef.current = ready
  progressRef.current = Math.min(1, Math.max(0, progress))

  // Writes progress straight to the DOM (bar width + percent text) instead
  // of going through React state, so the ~60fps tick doesn't re-render the
  // component tree — that re-render was competing with the browser's own
  // main-thread work decoding the loading assets and was what made the
  // logo's draw-in animation stutter.
  useEffect(() => {
    const applyDisplayFraction = (fraction) => {
      const percent = Math.round(Math.min(1, Math.max(0, fraction)) * 100)
      if (progressBarRef.current) {
        progressBarRef.current.style.width = `${percent}%`
      }
      if (percentTextRef.current) {
        percentTextRef.current.textContent = String(percent)
      }
    }

    if (reducedMotion) {
      applyDisplayFraction(ready ? 1 : progressRef.current)
      return undefined
    }

    const tick = (now) => {
      const deltaSeconds = Math.max(0, (now - lastFrameAt.current) / 1000)
      lastFrameAt.current = now
      const elapsedMs = now - mountedAt.current

      const trickleCeiling = 1 - Math.exp(-elapsedMs / TRICKLE_TIME_CONSTANT_MS)
      const target = readyRef.current
        ? 1
        : Math.max(
          Math.min(TRICKLE_CEILING, trickleCeiling),
          progressRef.current * TRICKLE_CEILING,
        )

      const rate = readyRef.current ? SNAP_SMOOTHING_RATE : TRICKLE_SMOOTHING_RATE
      const smoothing = 1 - Math.exp(-rate * deltaSeconds)
      smoothedProgressRef.current += (target - smoothedProgressRef.current) * smoothing
      applyDisplayFraction(smoothedProgressRef.current)

      if (!readyRef.current || smoothedProgressRef.current < 0.999) {
        rafId.current = window.requestAnimationFrame(tick)
      }
    }

    rafId.current = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(rafId.current)
  }, [reducedMotion, ready])

  useEffect(() => {
    if (!ready) return undefined

    const elapsed = performance.now() - mountedAt.current
    const remainingDelay = Math.max(0, minimumVisibleMs - elapsed)
    const delayTimeout = window.setTimeout(() => setExiting(true), remainingDelay)

    return () => window.clearTimeout(delayTimeout)
  }, [minimumVisibleMs, ready])

  useEffect(() => {
    if (!exiting) return undefined

    const fadeDuration = reducedMotion ? 0 : FADE_DURATION_MS
    const fadeTimeout = window.setTimeout(() => {
      setVisible(false)
      onComplete?.()
    }, fadeDuration)

    return () => window.clearTimeout(fadeTimeout)
  }, [exiting, onComplete, reducedMotion])

  if (!visible) return null

  return (
    <div
      className={`${styles.preloader} ${exiting ? styles.ready : ''}`}
      role="status"
      aria-live="polite"
      aria-busy={!ready}
    >
      <div className={styles.content}>
        <Logo className={styles.logo} reducedMotion={reducedMotion} size={2.6} />
        <p>
          {ready
            ? 'Experience ready'
            : <>Loading experience — <span ref={percentTextRef}>0</span>%</>}
        </p>
        <span className={styles.track} aria-hidden="true">
          <span ref={progressBarRef} className={styles.progress} />
        </span>
      </div>
    </div>
  )
}
