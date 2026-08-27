import {
  Add,
  CalendarToday,
  CloudOff,
  Flag,
  Inbox,
  Repeat,
  TaskAlt,
  WarningAmber,
} from '@mui/icons-material'
import { Box, Button, Container, Divider, Typography } from '@mui/joy'
import { useMediaQuery } from '@mui/material'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import EmptyState from '../../components/common/EmptyState'
import { useImpersonateUser } from '../../contexts/ImpersonateUserContext.jsx'
import { useLocalization } from '../../contexts/LocalizationContext'
import { useChores } from '../../queries/ChoreQueries'
import { useCircleMembers, useUserProfile } from '../../queries/UserQueries'
import { useNotification } from '../../service/NotificationProvider'
import { ChoreSorter } from '../../utils/Chores'
import { selectTodayTasks } from '../../utils/Today'
import ChoreListView from '../Chores/ChoreListView'
import ChoreModals from '../Chores/components/ChoreModals'
import { useChoreActions } from '../Chores/hooks/useChoreActions'
import { useChoreModals } from '../Chores/hooks/useChoreModals'
import LoadingComponent from '../components/Loading'
import { useLabels } from '../Labels/LabelQueries'
import ConfirmationModal from '../Modals/Inputs/ConfirmationModal'

const EMPTY_SELECTION = new Set()
const noOp = () => {}
const noSelectedChores = () => []

const SECTION_ICONS = {
  urgent: WarningAmber,
  priorities: Flag,
  routines: Repeat,
  flexible: TaskAlt,
}

const SECTION_COLORS = {
  urgent: 'danger',
  priorities: 'warning',
  routines: 'neutral',
  flexible: 'neutral',
}

const TodaySection = ({
  chores,
  handleChoreAction,
  handleLabelFiltering,
  membersData,
  section,
  userLabels,
  userProfile,
  viewMode,
}) => {
  const { t } = useTranslation('chores')
  const Icon = SECTION_ICONS[section]
  const headingId = `today-${section}-heading`

  if (chores.length === 0) return null

  return (
    <Box component='section' aria-labelledby={headingId} sx={{ mt: 3 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 2,
          mb: 1.25,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25 }}>
          <Box
            aria-hidden='true'
            sx={{
              display: 'grid',
              placeItems: 'center',
              width: 32,
              height: 32,
              flexShrink: 0,
              borderRadius: '50%',
              bgcolor: `${SECTION_COLORS[section]}.softBg`,
              color: `${SECTION_COLORS[section]}.softColor`,
              '& svg': { fontSize: 18 },
            }}
          >
            <Icon />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography
              id={headingId}
              level='title-md'
              sx={{ fontWeight: 'lg' }}
            >
              {t(`today.sections.${section}.title`)}
            </Typography>
            <Typography
              level='body-sm'
              sx={{ color: 'text.secondary', mt: 0.25, lineHeight: 1.45 }}
            >
              {t(`today.sections.${section}.description`)}
            </Typography>
          </Box>
        </Box>
        <Typography
          level='body-xs'
          sx={{ color: 'text.tertiary', flexShrink: 0, pt: 0.5 }}
        >
          {t('today.taskCount', { count: chores.length })}
        </Typography>
      </Box>

      <ChoreListView
        chores={chores}
        viewMode={viewMode}
        membersData={membersData}
        userLabels={userLabels}
        userProfile={userProfile}
        handleLabelFiltering={handleLabelFiltering}
        handleChoreAction={handleChoreAction}
        isMultiSelectMode={false}
        selectedChores={EMPTY_SELECTION}
        toggleChoreSelection={noOp}
      />
    </Box>
  )
}

const Today = () => {
  const { t } = useTranslation('chores')
  const { fmt } = useLocalization()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isCompact = useMediaQuery(theme => theme.breakpoints.down('sm'))
  const { impersonatedUser } = useImpersonateUser()
  const { showError, showSuccess, showUndo, showWarning } = useNotification()

  const { data: userProfile, isLoading: userProfileLoading } = useUserProfile()
  const {
    data: choresData,
    error: choresErrorDetails,
    isError: choresError,
    isLoading: choresLoading,
    refetch: refetchChores,
  } = useChores(false)
  const {
    data: membersData,
    isError: membersError,
    isLoading: membersLoading,
  } = useCircleMembers()
  const { data: userLabels, isLoading: userLabelsLoading } = useLabels()

  const [chores, setChores] = useState([])
  const [filteredChores, setFilteredChores] = useState([])
  const [confirmModelConfig, setConfirmModelConfig] = useState({})
  const { activeModal, closeModal, modalChore, openModal } = useChoreModals()

  const processedChores = useMemo(() => {
    let nextChores = [...(choresData?.res || [])].sort(ChoreSorter)

    if (impersonatedUser) {
      nextChores = nextChores.filter(
        chore =>
          chore.assignedTo === impersonatedUser.userId ||
          chore.assignees?.some(
            assignee => assignee.userId === impersonatedUser.userId,
          ) ||
          chore.isPrivate === false,
      )
    }

    return nextChores
  }, [choresData?.res, impersonatedUser])

  useEffect(() => {
    setChores(processedChores)
    setFilteredChores(processedChores)
  }, [processedChores])

  useEffect(() => {
    document.title = t('today.documentTitle')
  }, [t])

  const sections = useMemo(() => selectTodayTasks(chores), [chores])

  const {
    handleAssigneeChange,
    handleChangeDueDate,
    handleChoreAction,
    handleCompleteWithNote,
    handleCompleteWithPastDate,
    handleNudge,
  } = useChoreActions({
    chores,
    filteredChores,
    setChores,
    setFilteredChores,
    userProfile,
    impersonatedUser,
    showSuccess,
    showError,
    showWarning,
    showUndo,
    refetchChores,
    setConfirmModelConfig,
    openModal,
    closeModal,
    modalChore,
    getSelectedChoresData: noSelectedChores,
    clearSelection: noOp,
  })

  const handleLabelFiltering = useCallback(() => {
    navigate('/chores')
  }, [navigate])

  if (choresError || membersError) {
    return (
      <Container maxWidth='md'>
        <EmptyState
          variant='error'
          fullHeight
          icon={<CloudOff />}
          title={t('today.errorTitle')}
          description={
            choresErrorDetails?.message || t('today.errorDescription')
          }
          primaryAction={{
            label: t('today.retry'),
            onClick: () => {
              refetchChores()
              queryClient.invalidateQueries({ queryKey: ['circleMembers'] })
            },
          }}
        />
      </Container>
    )
  }

  if (
    userProfileLoading ||
    userProfile === null ||
    choresLoading ||
    membersLoading ||
    userLabelsLoading
  ) {
    return <LoadingComponent />
  }

  const sectionOrder = ['urgent', 'priorities', 'routines', 'flexible']
  const hasTodayTasks = sections.visibleCount > 0

  return (
    <Container maxWidth='md' sx={{ pb: 6 }}>
      <Box
        component='header'
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'stretch', sm: 'flex-start' },
          justifyContent: 'space-between',
          gap: 2,
          pt: { xs: 1, sm: 2 },
          pb: 2,
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography level='h2' sx={{ letterSpacing: '-0.025em' }}>
            {t('today.title')}
          </Typography>
          <Typography
            level='body-sm'
            sx={{ color: 'text.secondary', mt: 0.5, maxWidth: '52ch' }}
          >
            {t('today.subtitle')}
          </Typography>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.75,
              mt: 1,
              color: 'text.tertiary',
            }}
          >
            <CalendarToday sx={{ fontSize: 16 }} aria-hidden='true' />
            <Typography level='body-xs'>
              {fmt.date(new Date(), 'dddd, MMMM D')}
            </Typography>
          </Box>
        </Box>

        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 1,
            justifyContent: { xs: 'flex-start', sm: 'flex-end' },
          }}
        >
          <Button
            variant='outlined'
            color='neutral'
            startDecorator={<Inbox />}
            onClick={() => navigate('/chores')}
          >
            {t('today.allTasks')}
          </Button>
          <Button
            variant='solid'
            startDecorator={<Add />}
            onClick={() => navigate('/chores/create')}
          >
            {t('today.newTask')}
          </Button>
        </Box>
      </Box>

      <Divider />

      {chores.length === 0 ? (
        <EmptyState
          fullHeight
          icon={<TaskAlt />}
          title={t('today.emptyTitle')}
          description={t('today.emptyDescription')}
          primaryAction={{
            label: t('today.newTask'),
            startDecorator: <Add />,
            onClick: () => navigate('/chores/create'),
          }}
        />
      ) : !hasTodayTasks ? (
        <EmptyState
          fullHeight
          icon={<TaskAlt />}
          title={t('today.clearTitle')}
          description={t('today.clearDescription')}
          primaryAction={{
            label: t('today.allTasks'),
            startDecorator: <Inbox />,
            onClick: () => navigate('/chores'),
          }}
        />
      ) : (
        <>
          {sectionOrder.map(section => (
            <TodaySection
              key={section}
              section={section}
              chores={sections[section]}
              viewMode={isCompact ? 'compact' : 'default'}
              membersData={membersData}
              userLabels={userLabels}
              userProfile={userProfile}
              handleLabelFiltering={handleLabelFiltering}
              handleChoreAction={handleChoreAction}
            />
          ))}

          {sections.laterCount > 0 && (
            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                alignItems: { xs: 'flex-start', sm: 'center' },
                justifyContent: 'space-between',
                gap: 1.5,
                mt: 4,
                pt: 2,
                borderTop: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
                {t('today.laterCount', { count: sections.laterCount })}
              </Typography>
              <Button
                size='sm'
                variant='plain'
                color='neutral'
                onClick={() => navigate('/chores')}
              >
                {t('today.reviewAll')}
              </Button>
            </Box>
          )}
        </>
      )}

      {confirmModelConfig?.isOpen && (
        <ConfirmationModal config={confirmModelConfig} />
      )}

      <ChoreModals
        activeModal={activeModal}
        modalChore={modalChore}
        membersData={membersData}
        onChangeDueDate={handleChangeDueDate}
        onCompleteWithPastDate={handleCompleteWithPastDate}
        onAssigneeChange={handleAssigneeChange}
        onCompleteWithNote={handleCompleteWithNote}
        onNudge={handleNudge}
        onClose={closeModal}
      />
    </Container>
  )
}

export default Today
