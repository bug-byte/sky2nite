import { useState } from 'react'
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
} from '@mui/material'
import { TravelExplore as TravelExploreIcon, InfoOutlined as InfoOutlinedIcon } from '@mui/icons-material'
import LocationInput from './components/LocationInput'
import FilterControls, { type Filters } from './components/FilterControls'
import ObjectsList from './components/ObjectsList'
import { useVisibleObjects } from './hooks/useVisibleObjects'
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
  const { t, i18n } = useTranslation()

  const { data, isLoading, error } = useVisibleObjects(searchRequest, searchRequest !== null)

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
        position="static" 
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

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4, flex: 1 }}>
        <Typography variant="body1" color="text.secondary" paragraph>
          {t('MESSAGE.APP_DESCRIPTION')}
        </Typography>

        <LocationInput onLocationChange={handleLocationChange} />
        <FilterControls filters={filters} onFiltersChange={handleFiltersChange} />

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
