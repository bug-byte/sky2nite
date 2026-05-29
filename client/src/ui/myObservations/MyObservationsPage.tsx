import { type TableColumn } from 'react-data-table-component'
import {
  Box,
  Container,
  Typography,
  Alert,
  IconButton,
  Tooltip,
} from '@mui/material'
import {
  BookmarkAdded as BookmarkAddedIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useDeleteObservation } from '../../hooks/useSavedObservations'
import type { SavedObservation } from 'shared/types'
import ObjectsDataTable from '../shared/ObjectsDataTable'

function formatDate(isoString: string) {
  return new Date(isoString).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

type MyObservationsPageProps = {
  observations: SavedObservation[]
  isLoading: boolean
  error: Error | null
}

export default function MyObservationsPage({ observations, isLoading, error }: MyObservationsPageProps) {
  const { t } = useTranslation()
  const deleteObservation = useDeleteObservation()

  const savedOnColumn = useMemo<TableColumn<SavedObservation>>(
    () => ({
      id: 'savedOn',
      name: t('LABEL.SAVED_ON'),
      selector: (row) => row.savedAt,
      sortable: true,
      width: '130px',
      cell: (row) => (
        <Typography variant="body2" color="text.secondary">
          {formatDate(row.savedAt)}
        </Typography>
      ),
    }),
    [t],
  )

  const deleteColumn = useMemo<TableColumn<SavedObservation>>(
    () => ({
      id: 'delete',
      name: '',
      cell: (row) => (
        <Tooltip title={t('COMMAND.DELETE')} placement="top">
          <IconButton
            size="small"
            onClick={() => deleteObservation.mutate(row.id)}
            disabled={deleteObservation.isPending}
            aria-label={t('COMMAND.DELETE')}
            sx={{ color: 'error.main' }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ),
      width: '56px',
      button: true,
    }),
    [t, deleteObservation],
  )

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4, px: { xs: 2, md: 3 } }}>
        <Alert severity="error" sx={{ mt: 2 }}>
          {error.message}
        </Alert>
      </Container>
    )
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4, px: { xs: 2, md: 3 } }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <BookmarkAddedIcon sx={{ position: 'relative', top: '-0.25em' }} />
          {t('LABEL.NAV_MY_OBSERVATIONS')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t('MESSAGE.MY_OBSERVATIONS_DESCRIPTION')}
        </Typography>
      </Box>

      <ObjectsDataTable<SavedObservation>
        data={observations}
        keyField="id"
        isLoading={isLoading}
        title={
          isLoading
            ? t('MESSAGE.SEARCHING')
            : t('MESSAGE.OBSERVATIONS_SAVED', { count: observations.length })
        }
        middleColumns={[savedOnColumn]}
        actionColumn={deleteColumn}
        defaultSortFieldId="savedOn"
        defaultSortAsc={false}
        noDataComponent={
          <Box sx={{ padding: '2rem', textAlign: 'center' }}>
            <Typography variant="h6" gutterBottom>
              {t('MESSAGE.NO_SAVED_OBSERVATIONS')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('MESSAGE.MY_OBSERVATIONS_DESCRIPTION')}
            </Typography>
          </Box>
        }
      />
    </Container>
  )
}
