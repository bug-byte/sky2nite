import DataTable, { createTheme, type TableColumn } from 'react-data-table-component'
import { Box, Chip, CircularProgress, Link, Stack, Tooltip, Typography } from '@mui/material'
import { StarsOutlined as StarsOutlinedIcon } from '@mui/icons-material'
import { useMemo } from 'react'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import type { VisibleObject } from 'shared/types'
import type { RareClassificationColorMapId, RareClassificationSettings } from 'shared/types'
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

function normalizeTag(tag: string) {
  return tag.replace(/_/g, ' ').trim().toLowerCase()
}

function getTagChipSx(tag: string, colorMap: RareClassificationColorMapId) {
  const normalizedTag = normalizeTag(tag)
  const palette = {
    aurora: {
      nuclearTransient: {
        backgroundColor: 'rgba(255, 138, 101, 0.18)',
        borderColor: 'rgba(255, 138, 101, 0.55)',
        color: 'rgba(255, 224, 214, 0.98)',
      },
      rcbStar: {
        backgroundColor: 'rgba(255, 202, 40, 0.18)',
        borderColor: 'rgba(255, 202, 40, 0.55)',
        color: 'rgba(255, 241, 171, 0.98)',
      },
      blueTransient: {
        backgroundColor: 'rgba(100, 181, 246, 0.18)',
        borderColor: 'rgba(100, 181, 246, 0.55)',
        color: 'rgba(214, 235, 255, 0.98)',
      },
      dwarfNovaOutburst: {
        backgroundColor: 'rgba(186, 104, 200, 0.18)',
        borderColor: 'rgba(186, 104, 200, 0.55)',
        color: 'rgba(243, 216, 248, 0.98)',
      },
      youngExtragalacticCandidate: {
        backgroundColor: 'rgba(38, 166, 154, 0.18)',
        borderColor: 'rgba(38, 166, 154, 0.55)',
        color: 'rgba(214, 246, 241, 0.98)',
      },
    },
    ember: {
      nuclearTransient: {
        backgroundColor: 'rgba(255, 87, 34, 0.18)',
        borderColor: 'rgba(255, 87, 34, 0.55)',
        color: 'rgba(255, 232, 225, 0.98)',
      },
      rcbStar: {
        backgroundColor: 'rgba(255, 152, 0, 0.18)',
        borderColor: 'rgba(255, 152, 0, 0.55)',
        color: 'rgba(255, 234, 199, 0.98)',
      },
      blueTransient: {
        backgroundColor: 'rgba(255, 111, 0, 0.18)',
        borderColor: 'rgba(255, 111, 0, 0.55)',
        color: 'rgba(255, 229, 213, 0.98)',
      },
      dwarfNovaOutburst: {
        backgroundColor: 'rgba(255, 167, 38, 0.18)',
        borderColor: 'rgba(255, 167, 38, 0.55)',
        color: 'rgba(255, 242, 219, 0.98)',
      },
      youngExtragalacticCandidate: {
        backgroundColor: 'rgba(255, 183, 77, 0.18)',
        borderColor: 'rgba(255, 183, 77, 0.55)',
        color: 'rgba(255, 245, 229, 0.98)',
      },
    },
    nebula: {
      nuclearTransient: {
        backgroundColor: 'rgba(156, 39, 176, 0.18)',
        borderColor: 'rgba(156, 39, 176, 0.55)',
        color: 'rgba(244, 223, 247, 0.98)',
      },
      rcbStar: {
        backgroundColor: 'rgba(103, 58, 183, 0.18)',
        borderColor: 'rgba(103, 58, 183, 0.55)',
        color: 'rgba(232, 224, 246, 0.98)',
      },
      blueTransient: {
        backgroundColor: 'rgba(63, 81, 181, 0.18)',
        borderColor: 'rgba(63, 81, 181, 0.55)',
        color: 'rgba(224, 229, 248, 0.98)',
      },
      dwarfNovaOutburst: {
        backgroundColor: 'rgba(124, 77, 255, 0.18)',
        borderColor: 'rgba(124, 77, 255, 0.55)',
        color: 'rgba(235, 228, 255, 0.98)',
      },
      youngExtragalacticCandidate: {
        backgroundColor: 'rgba(123, 31, 162, 0.18)',
        borderColor: 'rgba(123, 31, 162, 0.55)',
        color: 'rgba(244, 224, 248, 0.98)',
      },
    },
    sunset: {
      nuclearTransient: {
        backgroundColor: 'rgba(233, 30, 99, 0.18)',
        borderColor: 'rgba(233, 30, 99, 0.55)',
        color: 'rgba(253, 225, 234, 0.98)',
      },
      rcbStar: {
        backgroundColor: 'rgba(255, 87, 34, 0.18)',
        borderColor: 'rgba(255, 87, 34, 0.55)',
        color: 'rgba(255, 232, 225, 0.98)',
      },
      blueTransient: {
        backgroundColor: 'rgba(244, 143, 177, 0.18)',
        borderColor: 'rgba(244, 143, 177, 0.55)',
        color: 'rgba(255, 236, 244, 0.98)',
      },
      dwarfNovaOutburst: {
        backgroundColor: 'rgba(255, 112, 67, 0.18)',
        borderColor: 'rgba(255, 112, 67, 0.55)',
        color: 'rgba(255, 238, 230, 0.98)',
      },
      youngExtragalacticCandidate: {
        backgroundColor: 'rgba(255, 138, 101, 0.18)',
        borderColor: 'rgba(255, 138, 101, 0.55)',
        color: 'rgba(255, 233, 226, 0.98)',
      },
    },
  } as const

  if (normalizedTag === 'nuclear transient') {
    return { ...palette[colorMap].nuclearTransient, fontWeight: 600 }
  }

  if (normalizedTag === 'rcb star') {
    return { ...palette[colorMap].rcbStar, fontWeight: 600 }
  }

  if (normalizedTag === 'blue transient') {
    return { ...palette[colorMap].blueTransient, fontWeight: 600 }
  }

  if (normalizedTag === 'dwarf nova outburst') {
    return { ...palette[colorMap].dwarfNovaOutburst, fontWeight: 600 }
  }

  if (normalizedTag === 'young extragalactic candidate') {
    return { ...palette[colorMap].youngExtragalacticCandidate, fontWeight: 600 }
  }

  return undefined
}

function TagChip({
  tag,
  colorMap,
  isRare,
}: {
  tag: string
  colorMap: RareClassificationColorMapId
  isRare: boolean
}) {
  const { t } = useTranslation()
  const label = tag.replace(/_/g, ' ')
  const accentSx = isRare ? getTagChipSx(tag, colorMap) : undefined
  const chip = (
    <Chip
      key={tag}
      label={label}
      size="small"
      variant={accentSx ? 'outlined' : 'filled'}
      sx={accentSx ?? undefined}
    />
  )

  if (!accentSx) {
    return chip
  }

  return (
    <Tooltip title={t('MESSAGE.CLASSIFICATION_RARITY_HINT')} placement="top">
      {chip}
    </Tooltip>
  )
}

function AlertActivitySparkline({
  curve,
  countLabel,
  isLoading = false,
}: {
  curve: number[]
  countLabel?: string
  isLoading?: boolean
}) {
  const maxValue = curve.reduce((max, value) => Math.max(max, value), 0)
  const badge = (
    <Chip
      size="small"
      label={countLabel ?? '—'}
      variant={curve.length ? 'outlined' : 'filled'}
      sx={{ height: 22 }}
    />
  )

  if (!curve.length) {
    return (
      <Stack direction="row" alignItems="center" justifyContent="center" spacing={0.75} sx={{ width: '100%', minHeight: 28 }}>
        {badge}
        {isLoading && <CircularProgress size={12} thickness={6} sx={{ color: 'rgba(255,255,255,0.65)' }} />}
      </Stack>
    )
  }

  return (
    <Stack direction="row" spacing={0.75} alignItems="center" justifyContent="center" sx={{ minHeight: 28, width: '100%' }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'end',
          gap: '2px',
          height: '24px',
          width: '88px',
          px: 0.25,
        }}
      >
        {curve.map((value, index) => {
          const height = maxValue > 0 ? Math.max(12, (value / maxValue) * 100) : 12
          return (
            <Box
              key={`${index}-${value}`}
              sx={{
                flex: 1,
                minWidth: 4,
                height: `${height}%`,
                borderRadius: '999px 999px 2px 2px',
                background: 'linear-gradient(180deg, rgba(100, 181, 246, 0.95) 0%, rgba(129, 199, 132, 0.92) 100%)',
                boxShadow: '0 0 8px rgba(100, 181, 246, 0.25)',
              }}
            />
          )
        })}
      </Box>
      {badge}
      {isLoading && <CircularProgress size={12} thickness={6} sx={{ color: 'rgba(255,255,255,0.65)' }} />}
    </Stack>
  )
}

function buildCoreColumns<T extends VisibleObject>(
  t: TFunction,
  alertActivityCurvesByLocusId: Record<string, number[]>,
  alertActivityCurvesLoading: boolean,
  rareClassificationSettings: RareClassificationSettings,
): TableColumn<T>[] {
  const rareTagSet = new Set(rareClassificationSettings.rareClassificationTags.map(normalizeTag))

  return [
    {
      id: 'skyPreview',
      name: <span style={{ paddingLeft: '8px' }}>{t('LABEL.SKY')}</span>,
      cell: (row) => (
        <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
          <SkyPreview ra={row.ra} dec={row.dec} antaresUrl={row.antaresUrl} />
        </Box>
      ),
      width: '112px',
      compact: true,
      center: true,
    },
    {
      id: 'locusId',
      name: t('LABEL.LOCUS_ID'),
      selector: (row) => row.locusId,
      sortable: true,
      width: '120px',
      cell: (row) => (
        <Tooltip title={row.locusId} placement="top" enterDelay={400}>
          <Box sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%', width: '100%', textAlign: 'center' }}>
            {row.locusId}
          </Box>
        </Tooltip>
      ),
      center: true,
    },
    {
      id: 'magnitude',
      name: t('LABEL.MAGNITUDE'),
      selector: (row) => row.magnitude,
      sortable: true,
      center: true,
      width: '108px',
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
      center: true,
      width: '96px',
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
      center: true,
      width: '96px',
      format: (row) => row.dec.toFixed(4),
    },
    {
      id: 'visibleWindow',
      name: t('LABEL.VISIBLE_WINDOW'),
      selector: (row) => row.transitTime ?? row.visibilityWindow.start,
      sortable: true,
      cell: (row) => (
        <Box sx={{ py: 0.75, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 0.25 }}>
          {row.transitTime && (
            <Tooltip title={t('LABEL.TRANSIT_TIME')} placement="top">
              <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem', whiteSpace: 'nowrap', color: 'rgba(255, 220, 100, 0.95)', fontWeight: 600 }}>
                ★ {formatTime(row.transitTime)}
              </Typography>
            </Tooltip>
          )}
          <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="center">
            <Tooltip title={t('LABEL.RISE_TIME')} placement="top">
              <Typography variant="caption" sx={{ fontFamily: 'monospace', whiteSpace: 'nowrap', color: 'rgba(255,255,255,0.55)' }}>
                ↑ {formatTime(row.visibilityWindow.start)}
              </Typography>
            </Tooltip>
            <Tooltip title={t('LABEL.SET_TIME')} placement="top">
              <Typography variant="caption" sx={{ fontFamily: 'monospace', whiteSpace: 'nowrap', color: 'rgba(255,255,255,0.55)' }}>
                ↓ {formatTime(row.visibilityWindow.end)}
              </Typography>
            </Tooltip>
          </Stack>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.45)', whiteSpace: 'nowrap' }}>
            {t('MESSAGE.HOURS_ALTITUDE', {
              hours: row.visibilityWindow.duration.toFixed(1),
              altitude: row.maxAltitude,
            })}
          </Typography>
        </Box>
      ),
      minWidth: '180px',
      grow: 0,
      center: true,
    },
    {
      id: 'alertActivity',
      name: t('LABEL.ALERT_ACTIVITY'),
      selector: (row) => row.numAlerts ?? 0,
      sortable: true,
      center: true,
      width: '200px',
      cell: (row) => {
        const label = row.numAlerts === 1
          ? t('MESSAGE.ALERT_ACTIVITY_SINGLE', { count: row.numAlerts })
          : t('MESSAGE.ALERT_ACTIVITY', { count: row.numAlerts ?? 0 })

        return (
          <Box sx={{ py: 0.5, width: '100%', display: 'flex', justifyContent: 'center' }}>
            <Tooltip title={t('MESSAGE.ALERT_ACTIVITY_CURVE_TOOLTIP')} placement="top">
              <Box sx={{ width: '100%' }}>
                <AlertActivitySparkline
                  curve={alertActivityCurvesByLocusId[row.locusId] ?? row.alertActivityCurve ?? []}
                  countLabel={label}
                  isLoading={alertActivityCurvesLoading && !alertActivityCurvesByLocusId[row.locusId]}
                />
              </Box>
            </Tooltip>
          </Box>
        )
      },
    },
    {
      id: 'tags',
      name: (
        <Tooltip title={t('MESSAGE.CLASSIFICATION_RARITY_HINT')} placement="top">
          <span>{t('LABEL.CLASSIFICATIONS')}</span>
        </Tooltip>
      ),
      cell: (row) => (
        <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap" justifyContent="center" sx={{ py: 0.5, width: '100%' }}>
          {row.tags.slice(0, 3).map((tag) => (
            <TagChip
              key={tag}
              tag={tag}
              colorMap={rareClassificationSettings.rareClassificationColorMap}
              isRare={rareTagSet.has(normalizeTag(tag))}
            />
          ))}
          {row.tags.length > 3 && (
            <Tooltip
              title={
                <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap" sx={{ p: 0.5 }}>
                  {row.tags.slice(3).map((tag) => (
                    <TagChip
                      key={tag}
                      tag={tag}
                      colorMap={rareClassificationSettings.rareClassificationColorMap}
                      isRare={rareTagSet.has(normalizeTag(tag))}
                    />
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
      minWidth: '48px',
      grow: 0.5,
      center: true,
    },
  ]
}

function buildDetailsColumn<T extends VisibleObject>(t: TFunction): TableColumn<T> {
  return {
    id: 'details',
    name: t('LABEL.DETAILS'),
    cell: (row) => (
      <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
        <Link href={row.antaresUrl} target="_blank" rel="noopener noreferrer" fontSize="small">
          {t('COMMAND.VIEW_DETAILS')}
        </Link>
      </Box>
    ),
    width: '130px',
    button: true,
    center: true,
  }
}

type ObjectsDataTableProps<T extends VisibleObject> = {
  data: T[]
  keyField: string
  isLoading: boolean
  title: string
  headerRight?: React.ReactNode
  showAlertActivity?: boolean
  alertActivityCurvesByLocusId?: Record<string, number[]>
  alertActivityCurvesLoading?: boolean
  rareClassificationSettings?: RareClassificationSettings
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
  showAlertActivity = false,
  alertActivityCurvesByLocusId = {},
  alertActivityCurvesLoading = false,
  rareClassificationSettings,
  middleColumns = [],
  actionColumn,
  defaultSortFieldId = 'magnitude',
  defaultSortAsc = true,
  noDataComponent,
  progressComponent,
}: ObjectsDataTableProps<T>) {
  const { t } = useTranslation()

  const columns = useMemo<TableColumn<T>[]>(
    () => {
      const coreColumns = buildCoreColumns<T>(
        t,
        alertActivityCurvesByLocusId,
        alertActivityCurvesLoading,
        rareClassificationSettings ?? {
          rareClassificationTags: [],
          rareClassificationColorMap: 'aurora',
        },
      );
      if (!showAlertActivity) {
        coreColumns.splice(8, 1);
      }

      return [
        ...coreColumns,
        ...middleColumns,
        buildDetailsColumn<T>(t),
        actionColumn,
      ];
    },
    [t, showAlertActivity, alertActivityCurvesByLocusId, alertActivityCurvesLoading, rareClassificationSettings, middleColumns, actionColumn],
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
        customStyles={{
          headCells: {
            style: {
              justifyContent: 'center',
              textAlign: 'center',
            },
          },
          cells: {
            style: {
              justifyContent: 'center',
              textAlign: 'center',
            },
          },
        }}
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
