import { LinearFilter, WebGLRenderTarget } from 'three'
import { GENETICS_SEED_TIMING } from '../config/geneticsSeeds.js'
import { getDiagonalBounds } from './sceneMath.js'
import {
  applyIncomingSceneMotion,
  applyOutgoingSceneMotion,
} from './sceneMotion.js'
import { SCENE_COUNT, SCENE_REGISTRY } from './SceneRegistry.js'

export const DIAGONAL_TRANSITION = {
  overscan: 0.002,
  slope: 0.34,
}

const OVERLAY_DOMINANCE_HYSTERESIS = 0.04
const SCENE_VISIBILITY_ENTER_THRESHOLD = 0.015
const SCENE_VISIBILITY_EXIT_THRESHOLD = 0.001
export const MINIMUM_TRANSITION_PROGRESS = 1e-6
export const SCENE_DOMINANCE_EXIT_EVENT = 'wheat:scene-dominance-exit'
export const SCENE_VISIBILITY_ENTER_EVENT = 'wheat:scene-visibility-enter'

export function createRenderTarget(name) {
  const target = new WebGLRenderTarget(1, 1, {
    depthBuffer: true,
    magFilter: LinearFilter,
    minFilter: LinearFilter,
    stencilBuffer: false,
  })

  target.texture.generateMipmaps = false
  target.texture.name = name
  return target
}

export function createSceneState(index) {
  return {
    current: {
      direction: 1,
      index,
      isActive: index < 2,
      isEntering: index === 1,
      isLeaving: false,
      leadingHoldProgress: 1,
      motionProgress: index === 0 ? 1 : 0,
      phase: index === 0 ? 'transition' : 'inactive',
      progress: index === 0 ? 1 : 0,
      sectionId: null,
      sectionIndex: -1,
      sectionProgress: index === 0 ? 1 : 0,
      transitionProgress: 0,
      transitionMotionOffset: 0,
      visibility: index === 0 ? 1 : 0,
    },
  }
}

export function updateSceneStates(sceneStateRefs, transition, direction, timeline) {
  sceneStateRefs.forEach((stateRef) => {
    const state = stateRef.current
    state.isActive = false
    state.isEntering = false
    state.isLeaving = false
    state.leadingHoldProgress = 1
    state.motionProgress = 0
    state.phase = 'inactive'
    state.progress = 0
    state.sectionId = null
    state.sectionIndex = -1
    state.sectionProgress = 0
    state.transitionProgress = 0
    state.transitionMotionOffset = 0
    state.visibility = 0
    state.direction = direction
  })

  const sceneA = sceneStateRefs[transition.currentIndex].current
  const sceneB = sceneStateRefs[transition.nextIndex].current
  const currentTimelineScene = timeline.scenes[transition.currentIndex]

  sceneA.isActive = true
  sceneA.leadingHoldProgress = transition.leadingHoldProgress
  sceneA.phase = transition.phase
  sceneA.visibility = 1 - transition.progress
  sceneA.progress = transition.sceneProgress
  sceneA.sectionId = transition.sectionId
  sceneA.sectionIndex = transition.sectionIndex
  sceneA.sectionProgress = transition.sectionProgress
  sceneA.transitionProgress = transition.progress
  applyOutgoingSceneMotion(
    sceneA,
    transition.phase,
    transition.sceneProgress,
    transition.progress,
    currentTimelineScene.transitionExitDistance,
  )

  const nextTimelineScene = timeline.scenes[transition.nextIndex]
  const firstNextSection = nextTimelineScene.sections[0] ?? null
  sceneB.isActive = transition.progress > MINIMUM_TRANSITION_PROGRESS
  sceneB.leadingHoldProgress = nextTimelineScene.leadingHoldLength > 0 ? 0 : 1
  sceneB.phase = transition.phase
  sceneB.visibility = transition.progress
  sceneB.progress = 0
  sceneB.sectionId = firstNextSection?.id ?? null
  sceneB.sectionIndex = firstNextSection?.index ?? -1
  sceneB.sectionProgress = 0
  sceneB.transitionProgress = transition.progress
  applyIncomingSceneMotion(
    sceneB,
    transition.phase,
    transition.progress,
    nextTimelineScene.transitionEntryDistance,
  )

  if (transition.phase !== 'transition') return

  if (direction >= 0) {
    sceneA.isLeaving = transition.progress > 0
    sceneB.isEntering = transition.progress > 0
  } else {
    sceneA.isEntering = transition.progress < 1
    sceneB.isLeaving = transition.progress < 1
  }
}

function getOverlayLayers(root, cache) {
  if (cache.root !== root) {
    cache.root = root
    cache.layers = [...root.querySelectorAll('[data-scene-layer]')]
    cache.layerVisibilityActive = cache.layers.map(() => undefined)
    cache.sections = cache.layers.map((layer) => (
      [...layer.querySelectorAll('[data-scene-section]')]
    ))
    cache.activeSectionIndices = cache.layers.map(() => -1)
    cache.announcer = root.querySelector('[data-scene-announcer]')
    cache.announcementKey = ''
    cache.pairKey = ''
    cache.dominantIndex = -1
  }

  return cache.layers
}

function updateDataset(element, key, value) {
  const nextValue = String(value)
  if (element.dataset[key] !== nextValue) element.dataset[key] = nextValue
}

function updateStyleProperty(element, property, value) {
  const nextValue = String(value)
  if (element.style.getPropertyValue(property) !== nextValue) {
    element.style.setProperty(property, nextValue)
  }
}

function updateOverlayLayerVisibility(cache, layer, index, visibility) {
  const wasVisible = cache.layerVisibilityActive[index]

  updateStyleProperty(layer, '--scene-visibility', visibility)

  if (visibility <= SCENE_VISIBILITY_EXIT_THRESHOLD) {
    cache.layerVisibilityActive[index] = false
    return
  }

  if (visibility < SCENE_VISIBILITY_ENTER_THRESHOLD) return

  cache.layerVisibilityActive[index] = true
  if (wasVisible !== false) return

  layer.dispatchEvent(new CustomEvent(SCENE_VISIBILITY_ENTER_EVENT, {
    detail: {
      sceneId: layer.dataset.sceneId,
      sceneIndex: index,
    },
  }))
}

function updateOverlaySection(cache, sceneIndex, requestedSectionIndex) {
  const sections = cache.sections[sceneIndex] ?? []
  if (sections.length === 0) return 0

  const sectionIndex = Math.max(
    0,
    Math.min(sections.length - 1, requestedSectionIndex),
  )
  if (cache.activeSectionIndices[sceneIndex] === sectionIndex) {
    return sectionIndex
  }

  sections.forEach((section, index) => {
    const active = index === sectionIndex
    section.inert = !active
    section.style.opacity = active ? '1' : '0'
    section.style.pointerEvents = active ? 'auto' : 'none'
    section.style.visibility = active ? 'visible' : 'hidden'
    section.setAttribute('aria-hidden', active ? 'false' : 'true')
  })
  cache.activeSectionIndices[sceneIndex] = sectionIndex
  return sectionIndex
}

export function updateOverlayLayers(root, cache, transition) {
  if (!root) return

  const layers = getOverlayLayers(root, cache)
  if (layers.length !== SCENE_COUNT) return

  const pairKey = `${transition.phase}:${transition.currentIndex}:${transition.nextIndex}`
  if (pairKey !== cache.pairKey) {
    layers.forEach((layer, index) => {
      const participates = index === transition.currentIndex
        || (
          transition.phase === 'transition'
          && index === transition.nextIndex
        )
      layer.style.visibility = participates ? 'visible' : 'hidden'
      if (!participates) {
        layer.style.clipPath = 'inset(100%)'
        updateOverlayLayerVisibility(cache, layer, index, 0)
      }
    })
    cache.pairKey = pairKey
  }

  const bounds = getDiagonalBounds(
    transition.progress,
    DIAGONAL_TRANSITION.slope,
    DIAGONAL_TRANSITION.overscan,
  )
  const leftScreenY = (1 - bounds.left) * 100
  const rightScreenY = (1 - bounds.right) * 100
  const sceneAClip = `polygon(0 0, 100% 0, 100% ${rightScreenY}%, 0 ${leftScreenY}%)`
  const sceneBClip = `polygon(0 ${leftScreenY}%, 100% ${rightScreenY}%, 100% 100%, 0 100%)`

  layers[transition.currentIndex].style.clipPath = sceneAClip
  layers[transition.nextIndex].style.clipPath = sceneBClip

  const currentSectionIndex = updateOverlaySection(
    cache,
    transition.currentIndex,
    transition.sectionIndex,
  )
  if (transition.phase === 'transition') {
    updateOverlaySection(cache, transition.nextIndex, 0)
  }

  const currentLayer = layers[transition.currentIndex]
  const nextLayer = layers[transition.nextIndex]
  const transitionMotionProgress = transition.phase === 'transition'
    ? transition.progress
    : 0
  const currentMotionOffset = transitionMotionProgress
  const nextMotionOffset = transition.phase === 'transition'
    ? transition.progress - 1
    : 0
  updateDataset(
    currentLayer,
    'sceneContentProgress',
    transition.sceneProgress.toFixed(4),
  )
  updateDataset(
    currentLayer,
    'transitionMotionOffset',
    currentMotionOffset.toFixed(4),
  )
  updateDataset(currentLayer, 'sectionId', transition.sectionId ?? '')
  updateDataset(currentLayer, 'sectionIndex', currentSectionIndex)
  updateDataset(
    currentLayer,
    'sectionProgress',
    transition.sectionProgress.toFixed(4),
  )
  updateStyleProperty(currentLayer, '--scene-progress', transition.sceneProgress)
  updateOverlayLayerVisibility(
    cache,
    currentLayer,
    transition.currentIndex,
    1 - transition.progress,
  )
  updateStyleProperty(currentLayer, '--section-progress', transition.sectionProgress)
  updateStyleProperty(
    currentLayer,
    '--transition-motion-y',
    `${currentMotionOffset * -4}vh`,
  )
  updateStyleProperty(
    currentLayer,
    '--scene-scroll-offset',
    `${transition.sceneProgress * -100}vh`,
  )
  updateDataset(nextLayer, 'sceneContentProgress', '0.0000')
  updateDataset(
    nextLayer,
    'transitionMotionOffset',
    nextMotionOffset.toFixed(4),
  )
  updateStyleProperty(nextLayer, '--scene-progress', 0)
  updateOverlayLayerVisibility(
    cache,
    nextLayer,
    transition.nextIndex,
    transition.progress,
  )
  updateStyleProperty(nextLayer, '--section-progress', 0)
  updateStyleProperty(
    nextLayer,
    '--transition-motion-y',
    `${nextMotionOffset * -4}vh`,
  )

  layers.forEach((layer, index) => {
    const [carouselStart, carouselEnd] = (
      GENETICS_SEED_TIMING.carouselRevealRange
    )
    const carouselProgress = index === transition.currentIndex
      && SCENE_REGISTRY[index].id === 'genetics'
      ? Math.max(
        0,
        Math.min(
          1,
          (transition.sceneProgress - carouselStart)
            / (carouselEnd - carouselStart),
        ),
      )
      : 0
    const carouselIsActive = index === transition.currentIndex
      && SCENE_REGISTRY[index].id === 'genetics'
      && transition.sceneProgress >= carouselStart
    updateDataset(
      layer,
      'seedCarouselActive',
      carouselIsActive ? 'true' : 'false',
    )
    updateStyleProperty(layer, '--seed-carousel-progress', carouselProgress)
    updateStyleProperty(
      layer,
      '--seed-carousel-offset',
      `${(1 - carouselProgress) * 1.5}rem`,
    )
  })

  const previousDominantParticipates = cache.dominantIndex === transition.currentIndex
    || cache.dominantIndex === transition.nextIndex
  let dominantIndex = previousDominantParticipates
    ? cache.dominantIndex
    : transition.progress < 0.5
      ? transition.currentIndex
      : transition.nextIndex

  if (
    dominantIndex === transition.currentIndex
    && transition.progress >= 0.5 + OVERLAY_DOMINANCE_HYSTERESIS
  ) {
    dominantIndex = transition.nextIndex
  } else if (
    dominantIndex === transition.nextIndex
    && transition.progress <= 0.5 - OVERLAY_DOMINANCE_HYSTERESIS
  ) {
    dominantIndex = transition.currentIndex
  }

  if (dominantIndex !== cache.dominantIndex) {
    const previousDominantIndex = cache.dominantIndex
    if (previousDominantIndex >= 0) {
      layers[previousDominantIndex].dispatchEvent(new CustomEvent(
        SCENE_DOMINANCE_EXIT_EVENT,
        {
          detail: {
            nextSceneId: SCENE_REGISTRY[dominantIndex].id,
            nextSceneIndex: dominantIndex,
            sceneId: SCENE_REGISTRY[previousDominantIndex].id,
            sceneIndex: previousDominantIndex,
          },
        },
      ))
    }

    layers.forEach((layer, index) => {
      const dominant = index === dominantIndex
      layer.inert = !dominant
      layer.style.pointerEvents = dominant ? 'auto' : 'none'
      layer.setAttribute('aria-hidden', dominant ? 'false' : 'true')
    })

    cache.dominantIndex = dominantIndex
  }

  const dominantSectionIndex = dominantIndex === transition.currentIndex
    ? currentSectionIndex
    : 0
  const dominantSections = cache.sections[dominantIndex] ?? []
  const dominantSection = dominantSections[dominantSectionIndex] ?? null
  const announcementKey = `${dominantIndex}:${dominantSectionIndex}`

  if (announcementKey !== cache.announcementKey) {
    if (cache.announcementKey && cache.announcer) {
      const sectionLabel = dominantSection?.dataset.sectionLabel
        ?? SCENE_REGISTRY[dominantIndex].label
      cache.announcer.textContent = dominantSections.length > 1
        ? `Scene ${dominantIndex + 1} of ${SCENE_COUNT}, section ${dominantSectionIndex + 1} of ${dominantSections.length}: ${sectionLabel}`
        : `Scene ${dominantIndex + 1} of ${SCENE_COUNT}: ${sectionLabel}`
    }
    cache.announcementKey = announcementKey
  }

  updateDataset(root, 'sceneA', transition.currentIndex)
  updateDataset(root, 'sceneB', transition.nextIndex)
  updateDataset(root, 'sceneContentProgress', transition.sceneProgress.toFixed(4))
  updateDataset(root, 'leadingHoldProgress', transition.leadingHoldProgress.toFixed(4))
  updateDataset(root, 'sceneProgress', transition.progress.toFixed(4))
  updateDataset(root, 'sectionId', transition.sectionId ?? '')
  updateDataset(root, 'sectionIndex', currentSectionIndex)
  updateDataset(root, 'sectionProgress', transition.sectionProgress.toFixed(4))
  updateDataset(root, 'timelineCycle', transition.cycleIndex)
  updateDataset(root, 'timelinePhase', transition.phase)
}
