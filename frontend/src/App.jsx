import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, NavLink, Route, Routes, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast, { Toaster } from 'react-hot-toast'
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  CreditCard,
  Ban,
  Download,
  Edit3,
  Filter,
  Heart,
  Info,
  ListChecks,
  LogOut,
  Mail,
  MapPin,
  Menu,
  Moon,
  Plus,
  Printer,
  Search,
  Settings,
  Sun,
  Ticket,
  User,
  Users,
} from 'lucide-react'
import { format } from 'date-fns'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { useAuth } from './context/useAuth'
import api from './services/api'
import { getApiErrorMessage } from './services/api'

const categories = ['All', 'Music', 'Comedy', 'Business', 'Sports', 'Food']
const contactCategories = [
  { value: 'booking', label: 'Booking issue' },
  { value: 'event', label: 'Event information' },
  { value: 'account', label: 'Account access' },
  { value: 'payment', label: 'Payment question' },
  { value: 'organizer', label: 'Organizer support' },
  { value: 'other', label: 'Other' },
]
const supportEmail = 'support@ticketo.events'

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

function formatDuration(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

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

function formatDateTimeInput(value) {
  if (!value) {
    return ''
  }

  return format(new Date(value), "yyyy-MM-dd'T'HH:mm")
}

function escapeMarkup(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function getUserInitial(user) {
  const source = user?.name || user?.email || 'User'
  return source.trim().charAt(0).toUpperCase()
}

function getAvatarUrl(user) {
  return user?.avatar?.url || user?.avatarUrl || ''
}

function formatOrganizerStatus(status) {
  const labels = {
    none: 'Not requested',
    pending: 'Pending review',
    approved: 'Approved',
    rejected: 'Rejected',
    suspended: 'Suspended',
  }

  return labels[status || 'none'] || 'Not requested'
}

function formatEventStatus(status) {
  const labels = {
    draft: 'Draft',
    submitted: 'Submitted',
    under_review: 'Under review',
    changes_requested: 'Changes requested',
    approved: 'Approved',
    rejected: 'Rejected',
    published: 'Published',
    cancelled: 'Cancelled',
    completed: 'Completed',
  }

  return labels[status] || status
}

function getOrganizerLink(user) {
  if (user?.role === 'organizer') {
    return { to: '/organizer/events', label: 'Organizer dashboard' }
  }

  const status = user?.organizerProfile?.status || 'none'
  if (status === 'pending') {
    return { to: '/organizer/apply', label: 'Organizer request' }
  }

  if (status === 'rejected') {
    return { to: '/organizer/apply', label: 'Apply again' }
  }

  if (status === 'suspended') {
    return { to: '/organizer/apply', label: 'Organizer status' }
  }

  return { to: '/organizer/apply', label: 'Become organizer' }
}

function getCurrentTimestamp() {
  return Date.now()
}

function getInitialTheme() {
  const savedTheme = window.localStorage.getItem('ticketo-theme')

  if (savedTheme === 'dark' || savedTheme === 'light') {
    return savedTheme
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function App() {
  const [theme, setTheme] = useState(getInitialTheme)
  const isDark = theme === 'dark'

  useEffect(() => {
    window.localStorage.setItem('ticketo-theme', theme)
    document.documentElement.classList.toggle('theme-dark-root', isDark)
    document.documentElement.classList.toggle('dark', isDark)
  }, [isDark, theme])

  function toggleTheme() {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'))
  }

  return (
    <div className={`min-h-screen ${isDark ? 'theme-dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-950'}`}>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 2400,
          style: isDark
            ? {
                background: '#161b22',
                border: '1px solid rgba(148, 163, 184, 0.18)',
                color: '#e5e7eb',
              }
            : undefined,
        }}
      />
      <Shell theme={theme} onToggleTheme={toggleTheme}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/events" element={<EventsPage />} />
          <Route path="/events/:eventId" element={<EventDetailPage />} />
          <Route path="/bookings" element={<BookingsPage />} />
          <Route
            path="/settings"
            element={(
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/organizer/apply"
            element={(
              <ProtectedRoute>
                <OrganizerApplyPage />
              </ProtectedRoute>
            )}
          />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
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
          <Route
            path="/admin/reviews"
            element={(
              <AdminRoute>
                <ManageEventsPage scope="review" />
              </AdminRoute>
            )}
          />
          <Route
            path="/organizer/events"
            element={(
              <OrganizerRoute>
                <ManageEventsPage scope="organizer" />
              </OrganizerRoute>
            )}
          />
          <Route path="/login" element={<ConnectedAuthPage mode="login" />} />
          <Route path="/register" element={<ConnectedAuthPage mode="register" />} />
        </Routes>
      </Shell>
    </div>
  )
}

function ProtectedRoute({ children }) {
  const { isAuthenticated, isBootstrapping } = useAuth()

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

  return children
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

function OrganizerRoute({ children }) {
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

  if (user?.role !== 'organizer') {
    return <Navigate to="/settings" replace />
  }

  return children
}

function ThemeToggle({ isDark, onToggleTheme }) {
  return (
    <button
      type="button"
      onClick={onToggleTheme}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="grid h-10 w-10 place-items-center rounded border border-slate-300 text-slate-700 transition hover:border-slate-400 hover:bg-slate-100"
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  )
}

function ProfileMenu({ user, onLogout }) {
  const avatarUrl = getAvatarUrl(user)
  const initial = getUserInitial(user)
  const organizerLink = getOrganizerLink(user)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="inline-flex h-10 items-center gap-2 rounded border border-slate-300 bg-white px-1.5 pr-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-100"
        aria-haspopup="menu"
        aria-label="Open profile menu"
      >
        <Avatar className="h-8 w-8 bg-slate-950 text-white">
          {avatarUrl && <AvatarImage src={avatarUrl} alt="" />}
          <AvatarFallback className="bg-slate-950 text-sm font-semibold text-white">{initial}</AvatarFallback>
        </Avatar>
        <ChevronDown size={16} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-72 overflow-hidden rounded border border-slate-200 bg-white p-0 shadow-2xl">
        <div className="border-b border-slate-200 px-4 py-3">
          <p className="truncate text-sm font-semibold text-slate-950">{user?.name || 'Ticketo user'}</p>
          <p className="mt-0.5 truncate text-xs font-medium text-slate-500">{user?.email}</p>
        </div>
        <div className="p-2">
          <DropdownMenuItem render={<Link to="/settings" />} className="flex w-full items-center gap-3 rounded px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100">
            <Settings size={17} className="text-slate-400" />
            Settings
          </DropdownMenuItem>
          <DropdownMenuItem render={<Link to="/about" />} className="flex w-full items-center gap-3 rounded px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100">
            <Info size={17} className="text-slate-400" />
            About us
          </DropdownMenuItem>
          {user?.role !== 'admin' && (
            <DropdownMenuItem render={<Link to={organizerLink.to} />} className="flex w-full items-center gap-3 rounded px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100">
              <Users size={17} className="text-slate-400" />
              {organizerLink.label}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem render={<Link to="/contact" />} className="flex w-full items-center gap-3 rounded px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100">
            <Mail size={17} className="text-slate-400" />
            Contact us
          </DropdownMenuItem>
        </div>
        <DropdownMenuSeparator className="m-0 bg-slate-200" />
        <div className="p-2">
          <DropdownMenuItem
            onClick={onLogout}
            variant="destructive"
            className="flex w-full items-center gap-3 rounded px-3 py-2.5 text-left text-sm font-semibold text-rose-700 hover:bg-rose-50"
          >
            <LogOut size={17} />
            Logout
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function Shell({ children, theme, onToggleTheme }) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const { isAuthenticated, logout, user } = useAuth()
  const isDark = theme === 'dark'
  const organizerLink = getOrganizerLink(user)

  const links = [
    { to: '/events', label: 'Events' },
    { to: '/bookings', label: 'My bookings' },
    user?.role !== 'admin' ? organizerLink : null,
    user?.role === 'admin' ? { to: '/admin', label: 'Admin' } : null,
  ].filter(Boolean)

  async function handleLogout() {
    try {
      await logout()
      navigate('/')
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
            <ThemeToggle isDark={isDark} onToggleTheme={onToggleTheme} />
            {isAuthenticated ? (
              <ProfileMenu user={user} onLogout={handleLogout} />
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

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              className="grid h-10 w-10 place-items-center rounded border border-slate-300 md:hidden"
              aria-label="Toggle navigation"
            >
              <Menu size={20} />
            </SheetTrigger>
            <SheetContent side="right" className="w-[min(22rem,90vw)] border-slate-200 bg-white p-0 md:hidden">
              <SheetHeader className="border-b border-slate-200 px-4 py-4 text-left">
                <SheetTitle className="flex items-center gap-2 text-lg font-semibold tracking-normal">
                  <span className="grid h-9 w-9 place-items-center rounded bg-rose-600 text-white">
                    <Ticket size={20} />
                  </span>
                  Ticketo
                </SheetTitle>
              </SheetHeader>
              <div className="grid gap-2 px-4 py-3">
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
                <button
                  type="button"
                  onClick={onToggleTheme}
                  className="inline-flex items-center gap-2 rounded px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  {isDark ? <Sun size={17} /> : <Moon size={17} />}
                  {isDark ? 'Light mode' : 'Dark mode'}
                </button>
                {isAuthenticated ? (
                  <>
                    <div className="flex items-center gap-3 rounded border border-slate-200 bg-slate-50 px-3 py-3">
                      <Avatar className="h-10 w-10 shrink-0 bg-slate-950 text-white">
                        {getAvatarUrl(user) && <AvatarImage src={getAvatarUrl(user)} alt="" />}
                        <AvatarFallback className="bg-slate-950 text-sm font-semibold text-white">
                          {getUserInitial(user)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-slate-950">{user?.name}</span>
                        <span className="block truncate text-xs font-medium text-slate-500">{user?.email}</span>
                      </span>
                    </div>
                    <Link
                      to="/settings"
                      onClick={() => setOpen(false)}
                      className="inline-flex items-center gap-2 rounded px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      <Settings size={17} /> Settings
                    </Link>
                    <Link
                      to="/about"
                      onClick={() => setOpen(false)}
                      className="inline-flex items-center gap-2 rounded px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      <Info size={17} /> About us
                    </Link>
                    <Link
                      to="/contact"
                      onClick={() => setOpen(false)}
                      className="inline-flex items-center gap-2 rounded px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      <Mail size={17} /> Contact us
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setOpen(false)
                        handleLogout()
                      }}
                      className="inline-flex items-center gap-2 rounded px-3 py-2 text-left text-sm font-semibold text-rose-700 hover:bg-rose-50"
                    >
                      <LogOut size={17} /> Logout
                    </button>
                  </>
                ) : (
                  <Link to="/login" onClick={() => setOpen(false)} className="rounded px-3 py-2 text-sm font-semibold">
                    Login
                  </Link>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
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
  const [query, setQuery] = useState(searchParams.get('search') || '')
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

  function handleQueryChange(value) {
    const nextParams = new URLSearchParams(searchParams)

    if (value.trim()) {
      nextParams.set('search', value)
    } else {
      nextParams.delete('search')
    }

    setQuery(value)
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
              onChange={(event) => handleQueryChange(event.target.value)}
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

function SettingsPage() {
  const { changePassword, updateProfile, uploadAvatar, user } = useAuth()
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState('')
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const avatarPreviewRef = useRef('')
  const avatarUrl = getAvatarUrl(user)
  const avatarDisplayUrl = avatarPreview || avatarUrl
  const organizerStatus = user?.organizerProfile?.status || 'none'
  const organizerLink = getOrganizerLink(user)
  const {
    register: registerProfileField,
    handleSubmit: handleProfileSubmit,
    reset: resetProfile,
    formState: { isSubmitting: isSavingProfile },
  } = useForm({
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
    },
  })
  const {
    register: registerPasswordField,
    handleSubmit: handlePasswordSubmit,
    reset: resetPassword,
    formState: { isSubmitting: isSavingPassword },
  } = useForm({
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  })

  useEffect(() => {
    resetProfile({
      name: user?.name || '',
      email: user?.email || '',
    })
  }, [resetProfile, user?.email, user?.name])

  useEffect(() => {
    return () => {
      if (avatarPreviewRef.current) {
        URL.revokeObjectURL(avatarPreviewRef.current)
      }
    }
  }, [])

  function handleAvatarChange(event) {
    const file = event.target.files?.[0] || null

    if (avatarPreviewRef.current) {
      URL.revokeObjectURL(avatarPreviewRef.current)
      avatarPreviewRef.current = ''
    }

    setAvatarFile(file)
    if (!file) {
      setAvatarPreview('')
      return
    }

    const previewUrl = URL.createObjectURL(file)
    avatarPreviewRef.current = previewUrl
    setAvatarPreview(previewUrl)
  }

  async function submitAvatar(event) {
    event.preventDefault()

    if (!avatarFile) {
      toast.error('Choose an image first')
      return
    }

    const formData = new FormData()
    formData.append('avatar', avatarFile)
    setIsUploadingAvatar(true)

    try {
      await uploadAvatar(formData)
      setAvatarFile(null)
      setAvatarPreview('')
      toast.success('Avatar updated')
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  async function submitProfile(values) {
    try {
      await updateProfile(values)
      toast.success('Profile updated')
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    }
  }

  async function submitPassword(values) {
    if (values.newPassword !== values.confirmPassword) {
      toast.error('New passwords do not match')
      return
    }

    try {
      await changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      })
      resetPassword()
      toast.success('Password changed')
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <SectionTitle kicker="Account" title="Settings" />
      <div className="mt-6 grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        <section className="rounded border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-4">
            <span className="grid h-16 w-16 overflow-hidden rounded-full bg-slate-950 text-white">
              {avatarDisplayUrl ? (
                <img src={avatarDisplayUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="grid h-full w-full place-items-center text-xl font-semibold">
                  {getUserInitial(user)}
                </span>
              )}
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-xl font-semibold text-slate-950">{user?.name || 'Ticketo user'}</h2>
              <p className="mt-1 truncate text-sm font-medium text-slate-500">{user?.email}</p>
            </div>
          </div>
          <div className="mt-5 grid gap-3 text-sm">
            {user?.role === 'admin' && <SettingsRow label="Role" value="Admin" />}
            {user?.role === 'organizer' && <SettingsRow label="Role" value="Organizer" />}
            {user?.role !== 'admin' && user?.role !== 'organizer' && <SettingsRow label="Role" value="Customer" />}
            <SettingsRow label="Organizer status" value={formatOrganizerStatus(organizerStatus)} />
            <SettingsRow label="Booking alerts" value="Sent to your account email" />
            <SettingsRow label="Support channel" value={supportEmail} />
          </div>
          <form onSubmit={submitAvatar} className="mt-5 grid gap-3">
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Profile photo
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleAvatarChange}
                className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-rose-500"
              />
            </label>
            <button
              type="submit"
              disabled={isUploadingAvatar || !avatarFile}
              className="rounded border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:border-slate-400 disabled:cursor-not-allowed disabled:text-slate-400"
            >
              {isUploadingAvatar ? 'Uploading...' : 'Upload photo'}
            </button>
          </form>
        </section>

        <div className="grid gap-5">
          <form onSubmit={handleProfileSubmit(submitProfile)} className="rounded border border-slate-200 bg-white p-5">
            <h2 className="text-xl font-semibold text-slate-950">Profile details</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                Full name
                <input
                  {...registerProfileField('name', { required: true, minLength: 2 })}
                  required
                  minLength={2}
                  className="h-11 rounded border border-slate-200 bg-slate-50 px-3 text-slate-950 outline-none focus:border-rose-500"
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                Email
                <input
                  {...registerProfileField('email', { required: true })}
                  type="email"
                  required
                  className="h-11 rounded border border-slate-200 bg-slate-50 px-3 text-slate-950 outline-none focus:border-rose-500"
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={isSavingProfile}
              className="mt-5 rounded bg-slate-950 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isSavingProfile ? 'Saving...' : 'Save profile'}
            </button>
          </form>

          <form onSubmit={handlePasswordSubmit(submitPassword)} className="rounded border border-slate-200 bg-white p-5">
            <h2 className="text-xl font-semibold text-slate-950">Change password</h2>
            <div className="mt-5 grid gap-4">
              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                Current password
                <input
                  {...registerPasswordField('currentPassword', { required: true })}
                  type="password"
                  required
                  className="h-11 rounded border border-slate-200 bg-slate-50 px-3 text-slate-950 outline-none focus:border-rose-500"
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-semibold text-slate-700">
                  New password
                  <input
                    {...registerPasswordField('newPassword', { required: true, minLength: 8 })}
                    type="password"
                    required
                    minLength={8}
                    className="h-11 rounded border border-slate-200 bg-slate-50 px-3 text-slate-950 outline-none focus:border-rose-500"
                  />
                </label>
                <label className="grid gap-2 text-sm font-semibold text-slate-700">
                  Confirm password
                  <input
                    {...registerPasswordField('confirmPassword', { required: true, minLength: 8 })}
                    type="password"
                    required
                    minLength={8}
                    className="h-11 rounded border border-slate-200 bg-slate-50 px-3 text-slate-950 outline-none focus:border-rose-500"
                  />
                </label>
              </div>
            </div>
            <button
              type="submit"
              disabled={isSavingPassword}
              className="mt-5 rounded border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:border-slate-400 disabled:cursor-not-allowed disabled:text-slate-400"
            >
              {isSavingPassword ? 'Changing...' : 'Change password'}
            </button>
          </form>

          <section className="rounded border border-slate-200 bg-white p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">Organizer access</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                  Manage your organizer application and event publishing access.
                </p>
              </div>
              <span className="w-fit rounded bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                {formatOrganizerStatus(organizerStatus)}
              </span>
            </div>

            {organizerStatus === 'pending' && (
              <p className="mt-5 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
                Your request is waiting for admin review.
              </p>
            )}
            {organizerStatus === 'approved' && (
              <p className="mt-5 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
                Organizer access is active.
              </p>
            )}
            {organizerStatus === 'suspended' && (
              <p className="mt-5 rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800">
                Organizer access is suspended. Contact support before applying again.
              </p>
            )}
            {user?.organizerProfile?.reviewNote && (
              <p className="mt-3 rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                {user.organizerProfile.reviewNote}
              </p>
            )}

            {user?.role !== 'admin' && (
              <Link
                to={organizerLink.to}
                className="mt-5 inline-flex w-fit items-center gap-2 rounded bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
              >
                <Users size={17} /> {organizerLink.label}
              </Link>
            )}
          </section>
        </div>
      </div>
    </main>
  )
}

function OrganizerApplyPage() {
  const navigate = useNavigate()
  const { requestOrganizerAccess, user } = useAuth()
  const organizerStatus = user?.organizerProfile?.status || 'none'
  const canApply = user?.role !== 'admin' && !['pending', 'approved', 'suspended'].includes(organizerStatus)
  const {
    register: registerOrganizerField,
    handleSubmit: handleOrganizerSubmit,
    reset: resetOrganizerForm,
    formState: { isSubmitting },
  } = useForm({
    defaultValues: {
      organizationName: user?.organizerProfile?.organizationName || '',
      contactEmail: user?.organizerProfile?.contactEmail || user?.email || '',
      phone: user?.organizerProfile?.phone || '',
      city: user?.organizerProfile?.city || '',
      website: user?.organizerProfile?.website || '',
      eventTypes: user?.organizerProfile?.eventTypes?.join(', ') || '',
      message: '',
    },
  })

  useEffect(() => {
    resetOrganizerForm({
      organizationName: user?.organizerProfile?.organizationName || '',
      contactEmail: user?.organizerProfile?.contactEmail || user?.email || '',
      phone: user?.organizerProfile?.phone || '',
      city: user?.organizerProfile?.city || '',
      website: user?.organizerProfile?.website || '',
      eventTypes: user?.organizerProfile?.eventTypes?.join(', ') || '',
      message: '',
    })
  }, [
    resetOrganizerForm,
    user?.email,
    user?.organizerProfile?.city,
    user?.organizerProfile?.contactEmail,
    user?.organizerProfile?.eventTypes,
    user?.organizerProfile?.organizationName,
    user?.organizerProfile?.phone,
    user?.organizerProfile?.website,
  ])

  async function submitOrganizerRequest(values) {
    const eventTypes = values.eventTypes
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)

    try {
      await requestOrganizerAccess({
        organizationName: values.organizationName,
        contactEmail: values.contactEmail,
        phone: values.phone,
        city: values.city,
        website: values.website,
        eventTypes,
        message: values.message,
      })
      toast.success('Organizer request submitted')
      navigate('/settings')
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <SectionTitle kicker="Organizer" title={user?.role === 'organizer' ? 'Organizer dashboard' : 'Become organizer'} />
      <section className="mt-6 rounded border border-slate-200 bg-white p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">Organizer application</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Share the details an admin needs to review your organizer profile.
            </p>
          </div>
          <span className="w-fit rounded bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
            {formatOrganizerStatus(organizerStatus)}
          </span>
        </div>

        {user?.role === 'admin' && (
          <p className="mt-5 rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
            Admin accounts do not need organizer access.
          </p>
        )}
        {organizerStatus === 'pending' && (
          <p className="mt-5 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
            Your organizer request is waiting for admin review.
          </p>
        )}
        {organizerStatus === 'approved' && (
          <div className="mt-5 rounded border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-sm font-semibold text-emerald-800">Organizer access is active.</p>
            <Link
              to="/organizer/events"
              className="mt-3 inline-flex w-fit items-center gap-2 rounded bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
            >
              <ListChecks size={17} /> Organizer dashboard
            </Link>
          </div>
        )}
        {organizerStatus === 'suspended' && (
          <p className="mt-5 rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800">
            Organizer access is suspended. Contact support before applying again.
          </p>
        )}
        {user?.organizerProfile?.reviewNote && (
          <p className="mt-3 rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
            {user.organizerProfile.reviewNote}
          </p>
        )}

        {canApply && (
          <form onSubmit={handleOrganizerSubmit(submitOrganizerRequest)} className="mt-6 grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                Organization name
                <input
                  {...registerOrganizerField('organizationName', { required: true, minLength: 2 })}
                  required
                  minLength={2}
                  className="h-11 rounded border border-slate-200 bg-slate-50 px-3 text-slate-950 outline-none focus:border-rose-500"
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                Contact email
                <input
                  {...registerOrganizerField('contactEmail', { required: true })}
                  type="email"
                  required
                  className="h-11 rounded border border-slate-200 bg-slate-50 px-3 text-slate-950 outline-none focus:border-rose-500"
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                Phone
                <input
                  {...registerOrganizerField('phone')}
                  className="h-11 rounded border border-slate-200 bg-slate-50 px-3 text-slate-950 outline-none focus:border-rose-500"
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                City
                <input
                  {...registerOrganizerField('city')}
                  className="h-11 rounded border border-slate-200 bg-slate-50 px-3 text-slate-950 outline-none focus:border-rose-500"
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                Website or social link
                <input
                  {...registerOrganizerField('website')}
                  type="url"
                  placeholder="https://"
                  className="h-11 rounded border border-slate-200 bg-slate-50 px-3 text-slate-950 outline-none focus:border-rose-500"
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                Event types
                <input
                  {...registerOrganizerField('eventTypes')}
                  placeholder="Music, comedy, workshops"
                  className="h-11 rounded border border-slate-200 bg-slate-50 px-3 text-slate-950 outline-none focus:border-rose-500"
                />
              </label>
            </div>
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Message
              <textarea
                {...registerOrganizerField('message')}
                rows={4}
                className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-slate-950 outline-none focus:border-rose-500"
              />
            </label>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-fit rounded bg-slate-950 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isSubmitting ? 'Submitting...' : organizerStatus === 'rejected' ? 'Apply again' : 'Request organizer access'}
            </button>
          </form>
        )}
      </section>
    </main>
  )
}

function AboutPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <SectionTitle kicker="About" title="About Ticketo" />
      <section className="mt-6 rounded border border-slate-200 bg-white p-6">
        <p className="max-w-3xl text-base leading-7 text-slate-600">
          Ticketo helps people discover events, reserve seats, and receive ticket confirmations in one focused booking
          flow. Organizers can publish events, monitor inventory, and keep booking operations in one place.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <InfoTile icon={CalendarDays} label="Events" value="Browse by category, city, and date" />
          <InfoTile icon={Ticket} label="Bookings" value="Reserve seats with QR tickets" />
          <InfoTile icon={Users} label="Organizers" value="Admin tools for event teams" />
        </div>
      </section>
    </main>
  )
}

function ContactPage() {
  const { user } = useAuth()
  const {
    register: registerContactField,
    handleSubmit: handleContactSubmit,
    reset: resetContact,
    formState: { isSubmitting },
  } = useForm({
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
      category: 'booking',
      subject: '',
      message: '',
    },
  })

  useEffect(() => {
    resetContact((current) => ({
      ...current,
      name: current.name || user?.name || '',
      email: current.email || user?.email || '',
    }))
  }, [resetContact, user?.email, user?.name])

  async function submitContact(values) {
    try {
      await api.post('/contact', values)
      resetContact({
        name: user?.name || '',
        email: user?.email || '',
        category: 'booking',
        subject: '',
        message: '',
      })
      toast.success('Support request sent')
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <SectionTitle kicker="Support" title="Contact us" />
      <section className="mt-6 grid gap-6 rounded border border-slate-200 bg-white p-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <h2 className="text-xl font-semibold text-slate-950">Event and booking help</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Send the Ticketo support/admin team a message for event publishing issues, booking questions, payment
            references, ticket delivery, or account access.
          </p>
          <div className="mt-5 grid gap-3 text-sm">
            <SettingsRow label="Support email" value={supportEmail} />
            <SettingsRow label="Expected reply" value="Within 1 business day" />
          </div>
        </div>

        <form onSubmit={handleContactSubmit(submitContact)} className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Name
              <input
                {...registerContactField('name', { required: true, minLength: 2 })}
                required
                minLength={2}
                className="h-11 rounded border border-slate-200 bg-slate-50 px-3 text-slate-950 outline-none focus:border-rose-500"
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Email
              <input
                {...registerContactField('email', { required: true })}
                type="email"
                required
                className="h-11 rounded border border-slate-200 bg-slate-50 px-3 text-slate-950 outline-none focus:border-rose-500"
              />
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-[0.8fr_1.2fr]">
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Category
              <select
                {...registerContactField('category', { required: true })}
                className="h-11 rounded border border-slate-200 bg-slate-50 px-3 text-slate-950 outline-none focus:border-rose-500"
              >
                {contactCategories.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Subject
              <input
                {...registerContactField('subject', { required: true, minLength: 4 })}
                required
                minLength={4}
                className="h-11 rounded border border-slate-200 bg-slate-50 px-3 text-slate-950 outline-none focus:border-rose-500"
              />
            </label>
          </div>
          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Message
            <textarea
              {...registerContactField('message', { required: true, minLength: 10 })}
              required
              minLength={10}
              rows={6}
              className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-slate-950 outline-none focus:border-rose-500"
            />
          </label>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center justify-center gap-2 rounded bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            <Mail size={18} />
            {isSubmitting ? 'Sending...' : 'Send message'}
          </button>
        </form>
      </section>
      <section className="mt-5 rounded border border-slate-200 bg-white p-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <InfoTile icon={Ticket} label="Bookings" value="Include your booking code or seat number if you have one." />
          <InfoTile icon={CalendarDays} label="Events" value="Include the event name and city for faster support." />
          <InfoTile icon={Mail} label="Email fallback" value={supportEmail} />
        </div>
      </section>
    </main>
  )
}

function SettingsRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded border border-slate-200 bg-slate-50 px-3 py-2">
      <span className="font-medium text-slate-500">{label}</span>
      <span className="truncate text-right font-semibold text-slate-950">{value}</span>
    </div>
  )
}

function InfoTile({ icon: Icon, label, value }) {
  return (
    <div className="rounded border border-slate-200 bg-slate-50 p-4">
      <span className="grid h-10 w-10 place-items-center rounded bg-white text-rose-600">
        <Icon size={19} />
      </span>
      <p className="mt-3 text-sm font-semibold text-slate-950">{label}</p>
      <p className="mt-1 text-sm leading-6 text-slate-500">{value}</p>
    </div>
  )
}

function EventDetailPage() {
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
              <p className="text-sm text-slate-500">
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
          <div className="mb-5 rounded bg-slate-100 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
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
            {selectedSeats.length > 0 && (
              <SummaryRow label="Hold" value={`${formatDuration(holdSecondsRemaining)} remaining`} />
            )}
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
            <CreditCard size={18} /> {isBooking ? 'Opening payment...' : 'Pay and confirm'}
          </button>
        </aside>
      </section>
      {selectedSeats.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white p-4 shadow-2xl lg:hidden">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-950">
                {selectedSeats.length} {selectedSeats.length === 1 ? 'seat' : 'seats'} selected
              </p>
              <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-amber-700">
                <Clock3 size={14} /> {formatDuration(holdSecondsRemaining)} remaining
              </p>
            </div>
            <button
              type="button"
              disabled={isBooking}
              onClick={confirmBooking}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded bg-rose-600 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              <CreditCard size={17} /> {isBooking ? 'Paying...' : formatINR(subtotal + fees)}
            </button>
          </div>
        </div>
      )}
    </main>
  )
}

function BookingsPage() {
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
              <div className="grid justify-items-start gap-3 md:justify-items-end">
                {booking.qrCode?.dataUrl ? (
                  <img src={booking.qrCode.dataUrl} alt={`${booking.bookingCode} QR code`} className="h-28 w-28 rounded ring-1 ring-slate-200" />
                ) : (
                  <div className="grid h-28 w-28 place-items-center rounded border border-dashed border-slate-300 bg-slate-50 p-3 text-center text-xs font-semibold text-slate-500">
                    QR unavailable
                  </div>
                )}
                <div className="flex flex-wrap justify-start gap-2 md:justify-end">
                  <button
                    type="button"
                    disabled={!canUseTicket}
                    onClick={() => downloadQr(booking)}
                    className="inline-flex items-center gap-2 rounded border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:text-slate-400"
                  >
                    <Download size={15} /> QR
                  </button>
                  <button
                    type="button"
                    disabled={!canUseTicket}
                    onClick={() => printBooking(booking)}
                    className="inline-flex items-center gap-2 rounded border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:text-slate-400"
                  >
                    <Printer size={15} /> Print
                  </button>
                  {booking.status === 'confirmed' && (
                    <button
                      type="button"
                      onClick={() => setCancelTarget(booking)}
                      className="inline-flex items-center gap-2 rounded border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700"
                    >
                      <Ban size={15} /> Cancel
                    </button>
                  )}
                </div>
              </div>
            </article>
          )
        })}
      </div>
      {cancelTarget && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 px-4">
          <div className="w-full max-w-md rounded border border-slate-200 bg-white p-5 shadow-2xl">
            <h2 className="text-xl font-semibold text-slate-950">Cancel booking?</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              This will cancel booking <span className="font-semibold text-slate-700">{cancelTarget.bookingCode}</span>
              and release the selected seats if the event has not started.
            </p>
            <div className="mt-5 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => setCancelTarget(null)}
                className="rounded border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700"
              >
                Keep booking
              </button>
              <button
                type="button"
                onClick={cancelBooking}
                className="rounded bg-rose-600 px-4 py-3 text-sm font-semibold text-white hover:bg-rose-700"
              >
                Cancel booking
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

function AdminDashboardPage() {
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

function ManageEventsPage({ scope = 'admin' }) {
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

  async function loadEvents() {
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
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadEvents()
  }, [])

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
          <Button
            type="submit"
            disabled={isSubmitting}
            className="mt-6 h-12 w-full rounded bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isSubmitting ? 'Please wait...' : isRegister ? 'Register' : 'Login'}
          </Button>
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
  const navigate = useNavigate()
  const [query, setQuery] = useState('')

  function submitSearch(event) {
    event.preventDefault()

    const params = new URLSearchParams()
    if (query.trim()) {
      params.set('search', query.trim())
    }

    navigate(params.toString() ? `/events?${params.toString()}` : '/events')
  }

  return (
    <form onSubmit={submitSearch} className="grid gap-3 rounded border border-slate-200 bg-white p-3 shadow-sm md:grid-cols-[1fr_auto]">
      <FieldIcon icon={Search}>
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search events"
          className="h-auto w-full border-0 bg-transparent px-0 py-0 text-sm font-normal text-slate-950 outline-none focus-visible:border-transparent focus-visible:ring-0 dark:bg-transparent"
        />
      </FieldIcon>
      <Button type="submit" className="h-12 rounded bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800">
        Search
      </Button>
    </form>
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
    <Card className="gap-0 overflow-hidden rounded border border-slate-200 bg-white py-0 shadow-sm ring-0 transition hover:-translate-y-1 hover:shadow-md">
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
          <Badge variant="secondary" className="absolute left-3 top-3 h-auto rounded bg-white px-2 py-1 text-xs font-semibold text-slate-950 shadow">
            {event.category}
          </Badge>
        </div>
        <CardContent className="p-4">
          <h3 className="line-clamp-2 min-h-[3.5rem] text-lg font-semibold leading-7">{event.title}</h3>
          <EventMeta event={event} />
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              from <span className="font-semibold text-slate-950">INR {event.priceFrom.toLocaleString('en-IN')}</span>
            </p>
            <Badge variant="secondary" className="h-auto rounded bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700">
              {event.sold}% sold
            </Badge>
          </div>
        </CardContent>
      </Link>
    </Card>
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
  const actionClass = 'mt-5 h-11 rounded bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800'

  return (
    <Card className="rounded border border-dashed border-slate-300 bg-white py-0 text-center ring-0">
      <CardContent className="p-8">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded bg-slate-100 text-slate-700">
          <Icon size={22} />
        </span>
        <h2 className="mt-4 text-xl font-semibold text-slate-950">{title}</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{message}</p>
        {actionTo && (
          <Link to={actionTo} className={cn(buttonVariants(), actionClass)}>
            {actionLabel}
          </Link>
        )}
        {onAction && (
          <Button type="button" onClick={onAction} className={actionClass}>
            {actionLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

function LoadingPanel({ label }) {
  return (
    <Card className="rounded border border-slate-200 bg-white py-0 text-center ring-0">
      <CardContent className="p-6" aria-busy="true" aria-live="polite">
        <p className="text-sm font-semibold text-slate-500">{label}</p>
        <div className="mx-auto mt-4 grid max-w-md gap-2">
          <Skeleton className="mx-auto h-3 w-44" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="mx-auto h-3 w-2/3" />
        </div>
      </CardContent>
    </Card>
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
    <Card className="rounded border border-slate-200 bg-white py-0 ring-0">
      <CardContent className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <span className="grid h-10 w-10 place-items-center rounded bg-rose-50 text-rose-600">
            <Icon size={20} />
          </span>
        </div>
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <p className="mt-1 text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
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

function SeatLegend() {
  const items = [
    { label: 'Available', className: 'bg-slate-50 border-slate-300' },
    { label: 'Selected', className: 'bg-rose-600 border-rose-600' },
    { label: 'Unavailable', className: 'bg-slate-200 border-slate-300' },
  ]

  return (
    <div className="flex flex-wrap gap-3 text-xs font-semibold text-slate-500">
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-2">
          <span className={`h-3 w-3 rounded border ${item.className}`} />
          {item.label}
        </span>
      ))}
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
    <Label className="grid gap-2 text-sm font-medium text-slate-700">
      {label}
      <Input
        type={type}
        placeholder={placeholder}
        minLength={minLength}
        {...registration}
        required
        className="h-12 rounded border border-slate-200 bg-slate-50 px-3 text-slate-950 outline-none focus:border-rose-500"
      />
    </Label>
  )
}

export default App
