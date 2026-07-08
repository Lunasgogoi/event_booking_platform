import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { SectionTitle } from '@/components/shared'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatOrganizerStatus } from '@/lib/formatters'
import api, { getApiErrorMessage } from '@/services/api'

export function AdminOrganizersPage() {
  const [organizerRequests, setOrganizerRequests] = useState([])
  const [activeOrganizers, setActiveOrganizers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  async function loadOrganizers() {
    setIsLoading(true)
    setLoadError('')

    try {
      const [{ data: requestData }, { data: activeOrganizerData }] = await Promise.all([
        api.get('/admin/organizer-requests', { params: { status: 'pending', limit: 50 } }),
        api.get('/admin/users', { params: { role: 'organizer', limit: 50 } }),
      ])
      setOrganizerRequests(requestData.organizerRequests || [])
      setActiveOrganizers(activeOrganizerData.users || [])
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
    loadOrganizers()
  }, [])

  async function reviewOrganizerRequest(userId, status) {
    try {
      await api.patch(`/admin/organizer-requests/${userId}/status`, { status })
      setOrganizerRequests((current) => current.filter((request) => request._id !== userId))
      toast.success(status === 'approved' ? 'Organizer approved' : 'Organizer rejected')
      loadOrganizers()
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    }
  }

  async function removeOrganizerAccess(userId) {
    if (!window.confirm('Remove organizer access for this user?')) {
      return
    }

    try {
      await api.patch(`/admin/users/${userId}/remove-organizer`, {
        reviewNote: 'Organizer access removed by admin.',
      })
      setActiveOrganizers((current) => current.filter((organizer) => organizer._id !== userId))
      toast.success('Organizer access removed')
      loadOrganizers()
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    }
  }

  if (loadError) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <SectionTitle kicker="Admin" title="Organizers" />
        <div className="mt-6 rounded-lg border border-destructive/30 bg-card p-5 text-destructive">
          <p className="font-semibold">Organizer management unavailable</p>
          <p className="mt-2 text-sm">{loadError}</p>
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <SectionTitle kicker="Admin" title="Organizers" />

      {isLoading && <p className="mt-4 text-sm font-semibold text-muted-foreground">Loading organizers...</p>}

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="text-xl font-semibold">Organizer requests</h2>
          <div className="mt-5 space-y-4">
            {!isLoading && organizerRequests.length === 0 && (
              <p className="text-sm font-semibold text-muted-foreground">No pending organizer requests.</p>
            )}
            {organizerRequests.map((request) => (
              <div key={request._id} className="rounded-lg border border-border bg-muted/40 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground">
                      {request.organizerProfile?.organizationName || request.name}
                    </p>
                    <p className="mt-1 truncate text-xs font-medium text-muted-foreground">
                      {request.name} - {request.email}
                    </p>
                  </div>
                  <Badge variant="secondary" className="h-auto px-2 py-1 text-xs font-semibold">
                    {formatOrganizerStatus(request.organizerProfile?.status)}
                  </Badge>
                </div>
                {request.organizerProfile?.message && (
                  <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">{request.organizerProfile.message}</p>
                )}
                <div className="mt-3 grid gap-1 text-xs font-semibold text-muted-foreground">
                  {request.organizerProfile?.contactEmail && <span>{request.organizerProfile.contactEmail}</span>}
                  {request.organizerProfile?.city && <span>{request.organizerProfile.city}</span>}
                  {request.organizerProfile?.website && <span>{request.organizerProfile.website}</span>}
                  {request.organizerProfile?.eventTypes?.length > 0 && (
                    <span>{request.organizerProfile.eventTypes.join(', ')}</span>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => reviewOrganizerRequest(request._id, 'approved')}
                    className="border-emerald-500/30 px-3 py-2 text-xs font-semibold text-emerald-700"
                  >
                    Approve
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => reviewOrganizerRequest(request._id, 'rejected')}
                    className="px-3 py-2 text-xs font-semibold"
                  >
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="text-xl font-semibold">Active organizers</h2>
          <div className="mt-5 space-y-4">
            {!isLoading && activeOrganizers.length === 0 && (
              <p className="text-sm font-semibold text-muted-foreground">No active organizers.</p>
            )}
            {activeOrganizers.map((organizer) => (
              <div key={organizer._id} className="rounded-lg border border-border bg-muted/40 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground">
                      {organizer.organizerProfile?.organizationName || organizer.name}
                    </p>
                    <p className="mt-1 truncate text-xs font-medium text-muted-foreground">
                      {organizer.name} - {organizer.email}
                    </p>
                  </div>
                  <Badge variant="secondary" className="h-auto px-2 py-1 text-xs font-semibold">
                    {formatOrganizerStatus(organizer.organizerProfile?.status)}
                  </Badge>
                </div>
                <div className="mt-3 grid gap-1 text-xs font-semibold text-muted-foreground">
                  {organizer.organizerProfile?.contactEmail && <span>{organizer.organizerProfile.contactEmail}</span>}
                  {organizer.organizerProfile?.city && <span>{organizer.organizerProfile.city}</span>}
                  {organizer.organizerProfile?.eventTypes?.length > 0 && (
                    <span>{organizer.organizerProfile.eventTypes.join(', ')}</span>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => removeOrganizerAccess(organizer._id)}
                    className="px-3 py-2 text-xs font-semibold"
                  >
                    Remove organizer
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
