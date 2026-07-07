import { useCallback, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Edit3, Plus } from 'lucide-react'
import { format } from 'date-fns'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { SectionTitle } from '@/components/shared'
import { EventPoster } from '@/components/events'
import { AdminField } from '@/components/forms'
import { eventFormDefaults } from '@/lib/constants'
import { formatEventStatus, formatINR } from '@/lib/formatters'
import api, { getApiErrorMessage } from '@/services/api'

function formatDateTimeInput(value) {
  if (!value) {
    return ''
  }

  return format(new Date(value), "yyyy-MM-dd'T'HH:mm")
}

export function ManageEventsPage({ scope = 'admin' }) {
  const isOrganizer = scope === 'organizer'
  const isReviewQueue = scope === 'review'
  const listPath = isOrganizer ? '/events/organizer/manage' : isReviewQueue ? '/events/admin/review?status=all' : '/events/admin/manage'
  const createPath = isOrganizer ? '/events/organizer' : '/events'
  const pageKicker = isOrganizer ? 'Organizer' : 'Admin'
  const pageTitle = isOrganizer ? 'My event workflow' : isReviewQueue ? 'Event review queue' : 'Manage events'
  const organizerEditableStatuses = ['draft', 'changes_requested', 'rejected']
  const reviewDecisionStatuses = ['submitted', 'under_review']
  const organizerSections = [
    { key: 'drafts', title: 'Drafts and changes', statuses: ['draft', 'changes_requested', 'rejected'] },
    { key: 'review', title: 'In review', statuses: ['submitted', 'under_review'] },
    { key: 'approved', title: 'Ready to publish', statuses: ['approved'] },
    { key: 'published', title: 'Published', statuses: ['published'] },
    { key: 'inactive', title: 'Inactive', statuses: ['cancelled', 'completed'] },
  ]
  const [remoteEvents, setRemoteEvents] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingEvent, setEditingEvent] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const {
    register: registerEventField,
    handleSubmit: handleEventSubmit,
    reset: resetEventForm,
    formState: { isSubmitting },
  } = useForm({ defaultValues: eventFormDefaults })

  const loadEvents = useCallback(async function loadEvents() {
    setIsLoading(true)
    setLoadError('')

    try {
      const { data } = await api.get(listPath)
      setRemoteEvents(data.events)
    } catch (error) {
      const message = getApiErrorMessage(error)
      setLoadError(message)
      setRemoteEvents([])
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }, [listPath])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadEvents()
  }, [loadEvents])

  function openCreateForm() {
    setEditingEvent(null)
    resetEventForm(eventFormDefaults)
    setShowForm(true)
  }

  function openEditForm(event) {
    setEditingEvent(event)
    resetEventForm({
      ...eventFormDefaults,
      title: event.title || '',
      description: event.description || '',
      category: event.category || 'Music',
      venueName: event.venue?.name || '',
      address: event.venue?.address || '',
      city: event.venue?.city || '',
      startsAt: formatDateTimeInput(event.startsAt),
      priceFrom: event.priceFrom ?? '',
      totalSeats: event.totalSeats ?? '',
      status: event.status || 'draft',
      posterFile: null,
    })
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function closeEventForm() {
    setShowForm(false)
    setEditingEvent(null)
    resetEventForm(eventFormDefaults)
  }

  async function submitEvent(values) {
    try {
      let poster
      const posterFile = values.posterFile?.[0]

      if (posterFile) {
        const uploadData = new FormData()
        uploadData.append('poster', posterFile)
        const { data } = await api.post('/events/poster', uploadData)
        poster = data.poster
      }

      const payload = {
        title: values.title,
        description: values.description,
        category: values.category,
        venue: {
          name: values.venueName,
          address: values.address,
          city: values.city,
        },
        startsAt: values.startsAt,
        priceFrom: values.priceFrom,
        totalSeats: values.totalSeats,
        status: values.status,
      }

      if (poster) {
        payload.poster = poster
      }

      if (editingEvent) {
        await api.patch(isOrganizer ? `/events/organizer/${editingEvent._id}` : `/events/${editingEvent._id}`, payload)
      } else {
        await api.post(createPath, payload)
      }

      toast.success(editingEvent ? 'Event updated' : 'Event created')
      closeEventForm()
      loadEvents()
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    }
  }

  async function updateEventStatus(eventId, action) {
    try {
      await api.patch(`/events/${eventId}/${action}`)
      toast.success(action === 'publish' ? 'Event published' : 'Event cancelled')
      loadEvents()
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    }
  }

  async function submitOrganizerDraft(eventId) {
    try {
      await api.patch(`/events/organizer/${eventId}/submit`)
      toast.success('Event submitted for review')
      loadEvents()
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    }
  }

  async function publishOrganizerEvent(eventId) {
    try {
      await api.patch(`/events/organizer/${eventId}/publish`)
      toast.success('Event published')
      loadEvents()
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    }
  }

  async function reviewEvent(eventId, status) {
    const needsNote = status === 'changes_requested' || status === 'rejected'
    const reviewNote = needsNote ? window.prompt(status === 'changes_requested' ? 'What changes are needed?' : 'Why is this event rejected?') : ''

    if (needsNote && reviewNote === null) {
      return
    }

    try {
      await api.patch(`/events/${eventId}/review`, { status, reviewNote: reviewNote || '' })
      toast.success(`Event ${formatEventStatus(status).toLowerCase()}`)
      loadEvents()
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    }
  }

  async function deleteEvent() {
    if (!deleteTarget) return
    try {
      await api.delete(isOrganizer ? `/events/organizer/${deleteTarget._id}` : `/events/${deleteTarget._id}`)
      toast.success('Event deleted')
      setDeleteTarget(null)
      loadEvents()
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    }
  }

  const rows = remoteEvents.map((event) => ({
    id: event._id,
    title: event.title,
    category: event.category,
    image: event.poster?.url || '',
    date: new Date(event.startsAt),
    city: event.venue?.city,
    status: event.status,
    canEdit: isOrganizer ? organizerEditableStatuses.includes(event.status) : !isReviewQueue,
    canDelete: isOrganizer ? organizerEditableStatuses.includes(event.status) : !isReviewQueue,
    canSubmit: isOrganizer && organizerEditableStatuses.includes(event.status),
    canPublishOrganizer: isOrganizer && event.status === 'approved' && event.publishing?.paymentStatus !== 'pending',
    canPublish: !isOrganizer && !isReviewQueue && event.status === 'draft' && event.createdBy?.role === 'admin',
    canCancel: !isOrganizer && !isReviewQueue && event.status === 'published',
    canMarkUnderReview: !isOrganizer && event.status === 'submitted',
    canReview: !isOrganizer && reviewDecisionStatuses.includes(event.status),
    publishing: event.publishing,
    sold: event.totalSeats ? Math.round(((event.totalSeats - event.availableSeats) / event.totalSeats) * 100) : 0,
    raw: event,
  }))
  const organizerSummary = organizerSections.map((section) => ({
    ...section,
    count: rows.filter((event) => section.statuses.includes(event.status)).length,
  }))
  const displayRows = isOrganizer
    ? organizerSections.flatMap((section) => {
        const sectionRows = rows.filter((event) => section.statuses.includes(event.status))
        return sectionRows.length
          ? [{ type: 'section', key: section.key, title: section.title, count: sectionRows.length }, ...sectionRows.map((event) => ({ type: 'event', ...event }))]
          : []
      })
    : rows.map((event) => ({ type: 'event', ...event }))

  if (loadError) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <SectionTitle kicker={pageKicker} title={pageTitle} />
        <div className="mt-6 rounded border border-rose-200 bg-white p-5 text-rose-700">
          <p className="font-semibold">Event management unavailable</p>
          <p className="mt-2 text-sm">{loadError}</p>
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SectionTitle kicker={pageKicker} title={pageTitle} />
        {!isReviewQueue && (
          <button
            type="button"
            onClick={() => {
              if (showForm && !editingEvent) {
                closeEventForm()
              } else {
                openCreateForm()
              }
            }}
            className="inline-flex w-fit items-center gap-2 rounded bg-rose-600 px-4 py-3 text-sm font-semibold text-white hover:bg-rose-700"
          >
            <Plus size={18} /> {showForm && !editingEvent ? 'Close form' : isOrganizer ? 'Create draft' : 'Create event'}
          </button>
        )}
      </div>

      {isOrganizer && (
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {organizerSummary.map((section) => (
            <div key={section.key} className="rounded border border-slate-200 bg-white p-4">
              <p className="text-sm font-semibold text-slate-500">{section.title}</p>
              <p className="mt-1 text-2xl font-semibold text-slate-950">{section.count}</p>
            </div>
          ))}
        </div>
      )}

      {showForm && !isReviewQueue && (
        <form onSubmit={handleEventSubmit(submitEvent)} className="mb-6 rounded border border-slate-200 bg-white p-5">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-slate-950">{editingEvent ? 'Edit event' : 'Create event'}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {editingEvent
                ? 'Update event details and upload a new poster if needed.'
                : isOrganizer
                  ? 'Create a private draft, then submit it for admin review.'
                  : 'Create a draft event for review before publishing.'}
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <AdminField label="Title" registration={registerEventField('title', { required: true })} required />
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Category
              <select
                {...registerEventField('category', { required: true })}
                required
                className="h-11 rounded border border-slate-200 bg-slate-50 px-3 outline-none focus:border-rose-500"
              >
                {['Music', 'Comedy', 'Business', 'Sports', 'Food', 'Arts', 'Technology', 'Other'].map((category) => (
                  <option key={category}>{category}</option>
                ))}
              </select>
            </label>
            <AdminField label="Venue name" registration={registerEventField('venueName', { required: true })} required />
            <AdminField label="City" registration={registerEventField('city', { required: true })} required />
            <AdminField label="Address" registration={registerEventField('address', { required: true })} required />
            <AdminField label="Start date" type="datetime-local" registration={registerEventField('startsAt', { required: true })} required />
            <AdminField label="Price from" type="number" registration={registerEventField('priceFrom', { required: true, min: 0 })} required min="0" />
            <AdminField label="Total seats" type="number" registration={registerEventField('totalSeats', { required: true, min: 1 })} required min="1" />
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Poster image
              <input
                {...registerEventField('posterFile')}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="h-11 rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-rose-500"
              />
            </label>
          </div>
          <label className="mt-4 grid gap-2 text-sm font-semibold text-slate-700">
            Description
            <textarea
              {...registerEventField('description', { required: true, minLength: 20 })}
              required
              minLength={20}
              rows={4}
              className="rounded border border-slate-200 bg-slate-50 px-3 py-2 outline-none focus:border-rose-500"
            />
          </label>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded bg-slate-950 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isSubmitting ? 'Saving...' : editingEvent ? 'Update event' : 'Save event'}
            </button>
            <button
              type="button"
              onClick={closeEventForm}
              className="rounded border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded border border-slate-200 bg-white">
          <Table className="min-w-[760px] text-left text-sm">
            <TableHeader className="bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
              <TableRow className="hover:bg-transparent">
                <TableHead className="px-4 py-3 text-slate-500">Event</TableHead>
                <TableHead className="px-4 py-3 text-slate-500">Date</TableHead>
                <TableHead className="px-4 py-3 text-slate-500">City</TableHead>
                <TableHead className="px-4 py-3 text-slate-500">Status</TableHead>
                <TableHead className="px-4 py-3 text-slate-500">Sold</TableHead>
                <TableHead className="px-4 py-3 text-slate-500">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-slate-200">
              {isLoading && (
                <TableRow>
                  <TableCell colSpan="6" className="px-4 py-8 text-center font-semibold text-slate-500">
                    Loading events...
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan="6" className="px-4 py-8 text-center font-semibold text-slate-500">
                    {isOrganizer ? 'No organizer events found. Create your first draft.' : isReviewQueue ? 'No events are waiting for review.' : 'No events found. Create your first event.'}
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && displayRows.map((event) => event.type === 'section' ? (
                <TableRow key={event.key} className="bg-slate-50 hover:bg-slate-50">
                  <TableCell colSpan="6" className="px-4 py-3">
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-sm font-semibold text-slate-950">{event.title}</p>
                      <span className="rounded bg-white px-2 py-1 text-xs font-semibold text-slate-600">{event.count}</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                <TableRow key={event.id}>
                  <TableCell className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <EventPoster event={event} className="h-12 w-16 rounded" />
                      <div>
                        <p className="font-semibold">{event.title}</p>
                        <p className="text-xs text-slate-500">{event.category}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-4 font-semibold">{format(event.date, 'dd MMM yyyy')}</TableCell>
                  <TableCell className="px-4 py-4">{event.city}</TableCell>
                  <TableCell className="px-4 py-4">
                    <Badge variant="secondary" className="h-auto rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                      {formatEventStatus(event.status)}
                    </Badge>
                    {isOrganizer && event.status === 'approved' && (
                      <p className="mt-2 text-xs font-semibold text-emerald-700">
                        {event.publishing?.feeAmount > 0 ? `${formatINR(event.publishing.feeAmount)} due` : 'No publishing fee'}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="px-4 py-4">{event.sold}%</TableCell>
                  <TableCell className="px-4 py-4">
                    <div className="flex flex-wrap gap-2">
                      {event.canEdit && (
                        <Button
                          variant="outline"
                          type="button"
                          onClick={() => openEditForm(event.raw)}
                          className="inline-flex items-center gap-2 rounded border border-slate-300 px-3 py-2 font-medium"
                        >
                          <Edit3 size={15} /> Edit
                        </Button>
                      )}
                      {event.canSubmit && (
                        <Button
                          variant="outline"
                          type="button"
                          onClick={() => submitOrganizerDraft(event.id)}
                          className="rounded border border-slate-300 px-3 py-2 font-medium"
                        >
                          Submit
                        </Button>
                      )}
                      {event.canPublishOrganizer && (
                        <Button
                          variant="outline"
                          type="button"
                          onClick={() => publishOrganizerEvent(event.id)}
                          className="rounded border border-emerald-200 px-3 py-2 font-medium text-emerald-700"
                        >
                          Publish
                        </Button>
                      )}
                      {event.canPublish && (
                        <Button
                          variant="outline"
                          type="button"
                          onClick={() => updateEventStatus(event.id, 'publish')}
                          className="inline-flex items-center gap-2 rounded border border-slate-300 px-3 py-2 font-medium"
                        >
                          <Edit3 size={15} /> Publish
                        </Button>
                      )}
                      {event.canMarkUnderReview && (
                        <Button
                          variant="outline"
                          type="button"
                          onClick={() => reviewEvent(event.id, 'under_review')}
                          className="rounded border border-slate-300 px-3 py-2 font-medium"
                        >
                          Review
                        </Button>
                      )}
                      {event.canReview && (
                        <>
                          <Button
                            variant="outline"
                            type="button"
                            onClick={() => reviewEvent(event.id, 'approved')}
                            className="rounded border border-emerald-200 px-3 py-2 font-medium text-emerald-700"
                          >
                            Approve
                          </Button>
                          <Button
                            variant="outline"
                            type="button"
                            onClick={() => reviewEvent(event.id, 'changes_requested')}
                            className="rounded border border-amber-200 px-3 py-2 font-medium text-amber-700"
                          >
                            Changes
                          </Button>
                          <Button
                            variant="outline"
                            type="button"
                            onClick={() => reviewEvent(event.id, 'rejected')}
                            className="rounded border border-rose-200 px-3 py-2 font-medium text-rose-700"
                          >
                            Reject
                          </Button>
                        </>
                      )}
                      {event.canCancel && (
                        <Button
                          variant="outline"
                          type="button"
                          onClick={() => updateEventStatus(event.id, 'cancel')}
                          className="rounded border border-slate-300 px-3 py-2 font-medium"
                        >
                          Cancel
                        </Button>
                      )}
                      {event.canDelete && (
                        <Button
                          variant="outline"
                          type="button"
                          onClick={() => setDeleteTarget(event.raw)}
                          className="rounded border border-rose-200 px-3 py-2 font-medium text-rose-700"
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
      </div>
      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setDeleteTarget(null)
          }
        }}
      >
        <AlertDialogContent className="max-w-md rounded border border-slate-200 bg-white p-5 shadow-2xl ring-0">
          <AlertDialogHeader className="place-items-start text-left">
            <AlertDialogTitle className="text-xl font-semibold text-slate-950">Delete event?</AlertDialogTitle>
            <AlertDialogDescription className="mt-2 text-sm leading-6 text-slate-500">
              This will permanently remove <span className="font-semibold text-slate-700">{deleteTarget?.title}</span>.
              Existing booking references may no longer show event details.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="-mx-5 -mb-5 mt-1 flex flex-wrap justify-end gap-3 rounded-b border-t border-slate-200 bg-white p-5">
            <AlertDialogCancel className="h-11 rounded border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700">
              Keep event
            </AlertDialogCancel>
            <AlertDialogAction
              type="button"
              onClick={deleteEvent}
              className="h-11 rounded bg-rose-600 px-4 py-3 text-sm font-semibold text-white hover:bg-rose-700"
            >
              Delete event
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  )
}
