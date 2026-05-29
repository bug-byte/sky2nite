import { type TableColumn } from "react-data-table-component";
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Stack,
  Tooltip,
  IconButton,
  Select,
  MenuItem,
} from "@mui/material";
import {
  NavigateBefore as NavigateBeforeIcon,
  NavigateNext as NavigateNextIcon,
  FilterList as FilterListIcon,
  BookmarkAdd as BookmarkAddIcon,
  BookmarkAdded as BookmarkAddedIcon,
} from "@mui/icons-material";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { VisibleObject } from 'shared/types';
import ObjectsDataTable from '../../shared/ObjectsDataTable';

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
  savedLocusIds: Set<string>;
  onSave: (object: VisibleObject) => void;
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
  savedLocusIds,
  onSave,
}: ObjectsListProps) {
  const { t } = useTranslation();

  const saveColumn = useMemo<TableColumn<VisibleObject>>(
    () => ({
      id: "save",
      name: "",
      cell: (row) => {
        const saved = savedLocusIds.has(row.locusId);
        return (
          <Tooltip title={saved ? t("COMMAND.SAVED") : t("COMMAND.SAVE_OBSERVATION")} placement="top">
            <IconButton
              size="small"
              onClick={() => onSave(row)}
              disabled={saved}
              aria-label={saved ? t("COMMAND.SAVED") : t("COMMAND.SAVE_OBSERVATION")}
              sx={{ color: saved ? "primary.main" : "text.secondary" }}
            >
              {saved ? <BookmarkAddedIcon fontSize="small" /> : <BookmarkAddIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        );
      },
      width: "56px",
      button: true,
    }),
    [t, savedLocusIds, onSave],
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

  const headerRight = pagination && !loading ? (
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
        sx={{ px: 0.5, minWidth: 80, textAlign: "center", whiteSpace: "nowrap" }}
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
          sx={{ ml: 0.5, color: filtersVisible ? "primary.main" : "text.secondary" }}
        >
          <FilterListIcon />
        </IconButton>
      </Tooltip>
    </Stack>
  ) : undefined;

  return (
    <ObjectsDataTable
      data={objects}
      keyField="locusId"
      isLoading={loading}
      title={
        loading
          ? t("MESSAGE.SEARCHING")
          : t("MESSAGE.OBJECTS_VISIBLE", { count: paginationTotalRows })
      }
      headerRight={headerRight}
      actionColumn={saveColumn}
      defaultSortFieldId="magnitude"
      defaultSortAsc={true}
      progressComponent={
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", py: 8 }}>
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
  );
}
