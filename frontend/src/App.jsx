import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, NavLink, Route, Routes, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast, { Toaster } from 'react-hot-toast'
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  Edit3,
  Filter,
  Heart,
  ListChecks,
  MapPin,
  Menu,
  Plus,
  Search,
  Ticket,
  User,
  Users,
  X,
} from 'lucide-react'
import { format } from 'date-fns'
import { useAuth } from './context/useAuth'
import api from './services/api'
import { getApiErrorMessage } from './services/api'

const categories = ['All', 'Music', 'Comedy', 'Business', 'Sports', 'Food']

function getCategoryPath(category) {
  return category === 'All' ? '/events' : `/events?category=${encodeURIComponent(category)}`
}

function getCategoryFromSearchParams(searchParams) {
  const category = searchParams.get('category')
  return categories.includes(category) ? category : 'All'
}

const eventFormDefaults = {
  title: '',
  description: '',
  category: 'Music',
  venueName: '',
  address: '',
  city: '',
  startsAt: '',
  priceFrom: '',
  totalSeats: '',
  status: 'draft',
  posterFile: null,
}

const authFormDefaults = {
  name: '',
  email: '',
  password: '',
}

function normalizeEvent(event) {
  if (event.date) {
    return event
  }

  const startsAt = event.startsAt ? new Date(event.startsAt) : new Date()
  const totalSeats = event.totalSeats || 1
  const availableSeats = event.availableSeats ?? totalSeats
  const sold = Math.max(0, Math.min(100, Math.round(((totalSeats - availableSeats) / totalSeats) * 100)))

  return {
    id: event.slug || event._id,
    mongoId: event._id,
    title: event.title,
    description: event.description,
    category: event.category,
    city: event.venue?.city || 'Online',
    venue: event.venue?.name || 'Venue to be announced',
    address: event.venue?.address,
    date: startsAt,
    time: format(startsAt, 'h:mm a'),
    priceFrom: Number(event.priceFrom || 0),
    sold,
    image: event.poster?.url || '',
    seats: event.seats || [],
    totalSeats,
    availableSeats,
    status: event.status,
    raw: event,
  }
}

function formatINR(value) {
  return `INR ${Number(value || 0).toLocaleString('en-IN')}`
}

function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <Toaster position="top-right" toastOptions={{ duration: 2400 }} />
      <Shell>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/events" element={<EventsPage />} />
          <Route path="/events/:eventId" element={<EventDetailPage />} />
          <Route path="/bookings" element={<BookingsPage />} />
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
          <Route path="/login" element={<ConnectedAuthPage mode="login" />} />
          <Route path="/register" element={<ConnectedAuthPage mode="register" />} />
        </Routes>
      </Shell>
    </div>
  )
}

function AdminRoute({ children }) {
  const { isAuthenticated, isBootstrapping, user } = useAuth()

  if (isBootstrapping) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <p className="text-sm font-semibold text-slate-500">Checking access...</p>
      </main>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (user?.role !== 'admin') {
    return <Navigate to="/events" replace />
  }

  return children
}

function Shell({ children }) {
  const [open, setOpen] = useState(false)
  const { isAuthenticated, logout, user } = useAuth()

  const links = [
    { to: '/events', label: 'Events' },
    { to: '/bookings', label: 'My bookings' },
    user?.role === 'admin' ? { to: '/admin', label: 'Admin' } : null,
  ].filter(Boolean)

  async function handleLogout() {
    try {
      await logout()
      toast.success('Logged out successfully')
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    }
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2 text-lg font-semibold tracking-normal">
            <span className="grid h-9 w-9 place-items-center rounded bg-rose-600 text-white">
              <Ticket size={20} />
            </span>
            Ticketo
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `rounded px-3 py-2 text-sm font-semibold transition ${
                    isActive ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            {isAuthenticated ? (
              <>
                <span className="max-w-40 truncate text-sm font-medium text-slate-600">{user?.name}</span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-400"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="rounded border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-400"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="rounded bg-rose-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-rose-700"
                >
                  Register
                </Link>
              </>
            )}
          </div>

          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded border border-slate-300 md:hidden"
            onClick={() => setOpen((value) => !value)}
            aria-label="Toggle navigation"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {open && (
          <div className="border-t border-slate-200 bg-white px-4 py-3 md:hidden">
            <div className="grid gap-2">
              {links.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  onClick={() => setOpen(false)}
                  className="rounded px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  {link.label}
                </NavLink>
              ))}
              {isAuthenticated ? (
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false)
                    handleLogout()
                  }}
                  className="rounded px-3 py-2 text-left text-sm font-semibold"
                >
                  Logout
                </button>
              ) : (
                <Link to="/login" onClick={() => setOpen(false)} className="rounded px-3 py-2 text-sm font-semibold">
                  Login
                </Link>
              )}
            </div>
          </div>
        )}
      </header>
      {children}
    </>
  )
}

function HomePage() {
  const [featuredEvents, setFeaturedEvents] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const featuredEvent = featuredEvents[0]

  useEffect(() => {
    async function loadFeaturedEvents() {
      setIsLoading(true)

      try {
        const { data } = await api.get('/events', { params: { limit: 4 } })
        setFeaturedEvents(data.events ? data.events.map(normalizeEvent) : [])
      } catch {
        setFeaturedEvents([])
      } finally {
        setIsLoading(false)
      }
    }

    loadFeaturedEvents()
  }, [])

  return (
    <main>
      <section className="bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-10">
          <div className="flex flex-col justify-center gap-6">
            <div>
              <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-normal text-slate-950 sm:text-5xl lg:text-6xl">
                Discover events, reserve seats, and book tickets faster.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                Concerts, comedy, sports, food festivals, and business sessions curated into one fast booking flow.
              </p>
            </div>
            <SearchPanel />
            <CategoryStrip />
          </div>

          <div className="relative min-h-[420px] overflow-hidden rounded border border-slate-200 bg-slate-950">
            {featuredEvent ? (
              <>
                <EventPoster event={featuredEvent} className="h-full min-h-[420px] w-full opacity-80" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-5 text-white sm:p-7">
                  <div className="mb-4 flex flex-wrap gap-2">
                    <span className="rounded bg-white px-3 py-1 text-xs font-semibold text-slate-950">Featured</span>
                    <span className="rounded bg-emerald-400 px-3 py-1 text-xs font-semibold text-emerald-950">
                      {featuredEvent.sold}% sold
                    </span>
                  </div>
                  <h2 className="text-2xl font-semibold sm:text-3xl">{featuredEvent.title}</h2>
                  <EventMeta event={featuredEvent} light />
                  <Link
                    to={`/events/${featuredEvent.id}`}
                    className="mt-5 inline-flex items-center gap-2 rounded bg-white px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-slate-100"
                  >
                    <Ticket size={18} /> Book now
                  </Link>
                </div>
              </>
            ) : (
              <div className="flex min-h-[420px] flex-col justify-end p-6 text-white sm:p-8">
                <div className="mb-6 grid h-14 w-14 place-items-center rounded bg-white text-slate-950">
                  <Ticket size={28} />
                </div>
                <p className="text-sm font-semibold uppercase tracking-wide text-white/60">
                  {isLoading ? 'Loading events' : 'No published events'}
                </p>
                <h2 className="mt-2 max-w-md text-3xl font-semibold">
                  {isLoading ? 'Finding available events...' : 'Publish an event to feature it here.'}
                </h2>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <SectionHeader title="Trending events" action="View all" to="/events" />
        {isLoading ? (
          <LoadingPanel label="Loading events..." />
        ) : featuredEvents.length ? (
          <EventGrid items={featuredEvents.slice(0, 4)} />
        ) : (
          <EmptyState
            icon={CalendarDays}
            title="No published events yet"
            message="Create and publish an event from the admin area to start showing live inventory here."
            actionLabel="Manage events"
            actionTo="/admin/events"
          />
        )}
      </section>
    </main>
  )
}

function EventsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [city, setCity] = useState('All cities')
  const [remoteEvents, setRemoteEvents] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const category = getCategoryFromSearchParams(searchParams)
  const cityOptions = ['All cities', ...new Set(remoteEvents.map((event) => event.city))]

  const filteredEvents = useMemo(() => {
    return remoteEvents.filter((event) => {
      const searchText = [
        event.title,
        event.category,
        event.city,
        event.venue,
        event.description,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      const matchesQuery = !query || searchText.includes(query.toLowerCase())
      const matchesCategory = category === 'All' || event.category === category
      const matchesCity = city === 'All cities' || event.city === city
      return matchesQuery && matchesCategory && matchesCity
    })
  }, [category, city, query, remoteEvents])

  function handleCategoryChange(value) {
    const nextParams = new URLSearchParams(searchParams)

    if (value === 'All') {
      nextParams.delete('category')
    } else {
      nextParams.set('category', value)
    }

    setSearchParams(nextParams)
  }

  useEffect(() => {
    async function loadEvents() {
      setIsLoading(true)

      try {
        const { data } = await api.get('/events', {
          params: {
            search: query || undefined,
            category: category === 'All' ? undefined : category,
            city: city === 'All cities' ? undefined : city,
          },
        })
        setRemoteEvents(data.events ? data.events.map(normalizeEvent) : [])
      } catch (error) {
        toast.error(getApiErrorMessage(error))
        setRemoteEvents([])
      } finally {
        setIsLoading(false)
      }
    }

    loadEvents()
  }, [category, city, query])

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-rose-600">Explore</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal text-slate-950">Browse events</h1>
        </div>
        <div className="flex flex-wrap gap-3">
          <FieldIcon icon={Search}>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search events"
              className="w-full bg-transparent outline-none"
            />
          </FieldIcon>
          <Select value={category} onChange={(event) => handleCategoryChange(event.target.value)} options={categories} />
          <Select
            value={city}
            onChange={(event) => setCity(event.target.value)}
            options={cityOptions}
          />
        </div>
      </div>
      <div className="mb-5 flex items-center gap-2 text-sm font-semibold text-slate-500">
        <Filter size={16} /> {isLoading ? 'Loading events...' : `${filteredEvents.length} events available`}
      </div>
      {isLoading ? (
        <LoadingPanel label="Loading events..." />
      ) : filteredEvents.length ? (
        <EventGrid items={filteredEvents} />
      ) : (
        <EmptyState
          icon={Search}
          title="No events found"
          message="Adjust the filters or publish an event from the admin area."
          actionLabel="Clear search"
          onAction={() => {
            setQuery('')
            setSearchParams({})
            setCity('All cities')
          }}
        />
      )}
    </main>
  )
}

function EventDetailPage() {
  const { eventId } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const [event, setEvent] = useState(null)
  const [lockedSeats, setLockedSeats] = useState([])
  const [selectedSeats, setSelectedSeats] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [isBooking, setIsBooking] = useState(false)
  const seatLabels = event?.seats?.map((seat) => seat.number) || []

  useEffect(() => {
    async function loadEvent() {
      setIsLoading(true)
      setLoadError('')

      try {
        const { data } = await api.get(`/events/${eventId}`)
        const normalized = normalizeEvent(data.event)
        setEvent(normalized)

        const seatsResponse = await api.get(`/events/${data.event._id}/seats`)
        setLockedSeats(
          seatsResponse.data.seats
            .filter((seat) => seat.status === 'locked' || seat.status === 'booked' || seat.status === 'blocked')
            .map((seat) => seat.number),
        )
        setSelectedSeats([])
      } catch (error) {
        setEvent(null)
        setSelectedSeats([])
        setLockedSeats([])
        setLoadError(getApiErrorMessage(error))
      } finally {
        setIsLoading(false)
      }
    }

    loadEvent()
  }, [eventId])

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
      } else {
        await api.post('/bookings/lock-seat', {
          eventId: event.mongoId,
          seatNumber: seat,
        })
        setSelectedSeats((current) => [...current, seat])
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
      await api.post('/bookings', {
        eventId: event.mongoId,
        seatNumbers: selectedSeats,
      })
      toast.success('Booking confirmed')
      navigate('/bookings')
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
    <main>
      <section className="bg-slate-950 text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <div className="overflow-hidden rounded border border-white/10">
            <EventPoster event={event} className="h-[420px] w-full" />
          </div>
          <div className="flex flex-col justify-center">
            <span className="mb-4 w-fit rounded bg-white px-3 py-1 text-sm font-semibold text-slate-950">{event.category}</span>
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
        <div className="rounded border border-slate-200 bg-white p-5">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Select seats</h2>
              <p className="text-sm text-slate-500">Selected seats are temporarily held for 10 minutes.</p>
            </div>
            <span className="inline-flex w-fit items-center gap-2 rounded bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700">
              <Clock3 size={16} /> Temporary hold
            </span>
          </div>
          <div className="mb-5 rounded bg-slate-100 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
            Stage
          </div>
          {seatLabels.length ? (
            <div className="grid grid-cols-6 gap-2">
              {seatLabels.map((seat) => {
                const isLocked = lockedSeats.includes(seat)
                const isSelected = selectedSeats.includes(seat)
                return (
                  <button
                    key={seat}
                    type="button"
                    onClick={() => toggleSeat(seat)}
                    disabled={isLocked}
                    className={`h-11 rounded text-sm font-semibold transition ${
                      isLocked
                        ? 'cursor-not-allowed bg-slate-200 text-slate-400'
                        : isSelected
                          ? 'bg-rose-600 text-white'
                          : 'bg-slate-50 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {seat}
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="rounded border border-dashed border-slate-300 p-6 text-center text-sm font-semibold text-slate-500">
              No seats are configured for this event.
            </div>
          )}
        </div>

        <aside className="h-fit rounded border border-slate-200 bg-white p-5">
          <h2 className="text-xl font-semibold">Booking summary</h2>
          <div className="mt-4 space-y-3 text-sm">
            <SummaryRow label="Tickets" value={`${selectedSeats.length} selected`} />
            <SummaryRow label="Seats" value={selectedSeats.join(', ') || 'None'} />
            <SummaryRow label="Price" value={`INR ${subtotal.toLocaleString('en-IN')}`} />
            <SummaryRow label="Fees" value={`INR ${fees}`} />
          </div>
          <div className="mt-5 border-t border-slate-200 pt-4">
            <SummaryRow
              label="Total"
              value={`INR ${(subtotal + fees).toLocaleString('en-IN')}`}
              strong
            />
          </div>
          <button
            type="button"
            disabled={!selectedSeats.length || isBooking}
            onClick={confirmBooking}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded bg-rose-600 px-4 py-3 text-sm font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            <CreditCard size={18} /> {isBooking ? 'Confirming...' : 'Confirm booking'}
          </button>
        </aside>
      </section>
    </main>
  )
}

function BookingsPage() {
  const [userBookings, setUserBookings] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
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

    loadBookings()
  }, [])

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
          return (
            <article key={booking._id || booking.id} className="grid gap-4 rounded border border-slate-200 bg-white p-4 md:grid-cols-[160px_1fr_auto]">
              <EventPoster event={event} className="h-36 w-full rounded md:h-full" />
              <div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">{booking.status}</span>
                  <span className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">{booking.bookingCode}</span>
                </div>
                <h2 className="mt-3 text-xl font-semibold">{event?.title || 'Event unavailable'}</h2>
                {event ? <EventMeta event={event} /> : <p className="mt-3 text-sm font-semibold text-slate-500">Event details are no longer available.</p>}
                <p className="mt-3 text-sm font-semibold text-slate-600">Seats: {seatNumbers.join(', ')}</p>
                {booking.amount && (
                  <p className="mt-1 text-sm font-semibold text-slate-600">
                    Total: {booking.amount.currency} {booking.amount.total.toLocaleString('en-IN')}
                  </p>
                )}
              </div>
              {booking.qrCode?.dataUrl ? (
                <img src={booking.qrCode.dataUrl} alt={`${booking.bookingCode} QR code`} className="h-28 w-28 self-center rounded ring-1 ring-slate-200" />
              ) : (
                <div className="grid h-28 w-28 place-items-center self-center rounded border border-dashed border-slate-300 bg-slate-50 p-3 text-center text-xs font-semibold text-slate-500">
                  QR unavailable
                </div>
              )}
            </article>
          )
        })}
      </div>
    </main>
  )
}

function AdminDashboardPage() {
  const [dashboard, setDashboard] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    async function loadDashboard() {
      setIsLoading(true)
      setLoadError('')

      try {
        const { data } = await api.get('/admin/dashboard')
        setDashboard(data)
      } catch (error) {
        const message = getApiErrorMessage(error)
        setLoadError(message)
        toast.error(message)
      } finally {
        setIsLoading(false)
      }
    }

    loadDashboard()
  }, [])

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
        <Link to="/admin/events" className="inline-flex w-fit items-center gap-2 rounded bg-slate-950 px-4 py-3 text-sm font-semibold text-white">
          <ListChecks size={18} /> Manage events
        </Link>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Revenue" value={stats ? formatINR(stats.revenue) : '-'} icon={BarChart3} />
        <Stat label="Bookings" value={stats ? stats.bookings.toLocaleString('en-IN') : '-'} icon={Ticket} />
        <Stat label="Active users" value={stats ? stats.activeUsers.toLocaleString('en-IN') : '-'} icon={Users} />
        <Stat label="Fill rate" value={stats ? `${stats.fillRate}%` : '-'} icon={CheckCircle2} />
      </div>
      {isLoading && <p className="mt-4 text-sm font-semibold text-slate-500">Loading dashboard analytics...</p>}
      <div className="mt-6">
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
      </div>
    </main>
  )
}

function ManageEventsPage() {
  const [remoteEvents, setRemoteEvents] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const {
    register: registerEventField,
    handleSubmit: handleEventSubmit,
    reset: resetEventForm,
    formState: { isSubmitting },
  } = useForm({ defaultValues: eventFormDefaults })

  async function loadEvents() {
    setIsLoading(true)
    setLoadError('')

    try {
      const { data } = await api.get('/events/admin/manage')
      setRemoteEvents(data.events)
    } catch (error) {
      const message = getApiErrorMessage(error)
      setLoadError(message)
      setRemoteEvents([])
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadEvents()
  }, [])

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

      await api.post('/events', {
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
        poster,
      })

      toast.success('Event created')
      setShowForm(false)
      resetEventForm(eventFormDefaults)
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

  async function deleteEvent(eventId) {
    if (!window.confirm('Delete this event?')) return

    try {
      await api.delete(`/events/${eventId}`)
      toast.success('Event deleted')
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
    sold: event.totalSeats ? Math.round(((event.totalSeats - event.availableSeats) / event.totalSeats) * 100) : 0,
  }))

  if (loadError) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <SectionTitle kicker="Admin" title="Manage events" />
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
        <SectionTitle kicker="Admin" title="Manage events" />
        <button
          type="button"
          onClick={() => setShowForm((value) => !value)}
          className="inline-flex w-fit items-center gap-2 rounded bg-rose-600 px-4 py-3 text-sm font-semibold text-white hover:bg-rose-700"
        >
          <Plus size={18} /> Create event
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleEventSubmit(submitEvent)} className="mb-6 rounded border border-slate-200 bg-white p-5">
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
              {isSubmitting ? 'Saving...' : 'Save event'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Event</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">City</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Sold</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {isLoading && (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center font-semibold text-slate-500">
                    Loading events...
                  </td>
                </tr>
              )}
              {!isLoading && rows.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center font-semibold text-slate-500">
                    No events found. Create your first event.
                  </td>
                </tr>
              )}
              {!isLoading && rows.map((event) => (
                <tr key={event.id}>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <EventPoster event={event} className="h-12 w-16 rounded" />
                      <div>
                        <p className="font-semibold">{event.title}</p>
                        <p className="text-xs text-slate-500">{event.category}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 font-semibold">{format(event.date, 'dd MMM yyyy')}</td>
                  <td className="px-4 py-4">{event.city}</td>
                  <td className="px-4 py-4">
                    <span className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{event.status}</span>
                  </td>
                  <td className="px-4 py-4">{event.sold}%</td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-2">
                      {event.status !== 'published' && (
                        <button
                          type="button"
                          onClick={() => updateEventStatus(event.id, 'publish')}
                          className="inline-flex items-center gap-2 rounded border border-slate-300 px-3 py-2 font-medium"
                        >
                          <Edit3 size={15} /> Publish
                        </button>
                      )}
                      {event.status !== 'cancelled' && (
                        <button
                          type="button"
                          onClick={() => updateEventStatus(event.id, 'cancel')}
                          className="rounded border border-slate-300 px-3 py-2 font-medium"
                        >
                          Cancel
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => deleteEvent(event.id)}
                        className="rounded border border-rose-200 px-3 py-2 font-medium text-rose-700"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  )
}

function ConnectedAuthPage({ mode }) {
  const navigate = useNavigate()
  const { login, register } = useAuth()
  const isRegister = mode === 'register'
  const {
    register: registerAuthField,
    handleSubmit: handleAuthSubmit,
    formState: { isSubmitting },
  } = useForm({ defaultValues: authFormDefaults })

  async function submitAuth(values) {
    try {
      if (isRegister) {
        await register(values)
        toast.success('Account created')
      } else {
        await login({
          email: values.email,
          password: values.password,
        })
        toast.success('Logged in successfully')
      }

      navigate('/events')
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    }
  }

  return (
    <main className="mx-auto grid min-h-[calc(100vh-8rem)] max-w-7xl place-items-center px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid w-full max-w-5xl overflow-hidden rounded border border-slate-200 bg-white md:grid-cols-[1fr_0.9fr]">
        <AuthVisual />
        <form onSubmit={handleAuthSubmit(submitAuth)} className="p-6 sm:p-8">
          <div className="mb-6">
            <span className="grid h-11 w-11 place-items-center rounded bg-rose-600 text-white">
              <User size={22} />
            </span>
            <h1 className="mt-4 text-3xl font-semibold">{isRegister ? 'Create account' : 'Welcome back'}</h1>
            <p className="mt-2 text-sm text-slate-500">
              {isRegister ? 'Start booking and managing tickets.' : 'Continue to your bookings and events.'}
            </p>
          </div>
          <div className="space-y-4">
            {isRegister && (
              <AuthInput
                label="Full name"
                registration={registerAuthField('name', { required: isRegister })}
              />
            )}
            <AuthInput
              label="Email"
              type="email"
              registration={registerAuthField('email', { required: true })}
            />
            <AuthInput
              label="Password"
              type="password"
              registration={registerAuthField('password', { required: true, minLength: isRegister ? 8 : 1 })}
              minLength={isRegister ? 8 : 1}
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-6 w-full rounded bg-slate-950 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isSubmitting ? 'Please wait...' : isRegister ? 'Register' : 'Login'}
          </button>
          <p className="mt-5 text-center text-sm text-slate-500">
            {isRegister ? 'Already registered?' : 'New to Ticketo?'}{' '}
            <Link className="font-semibold text-rose-600" to={isRegister ? '/login' : '/register'}>
              {isRegister ? 'Login' : 'Create account'}
            </Link>
          </p>
        </form>
      </div>
    </main>
  )
}

function SearchPanel() {
  return (
    <div className="grid gap-3 rounded border border-slate-200 bg-white p-3 shadow-sm md:grid-cols-[1fr_auto]">
      <FieldIcon icon={Search}>
        <input placeholder="Search events" className="w-full bg-transparent outline-none" />
      </FieldIcon>
      <Link to="/events" className="inline-flex items-center justify-center rounded bg-slate-950 px-5 py-3 text-sm font-semibold text-white">
        Search
      </Link>
    </div>
  )
}

function CategoryStrip() {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {categories.map((category, index) => (
        <Link
          key={category}
          to={getCategoryPath(category)}
          className={`shrink-0 rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
            index === 0
              ? 'border-slate-950 bg-slate-950 text-white'
              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950'
          }`}
        >
          {category}
        </Link>
      ))}
    </div>
  )
}

function EventGrid({ items }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  )
}

function EventCard({ event }) {
  return (
    <article className="overflow-hidden rounded border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md">
      <Link to={`/events/${event.id}`} className="block">
        <div className="relative h-48">
          <EventPoster event={event} className="h-full w-full" />
          <button
            type="button"
            onClick={(clickEvent) => {
              clickEvent.preventDefault()
              toast.success('Added to wishlist')
            }}
            className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded bg-white text-slate-700 shadow"
            aria-label="Save event"
          >
            <Heart size={18} />
          </button>
          <span className="absolute left-3 top-3 rounded bg-white px-2 py-1 text-xs font-semibold text-slate-950">{event.category}</span>
        </div>
        <div className="p-4">
          <h3 className="line-clamp-2 min-h-[3.5rem] text-lg font-semibold leading-7">{event.title}</h3>
          <EventMeta event={event} />
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              from <span className="font-semibold text-slate-950">INR {event.priceFrom.toLocaleString('en-IN')}</span>
            </p>
            <span className="rounded bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700">{event.sold}% sold</span>
          </div>
        </div>
      </Link>
    </article>
  )
}

function EventPoster({ event, className = '' }) {
  const title = event?.title || 'Event'
  const category = event?.category || 'Event'

  if (event?.image) {
    return <img src={event.image} alt={title} className={`${className} object-cover`} />
  }

  return (
    <div className={`${className} grid place-items-center bg-slate-900 p-4 text-center text-white`}>
      <div>
        <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded bg-white text-slate-950">
          <Ticket size={22} />
        </div>
        <p className="text-xs font-semibold uppercase tracking-wide text-white/60">{category}</p>
        <p className="mt-1 line-clamp-2 text-sm font-semibold">{title}</p>
      </div>
    </div>
  )
}

function EventMeta({ event, light = false }) {
  const tone = light ? 'text-white/85' : 'text-slate-500'
  return (
    <div className={`mt-3 grid gap-2 text-sm font-semibold ${tone}`}>
      <span className="inline-flex items-center gap-2">
        <CalendarDays size={16} /> {format(event.date, 'EEE, dd MMM')} · {event.time}
      </span>
      <span className="inline-flex items-center gap-2">
        <MapPin size={16} /> {event.venue}, {event.city}
      </span>
    </div>
  )
}

function EmptyState({ icon: Icon, title, message, actionLabel, actionTo, onAction }) {
  const actionClass = 'mt-5 inline-flex items-center justify-center rounded bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800'

  return (
    <div className="rounded border border-dashed border-slate-300 bg-white p-8 text-center">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded bg-slate-100 text-slate-700">
        <Icon size={22} />
      </span>
      <h2 className="mt-4 text-xl font-semibold text-slate-950">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{message}</p>
      {actionTo && (
        <Link to={actionTo} className={actionClass}>
          {actionLabel}
        </Link>
      )}
      {onAction && (
        <button type="button" onClick={onAction} className={actionClass}>
          {actionLabel}
        </button>
      )}
    </div>
  )
}

function LoadingPanel({ label }) {
  return (
    <div className="rounded border border-slate-200 bg-white p-6 text-center text-sm font-semibold text-slate-500">
      {label}
    </div>
  )
}

function AuthVisual() {
  return (
    <div className="hidden bg-slate-950 p-8 text-white md:flex md:flex-col md:justify-between">
      <div className="grid h-12 w-12 place-items-center rounded bg-white text-slate-950">
        <Ticket size={24} />
      </div>
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-white/55">Ticketo</p>
        <h2 className="mt-3 text-3xl font-semibold leading-tight">Manage access to bookings, events, and tickets.</h2>
      </div>
    </div>
  )
}

function SectionHeader({ title, action, to }) {
  return (
    <div className="mb-5 flex items-center justify-between gap-4">
      <h2 className="text-2xl font-semibold tracking-normal">{title}</h2>
      <Link to={to} className="text-sm font-semibold text-rose-600 hover:text-rose-700">
        {action}
      </Link>
    </div>
  )
}

function SectionTitle({ kicker, title }) {
  return (
    <div>
      <p className="text-sm font-semibold uppercase tracking-wide text-rose-600">{kicker}</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-normal">{title}</h1>
    </div>
  )
}

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="rounded border border-slate-200 bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <span className="grid h-10 w-10 place-items-center rounded bg-rose-50 text-rose-600">
          <Icon size={20} />
        </span>
      </div>
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  )
}

function InfoBox({ label, value }) {
  return (
    <div className="rounded border border-white/10 bg-white/10 p-4">
      <p className="text-sm font-medium text-white/65">{label}</p>
      <p className="mt-1 text-lg font-semibold text-white">{value}</p>
    </div>
  )
}

function SummaryRow({ label, value, strong = false }) {
  return (
    <div className={`flex items-center justify-between gap-4 ${strong ? 'text-lg font-semibold' : 'text-slate-600'}`}>
      <span>{label}</span>
      <span className={strong ? '' : 'font-semibold text-slate-950'}>{value}</span>
    </div>
  )
}

function FieldIcon({ icon: Icon, children }) {
  return (
    <label className="flex min-h-12 items-center gap-3 rounded border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-600">
      <Icon size={18} className="shrink-0 text-slate-400" />
      {children}
    </label>
  )
}

function Select({ value, onChange, options }) {
  return (
    <select value={value} onChange={onChange} className="min-h-12 rounded border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700">
      {options.map((option) => (
        <option key={option}>{option}</option>
      ))}
    </select>
  )
}

function AdminField({ label, type = 'text', registration, required = false, min }) {
  return (
    <label className="grid gap-2 text-sm font-medium text-slate-700">
      {label}
      <input
        {...registration}
        type={type}
        required={required}
        min={min}
        className="h-11 rounded border border-slate-200 bg-slate-50 px-3 outline-none focus:border-rose-500"
      />
    </label>
  )
}

function AuthInput({ label, type = 'text', placeholder, minLength, registration }) {
  return (
    <label className="grid gap-2 text-sm font-medium text-slate-700">
      {label}
      <input
        type={type}
        placeholder={placeholder}
        minLength={minLength}
        {...registration}
        required
        className="h-12 rounded border border-slate-200 bg-slate-50 px-3 text-slate-950 outline-none focus:border-rose-500"
      />
    </label>
  )
}

export default App
