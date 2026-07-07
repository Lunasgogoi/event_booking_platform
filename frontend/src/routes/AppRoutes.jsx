import { Route, Routes } from 'react-router-dom'
import {
  AdminRoute,
  OrganizerRoute,
  ProtectedRoute,
} from '@/routes/guards'

export function AppRoutes({ pages }) {
  const {
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
  } = pages

  return (
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
  )
}
