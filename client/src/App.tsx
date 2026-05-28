import { useState, useRef, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useTheme, useMediaQuery } from "@mui/material";
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
  TextField,
  Tooltip,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Collapse,
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material";
import {
  TravelExplore as TravelExploreIcon,
  InfoOutlined as InfoOutlinedIcon,
  FilterAltOutlined as FilterAltOutlinedIcon,
  Search as SearchIcon,
  Logout as LogoutIcon,
  Menu as MenuIcon,
  NightsStay as NightsStayIcon,
  Settings as SettingsIcon,
} from "@mui/icons-material";
import LocationInput, {
  type LocationInputHandle,
} from "./components/LocationInput";
import FilterControls, { type Filters } from "./components/FilterControls";
import ObjectsList from "./components/ObjectsList";
import AuthCard from "./components/AuthCard";
import SettingsPage from "./components/SettingsPage";
import { useVisibleObjects, useAvailableTags } from "./hooks/useVisibleObjects";
import type { SearchRequest } from "./types/api";
import { api, type AuthUser } from "./services/api";

type Page = "observations" | "settings";

const NAV_ITEMS: { id: Page; labelKey: string; icon: React.ReactElement }[] = [
  {
    id: "observations",
    labelKey: "LABEL.NAV_OBSERVATIONS",
    icon: <NightsStayIcon fontSize="small" />,
  },
  {
    id: "settings",
    labelKey: "LABEL.NAV_SETTINGS",
    icon: <SettingsIcon fontSize="small" />,
  },
];

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
  const [activePage, setActivePage] = useState<Page>("observations");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [filtersVisible, setFiltersVisible] = useState(true);
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));

  const { data, isLoading, error } = useVisibleObjects(
    searchRequest,
    searchRequest !== null,
  );
  const { data: availableTags = [] } = useAvailableTags(Boolean(authUser));

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
        },
        pagination: { cursor: 0, pageSize },
      });
    }
  };

  const handleObjectTypesChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    handleFiltersChange({
      ...filters,
      objectTypes: typeof value === "string" ? value.split(",") : value,
    });
  };

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
      <AuthCard
        mode={authMode}
        loading={authLoading}
        error={authError}
        onSubmit={handleAuthenticate}
      />
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          background: "rgba(15, 23, 41, 0.6)",
          backdropFilter: "blur(10px)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
        }}
      >
        <Toolbar sx={{ px: { xs: 1, sm: 2 }, gap: { xs: 0.5, sm: 1 } }}>
          {/* Hamburger — mobile only */}
          <IconButton
            color="inherit"
            edge="start"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation"
            sx={{ display: { xs: "inline-flex", md: "none" }, mr: 0.5 }}
          >
            <MenuIcon />
          </IconButton>

          {/* Logo + title */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.75,
              minWidth: 0,
              flexShrink: 0,
              cursor: "pointer",
            }}
            onClick={() => setActivePage("observations")}
          >
            <TravelExploreIcon
              sx={{ fontSize: { xs: "1.25rem", sm: "1.5rem" } }}
            />
            <Typography
              component="div"
              sx={{
                fontWeight: 600,
                fontSize: { xs: "1rem", sm: "1.25rem" },
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {t("LABEL.APP_TITLE")}
            </Typography>
          </Box>

          {/* Desktop nav links */}
          <Box
            sx={{
              display: { xs: "none", md: "flex" },
              gap: 0.5,
              ml: 2,
              flexGrow: 1,
            }}
          >
            {NAV_ITEMS.map((item) => (
              <Button
                key={item.id}
                color="inherit"
                onClick={() => setActivePage(item.id)}
                startIcon={item.icon}
                sx={{
                  textTransform: "none",
                  fontWeight: activePage === item.id ? 700 : 400,
                  borderBottom:
                    activePage === item.id
                      ? "2px solid currentColor"
                      : "2px solid transparent",
                  borderRadius: 0,
                  px: 1.5,
                  fontSize: "0.875rem",
                }}
              >
                {t(item.labelKey)}
              </Button>
            ))}
          </Box>

          {/* Spacer on mobile */}
          <Box sx={{ flexGrow: 1, display: { xs: "block", md: "none" } }} />

          {/* Language toggle */}
          <Box sx={{ display: "flex", gap: 0.5, flexShrink: 0 }}>
            <Button
              size="small"
              onClick={() => void i18n.changeLanguage("en")}
              color="inherit"
              variant={i18n.language === "en" ? "outlined" : "text"}
              sx={{
                minWidth: 0,
                px: { xs: 1, sm: 1.5 },
                py: 0.5,
                fontSize: "0.75rem",
              }}
            >
              EN
            </Button>
            <Button
              size="small"
              onClick={() => void i18n.changeLanguage("fr")}
              color="inherit"
              variant={i18n.language === "fr" ? "outlined" : "text"}
              sx={{
                minWidth: 0,
                px: { xs: 1, sm: 1.5 },
                py: 0.5,
                fontSize: "0.75rem",
              }}
            >
              FR
            </Button>
          </Box>

          {/* About */}
          <Tooltip title={t("COMMAND.ABOUT")}>
            <IconButton
              color="inherit"
              onClick={() => setAboutOpen(true)}
              aria-label={t("COMMAND.ABOUT")}
              size="small"
            >
              <InfoOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          {/* Logout — icon-only on xs, labeled on sm+ */}
          <Tooltip title={`${authUser.username} — Logout`}>
            <IconButton
              color="inherit"
              onClick={handleLogout}
              aria-label="Logout"
              size="small"
              sx={{ display: { xs: "inline-flex", sm: "none" } }}
            >
              <LogoutIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Button
            color="inherit"
            onClick={handleLogout}
            size="small"
            startIcon={<LogoutIcon fontSize="small" />}
            sx={{
              display: { xs: "none", sm: "inline-flex" },
              ml: 0.5,
              fontSize: "0.8rem",
              textTransform: "none",
              whiteSpace: "nowrap",
            }}
          >
            {authUser.username}
          </Button>
        </Toolbar>
      </AppBar>

      {/* Mobile sidebar drawer */}
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{
          sx: {
            width: 240,
            background: "rgba(15, 23, 41, 0.97)",
            backdropFilter: "blur(16px)",
            borderRight: "1px solid rgba(255,255,255,0.1)",
          },
        }}
      >
        <Box
          sx={{ display: "flex", alignItems: "center", gap: 1, px: 2, py: 2 }}
        >
          <TravelExploreIcon />
          <Typography fontWeight={700}>{t("LABEL.APP_TITLE")}</Typography>
        </Box>
        <Divider sx={{ borderColor: "rgba(255,255,255,0.1)" }} />
        <List disablePadding>
          {NAV_ITEMS.map((item) => (
            <ListItemButton
              key={item.id}
              selected={activePage === item.id}
              onClick={() => {
                setActivePage(item.id);
                setDrawerOpen(false);
              }}
              sx={{
                "&.Mui-selected": { background: "rgba(255,255,255,0.1)" },
                "&:hover": { background: "rgba(255,255,255,0.07)" },
              }}
            >
              <ListItemIcon sx={{ color: "inherit", minWidth: 36 }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={t(item.labelKey)}
                primaryTypographyProps={{ fontSize: "0.9rem" }}
              />
            </ListItemButton>
          ))}
        </List>
        <Divider sx={{ borderColor: "rgba(255,255,255,0.1)" }} />
        <List disablePadding>
          <ListItemButton
            onClick={handleLogout}
            sx={{ "&:hover": { background: "rgba(255,255,255,0.07)" } }}
          >
            <ListItemIcon sx={{ color: "inherit", minWidth: 36 }}>
              <LogoutIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary={`Sign out (${authUser.username})`}
              primaryTypographyProps={{ fontSize: "0.875rem" }}
            />
          </ListItemButton>
        </List>
      </Drawer>

      {/* Sliding page container */}
      <Box
        sx={{
          overflow: "hidden",
          flex: 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Box
          sx={{
            display: "flex",
            flex: 1,
            transform:
              isDesktop && activePage === "settings"
                ? "translateX(-100%)"
                : "translateX(0)",
            transition: isDesktop
              ? "transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)"
              : "none",
            willChange: "transform",
          }}
        >
          {/* Observations page */}
          <Box
            sx={{
              width: "100%",
              flexShrink: 0,
              display:
                !isDesktop && activePage !== "observations"
                  ? "none"
                  : undefined,
            }}
          >
            <Container
              maxWidth="xl"
              sx={{ mt: 4, mb: 4, px: { xs: 2, md: 3 } }}
            >
              <Box sx={{ mb: 3 }}>
                <Typography variant="h4" fontWeight={600} gutterBottom>
                  {t("LABEL.NAV_OBSERVATIONS")}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t("MESSAGE.APP_DESCRIPTION")}
                </Typography>
              </Box>

              <Collapse in={filtersVisible} timeout={300}>
                <Box
                  sx={{
                    display: "flex",
                    gap: 2,
                    alignItems: "stretch",
                    flexDirection: { xs: "column", md: "row" },
                    mb: 2,
                  }}
                >
                  <Box
                    sx={{
                      flex: 1,
                      minWidth: 0,
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <LocationInput
                      ref={locationRef}
                      onLocationChange={handleLocationChange}
                      onLoadingChange={setLocationLoading}
                      locationRequired={!locusIdFilter.trim()}
                    />
                  </Box>
                  <Box
                    sx={{
                      flex: 1,
                      minWidth: 0,
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <FilterControls
                      filters={filters}
                      onFiltersChange={handleFiltersChange}
                    />
                  </Box>
                  <Box
                    sx={{
                      flex: 1,
                      minWidth: 0,
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <Paper
                      sx={{
                        padding: "1.5rem",
                        height: "100%",
                        background: "rgba(15, 23, 41, 0.4)",
                        backdropFilter: "blur(12px)",
                        border: "1px solid rgba(255, 255, 255, 0.3)",
                        borderRadius: "1rem",
                        boxShadow: "0 0.5rem 2rem 0 rgba(0, 0, 0, 0.37)",
                        boxSizing: "border-box",
                      }}
                    >
                      <Typography
                        variant="h6"
                        gutterBottom
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <FilterAltOutlinedIcon
                          fontSize="small"
                          sx={{ position: "relative", top: "-0.1em" }}
                        />
                        {t("LABEL.SEARCH_FILTERS")}
                      </Typography>
                      <FormControl fullWidth>
                        <InputLabel>{t("LABEL.OBJECT_TYPES")}</InputLabel>
                        <Select
                          multiple
                          value={filters.objectTypes}
                          onChange={handleObjectTypesChange}
                          input={
                            <OutlinedInput label={t("LABEL.OBJECT_TYPES")} />
                          }
                          renderValue={(selected) => (
                            <Box
                              sx={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: 0.5,
                              }}
                            >
                              {(selected as string[]).map((value) => (
                                <Chip key={value} label={value} size="small" />
                              ))}
                            </Box>
                          )}
                        >
                          {availableTags.map((tag: string) => (
                            <MenuItem key={tag} value={tag}>
                              {tag.replace(/_/g, " ")}
                            </MenuItem>
                          ))}
                        </Select>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ mt: 1 }}
                        >
                          {t("LABEL.OBJECT_TYPES_HELP")}
                        </Typography>
                      </FormControl>
                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 1.5,
                          mt: 2,
                        }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 0.5,
                          }}
                        >
                          <Box sx={{ display: "flex", gap: 1 }}>
                            <Box
                              sx={{
                                flex: 1,
                                display: "flex",
                                flexDirection: "column",
                                gap: 0.5,
                              }}
                            >
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {t("LABEL.VISIBILITY_FROM")}
                              </Typography>
                              <TextField
                                type="time"
                                value={visibilityStart}
                                onChange={(e) =>
                                  setVisibilityStart(e.target.value)
                                }
                                size="small"
                                fullWidth
                              />
                            </Box>
                            <Box
                              sx={{
                                flex: 1,
                                display: "flex",
                                flexDirection: "column",
                                gap: 0.5,
                              }}
                            >
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {t("LABEL.VISIBILITY_TO")}
                              </Typography>
                              <TextField
                                type="time"
                                value={visibilityEnd}
                                onChange={(e) =>
                                  setVisibilityEnd(e.target.value)
                                }
                                size="small"
                                fullWidth
                              />
                            </Box>
                          </Box>
                        </Box>
                        <TextField
                          label={t("LABEL.LOCUS_ID_SEARCH")}
                          placeholder={t("LABEL.LOCUS_ID_SEARCH_PLACEHOLDER")}
                          value={locusIdFilter}
                          onChange={(e) => setLocusIdFilter(e.target.value)}
                          size="small"
                          fullWidth
                        />
                        {locusIdFilter.trim() && !searchRequest && (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ mt: 0.5 }}
                          >
                            {t("MESSAGE.NAME_FILTER_NEEDS_LOCATION")}
                          </Typography>
                        )}
                      </Box>
                    </Paper>
                  </Box>
                </Box>

                <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
                  <Button
                    variant="contained"
                    size="large"
                    fullWidth
                    onClick={() => locationRef.current?.submit()}
                    disabled={locationLoading}
                  >
                    <SearchIcon
                      fontSize="small"
                      sx={{ mr: 0.75, position: "relative", top: "-0.1em" }}
                    />
                    {t("COMMAND.SEARCH_SKY_OBJECTS")}
                  </Button>
                </Box>
              </Collapse>

              {searchRequest !== null && (
                <ObjectsList
                  objects={filteredObjects}
                  loading={isLoading}
                  error={error}
                  pagination={data?.pagination}
                  page={page}
                  onPageChange={handlePageChange}
                  pageSize={pageSize}
                  onPageSizeChange={handlePageSizeChange}
                  filtersVisible={filtersVisible}
                  onToggleFilters={() => setFiltersVisible((v) => !v)}
                />
              )}
            </Container>
          </Box>

          {/* Settings page */}
          <Box
            sx={{
              width: "100%",
              flexShrink: 0,
              display:
                !isDesktop && activePage !== "settings" ? "none" : undefined,
            }}
          >
            <Container
              maxWidth="md"
              sx={{ mt: 4, mb: 4, px: { xs: 2, md: 3 } }}
            >
              <SettingsPage
                authUser={authUser}
                onUserUpdated={(updated) => setAuthUser(updated)}
              />
            </Container>
          </Box>
        </Box>
      </Box>

      <Box
        component="footer"
        sx={{
          py: 3,
          px: 2,
          mt: "auto",
          background: "rgba(15, 23, 41, 0.6)",
          backdropFilter: "blur(10px)",
          borderTop: "1px solid rgba(255, 255, 255, 0.1)",
        }}
      >
        <Container maxWidth="lg">
          <Typography variant="body2" color="text.secondary" align="center">
            {t("MESSAGE.DATA_PROVIDED_BY")}{" "}
            <Link
              href="https://antares.noirlab.edu/"
              target="_blank"
              rel="noopener"
            >
              ANTARES
            </Link>{" "}
            {t("MESSAGE.AND_THE")}{" "}
            <Link
              href="https://rubinobservatory.org/"
              target="_blank"
              rel="noopener"
            >
              Vera C. Rubin Observatory
            </Link>
            {" — "}
            {t("MESSAGE.WRITTEN_BY")}
          </Typography>
        </Container>
      </Box>

      <Dialog
        open={aboutOpen}
        onClose={() => setAboutOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{t("LABEL.ABOUT_TITLE")}</DialogTitle>
        <DialogContent>
          <DialogContentText paragraph>
            {t("MESSAGE.ABOUT_PARA_1")}
          </DialogContentText>
          <DialogContentText paragraph>
            {t("MESSAGE.ABOUT_PARA_2")}
          </DialogContentText>
          <DialogContentText paragraph>
            <strong>{t("LABEL.CONSUMER_TELESCOPES")}:</strong>{" "}
            {t("MESSAGE.ABOUT_PARA_3")}
          </DialogContentText>
          <DialogContentText>
            {t("MESSAGE.ABOUT_LEARN_MORE")}{" "}
            <Link
              href="https://antares.noirlab.edu/"
              target="_blank"
              rel="noopener"
            >
              ANTARES Portal
            </Link>
          </DialogContentText>
        </DialogContent>
      </Dialog>
    </Box>
  );
}

export default App;
