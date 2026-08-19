import { useEffect, useState } from 'react'
import { MENU_CHAPTERS, MENU_SECONDARY_SCENES } from '../../config/menuChapters.js'
import styles from './MenuOverlay.module.css'

const EXIT_DURATION_MS = 420
const COPY_FEEDBACK_MS = 1800

export function MenuOverlay({ onClose, onNavigate, open, reducedMotion }) {
  const [mounted, setMounted] = useState(open)
  const [visible, setVisible] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)

  useEffect(() => {
    if (open) {
      setMounted(true)
      // Mount in the closed visual state first so the opening transition
      // actually plays instead of snapping straight to visible.
      const raf = window.requestAnimationFrame(() => setVisible(true))
      return () => window.cancelAnimationFrame(raf)
    }

    setVisible(false)
    const duration = reducedMotion ? 0 : EXIT_DURATION_MS
    const timeout = window.setTimeout(() => setMounted(false), duration)
    return () => window.clearTimeout(timeout)
  }, [open, reducedMotion])

  useEffect(() => {
    if (!mounted) return undefined

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [mounted, onClose])

  if (!mounted) return null

  const handleBackdropClick = (event) => {
    if (event.target === event.currentTarget) onClose()
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setLinkCopied(true)
      window.setTimeout(() => setLinkCopied(false), COPY_FEEDBACK_MS)
    } catch {
      // Clipboard access can be unavailable (insecure context, denied
      // permission); leave the button as-is rather than claiming success.
    }
  }

  return (
    <div
      aria-label="Story navigation"
      aria-modal="true"
      className={`${styles.overlay} ${visible ? styles.visible : ''} ${reducedMotion ? styles.reduced : ''}`}
      onClick={handleBackdropClick}
      role="dialog"
    >
      <button
        aria-label="Close menu"
        className={styles.close}
        onClick={onClose}
        type="button"
      >
        <span className={styles.closeLine} />
        <span className={styles.closeLine} />
      </button>

      <div className={styles.body}>
        <nav className={styles.panel}>
          <p className={styles.eyebrow}>Explore the story</p>
          <ol className={styles.chapters}>
            {MENU_CHAPTERS.map((chapter) => (
              <li key={chapter.sceneId}>
                <button
                  className={styles.chapterButton}
                  onClick={() => onNavigate(chapter.sceneId)}
                  type="button"
                >
                  <span className={styles.chapterLabel}>
                    Chapter {chapter.number}
                  </span>
                  <span className={styles.chapterTitle}>{chapter.title}</span>
                </button>
              </li>
            ))}
          </ol>
        </nav>

        <div className={styles.secondary}>
          <p className={styles.eyebrow}>More to explore</p>
          <div className={styles.secondaryLinks}>
            {MENU_SECONDARY_SCENES.map((scene) => (
              <button
                className={styles.secondaryButton}
                key={scene.sceneId}
                onClick={() => onNavigate(scene.sceneId)}
                type="button"
              >
                {scene.label}
              </button>
            ))}
          </div>
          <button
            className={styles.copyLink}
            onClick={handleCopyLink}
            type="button"
          >
            {linkCopied ? 'Link copied' : 'Copy link to share'}
          </button>
        </div>
      </div>

      <p className={styles.footer}>
        An original, interactive WebGL journey through wheat development.
      </p>
    </div>
  )
}
