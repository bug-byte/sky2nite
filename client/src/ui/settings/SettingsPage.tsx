import { useState } from 'react'
import type { FormEvent } from 'react'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  FormControlLabel,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import { AutoAwesome as AutoAwesomeIcon, ManageAccounts as ManageAccountsIcon, Lock as LockIcon, Settings as SettingsIcon } from '@mui/icons-material'
import { useTranslation } from 'react-i18next'
import { api } from '../../services/api'
import type { AuthUser } from '../../services/api'

type SettingsPageProps = {
  authUser: AuthUser
  onUserUpdated: (user: AuthUser) => void
  particlesEnabled: boolean
  onParticlesToggle: (enabled: boolean) => Promise<void>
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

export default function SettingsPage({ authUser, onUserUpdated, particlesEnabled, onParticlesToggle }: SettingsPageProps) {
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
    <Stack spacing={3} sx={{ maxWidth: 520, mx: 'auto' }}>
      <Box>
        <Typography variant="h4" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SettingsIcon sx={{ position: 'relative', top: '-0.25em' }} />
          {t('LABEL.NAV_SETTINGS')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t('MESSAGE.SETTINGS_DESCRIPTION')}
        </Typography>
      </Box>

      {/* Appearance */}
      <Paper
        sx={{
          p: 3,
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

      <ChangeUsernameForm authUser={authUser} onUserUpdated={onUserUpdated} />
      <ChangePasswordForm authUser={authUser} />
    </Stack>
  )
}
