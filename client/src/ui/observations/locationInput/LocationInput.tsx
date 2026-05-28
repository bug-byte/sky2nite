import {
  useState,
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import { useTranslation } from "react-i18next";
import {
  TextField,
  Button,
  Box,
  Typography,
  Stack,
  Alert,
  Divider,
  Paper,
} from "@mui/material";
import {
  LocationOnOutlined as LocationOnOutlinedIcon,
  MyLocation as MyLocationIcon,
} from "@mui/icons-material";

interface LocationInputProps {
  onLocationChange: (latitude: number, longitude: number) => void;
  onLoadingChange?: (loading: boolean) => void;
  locationRequired?: boolean;
}

export interface LocationInputHandle {
  submit: () => void;
  useCurrentLocation: () => void;
}

// Get Google API key from environment or use a placeholder
const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

const LocationInput = forwardRef<LocationInputHandle, LocationInputProps>(
  function LocationInput(
    { onLocationChange, onLoadingChange, locationRequired = true },
    ref,
  ) {
    const [latitude, setLatitude] = useState<string>("");
    const [longitude, setLongitude] = useState<string>("");
    const [address, setAddress] = useState<string>("");
    const [error, setError] = useState<string>("");
    const [loading, setLoading] = useState(false);
    const { t } = useTranslation();
    const addressInputRef = useRef<HTMLInputElement>(null);
    const autocompleteRef = useRef<{
      addListener(event: string, handler: () => void): void;
      getPlace(): {
        formatted_address?: string;
        geometry?: {
          location?: {
            lat(): number;
            lng(): number;
          };
        };
      };
    } | null>(null);

    useEffect(() => {
      if (!GOOGLE_API_KEY || !addressInputRef.current) {
        return;
      }

      // Load Google Maps API if not already loaded
      if (!window.google) {
        const script = document.createElement("script");
        script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_API_KEY}&libraries=places`;
        script.async = true;
        script.defer = true;
        script.onload = () => initAutocomplete();
        document.head.appendChild(script);
      } else {
        initAutocomplete();
      }

      function initAutocomplete() {
        if (!addressInputRef.current || !window.google) return;

        autocompleteRef.current = new window.google.maps.places.Autocomplete(
          addressInputRef.current,
          {
            types: ["geocode"],
          },
        );

        autocompleteRef.current.addListener("place_changed", () => {
          const place = autocompleteRef.current?.getPlace();

          if (place?.geometry?.location) {
            const lat = place.geometry.location.lat();
            const lon = place.geometry.location.lng();
            setLatitude(lat.toFixed(6));
            setLongitude(lon.toFixed(6));
            setAddress(place.formatted_address || "");
            setError("");
          }
        });
      }
    }, []);

    const handleUseCurrentLocation = () => {
      if (!navigator.geolocation) {
        setError(t("ERROR.GEOLOCATION_NOT_SUPPORTED"));
        return;
      }

      setLoading(true);
      setError("");

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          setLatitude(lat.toFixed(6));
          setLongitude(lon.toFixed(6));
          onLocationChange(lat, lon);
          setLoading(false);
        },
        (err) => {
          setError(t("ERROR.LOCATION_FAILED", { message: err.message }));
          setLoading(false);
        },
      );
    };

    const handleManualSubmit = () => {
      const lat = parseFloat(latitude);
      const lon = parseFloat(longitude);

      if (isNaN(lat) || lat < -90 || lat > 90) {
        if (locationRequired) setError(t("ERROR.INVALID_LATITUDE"));
        return;
      }

      if (isNaN(lon) || lon < -180 || lon > 180) {
        if (locationRequired) setError(t("ERROR.INVALID_LONGITUDE"));
        return;
      }

      setError("");
      onLocationChange(lat, lon);
    };

    useImperativeHandle(ref, () => ({
      submit: handleManualSubmit,
      useCurrentLocation: handleUseCurrentLocation,
    }));

    useEffect(() => {
      onLoadingChange?.(loading);
    }, [loading, onLoadingChange]);

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
          <LocationOnOutlinedIcon
            fontSize="small"
            sx={{ position: "relative", top: "-0.1em" }}
          />
          {t("LABEL.OBSERVATION_LOCATION")}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t("MESSAGE.LOCATION_SUBTITLE")}
        </Typography>

        <Stack spacing={2}>
          {GOOGLE_API_KEY && (
            <>
              <TextField
                label={t("LABEL.ADDRESS")}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={t("LABEL.ADDRESS_PLACEHOLDER")}
                fullWidth
                inputRef={addressInputRef}
                helperText={t("LABEL.ADDRESS_HELP")}
              />
              <Divider>
                <Typography variant="caption" color="text.secondary">
                  {t("LABEL.OR_DIVIDER")}
                </Typography>
              </Divider>
            </>
          )}

          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              label={t("LABEL.LATITUDE")}
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
              placeholder={t("LABEL.LATITUDE_PLACEHOLDER")}
              fullWidth
              type="number"
              inputProps={{ step: 0.000001 }}
              helperText={t("LABEL.LATITUDE_HELP")}
            />
            <TextField
              label={t("LABEL.LONGITUDE")}
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
              placeholder={t("LABEL.LONGITUDE_PLACEHOLDER")}
              fullWidth
              type="number"
              inputProps={{ step: 0.000001 }}
              helperText={t("LABEL.LONGITUDE_HELP")}
            />
          </Box>

          {error && (
            <Alert severity="error" onClose={() => setError("")}>
              {error}
            </Alert>
          )}

          <Button
            variant="outlined"
            onClick={handleUseCurrentLocation}
            disabled={loading}
            fullWidth
            sx={{ textTransform: "none" }}
          >
            <MyLocationIcon
              fontSize="small"
              sx={{ mr: 0.75, position: "relative", top: "-0.1em" }}
            />
            {loading
              ? t("COMMAND.GETTING_LOCATION")
              : t("COMMAND.USE_MY_LOCATION")}
          </Button>
        </Stack>
      </Paper>
    );
  },
);

export default LocationInput;
