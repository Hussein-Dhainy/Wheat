export const PRELOADER_DELAY_ENABLED = true
// Small floor only, so the preloader never flashes for a single frame on a
// warm cache. Real completion is gated on actual asset progress, not a fake
// wait — see useAssetLoadingProgress.
export const PRELOADER_MINIMUM_VISIBLE_MS = 400
// The logo's draw-in intro (see Logo.jsx/Logo.module.css) is a fixed ~1.55s
// animation. On a fast or cached load the preloader could otherwise fade
// out mid-draw; this floor lets the intro always finish before exit is
// possible. Reduced-motion users skip the animation entirely, so they use
// the shorter floor above instead.
export const PRELOADER_INTRO_MINIMUM_MS = 1750
// Fail-safe: if an asset errors out and never reports completion, don't
// trap the user behind the preloader forever.
export const ASSET_LOAD_TIMEOUT_MS = 20000
