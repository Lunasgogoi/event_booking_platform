import { useMemo, useState } from 'react'
import { Link, NavLink, Route, Routes, useNavigate, useParams } from 'react-router-dom'
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
  LockKeyhole,
  MapPin,
  Menu,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Ticket,
  User,
  Users,
  X,
} from 'lucide-react'
import { addDays, format } from 'date-fns'

const categories = ['All', 'Music', 'Comedy', 'Business', 'Sports', 'Food']

const events = [
  {
    id: 'neon-nights',
    title: 'Neon Nights Music Festival',
    category: 'Music',
    city: 'Mumbai',
    venue: 'Jio World Garden',
    date: addDays(new Date(), 9),
    time: '7:00 PM',
    priceFrom: 1499,
    sold: 84,
    rating: '4.8',
    image:
      'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80',
    accent: 'from-fuchsia-600 to-orange-500',
  },
  {
    id: 'founders-summit',
    title: 'Founders Growth Summit',
    category: 'Business',
    city: 'Bengaluru',
    venue: 'KTPO Convention Centre',
    date: addDays(new Date(), 14),
    time: '10:00 AM',
    priceFrom: 2499,
    sold: 62,
    rating: '4.7',
    image:
      'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80',
    accent: 'from-blue-600 to-cyan-500',
  },
  {
    id: 'laugh-lab',
    title: 'The Laugh Lab Live',
    category: 'Comedy',
    city: 'Delhi',
    venue: 'Siri Fort Auditorium',
    date: addDays(new Date(), 5),
    time: '8:30 PM',
    priceFrom: 799,
    sold: 91,
    rating: '4.9',
    image:
      'https://images.unsplash.com/photo-1527224857830-43a7acc85260?auto=format&fit=crop&w=1200&q=80',
    accent: 'from-amber-500 to-rose-500',
  },
  {
    id: 'street-food-fiesta',
    title: 'Street Food Fiesta',
    category: 'Food',
    city: 'Pune',
    venue: 'Amanora Arena',
    date: addDays(new Date(), 21),
    time: '4:00 PM',
    priceFrom: 399,
    sold: 48,
    rating: '4.6',
    image:
      'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=1200&q=80',
    accent: 'from-emerald-600 to-lime-500',
  },
  {
    id: 'city-cricket-league',
    title: 'City Cricket League Final',
    category: 'Sports',
    city: 'Ahmedabad',
    venue: 'Sardar Patel Stadium',
    date: addDays(new Date(), 17),
    time: '6:00 PM',
    priceFrom: 1199,
    sold: 73,
    rating: '4.7',
    image:
      'https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&w=1200&q=80',
    accent: 'from-green-700 to-sky-500',
  },
  {
    id: 'design-weekend',
    title: 'Design Weekend 2026',
    category: 'Business',
    city: 'Hyderabad',
    venue: 'HICC Novotel',
    date: addDays(new Date(), 28),
    time: '11:00 AM',
    priceFrom: 1899,
    sold: 56,
    rating: '4.8',
    image:
      'https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&w=1200&q=80',
    accent: 'from-violet-600 to-pink-500',
  },
]

const bookings = [
  { id: 'BK-24081', eventId: 'neon-nights', seats: ['A7', 'A8'], status: 'Confirmed' },
  { id: 'BK-24064', eventId: 'laugh-lab', seats: ['C3'], status: 'Confirmed' },
]

const adminEvents = events.map((event, index) => ({
  ...event,
  status: index % 3 === 0 ? 'Filling fast' : index % 3 === 1 ? 'Live' : 'Draft',
  revenue: (event.sold * event.priceFrom * 18).toLocaleString('en-IN'),
}))

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
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/admin/events" element={<ManageEventsPage />} />
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/register" element={<AuthPage mode="register" />} />
        </Routes>
      </Shell>
    </div>
  )
}

function Shell({ children }) {
  const [open, setOpen] = useState(false)

  const links = [
    { to: '/events', label: 'Events' },
    { to: '/bookings', label: 'My bookings' },
    { to: '/admin', label: 'Admin' },
  ]

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2 text-lg font-black tracking-normal">
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
            <Link
              to="/login"
              className="rounded border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:border-slate-400"
            >
              Login
            </Link>
            <Link
              to="/register"
              className="rounded bg-rose-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-rose-700"
            >
              Register
            </Link>
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
              <Link to="/login" onClick={() => setOpen(false)} className="rounded px-3 py-2 text-sm font-semibold">
                Login
              </Link>
            </div>
          </div>
        )}
      </header>
      {children}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-8 text-sm text-slate-500 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <p>Ticketo event booking platform UI prototype.</p>
          <p>Frontend dummy data only. Backend APIs are not connected yet.</p>
        </div>
      </footer>
    </>
  )
}

function HomePage() {
  return (
    <main>
      <section className="bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-10">
          <div className="flex flex-col justify-center gap-6">
            <div>
              <p className="mb-3 inline-flex items-center gap-2 rounded bg-rose-50 px-3 py-1 text-sm font-bold text-rose-700">
                <Sparkles size={16} /> Live in 18 Indian cities
              </p>
              <h1 className="max-w-3xl text-4xl font-black leading-tight tracking-normal text-slate-950 sm:text-5xl lg:text-6xl">
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
            <img
              src={events[0].image}
              alt={events[0].title}
              className="h-full min-h-[420px] w-full object-cover opacity-80"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-5 text-white sm:p-7">
              <div className="mb-4 flex flex-wrap gap-2">
                <span className="rounded bg-white px-3 py-1 text-xs font-black text-slate-950">Featured</span>
                <span className="rounded bg-emerald-400 px-3 py-1 text-xs font-black text-emerald-950">
                  {events[0].sold}% sold
                </span>
              </div>
              <h2 className="text-2xl font-black sm:text-3xl">{events[0].title}</h2>
              <EventMeta event={events[0]} light />
              <Link
                to={`/events/${events[0].id}`}
                className="mt-5 inline-flex items-center gap-2 rounded bg-white px-5 py-3 text-sm font-black text-slate-950 hover:bg-slate-100"
              >
                <Ticket size={18} /> Book now
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <SectionHeader title="Trending events" action="View all" to="/events" />
        <EventGrid items={events.slice(0, 4)} />
      </section>

      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-3 lg:px-8">
          <Metric icon={LockKeyhole} label="Temporary locks" value="Redis-ready seat holds" />
          <Metric icon={CreditCard} label="Booking flow" value="Checkout UI prepared" />
          <Metric icon={ShieldCheck} label="Admin controls" value="Role-based views planned" />
        </div>
      </section>
    </main>
  )
}

function EventsPage() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [city, setCity] = useState('All cities')

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const matchesQuery = event.title.toLowerCase().includes(query.toLowerCase())
      const matchesCategory = category === 'All' || event.category === category
      const matchesCity = city === 'All cities' || event.city === city
      return matchesQuery && matchesCategory && matchesCity
    })
  }, [category, city, query])

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-rose-600">Explore</p>
          <h1 className="mt-1 text-3xl font-black tracking-normal text-slate-950">Browse events</h1>
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
          <Select value={category} onChange={(event) => setCategory(event.target.value)} options={categories} />
          <Select
            value={city}
            onChange={(event) => setCity(event.target.value)}
            options={['All cities', ...new Set(events.map((event) => event.city))]}
          />
        </div>
      </div>
      <div className="mb-5 flex items-center gap-2 text-sm font-semibold text-slate-500">
        <Filter size={16} /> {filteredEvents.length} events available
      </div>
      <EventGrid items={filteredEvents} />
    </main>
  )
}

function EventDetailPage() {
  const { eventId } = useParams()
  const navigate = useNavigate()
  const event = events.find((item) => item.id === eventId) ?? events[0]
  const [selectedSeats, setSelectedSeats] = useState(['B4'])
  const seatLabels = Array.from({ length: 30 }, (_, index) => `${String.fromCharCode(65 + Math.floor(index / 6))}${(index % 6) + 1}`)
  const lockedSeats = ['A2', 'A3', 'C5', 'D1', 'E6']

  function toggleSeat(seat) {
    if (lockedSeats.includes(seat)) return
    setSelectedSeats((current) =>
      current.includes(seat) ? current.filter((item) => item !== seat) : [...current, seat],
    )
  }

  function confirmBooking() {
    toast.success('Dummy booking confirmed')
    navigate('/bookings')
  }

  return (
    <main>
      <section className="bg-slate-950 text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <div className="overflow-hidden rounded border border-white/10">
            <img src={event.image} alt={event.title} className="h-[420px] w-full object-cover" />
          </div>
          <div className="flex flex-col justify-center">
            <span className="mb-4 w-fit rounded bg-white px-3 py-1 text-sm font-black text-slate-950">{event.category}</span>
            <h1 className="text-4xl font-black tracking-normal sm:text-5xl">{event.title}</h1>
            <EventMeta event={event} light />
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <InfoBox label="Starts from" value={`INR ${event.priceFrom.toLocaleString('en-IN')}`} />
              <InfoBox label="Demand" value={`${event.sold}% sold`} />
              <InfoBox label="Rating" value={event.rating} />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_360px] lg:px-8">
        <div className="rounded border border-slate-200 bg-white p-5">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-black">Select seats</h2>
              <p className="text-sm text-slate-500">Selected seats are temporarily held for 10 minutes.</p>
            </div>
            <span className="inline-flex w-fit items-center gap-2 rounded bg-amber-50 px-3 py-2 text-sm font-bold text-amber-700">
              <Clock3 size={16} /> 09:42
            </span>
          </div>
          <div className="mb-5 rounded bg-slate-100 py-3 text-center text-xs font-black uppercase tracking-wide text-slate-500">
            Stage
          </div>
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
                  className={`h-11 rounded text-sm font-black transition ${
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
        </div>

        <aside className="h-fit rounded border border-slate-200 bg-white p-5">
          <h2 className="text-xl font-black">Booking summary</h2>
          <div className="mt-4 space-y-3 text-sm">
            <SummaryRow label="Tickets" value={`${selectedSeats.length} selected`} />
            <SummaryRow label="Seats" value={selectedSeats.join(', ') || 'None'} />
            <SummaryRow label="Price" value={`INR ${(selectedSeats.length * event.priceFrom).toLocaleString('en-IN')}`} />
            <SummaryRow label="Fees" value="INR 99" />
          </div>
          <div className="mt-5 border-t border-slate-200 pt-4">
            <SummaryRow
              label="Total"
              value={`INR ${(selectedSeats.length * event.priceFrom + (selectedSeats.length ? 99 : 0)).toLocaleString('en-IN')}`}
              strong
            />
          </div>
          <button
            type="button"
            disabled={!selectedSeats.length}
            onClick={confirmBooking}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded bg-rose-600 px-4 py-3 text-sm font-black text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            <CreditCard size={18} /> Confirm booking
          </button>
        </aside>
      </section>
    </main>
  )
}

function BookingsPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <SectionTitle kicker="Account" title="My bookings" />
      <div className="mt-6 grid gap-4">
        {bookings.map((booking) => {
          const event = events.find((item) => item.id === booking.eventId)
          return (
            <article key={booking.id} className="grid gap-4 rounded border border-slate-200 bg-white p-4 md:grid-cols-[160px_1fr_auto]">
              <img src={event.image} alt={event.title} className="h-36 w-full rounded object-cover md:h-full" />
              <div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded bg-emerald-50 px-2 py-1 text-xs font-black text-emerald-700">{booking.status}</span>
                  <span className="rounded bg-slate-100 px-2 py-1 text-xs font-black text-slate-600">{booking.id}</span>
                </div>
                <h2 className="mt-3 text-xl font-black">{event.title}</h2>
                <EventMeta event={event} />
                <p className="mt-3 text-sm font-semibold text-slate-600">Seats: {booking.seats.join(', ')}</p>
              </div>
              <div className="grid h-28 w-28 grid-cols-5 gap-1 self-center rounded bg-white p-2 shadow-inner ring-1 ring-slate-200">
                {Array.from({ length: 25 }, (_, index) => (
                  <span key={index} className={`rounded-sm ${index % 3 === 0 || index % 7 === 0 ? 'bg-slate-950' : 'bg-slate-200'}`} />
                ))}
              </div>
            </article>
          )
        })}
      </div>
    </main>
  )
}

function AdminDashboardPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SectionTitle kicker="Admin" title="Dashboard" />
        <Link to="/admin/events" className="inline-flex w-fit items-center gap-2 rounded bg-slate-950 px-4 py-3 text-sm font-black text-white">
          <ListChecks size={18} /> Manage events
        </Link>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Revenue" value="INR 38.4L" icon={BarChart3} />
        <Stat label="Bookings" value="12,486" icon={Ticket} />
        <Stat label="Active users" value="8,920" icon={Users} />
        <Stat label="Fill rate" value="74%" icon={CheckCircle2} />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="rounded border border-slate-200 bg-white p-5">
          <h2 className="text-xl font-black">Event performance</h2>
          <div className="mt-5 space-y-4">
            {adminEvents.slice(0, 5).map((event) => (
              <div key={event.id} className="grid gap-3 sm:grid-cols-[1fr_140px_110px] sm:items-center">
                <div>
                  <p className="font-black">{event.title}</p>
                  <p className="text-sm text-slate-500">{event.city} · {event.category}</p>
                </div>
                <div className="h-2 rounded bg-slate-100">
                  <div className={`h-2 rounded bg-gradient-to-r ${event.accent}`} style={{ width: `${event.sold}%` }} />
                </div>
                <p className="text-sm font-black text-slate-700">INR {event.revenue}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded border border-slate-200 bg-white p-5">
          <h2 className="text-xl font-black">Operational status</h2>
          <div className="mt-5 space-y-3">
            <StatusLine label="Auth endpoints" status="Planned" />
            <StatusLine label="Seat locking" status="Redis planned" />
            <StatusLine label="QR tickets" status="Planned" />
            <StatusLine label="Poster uploads" status="Later" />
          </div>
        </div>
      </div>
    </main>
  )
}

function ManageEventsPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SectionTitle kicker="Admin" title="Manage events" />
        <button
          type="button"
          onClick={() => toast.success('Create event modal will be connected later')}
          className="inline-flex w-fit items-center gap-2 rounded bg-rose-600 px-4 py-3 text-sm font-black text-white hover:bg-rose-700"
        >
          <Plus size={18} /> Create event
        </button>
      </div>
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
              {adminEvents.map((event) => (
                <tr key={event.id}>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <img src={event.image} alt={event.title} className="h-12 w-16 rounded object-cover" />
                      <div>
                        <p className="font-black">{event.title}</p>
                        <p className="text-xs text-slate-500">{event.category}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 font-semibold">{format(event.date, 'dd MMM yyyy')}</td>
                  <td className="px-4 py-4">{event.city}</td>
                  <td className="px-4 py-4">
                    <span className="rounded bg-slate-100 px-2 py-1 text-xs font-black text-slate-700">{event.status}</span>
                  </td>
                  <td className="px-4 py-4">{event.sold}%</td>
                  <td className="px-4 py-4">
                    <button type="button" className="inline-flex items-center gap-2 rounded border border-slate-300 px-3 py-2 font-bold">
                      <Edit3 size={15} /> Edit
                    </button>
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

function AuthPage({ mode }) {
  const navigate = useNavigate()
  const isRegister = mode === 'register'

  function submitAuth(event) {
    event.preventDefault()
    toast.success(isRegister ? 'Dummy account created' : 'Dummy login successful')
    navigate('/events')
  }

  return (
    <main className="mx-auto grid min-h-[calc(100vh-8rem)] max-w-7xl place-items-center px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid w-full max-w-5xl overflow-hidden rounded border border-slate-200 bg-white md:grid-cols-[1fr_0.9fr]">
        <div className="hidden bg-slate-950 md:block">
          <img src={events[1].image} alt="Event audience" className="h-full w-full object-cover opacity-80" />
        </div>
        <form onSubmit={submitAuth} className="p-6 sm:p-8">
          <div className="mb-6">
            <span className="grid h-11 w-11 place-items-center rounded bg-rose-600 text-white">
              <User size={22} />
            </span>
            <h1 className="mt-4 text-3xl font-black">{isRegister ? 'Create account' : 'Welcome back'}</h1>
            <p className="mt-2 text-sm text-slate-500">
              {isRegister ? 'Start booking and managing tickets.' : 'Continue to your bookings and events.'}
            </p>
          </div>
          <div className="space-y-4">
            {isRegister && <AuthInput label="Full name" placeholder="Aarav Sharma" />}
            <AuthInput label="Email" placeholder="you@example.com" type="email" />
            <AuthInput label="Password" placeholder="••••••••" type="password" />
          </div>
          <button type="submit" className="mt-6 w-full rounded bg-slate-950 px-4 py-3 text-sm font-black text-white">
            {isRegister ? 'Register' : 'Login'}
          </button>
          <p className="mt-5 text-center text-sm text-slate-500">
            {isRegister ? 'Already registered?' : 'New to Ticketo?'}{' '}
            <Link className="font-black text-rose-600" to={isRegister ? '/login' : '/register'}>
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
    <div className="grid gap-3 rounded border border-slate-200 bg-white p-3 shadow-sm md:grid-cols-[1fr_180px_140px_auto]">
      <FieldIcon icon={Search}>
        <input placeholder="Search concerts, comedy, sports" className="w-full bg-transparent outline-none" />
      </FieldIcon>
      <FieldIcon icon={MapPin}>
        <select className="w-full bg-transparent outline-none">
          <option>Mumbai</option>
          <option>Bengaluru</option>
          <option>Delhi</option>
          <option>Pune</option>
        </select>
      </FieldIcon>
      <FieldIcon icon={CalendarDays}>
        <select className="w-full bg-transparent outline-none">
          <option>This week</option>
          <option>This month</option>
          <option>Weekend</option>
        </select>
      </FieldIcon>
      <Link to="/events" className="inline-flex items-center justify-center rounded bg-slate-950 px-5 py-3 text-sm font-black text-white">
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
          to="/events"
          className={`shrink-0 rounded border px-4 py-2 text-sm font-black ${
            index === 0 ? 'border-slate-950 bg-slate-950 text-white' : 'border-slate-200 bg-white text-slate-700'
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
          <img src={event.image} alt={event.title} className="h-full w-full object-cover" />
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
          <span className="absolute left-3 top-3 rounded bg-white px-2 py-1 text-xs font-black text-slate-950">{event.category}</span>
        </div>
        <div className="p-4">
          <h3 className="line-clamp-2 min-h-[3.5rem] text-lg font-black leading-7">{event.title}</h3>
          <EventMeta event={event} />
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              from <span className="font-black text-slate-950">INR {event.priceFrom.toLocaleString('en-IN')}</span>
            </p>
            <span className="rounded bg-rose-50 px-2 py-1 text-xs font-black text-rose-700">{event.sold}% sold</span>
          </div>
        </div>
      </Link>
    </article>
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

function SectionHeader({ title, action, to }) {
  return (
    <div className="mb-5 flex items-center justify-between gap-4">
      <h2 className="text-2xl font-black tracking-normal">{title}</h2>
      <Link to={to} className="text-sm font-black text-rose-600 hover:text-rose-700">
        {action}
      </Link>
    </div>
  )
}

function SectionTitle({ kicker, title }) {
  return (
    <div>
      <p className="text-sm font-black uppercase tracking-wide text-rose-600">{kicker}</p>
      <h1 className="mt-1 text-3xl font-black tracking-normal">{title}</h1>
    </div>
  )
}

function Metric({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-4">
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded bg-slate-100 text-slate-900">
        <Icon size={22} />
      </span>
      <div>
        <p className="text-sm font-bold text-slate-500">{label}</p>
        <p className="font-black text-slate-950">{value}</p>
      </div>
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
      <p className="text-sm font-bold text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-black">{value}</p>
    </div>
  )
}

function InfoBox({ label, value }) {
  return (
    <div className="rounded border border-white/10 bg-white/10 p-4">
      <p className="text-sm font-bold text-white/65">{label}</p>
      <p className="mt-1 text-lg font-black text-white">{value}</p>
    </div>
  )
}

function SummaryRow({ label, value, strong = false }) {
  return (
    <div className={`flex items-center justify-between gap-4 ${strong ? 'text-lg font-black' : 'text-slate-600'}`}>
      <span>{label}</span>
      <span className={strong ? '' : 'font-black text-slate-950'}>{value}</span>
    </div>
  )
}

function StatusLine({ label, status }) {
  return (
    <div className="flex items-center justify-between rounded bg-slate-50 px-3 py-3">
      <span className="font-bold text-slate-700">{label}</span>
      <span className="rounded bg-white px-2 py-1 text-xs font-black text-slate-500 ring-1 ring-slate-200">{status}</span>
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
    <select value={value} onChange={onChange} className="min-h-12 rounded border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700">
      {options.map((option) => (
        <option key={option}>{option}</option>
      ))}
    </select>
  )
}

function AuthInput({ label, type = 'text', placeholder }) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-700">
      {label}
      <input
        type={type}
        placeholder={placeholder}
        className="h-12 rounded border border-slate-200 bg-slate-50 px-3 text-slate-950 outline-none focus:border-rose-500"
      />
    </label>
  )
}

export default App
