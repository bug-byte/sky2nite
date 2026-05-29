import { useRef, useEffect, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { Box } from '@mui/material'

const PAGE_ORDER = ['/', '/my-observations', '/settings']

export default function PageTransition({ children }: { children: ReactNode }) {
  const location = useLocation()
  const prevPathRef = useRef(location.pathname)
  const isFirstRender = useRef(true)

  const fromIdx = PAGE_ORDER.indexOf(prevPathRef.current)
  const toIdx = PAGE_ORDER.indexOf(location.pathname)
  const animationName =
    isFirstRender.current
      ? 'none'
      : toIdx >= fromIdx
        ? 'slideInFromRight'
        : 'slideInFromLeft'

  useEffect(() => {
    isFirstRender.current = false
    prevPathRef.current = location.pathname
  }, [location.pathname])

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Box
        key={location.pathname}
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          animation: `${animationName} 0.22s ease-out`,
        }}
      >
        {children}
      </Box>
    </Box>
  )
}
