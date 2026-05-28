import {
  Box,
  Container,
  Typography,
  Paper,
  Collapse,
  Button,
  FormControl,
  InputLabel,
  Select,
  OutlinedInput,
  Chip,
  TextField,
  MenuItem,
} from '@mui/material'
import type { SelectChangeEvent, RefObject } from '@mui/material'
import {
  FilterAltOutlined as FilterAltOutlinedIcon,
  Search as SearchIcon,
} from '@mui/icons-material'
import { useTranslation } from 'react-i18next'
import LocationInput, { type LocationInputHandle } from './locationInput/LocationInput'
import FilterControls, { type Filters } from './filterControls/FilterControls'
import ObjectsList from './objectsList/ObjectsList'
import type { SearchRequest, VisibleObject } from '../../types/api'

interface ObservationsPageProps {
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
}: ObservationsPageProps) {
  const { t } = useTranslation()

  const handleObjectTypesChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value
    onFiltersChange({ ...filters, objectTypes: typeof value === 'string' ? value.split(',') : value })
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4, px: { xs: 2, md: 3 } }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={600} gutterBottom>
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
          <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <LocationInput
              ref={locationRef}
              onLocationChange={onLocationChange}
              onLoadingChange={onLocationLoadingChange}
              locationRequired={!locusIdFilter.trim()}
            />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <FilterControls filters={filters} onFiltersChange={onFiltersChange} />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <Paper
              sx={{
                padding: '1.5rem',
                height: '100%',
                background: 'rgba(15, 23, 41, 0.4)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '1rem',
                boxShadow: '0 0.5rem 2rem 0 rgba(0, 0, 0, 0.37)',
                boxSizing: 'border-box',
              }}
            >
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <FilterAltOutlinedIcon fontSize="small" sx={{ position: 'relative', top: '-0.1em' }} />
                {t('LABEL.SEARCH_FILTERS')}
              </Typography>
              <FormControl fullWidth>
                <InputLabel>{t('LABEL.OBJECT_TYPES')}</InputLabel>
                <Select
                  multiple
                  value={filters.objectTypes}
                  onChange={handleObjectTypesChange}
                  input={<OutlinedInput label={t('LABEL.OBJECT_TYPES')} />}
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
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 2 }}>
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
                <TextField
                  label={t('LABEL.LOCUS_ID_SEARCH')}
                  placeholder={t('LABEL.LOCUS_ID_SEARCH_PLACEHOLDER')}
                  value={locusIdFilter}
                  onChange={(e) => onLocusIdFilterChange(e.target.value)}
                  size="small"
                  fullWidth
                />
                {locusIdFilter.trim() && !searchRequest && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                    {t('MESSAGE.NAME_FILTER_NEEDS_LOCATION')}
                  </Typography>
                )}
              </Box>
            </Paper>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <Button
            variant="contained"
            size="large"
            fullWidth
            onClick={() => locationRef.current?.submit()}
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
        />
      )}
    </Container>
  )
}
