import { useEffect, useMemo, useState } from 'react'
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

function getCurrentTimestamp() {
  return Date.now()
}

function loadRazorpayCheckout() {
  if (window.Razorpay) return Promise.resolve()

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

export function EventDetailPage() {
  const { eventId } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const [event, setEvent] = useState(null)
  const [activeSectionCode, setActiveSectionCode] = useState('')
  const [sectionSeats, setSectionSeats] = useState([])
  const [seatRowPage, setSeatRowPage] = useState(1)
  const [seatPagination, setSeatPagination] = useState(null)
  const [lockedSeats, setLockedSeats] = useState([])
  const [selectedSeats, setSelectedSeats] = useState([])
  const [selectedSeatDetails, setSelectedSeatDetails] = useState([])
  const [seatLockExpiresAt, setSeatLockExpiresAt] = useState({})
  const [currentTime, setCurrentTime] = useState(() => getCurrentTimestamp())
  const [autoQuantity, setAutoQuantity] = useState(2)
  const [isLoading, setIsLoading] = useState(true)
  const [isSeatLoading, setIsSeatLoading] = useState(false)
  const [isAssigning, setIsAssigning] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [isBooking, setIsBooking] = useState(false)
  const activeSection = event?.sections.find((section) => section.code === activeSectionCode)

  const seatsByRow = useMemo(() => {
    return sectionSeats.reduce((groups, seat) => {
      const row = seat.row || 'A'
      if (!groups[row]) groups[row] = []
      groups[row].push(seat)
      return groups
    }, {})
  }, [sectionSeats])

  async function refreshSeatStatuses(eventMongoId, sectionCode, page = 1) {
    setIsSeatLoading(true)
    try {
      const { data } = await api.get(`/events/${eventMongoId}/seats`, {
        params: { section: sectionCode, page, rows: 8 },
      })
      setSectionSeats(data.seats || [])
      setSeatRowPage(page)
      setSeatPagination(data.pagination || null)
      setLockedSeats(
        (data.seats || [])
          .filter((seat) => ['locked', 'booked', 'blocked'].includes(seat.status))
          .map((seat) => seat.number),
      )
    } finally {
      setIsSeatLoading(false)
    }
  }

  async function releaseCurrentSelection() {
    if (!event?.mongoId || !selectedSeats.length || !isAuthenticated) return

    await Promise.allSettled(
      selectedSeats.map((seatNumber) =>
        api.post('/bookings/release-seat', {
          eventId: event.mongoId,
          seatNumber,
        }),
      ),
    )
  }

  function clearSelectionState() {
    setSelectedSeats([])
    setSelectedSeatDetails([])
    setSeatLockExpiresAt({})
  }

  useEffect(() => {
    async function loadEvent() {
      setIsLoading(true)
      setLoadError('')

      try {
        const { data } = await api.get(`/events/${eventId}`)
        const normalized = normalizeEvent(data.event)
        const initialSection = normalized.sections[0]
        setEvent(normalized)
        setActiveSectionCode(initialSection?.code || '')
        clearSelectionState()

        if (initialSection) {
          await refreshSeatStatuses(data.event._id, initialSection.code)
        }
      } catch (error) {
        setEvent(null)
        setSectionSeats([])
        setLockedSeats([])
        clearSelectionState()
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

      if (!expiredSeats.length) return

      setSelectedSeats((current) => current.filter((seat) => !expiredSeats.includes(seat)))
      setSelectedSeatDetails((current) => current.filter((seat) => !expiredSeats.includes(seat.number)))
      setSeatLockExpiresAt((current) => {
        const next = { ...current }
        expiredSeats.forEach((seat) => delete next[seat])
        return next
      })

      toast.error('Seat hold expired')
      if (event?.mongoId && activeSectionCode) {
        refreshSeatStatuses(event.mongoId, activeSectionCode, seatRowPage).catch(() => null)
      }
    }, 1000)

    return () => window.clearInterval(timer)
  }, [activeSectionCode, event?.mongoId, seatLockExpiresAt, seatRowPage, selectedSeats])

  async function chooseSection(sectionCode) {
    if (!event || sectionCode === activeSectionCode) return

    await releaseCurrentSelection()
    clearSelectionState()
    setActiveSectionCode(sectionCode)
    setAutoQuantity(2)
    setSeatRowPage(1)

    try {
      await refreshSeatStatuses(event.mongoId, sectionCode)
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    }
  }

  async function changeSeatRowPage(page) {
    if (!event || !activeSectionCode || page === seatRowPage) return

    try {
      await refreshSeatStatuses(event.mongoId, activeSectionCode, page)
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    }
  }

  async function toggleSeat(seat) {
    if (!event) return

    if (!isAuthenticated) {
      toast.error('Login to reserve seats')
      navigate('/login')
      return
    }

    const isSelected = selectedSeats.includes(seat.number)
    const isUnavailable = lockedSeats.includes(seat.number) && !isSelected
    if (isUnavailable) return

    try {
      if (isSelected) {
        await api.post('/bookings/release-seat', {
          eventId: event.mongoId,
          seatNumber: seat.number,
        })
        setSelectedSeats((current) => current.filter((item) => item !== seat.number))
        setSelectedSeatDetails((current) => current.filter((item) => item.number !== seat.number))
        setSeatLockExpiresAt((current) => {
          const next = { ...current }
          delete next[seat.number]
          return next
        })
      } else {
        const { data } = await api.post('/bookings/lock-seat', {
          eventId: event.mongoId,
          seatNumber: seat.number,
        })
        const expiresInSeconds = data.lock?.expiresInSeconds || 600
        const lockedUntil = getCurrentTimestamp() + expiresInSeconds * 1000
        setSelectedSeats((current) => [...current, seat.number])
        setSelectedSeatDetails((current) => [...current, seat])
        setSeatLockExpiresAt((current) => ({ ...current, [seat.number]: lockedUntil }))
        setCurrentTime(getCurrentTimestamp())
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    }
  }

  async function assignBestSeats() {
    if (!event || !activeSection) return

    if (!isAuthenticated) {
      toast.error('Login to reserve seats')
      navigate('/login')
      return
    }

    setIsAssigning(true)
    try {
      await releaseCurrentSelection()
      clearSelectionState()

      const { data } = await api.post('/bookings/auto-assign', {
        eventId: event.mongoId,
        sectionCode: activeSection.code,
        quantity: autoQuantity,
      })
      const seats = data.seats || []
      const expiresInSeconds = data.lock?.expiresInSeconds || 600
      const lockedUntil = getCurrentTimestamp() + expiresInSeconds * 1000
      setSelectedSeats(seats.map((seat) => seat.number))
      setSelectedSeatDetails(seats)
      setSeatLockExpiresAt(Object.fromEntries(seats.map((seat) => [seat.number, lockedUntil])))
      setCurrentTime(getCurrentTimestamp())
      toast.success(`Assigned ${seats.map((seat) => seat.number).join(', ')}`)
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    } finally {
      setIsAssigning(false)
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
      const bookingPayload = { eventId: event.mongoId, seatNumbers: selectedSeats }
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
          prefill: { name: data.user?.name || '', email: data.user?.email || '' },
          theme: { color: '#e11d48' },
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
          modal: { ondismiss: () => reject(new Error('Payment cancelled')) },
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

  const subtotal = selectedSeatDetails.reduce((total, seat) => total + Number(seat.price || 0), 0)
  const fees = selectedSeats.length ? 99 : 0
  const nextLockExpiry = Math.min(
    ...selectedSeats.map((seat) => seatLockExpiresAt[seat]).filter(Number.isFinite),
  )
  const holdSecondsRemaining = Number.isFinite(nextLockExpiry)
    ? Math.max(0, Math.ceil((nextLockExpiry - currentTime) / 1000))
    : 0

  if (isLoading) {
    return <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"><LoadingPanel label="Loading event..." /></main>
  }

  if (!event) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <EmptyState icon={CalendarDays} title="Event unavailable" message={loadError || 'This event is not published or no longer exists.'} actionLabel="Browse events" actionTo="/events" />
      </main>
    )
  }

  return (
    <main className={selectedSeats.length ? 'pb-28 lg:pb-0' : ''}>
      <section className="bg-slate-950 text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <div className="overflow-hidden rounded border border-white/10"><EventPoster event={event} className="h-[420px] w-full" /></div>
          <div className="flex flex-col justify-center">
            <Badge variant="secondary" className="mb-4 w-fit bg-white px-3 py-1 text-sm font-semibold text-black">{event.category}</Badge>
            <h1 className="text-4xl font-semibold tracking-normal sm:text-5xl">{event.title}</h1>
            <EventMeta event={event} light />
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <InfoBox label="Starts from" value={formatINR(event.priceFrom)} />
              <InfoBox label="Demand" value={`${event.sold}% sold`} />
              <InfoBox label="Available" value={`${event.availableSeats.toLocaleString('en-IN')} seats`} />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_360px] lg:px-8">
        <div className="grid gap-5">
          <div className="rounded-lg border border-border bg-card p-5">
            <h2 className="text-xl font-semibold">Choose a section</h2>
            <p className="mt-1 text-sm text-muted-foreground">Select where you would like to sit before choosing or receiving seats.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {event.sections.map((section) => {
                const isActive = section.code === activeSectionCode
                return (
                  <button
                    key={section.code}
                    type="button"
                    onClick={() => chooseSection(section.code)}
                    className={`rounded-lg border p-4 text-left transition ${isActive ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'border-border bg-background hover:bg-muted'}`}
                  >
                    <span className="flex items-start justify-between gap-3">
                      <span>
                        <span className="block font-semibold text-foreground">{section.name}</span>
                        <span className="mt-1 block text-xs font-medium text-muted-foreground">
                          {section.selectionMode === 'auto_assign' ? 'Best adjacent seats assigned' : 'Choose exact seats'}
                        </span>
                      </span>
                      <Badge variant="secondary" className="h-auto shrink-0 px-2 py-1 text-xs font-semibold">{section.code}</Badge>
                    </span>
                    <span className="mt-4 flex items-center justify-between text-sm">
                      <span className="font-semibold text-primary">{formatINR(section.price)}</span>
                      <span className="text-muted-foreground">{section.availableSeats.toLocaleString('en-IN')} left</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-5">
            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold">{activeSection?.name || 'Select seats'}</h2>
                <p className="text-sm text-muted-foreground">
                  {selectedSeats.length ? `Your hold expires in ${formatDuration(holdSecondsRemaining)}.` : activeSection?.selectionMode === 'auto_assign' ? 'Choose ticket quantity and we will keep your group together.' : 'Pick your preferred seats to continue.'}
                </p>
              </div>
              {selectedSeats.length > 0 && (
                <span className="inline-flex w-fit items-center gap-2 rounded bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700"><Clock3 size={16} /> {formatDuration(holdSecondsRemaining)}</span>
              )}
            </div>

            {activeSection?.selectionMode === 'auto_assign' ? (
              <div className="rounded-lg border border-border bg-muted/20 p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                  <label className="grid gap-2 text-sm font-semibold text-foreground">
                    Number of tickets
                    <select value={autoQuantity} onChange={(event) => setAutoQuantity(Number(event.target.value))} className="h-11 min-w-40 rounded-lg border border-input bg-background px-3">
                      {Array.from({ length: Math.min(10, Math.max(activeSection.availableSeats, 1)) }, (_, index) => index + 1).map((quantity) => <option key={quantity} value={quantity}>{quantity}</option>)}
                    </select>
                  </label>
                  <Button type="button" onClick={assignBestSeats} disabled={isAssigning || activeSection.availableSeats < 1} className="px-4 py-3 text-sm font-semibold">
                    {isAssigning ? 'Finding seats...' : selectedSeats.length ? 'Assign different seats' : 'Find best seats'}
                  </Button>
                </div>
                {selectedSeats.length > 0 && (
                  <div className="mt-5 border-t border-border pt-4">
                    <p className="text-sm font-semibold text-foreground">Seats held for you</p>
                    <div className="mt-2 flex flex-wrap gap-2">{selectedSeats.map((seat) => <Badge key={seat} className="h-auto px-3 py-1.5 text-sm font-semibold">{seat}</Badge>)}</div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="mb-5 rounded-lg bg-muted py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">Stage</div>
                <SeatLegend />
                {isSeatLoading ? (
                  <LoadingPanel label="Loading section seats..." />
                ) : sectionSeats.length ? (
                  <div className="mt-4">
                    <div className="grid gap-3 overflow-x-auto pb-2">
                      {Object.entries(seatsByRow).map(([row, seats]) => (
                        <div key={row} className="flex min-w-max items-center gap-3">
                          <span className="w-7 shrink-0 text-center text-xs font-semibold text-muted-foreground">{row}</span>
                          <div className="grid grid-flow-col auto-cols-[2.75rem] gap-2">
                            {seats.map((seat) => {
                              const isSelected = selectedSeats.includes(seat.number)
                              const isUnavailable = lockedSeats.includes(seat.number) && !isSelected
                              return (
                                <button key={seat.number} type="button" onClick={() => toggleSeat(seat)} disabled={isUnavailable} title={isUnavailable ? 'Unavailable seat' : isSelected ? 'Your selected seat' : 'Available seat'} className={`h-11 rounded text-xs font-semibold transition ${isUnavailable ? 'cursor-not-allowed bg-muted text-muted-foreground/60' : isSelected ? 'bg-primary text-primary-foreground' : 'bg-background text-foreground ring-1 ring-border hover:bg-muted'}`}>
                                  {seat.position}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                    {seatPagination?.pages > 1 && (
                      <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-4">
                        <Button type="button" variant="outline" disabled={seatRowPage <= 1 || isSeatLoading} onClick={() => changeSeatRowPage(seatRowPage - 1)} className="px-3 py-2 text-sm font-semibold">Previous rows</Button>
                        <span className="text-sm font-medium text-muted-foreground">Rows page {seatRowPage} of {seatPagination.pages}</span>
                        <Button type="button" variant="outline" disabled={seatRowPage >= seatPagination.pages || isSeatLoading} onClick={() => changeSeatRowPage(seatRowPage + 1)} className="px-3 py-2 text-sm font-semibold">Next rows</Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm font-semibold text-muted-foreground">No seats are configured for this section.</div>
                )}
              </>
            )}
          </div>
        </div>

        <aside className="h-fit rounded-lg border border-border bg-card p-5 lg:sticky lg:top-24">
          <h2 className="text-xl font-semibold">Booking summary</h2>
          <div className="mt-4 space-y-3 text-sm">
            <SummaryRow label="Section" value={activeSection?.name || 'None'} />
            <SummaryRow label="Tickets" value={`${selectedSeats.length} selected`} />
            <SummaryRow label="Seats" value={selectedSeats.join(', ') || 'None'} />
            {selectedSeats.length > 0 && <SummaryRow label="Hold" value={`${formatDuration(holdSecondsRemaining)} remaining`} />}
            <SummaryRow label="Price" value={formatINR(subtotal)} />
            <SummaryRow label="Fees" value={formatINR(fees)} />
          </div>
          <div className="mt-5 border-t border-border pt-4"><SummaryRow label="Total" value={formatINR(subtotal + fees)} strong /></div>
          <Button type="button" disabled={!selectedSeats.length || isBooking} onClick={confirmBooking} className="mt-5 w-full px-4 py-3 text-sm font-semibold">
            <CreditCard size={18} /> {isBooking ? 'Opening payment...' : 'Pay and confirm'}
          </Button>
        </aside>
      </section>

      {selectedSeats.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background p-4 shadow-2xl lg:hidden">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{selectedSeats.length} {selectedSeats.length === 1 ? 'seat' : 'seats'} in {activeSection?.name}</p>
              <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-amber-700"><Clock3 size={14} /> {formatDuration(holdSecondsRemaining)} remaining</p>
            </div>
            <Button type="button" disabled={isBooking} onClick={confirmBooking} className="shrink-0 px-4 py-3 text-sm font-semibold"><CreditCard size={17} /> {isBooking ? 'Paying...' : formatINR(subtotal + fees)}</Button>
          </div>
        </div>
      )}
    </main>
  )
}
