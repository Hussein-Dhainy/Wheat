import { useEffect, useRef, useState } from 'react'
import styles from './Preloader.module.css'

const FADE_DURATION_MS = 650

export function Preloader({ minimumVisibleMs = 0, ready, reducedMotion, onComplete }) {
  const [visible, setVisible] = useState(true)
  const [exiting, setExiting] = useState(false)
  const mountedAt = useRef(performance.now())

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
        <span className={styles.hexagon} aria-hidden="true" />
        <p>{ready ? 'Experience ready' : 'Loading experience'}</p>
        <span className={styles.track} aria-hidden="true">
          <span className={styles.progress} />
        </span>
      </div>
    </div>
  )
}
