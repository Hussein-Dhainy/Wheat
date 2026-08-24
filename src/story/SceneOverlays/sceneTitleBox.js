// Scene 3/4/5 each render one continuous, bold multi-line headline through
// TitleParticleText's own multi-line mode (a single particle/hover system
// spanning every line) rather than stacking independent single-line
// instances. This file measures each title's actual glyph widths so its
// SVG viewBox is sized correctly for whatever text it holds.
export const BOLD_TITLE_FONT_SIZE = 127
export const BOLD_TITLE_FONT_WEIGHT = 800
export const BOLD_TITLE_LETTER_SPACING = -3
export const BOLD_TITLE_LINE_HEIGHT = BOLD_TITLE_FONT_SIZE
const BOLD_TITLE_TOP_PADDING = 210
const BOLD_TITLE_BOTTOM_PADDING = 90
const BOLD_TITLE_HORIZONTAL_PADDING = 80

let titleMeasureCanvas = null

function measureTextWidth(text, fontSize, fontWeight, letterSpacing) {
  const fallbackWidth = text.length * fontSize * 0.62
  if (typeof document === 'undefined') return fallbackWidth

  titleMeasureCanvas ??= document.createElement('canvas')
  const context = titleMeasureCanvas.getContext('2d')
  if (!context) return fallbackWidth

  context.font = `${fontWeight} ${fontSize}px Inter, ui-sans-serif, system-ui, sans-serif`
  const hasLetterSpacing = 'letterSpacing' in context
  if (hasLetterSpacing) context.letterSpacing = `${letterSpacing}px`

  const glyphWidth = context.measureText(text).width
  const spacingWidth = hasLetterSpacing
    ? 0
    : letterSpacing * Math.max(text.length - 1, 0)

  return glyphWidth + spacingWidth
}

export function computeBoldTitleBox(lines) {
  const lineWidths = lines.map((line) => measureTextWidth(
    line,
    BOLD_TITLE_FONT_SIZE,
    BOLD_TITLE_FONT_WEIGHT,
    BOLD_TITLE_LETTER_SPACING,
  ))

  return {
    baseline: BOLD_TITLE_TOP_PADDING,
    viewBoxHeight: BOLD_TITLE_TOP_PADDING
      + (lines.length - 1) * BOLD_TITLE_LINE_HEIGHT
      + BOLD_TITLE_BOTTOM_PADDING,
    viewBoxWidth: Math.max(...lineWidths) + BOLD_TITLE_HORIZONTAL_PADDING * 2,
  }
}

export const PREDICTION_TITLE_LINE_TEXTS = ['WE TAKE IT TO', 'THE FIELD.']
export const PREDICTION_TITLE_BOX = computeBoldTitleBox(PREDICTION_TITLE_LINE_TEXTS)

export const FIELD_TITLE_LINE_TEXTS = ['TESTING, TESTING', 'AND MORE TESTING.']
export const FIELD_TITLE_BOX = computeBoldTitleBox(FIELD_TITLE_LINE_TEXTS)

export const RESULT_TITLE_LINE_TEXTS = ['ONE GRAIN MAKES IT', 'THROUGH.']
export const RESULT_TITLE_BOX = computeBoldTitleBox(RESULT_TITLE_LINE_TEXTS)
