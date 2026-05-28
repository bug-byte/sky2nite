import { useState } from "react";
import { Box, Typography } from "@mui/material";

interface SkyPreviewProps {
  ra: number;
  dec: number;
  antaresUrl: string;
}

const hips2fits = (hips: string, ra: number, dec: number) =>
  `https://alasky.cds.unistra.fr/hips-image-services/hips2fits?hips=${hips}&ra=${ra}&dec=${dec}&fov=0.12&width=100&height=100&projection=TAN&coordsys=icrs&format=jpg&stretch=asinh&min_cut=0.5%25&max_cut=99.5%25`;

const PANSTARRS = "CDS%2FP%2FPanSTARRS%2FDR1%2Fcolor-z-zg-g";
const DSS2 = "CDS%2FP%2FDSS2%2Fcolor";

export default function SkyPreview({ ra, dec, antaresUrl }: SkyPreviewProps) {
  // PanSTARRS DR1 color (z, zg, g) — matches the Aladin layer ANTARES uses.
  // Does not cover dec < -30°; falls back to DSS2 on error.
  const [src, setSrc] = useState(() => hips2fits(PANSTARRS, ra, dec));
  const [failed, setFailed] = useState(false);

  const handleError = () => {
    if (!src.includes("DSS2")) {
      setSrc(hips2fits(DSS2, ra, dec));
    } else {
      setFailed(true);
    }
  };

  return (
    <Box
      component="a"
      href={antaresUrl}
      target="_blank"
      rel="noopener noreferrer"
      sx={{
        display: "block",
        position: "relative",
        width: 100,
        height: 100,
        flexShrink: 0,
        borderRadius: "4px",
        overflow: "hidden",
        background: "rgba(0,0,20,0.9)",
        my: "4px",
        ml: "8px",
        "&:hover img": { opacity: 0.8 },
      }}
    >
      {!failed && (
        <img
          src={src}
          alt={`Sky at RA ${ra.toFixed(3)} Dec ${dec.toFixed(3)}`}
          width={100}
          height={100}
          loading="lazy"
          decoding="async"
          style={{ display: "block", objectFit: "cover" }}
          onError={handleError}
        />
      )}
      {failed && (
        <Box
          sx={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Typography
            variant="caption"
            sx={{
              color: "rgba(255,255,255,0.3)",
              fontSize: "0.6rem",
              textAlign: "center",
              px: 0.5,
            }}
          >
            No preview
          </Typography>
        </Box>
      )}
      {/* Reticle overlay — centred crosshair matching Aladin's style */}
      {!failed && (
        <Box
          component="svg"
          viewBox="0 0 100 100"
          sx={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
          }}
        >
          <line
            x1="50"
            y1="32"
            x2="50"
            y2="44"
            stroke="red"
            strokeWidth="1"
            strokeOpacity="0.85"
          />
          <line
            x1="50"
            y1="56"
            x2="50"
            y2="68"
            stroke="red"
            strokeWidth="1"
            strokeOpacity="0.85"
          />
          <line
            x1="32"
            y1="50"
            x2="44"
            y2="50"
            stroke="red"
            strokeWidth="1"
            strokeOpacity="0.85"
          />
          <line
            x1="56"
            y1="50"
            x2="68"
            y2="50"
            stroke="red"
            strokeWidth="1"
            strokeOpacity="0.85"
          />
        </Box>
      )}
    </Box>
  );
}
