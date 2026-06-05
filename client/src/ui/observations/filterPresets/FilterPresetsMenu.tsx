import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  List,
  ListItem,
  ListItemSecondaryAction,
  ListItemText,
  MenuItem,
  Select,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import type { SelectChangeEvent } from '@mui/material'
import {
  BookmarkBorder as BookmarkIcon,
  Close as CloseIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  PlaylistAddCheck as ManageIcon,
  Save as SaveIcon,
} from '@mui/icons-material'
import { useTranslation } from 'react-i18next'
import {
  useDeleteFilterPreset,
  useFilterPresets,
  useSaveFilterPreset,
} from '../../../hooks/useFilterPresets'
import type { FilterPreset } from 'shared/types'

export type FilterPresetValues = {
  maxMagnitude: number
  objectTypes: string[]
  minAltitude: number
  minAlerts: number
  visibilityStart: string
  visibilityEnd: string
}

type FilterPresetsMenuProps = {
  isAuthenticated: boolean
  currentValues: FilterPresetValues
  onApply: (preset: FilterPreset) => void
  /**
   * When true, the component is intended to be wrapped in its own Paper
   * (e.g. as a standalone row above the filter cards). Suppresses the
   * bottom divider and extra spacing that would otherwise separate it
   * from sibling content inside the same card.
   */
  compact?: boolean
}

export default function FilterPresetsMenu({
  isAuthenticated,
  currentValues,
  onApply,
  compact = false,
}: FilterPresetsMenuProps) {
  const { t } = useTranslation()
  const { data: presets = [], isLoading, error } = useFilterPresets(isAuthenticated)
  const saveMutation = useSaveFilterPreset()
  const deleteMutation = useDeleteFilterPreset()

  const [selectedPresetId, setSelectedPresetId] = useState<number | ''>('')

  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [presetName, setPresetName] = useState('')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [overwritePending, setOverwritePending] = useState<string | null>(null)

  const [manageDialogOpen, setManageDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingName, setEditingName] = useState('')
  const [renameError, setRenameError] = useState<string | null>(null)

  // If the currently-selected preset disappears (e.g. another tab deleted it,
  // or the server returned an empty list after a token refresh), clear the
  // dropdown so it doesn't show a stale value.
  useEffect(() => {
    if (selectedPresetId !== '' && !presets.some((p) => p.id === selectedPresetId)) {
      setSelectedPresetId('')
    }
  }, [presets, selectedPresetId])

  const sortedPresets = useMemo(
    () => [...presets].sort((a, b) => a.name.localeCompare(b.name)),
    [presets],
  )

  const handleSelectChange = (event: SelectChangeEvent<number | ''>) => {
    const value = event.target.value
    if (value === '') {
      setSelectedPresetId('')
      return
    }
    const id = Number(value)
    setSelectedPresetId(id)
    const preset = presets.find((p) => p.id === id)
    if (preset) {
      onApply(preset)
    }
  }

  const openSaveDialog = () => {
    setPresetName('')
    setSaveError(null)
    setOverwritePending(null)
    setSaveDialogOpen(true)
  }

  const closeSaveDialog = () => {
    setSaveDialogOpen(false)
    setOverwritePending(null)
    setSaveError(null)
    setPresetName('')
  }

  const validateName = (name: string): string | null => {
    if (!name.trim()) return t('MESSAGE.PRESET_NAME_REQUIRED')
    if (name.trim().length > 80) return t('MESSAGE.PRESET_NAME_TOO_LONG')
    return null
  }

  const performSave = async (name: string, existing?: FilterPreset) => {
    setSaveError(null)
    try {
      const result = await saveMutation.mutateAsync({
        id: existing?.id,
        body: {
          name: name.trim(),
          maxMagnitude: currentValues.maxMagnitude,
          objectTypes: currentValues.objectTypes,
          minAltitude: currentValues.minAltitude,
          minAlerts: currentValues.minAlerts,
          visibilityStart: currentValues.visibilityStart,
          visibilityEnd: currentValues.visibilityEnd,
        },
      })
      setSelectedPresetId(result.id)
      setOverwritePending(null)
      closeSaveDialog()
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : t('MESSAGE.PRESET_SAVED', { name }))
    }
  }

  const handleSaveSubmit = () => {
    const name = presetName.trim()
    const validationError = validateName(name)
    if (validationError) {
      setSaveError(validationError)
      return
    }
    const existing = presets.find((p) => p.name === name)
    if (existing && !overwritePending) {
      setOverwritePending(name)
      setSaveError(null)
      return
    }
    void performSave(name, existing)
  }

  const handleOverwriteConfirm = () => {
    const name = presetName.trim()
    const existing = presets.find((p) => p.name === name)
    if (!existing) {
      // Race: preset was deleted between confirmation and click
      setOverwritePending(null)
      void performSave(name)
      return
    }
    void performSave(name, existing)
  }

  const beginRename = (preset: FilterPreset) => {
    setEditingId(preset.id)
    setEditingName(preset.name)
    setRenameError(null)
  }

  const cancelRename = () => {
    setEditingId(null)
    setEditingName('')
    setRenameError(null)
  }

  const commitRename = async (preset: FilterPreset) => {
    const name = editingName.trim()
    const validationError = validateName(name)
    if (validationError) {
      setRenameError(validationError)
      return
    }
    if (name === preset.name) {
      cancelRename()
      return
    }
    setRenameError(null)
    try {
      await saveMutation.mutateAsync({
        id: preset.id,
        body: { name },
      })
      cancelRename()
    } catch (e) {
      setRenameError(e instanceof Error ? e.message : t('MESSAGE.PRESET_UPDATED', { name }))
    }
  }

  const handleDelete = async (preset: FilterPreset) => {
    try {
      await deleteMutation.mutateAsync(preset.id)
      if (selectedPresetId === preset.id) {
        setSelectedPresetId('')
      }
    } catch {
      // Error surfaces via mutation; user can retry from the list.
    }
  }

  if (!isAuthenticated) return null

  const presetsCount = sortedPresets.length
  const isSaving = saveMutation.isPending
  const isDeleting = deleteMutation.isPending

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        ...(compact
          ? {}
          : {
              mb: 2,
              pb: 2,
              borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
            }),
      }}
    >
      <Typography
        variant="subtitle2"
        sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}
      >
        <BookmarkIcon fontSize="small" />
        {t('LABEL.FILTER_PRESETS')}
      </Typography>

      {error && (
        <Alert severity="error" variant="outlined">
          {error.message}
        </Alert>
      )}

      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        {presetsCount === 0 ? (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ flex: 1, fontStyle: 'italic' }}
          >
            {t('LABEL.NO_PRESETS_HINT')}
          </Typography>
        ) : (
          <FormControl size="small" sx={{ flex: 1, minWidth: 0 }}>
            <InputLabel id="filter-presets-select-label">{t('COMMAND.APPLY_PRESET')}</InputLabel>
            <Select
              labelId="filter-presets-select-label"
              value={selectedPresetId}
              label={t('COMMAND.APPLY_PRESET')}
              onChange={handleSelectChange}
              disabled={isLoading}
            >
              {sortedPresets.map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  {p.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
        <Tooltip title={t('COMMAND.SAVE_PRESET')}>
          <span>
            <IconButton
              size="small"
              color="primary"
              onClick={openSaveDialog}
              disabled={isSaving}
              aria-label={t('COMMAND.SAVE_PRESET')}
            >
              <SaveIcon />
            </IconButton>
          </span>
        </Tooltip>
        {presetsCount > 0 && (
          <Tooltip title={t('COMMAND.MANAGE_PRESETS')}>
            <span>
              <IconButton
                size="small"
                onClick={() => setManageDialogOpen(true)}
                aria-label={t('COMMAND.MANAGE_PRESETS')}
              >
                <ManageIcon />
              </IconButton>
            </span>
          </Tooltip>
        )}
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
        {t('LABEL.FILTER_PRESETS_HELP')}
      </Typography>

      {/* Save dialog */}
      <Dialog open={saveDialogOpen} onClose={closeSaveDialog} maxWidth="xs" fullWidth>
        <DialogTitle>{t('COMMAND.SAVE_PRESET')}</DialogTitle>
        <DialogContent>
          {overwritePending && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {t('MESSAGE.PRESET_UPDATE_OVERWRITE', { name: overwritePending })}
            </Alert>
          )}
          {saveError && !overwritePending && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {saveError}
            </Alert>
          )}
          <TextField
            autoFocus
            margin="dense"
            label={t('LABEL.PRESET_NAME')}
            helperText={t('LABEL.PRESET_NAME_HELP')}
            fullWidth
            value={presetName}
            onChange={(e) => {
              setPresetName(e.target.value)
              if (overwritePending) setOverwritePending(null)
            }}
            disabled={isSaving}
            inputProps={{ maxLength: 80 }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !overwritePending) {
                handleSaveSubmit()
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeSaveDialog} disabled={isSaving}>
            {t('COMMAND.CANCEL')}
          </Button>
          {overwritePending ? (
            <Button
              onClick={handleOverwriteConfirm}
              variant="contained"
              color="warning"
              disabled={isSaving}
            >
              {t('COMMAND.UPDATE_PRESET')}
            </Button>
          ) : (
            <Button
              onClick={handleSaveSubmit}
              variant="contained"
              disabled={isSaving}
            >
              {t('COMMAND.SAVE_PRESET')}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Manage dialog */}
      <Dialog
        open={manageDialogOpen}
        onClose={() => setManageDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{t('COMMAND.MANAGE_PRESETS')}</DialogTitle>
        <DialogContent dividers>
          {presetsCount === 0 ? (
            <Box sx={{ py: 2 }}>
              <Typography color="text.secondary">{t('LABEL.NO_PRESETS')}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                {t('LABEL.NO_PRESETS_HINT')}
              </Typography>
            </Box>
          ) : (
            <List dense>
              {sortedPresets.map((preset) => {
                const isEditing = editingId === preset.id
                const summary: string[] = []
                if (preset.maxMagnitude !== undefined) {
                  summary.push(`mag ≤ ${preset.maxMagnitude}`)
                }
                if (preset.minAltitude !== undefined) {
                  summary.push(`alt ≥ ${preset.minAltitude}°`)
                }
                if (preset.minAlerts !== undefined && preset.minAlerts > 0) {
                  summary.push(`≥ ${preset.minAlerts} alerts`)
                }
                if (preset.objectTypes.length > 0) {
                  summary.push(`${preset.objectTypes.length} type${preset.objectTypes.length === 1 ? '' : 's'}`)
                }
                if (preset.visibilityStart || preset.visibilityEnd) {
                  summary.push(
                    `${preset.visibilityStart || '…'}–${preset.visibilityEnd || '…'}`,
                  )
                }
                return (
                  <ListItem key={preset.id} divider>
                    {isEditing ? (
                      <Box sx={{ width: '100%', pr: 12 }}>
                        <TextField
                          size="small"
                          fullWidth
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          inputProps={{ maxLength: 80 }}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') void commitRename(preset)
                            if (e.key === 'Escape') cancelRename()
                          }}
                          disabled={saveMutation.isPending}
                        />
                        {renameError && (
                          <Alert severity="error" sx={{ mt: 1 }}>
                            {renameError}
                          </Alert>
                        )}
                      </Box>
                    ) : (
                      <ListItemText
                        primary={preset.name}
                        secondary={summary.length > 0 ? summary.join(' • ') : undefined}
                      />
                    )}
                    <ListItemSecondaryAction>
                      {isEditing ? (
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Tooltip title={t('COMMAND.SAVE_PRESET')}>
                            <span>
                              <IconButton
                                edge="end"
                                size="small"
                                onClick={() => void commitRename(preset)}
                                disabled={saveMutation.isPending}
                                aria-label={t('COMMAND.SAVE_PRESET')}
                              >
                                <SaveIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title={t('COMMAND.CANCEL')}>
                            <span>
                              <IconButton
                                edge="end"
                                size="small"
                                onClick={cancelRename}
                                aria-label={t('COMMAND.CANCEL')}
                              >
                                <CloseIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </Box>
                      ) : (
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Tooltip title={t('COMMAND.RENAME_PRESET')}>
                            <span>
                              <IconButton
                                edge="end"
                                size="small"
                                onClick={() => beginRename(preset)}
                                disabled={isDeleting}
                                aria-label={t('COMMAND.RENAME_PRESET')}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title={t('COMMAND.DELETE_PRESET')}>
                            <span>
                              <IconButton
                                edge="end"
                                size="small"
                                onClick={() => void handleDelete(preset)}
                                disabled={isDeleting}
                                aria-label={t('COMMAND.DELETE_PRESET')}
                                sx={{ color: 'error.main' }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </Box>
                      )}
                    </ListItemSecondaryAction>
                  </ListItem>
                )
              })}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setManageDialogOpen(false)}>{t('COMMAND.CLOSE')}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
