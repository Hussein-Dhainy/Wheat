// Compresses the source .glb models into KTX2 + Draco versions.
//
// Reads from public/models/ and writes to public/models-ktx2/, mirroring the
// directory layout so a model's URL only changes by its base directory. The
// source files are never modified, so this is safe to re-run and safe to
// abandon: flipping ASSET_BASE in src/config/assetBase.js back to the source
// directory restores the previous behaviour exactly.
//
// Requires:
//   - @gltf-transform/cli   (devDependency)
//   - KTX-Software          (native, provides `ktx`/`toktx`; see README notes)
//
// Usage: node scripts/optimize-models.mjs [--only <substring>]

import { execFileSync } from 'node:child_process'
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
} from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
// Invoked directly rather than through npx: npx.cmd is a shell script that
// execFileSync cannot spawn on Windows without shell:true, and going straight
// to the entry point also skips a process launch per stage.
const GLTF_TRANSFORM_CLI = join(
  ROOT, 'node_modules', '@gltf-transform', 'cli', 'bin', 'cli.js',
)
const SOURCE_DIR = join(ROOT, 'public', 'models')
const OUTPUT_DIR = join(ROOT, 'public', 'models-ktx2')

// Default location of the KTX-Software binaries on Windows. The encoder is a
// native install rather than an npm package, and a shell opened before that
// install will not have picked up the PATH entry it adds, so we look here too.
const KTX_BIN_DIRS = [
  'C:\\Program Files\\KTX-Software\\bin',
  '/usr/local/bin',
]

// ETC1S is small and cheap but, being a luma+chroma scheme, can visibly
// artifact on normal maps. Models the camera actually gets close to keep their
// normal map in UASTC (larger download, better surface detail); distant models
// take ETC1S throughout, where the difference cannot be resolved on screen.
const CLOSE_UP = 'close-up'
const DISTANT = 'distant'

const MODELS = [
  { file: 'wheat.glb', treatment: CLOSE_UP, note: 'landing hero' },
  { file: 'genetics/EditedWheatSeeds.glb', treatment: CLOSE_UP, note: 'genetics seeds' },
  { file: 'prediction/PredictionWheat.glb', treatment: CLOSE_UP, note: 'prediction hero' },
  { file: 'prediction/PredictionWheat_LOD1.glb', treatment: DISTANT, note: 'far field' },
  { file: 'prediction/PredictionWheat_LOD2.glb', treatment: DISTANT, note: 'near field' },
  { file: 'result/ResultSeedOptimized.glb', treatment: CLOSE_UP, note: 'result grain' },
]

// Standalone textures -- the ones loaded through TextureLoader rather than
// embedded in a .glb. They are resized here rather than copied through.
//
// The ground maps tile 54x88 times across a flat backdrop quad that is itself
// rendered into a blurred target at ~0.36 resolution scale, so a single tile
// never covers more than a sliver of an already-soft buffer. 1024 is far more
// texel density than that arrangement can resolve; ambientCG does not publish
// Ground048 below 1K, so the downscale happens here.
const COLOUR = 'colour'
const NORMAL = 'normal'

// Present in the source export but no longer requested by any code path, so
// copying them into the shipped directory would be dead weight. They stay in
// public/models/ as part of the original Ground048 set.
const UNUSED_SOURCE_FILES = [
  'prediction/ground/Ground048_1K-JPG_Displacement.jpg',
  'prediction/ground/Ground048_1K-JPG_Roughness.jpg',
]

const TEXTURES = [
  {
    file: 'prediction/ground/Ground048_1K-JPG_Color.jpg',
    note: 'ground colour',
    size: 256,
    treatment: COLOUR,
  },
  {
    file: 'prediction/ground/Ground048_1K-JPG_NormalGL.jpg',
    note: 'ground normal',
    size: 256,
    treatment: NORMAL,
  },
]

function withKtxOnPath() {
  const extra = KTX_BIN_DIRS.filter((dir) => existsSync(dir))
  const separator = process.platform === 'win32' ? ';' : ':'
  return { ...process.env, PATH: [...extra, process.env.PATH].join(separator) }
}

function runGltfTransform(args, env) {
  execFileSync(
    process.execPath,
    [GLTF_TRANSFORM_CLI, ...args],
    { cwd: ROOT, env, stdio: ['ignore', 'pipe', 'pipe'] },
  )
}

function kilobytes(path) {
  return statSync(path).size / 1024
}

function formatSize(kb) {
  return kb >= 1024 ? `${(kb / 1024).toFixed(2)} MB` : `${kb.toFixed(0)} KB`
}

function compress(model, env) {
  const source = join(SOURCE_DIR, model.file)
  const destination = join(OUTPUT_DIR, model.file)
  mkdirSync(dirname(destination), { recursive: true })

  const stages = []
  if (model.treatment === CLOSE_UP) {
    stages.push([
      'uastc', '--slots', 'normalTexture',
      '--level', '4', '--rdo', '4', '--zstd', '18',
    ])
    stages.push([
      'etc1s', '--slots', '{baseColorTexture,metallicRoughnessTexture}',
      '--quality', '200',
    ])
  } else {
    stages.push(['etc1s', '--quality', '200'])
  }
  stages.push(['draco'])

  // Each stage reads the previous stage's output. Intermediates land beside the
  // destination and are removed once the final file is in place. Every one of
  // them must keep a .glb extension: gltf-transform picks its output format
  // from the extension, and an unrecognised one silently yields a stub file.
  let input = source
  const intermediates = []
  const finalTemporary = `${destination}.tmp.glb`
  stages.forEach(([command, ...options], index) => {
    const isLast = index === stages.length - 1
    const output = isLast
      ? finalTemporary
      : `${destination}.stage${index}.glb`
    runGltfTransform([command, input, output, ...options], env)
    if (!isLast) intermediates.push(output)
    input = output
  })

  intermediates.forEach((path) => rmSync(path, { force: true }))
  rmSync(destination, { force: true })
  renameSync(finalTemporary, destination)

  return { after: kilobytes(destination), before: kilobytes(source) }
}

// sRGB is a non-linear encoding, so averaging encoded values while downscaling
// darkens the result -- measured at mean 4/255 and max 40/255 on this texture,
// which is a visible shift rather than a theoretical one. Resampling in scRGB
// (linear light) and converting back afterwards is the correct order.
async function resizeColourTexture(source, destination, size) {
  await sharp(source)
    .pipelineColourspace('scrgb')
    .resize(size, size, { kernel: 'lanczos3' })
    .toColourspace('srgb')
    .jpeg({ chromaSubsampling: '4:4:4', quality: 90 })
    .toFile(destination)
}

// A normal map stores vectors, not colour, so it must NOT be gamma-converted
// on the way through. It does need renormalising afterwards: averaging
// neighbouring unit vectors produces shorter, non-unit ones, which tilts
// shading slightly flat. Chroma subsampling stays off for the same reason --
// the three channels are independent vector components, not luma and chroma.
async function resizeNormalTexture(source, destination, size) {
  const { data, info } = await sharp(source)
    .resize(size, size, { kernel: 'lanczos3' })
    .raw()
    .toBuffer({ resolveWithObject: true })

  for (let offset = 0; offset < data.length; offset += info.channels) {
    const x = (data[offset] / 255) * 2 - 1
    const y = (data[offset + 1] / 255) * 2 - 1
    const z = (data[offset + 2] / 255) * 2 - 1
    const length = Math.hypot(x, y, z) || 1
    data[offset] = Math.round(((x / length) * 0.5 + 0.5) * 255)
    data[offset + 1] = Math.round(((y / length) * 0.5 + 0.5) * 255)
    data[offset + 2] = Math.round(((z / length) * 0.5 + 0.5) * 255)
  }

  await sharp(data, {
    raw: { channels: info.channels, height: info.height, width: info.width },
  })
    .jpeg({ chromaSubsampling: '4:4:4', quality: 92 })
    .toFile(destination)
}

async function resizeTexture(texture) {
  const source = join(SOURCE_DIR, texture.file)
  const destination = join(OUTPUT_DIR, texture.file)
  mkdirSync(dirname(destination), { recursive: true })

  if (texture.treatment === NORMAL) {
    await resizeNormalTexture(source, destination, texture.size)
  } else {
    await resizeColourTexture(source, destination, texture.size)
  }

  return { after: kilobytes(destination), before: kilobytes(source) }
}

function copyUncompressedAssets() {
  // Anything that is not a .glb (the standalone textures) is copied through
  // untouched, so the output directory is a complete drop-in replacement.
  const copied = []
  const walk = (directory) => {
    readdirSync(directory, { withFileTypes: true }).forEach((entry) => {
      const path = join(directory, entry.name)
      if (entry.isDirectory()) return walk(path)
      if (path.endsWith('.glb')) return undefined
      // Textures with their own treatment above must not be overwritten by a
      // copy of the full-size original. TEXTURES uses forward slashes, so the
      // platform separator has to be normalised before comparing.
      const fromSource = relative(SOURCE_DIR, path).split(sep).join('/')
      if (TEXTURES.some((texture) => texture.file === fromSource)) return undefined
      if (UNUSED_SOURCE_FILES.includes(fromSource)) return undefined

      const destination = join(OUTPUT_DIR, relative(SOURCE_DIR, path))
      mkdirSync(dirname(destination), { recursive: true })
      copyFileSync(path, destination)
      copied.push(relative(SOURCE_DIR, path))
      return undefined
    })
  }
  walk(SOURCE_DIR)
  return copied
}

async function main() {
  const onlyIndex = process.argv.indexOf('--only')
  const only = onlyIndex === -1 ? null : process.argv[onlyIndex + 1]
  const env = withKtxOnPath()

  try {
    execFileSync('ktx', ['--version'], { env, stdio: 'ignore' })
  } catch {
    console.error(
      'KTX-Software not found. Install it from\n'
      + '  https://github.com/KhronosGroup/KTX-Software/releases\n'
      + 'and make sure `ktx` is on PATH (a shell opened before the install\n'
      + 'will not have it; open a new one).',
    )
    process.exit(1)
  }

  const selected = only
    ? MODELS.filter((model) => model.file.includes(only))
    : MODELS
  if (selected.length === 0) {
    console.error(`No model matched --only ${only}`)
    process.exit(1)
  }

  let totalBefore = 0
  let totalAfter = 0

  selected.forEach((model) => {
    process.stdout.write(`${model.file} (${model.note}, ${model.treatment}) ... `)
    const { after, before } = compress(model, env)
    totalBefore += before
    totalAfter += after
    const saved = ((1 - after / before) * 100).toFixed(0)
    console.log(`${formatSize(before)} -> ${formatSize(after)} (-${saved}%)`)
  })

  for (const texture of TEXTURES) {
    process.stdout.write(`${texture.file} (${texture.note}, ${texture.treatment} -> ${texture.size}px) ... `)
    const { after, before } = await resizeTexture(texture)
    totalBefore += before
    totalAfter += after
    console.log(`${formatSize(before)} -> ${formatSize(after)} (-${((1 - after / before) * 100).toFixed(0)}%)`)
  }

  const copied = copyUncompressedAssets()
  if (copied.length > 0) {
    console.log(`\ncopied through unchanged: ${copied.length} non-.glb file(s)`)
  }

  console.log(
    `\ntotal: ${formatSize(totalBefore)} -> ${formatSize(totalAfter)} `
    + `(-${((1 - totalAfter / totalBefore) * 100).toFixed(0)}%)`,
  )
}

main()
