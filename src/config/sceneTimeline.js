import { compileSceneTimeline } from '../experience/sceneTimeline.js'
import { GENETICS_SEED_TIMING } from './geneticsSeeds.js'

// All lengths are virtual scroll units, not seconds. Section lengths control
// how much wheel/touch travel belongs to fully visible scene content. Exit
// transition lengths control only the diagonal wipe to the following scene.
// Leading holds add scroll padding before a scene's normal starting anchor.
export const SCENE_TIMELINE_CONFIG = [
  {
    id: 'landing',
    timeline: {
      leadingHoldLength: 0.75,
      sections: [],
      exitTransitionLength: 1,
    },
  },
  {
    id: 'genetics',
    timeline: {
      forwardExitResistance: 0.18,
      freeScroll: true,
      freeScrollSnapRanges: [
        {
          direction: 1,
          endProgress: GENETICS_SEED_TIMING.carouselRevealRange[1],
          id: 'seed-carousel-arrival',
          startProgress: GENETICS_SEED_TIMING.carouselRevealRange[0],
          targetProgress: GENETICS_SEED_TIMING.carouselRevealRange[1],
        },
      ],
      // Consume the upward input that first reaches the fully visible DNA.
      // A tiny additional upward push then releases back into Scene 1.
      reverseEntryResistance: 0.02,
      sections: [
        {
          description: 'Fibrous genetic strands exchange paths between two bundles.',
          id: 'overview',
          label: 'A diverse beginning',
          scrollLength: 4,
        },
      ],
      exitTransitionLength: 1,
    },
  },
  {
    id: 'prediction',
    timeline: {
      freeScroll: true,
      sections: [
        {
          description: 'Follow one selected wheat plant from its head to its roots.',
          id: 'hero-plant',
          label: 'Narrowing the possibilities',
          scrollLength: 3,
        },
      ],
      exitTransitionLength: 1,
    },
  },
  {
    id: 'field',
    timeline: {
      freeScroll: true,
      sections: [
        {
          description: 'Expanded field trials compare candidates across many plots.',
          id: 'aerial-field',
          label: 'Testing, testing and more testing',
          scrollLength: 2,
        },
      ],
      exitTransitionLength: 1,
    },
  },
  {
    id: 'result',
    timeline: {
      freeScroll: true,
      sections: [
        {
          description: 'The final grain and closing actions complete the wheat journey.',
          id: 'result-journey',
          label: 'One grain makes it through',
          scrollLength: 2,
        },
      ],
      exitTransitionLength: 1,
    },
  },
]

export const SCENE_TIMELINE = compileSceneTimeline(SCENE_TIMELINE_CONFIG)
