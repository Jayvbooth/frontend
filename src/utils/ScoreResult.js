export const getAvailablePoints = chore => {
  const base = Number(chore?.points || 0)
  if (base <= 0) return 0
  if (chore?.timingMode === 'deadline' && chore?.earlyBonus) {
    return base + Math.round(base * 0.2)
  }
  return base
}

export const formatSignedPoints = value => {
  const number = Number(value || 0)
  return `${number > 0 ? '+' : ''}${number}`
}

export const getScoreBreakdown = score => {
  if (
    !score ||
    [score.basePoints, score.timingAdjustment, score.recoveryPoints].every(
      value => value === null || value === undefined,
    )
  ) {
    return []
  }
  return [
    ['base', Number(score.basePoints || 0)],
    ['timing', Number(score.timingAdjustment || 0)],
    ['recovery', Number(score.recoveryPoints || 0)],
  ].filter(([, value]) => value !== 0)
}

export const getScoreFeedback = (score, t) => {
  if (!score) return null
  const pieces = getScoreBreakdown(score).map(([key, value]) =>
    t(`scoring.breakdown.${key}`, { value: formatSignedPoints(value) }),
  )
  return t('scoring.completedFeedback', {
    total: formatSignedPoints(score.total),
    breakdown: pieces.join(' · '),
  })
}
