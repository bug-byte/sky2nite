import DataTable, {
  createTheme,
  type TableColumn,
} from "react-data-table-component";
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Link,
  Stack,
  Chip,
  Tooltip,
  IconButton,
  Select,
  MenuItem,
} from "@mui/material";
import {
  StarsOutlined as StarsOutlinedIcon,
  NavigateBefore as NavigateBeforeIcon,
  NavigateNext as NavigateNextIcon,
  FilterList as FilterListIcon,
} from "@mui/icons-material";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { VisibleObject } from 'shared/types';
import SkyPreview from './skyPreview/SkyPreview';

// Dark glass theme matching the app's visual style
createTheme(
  "sky2nite",
  {
    text: {
      primary: "rgba(255, 255, 255, 0.87)",
      secondary: "rgba(255, 255, 255, 0.6)",
    },
    background: { default: "transparent" },
    context: { background: "rgba(255, 255, 255, 0.1)", text: "#ffffff" },
    divider: { default: "rgba(255, 255, 255, 0.1)" },
    sortFocus: { default: "rgba(255, 255, 255, 0.6)" },
    highlightOnHover: {
      default: "rgba(255, 255, 255, 0.05)",
      text: "rgba(255, 255, 255, 0.87)",
    },
    action: {
      button: "rgba(255, 255, 255, 0.54)",
      hover: "rgba(255, 255, 255, 0.08)",
      disabled: "rgba(255, 255, 255, 0.18)",
    },
  },
  "dark",
);

type ObjectsListProps = {
  objects: VisibleObject[];
  loading: boolean;
  error: Error | null;
  pagination?: {
    pageSize: number;
    hasNextPage: boolean;
    nextCursor: number | null;
    antaresTotalLoci: number;
  };
  page: number;
  onPageChange: (page: number) => void;
  pageSize: number;
  onPageSizeChange: (pageSize: number) => void;
  filtersVisible: boolean;
  onToggleFilters: () => void;
}

export default function ObjectsList({
  objects,
  loading,
  error,
  pagination,
  page,
  onPageChange,
  pageSize,
  onPageSizeChange,
  filtersVisible,
  onToggleFilters,
}: ObjectsListProps) {
  const { t } = useTranslation();

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const columns = useMemo<TableColumn<VisibleObject>[]>(
    () => [
      {
        id: "skyPreview",
        name: <span style={{ paddingLeft: '8px' }}>{t('LABEL.SKY')}</span>,
        cell: (row) => (
          <SkyPreview ra={row.ra} dec={row.dec} antaresUrl={row.antaresUrl} />
        ),
        width: "116px",
        compact: true,
      },
      {
        id: "locusId",
        name: t("LABEL.LOCUS_ID"),
        selector: (row) => row.locusId,
        sortable: true,
        width: "140px",
        cell: (row) => (
          <Tooltip title={row.locusId} placement="top" enterDelay={400}>
            <Box
              sx={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: "100%",
              }}
            >
              {row.locusId}
            </Box>
          </Tooltip>
        ),
      },
      {
        id: "magnitude",
        name: t("LABEL.MAGNITUDE"),
        selector: (row) => row.magnitude,
        sortable: true,
        right: true,
        width: "110px",
        format: (row) => row.magnitude.toFixed(2),
      },
      {
        id: "ra",
        name: (
          <Tooltip title={t("LABEL.RA_TOOLTIP")} placement="top">
            <span>RA</span>
          </Tooltip>
        ),
        selector: (row) => row.ra,
        sortable: true,
        right: true,
        width: "90px",
        format: (row) => row.ra.toFixed(4),
      },
      {
        id: "dec",
        name: (
          <Tooltip title={t("LABEL.DEC_TOOLTIP")} placement="top">
            <span>Dec</span>
          </Tooltip>
        ),
        selector: (row) => row.dec,
        sortable: true,
        right: true,
        width: "90px",
        format: (row) => row.dec.toFixed(4),
      },
      {
        id: "visibleWindow",
        name: t("LABEL.VISIBLE_WINDOW"),
        selector: (row) => row.visibilityWindow.start,
        sortable: true,
        cell: (row) => (
          <Box sx={{ py: 0.5 }}>
            <Typography
              variant="body2"
              sx={{ fontFamily: "monospace", fontSize: "0.8rem" }}
            >
              {formatTime(row.visibilityWindow.start)} –{" "}
              {formatTime(row.visibilityWindow.end)}
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: "rgba(255,255,255,0.6)" }}
            >
              {t("MESSAGE.HOURS_ALTITUDE", {
                hours: row.visibilityWindow.duration.toFixed(1),
                altitude: row.maxAltitude,
              })}
            </Typography>
          </Box>
        ),
        minWidth: "230px",
        grow: 0,
      },
      {
        id: "maxAltitude",
        name: t("LABEL.MAX_ALTITUDE"),
        selector: (row) => row.maxAltitude,
        sortable: true,
        right: true,
        width: "130px",
        format: (row) => `${row.maxAltitude.toFixed(1)}°`,
      },
      {
        id: "tags",
        name: t("LABEL.CLASSIFICATIONS"),
        cell: (row) => (
          <Stack
            direction="row"
            spacing={0.5}
            useFlexGap
            flexWrap="wrap"
            sx={{ py: 0.5 }}
          >
            {row.tags.slice(0, 3).map((tag) => (
              <Chip key={tag} label={tag.replace(/_/g, " ")} size="small" />
            ))}
            {row.tags.length > 3 && (
              <Tooltip
                title={
                  <Stack
                    direction="row"
                    spacing={0.5}
                    useFlexGap
                    flexWrap="wrap"
                    sx={{ p: 0.5 }}
                  >
                    {row.tags.slice(3).map((tag) => (
                      <Chip
                        key={tag}
                        label={tag.replace(/_/g, " ")}
                        size="small"
                      />
                    ))}
                  </Stack>
                }
                arrow
              >
                <Chip
                  label={t("MESSAGE.MORE_TAGS", { count: row.tags.length - 3 })}
                  size="small"
                  variant="outlined"
                  sx={{ cursor: "default" }}
                />
              </Tooltip>
            )}
          </Stack>
        ),
        minWidth: "200px",
        grow: 1,
      },
      {
        id: "details",
        name: t("LABEL.DETAILS"),
        cell: (row) => (
          <Link
            href={row.antaresUrl}
            target="_blank"
            rel="noopener noreferrer"
            fontSize="small"
          >
            {t("COMMAND.VIEW_DETAILS")}
          </Link>
        ),
        width: "130px",
        button: true,
      },
    ],
    [t],
  );

  // Synthesise a paginationTotalRows that keeps DataTable's "Next" button in sync
  // with our cursor-based server pagination. We can't know the true visible-object
  // total in advance, so we set a value that is either:
  //   • one full page beyond the current page when the server says there are more, or
  //   • exactly the objects seen so far when we're on the last page.
  const paginationTotalRows = !pagination
    ? objects.length
    : pagination.hasNextPage
      ? page * pageSize + pageSize
      : (page - 1) * pageSize + objects.length;

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        <Typography variant="h6" gutterBottom>
          {t("ERROR.LOADING_OBJECTS_FAILED")}
        </Typography>
        <Typography variant="body2">{error.message}</Typography>
      </Alert>
    );
  }

  return (
    <Box
      sx={{
        mt: 2,
        background: "rgba(15, 23, 41, 0.4)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(255, 255, 255, 0.15)",
        borderRadius: "1rem",
        boxShadow: "0 0.5rem 2rem 0 rgba(0, 0, 0, 0.37)",
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          px: 3,
          pt: 3,
          pb: 2,
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
        }}
      >
        <Box>
          <Typography
            variant="h5"
            sx={{ display: "flex", alignItems: "center", gap: 1 }}
          >
            <StarsOutlinedIcon />
            {loading
              ? t("MESSAGE.SEARCHING")
              : t("MESSAGE.OBJECTS_VISIBLE", { count: paginationTotalRows })}
          </Typography>
        </Box>

        {pagination && !loading && (
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <IconButton
              size="small"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              aria-label={t("COMMAND.PREVIOUS_PAGE")}
            >
              <NavigateBeforeIcon />
            </IconButton>
            <Typography
              variant="body2"
              sx={{
                px: 0.5,
                minWidth: 80,
                textAlign: "center",
                whiteSpace: "nowrap",
              }}
            >
              Page {page} of {page + (pagination.hasNextPage ? 1 : 0)}
              {pagination.hasNextPage ? "+" : ""}
            </Typography>
            <IconButton
              size="small"
              onClick={() => onPageChange(page + 1)}
              disabled={!pagination.hasNextPage}
              aria-label={t("COMMAND.NEXT_PAGE")}
            >
              <NavigateNextIcon />
            </IconButton>
            <Select
              size="small"
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              sx={{ ml: 1, minWidth: 100, fontSize: "0.875rem" }}
            >
              {[100, 250, 500].map((n) => (
                <MenuItem key={n} value={n}>
                  {n} / page
                </MenuItem>
              ))}
            </Select>
            <Tooltip
              title={filtersVisible ? "Hide filters" : "Show filters"}
              placement="top"
            >
              <IconButton
                size="small"
                onClick={onToggleFilters}
                aria-label={filtersVisible ? "Hide filters" : "Show filters"}
                sx={{
                  ml: 0.5,
                  color: filtersVisible ? "primary.main" : "text.secondary",
                }}
              >
                <FilterListIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        )}
      </Box>

      <DataTable
        columns={columns}
        data={objects}
        keyField="locusId"
        theme="sky2nite"
        defaultSortFieldId="magnitude"
        defaultSortAsc={true}
        highlightOnHover
        dense
        persistTableHead
        progressPending={loading}
        progressComponent={
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              py: 8,
            }}
          >
            <CircularProgress size={60} />
            <Typography variant="h6" sx={{ mt: 2 }}>
              {t("MESSAGE.SEARCHING")}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {t("MESSAGE.SEARCHING_SUBTITLE")}
            </Typography>
          </Box>
        }
        noDataComponent={
          <Box sx={{ padding: "2rem", textAlign: "center" }}>
            <Typography variant="h6" gutterBottom>
              {t("MESSAGE.NO_OBJECTS_TITLE")}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t("MESSAGE.NO_OBJECTS_DESCRIPTION")}
            </Typography>
          </Box>
        }
      />
    </Box>
  );
}
