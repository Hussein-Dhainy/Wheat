import { LandingScene } from './scenes/LandingScene.jsx'
import { PlaceholderScene } from './scenes/PlaceholderScene.jsx'

export const SCENE_REGISTRY = [
  {
    id: 'landing',
    label: 'Wheat. Reimagined.',
    chapter: 'The wheat journey',
    component: LandingScene,
    camera: {
      fov: 42,
      position: [0, 0, 9.5],
    },
  },
  {
    id: 'genetics',
    label: 'A diverse beginning',
    chapter: 'Scene 2 · Genetics',
    description: 'Placeholder geometry for the genetic-foundation scene.',
    accent: '#c8dd6c',
    component: PlaceholderScene,
    sceneProps: {
      background: '#0d3327',
      sectionBackgrounds: {
        overview: '#0d3327',
        variation: '#102d3b',
        selection: '#302816',
      },
      variant: 'genetics',
    },
  },
  {
    id: 'prediction',
    label: 'Narrowing the possibilities',
    chapter: 'Scene 3 · Prediction',
    description: 'Placeholder geometry for the predictive-selection scene.',
    accent: '#f0c45b',
    component: PlaceholderScene,
    sceneProps: {
      background: '#102c3b',
      variant: 'prediction',
    },
  },
  {
    id: 'field',
    label: 'Proven in the field',
    chapter: 'Scene 4 · Testing',
    description: 'Placeholder geometry for the real-world field scene.',
    accent: '#d4d86e',
    component: PlaceholderScene,
    sceneProps: {
      background: '#314214',
      variant: 'field',
    },
  },
  {
    id: 'result',
    label: 'One grain remains',
    chapter: 'Scene 5 · Result',
    description: 'Placeholder geometry for the final-grain scene.',
    accent: '#efb44b',
    component: PlaceholderScene,
    sceneProps: {
      background: '#35121d',
      variant: 'result',
    },
  },
]

export const SCENE_COUNT = SCENE_REGISTRY.length
