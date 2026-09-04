import { MENU_CHAPTERS } from '../../config/menuChapters.js'

function clamp01(value) {
  return Math.min(1, Math.max(0, value))
}

function positiveRemainder(value, divisor) {
  return ((value % divisor) + divisor) % divisor
}

function getChapterBoundary(scene, timeline) {
  const incomingTransition = timeline.segments.find((segment) => (
    segment.type === 'transition'
    && segment.nextIndex === scene.index
    && segment.end === scene.start
  ))

  return incomingTransition
    ? incomingTransition.start + incomingTransition.length * 0.5
    : scene.start
}

export function resolveChapterProgress(
  position,
  timeline,
  chapters = MENU_CHAPTERS,
) {
  if (!Number.isFinite(position) || !timeline?.cycleLength) {
    return { activeIndex: -1, progress: 0, visible: false }
  }

  const chapterRanges = chapters.map((chapter, index) => {
    const scene = timeline.scenes.find(({ id }) => id === chapter.sceneId)
    if (!scene) throw new RangeError(`Unknown chapter scene: ${chapter.sceneId}`)

    const nextChapter = chapters[index + 1]
    const nextScene = nextChapter
      ? timeline.scenes.find(({ id }) => id === nextChapter.sceneId)
      : null

    return {
      end: nextScene
        ? getChapterBoundary(nextScene, timeline)
        : timeline.cycleLength,
      start: getChapterBoundary(scene, timeline),
    }
  })
  const cyclePosition = positiveRemainder(position, timeline.cycleLength)
  const activeIndex = chapterRanges.findLastIndex(
    ({ start }) => cyclePosition >= start,
  )

  if (activeIndex < 0) {
    return { activeIndex: -1, progress: 0, visible: false }
  }

  const range = chapterRanges[activeIndex]
  return {
    activeIndex,
    progress: clamp01(
      (cyclePosition - range.start) / Math.max(0.000001, range.end - range.start),
    ),
    visible: true,
  }
}
