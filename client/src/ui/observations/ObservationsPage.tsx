import { useState } from 'react'
import type { RefObject } from 'react'
import {
  Box,
  Container,
  Typography,
  Paper,
  Collapse,
  Button,
  Divider,
  FormControl,
  InputLabel,
  Select,
  OutlinedInput,
  Chip,
  TextField,
  MenuItem,
} from '@mui/material'
import type { SelectChangeEvent } from '@mui/material'
import {
  FilterAltOutlined as FilterAltOutlinedIcon,
  Search as SearchIcon,
  NightsStay as NightsStayIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material'
import { useTranslation } from 'react-i18next'
import LocationInput, { type LocationInputHandle } from './locationInput/LocationInput'
import FilterControls, { type Filters } from './filterControls/FilterControls'
import FilterPresetsMenu from './filterPresets/FilterPresetsMenu'
import { ObjectsList } from './objectsList/ObjectsList'
import type { FilterPreset, SearchRequest, VisibleObject } from 'shared/types'
import type { RareClassificationSettings } from 'shared/types'

type ObservationsPageProps = {
  locationRef: RefObject<LocationInputHandle | null>
  filters: Filters
  onFiltersChange: (filters: Filters) => void
  availableTags: string[]
  locusIdFilter: string
  onLocusIdFilterChange: (v: string) => void
  visibilityStart: string
  onVisibilityStartChange: (v: string) => void
  visibilityEnd: string
  onVisibilityEndChange: (v: string) => void
  locationLoading: boolean
  onLocationLoadingChange: (loading: boolean) => void
  onLocationChange: (lat: number, lon: number) => void
  filtersVisible: boolean
  onToggleFilters: () => void
  searchRequest: SearchRequest | null
  objects: VisibleObject[]
  loading: boolean
  error: Error | null
  pagination?: {
    pageSize: number
    hasNextPage: boolean
    nextCursor: number | null
    antaresTotalLoci: number
  }
  page: number
  onPageChange: (page: number) => void
  pageSize: number
  onPageSizeChange: (size: number) => void
  savedLocusIds: Set<string>
  onSave: (object: VisibleObject) => void
  rareClassificationSettings: RareClassificationSettings
  isAuthenticated: boolean
  onApplyPreset: (preset: FilterPreset) => void
  onSearchByName: (name: string, location?: { latitude: number; longitude: number } | null) => void
}

export default function ObservationsPage({
  locationRef,
  filters,
  onFiltersChange,
  availableTags,
  locusIdFilter,
  onLocusIdFilterChange,
  visibilityStart,
  onVisibilityStartChange,
  visibilityEnd,
  onVisibilityEndChange,
  locationLoading,
  onLocationLoadingChange,
  onLocationChange,
  filtersVisible,
  onToggleFilters,
  searchRequest,
  objects,
  loading,
  error,
  pagination,
  page,
  onPageChange,
  pageSize,
  onPageSizeChange,
  savedLocusIds,
  isAuthenticated,
  onApplyPreset,
  onSearchByName,
  onSave,
  rareClassificationSettings,
}: ObservationsPageProps) {
  const { t } = useTranslation()
  const [advancedOpen, setAdvancedOpen] = useState(false)

  const handleObjectTypesChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value
    onFiltersChange({ ...filters, objectTypes: typeof value === 'string' ? value.split(',') : value })
  }

  const paperSx = {
    padding: '1.5rem',
    background: 'rgba(15, 23, 41, 0.4)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '1rem',
    boxShadow: '0 0.5rem 2rem 0 rgba(0, 0, 0, 0.37)',
    boxSizing: 'border-box',
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4, px: { xs: 2, md: 3 } }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <NightsStayIcon sx={{ position: 'relative', top: '-0.25em' }} />
          {t('LABEL.NAV_OBSERVATIONS')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t('MESSAGE.APP_DESCRIPTION')}
        </Typography>
      </Box>

      <Collapse in={filtersVisible} timeout={300}>
        <Box
          sx={{
            display: 'flex',
            gap: 2,
            alignItems: 'stretch',
            flexDirection: { xs: 'column', md: 'row' },
            mb: 2,
          }}
        >
          {/* Step 1: Location */}
          <Box sx={{ flex: '0 0 auto', width: { xs: '100%', md: '340px' } }}>
            <LocationInput
              ref={locationRef}
              onLocationChange={onLocationChange}
              onLoadingChange={onLocationLoadingChange}
            />
          </Box>

          {/* Step 2: Filters */}
          <Paper sx={{ ...paperSx, flex: 1, minWidth: 0 }}>
          {/* Card header: title + presets */}
          <Typography
            variant="h6"
            sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}
          >
            <FilterAltOutlinedIcon fontSize="small" sx={{ position: 'relative', top: '-0.1em' }} />
            {t('LABEL.SEARCH_FILTERS')}
          </Typography>
          <Box sx={{ mb: 2 }}>
            <FilterPresetsMenu
              isAuthenticated={isAuthenticated}
              currentValues={{
                maxMagnitude: filters.maxMagnitude,
                objectTypes: filters.objectTypes,
                minAltitude: filters.minAltitude,
                minAlerts: filters.minAlerts,
                visibilityStart,
                visibilityEnd,
              }}
              onApply={onApplyPreset}
              compact
            />
          </Box>

          {/* Magnitude + altitude sliders */}
          <FilterControls
            filters={filters}
            onFiltersChange={onFiltersChange}
            visibilityStart={visibilityStart}
            onVisibilityStartChange={onVisibilityStartChange}
            visibilityEnd={visibilityEnd}
            onVisibilityEndChange={onVisibilityEndChange}
            variant="embedded"
          />

          {/* Object Types (promoted from advanced) */}
          <FormControl fullWidth size="small" sx={{ mt: 1 }}>
            <InputLabel size="small">{t('LABEL.OBJECT_TYPES')}</InputLabel>
            <Select
              multiple
              value={filters.objectTypes}
              onChange={handleObjectTypesChange}
              input={<OutlinedInput size="small" label={t('LABEL.OBJECT_TYPES')} />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {(selected as string[]).map((value) => (
                    <Chip key={value} label={value} size="small" />
                  ))}
                </Box>
              )}
            >
              {availableTags.map((tag: string) => (
                <MenuItem key={tag} value={tag}>
                  {tag.replace(/_/g, ' ')}
                </MenuItem>
              ))}
            </Select>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
              {t('LABEL.OBJECT_TYPES_HELP')}
            </Typography>
          </FormControl>

          <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.1)' }} />

          {/* Advanced filters toggle */}
          <Button
            size="small"
            onClick={() => setAdvancedOpen((prev) => !prev)}
            endIcon={advancedOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            sx={{ color: 'text.secondary', textTransform: 'none', px: 0 }}
          >
            {t('LABEL.ADVANCED_FILTERS')}
          </Button>

          <Collapse in={advancedOpen} timeout={200}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 2 }}>
              {/* Visibility times (moved from main section) */}
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">
                    {t('LABEL.VISIBILITY_FROM')}
                  </Typography>
                  <TextField
                    type="time"
                    value={visibilityStart}
                    onChange={(e) => onVisibilityStartChange(e.target.value)}
                    size="small"
                    fullWidth
                  />
                </Box>
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">
                    {t('LABEL.VISIBILITY_TO')}
                  </Typography>
                  <TextField
                    type="time"
                    value={visibilityEnd}
                    onChange={(e) => onVisibilityEndChange(e.target.value)}
                    size="small"
                    fullWidth
                  />
                </Box>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ mt: -0.5 }}>
                {t('LABEL.VISIBILITY_HELP')}
              </Typography>

              <TextField
                label={t('LABEL.MIN_ALERTS')}
                type="number"
                value={filters.minAlerts}
                onChange={(e) =>
                  onFiltersChange({
                    ...filters,
                    minAlerts: Math.max(0, Number.parseInt(e.target.value || '0', 10) || 0),
                  })
                }
                inputProps={{ min: 0, step: 1 }}
                size="small"
                fullWidth
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: -0.75 }}>
                {t('MESSAGE.MIN_ALERTS_HELP')}
              </Typography>

              <TextField
                label={t('LABEL.LOCUS_ID_SEARCH')}
                placeholder={t('LABEL.LOCUS_ID_SEARCH_PLACEHOLDER')}
                value={locusIdFilter}
                onChange={(e) => onLocusIdFilterChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && locusIdFilter.trim()) {
                    // Main Search button will pick up name + optional location
                    // We trigger a click on it so the same unified logic runs
                    document.getElementById('search-sky-btn')?.click();
                  }
                }}
                size="small"
                fullWidth
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: -0.75 }}>
                {t('MESSAGE.LOCUS_ID_SEARCH_HELP')}
              </Typography>
              {locusIdFilter.trim() && !searchRequest && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                  {t('MESSAGE.NAME_FILTER_NEEDS_LOCATION')}
                </Typography>
              )}
            </Box>
          </Collapse>
        </Paper>
        </Box>{/* end side-by-side row */}

        {/* Step 3: Search */}
        <Box sx={{ mb: 2 }}>
          <Button
            id="search-sky-btn"
            variant="contained"
            size="large"
            fullWidth
            onClick={() => {
              const name = locusIdFilter.trim();
              if (name) {
                // Also grab any coords the user typed in LocationInput
                const loc = locationRef.current?.getValues?.() ?? null;
                onSearchByName(name, loc);
              } else {
                locationRef.current?.submit();
              }
            }}
            disabled={locationLoading}
          >
            <SearchIcon fontSize="small" sx={{ mr: 0.75, position: 'relative', top: '-0.1em' }} />
            {t('COMMAND.SEARCH_SKY_OBJECTS')}
          </Button>
        </Box>
      </Collapse>

      {searchRequest !== null && (
        <ObjectsList
          objects={objects}
          loading={loading}
          error={error}
          pagination={pagination}
          page={page}
          onPageChange={onPageChange}
          pageSize={pageSize}
          onPageSizeChange={onPageSizeChange}
          filtersVisible={filtersVisible}
          onToggleFilters={onToggleFilters}
          savedLocusIds={savedLocusIds}
          onSave={onSave}
          rareClassificationSettings={rareClassificationSettings}
        />
      )}
    </Container>
  )
}
