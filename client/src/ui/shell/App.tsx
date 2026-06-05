import { useState, useRef, useMemo, useEffect, useCallback } from 'react'
import { Routes, Route } from 'react-router-dom'
import PageTransition from './PageTransition'
import StarField from './StarField'
import { useTranslation } from 'react-i18next'
import { Box, Container, Typography, Link, Dialog, DialogTitle, DialogContent, DialogContentText } from '@mui/material'
import NavBar from './navBar/NavBar'
import ObservationsPage from '../observations/ObservationsPage'
import SettingsPage from '../settings/SettingsPage'
import MyObservationsPage from '../myObservations/MyObservationsPage'
import AuthCard from './auth/AuthCard'
import { useVisibleObjects, useAvailableTags } from '../../hooks/useVisibleObjects'
import { useSavedObservations, useSaveObservation } from '../../hooks/useSavedObservations'
import type { FilterPreset, SearchRequest, VisibleObject } from 'shared/types'
import { api, type AuthUser } from '../../services/api'
import type { LocationInputHandle } from '../observations/locationInput/LocationInput'
import type { Filters } from '../observations/filterControls/FilterControls'
import { DEFAULT_USER_SETTINGS } from 'shared/userSettings'
import type { RareClassificationSettings } from 'shared/types'

function App() {
  const [searchRequest, setSearchRequest] = useState<SearchRequest | null>(
    null,
  );
  const [aboutOpen, setAboutOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(500);
  const [cursors, setCursors] = useState<number[]>([0]);
  const [filters, setFilters] = useState<Filters>({
    maxMagnitude: 14,
    objectTypes: [],
    minAltitude: 15,
    minAlerts: 5,
  });
  const [locusIdFilter, setLocusIdFilter] = useState("");
  const [visibilityStart, setVisibilityStart] = useState("");
  const [visibilityEnd, setVisibilityEnd] = useState("");
  const locationRef = useRef<LocationInputHandle>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [authMode, setAuthMode] = useState<"setup" | "login">("login");
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [filtersVisible, setFiltersVisible] = useState(true);
  const [particlesEnabled, setParticlesEnabled] = useState(true);
  const [rareClassificationSettings, setRareClassificationSettings] = useState<RareClassificationSettings>(DEFAULT_USER_SETTINGS.rareClassifications);

  // Sync body class so the CSS fallback background activates when particles are off
  useEffect(() => {
    document.body.classList.toggle('particles-off', !particlesEnabled);
  }, [particlesEnabled]);
  const { t } = useTranslation();

  const { data, isLoading, error } = useVisibleObjects(
    searchRequest,
    searchRequest !== null,
  );
  const { data: availableTags = [] } = useAvailableTags(Boolean(authUser));
  const savedObservationsQuery = useSavedObservations(Boolean(authUser));
  const savedObservations = savedObservationsQuery.data ?? [];
  const saveObservation = useSaveObservation();

  const savedLocusIds = useMemo(
    () => new Set(savedObservations.map((o) => o.locusId)),
    [savedObservations],
  );

  const handleSave = useCallback(
    (object: VisibleObject) => {
      saveObservation.mutate({
        locusId: object.locusId,
        ra: object.ra,
        dec: object.dec,
        magnitude: object.magnitude,
        numAlerts: object.numAlerts,
        transitTime: object.transitTime,
        tags: object.tags,
        visibilityWindow: object.visibilityWindow,
        maxAltitude: object.maxAltitude,
        objectIds: object.objectIds,
        antaresUrl: object.antaresUrl,
      });
    },
    [saveObservation],
  );

  useEffect(() => {
    let cancelled = false;

    const bootstrapAuth = async () => {
      setAuthLoading(true);
      setAuthError(null);

      try {
        const status = await api.getSetupStatus();
        if (cancelled) return;

        const nextMode = status.isSetupComplete ? "login" : "setup";
        setAuthMode(nextMode);

        const token = api.getStoredAuthToken();
        if (status.isSetupComplete && token) {
          try {
            const user = await api.getCurrentUser();
            if (cancelled) return;
            setAuthUser(user);
            // Load user settings after successful auth
            try {
              const settings = await api.getSettings();
              if (!cancelled) setParticlesEnabled(settings.particlesEnabled);
              if (!cancelled) setRareClassificationSettings(settings.rareClassifications);
            } catch {
              // settings fetch failing is non-fatal; keep default (true)
            }
          } catch {
            api.clearAuthToken();
          }
        }
      } catch (e) {
        if (!cancelled) {
          setAuthError(
            e instanceof Error
              ? e.message
              : "Failed to initialize authentication state.",
          );
        }
      } finally {
        if (!cancelled) {
          setAuthLoading(false);
        }
      }
    };

    void bootstrapAuth();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleAuthenticate = async (username: string, password: string) => {
    setAuthLoading(true);
    setAuthError(null);

    try {
      const user =
        authMode === "setup"
          ? await api.setupFirstUser(username, password)
          : await api.login(username, password);
      setAuthMode("login");
      setAuthUser(user);
    } catch (e) {
      setAuthError(e instanceof Error ? e.message : "Authentication failed.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    api.clearAuthToken();
    setAuthUser(null);
    setSearchRequest(null);
    setPage(1);
    setCursors([0]);
  };

  const handleSettingsChange = async (patch: Partial<{ particlesEnabled: boolean; rareClassifications: RareClassificationSettings }>) => {
    const updated = await api.updateSettings(patch);
    setParticlesEnabled(updated.particlesEnabled);
    setRareClassificationSettings(updated.rareClassifications);
  };

  const filteredObjects = useMemo(() => {
    let objs = data?.objects ?? [];

    if (locusIdFilter.trim()) {
      const q = locusIdFilter.trim().toLowerCase();
      objs = objs.filter((o) => o.locusId.toLowerCase().includes(q));
    }

    if (visibilityStart || visibilityEnd) {
      // Map HH:MM to minutes; treat 00-11 as post-midnight (+24h) for overnight spans
      const toMins = (hhmm: string) => {
        const [h, m] = hhmm.split(":").map(Number);
        return (h < 12 ? h + 24 : h) * 60 + m;
      };
      const isoToMins = (iso: string) => {
        const d = new Date(iso);
        const h = d.getHours();
        return (h < 12 ? h + 24 : h) * 60 + d.getMinutes();
      };
      const filterStart = visibilityStart ? toMins(visibilityStart) : null;
      const filterEnd = visibilityEnd ? toMins(visibilityEnd) : null;

      objs = objs.filter((o) => {
        const winStart = isoToMins(o.visibilityWindow.start);
        const winEnd = isoToMins(o.visibilityWindow.end);
        if (filterEnd !== null && winStart > filterEnd) return false;
        if (filterStart !== null && winEnd < filterStart) return false;
        return true;
      });
    }

    return objs;
  }, [data?.objects, locusIdFilter, visibilityStart, visibilityEnd]);

  // When a page loads successfully, record its nextCursor so the next page is available.
  const nextCursor = data?.pagination?.nextCursor ?? null;
  if (nextCursor !== null && cursors.length <= page) {
    setCursors((prev) => {
      if (prev.length <= page) {
        const updated = [...prev];
        updated[page] = nextCursor;
        return updated;
      }
      return prev;
    });
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
  });

  const handleLocationChange = (latitude: number, longitude: number) => {
    const resetCursors = [0];
    setCursors(resetCursors);
    setPage(1);
    setSearchRequest({
      latitude,
      longitude,
      date: new Date().toISOString(),
      filters: {
        maxMagnitude: filters.maxMagnitude,
        objectTypes: filters.objectTypes,
        minAltitude: filters.minAltitude,
          minAlerts: filters.minAlerts,
      },
      pagination: { cursor: 0, pageSize },
    });
  };

  const handleFiltersChange = (newFilters: Filters) => {
    setFilters(newFilters);
    if (searchRequest) {
      const resetCursors = [0];
      setCursors(resetCursors);
      setPage(1);
      setSearchRequest({
        ...searchRequest,
        date: new Date().toISOString(),
        filters: {
          maxMagnitude: newFilters.maxMagnitude,
          objectTypes: newFilters.objectTypes,
          minAltitude: newFilters.minAltitude,
          minAlerts: newFilters.minAlerts,
        },
        pagination: { cursor: 0, pageSize },
      });
    }
  };

  const handleApplyPreset = useCallback((preset: FilterPreset) => {
    const nextFilters: Filters = {
      maxMagnitude: preset.maxMagnitude ?? filters.maxMagnitude,
      objectTypes: preset.objectTypes,
      minAltitude: preset.minAltitude ?? filters.minAltitude,
      minAlerts: preset.minAlerts ?? filters.minAlerts,
    };
    setFilters(nextFilters);
    setVisibilityStart(preset.visibilityStart ?? '');
    setVisibilityEnd(preset.visibilityEnd ?? '');
    if (searchRequest) {
      const resetCursors = [0];
      setCursors(resetCursors);
      setPage(1);
      setSearchRequest({
        ...searchRequest,
        date: new Date().toISOString(),
        filters: {
          maxMagnitude: nextFilters.maxMagnitude,
          objectTypes: nextFilters.objectTypes,
          minAltitude: nextFilters.minAltitude,
          minAlerts: nextFilters.minAlerts,
        },
        pagination: { cursor: 0, pageSize },
      });
    }
  }, [filters, searchRequest, pageSize]);

  const handlePageChange = (nextPage: number) => {
    if (!searchRequest || nextPage < 1 || cursors[nextPage - 1] === undefined)
      return;
    setPage(nextPage);
    setSearchRequest(buildRequest(searchRequest, nextPage, cursors, pageSize));
  };

  const handlePageSizeChange = (nextPageSize: number) => {
    if (!searchRequest || nextPageSize < 1) return;
    const resetCursors = [0];
    setCursors(resetCursors);
    setPage(1);
    setPageSize(nextPageSize);
    setSearchRequest({
      ...searchRequest,
      date: new Date().toISOString(),
      pagination: { cursor: 0, pageSize: nextPageSize },
    });
  };

  if (!authUser) {
    return (
      <>
        {particlesEnabled && <StarField />}
        <AuthCard
          mode={authMode}
          loading={authLoading}
          error={authError}
          onSubmit={handleAuthenticate}
        />
      </>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {particlesEnabled && <StarField />}
      <NavBar
        drawerOpen={drawerOpen}
        onDrawerOpen={() => setDrawerOpen(true)}
        onDrawerClose={() => setDrawerOpen(false)}
        authUser={authUser}
        onLogout={handleLogout}
        onAboutOpen={() => setAboutOpen(true)}
      />

      {/* Page content */}
      <PageTransition>
        <Routes>
          <Route path="/" element={
            <ObservationsPage
              locationRef={locationRef}
              filters={filters}
              onFiltersChange={handleFiltersChange}
              availableTags={availableTags}
              locusIdFilter={locusIdFilter}
              onLocusIdFilterChange={setLocusIdFilter}
              visibilityStart={visibilityStart}
              onVisibilityStartChange={setVisibilityStart}
              visibilityEnd={visibilityEnd}
              onVisibilityEndChange={setVisibilityEnd}
              locationLoading={locationLoading}
              onLocationLoadingChange={setLocationLoading}
              onLocationChange={handleLocationChange}
              filtersVisible={filtersVisible}
              onToggleFilters={() => setFiltersVisible((v) => !v)}
              searchRequest={searchRequest}
              objects={filteredObjects}
              loading={isLoading}
              error={error}
              pagination={data?.pagination}
              page={page}
              onPageChange={handlePageChange}
              pageSize={pageSize}
              onPageSizeChange={handlePageSizeChange}
              savedLocusIds={savedLocusIds}
              onSave={handleSave}
              rareClassificationSettings={rareClassificationSettings}
              isAuthenticated={Boolean(authUser)}
              onApplyPreset={handleApplyPreset}
            />
          } />
          <Route path="/my-observations" element={
            <MyObservationsPage
              observations={savedObservations}
              isLoading={savedObservationsQuery.isLoading}
              error={savedObservationsQuery.error}
              rareClassificationSettings={rareClassificationSettings}
            />
          } />
          <Route path="/settings" element={
            <Container maxWidth="lg" sx={{ mt: 4, mb: 4, px: { xs: 2, md: 3 } }}>
              <SettingsPage
                authUser={authUser}
                onUserUpdated={(updated) => setAuthUser(updated)}
                availableTags={availableTags}
                rareClassificationSettings={rareClassificationSettings}
                onRareClassificationSettingsChange={async (settings) => {
                  await handleSettingsChange({ rareClassifications: settings });
                }}
                particlesEnabled={particlesEnabled}
                onParticlesToggle={async (enabled) => {
                  await handleSettingsChange({ particlesEnabled: enabled });
                }}
              />
            </Container>
          } />
        </Routes>
      </PageTransition>

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
            <Link href="https://antares.noirlab.edu/" target="_blank" rel="noopener">ANTARES</Link>{' '}
            {t('MESSAGE.AND_THE')}{' '}
            <Link href="https://rubinobservatory.org/" target="_blank" rel="noopener">Vera C. Rubin Observatory</Link>
            {' — '}{t('MESSAGE.WRITTEN_BY')}
          </Typography>
        </Container>
      </Box>

      <Dialog open={aboutOpen} onClose={() => setAboutOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('LABEL.ABOUT_TITLE')}</DialogTitle>
        <DialogContent>
          <DialogContentText paragraph>{t('MESSAGE.ABOUT_PARA_1')}</DialogContentText>
          <DialogContentText paragraph>{t('MESSAGE.ABOUT_PARA_2')}</DialogContentText>
          <DialogContentText paragraph>
            <strong>{t('LABEL.CONSUMER_TELESCOPES')}:</strong> {t('MESSAGE.ABOUT_PARA_3')}
          </DialogContentText>
          <DialogContentText>
            {t('MESSAGE.ABOUT_LEARN_MORE')}{' '}
            <Link href="https://antares.noirlab.edu/" target="_blank" rel="noopener">ANTARES Portal</Link>
          </DialogContentText>
        </DialogContent>
      </Dialog>
    </Box>
  )
}

export default App
