function createSeededRandom(seed) {
  let state = seed >>> 0

  return () => {
    state += 0x6d2b79f5
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

function parseHexColor(value) {
  const normalized = value.replace('#', '')
  const integer = Number.parseInt(normalized, 16)

  return [
    (integer >> 16) & 255,
    (integer >> 8) & 255,
    integer & 255,
  ]
}

export function createFieldTintData({
  gridSize,
  overrides = {},
  palette,
  seed,
}) {
  const [columns, rows] = gridSize
  const random = createSeededRandom(seed)
  const data = new Uint8Array(columns * rows * 4)
  const paletteIndices = new Uint8Array(columns * rows)

  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < columns; x += 1) {
      const plotIndex = y * columns + x
      const override = overrides[`${x},${y}`]
      const paletteIndex = Number.isInteger(override)
        ? Math.max(0, Math.min(palette.length - 1, override))
        : Math.floor(random() * palette.length)
      const [red, green, blue] = parseHexColor(palette[paletteIndex])
      const dataIndex = plotIndex * 4

      paletteIndices[plotIndex] = paletteIndex
      data[dataIndex] = red
      data[dataIndex + 1] = green
      data[dataIndex + 2] = blue
      data[dataIndex + 3] = 255
    }
  }

  return { data, paletteIndices }
}
