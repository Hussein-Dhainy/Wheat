import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js'

// The optimized .glb files carry Draco-compressed geometry and KTX2/Basis
// textures, so GLTFLoader needs both side loaders attached before it can read
// them.
//
// Neither loader is given an explicit decoder path. Both resolve their own
// decoders with `new URL('../libs/...', import.meta.url)` (verified in the
// installed three 0.185.1), which Vite statically analyses and emits as
// hashed, self-hosted assets. Setting a path here would instead pin us to
// hand-copied files under public/ that go stale on a three upgrade without
// anything failing loudly. No CDN is involved either way.
//
// Both loaders are process-wide singletons. Each owns a worker pool, so
// building one per call site would multiply those workers across five scenes
// for no benefit.
let dracoLoader = null
let ktx2Loader = null
let supportDetectedFor = null

function getDRACOLoader() {
  if (!dracoLoader) {
    dracoLoader = new DRACOLoader()
  }
  return dracoLoader
}

function getKTX2Loader(gl) {
  if (!ktx2Loader) {
    ktx2Loader = new KTX2Loader()
  }

  // detectSupport picks the transcode target from the renderer's compressed
  // texture extensions, so it has to run against a real context and to re-run
  // if the context is ever replaced.
  if (supportDetectedFor !== gl) {
    ktx2Loader.detectSupport(gl)
    supportDetectedFor = gl
  }

  return ktx2Loader
}

// Pass to useLoader as its third argument:
//   useLoader(GLTFLoader, url, configureGLTFLoader(gl))
export function configureGLTFLoader(gl) {
  return (loader) => {
    loader.setDRACOLoader(getDRACOLoader())
    loader.setKTX2Loader(getKTX2Loader(gl))
  }
}

export function disposeGLTFAssetLoaders() {
  dracoLoader?.dispose()
  ktx2Loader?.dispose()
  dracoLoader = null
  ktx2Loader = null
  supportDetectedFor = null
}
