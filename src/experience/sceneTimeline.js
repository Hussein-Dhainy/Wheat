const DEFAULT_TRANSITION_LENGTH = 1
const SNAP_EPSILON = 1e-10

function assertFiniteNumber(value, name) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`${name} must be a finite number`)
  }
}

function assertPositiveLength(value, name) {
  assertFiniteNumber(value, name)
  if (value <= 0) throw new RangeError(`${name} must be greater than zero`)
}

function assertTimeline(timeline) {
  if (
    !timeline
    || !Array.isArray(timeline.segments)
    || !Array.isArray(timeline.scenes)
  ) {
    throw new TypeError('timeline must be a compiled scene timeline')
  }

  assertPositiveLength(timeline.cycleLength, 'timeline.cycleLength')
}

function positiveRemainder(value, divisor) {
  return ((value % divisor) + divisor) % divisor
}

export function compileSceneTimeline(registry) {
  if (!Array.isArray(registry) || registry.length < 2) {
    throw new RangeError('registry must contain at least two scenes')
  }

  const sceneIds = new Set()
  const scenes = []
  const segments = []
  const snapOffsets = []
  let cursor = 0

  registry.forEach((entry, sceneIndex) => {
    const sceneId = entry?.id
    if (typeof sceneId !== 'string' || sceneId.length === 0) {
      throw new TypeError(`registry[${sceneIndex}].id must be a nonempty string`)
    }
    if (sceneIds.has(sceneId)) {
      throw new RangeError(`duplicate scene id: ${sceneId}`)
    }
    sceneIds.add(sceneId)

    const timelineConfig = entry.timeline ?? {}
    const configuredSections = timelineConfig.sections ?? []
    if (!Array.isArray(configuredSections)) {
      throw new TypeError(`${sceneId}.timeline.sections must be an array`)
    }

    const exitTransitionLength = timelineConfig.exitTransitionLength
      ?? DEFAULT_TRANSITION_LENGTH
    assertPositiveLength(
      exitTransitionLength,
      `${sceneId}.timeline.exitTransitionLength`,
    )

    const sceneStart = cursor
    const sectionIds = new Set()
    const sections = []
    snapOffsets.push(sceneStart)

    configuredSections.forEach((section, sectionIndex) => {
      const sectionId = section?.id
      if (typeof sectionId !== 'string' || sectionId.length === 0) {
        throw new TypeError(
          `${sceneId}.timeline.sections[${sectionIndex}].id must be a nonempty string`,
        )
      }
      if (sectionIds.has(sectionId)) {
        throw new RangeError(`duplicate section id in ${sceneId}: ${sectionId}`)
      }
      sectionIds.add(sectionId)

      const scrollLength = section.scrollLength
      assertPositiveLength(
        scrollLength,
        `${sceneId}.${sectionId}.scrollLength`,
      )

      const start = cursor
      const end = start + scrollLength
      const compiledSection = Object.freeze({
        end,
        id: sectionId,
        index: sectionIndex,
        label: section.label ?? null,
        length: scrollLength,
        sceneIndex,
        start,
      })

      sections.push(compiledSection)
      segments.push(Object.freeze({
        ...compiledSection,
        type: 'section',
      }))
      if (sectionIndex > 0) snapOffsets.push(start)
      cursor = end
    })

    const contentLength = cursor - sceneStart
    const transitionStart = cursor
    const transitionEnd = transitionStart + exitTransitionLength
    segments.push(Object.freeze({
      currentIndex: sceneIndex,
      end: transitionEnd,
      length: exitTransitionLength,
      nextIndex: (sceneIndex + 1) % registry.length,
      start: transitionStart,
      type: 'transition',
    }))
    cursor = transitionEnd

    scenes.push(Object.freeze({
      contentLength,
      end: transitionEnd,
      exitTransitionLength,
      id: sceneId,
      index: sceneIndex,
      sections: Object.freeze(sections),
      start: sceneStart,
      transitionStart,
    }))
  })

  return Object.freeze({
    cycleLength: cursor,
    scenes: Object.freeze(scenes),
    segments: Object.freeze(segments),
    snapOffsets: Object.freeze(snapOffsets),
  })
}

export function resolveSceneTimeline(position, timeline, output = {}) {
  assertFiniteNumber(position, 'position')
  assertTimeline(timeline)

  let cycleIndex = Math.floor(position / timeline.cycleLength)
  let cyclePosition = positiveRemainder(position, timeline.cycleLength)

  // Avoid mapping a rounded cycle endpoint to the final segment.
  if (timeline.cycleLength - cyclePosition <= SNAP_EPSILON) {
    cycleIndex += 1
    cyclePosition = 0
  }

  let segmentIndex = -1
  for (let index = 0; index < timeline.segments.length; index += 1) {
    if (cyclePosition < timeline.segments[index].end) {
      segmentIndex = index
      break
    }
  }
  const segment = timeline.segments[
    segmentIndex >= 0 ? segmentIndex : timeline.segments.length - 1
  ]
  const segmentProgress = Math.min(
    1,
    Math.max(0, (cyclePosition - segment.start) / segment.length),
  )

  if (segment.type === 'transition') {
    const outgoingScene = timeline.scenes[segment.currentIndex]
    const outgoingSection = outgoingScene.sections.at(-1) ?? null

    output.currentIndex = segment.currentIndex
    output.cycleIndex = cycleIndex
    output.cyclePosition = cyclePosition
    output.nextIndex = segment.nextIndex
    output.phase = 'transition'
    output.progress = segmentProgress
    output.sceneProgress = 1
    output.sectionId = outgoingSection?.id ?? null
    output.sectionIndex = outgoingSection?.index ?? -1
    output.sectionProgress = 1
    output.segmentIndex = segmentIndex
    return output
  }

  const scene = timeline.scenes[segment.sceneIndex]
  const sceneProgress = scene.contentLength > 0
    ? (cyclePosition - scene.start) / scene.contentLength
    : 1

  output.currentIndex = segment.sceneIndex
  output.cycleIndex = cycleIndex
  output.cyclePosition = cyclePosition
  output.nextIndex = (segment.sceneIndex + 1) % timeline.scenes.length
  output.phase = 'section'
  output.progress = 0
  output.sceneProgress = Math.min(1, Math.max(0, sceneProgress))
  output.sectionId = segment.id
  output.sectionIndex = segment.index
  output.sectionProgress = segmentProgress
  output.segmentIndex = segmentIndex
  return output
}

function getPeriodicSnapCandidates(position, timeline) {
  assertFiniteNumber(position, 'position')
  assertTimeline(timeline)

  const baseCycle = Math.floor(position / timeline.cycleLength)
  const candidates = []

  for (let cycleOffset = -1; cycleOffset <= 1; cycleOffset += 1) {
    const cycleStart = (baseCycle + cycleOffset) * timeline.cycleLength
    timeline.snapOffsets.forEach((snapOffset) => {
      candidates.push(cycleStart + snapOffset)
    })
  }

  return candidates
}

export function getNearestSnapPosition(position, direction, timeline) {
  assertFiniteNumber(direction, 'direction')
  const candidates = getPeriodicSnapCandidates(position, timeline)
  let nearest = candidates[0]
  let nearestDistance = Math.abs(nearest - position)

  candidates.slice(1).forEach((candidate) => {
    const distance = Math.abs(candidate - position)
    const isCloser = distance < nearestDistance - SNAP_EPSILON
    const isDirectionalTie = Math.abs(distance - nearestDistance) <= SNAP_EPSILON
      && (direction < 0 ? candidate < nearest : candidate > nearest)

    if (isCloser || isDirectionalTie) {
      nearest = candidate
      nearestDistance = distance
    }
  })

  return nearest
}

export function getAdjacentSnapPosition(position, direction, timeline) {
  assertFiniteNumber(direction, 'direction')
  if (direction === 0) return position

  const stepDirection = Math.sign(direction)
  const candidates = getPeriodicSnapCandidates(position, timeline)
  const directionalCandidates = candidates.filter((candidate) => (
    stepDirection > 0
      ? candidate > position + SNAP_EPSILON
      : candidate < position - SNAP_EPSILON
  ))

  return stepDirection > 0
    ? Math.min(...directionalCandidates)
    : Math.max(...directionalCandidates)
}
