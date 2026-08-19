import { LandingScene } from './scenes/LandingScene.jsx'
import DNAHelix from './scenes/dna/DNAHelix.jsx'
import { FieldTrialsScene } from './scenes/field/FieldTrialsScene.jsx'
import { PredictionScene } from './scenes/prediction/PredictionScene.jsx'
import { ResultScene } from './scenes/result/ResultScene.jsx'

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
    description: 'Fibrous genetic strands exchange paths between two bundles.',
    accent: '#c8dd6c',
    component: DNAHelix,
    camera: {
      fov: 42,
      position: [0, 0 , 6]
    },
    sceneProps: {
      background: '#160904',
      sectionBackgrounds: {
        overview: '#160904',
      },
      variant: 'genetics',
    },
  },
  {
    id: 'prediction',
    label: 'Narrowing the possibilities',
    chapter: 'Scene 3 · Prediction',
    description: 'Follow one selected wheat plant from its head to its roots.',
    accent: '#f0c45b',
    component: PredictionScene,
    camera: {
      fov: 38,
      position: [0, 3.4, 1.8],
    },
    sceneProps: {
      background: '#172316',
    },
  },
  {
    id: 'field',
    label: 'Testing, testing and more testing',
    chapter: 'Scene 4 · Testing',
    description: 'Expanded field trials compare candidates across many plots.',
    accent: '#d4d86e',
    component: FieldTrialsScene,
    camera: {
      fov: 38,
      position: [0, 8.2, 0],
    },
    sceneProps: {
      background: '#172315',
    },
  },
  {
    id: 'result',
    label: 'One grain makes it through',
    chapter: 'Scene 5 · Result',
    description: 'The final selected wheat grain emerges from the trial journey.',
    accent: '#efb44b',
    component: ResultScene,
    camera: {
      fov: 40,
      position: [0, 0, 6.8],
    },
    sceneProps: {
      background: '#14090d',
    },
  },
]

export const SCENE_COUNT = SCENE_REGISTRY.length
