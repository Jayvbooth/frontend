import assert from 'node:assert/strict'
import test from 'node:test'

import { isRoutineTask, selectTodayTasks } from './Today.js'

const now = new Date(2026, 7, 27, 16, 0, 0)
const at = (dayOffset, hour = 12) =>
  new Date(2026, 7, 27 + dayOffset, hour, 0, 0).toISOString()
const task = (id, overrides = {}) => ({
  id,
  name: `Task ${id}`,
  frequencyType: 'once',
  nextDueDate: null,
  priority: 0,
  status: 0,
  ...overrides,
})

const ids = chores => chores.map(chore => chore.id)

test('attention collects overdue, active, paused, and pending tasks', () => {
  const result = selectTodayTasks(
    [
      task(1, { nextDueDate: at(0, 10) }),
      task(2, { status: 1 }),
      task(3, { status: 2 }),
      task(4, { status: 3 }),
      task(5, { nextDueDate: at(0, 20) }),
    ],
    now,
  )

  assert.deepEqual(new Set(ids(result.urgent)), new Set([1, 2, 3, 4]))
  assert.equal(ids(result.urgent).includes(5), false)
})

test('only recurring work due today enters the routine section', () => {
  const dueRoutine = task(1, {
    frequencyType: 'daily',
    nextDueDate: at(0, 20),
  })
  const futureRoutine = task(2, {
    frequencyType: 'weekly',
    nextDueDate: at(1, 12),
  })
  const oneTime = task(3, { nextDueDate: at(0, 20) })

  const result = selectTodayTasks([dueRoutine, futureRoutine, oneTime], now)

  assert.equal(isRoutineTask(dueRoutine), true)
  assert.equal(isRoutineTask(task(4, { frequencyType: 'trigger' })), false)
  assert.deepEqual(ids(result.routines), [1])
})

test('top priorities are capped at three and use due bands before priority', () => {
  const result = selectTodayTasks(
    [
      task(1, { nextDueDate: at(1), priority: 1 }),
      task(2, { nextDueDate: at(0, 20), priority: 3 }),
      task(3, { nextDueDate: at(2), priority: 2 }),
      task(4, { priority: 1 }),
    ],
    now,
  )

  assert.deepEqual(ids(result.priorities), [2, 1, 3])
})

test('urgent tasks and due routines never duplicate into priorities', () => {
  const result = selectTodayTasks(
    [
      task(1, { nextDueDate: at(0, 10), priority: 1 }),
      task(2, {
        frequencyType: 'daily',
        nextDueDate: at(0, 20),
        priority: 1,
      }),
      task(3, { nextDueDate: at(1), priority: 2 }),
    ],
    now,
  )

  assert.deepEqual(ids(result.urgent), [1])
  assert.deepEqual(ids(result.routines), [2])
  assert.deepEqual(ids(result.priorities), [3])
})

test('priority overflow remains visible as flexible work', () => {
  const result = selectTodayTasks(
    [1, 2, 3, 4].map(id => task(id, { nextDueDate: at(id), priority: id })),
    now,
  )

  assert.equal(result.priorities.length, 3)
  assert.deepEqual(ids(result.flexible), [4])
})

test('flexible work keeps today, undated, and priority overflow but omits ordinary future work', () => {
  const result = selectTodayTasks(
    [
      task(1, { nextDueDate: at(0, 20) }),
      task(2),
      task(3, { nextDueDate: at(14), priority: 1 }),
      task(4, { nextDueDate: at(14) }),
      task(5, { nextDueDate: at(1) }),
      task(6, { nextDueDate: at(2) }),
      task(7, { nextDueDate: at(3) }),
      task(8, { nextDueDate: at(4) }),
    ],
    now,
  )

  assert.deepEqual(ids(result.priorities), [1, 5, 6])
  assert.deepEqual(new Set(ids(result.flexible)), new Set([2, 3]))
  assert.equal(result.laterCount, 3)
})

test('duplicate task ids are assigned once across the full Today surface', () => {
  const duplicate = task(1, { nextDueDate: at(0, 10), priority: 1 })
  const result = selectTodayTasks([duplicate, { ...duplicate }], now)
  const allIds = [
    ...ids(result.urgent),
    ...ids(result.priorities),
    ...ids(result.routines),
    ...ids(result.flexible),
  ]

  assert.deepEqual(allIds, [1])
  assert.equal(result.visibleCount, 1)
  assert.equal(result.laterCount, 0)
})
