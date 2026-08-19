// The three scenes worth surfacing as headline "chapters" in the menu.
export const MENU_CHAPTERS = [
  { number: 1, sceneId: 'genetics', title: 'Genetics' },
  { number: 2, sceneId: 'prediction', title: 'Prediction' },
  { number: 3, sceneId: 'result', title: 'Result' },
]

// Secondary jump points shown as smaller actions alongside the chapters —
// the landing scene (entry point rather than a "chapter") and field trials
// (Scene 4, not numbered as a chapter but still worth a direct link).
export const MENU_SECONDARY_SCENES = [
  { label: 'Back to start', sceneId: 'landing' },
  { label: 'Field trials', sceneId: 'field' },
]
