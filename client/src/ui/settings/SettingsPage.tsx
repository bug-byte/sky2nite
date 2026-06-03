import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Divider,
  Chip,
  FormControl,
  FormControlLabel,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
  InputLabel,
  MenuItem,
  Select,
} from '@mui/material'
import { AutoAwesome as AutoAwesomeIcon, ManageAccounts as ManageAccountsIcon, Lock as LockIcon, Settings as SettingsIcon } from '@mui/icons-material'
import { useTranslation } from 'react-i18next'
import { api } from '../../services/api'
import type { AuthUser } from '../../services/api'
import type { RareClassificationColorMapId, RareClassificationSettings } from 'shared/types'

type SettingsPageProps = {
  authUser: AuthUser
  onUserUpdated: (user: AuthUser) => void
  availableTags: string[]
  rareClassificationSettings: RareClassificationSettings
  onRareClassificationSettingsChange: (settings: RareClassificationSettings) => Promise<void>
  particlesEnabled: boolean
  onParticlesToggle: (enabled: boolean) => Promise<void>
}

const RARE_CLASSIFICATION_COLOR_MAP_OPTIONS: Array<{ value: RareClassificationColorMapId; label: string }> = [
  { value: 'aurora', label: 'Aurora' },
  { value: 'ember', label: 'Ember' },
  { value: 'nebula', label: 'Nebula' },
  { value: 'sunset', label: 'Sunset' },
]

const COLOR_MAP_PREVIEWS: Record<RareClassificationColorMapId, string[]> = {
  aurora: [
    'rgba(255, 138, 101, 1)',
    'rgba(255, 202, 40, 1)',
    'rgba(100, 181, 246, 1)',
    'rgba(186, 104, 200, 1)',
    'rgba(38, 166, 154, 1)',
  ],
  ember: [
    'rgba(255, 87, 34, 1)',
    'rgba(255, 152, 0, 1)',
    'rgba(255, 111, 0, 1)',
    'rgba(255, 167, 38, 1)',
    'rgba(255, 183, 77, 1)',
  ],
  nebula: [
    'rgba(156, 39, 176, 1)',
    'rgba(103, 58, 183, 1)',
    'rgba(63, 81, 181, 1)',
    'rgba(124, 77, 255, 1)',
    'rgba(123, 31, 162, 1)',
  ],
  sunset: [
    'rgba(233, 30, 99, 1)',
    'rgba(255, 87, 34, 1)',
    'rgba(244, 143, 177, 1)',
    'rgba(255, 112, 67, 1)',
    'rgba(255, 138, 101, 1)',
  ],
}

function normalizeTagInput(tag: string) {
  return tag.trim().replace(/\s+/g, ' ')
}

function dedupeTags(tags: string[]) {
  const seen = new Map<string, string>()

  for (const tag of tags) {
    const normalized = normalizeTagInput(tag)
    if (!normalized) continue

    const key = normalized.toLowerCase()
    if (!seen.has(key)) {
      seen.set(key, normalized)
    }
  }

  return Array.from(seen.values())
}

function ColorMapSwatch({ colorMap }: { colorMap: RareClassificationColorMapId }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      {COLOR_MAP_PREVIEWS[colorMap].map((color) => (
        <Box
          key={color}
          sx={{
            width: 12,
            height: 12,
            borderRadius: '999px',
            backgroundColor: color,
            boxShadow: '0 0 0 1px rgba(255,255,255,0.16) inset',
          }}
        />
      ))}
    </Box>
  )
}

function RareClassificationForm({
  availableTags,
  rareClassificationSettings,
  onRareClassificationSettingsChange,
}: Pick<SettingsPageProps, 'availableTags' | 'rareClassificationSettings' | 'onRareClassificationSettingsChange'>) {
  const { t } = useTranslation()
  const [draftTags, setDraftTags] = useState<string[]>(rareClassificationSettings.rareClassificationTags)
  const [draftColorMap, setDraftColorMap] = useState<RareClassificationColorMapId>(rareClassificationSettings.rareClassificationColorMap)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    setDraftTags(rareClassificationSettings.rareClassificationTags)
    setDraftColorMap(rareClassificationSettings.rareClassificationColorMap)
  }, [rareClassificationSettings])

  const objectTypeOptions = useMemo(
    () => availableTags.map((tag) => tag.replace(/_/g, ' ')),
    [availableTags],
  )

  const handleSave = async () => {
    setError(null)
    setSuccess(false)
    setLoading(true)

    try {
      await onRareClassificationSettingsChange({
        rareClassificationTags: dedupeTags(draftTags),
        rareClassificationColorMap: draftColorMap,
      })
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('ERROR.UPDATE_SETTINGS_FAILED'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Paper
      sx={{
        p: 3,
        height: '100%',
        width: '100%',
        background: 'rgba(15, 23, 41, 0.4)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: '1rem',
        boxShadow: '0 0.5rem 2rem 0 rgba(0, 0, 0, 0.37)',
      }}
    >
      <Typography variant="h6" sx={{ mb: 0.5 }}>
        {t('LABEL.RARE_CLASSIFICATION_HIGHLIGHTING')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {t('MESSAGE.RARE_CLASSIFICATION_DESCRIPTION')}
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{t('MESSAGE.RARE_CLASSIFICATION_UPDATED')}</Alert>}

      <Stack spacing={2}>
        <Autocomplete
          multiple
          freeSolo
          options={objectTypeOptions}
          value={draftTags}
          onChange={(_, newValue) => setDraftTags(newValue.map((value) => normalizeTagInput(value)))}
          renderTags={(value, getTagProps) => value.map((option, index) => (
            <Chip variant="outlined" label={option} {...getTagProps({ index })} key={option} />
          ))}
          renderInput={(params) => (
            <TextField
              {...params}
              label={t('LABEL.RARE_CLASSIFICATION_TAGS')}
              helperText={t('MESSAGE.RARE_CLASSIFICATION_TAGS_HELP')}
              placeholder={t('LABEL.RARE_CLASSIFICATION_TAGS_PLACEHOLDER')}
            />
          )}
        />

        <FormControl fullWidth size="small">
          <InputLabel>{t('LABEL.RARE_CLASSIFICATION_COLOR_MAP')}</InputLabel>
          <Select
            label={t('LABEL.RARE_CLASSIFICATION_COLOR_MAP')}
            value={draftColorMap}
            onChange={(e) => setDraftColorMap(e.target.value as RareClassificationColorMapId)}
            renderValue={(value) => {
              const currentValue = value as RareClassificationColorMapId
              const currentOption = RARE_CLASSIFICATION_COLOR_MAP_OPTIONS.find((option) => option.value === currentValue)
              return (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, width: '100%' }}>
                  <Box component="span">{currentOption?.label ?? currentValue}</Box>
                  <ColorMapSwatch colorMap={currentValue} />
                </Box>
              )
            }}
          >
            {RARE_CLASSIFICATION_COLOR_MAP_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, width: '100%' }}>
                  <Box component="span">{option.label}</Box>
                  <ColorMapSwatch colorMap={option.value} />
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Button
          variant="contained"
          onClick={() => void handleSave()}
          disabled={loading}
          sx={{ alignSelf: 'flex-start', textTransform: 'none' }}
        >
          {loading ? <CircularProgress size={20} sx={{ mr: 1 }} /> : null}
          {t('COMMAND.SAVE_SETTINGS')}
        </Button>
      </Stack>
    </Paper>
  )
}

function ChangeUsernameForm({ authUser, onUserUpdated }: Pick<SettingsPageProps, 'authUser' | 'onUserUpdated'>) {
  const { t } = useTranslation()
  const [newUsername, setNewUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (newUsername.trim().length < 3) {
      setError(t('ERROR.USERNAME_TOO_SHORT'))
      return
    }

    setLoading(true)
    try {
      const updatedUser = await api.updateUsername(newUsername.trim())
      onUserUpdated(updatedUser)
      setSuccess(true)
      setNewUsername('')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('ERROR.UPDATE_USERNAME_FAILED'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Paper
      sx={{
        p: 3,
        height: '100%',
        width: '100%',
        background: 'rgba(15, 23, 41, 0.4)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: '1rem',
        boxShadow: '0 0.5rem 2rem 0 rgba(0, 0, 0, 0.37)',
      }}
    >
      <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
        <ManageAccountsIcon fontSize="small" sx={{ position: 'relative', top: '-0.25em' }} />
        {t('LABEL.CHANGE_USERNAME')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {t('MESSAGE.CURRENT_USERNAME', { username: authUser.username })}
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{t('MESSAGE.USERNAME_UPDATED')}</Alert>}

      <Box component="form" onSubmit={(e) => void handleSubmit(e)}>
        <Stack spacing={2}>
          <TextField
            label={t('LABEL.NEW_USERNAME')}
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            size="small"
            fullWidth
            autoComplete="username"
            disabled={loading}
          />
          <Button
            type="submit"
            variant="contained"
            disabled={loading || !newUsername.trim()}
            sx={{ alignSelf: 'flex-start', textTransform: 'none' }}
          >
            {loading ? <CircularProgress size={20} sx={{ mr: 1 }} /> : null}
            {t('COMMAND.UPDATE_USERNAME')}
          </Button>
        </Stack>
      </Box>
    </Paper>
  )
}

function ChangePasswordForm({ authUser }: { authUser: AuthUser }) {
  const { t } = useTranslation()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (newPassword.length < 8) {
      setError(t('ERROR.PASSWORD_TOO_SHORT'))
      return
    }

    if (newPassword !== confirmPassword) {
      setError(t('ERROR.PASSWORDS_DO_NOT_MATCH'))
      return
    }

    setLoading(true)
    try {
      await api.updatePassword(currentPassword, newPassword)
      setSuccess(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('ERROR.UPDATE_PASSWORD_FAILED'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Paper
      sx={{
        p: 3,
        height: '100%',
        width: '100%',
        background: 'rgba(15, 23, 41, 0.4)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: '1rem',
        boxShadow: '0 0.5rem 2rem 0 rgba(0, 0, 0, 0.37)',
      }}
    >
      <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
        <LockIcon fontSize="small" sx={{ position: 'relative', top: '-0.25em' }} />
        {t('LABEL.CHANGE_PASSWORD')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {t('MESSAGE.CHANGING_PASSWORD_FOR', { username: authUser.username })}
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{t('MESSAGE.PASSWORD_UPDATED')}</Alert>}

      <Box component="form" onSubmit={(e) => void handleSubmit(e)}>
        <Stack spacing={2}>
          <TextField
            label={t('LABEL.CURRENT_PASSWORD')}
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            size="small"
            fullWidth
            autoComplete="current-password"
            disabled={loading}
          />
          <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
          <TextField
            label={t('LABEL.NEW_PASSWORD')}
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            size="small"
            fullWidth
            autoComplete="new-password"
            disabled={loading}
          />
          <TextField
            label={t('LABEL.CONFIRM_NEW_PASSWORD')}
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            size="small"
            fullWidth
            autoComplete="new-password"
            disabled={loading}
          />
          <Button
            type="submit"
            variant="contained"
            disabled={loading || !currentPassword || !newPassword || !confirmPassword}
            sx={{ alignSelf: 'flex-start', textTransform: 'none' }}
          >
            {loading ? <CircularProgress size={20} sx={{ mr: 1 }} /> : null}
            {t('COMMAND.UPDATE_PASSWORD')}
          </Button>
        </Stack>
      </Box>
    </Paper>
  )
}

export default function SettingsPage({
  authUser,
  onUserUpdated,
  availableTags,
  rareClassificationSettings,
  onRareClassificationSettingsChange,
  particlesEnabled,
  onParticlesToggle,
}: SettingsPageProps) {
  const { t } = useTranslation()
  const [particlesLoading, setParticlesLoading] = useState(false)

  const handleParticlesToggle = async () => {
    setParticlesLoading(true)
    try {
      await onParticlesToggle(!particlesEnabled)
    } finally {
      setParticlesLoading(false)
    }
  }

  return (
    <Stack spacing={3} sx={{ maxWidth: 1200, mx: 'auto' }}>
      <Box>
        <Typography variant="h4" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SettingsIcon sx={{ position: 'relative', top: '-0.25em' }} />
          {t('LABEL.NAV_SETTINGS')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t('MESSAGE.SETTINGS_DESCRIPTION')}
        </Typography>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
          alignItems: 'stretch',
        }}
      >
        <Box sx={{ gridColumn: { xs: 'auto', md: 'span 1' }, display: 'flex', height: '100%', width: '100%' }}>
          <Paper
            sx={{
              p: 3,
              height: '100%',
              width: '100%',
              background: 'rgba(15, 23, 41, 0.4)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '1rem',
              boxShadow: '0 0.5rem 2rem 0 rgba(0, 0, 0, 0.37)',
            }}
          >
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <AutoAwesomeIcon fontSize="small" sx={{ position: 'relative', top: '-0.1em' }} />
              {t('LABEL.APPEARANCE')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {t('MESSAGE.APPEARANCE_DESCRIPTION')}
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={particlesEnabled}
                  onChange={() => void handleParticlesToggle()}
                  disabled={particlesLoading}
                  color="primary"
                />
              }
              label={
                <Box>
                  <Typography variant="body2">{t('LABEL.PARTICLE_EFFECTS')}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {t('MESSAGE.PARTICLE_EFFECTS_DESCRIPTION')}
                  </Typography>
                </Box>
              }
            />
          </Paper>
        </Box>

        <Box sx={{ gridColumn: { xs: 'auto', md: 'span 1' }, display: 'flex', height: '100%', width: '100%' }}>
          <ChangeUsernameForm authUser={authUser} onUserUpdated={onUserUpdated} />
        </Box>

        <Box sx={{ gridColumn: { xs: 'auto', md: 'span 1' }, display: 'flex', height: '100%', width: '100%' }}>
          <ChangePasswordForm authUser={authUser} />
        </Box>

        <Box sx={{ gridColumn: { xs: 'auto', md: 'span 1' }, display: 'flex', height: '100%', width: '100%' }}>
          <RareClassificationForm
            availableTags={availableTags}
            rareClassificationSettings={rareClassificationSettings}
            onRareClassificationSettingsChange={onRareClassificationSettingsChange}
          />
        </Box>
      </Box>
    </Stack>
  )
}
