import { useEffect, useRef } from 'react'
import {
  addVirtualScrollDelta,
  beginVirtualScrollInteraction,
  configureVirtualScrollTimeline,
  createVirtualScrollState,
  endVirtualScrollInteraction,
  normalizeWheelDelta,
  stepVirtualScrollScene,
  VIRTUAL_SCROLL,
} from '../experience/virtualScroll.js'

function isInteractiveTarget(target) {
  return target instanceof Element && Boolean(target.closest(
    'a, button, input, select, textarea, [contenteditable="true"], [role="button"]',
  ))
}

export function useVirtualSceneScroll({ enabled, reducedMotion, timeline }) {
  const scrollRef = useRef(createVirtualScrollState(timeline))
  scrollRef.current.enabled = enabled
  scrollRef.current.reducedMotion = reducedMotion
  configureVirtualScrollTimeline(scrollRef.current, timeline)

  useEffect(() => {
    const scroll = scrollRef.current
    let touchIdentifier = null
    let touchY = 0

    const applyDelta = (delta) => {
      if (!scroll.enabled) return
      addVirtualScrollDelta(scroll, delta)
    }

    const endTouch = () => {
      if (scroll.isInteracting) endVirtualScrollInteraction(scroll)
      touchIdentifier = null
    }

    const handleWheel = (event) => {
      if (!scroll.enabled || event.ctrlKey) return

      event.preventDefault()
      applyDelta(normalizeWheelDelta(
        event.deltaY,
        event.deltaMode,
        window.innerHeight,
      ))
    }

    const handleKeyDown = (event) => {
      if (
        !scroll.enabled
        || event.altKey
        || event.ctrlKey
        || event.metaKey
        || isInteractiveTarget(event.target)
      ) {
        return
      }

      let direction = 0

      if (event.key === 'ArrowDown') direction = 1
      if (event.key === 'ArrowUp') direction = -1
      if (event.key === 'PageDown') direction = 1
      if (event.key === 'PageUp') direction = -1
      if (event.key === ' ') {
        direction = event.shiftKey ? -1 : 1
      }

      if (direction === 0) return

      event.preventDefault()
      stepVirtualScrollScene(scroll, direction)
    }

    const handleTouchStart = (event) => {
      if (!scroll.enabled || event.touches.length !== 1) {
        endTouch()
        return
      }

      touchIdentifier = event.touches[0].identifier
      touchY = event.touches[0].clientY
      beginVirtualScrollInteraction(scroll)
    }

    const handleTouchMove = (event) => {
      if (!scroll.enabled || event.touches.length !== 1 || touchIdentifier === null) {
        endTouch()
        return
      }

      const touch = Array.from(event.touches).find(
        (candidate) => candidate.identifier === touchIdentifier,
      )
      if (!touch) return

      const pixelDelta = touchY - touch.clientY
      if (pixelDelta === 0) return

      event.preventDefault()
      touchY = touch.clientY
      applyDelta(
        (pixelDelta / Math.max(1, window.innerHeight))
        * VIRTUAL_SCROLL.touchScreensPerViewport,
      )
    }

    window.addEventListener('wheel', handleWheel, { passive: false })
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('touchstart', handleTouchStart, { passive: true })
    window.addEventListener('touchmove', handleTouchMove, { passive: false })
    window.addEventListener('touchend', endTouch, { passive: true })
    window.addEventListener('touchcancel', endTouch, { passive: true })

    return () => {
      window.removeEventListener('wheel', handleWheel)
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', endTouch)
      window.removeEventListener('touchcancel', endTouch)
    }
  }, [])

  return scrollRef
}
