import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  IconButton,
  Button,
  Tooltip,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material'
import {
  TravelExplore as TravelExploreIcon,
  InfoOutlined as InfoOutlinedIcon,
  Logout as LogoutIcon,
  Menu as MenuIcon,
  NightsStay as NightsStayIcon,
  Settings as SettingsIcon,
  BookmarkAdded as BookmarkAddedIcon,
} from '@mui/icons-material'
import { type ReactElement } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { AuthUser } from '../../../services/api'

const NAV_ITEMS: { path: string; labelKey: string; icon: ReactElement }[] = [
  { path: '/', labelKey: 'LABEL.NAV_OBSERVATIONS', icon: <NightsStayIcon fontSize="small" /> },
  { path: '/my-observations', labelKey: 'LABEL.NAV_MY_OBSERVATIONS', icon: <BookmarkAddedIcon fontSize="small" /> },
  { path: '/settings', labelKey: 'LABEL.NAV_SETTINGS', icon: <SettingsIcon fontSize="small" /> },
]

type NavBarProps = {
  drawerOpen: boolean
  onDrawerOpen: () => void
  onDrawerClose: () => void
  authUser: AuthUser
  onLogout: () => void
  onAboutOpen: () => void
}

export default function NavBar({
  drawerOpen,
  onDrawerOpen,
  onDrawerClose,
  authUser,
  onLogout,
  onAboutOpen,
}: NavBarProps) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)

  return (
    <>
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          background: 'rgba(15, 23, 41, 0.6)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <Toolbar sx={{ px: { xs: 1, sm: 2 }, gap: { xs: 0.5, sm: 1 } }}>
          <IconButton
            color="inherit"
            edge="start"
            onClick={onDrawerOpen}
            aria-label="Open navigation"
            sx={{ display: { xs: 'inline-flex', md: 'none' }, mr: 0.5 }}
          >
            <MenuIcon />
          </IconButton>

          <Box
            sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0, flexShrink: 0, cursor: 'pointer' }}
            onClick={() => navigate('/')}
          >
            <TravelExploreIcon sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }} />
            <Typography
              component="div"
              sx={{ fontWeight: 600, fontSize: { xs: '1rem', sm: '1.25rem' }, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
            >
              {t('LABEL.APP_TITLE')}
            </Typography>
          </Box>

          <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 0.5, ml: 2, flexGrow: 1 }}>
            {NAV_ITEMS.map((item) => (
              <Button
                key={item.path}
                color="inherit"
                onClick={() => navigate(item.path)}
                startIcon={item.icon}
                sx={{
                  textTransform: 'none',
                  fontWeight: isActive(item.path) ? 700 : 400,
                  borderBottom: isActive(item.path) ? '2px solid currentColor' : '2px solid transparent',
                  borderRadius: 0,
                  px: 1.5,
                  fontSize: '0.875rem',
                }}
              >
                {t(item.labelKey)}
              </Button>
            ))}
          </Box>

          <Box sx={{ flexGrow: 1, display: { xs: 'block', md: 'none' } }} />

          <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
            <Button
              size="small"
              onClick={() => void i18n.changeLanguage('en')}
              color="inherit"
              variant={i18n.language === 'en' ? 'outlined' : 'text'}
              sx={{ minWidth: 0, px: { xs: 1, sm: 1.5 }, py: 0.5, fontSize: '0.75rem' }}
            >
              EN
            </Button>
            <Button
              size="small"
              onClick={() => void i18n.changeLanguage('fr')}
              color="inherit"
              variant={i18n.language === 'fr' ? 'outlined' : 'text'}
              sx={{ minWidth: 0, px: { xs: 1, sm: 1.5 }, py: 0.5, fontSize: '0.75rem' }}
            >
              FR
            </Button>
          </Box>

          <Tooltip title={t('COMMAND.ABOUT')}>
            <IconButton color="inherit" onClick={onAboutOpen} aria-label={t('COMMAND.ABOUT')} size="small">
              <InfoOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <Tooltip title={`${authUser.username} — Logout`}>
            <IconButton
              color="inherit"
              onClick={onLogout}
              aria-label="Logout"
              size="small"
              sx={{ display: { xs: 'inline-flex', sm: 'none' } }}
            >
              <LogoutIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Button
            color="inherit"
            onClick={onLogout}
            size="small"
            startIcon={<LogoutIcon fontSize="small" />}
            sx={{ display: { xs: 'none', sm: 'inline-flex' }, ml: 0.5, fontSize: '0.8rem', textTransform: 'none', whiteSpace: 'nowrap' }}
          >
            {authUser.username}
          </Button>
        </Toolbar>
      </AppBar>

      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={onDrawerClose}
        PaperProps={{
          sx: {
            width: 240,
            background: 'rgba(15, 23, 41, 0.97)',
            backdropFilter: 'blur(16px)',
            borderRight: '1px solid rgba(255,255,255,0.1)',
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 2 }}>
          <TravelExploreIcon />
          <Typography fontWeight={700}>{t('LABEL.APP_TITLE')}</Typography>
        </Box>
        <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
        <List disablePadding>
          {NAV_ITEMS.map((item) => (
            <ListItemButton
              key={item.path}
              selected={isActive(item.path)}
              onClick={() => { navigate(item.path); onDrawerClose() }}
              sx={{
                '&.Mui-selected': { background: 'rgba(255,255,255,0.1)' },
                '&:hover': { background: 'rgba(255,255,255,0.07)' },
              }}
            >
              <ListItemIcon sx={{ color: 'inherit', minWidth: 36 }}>{item.icon}</ListItemIcon>
              <ListItemText primary={t(item.labelKey)} primaryTypographyProps={{ fontSize: '0.9rem' }} />
            </ListItemButton>
          ))}
        </List>
        <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
        <List disablePadding>
          <ListItemButton onClick={onLogout} sx={{ '&:hover': { background: 'rgba(255,255,255,0.07)' } }}>
            <ListItemIcon sx={{ color: 'inherit', minWidth: 36 }}>
              <LogoutIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary={`Sign out (${authUser.username})`}
              primaryTypographyProps={{ fontSize: '0.875rem' }}
            />
          </ListItemButton>
        </List>
      </Drawer>
    </>
  )
}
