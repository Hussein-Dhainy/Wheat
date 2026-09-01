// Which copy of the 3D assets the experience loads.
//
// `public/models/` holds the uncompressed source exports. `public/models-ktx2/`
// holds the KTX2 + Draco versions produced by `node scripts/optimize-models.mjs`,
// which mirrors the source layout exactly -- including the standalone textures,
// copied through untouched -- so the two directories are interchangeable and
// only this constant chooses between them.
//
// Point it back at '/models' to load the uncompressed originals, which is the
// quickest way to A/B a suspected compression artifact.
export const ASSET_BASE = '/models-ktx2'

export function assetUrl(path) {
  return `${ASSET_BASE}/${path}`
}
