import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Alert,
  Rating,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import { useUpdateObservation } from '../../hooks/useSavedObservations'
import type { ObservationStatus, SavedObservation } from 'shared/types'

type ObservationNotesDialogProps = {
  observation: SavedObservation | null
  onClose: () => void
}

export default function ObservationNotesDialog({ observation, onClose }: ObservationNotesDialogProps) {
  const { t } = useTranslation()
  const updateMutation = useUpdateObservation()

  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState<ObservationStatus>('planned')
  const [rating, setRating] = useState<number | null>(null)

  // Sync form state when the dialog opens for a different observation
  useEffect(() => {
    if (observation) {
      setNotes(observation.notes ?? '')
      setStatus(observation.status ?? 'planned')
      setRating(observation.rating ?? null)
      updateMutation.reset()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [observation?.id])

  const handleSave = async () => {
    if (!observation) return
    await updateMutation.mutateAsync({
      id: observation.id,
      body: { notes, status, rating },
    })
    onClose()
  }

  return (
    <Dialog open={observation !== null} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {t('LABEL.MY_NOTES')}
        {observation && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
            {observation.locusId}
          </Typography>
        )}
      </DialogTitle>

      <DialogContent>
        {updateMutation.error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {updateMutation.error.message}
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1.5 }}>
          <FormControl fullWidth size="small">
            <InputLabel>{t('LABEL.OBSERVATION_STATUS')}</InputLabel>
            <Select
              value={status}
              label={t('LABEL.OBSERVATION_STATUS')}
              onChange={(e) => setStatus(e.target.value as ObservationStatus)}
            >
              <MenuItem value="planned">{t('LABEL.STATUS_PLANNED')}</MenuItem>
              <MenuItem value="observed">{t('LABEL.STATUS_OBSERVED')}</MenuItem>
              <MenuItem value="skipped">{t('LABEL.STATUS_SKIPPED')}</MenuItem>
            </Select>
          </FormControl>

          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {t('LABEL.OBSERVATION_RATING')}
            </Typography>
            <Rating
              value={rating}
              onChange={(_e, value) => setRating(value)}
              max={5}
              size="large"
            />
          </Box>

          <TextField
            label={t('LABEL.OBSERVATION_NOTES')}
            multiline
            minRows={4}
            maxRows={10}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            fullWidth
            placeholder={t('LABEL.OBSERVATION_NOTES_PLACEHOLDER')}
          />
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={updateMutation.isPending}>
          {t('COMMAND.CANCEL')}
        </Button>
        <Button
          variant="contained"
          onClick={() => void handleSave()}
          disabled={updateMutation.isPending}
        >
          {t('COMMAND.SAVE')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
