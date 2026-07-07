import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { BarChart3, CheckCircle2, ListChecks, Mail, Ticket, Users } from 'lucide-react'
import { SectionTitle, Stat } from '@/components/shared'
import { formatINR, formatOrganizerStatus } from '@/lib/formatters'
import api, { getApiErrorMessage } from '@/services/api'

export function AdminDashboardPage() {
  const [dashboard, setDashboard] = useState(null)
  const [supportMessages, setSupportMessages] = useState([])
  const [organizerRequests, setOrganizerRequests] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  async function loadDashboard() {
    setIsLoading(true)
    setLoadError('')

    try {
      const [{ data: dashboardData }, { data: contactData }, { data: organizerData }] = await Promise.all([
        api.get('/admin/dashboard'),
        api.get('/admin/contact-messages', { params: { limit: 5 } }),
        api.get('/admin/organizer-requests', { params: { status: 'pending', limit: 5 } }),
      ])
      setDashboard(dashboardData)
      setSupportMessages(contactData.contactMessages || [])
      setOrganizerRequests(organizerData.organizerRequests || [])
    } catch (error) {
      const message = getApiErrorMessage(error)
      setLoadError(message)
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadDashboard()
  }, [])

  async function updateSupportStatus(messageId, status) {
    try {
      const { data } = await api.patch(`/admin/contact-messages/${messageId}/status`, { status })
      setSupportMessages((current) =>
        current.map((message) => (message._id === messageId ? data.contactMessage : message)),
      )
      toast.success('Support message updated')
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    }
  }

  async function reviewOrganizerRequest(userId, status) {
    try {
      await api.patch(`/admin/organizer-requests/${userId}/status`, { status })
      setOrganizerRequests((current) => current.filter((request) => request._id !== userId))
      toast.success(status === 'approved' ? 'Organizer approved' : 'Organizer rejected')
      loadDashboard()
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    }
  }

  const stats = dashboard?.stats
  const performanceRows = dashboard?.eventPerformance || []

  if (loadError) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <SectionTitle kicker="Admin" title="Dashboard" />
        <div className="mt-6 rounded border border-rose-200 bg-white p-5 text-rose-700">
          <p className="font-semibold">Admin dashboard unavailable</p>
          <p className="mt-2 text-sm">{loadError}</p>
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SectionTitle kicker="Admin" title="Dashboard" />
        <div className="flex flex-wrap gap-2">
          <Link to="/admin/reviews" className="inline-flex w-fit items-center gap-2 rounded border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700">
            <ListChecks size={18} /> Review events
          </Link>
          <Link to="/admin/events" className="inline-flex w-fit items-center gap-2 rounded bg-slate-950 px-4 py-3 text-sm font-semibold text-white">
            <ListChecks size={18} /> Manage events
          </Link>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-7">
        <Stat label="Revenue" value={stats ? formatINR(stats.revenue) : '-'} icon={BarChart3} />
        <Stat label="Bookings" value={stats ? stats.bookings.toLocaleString('en-IN') : '-'} icon={Ticket} />
        <Stat label="Active users" value={stats ? stats.activeUsers.toLocaleString('en-IN') : '-'} icon={Users} />
        <Stat label="Fill rate" value={stats ? `${stats.fillRate}%` : '-'} icon={CheckCircle2} />
        <Stat label="New support" value={stats ? (stats.supportMessages?.new || 0).toLocaleString('en-IN') : '-'} icon={Mail} />
        <Stat label="Organizer requests" value={stats ? (stats.organizerRequests?.pending || 0).toLocaleString('en-IN') : '-'} icon={Users} />
        <Stat label="Event reviews" value={stats ? (stats.eventReviews?.pending || 0).toLocaleString('en-IN') : '-'} icon={ListChecks} />
      </div>
      {isLoading && <p className="mt-4 text-sm font-semibold text-slate-500">Loading dashboard analytics...</p>}
      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_0.9fr]">
        <div className="rounded border border-slate-200 bg-white p-5">
          <h2 className="text-xl font-semibold">Event performance</h2>
          <div className="mt-5 space-y-4">
            {!isLoading && performanceRows.length === 0 && (
              <p className="text-sm font-semibold text-slate-500">No booking performance data yet.</p>
            )}
            {performanceRows.map((event) => (
              <div key={event.id} className="grid gap-3 sm:grid-cols-[1fr_140px_110px] sm:items-center">
                <div>
                  <p className="font-semibold">{event.title}</p>
                  <p className="text-sm text-slate-500">{event.city} · {event.category}</p>
                </div>
                <div className="h-2 rounded bg-slate-100">
                  <div className="h-2 rounded bg-gradient-to-r from-rose-600 to-orange-500" style={{ width: `${event.sold}%` }} />
                </div>
                <p className="text-sm font-semibold text-slate-700">{formatINR(event.revenue)}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="grid gap-5">
          <div className="rounded border border-slate-200 bg-white p-5">
            <h2 className="text-xl font-semibold">Organizer requests</h2>
            <div className="mt-5 space-y-4">
              {!isLoading && organizerRequests.length === 0 && (
                <p className="text-sm font-semibold text-slate-500">No pending organizer requests.</p>
              )}
              {organizerRequests.map((request) => (
                <div key={request._id} className="rounded border border-slate-200 bg-slate-50 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-950">
                        {request.organizerProfile?.organizationName || request.name}
                      </p>
                      <p className="mt-1 truncate text-xs font-medium text-slate-500">
                        {request.name} - {request.email}
                      </p>
                    </div>
                    <span className="rounded bg-white px-2 py-1 text-xs font-semibold text-slate-600">
                      {formatOrganizerStatus(request.organizerProfile?.status)}
                    </span>
                  </div>
                  {request.organizerProfile?.message && (
                    <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">{request.organizerProfile.message}</p>
                  )}
                  <div className="mt-3 grid gap-1 text-xs font-semibold text-slate-500">
                    {request.organizerProfile?.contactEmail && <span>{request.organizerProfile.contactEmail}</span>}
                    {request.organizerProfile?.city && <span>{request.organizerProfile.city}</span>}
                    {request.organizerProfile?.website && <span>{request.organizerProfile.website}</span>}
                    {request.organizerProfile?.eventTypes?.length > 0 && (
                      <span>{request.organizerProfile.eventTypes.join(', ')}</span>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => reviewOrganizerRequest(request._id, 'approved')}
                      className="rounded border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => reviewOrganizerRequest(request._id, 'rejected')}
                      className="rounded border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded border border-slate-200 bg-white p-5">
            <h2 className="text-xl font-semibold">Support queue</h2>
          <div className="mt-5 space-y-4">
            {!isLoading && supportMessages.length === 0 && (
              <p className="text-sm font-semibold text-slate-500">No support messages yet.</p>
            )}
            {supportMessages.map((message) => (
              <div key={message._id} className="rounded border border-slate-200 bg-slate-50 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-950">{message.subject}</p>
                    <p className="mt-1 truncate text-xs font-medium text-slate-500">
                      {message.name} · {message.email}
                    </p>
                  </div>
                  <span className="rounded bg-white px-2 py-1 text-xs font-semibold text-slate-600">
                    {message.status.replace('_', ' ')}
                  </span>
                </div>
                <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">{message.message}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {message.status === 'new' && (
                    <button
                      type="button"
                      onClick={() => updateSupportStatus(message._id, 'in_progress')}
                      className="rounded border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700"
                    >
                      Mark in progress
                    </button>
                  )}
                  {message.status !== 'resolved' && (
                    <button
                      type="button"
                      onClick={() => updateSupportStatus(message._id, 'resolved')}
                      className="rounded border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700"
                    >
                      Resolve
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          </div>
        </div>
      </div>
    </main>
  )
}
