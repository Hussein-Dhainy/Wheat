import test from 'node:test'
import assert from 'node:assert/strict'

import {
  RESULT_CLOSING_PROGRESS_THRESHOLD,
  isResultClosingVisible,
} from '../src/story/SceneOverlays/resultOverlayState.js'

test('result closing visibility crosses at the configured section progress', () => {
  assert.equal(RESULT_CLOSING_PROGRESS_THRESHOLD, 0.3)
  assert.equal(isResultClosingVisible('0.2999'), false)
  assert.equal(isResultClosingVisible('0.3000'), true)
  assert.equal(isResultClosingVisible(undefined), false)
})
