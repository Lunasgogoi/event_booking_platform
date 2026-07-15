import { useCallback, useEffect, useState } from 'react'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Edit3, Eye, EyeOff, Plus } from 'lucide-react'
import { format } from 'date-fns'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { SectionTitle } from '@/components/shared'
import { EventPoster } from '@/components/events'
import { AdminField } from '@/components/forms'
import { eventFormDefaults, eventSectionDefaults } from '@/lib/constants'
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
  const [pendingAction, setPendingAction] = useState(null)
  const {
    control: eventFormControl,
    register: registerEventField,
    handleSubmit: handleEventSubmit,
    reset: resetEventForm,
    formState: { isSubmitting },
  } = useForm({ defaultValues: eventFormDefaults })
  const {
    fields: sectionFields,
    append: appendEventSection,
    remove: removeEventSection,
  } = useFieldArray({
    control: eventFormControl,
    name: 'sections',
  })
  const seatingMode = useWatch({ control: eventFormControl, name: 'seatingMode' })
  const watchedSections = useWatch({ control: eventFormControl, name: 'sections' }) || []
  const canConfigureSeating = !editingEvent || organizerEditableStatuses.includes(editingEvent.status)

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
      seatingMode: event.seatingMode === 'sections' && event.sections?.length ? 'sections' : 'single',
      sections: event.sections?.length
        ? event.sections.map((section) => ({
            name: section.name,
            code: section.code,
            selectionMode: section.selectionMode,
            rows: section.rows,
            seatsPerRow: section.seatsPerRow,
            price: section.price,
          }))
        : [{ ...eventSectionDefaults }],
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

  async function getLatestOrganizerEvent(eventId) {
    const { data } = await api.get(listPath)
    const events = data.events || []
    setRemoteEvents(events)
    return events.find((event) => event._id === eventId)
  }

  async function submitEvent(values) {
    try {
      if (editingEvent && isOrganizer) {
        const latestEvent = await getLatestOrganizerEvent(editingEvent._id)

        if (!latestEvent || !organizerEditableStatuses.includes(latestEvent.status)) {
          toast.error('This event is already in review or published and cannot be updated.')
          closeEventForm()
          return
        }
      }

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
      }

      const canUpdateSeating = !editingEvent || organizerEditableStatuses.includes(editingEvent.status)
      if (canUpdateSeating && values.seatingMode === 'sections') {
        const sections = values.sections.map((section) => ({
          name: section.name,
          code: section.code,
          selectionMode: section.selectionMode,
          rows: Number(section.rows),
          seatsPerRow: Number(section.seatsPerRow),
          price: Number(section.price),
        }))
        payload.seatingMode = 'sections'
        payload.sections = sections
        payload.totalSeats = sections.reduce((total, section) => total + section.rows * section.seatsPerRow, 0)
        payload.priceFrom = Math.min(...sections.map((section) => section.price))
      } else if (canUpdateSeating) {
        payload.seatingMode = 'single'
        payload.sections = []
        payload.priceFrom = values.priceFrom
        payload.totalSeats = values.totalSeats
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
    setPendingAction({ eventId, action: 'submit' })
    try {
      await api.patch(`/events/organizer/${eventId}/submit`)
      toast.success('Event submitted for review')
      if (editingEvent?._id === eventId) {
        closeEventForm()
      }
      loadEvents()
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    } finally {
      setPendingAction(null)
    }
  }

  async function publishOrganizerEvent(eventId) {
    setPendingAction({ eventId, action: 'publishOrganizer' })
    try {
      await api.patch(`/events/organizer/${eventId}/publish`)
      toast.success('Event published')
      loadEvents()
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    } finally {
      setPendingAction(null)
    }
  }

  async function toggleEventPreview(eventId, enabled) {
    setPendingAction({ eventId, action: 'preview' })
    try {
      await api.patch(`/events/organizer/${eventId}/preview`, { enabled })
      toast.success(enabled ? 'Event added to Coming soon' : 'Event removed from Coming soon')
      loadEvents()
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    } finally {
      setPendingAction(null)
    }
  }

  async function reviewEvent(eventId, status) {
    const needsNote = status === 'changes_requested' || status === 'rejected'
    const reviewNote = needsNote ? window.prompt(status === 'changes_requested' ? 'What changes are needed?' : 'Why is this event rejected?') : ''

    if (needsNote && reviewNote === null) {
      return
    }

    setPendingAction({ eventId, action: status })
    try {
      await api.patch(`/events/${eventId}/review`, { status, reviewNote: reviewNote || '' })
      toast.success(`Event ${formatEventStatus(status).toLowerCase()}`)
      loadEvents()
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    } finally {
      setPendingAction(null)
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
    canTogglePreview: isOrganizer && event.status === 'approved',
    canPublish: !isOrganizer && !isReviewQueue && event.status === 'draft' && event.createdBy?.role === 'admin',
    canCancel: !isOrganizer && !isReviewQueue && event.status === 'published',
    canMarkUnderReview: !isOrganizer && event.status === 'submitted',
    canReview: !isOrganizer && reviewDecisionStatuses.includes(event.status),
    publishing: event.publishing,
    previewEnabled: Boolean(event.previewEnabled),
    sold: event.totalSeats ? Math.round(((event.totalSeats - event.availableSeats) / event.totalSeats) * 100) : 0,
    raw: event,
  }))
  function isActionPending(eventId, action) {
    return pendingAction?.eventId === eventId && pendingAction?.action === action
  }

  function isEventActionPending(eventId) {
    return pendingAction?.eventId === eventId
  }

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
        <div className="mt-6 rounded-lg border border-destructive/30 bg-card p-5 text-destructive">
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
          <Button
            type="button"
            onClick={() => {
              if (showForm && !editingEvent) {
                closeEventForm()
              } else {
                openCreateForm()
              }
            }}
            className="w-fit px-4 py-3 text-sm font-semibold"
          >
            <Plus size={18} /> {showForm && !editingEvent ? 'Close form' : isOrganizer ? 'Create draft' : 'Create event'}
          </Button>
        )}
      </div>

      {isOrganizer && (
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {organizerSummary.map((section) => (
            <div key={section.key} className="rounded-lg border border-border bg-card p-4">
              <p className="text-sm font-semibold text-muted-foreground">{section.title}</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">{section.count}</p>
            </div>
          ))}
        </div>
      )}

      {showForm && !isReviewQueue && (
        <form onSubmit={handleEventSubmit(submitEvent)} className="mb-6 rounded-lg border border-border bg-card p-5">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-foreground">{editingEvent ? 'Edit event' : 'Create event'}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {editingEvent
                ? 'Update event details and upload a new poster if needed.'
                : isOrganizer
                  ? 'Create a private draft, then submit it for admin review.'
                  : 'Create a draft event for review before publishing.'}
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <AdminField label="Title" registration={registerEventField('title', { required: true })} required />
            <Label className="grid gap-2 text-sm font-semibold text-foreground">
              Category
              <select
                {...registerEventField('category', { required: true })}
                required
                className="h-11 rounded-lg border border-input bg-muted/40 px-3 text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {['Music', 'Comedy', 'Business', 'Sports', 'Food', 'Arts', 'Technology', 'Other'].map((category) => (
                  <option key={category}>{category}</option>
                ))}
              </select>
            </Label>
            <AdminField label="Venue name" registration={registerEventField('venueName', { required: true })} required />
            <AdminField label="City" registration={registerEventField('city', { required: true })} required />
            <AdminField label="Address" registration={registerEventField('address', { required: true })} required />
            <AdminField label="Start date" type="datetime-local" registration={registerEventField('startsAt', { required: true })} required />
            <Label className="grid gap-2 text-sm font-semibold text-foreground">
              Poster image
              <Input
                {...registerEventField('posterFile')}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="h-11 bg-muted/40 px-3 py-2 text-sm"
              />
            </Label>
          </div>
          {canConfigureSeating ? (
            <div className="mt-5 rounded-lg border border-border bg-muted/20 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <Label className="grid min-w-64 gap-2 text-sm font-semibold text-foreground">
                  Seating setup
                  <select
                    {...registerEventField('seatingMode')}
                    className="h-11 rounded-lg border border-input bg-background px-3 text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <option value="single">Single general section</option>
                    <option value="sections">Multiple seating sections</option>
                  </select>
                </Label>
                <p className="max-w-xl text-sm leading-6 text-muted-foreground">
                  Use sections for areas such as Front, Side, Back, VIP, or Balcony. Each section can let customers choose seats or receive the best adjacent seats automatically.
                </p>
              </div>

              {seatingMode === 'single' ? (
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <AdminField label="Price per seat" type="number" registration={registerEventField('priceFrom', { required: true, min: 0 })} required min="0" />
                  <AdminField label="Total seats" type="number" registration={registerEventField('totalSeats', { required: true, min: 1, max: 20000 })} required min="1" />
                </div>
              ) : (
                <div className="mt-4 grid gap-4">
                  {sectionFields.map((sectionField, index) => {
                    const section = watchedSections[index] || sectionField
                    const capacity = Number(section.rows || 0) * Number(section.seatsPerRow || 0)

                    return (
                      <div key={sectionField.id} className="rounded-lg border border-border bg-card p-4">
                        <div className="mb-4 flex items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold text-foreground">Section {index + 1}</p>
                            <p className="text-xs font-medium text-muted-foreground">{capacity.toLocaleString('en-IN')} configured seats</p>
                          </div>
                          {sectionFields.length > 1 && (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => removeEventSection(index)}
                              className="px-3 py-2 text-sm font-medium text-destructive"
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          <AdminField label="Section name" registration={registerEventField(`sections.${index}.name`, { required: true })} required />
                          <AdminField label="Short code" registration={registerEventField(`sections.${index}.code`, { required: true, pattern: /^[a-z0-9]+$/i })} required />
                          <Label className="grid gap-2 text-sm font-medium text-foreground">
                            Seat selection
                            <select
                              {...registerEventField(`sections.${index}.selectionMode`, { required: true })}
                              className="h-11 rounded-lg border border-input bg-muted/40 px-3 text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                            >
                              <option value="choose_seat">Customer chooses seats</option>
                              <option value="auto_assign">Auto-assign adjacent seats</option>
                            </select>
                          </Label>
                          <AdminField label="Number of rows" type="number" registration={registerEventField(`sections.${index}.rows`, { required: true, min: 1, max: 100 })} required min="1" />
                          <AdminField label="Seats per row" type="number" registration={registerEventField(`sections.${index}.seatsPerRow`, { required: true, min: 1, max: 200 })} required min="1" />
                          <AdminField label="Price per seat" type="number" registration={registerEventField(`sections.${index}.price`, { required: true, min: 0 })} required min="0" />
                        </div>
                      </div>
                    )
                  })}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => appendEventSection({
                      ...eventSectionDefaults,
                      name: `Section ${sectionFields.length + 1}`,
                      code: `S${sectionFields.length + 1}`,
                    })}
                    disabled={sectionFields.length >= 20}
                    className="w-fit px-4 py-3 text-sm font-semibold"
                  >
                    <Plus size={17} /> Add section
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-5 rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
              Seating configuration is locked after an event enters review or is published.
            </div>
          )}
          <Label className="mt-4 grid gap-2 text-sm font-semibold text-foreground">
            Description
            <Textarea
              {...registerEventField('description', { required: true, minLength: 20 })}
              required
              minLength={20}
              rows={4}
              className="bg-muted/40 px-3 py-2"
            />
          </Label>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-3 text-sm font-semibold"
            >
              {isSubmitting ? 'Saving...' : editingEvent ? 'Update event' : 'Save event'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={closeEventForm}
              className="px-4 py-3 text-sm font-semibold"
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-lg border border-border bg-card">
          <Table className="min-w-[760px] text-left text-sm">
            <TableHeader className="bg-muted text-xs uppercase tracking-wide text-muted-foreground">
              <TableRow className="hover:bg-transparent">
                <TableHead className="px-4 py-3 text-muted-foreground">Event</TableHead>
                <TableHead className="px-4 py-3 text-muted-foreground">Date</TableHead>
                <TableHead className="px-4 py-3 text-muted-foreground">City</TableHead>
                <TableHead className="px-4 py-3 text-muted-foreground">Status</TableHead>
                <TableHead className="px-4 py-3 text-muted-foreground">Sold</TableHead>
                <TableHead className="px-4 py-3 text-muted-foreground">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border">
              {isLoading && (
                <TableRow>
                  <TableCell colSpan="6" className="px-4 py-8 text-center font-semibold text-muted-foreground">
                    Loading events...
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan="6" className="px-4 py-8 text-center font-semibold text-muted-foreground">
                    {isOrganizer ? 'No organizer events found. Create your first draft.' : isReviewQueue ? 'No events are waiting for review.' : 'No events found. Create your first event.'}
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && displayRows.map((event) => event.type === 'section' ? (
                <TableRow key={event.key} className="bg-muted/40 hover:bg-muted/40">
                  <TableCell colSpan="6" className="px-4 py-3">
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-sm font-semibold text-foreground">{event.title}</p>
                      <Badge variant="secondary" className="h-auto px-2 py-1 text-xs font-semibold">{event.count}</Badge>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                <TableRow key={event.id}>
                  <TableCell className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <EventPoster event={event} compact className="h-12 w-16 rounded" />
                      <div>
                        <p className="font-semibold">{event.title}</p>
                        <p className="text-xs text-muted-foreground">{event.category}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-4 font-semibold">{format(event.date, 'dd MMM yyyy')}</TableCell>
                  <TableCell className="px-4 py-4">{event.city}</TableCell>
                  <TableCell className="px-4 py-4">
                    <Badge variant="secondary" className="h-auto px-2 py-1 text-xs font-semibold">
                      {formatEventStatus(event.status)}
                    </Badge>
                    {isOrganizer && event.status === 'approved' && (
                      <div className="mt-2 grid gap-1 text-xs font-semibold">
                        <p className="text-emerald-700">
                          {event.publishing?.feeAmount > 0 ? `${formatINR(event.publishing.feeAmount)} due` : 'No publishing fee'}
                        </p>
                        <p className={event.previewEnabled ? 'text-primary' : 'text-muted-foreground'}>
                          {event.previewEnabled ? 'Shown in Coming soon' : 'Preview hidden'}
                        </p>
                      </div>
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
                          className="px-3 py-2 font-medium"
                        >
                          <Edit3 size={15} /> Edit
                        </Button>
                      )}
                      {event.canSubmit && (
                        <Button
                          variant="outline"
                          type="button"
                          onClick={() => submitOrganizerDraft(event.id)}
                          disabled={isEventActionPending(event.id)}
                          className="px-3 py-2 font-medium"
                        >
                          {isActionPending(event.id, 'submit') ? 'Submitting...' : 'Submit'}
                        </Button>
                      )}
                      {event.canPublishOrganizer && (
                        <Button
                          variant="outline"
                          type="button"
                          onClick={() => publishOrganizerEvent(event.id)}
                          disabled={isEventActionPending(event.id)}
                          className="border-emerald-500/30 px-3 py-2 font-medium text-emerald-700"
                        >
                          {isActionPending(event.id, 'publishOrganizer') ? 'Publishing...' : 'Publish'}
                        </Button>
                      )}
                      {event.canTogglePreview && (
                        <Button
                          variant="outline"
                          type="button"
                          onClick={() => toggleEventPreview(event.id, !event.previewEnabled)}
                          disabled={isEventActionPending(event.id)}
                          className="px-3 py-2 font-medium"
                        >
                          {event.previewEnabled ? <EyeOff size={15} /> : <Eye size={15} />}
                          {isActionPending(event.id, 'preview')
                            ? 'Saving...'
                            : event.previewEnabled
                              ? 'Hide preview'
                              : 'Show preview'}
                        </Button>
                      )}
                      {event.canPublish && (
                        <Button
                          variant="outline"
                          type="button"
                          onClick={() => updateEventStatus(event.id, 'publish')}
                          className="px-3 py-2 font-medium"
                        >
                          <Edit3 size={15} /> Publish
                        </Button>
                      )}
                      {event.canMarkUnderReview && (
                        <Button
                          variant="outline"
                          type="button"
                          onClick={() => reviewEvent(event.id, 'under_review')}
                          className="px-3 py-2 font-medium"
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
                            disabled={isEventActionPending(event.id)}
                            className="border-emerald-500/30 px-3 py-2 font-medium text-emerald-700"
                          >
                            {isActionPending(event.id, 'approved') ? 'Approving...' : 'Approve'}
                          </Button>
                          <Button
                            variant="outline"
                            type="button"
                            onClick={() => reviewEvent(event.id, 'changes_requested')}
                            disabled={isEventActionPending(event.id)}
                            className="border-amber-500/30 px-3 py-2 font-medium text-amber-700"
                          >
                            {isActionPending(event.id, 'changes_requested') ? 'Saving...' : 'Changes'}
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            onClick={() => reviewEvent(event.id, 'rejected')}
                            disabled={isEventActionPending(event.id)}
                            className="px-3 py-2 font-medium"
                          >
                            {isActionPending(event.id, 'rejected') ? 'Rejecting...' : 'Reject'}
                          </Button>
                        </>
                      )}
                      {event.canCancel && (
                        <Button
                          variant="outline"
                          type="button"
                          onClick={() => updateEventStatus(event.id, 'cancel')}
                          className="px-3 py-2 font-medium"
                        >
                          Cancel
                        </Button>
                      )}
                      {event.canDelete && (
                        <Button
                          type="button"
                          variant="destructive"
                          onClick={() => setDeleteTarget(event.raw)}
                          className="px-3 py-2 font-medium"
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
        <AlertDialogContent className="max-w-md rounded-lg p-5 shadow-2xl">
          <AlertDialogHeader className="place-items-start text-left">
            <AlertDialogTitle className="text-xl font-semibold text-foreground">Delete event?</AlertDialogTitle>
            <AlertDialogDescription className="mt-2 text-sm leading-6 text-muted-foreground">
              This will permanently remove <span className="font-semibold text-foreground">{deleteTarget?.title}</span>.
              Existing booking references may no longer show event details.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="-mx-5 -mb-5 mt-1 flex flex-wrap justify-end gap-3 rounded-b border-t border-border bg-muted/40 p-5">
            <AlertDialogCancel className="h-11 px-4 py-3 text-sm font-semibold">
              Keep event
            </AlertDialogCancel>
            <AlertDialogAction
              type="button"
              onClick={deleteEvent}
              variant="destructive"
              className="h-11 px-4 py-3 text-sm font-semibold"
            >
              Delete event
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  )
}
