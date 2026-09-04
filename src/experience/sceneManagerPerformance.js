export const COMPOSITOR_RENDER_SCALE = 0.85

export function renderSceneForWarmup(renderer, scene, camera, renderTarget) {
  const culledRenderables = []

  scene.traverse((object) => {
    if (
      object.frustumCulled
      && (object.isMesh || object.isPoints || object.isLine)
    ) {
      culledRenderables.push(object)
      object.frustumCulled = false
    }
  })

  try {
    renderer.setRenderTarget(renderTarget)
    renderer.render(scene, camera)
  } finally {
    culledRenderables.forEach((object) => {
      object.frustumCulled = true
    })
  }
}

export function createWarmupTracker(requiredStages, onComplete) {
  const pendingStages = new Set(requiredStages)
  let completionReported = false

  return {
    markComplete(stage) {
      if (!pendingStages.delete(stage)) return false
      if (pendingStages.size > 0 || completionReported) return false

      completionReported = true
      onComplete?.()
      return true
    },
  }
}

function formatOverlayNumber(value) {
  return Number.isFinite(value) ? value.toFixed(4) : '0.0000'
}

export function createOverlayUpdateSignature(scroll, transition) {
  return [
    transition.phase,
    transition.currentIndex,
    transition.nextIndex,
    transition.sectionId ?? '',
    transition.sectionIndex,
    transition.cycleIndex,
    formatOverlayNumber(scroll.current),
    formatOverlayNumber(scroll.target),
    formatOverlayNumber(transition.progress),
    formatOverlayNumber(transition.sceneProgress),
    formatOverlayNumber(transition.leadingHoldProgress),
    formatOverlayNumber(transition.sectionProgress),
  ].join(':')
}

export function getCompositorRenderTargetSize(
  width,
  height,
  scale = COMPOSITOR_RENDER_SCALE,
) {
  const safeScale = Number.isFinite(scale)
    ? Math.max(0.5, Math.min(1, scale))
    : 1

  return {
    height: Math.max(1, Math.round(height * safeScale)),
    width: Math.max(1, Math.round(width * safeScale)),
  }
}
