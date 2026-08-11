import {
  getAdjacentSnapPosition,
  getNearestSnapPosition,
} from './sceneTimeline.js'

const DOM_DELTA_PIXEL = 0
const DOM_DELTA_LINE = 1
const DOM_DELTA_PAGE = 2

export const VIRTUAL_SCROLL = {
  damping: 4, // 9
  snapDelaySeconds: 0.14,
  touchScreensPerViewport: 1.15, // 1.15
  wheelPixelLimit: 100, // 240
  wheelSensitivity: 0.0056, //0.0016
}

const INTEGER_SNAP_TIMELINE = Object.freeze({
  cycleLength: 1,
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
  return {
    current: 0,
    direction: 1,
    enabled: false,
    idleSeconds: 0,
    inputDirection: 0,
    isInteracting: false,
    isSnapping: false,
    reducedMotion: false,
    snapPending: false,
    target: 0,
    timeline,
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

  state.timeline = timeline
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

export function snapVirtualScrollToNearest(state) {
  state.target = getNearestSnapPosition(
    state.target,
    state.inputDirection,
    state.timeline,
  )
  state.idleSeconds = 0
  state.snapPending = false
  state.isSnapping = Math.abs(state.target - state.current) >= 1e-7
  return state
}

export function beginVirtualScrollInteraction(state) {
  state.target = state.current
  state.idleSeconds = 0
  state.isInteracting = true
  state.isSnapping = false
  state.snapPending = false
  return state
}

export function endVirtualScrollInteraction(state) {
  state.isInteracting = false
  if (state.snapPending) snapVirtualScrollToNearest(state)
  return state
}

export function stepVirtualScrollScene(state, direction) {
  assertFiniteNumber(direction, 'direction')
  if (direction === 0) return state

  const stepDirection = Math.sign(direction)
  const anchor = state.isSnapping ? state.target : state.current
  state.target = getAdjacentSnapPosition(
    anchor,
    stepDirection,
    state.timeline,
  )
  state.idleSeconds = 0
  state.inputDirection = stepDirection
  state.isSnapping = Math.abs(state.target - state.current) >= 1e-7
  state.snapPending = false
  return state
}

export function addVirtualScrollDelta(state, delta) {
  assertFiniteNumber(delta, 'delta')
  if (delta === 0) return state

  const inputDirection = Math.sign(delta)

  // Direct input always wins over an in-progress magnetic settle.
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
  state.snapPending = true
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
  const elapsedSeconds = Math.max(0, deltaSeconds)

  if (state.snapPending && !state.isInteracting) {
    state.idleSeconds += elapsedSeconds

    if (state.idleSeconds >= VIRTUAL_SCROLL.snapDelaySeconds) {
      snapVirtualScrollToNearest(state)
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
