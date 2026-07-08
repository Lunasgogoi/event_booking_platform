import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import { LoadingPanel } from '@/components/shared'
import {
  AdminRoute,
  OrganizerRoute,
  ProtectedRoute,
} from '@/routes/guards'

function lazyPage(loader, exportName) {
  return lazy(() => loader().then((module) => ({ default: module[exportName] })))
}

const HomePage = lazyPage(() => import('@/pages/HomePage'), 'HomePage')
const EventsPage = lazyPage(() => import('@/pages/EventsPage'), 'EventsPage')
const EventDetailPage = lazyPage(() => import('@/pages/EventDetailPage'), 'EventDetailPage')
const BookingsPage = lazyPage(() => import('@/pages/BookingsPage'), 'BookingsPage')
const SettingsPage = lazyPage(() => import('@/pages/SettingsPage'), 'SettingsPage')
const OrganizerApplyPage = lazyPage(() => import('@/pages/OrganizerApplyPage'), 'OrganizerApplyPage')
const AboutPage = lazyPage(() => import('@/pages/StaticPages'), 'AboutPage')
const ContactPage = lazyPage(() => import('@/pages/StaticPages'), 'ContactPage')
const AdminDashboardPage = lazyPage(() => import('@/pages/admin/AdminDashboardPage'), 'AdminDashboardPage')
const AdminOrganizersPage = lazyPage(() => import('@/pages/admin/AdminOrganizersPage'), 'AdminOrganizersPage')
const ManageEventsPage = lazyPage(() => import('@/pages/admin/ManageEventsPage'), 'ManageEventsPage')
const ConnectedAuthPage = lazyPage(() => import('@/pages/AuthPage'), 'ConnectedAuthPage')

export function AppRoutes() {
  return (
    <Suspense fallback={<LoadingPanel label="Loading page..." />}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/events/:eventId" element={<EventDetailPage />} />
        <Route path="/bookings" element={<BookingsPage />} />
        <Route
          path="/settings"
          element={(
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/organizer/apply"
          element={(
            <ProtectedRoute>
              <OrganizerApplyPage />
            </ProtectedRoute>
          )}
        />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route
          path="/admin"
          element={(
            <AdminRoute>
              <AdminDashboardPage />
            </AdminRoute>
          )}
        />
        <Route
          path="/admin/events"
          element={(
            <AdminRoute>
              <ManageEventsPage />
            </AdminRoute>
          )}
        />
        <Route
          path="/admin/organizers"
          element={(
            <AdminRoute>
              <AdminOrganizersPage />
            </AdminRoute>
          )}
        />
        <Route
          path="/admin/reviews"
          element={(
            <AdminRoute>
              <ManageEventsPage scope="review" />
            </AdminRoute>
          )}
        />
        <Route
          path="/organizer/events"
          element={(
            <OrganizerRoute>
              <ManageEventsPage scope="organizer" />
            </OrganizerRoute>
          )}
        />
        <Route path="/login" element={<ConnectedAuthPage mode="login" />} />
        <Route path="/register" element={<ConnectedAuthPage mode="register" />} />
      </Routes>
    </Suspense>
  )
}
