import {
  getAdjacentSnapPosition,
  getNearestSnapPosition,
  resolveSceneTimeline,
} from './sceneTimeline.js'

const DOM_DELTA_PIXEL = 0
const DOM_DELTA_LINE = 1
const DOM_DELTA_PAGE = 2

export const VIRTUAL_SCROLL = {
  // Lower = slower catch-up to the target, so motion keeps visibly drifting
  // for longer after each wheel tick instead of settling almost instantly.
  damping: 2,
  freeScrollKeyboardStep: 0.5,
  // Direct input stays fully continuous inside scenes. If wheel input stops
  // inside a diagonal wipe, settle to one of its fully visible endpoints.
  transitionSettleDamping: 6.5,
  transitionSettleDelaySeconds: 0.14,
  touchScreensPerViewport: 1.15,
  wheelPixelLimit: 100,
  // Smaller target increments prevent notched mouse wheels from producing
  // visible speed changes, which matters more now that damping is slower.
  wheelSensitivity: 0.0050,
}

// Menu-triggered jumps read as a deliberate, cinematic pan rather than the
// snappy response direct scroll input needs — much lower than the default.
const MENU_JUMP_DAMPING = 0.85

const INTEGER_SNAP_TIMELINE = Object.freeze({
  cycleLength: 1,
  initialPosition: 0,
  scenes: Object.freeze([]),
  segments: Object.freeze([]),
  snapOffsets: Object.freeze([0]),
})

function assertFiniteNumber(value, name) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`${name} must be a finite number`)
  }
}

export function createVirtualScrollState(timeline = INTEGER_SNAP_TIMELINE) {
  const initialPosition = Number.isFinite(timeline.initialPosition)
    ? timeline.initialPosition
    : 0

  return {
    current: initialPosition,
    // Per-frame damping override for the current motion; null means "use
    // the caller's default". Set by jumpVirtualScrollToPosition and cleared
    // the moment the user provides direct input again.
    damping: null,
    direction: 1,
    enabled: false,
    idleSeconds: 0,
    inputDirection: 0,
    isInteracting: false,
    isSnapping: false,
    reducedMotion: false,
    target: initialPosition,
    timeline,
    transitionSettlePending: false,
  }
}

export function configureVirtualScrollTimeline(state, timeline) {
  if (state.timeline === timeline) return state
  if (
    !timeline
    || !Number.isFinite(timeline.cycleLength)
    || timeline.cycleLength <= 0
    || !Array.isArray(timeline.snapOffsets)
    || timeline.snapOffsets.length === 0
  ) {
    throw new TypeError('timeline must be a compiled scene timeline')
  }

  const previousInitialPosition = Number.isFinite(state.timeline?.initialPosition)
    ? state.timeline.initialPosition
    : 0
  const nextInitialPosition = Number.isFinite(timeline.initialPosition)
    ? timeline.initialPosition
    : 0
  const isAtPreviousInitialPosition = (
    Math.abs(state.current - previousInitialPosition) < 1e-7
    && Math.abs(state.target - previousInitialPosition) < 1e-7
  )

  state.timeline = timeline
  state.idleSeconds = 0
  state.transitionSettlePending = false
  if (isAtPreviousInitialPosition) {
    state.current = nextInitialPosition
    state.target = nextInitialPosition
  }
  return state
}

export function normalizeWheelDelta(
  deltaY,
  deltaMode = DOM_DELTA_PIXEL,
  viewportHeight = 1,
) {
  assertFiniteNumber(deltaY, 'deltaY')
  assertFiniteNumber(deltaMode, 'deltaMode')
  assertFiniteNumber(viewportHeight, 'viewportHeight')

  const modeScale = deltaMode === DOM_DELTA_LINE
    ? 16
    : deltaMode === DOM_DELTA_PAGE
      ? Math.max(1, viewportHeight)
      : 1
  const pixelDelta = Math.max(
    -VIRTUAL_SCROLL.wheelPixelLimit,
    Math.min(VIRTUAL_SCROLL.wheelPixelLimit, deltaY * modeScale),
  )

  return pixelDelta * VIRTUAL_SCROLL.wheelSensitivity
}

export function getNearestScenePosition(position, direction = 1) {
  return getNearestSnapPosition(
    position,
    direction,
    INTEGER_SNAP_TIMELINE,
  )
}

function getFreeScrollTarget(state) {
  if (state.timeline.scenes.length === 0) return null

  const timelinePosition = resolveSceneTimeline(state.current, state.timeline)
  const scene = state.timeline.scenes[timelinePosition.currentIndex]
  if (!scene?.freeScroll) return null

  const cycleStart = timelinePosition.cycleIndex * state.timeline.cycleLength
  const contentStart = cycleStart + scene.start
  const contentEnd = cycleStart + scene.transitionStart

  // Keyboard input may arrive while the displayed position is already inside
  // a wipe. Direction selects the nearby end; direct wheel/touch input never
  // enters this semantic-settle path.
  if (timelinePosition.phase === 'transition') {
    return state.inputDirection < 0 ? contentEnd : cycleStart + scene.end
  }

  if (timelinePosition.phase !== 'section') return null

  if (state.target > contentEnd) {
    return cycleStart + scene.end
  }

  if (state.target < contentStart) {
    const previousSceneIndex = (
      timelinePosition.currentIndex - 1 + state.timeline.scenes.length
    ) % state.timeline.scenes.length
    const previousCycleStart = previousSceneIndex > timelinePosition.currentIndex
      ? cycleStart - state.timeline.cycleLength
      : cycleStart

    return previousCycleStart
      + state.timeline.scenes[previousSceneIndex].transitionStart
  }

  return state.target
}

export function snapVirtualScrollToNearest(state) {
  // Keyboard navigation remains incremental through long scene content, then
  // completes the adjacent wipe at a semantic boundary. Wheel and touch input
  // never call this function and may rest at any continuous timeline position.
  const freeScrollTarget = getFreeScrollTarget(state)

  if (freeScrollTarget === null) {
    state.target = getNearestSnapPosition(
      state.target,
      state.inputDirection,
      state.timeline,
    )
  } else {
    state.target = freeScrollTarget
  }

  state.idleSeconds = 0
  state.isSnapping = Math.abs(state.target - state.current) >= 1e-7
  state.transitionSettlePending = false
  return state
}

function settleVirtualScrollTransition(state) {
  state.idleSeconds = 0
  state.transitionSettlePending = false

  if (state.timeline.scenes.length === 0) return state

  const timelinePosition = resolveSceneTimeline(state.target, state.timeline)
  if (timelinePosition.phase !== 'transition') return state

  const scene = state.timeline.scenes[timelinePosition.currentIndex]
  const cycleStart = timelinePosition.cycleIndex * state.timeline.cycleLength
  const transitionStart = cycleStart + scene.transitionStart
  const transitionEnd = cycleStart + scene.end
  const isPastMidpoint = timelinePosition.progress > 0.5
  const isAtMidpoint = Math.abs(timelinePosition.progress - 0.5) < 1e-10

  state.target = isPastMidpoint || (isAtMidpoint && state.inputDirection >= 0)
    ? transitionEnd
    : transitionStart
  state.damping = VIRTUAL_SCROLL.transitionSettleDamping
  state.isSnapping = Math.abs(state.target - state.current) >= 1e-7
  return state
}

export function beginVirtualScrollInteraction(state) {
  state.damping = null
  state.idleSeconds = 0
  state.target = state.current
  state.isInteracting = true
  state.isSnapping = false
  state.transitionSettlePending = false
  return state
}

export function endVirtualScrollInteraction(state) {
  state.isInteracting = false
  return state.transitionSettlePending
    ? settleVirtualScrollTransition(state)
    : state
}

export function stepVirtualScrollScene(state, direction) {
  assertFiniteNumber(direction, 'direction')
  if (direction === 0) return state

  state.damping = null
  state.idleSeconds = 0
  state.transitionSettlePending = false
  const stepDirection = Math.sign(direction)
  const anchor = state.isSnapping ? state.target : state.current

  // Keyboard input stays incremental inside long scene content. Once it
  // reaches that scene's wipe, snapVirtualScrollToNearest completes only the
  // nearby transition instead of skipping a whole content span.
  const timelinePosition = state.timeline.scenes.length > 0
    ? resolveSceneTimeline(state.current, state.timeline)
    : null
  const activeTimelineScene = timelinePosition
    ? state.timeline.scenes[timelinePosition.currentIndex]
    : null
  const isFreeScrollStep = Boolean(activeTimelineScene?.freeScroll)

  if (isFreeScrollStep) {
    state.target = anchor
      + stepDirection * VIRTUAL_SCROLL.freeScrollKeyboardStep
    state.inputDirection = stepDirection
    state.isSnapping = Math.abs(state.target - state.current) >= 1e-7
    return snapVirtualScrollToNearest(state)
  }

  state.target = getAdjacentSnapPosition(
    anchor,
    stepDirection,
    state.timeline,
  )
  state.inputDirection = stepDirection
  state.isSnapping = Math.abs(state.target - state.current) >= 1e-7
  return state
}

export function addVirtualScrollDelta(state, delta) {
  assertFiniteNumber(delta, 'delta')
  if (delta === 0) return state

  state.damping = null
  const inputDirection = Math.sign(delta)

  // Direct wheel/touch input always owns the continuous target. Cancel a
  // keyboard or menu settle from the exact displayed frame, then apply only
  // the user's requested delta; no scene edge may consume or redirect it.
  if (state.isSnapping) {
    state.target = state.current
    state.isSnapping = false
  }

  const pendingDirection = Math.sign(state.target - state.current)

  // Discard old inertia when input reverses so the boundary responds immediately.
  if (pendingDirection !== 0 && pendingDirection !== inputDirection) {
    state.target = state.current
  }

  state.target += delta
  state.idleSeconds = 0
  state.inputDirection = inputDirection
  state.transitionSettlePending = true
  return state
}

// Sends the virtual scroll straight to an arbitrary timeline position (e.g.
// a scene picked from a navigation menu). The existing per-frame damping in
// advanceVirtualScroll animates current toward it, so this only needs to set
// the target and clear whatever gesture state was in progress. It also
// slows that damping down for a deliberate cinematic pan — any direct
// scroll input afterward (wheel/touch/keyboard) reverts to the normal,
// snappier default automatically.
export function jumpVirtualScrollToPosition(
  state,
  targetPosition,
  damping = MENU_JUMP_DAMPING,
) {
  assertFiniteNumber(targetPosition, 'targetPosition')

  const direction = Math.sign(targetPosition - state.current) || state.direction

  state.damping = damping
  state.idleSeconds = 0
  state.target = targetPosition
  state.inputDirection = direction
  state.isInteracting = false
  state.isSnapping = Math.abs(state.target - state.current) >= 1e-7
  state.transitionSettlePending = false
  return state
}

export function advanceVirtualScroll(
  state,
  deltaSeconds,
  damping = VIRTUAL_SCROLL.damping,
) {
  assertFiniteNumber(deltaSeconds, 'deltaSeconds')
  assertFiniteNumber(damping, 'damping')

  const previous = state.current

  if (state.transitionSettlePending && !state.isInteracting) {
    state.idleSeconds += Math.max(0, deltaSeconds)

    if (state.idleSeconds >= VIRTUAL_SCROLL.transitionSettleDelaySeconds) {
      settleVirtualScrollTransition(state)
    }
  }

  if (state.reducedMotion || damping <= 0) {
    state.current = state.target
    state.isSnapping = false
  } else {
    const frameDelta = Math.max(0, Math.min(deltaSeconds, 0.1))
    const amount = 1 - Math.exp(-damping * frameDelta)
    state.current += (state.target - state.current) * amount

    if (Math.abs(state.target - state.current) < 1e-7) {
      state.current = state.target
      state.isSnapping = false
    }
  }

  const frameDirection = Math.sign(state.current - previous)
  if (frameDirection !== 0) state.direction = frameDirection

  return state
}
