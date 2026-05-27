import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'

interface AuthCardProps {
  mode: 'setup' | 'login'
  loading: boolean
  error: string | null
  onSubmit: (username: string, password: string) => Promise<void>
}

function AuthCard({ mode, loading, error, onSubmit }: AuthCardProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)

  const isSetup = mode === 'setup'

  const title = useMemo(() => {
    return isSetup ? 'First-time setup' : 'Sign in'
  }, [isSetup])

  const description = useMemo(() => {
    return isSetup
      ? 'Create your admin account to initialize Sky2nite.'
      : 'Sign in to view tonight\'s visible objects.'
  }, [isSetup])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setValidationError(null)

    if (username.trim().length < 3) {
      setValidationError('Username must be at least 3 characters long.')
      return
    }

    if (password.length < 8) {
      setValidationError('Password must be at least 8 characters long.')
      return
    }

    if (isSetup && password !== confirmPassword) {
      setValidationError('Passwords do not match.')
      return
    }

    await onSubmit(username.trim(), password)
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', px: 2 }}>
      <Paper
        elevation={8}
        sx={{
          width: '100%',
          maxWidth: 480,
          p: 4,
          background: 'rgba(15, 23, 41, 0.7)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
        }}
      >
        <Stack spacing={2.5}>
          <Box>
            <Typography variant="h5" fontWeight={700}>{title}</Typography>
            <Typography variant="body2" color="text.secondary">{description}</Typography>
          </Box>

          {(validationError || error) && (
            <Alert severity="error">{validationError || error}</Alert>
          )}

          <Box component="form" onSubmit={(event) => void handleSubmit(event)}>
            <Stack spacing={2}>
              <TextField
                label="Username"
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                disabled={loading}
                fullWidth
              />
              <TextField
                label="Password"
                type="password"
                autoComplete={isSetup ? 'new-password' : 'current-password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={loading}
                fullWidth
              />
              {isSetup && (
                <TextField
                  label="Confirm password"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  disabled={loading}
                  fullWidth
                />
              )}
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={loading}
                fullWidth
                startIcon={loading ? <CircularProgress size={18} /> : null}
              >
                {isSetup ? 'Create account' : 'Sign in'}
              </Button>
            </Stack>
          </Box>
        </Stack>
      </Paper>
    </Box>
  )
}

export default AuthCard
