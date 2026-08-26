import assert from 'node:assert/strict'
import test from 'node:test'

import {
  formatSignedPoints,
  getAvailablePoints,
  getScoreBreakdown,
} from './ScoreResult.js'

test('available reward includes only the deadline early bonus', () => {
  assert.equal(
    getAvailablePoints({
      points: 10,
      timingMode: 'deadline',
      earlyBonus: true,
    }),
    12,
  )
  assert.equal(
    getAvailablePoints({ points: 10, timingMode: 'window', earlyBonus: true }),
    10,
  )
})

test('score breakdown preserves signed backend components', () => {
  assert.deepEqual(
    getScoreBreakdown({
      basePoints: 10,
      timingAdjustment: -4,
      recoveryPoints: 3,
      total: 9,
    }),
    [
      ['base', 10],
      ['timing', -4],
      ['recovery', 3],
    ],
  )
  assert.equal(formatSignedPoints(8), '+8')
  assert.equal(formatSignedPoints(-3), '-3')
})
