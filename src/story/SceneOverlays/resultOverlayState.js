export const RESULT_CLOSING_PROGRESS_THRESHOLD = 0.3

export function isResultClosingVisible(sectionProgress) {
  const progress = Number(sectionProgress)
  return Number.isFinite(progress)
    && progress >= RESULT_CLOSING_PROGRESS_THRESHOLD
}
