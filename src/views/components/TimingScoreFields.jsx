import { Box, Option, Select, Switch, Typography } from '@mui/joy'
import { useTranslation } from 'react-i18next'

const MODES = ['untimed', 'today', 'deadline', 'window']

const TimingScoreFields = ({
  completionWindow,
  earlyBonus,
  hasDueDate,
  onCompletionWindowChange,
  onEarlyBonusChange,
  onTimingModeChange,
  timingMode = 'untimed',
}) => {
  const { t } = useTranslation('chores')

  const handleModeChange = (_, nextMode) => {
    if (!nextMode) return
    onTimingModeChange(nextMode)
    if (nextMode !== 'deadline') onEarlyBonusChange(false)
    if (nextMode === 'window' && completionWindow <= 0) {
      onCompletionWindowChange(1)
    }
  }

  return (
    <Box sx={{ py: 0.75 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: { xs: 'flex-start', sm: 'center' },
          justifyContent: 'space-between',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 1,
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography level='body-sm' fontWeight='md'>
            {t('scoring.timingMode')}
          </Typography>
          <Typography
            level='body-xs'
            textColor='text.tertiary'
            sx={{ mt: 0.25 }}
          >
            {t(`scoring.modes.${timingMode}.description`)}
          </Typography>
        </Box>
        <Select
          size='sm'
          value={timingMode}
          onChange={handleModeChange}
          sx={{ minWidth: 170 }}
        >
          {MODES.map(mode => (
            <Option
              key={mode}
              value={mode}
              disabled={mode !== 'untimed' && !hasDueDate}
            >
              {t(`scoring.modes.${mode}.label`)}
            </Option>
          ))}
        </Select>
      </Box>

      {timingMode === 'deadline' && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
            pt: 1,
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography level='body-sm' fontWeight='md'>
              {t('scoring.earlyBonus')}
            </Typography>
            <Typography
              level='body-xs'
              textColor='text.tertiary'
              sx={{ mt: 0.25 }}
            >
              {t('scoring.earlyBonusDescription')}
            </Typography>
          </Box>
          <Switch
            size='sm'
            checked={earlyBonus}
            onChange={event => onEarlyBonusChange(event.target.checked)}
          />
        </Box>
      )}
    </Box>
  )
}

export default TimingScoreFields
