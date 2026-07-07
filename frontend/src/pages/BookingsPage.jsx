import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Ban, Download, Printer, Ticket } from 'lucide-react'
import { EmptyState, LoadingPanel, SectionTitle } from '@/components/shared'
import { EventMeta, EventPoster } from '@/components/events'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { normalizeEvent } from '@/lib/events'
import api, { getApiErrorMessage } from '@/services/api'

function escapeMarkup(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function BookingsPage() {
  const [userBookings, setUserBookings] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [cancelTarget, setCancelTarget] = useState(null)

  async function loadBookings() {
    setIsLoading(true)

    try {
      const { data } = await api.get('/bookings/my')
      setUserBookings(data.bookings || [])
    } catch (error) {
      toast.error(getApiErrorMessage(error))
      setUserBookings([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadBookings()
  }, [])

  function downloadQr(booking) {
    if (!booking.qrCode?.dataUrl) {
      toast.error('QR code is unavailable')
      return
    }

    const link = document.createElement('a')
    link.href = booking.qrCode.dataUrl
    link.download = `${booking.bookingCode}-qr.png`
    link.click()
  }

  function printBooking(booking) {
    if (!booking.qrCode?.dataUrl) {
      toast.error('QR code is unavailable')
      return
    }

    const event = booking.event ? normalizeEvent(booking.event) : null
    const seatNumbers = booking.seats.map((seat) => seat.number).join(', ')
    const printHtml = `
      <!doctype html>
      <html>
        <head>
          <title>${escapeMarkup(booking.bookingCode)}</title>
          <style>
            * { box-sizing: border-box; }
            body { font-family: Arial, sans-serif; color: #17201d; margin: 0; padding: 32px; }
            .ticket { border: 1px solid #dce6e2; padding: 24px; max-width: 560px; }
            h1 { margin: 0 0 8px; font-size: 28px; line-height: 1.15; }
            p { margin: 8px 0; }
            img { width: 180px; height: 180px; margin-top: 20px; }
            @media print {
              body { padding: 0; }
              .ticket { border-color: #aebbb6; }
            }
          </style>
        </head>
        <body>
          <section class="ticket">
            <h1>${escapeMarkup(event?.title || 'Ticketo booking')}</h1>
            <p><strong>Booking code:</strong> ${escapeMarkup(booking.bookingCode)}</p>
            <p><strong>Status:</strong> ${escapeMarkup(booking.status)}</p>
            <p><strong>Seats:</strong> ${escapeMarkup(seatNumbers)}</p>
            <p><strong>Total:</strong> ${escapeMarkup(`${booking.amount?.currency || 'INR'} ${Number(booking.amount?.total || 0).toLocaleString('en-IN')}`)}</p>
            ${event ? `<p><strong>Venue:</strong> ${escapeMarkup(`${event.venue}, ${event.city}`)}</p>` : ''}
            <img src="${booking.qrCode.dataUrl}" alt="Booking QR code" />
          </section>
          <script>
            window.addEventListener('load', function () {
              window.focus();
              setTimeout(function () {
                window.print();
              }, 250);
            });
          </script>
        </body>
      </html>
    `
    const printUrl = URL.createObjectURL(new Blob([printHtml], { type: 'text/html' }))
    const printWindow = window.open(printUrl, '_blank', 'width=720,height=840')

    if (!printWindow) {
      URL.revokeObjectURL(printUrl)
      toast.error('Allow popups to print this ticket')
      return
    }

    setTimeout(() => URL.revokeObjectURL(printUrl), 60_000)
  }

  async function cancelBooking() {
    if (!cancelTarget) return

    try {
      await api.patch(`/bookings/${cancelTarget._id}/cancel`)
      toast.success('Booking cancelled')
      setCancelTarget(null)
      loadBookings()
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <SectionTitle kicker="Account" title="My bookings" />
      <div className="mt-6 grid gap-4">
        {isLoading && (
          <LoadingPanel label="Loading bookings..." />
        )}
        {!isLoading && userBookings.length === 0 && (
          <EmptyState
            icon={Ticket}
            title="No bookings yet"
            message="Confirmed bookings will appear here after you reserve seats for a published event."
            actionLabel="Browse events"
            actionTo="/events"
          />
        )}
        {!isLoading && userBookings.map((booking) => {
          const event = booking.event ? normalizeEvent(booking.event) : null
          const seatNumbers = booking.seats.map((seat) => seat.number)
          const canUseTicket = booking.status === 'confirmed' && Boolean(booking.qrCode?.dataUrl)
          return (
            <article key={booking._id || booking.id} className="grid gap-4 rounded-lg border border-border bg-card p-4 md:grid-cols-[160px_1fr_auto]">
              <EventPoster event={event} className="h-36 w-full rounded-lg md:h-full" />
              <div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="h-auto bg-emerald-500/10 px-2 py-1 text-xs font-semibold text-emerald-700">{booking.status}</Badge>
                  <Badge variant="secondary" className="h-auto px-2 py-1 text-xs font-semibold">{booking.bookingCode}</Badge>
                </div>
                <h2 className="mt-3 text-xl font-semibold">{event?.title || 'Event unavailable'}</h2>
                {event ? <EventMeta event={event} /> : <p className="mt-3 text-sm font-semibold text-muted-foreground">Event details are no longer available.</p>}
                <p className="mt-3 text-sm font-semibold text-muted-foreground">Seats: {seatNumbers.join(', ')}</p>
                {booking.amount && (
                  <p className="mt-1 text-sm font-semibold text-muted-foreground">
                    Total: {booking.amount.currency} {booking.amount.total.toLocaleString('en-IN')}
                  </p>
                )}
              </div>
              <div className="grid justify-items-start gap-3 md:justify-items-end">
                {booking.qrCode?.dataUrl ? (
                  <img src={booking.qrCode.dataUrl} alt={`${booking.bookingCode} QR code`} className="h-28 w-28 rounded-lg ring-1 ring-border" />
                ) : (
                  <div className="grid h-28 w-28 place-items-center rounded-lg border border-dashed border-border bg-muted/40 p-3 text-center text-xs font-semibold text-muted-foreground">
                    QR unavailable
                  </div>
                )}
                <div className="flex flex-wrap justify-start gap-2 md:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!canUseTicket}
                    onClick={() => downloadQr(booking)}
                    className="px-3 py-2 text-sm font-semibold"
                  >
                    <Download size={15} /> QR
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!canUseTicket}
                    onClick={() => printBooking(booking)}
                    className="px-3 py-2 text-sm font-semibold"
                  >
                    <Printer size={15} /> Print
                  </Button>
                  {booking.status === 'confirmed' && (
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => setCancelTarget(booking)}
                      className="px-3 py-2 text-sm font-semibold"
                    >
                      <Ban size={15} /> Cancel
                    </Button>
                  )}
                </div>
              </div>
            </article>
          )
        })}
      </div>
      {cancelTarget && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-lg border border-border bg-popover p-5 text-popover-foreground shadow-2xl">
            <h2 className="text-xl font-semibold text-foreground">Cancel booking?</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              This will cancel booking <span className="font-semibold text-foreground">{cancelTarget.bookingCode}</span>
              and release the selected seats if the event has not started.
            </p>
            <div className="mt-5 flex flex-wrap justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCancelTarget(null)}
                className="px-4 py-3 text-sm font-semibold"
              >
                Keep booking
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={cancelBooking}
                className="px-4 py-3 text-sm font-semibold"
              >
                Cancel booking
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
