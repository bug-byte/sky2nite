import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  Box,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  Link,
  Button,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  Chip,
} from '@mui/material'
import type { SelectChangeEvent } from '@mui/material'
import { TravelExplore as TravelExploreIcon, InfoOutlined as InfoOutlinedIcon, FilterAltOutlined as FilterAltOutlinedIcon, Search as SearchIcon } from '@mui/icons-material'
import LocationInput, { type LocationInputHandle } from './components/LocationInput'
import FilterControls, { type Filters } from './components/FilterControls'
import ObjectsList from './components/ObjectsList'
import { useVisibleObjects, useAvailableTags } from './hooks/useVisibleObjects'
import type { SearchRequest } from './types/api'

function App() {
  const [searchRequest, setSearchRequest] = useState<SearchRequest | null>(null)
  const [aboutOpen, setAboutOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(500)
  // cursors[i] = ANTARES offset to use when requesting display page (i+1).
  // cursors[0] = 0 always. Grows as the user advances forward.
  const [cursors, setCursors] = useState<number[]>([0])
  const [resetPagination, setResetPagination] = useState(false)
  const [filters, setFilters] = useState<Filters>({
    maxMagnitude: 14,
    objectTypes: [],
    minAltitude: 15,
  })
  const locationRef = useRef<LocationInputHandle>(null)
  const [locationLoading, setLocationLoading] = useState(false)
  const { t, i18n } = useTranslation()

  const { data, isLoading, error } = useVisibleObjects(searchRequest, searchRequest !== null)
  const { data: availableTags = [] } = useAvailableTags()

  // When a page loads successfully, record its nextCursor so the next page is available.
  const nextCursor = data?.pagination?.nextCursor ?? null
  if (nextCursor !== null && cursors.length <= page) {
    setCursors(prev => {
      if (prev.length <= page) {
        const updated = [...prev]
        updated[page] = nextCursor
        return updated
      }
      return prev
    })
  }

  const buildRequest = (
    base: SearchRequest,
    targetPage: number,
    cursorList: number[],
    size: number,
  ): SearchRequest => ({
    ...base,
    date: new Date().toISOString(),
    pagination: { cursor: cursorList[targetPage - 1] ?? 0, pageSize: size },
  })

  const handleLocationChange = (latitude: number, longitude: number) => {
    const resetCursors = [0]
    setCursors(resetCursors)
    setPage(1)
    setResetPagination(r => !r)
    setSearchRequest({
      latitude,
      longitude,
      date: new Date().toISOString(),
      filters: { maxMagnitude: filters.maxMagnitude, objectTypes: filters.objectTypes, minAltitude: filters.minAltitude },
      pagination: { cursor: 0, pageSize },
    })
  }

  const handleFiltersChange = (newFilters: Filters) => {
    setFilters(newFilters)
    if (searchRequest) {
      const resetCursors = [0]
      setCursors(resetCursors)
      setPage(1)
      setResetPagination(r => !r)
      setSearchRequest({
        ...searchRequest,
        date: new Date().toISOString(),
        filters: { maxMagnitude: newFilters.maxMagnitude, objectTypes: newFilters.objectTypes, minAltitude: newFilters.minAltitude },
        pagination: { cursor: 0, pageSize },
      })
    }
  }

  const handleObjectTypesChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value
    handleFiltersChange({ ...filters, objectTypes: typeof value === 'string' ? value.split(',') : value })
  }

  const handlePageChange = (nextPage: number) => {
    if (!searchRequest || nextPage < 1 || cursors[nextPage - 1] === undefined) return
    setPage(nextPage)
    setSearchRequest(buildRequest(searchRequest, nextPage, cursors, pageSize))
  }

  const handlePageSizeChange = (nextPageSize: number) => {
    if (!searchRequest || nextPageSize < 1) return
    const resetCursors = [0]
    setCursors(resetCursors)
    setPage(1)
    setResetPagination(r => !r)
    setPageSize(nextPageSize)
    setSearchRequest({
      ...searchRequest,
      date: new Date().toISOString(),
      pagination: { cursor: 0, pageSize: nextPageSize },
    })
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar 
        position="sticky" 
        elevation={0}
        sx={{
          background: 'rgba(15, 23, 41, 0.6)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <Toolbar>
          <Typography variant="h5" component="div" sx={{ flexGrow: 1, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
            <TravelExploreIcon />
            {t('LABEL.APP_TITLE')} - {t('LABEL.APP_SUBTITLE')}
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5, mr: 1 }}>
            <Button
              size="small"
              onClick={() => void i18n.changeLanguage('en')}
              color="inherit"
              variant={i18n.language === 'en' ? 'outlined' : 'text'}
              sx={{ minWidth: 0, px: 1.5, py: 0.5, fontSize: '0.75rem' }}
            >
              EN
            </Button>
            <Button
              size="small"
              onClick={() => void i18n.changeLanguage('fr')}
              color="inherit"
              variant={i18n.language === 'fr' ? 'outlined' : 'text'}
              sx={{ minWidth: 0, px: 1.5, py: 0.5, fontSize: '0.75rem' }}
            >
              FR
            </Button>
          </Box>
          <IconButton color="inherit" onClick={() => setAboutOpen(true)} aria-label={t('COMMAND.ABOUT')}>
            <InfoOutlinedIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ mt: 4, mb: 4, flex: 1, px: { xs: 2, md: 3 } }}>
        <Typography variant="body1" color="text.secondary" paragraph>
          {t('MESSAGE.APP_DESCRIPTION')}
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'stretch', flexDirection: { xs: 'column', md: 'row' }, mb: 2 }}>
          <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <LocationInput
              ref={locationRef}
              onLocationChange={handleLocationChange}
              onLoadingChange={setLocationLoading}
            />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <FilterControls filters={filters} onFiltersChange={handleFiltersChange} />
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

        {searchRequest && (
          <ObjectsList
            objects={data?.objects || []}
            loading={isLoading}
            error={error}
            pagination={data?.pagination}
            page={page}
            onPageChange={handlePageChange}
            pageSize={pageSize}
            onPageSizeChange={handlePageSizeChange}
            resetPagination={resetPagination}
          />
        )}
      </Container>

      <Box 
        component="footer" 
        sx={{ 
          py: 3, 
          px: 2, 
          mt: 'auto',
          background: 'rgba(15, 23, 41, 0.6)',
          backdropFilter: 'blur(10px)',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <Container maxWidth="lg">
          <Typography variant="body2" color="text.secondary" align="center">
            {t('MESSAGE.DATA_PROVIDED_BY')}{' '}
            <Link href="https://antares.noirlab.edu/" target="_blank" rel="noopener">
              ANTARES
            </Link>{' '}
            {t('MESSAGE.AND_THE')}{' '}
            <Link href="https://rubinobservatory.org/" target="_blank" rel="noopener">
              Vera C. Rubin Observatory
            </Link>
          </Typography>
        </Container>
      </Box>

      <Dialog open={aboutOpen} onClose={() => setAboutOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('LABEL.ABOUT_TITLE')}</DialogTitle>
        <DialogContent>
          <DialogContentText paragraph>
            {t('MESSAGE.ABOUT_PARA_1')}
          </DialogContentText>
          <DialogContentText paragraph>
            {t('MESSAGE.ABOUT_PARA_2')}
          </DialogContentText>
          <DialogContentText paragraph>
            <strong>{t('LABEL.CONSUMER_TELESCOPES')}:</strong> {t('MESSAGE.ABOUT_PARA_3')}
          </DialogContentText>
          <DialogContentText>
            {t('MESSAGE.ABOUT_LEARN_MORE')}{' '}
            <Link href="https://antares.noirlab.edu/" target="_blank" rel="noopener">
              ANTARES Portal
            </Link>
          </DialogContentText>
        </DialogContent>
      </Dialog>
    </Box>
  )
}

export default App
