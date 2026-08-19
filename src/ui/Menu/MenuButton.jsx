import styles from './MenuButton.module.css'

export function MenuButton({ onClick, open = false, reducedMotion = false }) {
  return (
    <button
      aria-expanded={open}
      aria-label={open ? 'Close menu' : 'Open menu'}
      className={`${styles.button} ${open ? styles.open : ''} ${reducedMotion ? styles.reduced : ''}`}
      onClick={onClick}
      type="button"
    >
      <span className={styles.line} />
      <span className={styles.line} />
      <span className={styles.line} />
    </button>
  )
}
