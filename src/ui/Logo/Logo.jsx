import { useId } from 'react'
import styles from './Logo.module.css'

// Bottom-most first, top-most last — matches the stem's own bottom-to-top
// draw direction so a single vertical wipe reveals the whole icon as one
// continuous upward sweep.
const AWN_PAIRS = [
  { y: 38, length: 9 },
  { y: 32, length: 9.5 },
  { y: 26, length: 9 },
  { y: 20, length: 8.5 },
  { y: 14, length: 8 },
  { y: 8, length: 7 },
]

function IconLines() {
  return (
    <>
      <path d="M12 45 L12 5" />
      {AWN_PAIRS.map(({ y, length }) => (
        <g key={y}>
          <path d={`M12 ${y} L${12 - length} ${y - length * 0.55}`} />
          <path d={`M12 ${y} L${12 + length} ${y - length * 0.55}`} />
        </g>
      ))}
    </>
  )
}

export function Logo({
  className = '',
  label = 'WHEAT',
  reducedMotion = false,
  size = 1,
}) {
  const uid = useId()
  const iconThinClip = `${uid}-icon-thin`
  const iconThickClip = `${uid}-icon-thick`
  const wordThinClip = `${uid}-word-thin`
  const wordThickClip = `${uid}-word-thick`

  return (
    <div
      className={`${styles.logo} ${reducedMotion ? styles.reduced : ''} ${className}`}
      role="img"
      aria-label={label}
      style={{ '--logo-scale': size }}
    >
      <svg className={styles.icon} viewBox="0 0 24 48" aria-hidden="true">
        <defs>
          <clipPath id={iconThinClip} clipPathUnits="userSpaceOnUse">
            <rect className={styles.iconWipeThin} x="-4" y="0" width="32" height="48" />
          </clipPath>
          <clipPath id={iconThickClip} clipPathUnits="userSpaceOnUse">
            <rect className={styles.iconWipeThick} x="-4" y="0" width="32" height="48" />
          </clipPath>
        </defs>
        <g className={styles.iconThin} clipPath={`url(#${iconThinClip})`}>
          <IconLines />
        </g>
        <g className={styles.iconThick} clipPath={`url(#${iconThickClip})`}>
          <IconLines />
        </g>
      </svg>
      <svg className={styles.wordmark} viewBox="0 0 150 22" aria-hidden="true">
        <defs>
          <clipPath id={wordThinClip} clipPathUnits="userSpaceOnUse">
            <rect className={styles.wordWipeThin} x="0" y="-6" width="150" height="34" />
          </clipPath>
          <clipPath id={wordThickClip} clipPathUnits="userSpaceOnUse">
            <rect className={styles.wordWipeThick} x="0" y="-6" width="150" height="34" />
          </clipPath>
        </defs>
        <text
          className={`${styles.word} ${styles.wordThin}`}
          clipPath={`url(#${wordThinClip})`}
          x="1"
          y="17"
        >
          {label}
        </text>
        <text
          className={`${styles.word} ${styles.wordThick}`}
          clipPath={`url(#${wordThickClip})`}
          x="1"
          y="17"
        >
          {label}
        </text>
      </svg>
    </div>
  )
}
