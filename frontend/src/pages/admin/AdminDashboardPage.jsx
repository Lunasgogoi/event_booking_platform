import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { BarChart3, ListChecks, Mail, Ticket, Users } from 'lucide-react'
import { SectionTitle, Stat } from '@/components/shared'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { formatINR } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import api, { getApiErrorMessage } from '@/services/api'

export function AdminDashboardPage() {
  const [dashboard, setDashboard] = useState(null)
  const [supportMessages, setSupportMessages] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  async function loadDashboard() {
    setIsLoading(true)
    setLoadError('')

    try {
      const [{ data: dashboardData }, { data: contactData }] = await Promise.all([
        api.get('/admin/dashboard'),
        api.get('/admin/contact-messages', { params: { limit: 5 } }),
      ])
      setDashboard(dashboardData)
      setSupportMessages(contactData.contactMessages || [])
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

  const stats = dashboard?.stats
  const performanceRows = dashboard?.eventPerformance || []

  if (loadError) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <SectionTitle kicker="Admin" title="Dashboard" />
        <div className="mt-6 rounded-lg border border-destructive/30 bg-card p-5 text-destructive">
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
          <Link to="/admin/reviews" className={cn(buttonVariants({ variant: 'outline' }), 'w-fit px-4 py-3 text-sm font-semibold')}>
            <ListChecks size={18} /> Review events
          </Link>
          <Link to="/admin/events" className={cn(buttonVariants(), 'w-fit px-4 py-3 text-sm font-semibold')}>
            <ListChecks size={18} /> Manage events
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
        <Stat label="Revenue" value={stats ? formatINR(stats.revenue) : '-'} icon={BarChart3} />
        <Stat label="Bookings" value={stats ? stats.bookings.toLocaleString('en-IN') : '-'} icon={Ticket} />
        <Stat label="Active users" value={stats ? stats.activeUsers.toLocaleString('en-IN') : '-'} icon={Users} />
        <Stat label="New support" value={stats ? (stats.supportMessages?.new || 0).toLocaleString('en-IN') : '-'} icon={Mail} />
        <Stat label="Event reviews" value={stats ? (stats.eventReviews?.pending || 0).toLocaleString('en-IN') : '-'} icon={ListChecks} />
      </div>

      {isLoading && <p className="mt-4 text-sm font-semibold text-muted-foreground">Loading dashboard analytics...</p>}

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_0.9fr]">
        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="text-xl font-semibold">Event performance</h2>
          <div className="mt-5 space-y-4">
            {!isLoading && performanceRows.length === 0 && (
              <p className="text-sm font-semibold text-muted-foreground">No booking performance data yet.</p>
            )}
            {performanceRows.map((event) => (
              <div key={event.id} className="grid gap-3 sm:grid-cols-[1fr_140px_110px] sm:items-center">
                <div>
                  <p className="font-semibold">{event.title}</p>
                  <p className="text-sm text-muted-foreground">{event.city} / {event.category}</p>
                </div>
                <div className="h-2 rounded bg-muted">
                  <div className="h-2 rounded bg-gradient-to-r from-rose-600 to-orange-500" style={{ width: `${event.sold}%` }} />
                </div>
                <p className="text-sm font-semibold text-foreground">{formatINR(event.revenue)}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="grid gap-5">
          <section className="rounded-lg border border-border bg-card p-5">
            <h2 className="text-xl font-semibold">Support queue</h2>
            <div className="mt-5 space-y-4">
              {!isLoading && supportMessages.length === 0 && (
                <p className="text-sm font-semibold text-muted-foreground">No support messages yet.</p>
              )}
              {supportMessages.map((message) => (
                <div key={message._id} className="rounded-lg border border-border bg-muted/40 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-foreground">{message.subject}</p>
                      <p className="mt-1 truncate text-xs font-medium text-muted-foreground">
                        {message.name} / {message.email}
                      </p>
                    </div>
                    <Badge variant="secondary" className="h-auto px-2 py-1 text-xs font-semibold">
                      {message.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">{message.message}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {message.status === 'new' && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => updateSupportStatus(message._id, 'in_progress')}
                        className="px-3 py-2 text-xs font-semibold"
                      >
                        Mark in progress
                      </Button>
                    )}
                    {message.status !== 'resolved' && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => updateSupportStatus(message._id, 'resolved')}
                        className="border-emerald-500/30 px-3 py-2 text-xs font-semibold text-emerald-700"
                      >
                        Resolve
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
