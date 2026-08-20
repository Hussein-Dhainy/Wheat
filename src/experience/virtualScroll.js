import {
  getAdjacentSnapPosition,
  getNearestSnapPosition,
  isFreeScrollPosition,
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
  snapDelaySeconds: 0.14,
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
    boundaryResistanceBoundary: null,
    boundaryResistanceDirection: 0,
    boundaryResistancePressure: 0,
    boundaryResistanceReleaseTarget: null,
    boundaryResistanceRequired: 0,
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
    snapPending: false,
    target: initialPosition,
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
  clearBoundaryResistance(state)
  if (isAtPreviousInitialPosition) {
    state.current = nextInitialPosition
    state.target = nextInitialPosition
  }
  return state
}

function hasBoundaryResistance(state) {
  return Number.isFinite(state.boundaryResistanceBoundary)
}

function clearBoundaryResistance(state) {
  state.boundaryResistanceBoundary = null
  state.boundaryResistanceDirection = 0
  state.boundaryResistancePressure = 0
  state.boundaryResistanceReleaseTarget = null
  state.boundaryResistanceRequired = 0
}

function armBoundaryResistance(
  state,
  boundary,
  direction,
  releaseTarget,
  requiredPressure,
) {
  state.boundaryResistanceBoundary = boundary
  state.boundaryResistanceDirection = direction
  // The gesture that first reaches the boundary is consumed. Resistance is
  // accumulated only from subsequent input, guaranteeing a perceptible stop
  // for both notched wheels and high-resolution trackpads.
  state.boundaryResistancePressure = 0
  state.boundaryResistanceReleaseTarget = releaseTarget
  state.boundaryResistanceRequired = requiredPressure
  state.target = boundary
  state.idleSeconds = 0
  state.inputDirection = direction
  state.isSnapping = Math.abs(state.target - state.current) >= 1e-7
  state.snapPending = false
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

  // `current` eases toward `target` every frame, so a reversal right at a
  // scene boundary can drift `current` a hair into the exit transition
  // before input goes idle. Once inside the transition span, `target` sits
  // past `contentEnd` regardless of which way the gesture is headed, so the
  // numeric checks below can't disambiguate — direction has to decide which
  // end of the transition to settle back on.
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

  const targetProgress = scene.contentLength > 0
    ? (state.target - contentStart) / scene.contentLength
    : 1
  const snapRange = scene.freeScrollSnapRanges.find((range) => (
    range.direction === state.inputDirection
    && targetProgress >= range.startProgress
    && targetProgress < range.endProgress
  ))

  if (snapRange) {
    return contentStart + snapRange.targetProgress * scene.contentLength
  }

  return state.target
}

export function snapVirtualScrollToNearest(state) {
  if (hasBoundaryResistance(state)) {
    state.target = state.boundaryResistanceBoundary
    state.idleSeconds = 0
    state.snapPending = false
    state.isSnapping = Math.abs(state.target - state.current) >= 1e-7
    return state
  }

  // Free-scroll scenes preserve interior targets. Once input crosses their
  // content span, complete the adjacent transition so damping cannot stop on
  // a partially visible diagonal seam.
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
  state.snapPending = false
  state.isSnapping = Math.abs(state.target - state.current) >= 1e-7
  return state
}

export function beginVirtualScrollInteraction(state) {
  state.damping = null
  state.target = hasBoundaryResistance(state)
    ? state.boundaryResistanceBoundary
    : state.current
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

  state.damping = null
  const stepDirection = Math.sign(direction)
  const anchor = state.isSnapping ? state.target : state.current

  // Keyboard input remains incremental inside free-scroll scenes instead of
  // jumping to the previous or next semantic boundary.
  const isFreeScrollStep = hasBoundaryResistance(state) || (
    state.timeline.scenes.length > 0
    && isFreeScrollPosition(state.current, state.timeline)
  )

  if (isFreeScrollStep) {
    addVirtualScrollDelta(
      state,
      stepDirection * VIRTUAL_SCROLL.freeScrollKeyboardStep,
    )
    return hasBoundaryResistance(state)
      ? state
      : snapVirtualScrollToNearest(state)
  }

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

  state.damping = null
  const inputDirection = Math.sign(delta)

  if (hasBoundaryResistance(state)) {
    if (inputDirection === state.boundaryResistanceDirection) {
      state.boundaryResistancePressure += Math.abs(delta)
      state.idleSeconds = 0
      state.inputDirection = inputDirection
      state.snapPending = false

      if (
        state.boundaryResistancePressure + 1e-10
        >= state.boundaryResistanceRequired
      ) {
        const releaseTarget = state.boundaryResistanceReleaseTarget
        clearBoundaryResistance(state)
        state.target = releaseTarget
        state.isSnapping = Math.abs(state.target - state.current) >= 1e-7
      } else {
        state.target = state.boundaryResistanceBoundary
        state.isSnapping = Math.abs(state.target - state.current) >= 1e-7
      }
      return state
    }

    // Reversing away from the detent cancels it immediately and lets the
    // ordinary direct-input path continue from the currently displayed frame.
    clearBoundaryResistance(state)
  }

  let forwardResistanceBoundary = null
  let forwardResistanceReleaseTarget = null
  let forwardResistanceRequired = 0
  let reverseResistanceBoundary = null
  let reverseResistanceReleaseTarget = null
  let reverseResistanceRequired = 0

  if (state.timeline.scenes.length > 0) {
    const timelinePosition = resolveSceneTimeline(state.current, state.timeline)
    const scene = state.timeline.scenes[timelinePosition.currentIndex]
    const isAtEmptySceneStart = inputDirection < 0
      && timelinePosition.phase === 'transition'
      && scene.contentLength === 0
      && timelinePosition.progress <= 0.05

    if (
      inputDirection > 0
      && timelinePosition.phase === 'section'
      && scene.freeScroll
      && scene.forwardExitResistance > 0
    ) {
      const cycleStart = timelinePosition.cycleIndex * state.timeline.cycleLength
      forwardResistanceBoundary = cycleStart + scene.transitionStart
      forwardResistanceReleaseTarget = cycleStart + scene.end
      forwardResistanceRequired = scene.forwardExitResistance
    }

    if (
      inputDirection < 0
      && timelinePosition.phase === 'section'
      && scene.freeScroll
      && scene.reverseEntryResistance > 0
    ) {
      const cycleStart = timelinePosition.cycleIndex * state.timeline.cycleLength
      const boundary = cycleStart + scene.start

      // Only arm while approaching the start from inside this scene. If the
      // view is already parked at the start, one upward input can leave it.
      if (state.current > boundary + 1e-7) {
        const previousSceneIndex = (
          timelinePosition.currentIndex - 1 + state.timeline.scenes.length
        ) % state.timeline.scenes.length
        const previousCycleStart = previousSceneIndex > timelinePosition.currentIndex
          ? cycleStart - state.timeline.cycleLength
          : cycleStart

        reverseResistanceBoundary = boundary
        reverseResistanceReleaseTarget = previousCycleStart
          + state.timeline.scenes[previousSceneIndex].transitionStart
        reverseResistanceRequired = scene.reverseEntryResistance
      }
    }

    // Direct scroll input while mid-transition used to force-jump the
    // target straight to that transition's boundary instead of letting the
    // normal "direct input always wins over an in-progress magnetic settle"
    // path below take over — which meant an idle-snap firing mid-transition
    // (e.g. from a brief pause between wheel ticks) couldn't be scrolled
    // past smoothly; continuing to scroll kept getting redirected to a
    // fixed endpoint. Only the empty-scene-start wraparound case (landing,
    // whose zero-length content needs to jump straight to the previous
    // scene) still needs this early, fixed-target handling.
    if (isAtEmptySceneStart) {
      let targetCycleIndex = timelinePosition.cycleIndex
      const previousSceneIndex = (
        timelinePosition.currentIndex - 1 + state.timeline.scenes.length
      ) % state.timeline.scenes.length
      if (previousSceneIndex > timelinePosition.currentIndex) {
        targetCycleIndex -= 1
      }
      const targetPosition = state.timeline.scenes[previousSceneIndex].transitionStart

      state.target = targetCycleIndex * state.timeline.cycleLength
        + targetPosition
      state.idleSeconds = 0
      state.inputDirection = inputDirection
      state.isSnapping = Math.abs(state.target - state.current) >= 1e-7
      state.snapPending = false
      return state
    }
  }

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
  if (
    forwardResistanceBoundary !== null
    && state.target > forwardResistanceBoundary
  ) {
    armBoundaryResistance(
      state,
      forwardResistanceBoundary,
      1,
      forwardResistanceReleaseTarget,
      forwardResistanceRequired,
    )
    return state
  }
  if (
    reverseResistanceBoundary !== null
    && state.target <= reverseResistanceBoundary
  ) {
    armBoundaryResistance(
      state,
      reverseResistanceBoundary,
      -1,
      reverseResistanceReleaseTarget,
      reverseResistanceRequired,
    )
    return state
  }
  state.idleSeconds = 0
  state.inputDirection = inputDirection
  state.snapPending = true
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

  clearBoundaryResistance(state)
  const direction = Math.sign(targetPosition - state.current) || state.direction

  state.damping = damping
  state.target = targetPosition
  state.idleSeconds = 0
  state.inputDirection = direction
  state.isInteracting = false
  state.isSnapping = Math.abs(state.target - state.current) >= 1e-7
  state.snapPending = false
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
