import DataTable, { createTheme, type TableColumn } from 'react-data-table-component'
import { Box, Chip, CircularProgress, Link, Stack, Tooltip, Typography } from '@mui/material'
import { StarsOutlined as StarsOutlinedIcon } from '@mui/icons-material'
import { useMemo } from 'react'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import type { VisibleObject } from 'shared/types'
import SkyPreview from '../observations/objectsList/skyPreview/SkyPreview'

createTheme(
  'sky2nite',
  {
    text: {
      primary: 'rgba(255, 255, 255, 0.87)',
      secondary: 'rgba(255, 255, 255, 0.6)',
    },
    background: { default: 'transparent' },
    context: { background: 'rgba(255, 255, 255, 0.1)', text: '#ffffff' },
    divider: { default: 'rgba(255, 255, 255, 0.1)' },
    sortFocus: { default: 'rgba(255, 255, 255, 0.6)' },
    highlightOnHover: {
      default: 'rgba(255, 255, 255, 0.05)',
      text: 'rgba(255, 255, 255, 0.87)',
    },
    action: {
      button: 'rgba(255, 255, 255, 0.54)',
      hover: 'rgba(255, 255, 255, 0.08)',
      disabled: 'rgba(255, 255, 255, 0.18)',
    },
  },
  'dark',
)

function formatTime(isoString: string) {
  return new Date(isoString).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

function buildCoreColumns<T extends VisibleObject>(t: TFunction): TableColumn<T>[] {
  return [
    {
      id: 'skyPreview',
      name: <span style={{ paddingLeft: '8px' }}>{t('LABEL.SKY')}</span>,
      cell: (row) => <SkyPreview ra={row.ra} dec={row.dec} antaresUrl={row.antaresUrl} />,
      width: '116px',
      compact: true,
    },
    {
      id: 'locusId',
      name: t('LABEL.LOCUS_ID'),
      selector: (row) => row.locusId,
      sortable: true,
      width: '140px',
      cell: (row) => (
        <Tooltip title={row.locusId} placement="top" enterDelay={400}>
          <Box sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
            {row.locusId}
          </Box>
        </Tooltip>
      ),
    },
    {
      id: 'magnitude',
      name: t('LABEL.MAGNITUDE'),
      selector: (row) => row.magnitude,
      sortable: true,
      right: true,
      width: '110px',
      format: (row) => row.magnitude.toFixed(2),
    },
    {
      id: 'ra',
      name: (
        <Tooltip title={t('LABEL.RA_TOOLTIP')} placement="top">
          <span>RA</span>
        </Tooltip>
      ),
      selector: (row) => row.ra,
      sortable: true,
      right: true,
      width: '90px',
      format: (row) => row.ra.toFixed(4),
    },
    {
      id: 'dec',
      name: (
        <Tooltip title={t('LABEL.DEC_TOOLTIP')} placement="top">
          <span>Dec</span>
        </Tooltip>
      ),
      selector: (row) => row.dec,
      sortable: true,
      right: true,
      width: '90px',
      format: (row) => row.dec.toFixed(4),
    },
    {
      id: 'visibleWindow',
      name: t('LABEL.VISIBLE_WINDOW'),
      selector: (row) => row.visibilityWindow.start,
      sortable: true,
      cell: (row) => (
        <Box sx={{ py: 0.5 }}>
          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
            {formatTime(row.visibilityWindow.start)} – {formatTime(row.visibilityWindow.end)}
          </Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
            {t('MESSAGE.HOURS_ALTITUDE', {
              hours: row.visibilityWindow.duration.toFixed(1),
              altitude: row.maxAltitude,
            })}
          </Typography>
        </Box>
      ),
      minWidth: '230px',
      grow: 0,
    },
    {
      id: 'maxAltitude',
      name: t('LABEL.MAX_ALTITUDE'),
      selector: (row) => row.maxAltitude,
      sortable: true,
      right: true,
      width: '130px',
      format: (row) => `${row.maxAltitude.toFixed(1)}°`,
    },
    {
      id: 'tags',
      name: t('LABEL.CLASSIFICATIONS'),
      cell: (row) => (
        <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap" sx={{ py: 0.5 }}>
          {row.tags.slice(0, 3).map((tag) => (
            <Chip key={tag} label={tag.replace(/_/g, ' ')} size="small" />
          ))}
          {row.tags.length > 3 && (
            <Tooltip
              title={
                <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap" sx={{ p: 0.5 }}>
                  {row.tags.slice(3).map((tag) => (
                    <Chip key={tag} label={tag.replace(/_/g, ' ')} size="small" />
                  ))}
                </Stack>
              }
              arrow
            >
              <Chip
                label={t('MESSAGE.MORE_TAGS', { count: row.tags.length - 3 })}
                size="small"
                variant="outlined"
                sx={{ cursor: 'default' }}
              />
            </Tooltip>
          )}
        </Stack>
      ),
      minWidth: '200px',
      grow: 1,
    },
  ]
}

function buildDetailsColumn<T extends VisibleObject>(t: TFunction): TableColumn<T> {
  return {
    id: 'details',
    name: t('LABEL.DETAILS'),
    cell: (row) => (
      <Link href={row.antaresUrl} target="_blank" rel="noopener noreferrer" fontSize="small">
        {t('COMMAND.VIEW_DETAILS')}
      </Link>
    ),
    width: '130px',
    button: true,
  }
}

type ObjectsDataTableProps<T extends VisibleObject> = {
  data: T[]
  keyField: string
  isLoading: boolean
  title: string
  headerRight?: React.ReactNode
  /** Columns inserted between the tags column and the details column. */
  middleColumns?: TableColumn<T>[]
  /** The final action column (save or delete). */
  actionColumn: TableColumn<T>
  defaultSortFieldId?: string
  defaultSortAsc?: boolean
  noDataComponent: React.ReactNode
  progressComponent?: React.ReactNode
}

export default function ObjectsDataTable<T extends VisibleObject>({
  data,
  keyField,
  isLoading,
  title,
  headerRight,
  middleColumns = [],
  actionColumn,
  defaultSortFieldId = 'magnitude',
  defaultSortAsc = true,
  noDataComponent,
  progressComponent,
}: ObjectsDataTableProps<T>) {
  const { t } = useTranslation()

  const columns = useMemo<TableColumn<T>[]>(
    () => [
      ...buildCoreColumns<T>(t),
      ...middleColumns,
      buildDetailsColumn<T>(t),
      actionColumn,
    ],
    [t, middleColumns, actionColumn],
  )

  const defaultProgressComponent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8 }}>
      <CircularProgress size={60} />
      <Typography variant="h6" sx={{ mt: 2 }}>
        {t('MESSAGE.SEARCHING')}
      </Typography>
    </Box>
  )

  return (
    <Box
      sx={{
        mt: 2,
        background: 'rgba(15, 23, 41, 0.4)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: '1rem',
        boxShadow: '0 0.5rem 2rem 0 rgba(0, 0, 0, 0.37)',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          px: 3,
          pt: 3,
          pb: 2,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <StarsOutlinedIcon />
          {title}
        </Typography>
        {headerRight}
      </Box>

      <DataTable
        columns={columns}
        data={data}
        keyField={keyField}
        theme="sky2nite"
        defaultSortFieldId={defaultSortFieldId}
        defaultSortAsc={defaultSortAsc}
        highlightOnHover
        dense
        persistTableHead
        progressPending={isLoading}
        progressComponent={progressComponent ?? defaultProgressComponent}
        noDataComponent={noDataComponent}
      />
    </Box>
  )
}
