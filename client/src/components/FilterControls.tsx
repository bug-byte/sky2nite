import { Typography, Slider, Box, Paper } from "@mui/material";
import { TuneOutlined as TuneOutlinedIcon } from "@mui/icons-material";
import { useTranslation } from "react-i18next";

export interface Filters {
  maxMagnitude: number;
  objectTypes: string[];
  minAltitude: number;
}

interface FilterControlsProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
}

export default function FilterControls({
  filters,
  onFiltersChange,
}: FilterControlsProps) {
  const { t } = useTranslation();

  const handleMagnitudeChange = (
    _event: Event,
    newValue: number | number[],
  ) => {
    onFiltersChange({
      ...filters,
      maxMagnitude: newValue as number,
    });
  };

  const handleMinAltitudeChange = (
    _event: Event,
    newValue: number | number[],
  ) => {
    onFiltersChange({
      ...filters,
      minAltitude: newValue as number,
    });
  };

  const getMagnitudeLabel = (value: number) => {
    if (value <= 12) return t("MESSAGE.MAGNITUDE_EASY", { value });
    if (value <= 14) return t("MESSAGE.MAGNITUDE_GOOD", { value });
    if (value <= 16) return t("MESSAGE.MAGNITUDE_DARK", { value });
    return t("MESSAGE.MAGNITUDE_HARD", { value });
  };

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

      <Box sx={{ display: "flex", gap: 4, mt: 3, mb: 4 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography gutterBottom>
            {t("LABEL.MAXIMUM_MAGNITUDE")}:{" "}
            {getMagnitudeLabel(filters.maxMagnitude)}
          </Typography>
          <Slider
            value={filters.maxMagnitude}
            onChange={handleMagnitudeChange}
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

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography gutterBottom>
            {t("LABEL.MINIMUM_ALTITUDE")}: {filters.minAltitude}°
          </Typography>
          <Slider
            value={filters.minAltitude}
            onChange={handleMinAltitudeChange}
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
    </Paper>
  );
}
