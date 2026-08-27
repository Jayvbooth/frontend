const ONE_DAY_MS = 24 * 60 * 60 * 1000
const PRIORITY_RANK = new Map([
  [1, 0],
  [2, 1],
  [3, 2],
  [4, 3],
  [0, 4],
])
const NON_ROUTINE_FREQUENCIES = new Set(['once', 'no_repeat', 'trigger'])
const ATTENTION_STATUSES = new Set([1, 2, 3])

const asDate = value => {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

const startOfLocalDay = value =>
  new Date(value.getFullYear(), value.getMonth(), value.getDate())

const endOfLocalDay = value =>
  new Date(
    value.getFullYear(),
    value.getMonth(),
    value.getDate(),
    23,
    59,
    59,
    999,
  )

export const isSameLocalDay = (left, right) => {
  const leftDate = asDate(left)
  const rightDate = asDate(right)
  if (!leftDate || !rightDate) return false
  return (
    startOfLocalDay(leftDate).getTime() === startOfLocalDay(rightDate).getTime()
  )
}

export const isRoutineTask = chore =>
  Boolean(
    chore?.frequencyType && !NON_ROUTINE_FREQUENCIES.has(chore.frequencyType),
  )

const priorityRank = chore =>
  PRIORITY_RANK.get(Number(chore?.priority || 0)) ?? 4

const compareStable = (left, right) => {
  const leftName = String(left?.name || '')
  const rightName = String(right?.name || '')
  const byName = leftName.localeCompare(rightName)
  if (byName !== 0) return byName
  return String(left?.id ?? '').localeCompare(String(right?.id ?? ''))
}

const compareByDueAndPriority = (left, right, now) => {
  const leftDue = asDate(left?.nextDueDate)
  const rightDue = asDate(right?.nextDueDate)
  const todayEnd = endOfLocalDay(now).getTime()
  const horizonEnd = todayEnd + 7 * ONE_DAY_MS

  const dateRank = due => {
    if (!due) return 3
    if (due.getTime() <= todayEnd) return 0
    if (due.getTime() <= horizonEnd) return 1
    return 2
  }

  const byDateBand = dateRank(leftDue) - dateRank(rightDue)
  if (byDateBand !== 0) return byDateBand

  const byPriority = priorityRank(left) - priorityRank(right)
  if (byPriority !== 0) return byPriority

  const leftTime = leftDue?.getTime() ?? Number.POSITIVE_INFINITY
  const rightTime = rightDue?.getTime() ?? Number.POSITIVE_INFINITY
  if (leftTime !== rightTime) return leftTime - rightTime

  return compareStable(left, right)
}

const uniqueTasks = chores => {
  const seen = new Set()
  return (chores || []).filter(chore => {
    if (!chore) return false
    if (chore.id === null || chore.id === undefined) return true
    const key = String(chore.id)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

const hasPriority = chore => Number(chore?.priority || 0) > 0

const isPriorityCandidate = (chore, now) => {
  const due = asDate(chore?.nextDueDate)
  if (hasPriority(chore)) return true
  if (!due) return false
  return due.getTime() <= endOfLocalDay(now).getTime() + 7 * ONE_DAY_MS
}

/**
 * Build the focused Today surface without creating a second task model.
 * Sections are exclusive. Every priority task that misses the top-three cut
 * remains visible under flexible work, while ordinary future work stays in the
 * full task database.
 */
export const selectTodayTasks = (chores, nowValue = new Date()) => {
  const now = asDate(nowValue) || new Date()
  const todayEnd = endOfLocalDay(now).getTime()
  const tasks = uniqueTasks(chores)
  const claimed = new Set()
  const taskKey = chore =>
    chore.id !== null && chore.id !== undefined ? `id:${chore.id}` : chore
  const claim = chore => claimed.add(taskKey(chore))
  const isClaimed = chore => claimed.has(taskKey(chore))

  const urgent = tasks
    .filter(chore => {
      const due = asDate(chore.nextDueDate)
      return ATTENTION_STATUSES.has(Number(chore.status)) || (due && due < now)
    })
    .sort((left, right) => compareByDueAndPriority(left, right, now))
  urgent.forEach(claim)

  const routines = tasks
    .filter(
      chore =>
        !isClaimed(chore) &&
        isRoutineTask(chore) &&
        isSameLocalDay(chore.nextDueDate, now),
    )
    .sort((left, right) => compareByDueAndPriority(left, right, now))
  routines.forEach(claim)

  const priorities = tasks
    .filter(chore => !isClaimed(chore) && isPriorityCandidate(chore, now))
    .sort((left, right) => compareByDueAndPriority(left, right, now))
    .slice(0, 3)
  priorities.forEach(claim)

  const flexible = tasks
    .filter(chore => {
      if (isClaimed(chore)) return false
      const due = asDate(chore.nextDueDate)
      return !due || due.getTime() <= todayEnd || hasPriority(chore)
    })
    .sort((left, right) => compareByDueAndPriority(left, right, now))
  flexible.forEach(claim)

  return {
    urgent,
    priorities,
    routines,
    flexible,
    laterCount: tasks.length - claimed.size,
    visibleCount: claimed.size,
  }
}
