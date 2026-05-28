import { Typography, Box, Chip, Link, Stack, Paper } from "@mui/material";
import {
  StarOutline as StarOutlineIcon,
  VisibilityOutlined as VisibilityOutlinedIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import type { VisibleObject } from "../types/api";

interface ObjectCardProps {
  object: VisibleObject;
}

export default function ObjectCard({ object }: ObjectCardProps) {
  const { t, i18n } = useTranslation();

  const formatCoordinate = (value: number, decimals: number = 4) => {
    return value.toFixed(decimals);
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    const locale = i18n.language === "fr" ? "fr-CA" : "en-CA";
    return date.toLocaleTimeString(locale, {
      hour: "numeric",
      minute: "2-digit",
      hour12: i18n.language !== "fr",
    });
  };

  return (
    <Paper
      sx={{
        height: "100%",
        padding: "1rem",
        background: "rgba(15, 23, 41, 0.3)",
        backdropFilter: "blur(10px)",
        border: "1px solid rgba(255, 255, 255, 0.2)",
        borderRadius: "0.75rem",
        boxShadow: "0 0.25rem 1rem 0 rgba(0, 0, 0, 0.3)",
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "start",
          mb: 2,
        }}
      >
        <Typography variant="h6" component="div">
          {object.locusId}
        </Typography>
        <Link
          href={object.antaresUrl}
          target="_blank"
          rel="noopener noreferrer"
          sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
        >
          {t("COMMAND.VIEW_DETAILS")}
        </Link>
      </Box>

      <Stack spacing={1.5}>
        <Box>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ display: "flex", alignItems: "center", gap: 0.75 }}
          >
            <StarOutlineIcon fontSize="inherit" />
            <span>
              {t("LABEL.MAGNITUDE")}:{" "}
              <strong>{object.magnitude.toFixed(2)}</strong>
            </span>
          </Typography>
        </Box>

        <Box>
          <Typography variant="body2" color="text.secondary">
            {t("LABEL.COORDINATES")}
          </Typography>
          <Typography variant="body2">
            RA: {formatCoordinate(object.ra)}° | Dec:{" "}
            {formatCoordinate(object.dec)}°
          </Typography>
        </Box>

        <Box>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ display: "flex", alignItems: "center", gap: 0.75 }}
          >
            <VisibilityOutlinedIcon fontSize="inherit" />
            <span>{t("LABEL.VISIBLE_WINDOW")}</span>
          </Typography>
          <Typography variant="body2">
            {formatTime(object.visibilityWindow.start)} -{" "}
            {formatTime(object.visibilityWindow.end)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {t("MESSAGE.HOURS_ALTITUDE", {
              hours: object.visibilityWindow.duration.toFixed(1),
              altitude: object.maxAltitude,
            })}
          </Typography>
        </Box>

        {object.objectIds.ztf && (
          <Typography variant="caption" color="text.secondary">
            {t("LABEL.ZTF_ID")}: {object.objectIds.ztf}
          </Typography>
        )}

        {object.objectIds.lsst && (
          <Typography variant="caption" color="text.secondary">
            {t("LABEL.LSST_ID")}: {object.objectIds.lsst}
          </Typography>
        )}

        {object.tags.length > 0 && (
          <Box>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", mb: 0.5 }}
            >
              {t("LABEL.CLASSIFICATIONS")}
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
              {object.tags.slice(0, 5).map((tag) => (
                <Chip
                  key={tag}
                  label={tag.replace(/_/g, " ")}
                  size="small"
                  variant="outlined"
                />
              ))}
              {object.tags.length > 5 && (
                <Chip
                  label={t("MESSAGE.MORE_TAGS", {
                    count: object.tags.length - 5,
                  })}
                  size="small"
                  variant="outlined"
                />
              )}
            </Box>
          </Box>
        )}
      </Stack>
    </Paper>
  );
}
