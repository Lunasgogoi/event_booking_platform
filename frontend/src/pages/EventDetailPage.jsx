import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { CalendarDays, Clock3, CreditCard } from 'lucide-react'
import { EmptyState, InfoBox, LoadingPanel, SummaryRow } from '@/components/shared'
import { EventMeta, EventPoster } from '@/components/events'
import { SeatLegend } from '@/components/forms'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { normalizeEvent } from '@/lib/events'
import { formatDuration, formatINR } from '@/lib/formatters'
import { useAuth } from '@/context/useAuth'
import api, { getApiErrorMessage } from '@/services/api'

const RAZORPAY_CHECKOUT_SRC = 'https://checkout.razorpay.com/v1/checkout.js'

function loadRazorpayCheckout() {
  if (window.Razorpay) {
    return Promise.resolve()
  }

  return new Promise((resolve, reject) => {
    const existingScript = document.querySelector(`script[src="${RAZORPAY_CHECKOUT_SRC}"]`)
    if (existingScript) {
      existingScript.addEventListener('load', resolve, { once: true })
      existingScript.addEventListener('error', () => reject(new Error('Unable to load Razorpay Checkout')), { once: true })
      return
    }

    const script = document.createElement('script')
    script.src = RAZORPAY_CHECKOUT_SRC
    script.async = true
    script.onload = resolve
    script.onerror = () => reject(new Error('Unable to load Razorpay Checkout'))
    document.body.appendChild(script)
  })
}

function getCurrentTimestamp() {
  return Date.now()
}

export function EventDetailPage() {
  const { eventId } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const [event, setEvent] = useState(null)
  const [lockedSeats, setLockedSeats] = useState([])
  const [selectedSeats, setSelectedSeats] = useState([])
  const [seatLockExpiresAt, setSeatLockExpiresAt] = useState({})
  const [currentTime, setCurrentTime] = useState(() => getCurrentTimestamp())
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [isBooking, setIsBooking] = useState(false)
  const seatLabels = event?.seats?.map((seat) => seat.number) || []

  async function refreshSeatStatuses(eventMongoId) {
    const seatsResponse = await api.get(`/events/${eventMongoId}/seats`)
    setLockedSeats(
      seatsResponse.data.seats
        .filter((seat) => seat.status === 'locked' || seat.status === 'booked' || seat.status === 'blocked')
        .map((seat) => seat.number),
    )
  }

  useEffect(() => {
    async function loadEvent() {
      setIsLoading(true)
      setLoadError('')

      try {
        const { data } = await api.get(`/events/${eventId}`)
        const normalized = normalizeEvent(data.event)
        setEvent(normalized)

        await refreshSeatStatuses(data.event._id)
        setSelectedSeats([])
        setSeatLockExpiresAt({})
      } catch (error) {
        setEvent(null)
        setSelectedSeats([])
        setSeatLockExpiresAt({})
        setLockedSeats([])
        setLoadError(getApiErrorMessage(error))
      } finally {
        setIsLoading(false)
      }
    }

    loadEvent()
  }, [eventId])

  useEffect(() => {
    if (!selectedSeats.length) return undefined

    const timer = window.setInterval(() => {
      const nextTime = getCurrentTimestamp()
      const expiredSeats = selectedSeats.filter((seat) => seatLockExpiresAt[seat] <= nextTime)

      setCurrentTime(nextTime)

      if (!expiredSeats.length) {
        return
      }

      setSelectedSeats((current) => current.filter((seat) => !expiredSeats.includes(seat)))
      setSeatLockExpiresAt((current) => {
        const next = { ...current }
        expiredSeats.forEach((seat) => {
          delete next[seat]
        })
        return next
      })

      toast.error('Seat hold expired')
      if (event?.mongoId) {
        refreshSeatStatuses(event.mongoId).catch(() => null)
      }
    }, 1000)

    return () => window.clearInterval(timer)
  }, [event?.mongoId, seatLockExpiresAt, selectedSeats])

  async function toggleSeat(seat) {
    if (!event || lockedSeats.includes(seat)) return

    if (!isAuthenticated) {
      toast.error('Login to reserve seats')
      navigate('/login')
      return
    }

    try {
      if (selectedSeats.includes(seat)) {
        await api.post('/bookings/release-seat', {
          eventId: event.mongoId,
          seatNumber: seat,
        })
        setSelectedSeats((current) => current.filter((item) => item !== seat))
        setSeatLockExpiresAt((current) => {
          const next = { ...current }
          delete next[seat]
          return next
        })
      } else {
        const { data } = await api.post('/bookings/lock-seat', {
          eventId: event.mongoId,
          seatNumber: seat,
        })
        const expiresInSeconds = data.lock?.expiresInSeconds || 600
        setSelectedSeats((current) => [...current, seat])
        const lockedUntil = getCurrentTimestamp() + expiresInSeconds * 1000
        setSeatLockExpiresAt((current) => ({
          ...current,
          [seat]: lockedUntil,
        }))
        setCurrentTime(getCurrentTimestamp())
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    }
  }

  async function confirmBooking() {
    if (!event) return

    if (!isAuthenticated) {
      toast.error('Login to confirm your booking')
      navigate('/login')
      return
    }

    setIsBooking(true)

    try {
      const bookingPayload = {
        eventId: event.mongoId,
        seatNumbers: selectedSeats,
      }
      const { data } = await api.post('/bookings', bookingPayload)
      const payment = data.payment

      await loadRazorpayCheckout()

      await new Promise((resolve, reject) => {
        const checkout = new window.Razorpay({
          key: payment.keyId,
          amount: payment.amount,
          currency: payment.currency,
          name: payment.businessName,
          description: event.title,
          order_id: payment.orderId,
          prefill: {
            name: data.user?.name || '',
            email: data.user?.email || '',
          },
          theme: {
            color: '#e11d48',
          },
          handler: async (response) => {
            try {
              await api.post('/bookings/verify-payment', {
                ...bookingPayload,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              })
              toast.success('Booking confirmed')
              navigate('/bookings')
              resolve()
            } catch (error) {
              reject(error)
            }
          },
          modal: {
            ondismiss: () => reject(new Error('Payment cancelled')),
          },
        })

        checkout.on('payment.failed', (response) => {
          reject(new Error(response.error?.description || 'Payment failed'))
        })

        checkout.open()
      })
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    } finally {
      setIsBooking(false)
    }
  }

  function getSeatPrice(seatNumber) {
    return event?.seats?.find((seat) => seat.number === seatNumber)?.price || event?.priceFrom || 0
  }

  const subtotal = selectedSeats.reduce((total, seatNumber) => total + getSeatPrice(seatNumber), 0)
  const fees = selectedSeats.length ? 99 : 0
  const nextLockExpiry = Math.min(
    ...selectedSeats.map((seat) => seatLockExpiresAt[seat]).filter((expiresAt) => Number.isFinite(expiresAt)),
  )
  const holdSecondsRemaining = Number.isFinite(nextLockExpiry)
    ? Math.max(0, Math.ceil((nextLockExpiry - currentTime) / 1000))
    : 0

  if (isLoading) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <LoadingPanel label="Loading event..." />
      </main>
    )
  }

  if (!event) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <EmptyState
          icon={CalendarDays}
          title="Event unavailable"
          message={loadError || 'This event is not published or no longer exists.'}
          actionLabel="Browse events"
          actionTo="/events"
        />
      </main>
    )
  }

  return (
    <main className={selectedSeats.length ? 'pb-28 lg:pb-0' : ''}>
      <section className="bg-slate-950 text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <div className="overflow-hidden rounded border border-white/10">
            <EventPoster event={event} className="h-[420px] w-full" />
          </div>
          <div className="flex flex-col justify-center">
            <Badge variant="secondary" className="mb-4 w-fit bg-white px-3 py-1 text-sm font-semibold text-black">{event.category}</Badge>
            <h1 className="text-4xl font-semibold tracking-normal sm:text-5xl">{event.title}</h1>
            <EventMeta event={event} light />
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <InfoBox label="Starts from" value={`INR ${event.priceFrom.toLocaleString('en-IN')}`} />
              <InfoBox label="Demand" value={`${event.sold}% sold`} />
              <InfoBox label="Available" value={`${event.availableSeats} seats`} />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_360px] lg:px-8">
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Select seats</h2>
              <p className="text-sm text-muted-foreground">
                {selectedSeats.length
                  ? `Your hold expires in ${formatDuration(holdSecondsRemaining)}.`
                  : 'Pick your preferred seats to continue.'}
              </p>
            </div>
            {selectedSeats.length > 0 && (
              <span className="inline-flex w-fit items-center gap-2 rounded bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700">
                <Clock3 size={16} /> {formatDuration(holdSecondsRemaining)}
              </span>
            )}
          </div>
          <div className="mb-5 rounded-lg bg-muted py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Stage
          </div>
          <SeatLegend />
          {seatLabels.length ? (
            <div className="mt-4 grid grid-cols-6 gap-2">
              {seatLabels.map((seat) => {
                const isLocked = lockedSeats.includes(seat)
                const isSelected = selectedSeats.includes(seat)
                return (
                  <button
                    key={seat}
                    type="button"
                    onClick={() => toggleSeat(seat)}
                    disabled={isLocked}
                    title={isLocked ? 'Unavailable seat' : isSelected ? 'Your selected seat' : 'Available seat'}
                    className={`h-11 rounded text-sm font-semibold transition ${
                      isLocked
                        ? 'cursor-not-allowed bg-muted text-muted-foreground/60'
                        : isSelected
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-background text-foreground ring-1 ring-border hover:bg-muted'
                    }`}
                  >
                    {seat}
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm font-semibold text-muted-foreground">
              No seats are configured for this event.
            </div>
          )}
        </div>

        <aside className="h-fit rounded-lg border border-border bg-card p-5">
          <h2 className="text-xl font-semibold">Booking summary</h2>
          <div className="mt-4 space-y-3 text-sm">
            <SummaryRow label="Tickets" value={`${selectedSeats.length} selected`} />
            <SummaryRow label="Seats" value={selectedSeats.join(', ') || 'None'} />
            {selectedSeats.length > 0 && (
              <SummaryRow label="Hold" value={`${formatDuration(holdSecondsRemaining)} remaining`} />
            )}
            <SummaryRow label="Price" value={`INR ${subtotal.toLocaleString('en-IN')}`} />
            <SummaryRow label="Fees" value={`INR ${fees}`} />
          </div>
          <div className="mt-5 border-t border-border pt-4">
            <SummaryRow
              label="Total"
              value={`INR ${(subtotal + fees).toLocaleString('en-IN')}`}
              strong
            />
          </div>
          <Button
            type="button"
            disabled={!selectedSeats.length || isBooking}
            onClick={confirmBooking}
            className="mt-5 w-full px-4 py-3 text-sm font-semibold"
          >
            <CreditCard size={18} /> {isBooking ? 'Opening payment...' : 'Pay and confirm'}
          </Button>
        </aside>
      </section>
      {selectedSeats.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background p-4 shadow-2xl lg:hidden">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">
                {selectedSeats.length} {selectedSeats.length === 1 ? 'seat' : 'seats'} selected
              </p>
              <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-amber-700">
                <Clock3 size={14} /> {formatDuration(holdSecondsRemaining)} remaining
              </p>
            </div>
            <Button
              type="button"
              disabled={isBooking}
              onClick={confirmBooking}
              className="shrink-0 px-4 py-3 text-sm font-semibold"
            >
              <CreditCard size={17} /> {isBooking ? 'Paying...' : formatINR(subtotal + fees)}
            </Button>
          </div>
        </div>
      )}
    </main>
  )
}
