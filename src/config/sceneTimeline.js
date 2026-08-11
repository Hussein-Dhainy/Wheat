import { compileSceneTimeline } from '../experience/sceneTimeline.js'

// All lengths are virtual scroll units, not seconds. Section lengths control
// how much wheel/touch travel belongs to fully visible scene content. Exit
// transition lengths control only the diagonal wipe to the following scene.
export const SCENE_TIMELINE_CONFIG = [
  {
    id: 'landing',
    timeline: {
      sections: [],
      exitTransitionLength: 1,
    },
  },
  {
    id: 'genetics',
    timeline: {
      sections: [
        {
          description: 'Placeholder geometry for the genetic-foundation scene.',
          id: 'overview',
          label: 'A diverse beginning',
          scrollLength: 1,
        },
        {
          description: 'A scroll-driven placeholder for variation within the genetic library.',
          id: 'variation',
          label: 'Mapping hidden variation',
          scrollLength: 1,
        },
        {
          description: 'A scroll-driven placeholder for the lines that continue into prediction.',
          id: 'selection',
          label: 'Choosing promising lines',
          scrollLength: 1,
        },
      ],
      exitTransitionLength: 1,
    },
  },
  {
    id: 'prediction',
    timeline: {
      sections: [],
      exitTransitionLength: 1,
    },
  },
  {
    id: 'field',
    timeline: {
      sections: [],
      exitTransitionLength: 1,
    },
  },
  {
    id: 'result',
    timeline: {
      sections: [],
      exitTransitionLength: 1,
    },
  },
]

export const SCENE_TIMELINE = compileSceneTimeline(SCENE_TIMELINE_CONFIG)
