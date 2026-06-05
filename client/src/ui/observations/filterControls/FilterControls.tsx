import { useState, useEffect } from "react";
import { Typography, Slider, Box, Paper, TextField } from "@mui/material";
import { TuneOutlined as TuneOutlinedIcon } from "@mui/icons-material";
import { useTranslation } from "react-i18next";

export type Filters = {
  maxMagnitude: number;
  objectTypes: string[];
  minAltitude: number;
  minAlerts: number;
}

type FilterControlsProps = {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  visibilityStart: string;
  onVisibilityStartChange: (value: string) => void;
  visibilityEnd: string;
  onVisibilityEndChange: (value: string) => void;
  /** 'card' (default) renders with its own Paper and title.
   *  'embedded' renders a plain Box for use inside another card. */
  variant?: 'card' | 'embedded';
}

export default function FilterControls({
  filters,
  onFiltersChange,
  visibilityStart,
  onVisibilityStartChange,
  visibilityEnd,
  onVisibilityEndChange,
  variant = 'card',
}: FilterControlsProps) {
  const { t } = useTranslation();

  // Local state tracks the visual slider position during drag.
  // onFiltersChange (which triggers a network request) is only called on commit.
  const [localMagnitude, setLocalMagnitude] = useState(filters.maxMagnitude);
  const [localAltitude, setLocalAltitude] = useState(filters.minAltitude);

  // Sync local state if filters change externally (e.g. reset), but not during drag.
  useEffect(() => { setLocalMagnitude(filters.maxMagnitude); }, [filters.maxMagnitude]);
  useEffect(() => { setLocalAltitude(filters.minAltitude); }, [filters.minAltitude]);

  const handleMagnitudeChange = (
    _event: Event,
    newValue: number | number[],
  ) => {
    setLocalMagnitude(newValue as number);
  };

  const handleMagnitudeCommit = (
    _event: React.SyntheticEvent | Event,
    newValue: number | number[],
  ) => {
    onFiltersChange({ ...filters, maxMagnitude: newValue as number });
  };

  const handleMinAltitudeChange = (
    _event: Event,
    newValue: number | number[],
  ) => {
    setLocalAltitude(newValue as number);
  };

  const handleMinAltitudeCommit = (
    _event: React.SyntheticEvent | Event,
    newValue: number | number[],
  ) => {
    onFiltersChange({ ...filters, minAltitude: newValue as number });
  };

  const getMagnitudeLabel = (value: number) => {
    if (value <= 12) return t("MESSAGE.MAGNITUDE_EASY", { value });
    if (value <= 14) return t("MESSAGE.MAGNITUDE_GOOD", { value });
    if (value <= 16) return t("MESSAGE.MAGNITUDE_DARK", { value });
    return t("MESSAGE.MAGNITUDE_HARD", { value });
  };

  const content = (
    <>
      {variant === 'card' && (
        <Typography
          variant="h6"
          gutterBottom
          sx={{ display: "flex", alignItems: "center", gap: 1 }}
        >
          <TuneOutlinedIcon
            fontSize="small"
            sx={{ position: "relative", top: "-0.1em" }}
          />
          {t("LABEL.OBSERVATION_PARAMETERS")}
        </Typography>
      )}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "repeat(2, minmax(0, 1fr))" },
          gap: 3,
          mt: variant === 'card' ? 3 : 0,
          mb: variant === 'card' ? 4 : 2,
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography gutterBottom>
            {t("LABEL.MAXIMUM_MAGNITUDE")}: {" "}
            {getMagnitudeLabel(localMagnitude)}
          </Typography>
          <Slider
            value={localMagnitude}
            onChange={handleMagnitudeChange}
            onChangeCommitted={handleMagnitudeCommit}
            min={10}
            max={18}
            step={0.5}
            marks={[
              { value: 10, label: "10" },
              { value: 12, label: "12" },
              { value: 14, label: "14" },
              { value: 16, label: "16" },
              { value: 18, label: "18" },
            ]}
            valueLabelDisplay="auto"
          />
          <Typography variant="caption" color="text.secondary">
            {t("MESSAGE.MAGNITUDE_HELP")}
          </Typography>
        </Box>

        <Box sx={{ minWidth: 0 }}>
          <Typography gutterBottom>
            {t("LABEL.MINIMUM_ALTITUDE")}: {localAltitude}°
          </Typography>
          <Slider
            value={localAltitude}
            onChange={handleMinAltitudeChange}
            onChangeCommitted={handleMinAltitudeCommit}
            min={0}
            max={60}
            step={5}
            marks={[
              { value: 0, label: "0°" },
              { value: 15, label: "15°" },
              { value: 30, label: "30°" },
              { value: 45, label: "45°" },
              { value: 60, label: "60°" },
            ]}
            valueLabelDisplay="auto"
            valueLabelFormat={(v) => `${v}°`}
          />
          <Typography variant="caption" color="text.secondary">
            {t("MESSAGE.ALTITUDE_HELP")}
          </Typography>
        </Box>

      </Box>

      {variant !== 'embedded' && (
        <Box sx={{ display: "flex", gap: 1, mt: 2 }}>
          <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              {t("LABEL.VISIBILITY_FROM")}
            </Typography>
            <TextField
              type="time"
              value={visibilityStart}
              onChange={(event) => onVisibilityStartChange(event.target.value)}
              size="small"
              fullWidth
            />
          </Box>
          <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              {t("LABEL.VISIBILITY_TO")}
            </Typography>
            <TextField
              type="time"
              value={visibilityEnd}
              onChange={(event) => onVisibilityEndChange(event.target.value)}
              size="small"
              fullWidth
            />
          </Box>
        </Box>
      )}
    </>
  );

  if (variant === 'embedded') {
    return <Box>{content}</Box>;
  }

  return (
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
      {content}
    </Paper>
  );
}
