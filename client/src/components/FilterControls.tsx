import {
  Typography,
  Slider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Chip,
  OutlinedInput,
  Paper,
} from '@mui/material';
import { FilterAltOutlined as FilterAltOutlinedIcon } from '@mui/icons-material';
import type { SelectChangeEvent } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useAvailableTags } from '../hooks/useVisibleObjects';

export interface Filters {
  maxMagnitude: number;
  objectTypes: string[];
}

interface FilterControlsProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
}

export default function FilterControls({
  filters,
  onFiltersChange,
}: FilterControlsProps) {
  const { data: availableTags = [], isLoading: tagsLoading } = useAvailableTags();
  const { t } = useTranslation();

  const handleMagnitudeChange = (_event: Event, newValue: number | number[]) => {
    onFiltersChange({
      ...filters,
      maxMagnitude: newValue as number,
    });
  };

  const handleObjectTypesChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    onFiltersChange({
      ...filters,
      objectTypes: typeof value === 'string' ? value.split(',') : value,
    });
  };

  const getMagnitudeLabel = (value: number) => {
    if (value <= 12) return t('MESSAGE.MAGNITUDE_EASY', { value });
    if (value <= 14) return t('MESSAGE.MAGNITUDE_GOOD', { value });
    if (value <= 16) return t('MESSAGE.MAGNITUDE_DARK', { value });
    return t('MESSAGE.MAGNITUDE_HARD', { value });
  };

  return (
    <Paper
      sx={{
        padding: '1.5rem',
        marginBottom: '1.5rem',
        background: 'rgba(15, 23, 41, 0.4)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        borderRadius: '1rem',
        boxShadow: '0 0.5rem 2rem 0 rgba(0, 0, 0, 0.37)',
      }}
    >
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <FilterAltOutlinedIcon fontSize="small" />
        {t('LABEL.SEARCH_FILTERS')}
      </Typography>

      <Box sx={{ mt: 3, mb: 4 }}>
        <Typography gutterBottom>
          {t('LABEL.MAXIMUM_MAGNITUDE')}: {getMagnitudeLabel(filters.maxMagnitude)}
        </Typography>
        <Slider
          value={filters.maxMagnitude}
          onChange={handleMagnitudeChange}
          min={10}
          max={18}
          step={0.5}
          marks={[
            { value: 10, label: '10' },
            { value: 12, label: '12' },
            { value: 14, label: '14' },
            { value: 16, label: '16' },
            { value: 18, label: '18' },
          ]}
          valueLabelDisplay="auto"
        />
        <Typography variant="caption" color="text.secondary">
          {t('MESSAGE.MAGNITUDE_HELP')}
        </Typography>
      </Box>

      <FormControl fullWidth>
        <InputLabel>{t('LABEL.OBJECT_TYPES')}</InputLabel>
        <Select
          multiple
          value={filters.objectTypes}
          onChange={handleObjectTypesChange}
          input={<OutlinedInput label={t('LABEL.OBJECT_TYPES')} />}
          renderValue={(selected) => (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {selected.map((value: string) => (
                <Chip key={value} label={value} size="small" />
              ))}
            </Box>
          )}
          disabled={tagsLoading}
        >
          {availableTags.map((tag: string) => (
            <MenuItem key={tag} value={tag}>
              {tag.replace(/_/g, ' ')}
            </MenuItem>
          ))}
        </Select>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
          {t('LABEL.OBJECT_TYPES_HELP')}
        </Typography>
      </FormControl>
    </Paper>
  );
}
