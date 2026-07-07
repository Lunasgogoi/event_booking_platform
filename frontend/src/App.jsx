import { useEffect, useState } from 'react'
import { Toaster } from 'react-hot-toast'
import { Shell } from '@/components/layout'
import { getInitialTheme } from '@/lib/theme'
import { AppRoutes } from '@/routes/AppRoutes'
import {
  AboutPage,
  AdminDashboardPage,
  BookingsPage,
  ConnectedAuthPage,
  ContactPage,
  EventDetailPage,
  EventsPage,
  HomePage,
  ManageEventsPage,
  OrganizerApplyPage,
  SettingsPage,
} from '@/pages'

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
    <div className={`min-h-screen ${isDark ? 'theme-dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-950'}`}>
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
        <AppRoutes
          pages={{
            HomePage,
            EventsPage,
            EventDetailPage,
            BookingsPage,
            SettingsPage,
            OrganizerApplyPage,
            AboutPage,
            ContactPage,
            AdminDashboardPage,
            ManageEventsPage,
            ConnectedAuthPage,
          }}
        />
      </Shell>
    </div>
  )
}

export default App
