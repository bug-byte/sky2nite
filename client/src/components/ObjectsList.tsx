import {
  Box,
  Grid,
  Typography,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
} from '@mui/material';
import { StarsOutlined as StarsOutlinedIcon } from '@mui/icons-material';
import type { SelectChangeEvent } from '@mui/material';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ObjectCard from './ObjectCard';
import type { VisibleObject } from '../types/api';

interface ObjectsListProps {
  objects: VisibleObject[];
  loading: boolean;
  error: Error | null;
}

type SortOption = 'duration' | 'magnitude' | 'altitude';

export default function ObjectsList({ objects, loading, error }: ObjectsListProps) {
  const [sortBy, setSortBy] = useState<SortOption>('duration');
  const { t } = useTranslation();

  const handleSortChange = (event: SelectChangeEvent<SortOption>) => {
    setSortBy(event.target.value as SortOption);
  };

  const getSortedObjects = () => {
    const sorted = [...objects];
    switch (sortBy) {
      case 'duration':
        return sorted.sort((a, b) => b.visibilityWindow.duration - a.visibilityWindow.duration);
      case 'magnitude':
        return sorted.sort((a, b) => a.magnitude - b.magnitude);
      case 'altitude':
        return sorted.sort((a, b) => b.maxAltitude - a.maxAltitude);
      default:
        return sorted;
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          py: 8,
        }}
      >
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          {t('MESSAGE.SEARCHING')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {t('MESSAGE.SEARCHING_SUBTITLE')}
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        <Typography variant="h6" gutterBottom>
          {t('ERROR.LOADING_OBJECTS_FAILED')}
        </Typography>
        <Typography variant="body2">{error.message}</Typography>
      </Alert>
    );
  }

  if (objects.length === 0) {
    return (
      <Paper
        sx={{
          padding: '2rem',
          textAlign: 'center',
          marginTop: '1rem',
          background: 'rgba(15, 23, 41, 0.4)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          borderRadius: '1rem',
          boxShadow: '0 0.5rem 2rem 0 rgba(0, 0, 0, 0.37)',
        }}
      >
        <Typography variant="h6" gutterBottom>
          {t('MESSAGE.NO_OBJECTS_TITLE')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t('MESSAGE.NO_OBJECTS_DESCRIPTION')}
        </Typography>
      </Paper>
    );
  }

  const sortedObjects = getSortedObjects();

  return (
    <Box sx={{ mt: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <StarsOutlinedIcon />
          {t('MESSAGE.OBJECTS_VISIBLE', { count: objects.length })}
        </Typography>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>{t('LABEL.SORT_BY')}</InputLabel>
          <Select value={sortBy} onChange={handleSortChange} label={t('LABEL.SORT_BY')} size="small">
            <MenuItem value="duration">{t('LABEL.SORT_DURATION')}</MenuItem>
            <MenuItem value="magnitude">{t('LABEL.SORT_MAGNITUDE')}</MenuItem>
            <MenuItem value="altitude">{t('LABEL.SORT_ALTITUDE')}</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Grid container spacing={3}>
        {sortedObjects.map((object) => (
          <Grid item xs={12} sm={6} md={4} key={object.locusId}>
            <ObjectCard object={object} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
