import { useEffect, useState } from 'react'
import { Toaster } from 'react-hot-toast'
import { Shell } from '@/components/layout'
import { getInitialTheme } from '@/lib/theme'
import { AppRoutes } from '@/routes/AppRoutes'

function App() {
  const [theme, setTheme] = useState(getInitialTheme)
  const isDark = theme === 'dark'

  useEffect(() => {
    window.localStorage.setItem('ticketo-theme', theme)
    document.documentElement.classList.toggle('theme-dark-root', isDark)
    document.documentElement.classList.toggle('dark', isDark)
  }, [isDark, theme])

  function toggleTheme() {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'))
  }

  return (
    <div className={`min-h-screen bg-background text-foreground ${isDark ? 'theme-dark' : ''}`}>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 2400,
          style: isDark
            ? {
                background: '#161b22',
                border: '1px solid rgba(148, 163, 184, 0.18)',
                color: '#e5e7eb',
              }
            : undefined,
        }}
      />
      <Shell theme={theme} onToggleTheme={toggleTheme}>
        <AppRoutes />
      </Shell>
    </div>
  )
}

export default App
