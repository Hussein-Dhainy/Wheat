import { useEffect, useState } from 'react'
import { TitleParticleText } from '../components/TitleParticleText/TitleParticleText.jsx'

// Shared sizing for every stacked-line particle title below — same
// "weight" across scenes. Each scene's title wraps across multiple lines
// (matching how it already wrapped as plain text), and TitleParticleText
// only handles a single line, so each line is its own instance stacked in
// a column; a single visually-hidden real heading carries the full
// accessible text per scene.
const SCENE_TITLE_FONT_SIZE = 110
const SCENE_TITLE_VIEWBOX_HEIGHT = 260
const SCENE_TITLE_BASELINE = 181
const SCENE_TITLE_LETTER_SPACING = -2
const SCENE_TITLE_UNIT_TO_REM = 0.04545
const MOBILE_SCENE_TITLE_SCALE = 0.68
// Room on each line's box for the particle hover effect (see
// TitleParticleText's own clip-radius math) so adjacent stacked lines don't
// visually collide when the cursor sits near a line's edge.
const SCENE_TITLE_HORIZONTAL_PADDING = 140

let sceneTitleMeasureCanvas = null

// Each line's box width is measured from the actual rendered text rather
// than hand-picked per font, so the stacked-title layout stays correct no
// matter which font ends up on SCENE_TITLE_FONT_SIZE.
function measureSceneTitleWidth(text) {
  const fallbackWidth = text.length * SCENE_TITLE_FONT_SIZE * 0.62 + SCENE_TITLE_HORIZONTAL_PADDING
  if (typeof document === 'undefined') return fallbackWidth

  sceneTitleMeasureCanvas ??= document.createElement('canvas')
  const context = sceneTitleMeasureCanvas.getContext('2d')
  if (!context) return fallbackWidth

  context.font = `400 ${SCENE_TITLE_FONT_SIZE}px Inter, ui-sans-serif, system-ui, sans-serif`
  const hasLetterSpacing = 'letterSpacing' in context
  if (hasLetterSpacing) context.letterSpacing = `${SCENE_TITLE_LETTER_SPACING}px`

  const glyphWidth = context.measureText(text).width
  const spacingWidth = hasLetterSpacing
    ? 0
    : SCENE_TITLE_LETTER_SPACING * Math.max(text.length - 1, 0)

  return glyphWidth + spacingWidth + SCENE_TITLE_HORIZONTAL_PADDING
}

function toTitleLine(text) {
  return { text, viewBoxWidth: measureSceneTitleWidth(text) }
}

export const PREDICTION_TITLE_LINES = ['THE FIELD', 'IS THE', 'REAL TEST.'].map(toTitleLine)
export const FIELD_TITLE_LINES = ['TESTING,', 'TESTING', 'AND MORE', 'TESTING'].map(toTitleLine)
export const RESULT_TITLE_LINES = ['ONE GRAIN', 'MAKES IT', 'THROUGH.'].map(toTitleLine)

function getSceneTitleMediaQuery() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return null
  return window.matchMedia('(max-width: 759px)')
}

export function SceneTitleLines({ className, lines, textColor }) {
  const [isCompact, setIsCompact] = useState(() => getSceneTitleMediaQuery()?.matches ?? false)
  const titleScale = isCompact ? MOBILE_SCENE_TITLE_SCALE : 1

  useEffect(() => {
    const mediaQuery = getSceneTitleMediaQuery()
    if (!mediaQuery) return undefined

    const updateScale = () => setIsCompact(mediaQuery.matches)

    updateScale()
    mediaQuery.addEventListener('change', updateScale)
    return () => mediaQuery.removeEventListener('change', updateScale)
  }, [])

  return (
    <div className={className} aria-hidden="true">
      {lines.map((line, index) => (
        <TitleParticleText
          baseline={SCENE_TITLE_BASELINE * titleScale}
          fontSize={SCENE_TITLE_FONT_SIZE * titleScale}
          key={`${line.text}-${index}`}
          letterSpacing={SCENE_TITLE_LETTER_SPACING * titleScale}
          seed={6197 + index}
          style={{ width: `${line.viewBoxWidth * SCENE_TITLE_UNIT_TO_REM * titleScale}rem` }}
          text={line.text}
          textColor={textColor}
          viewBoxHeight={SCENE_TITLE_VIEWBOX_HEIGHT * titleScale}
          viewBoxWidth={line.viewBoxWidth * titleScale}
        />
      ))}
    </div>
  )
}
