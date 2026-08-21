import { compileSceneTimeline } from '../experience/sceneTimeline.js'

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
      transitionMotion: { entryDistance: 0.2, exitDistance: 0.2 },
      exitTransitionLength: 1,
    },
  },
  {
    id: 'genetics',
    timeline: {
      freeScroll: true,
      sections: [
        {
          description: 'Fibrous genetic strands exchange paths between two bundles.',
          id: 'overview',
          label: 'A diverse beginning',
          scrollLength: 4,
        },
      ],
      transitionMotion: { entryDistance: 0.2, exitDistance: 0.2 },
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
      transitionMotion: { entryDistance: 0.2, exitDistance: 0.2 },
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
          scrollLength: 1,
        },
      ],
      transitionMotion: { entryDistance: 0.2, exitDistance: 0.2 },
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
          scrollLength: 1,
        },
      ],
      transitionMotion: { entryDistance: 0.2, exitDistance: 0.2 },
      exitTransitionLength: 1,
    },
  },
]

export const SCENE_TIMELINE = compileSceneTimeline(SCENE_TIMELINE_CONFIG)
