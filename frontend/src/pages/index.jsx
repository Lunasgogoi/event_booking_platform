import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  Ban,
  CalendarDays,
  Clock3,
  CreditCard,
  Download,
  Filter,
  ListChecks,
  Mail,
  Printer,
  Search,
  Ticket,
  User,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  EmptyState,
  FieldIcon,
  InfoBox,
  LoadingPanel,
  SectionHeader,
  SectionTitle,
  SummaryRow,
} from '@/components/shared'
import {
  CategoryStrip,
  EventGrid,
  EventMeta,
  EventPoster,
  SearchPanel,
} from '@/components/events'
import {
  AuthInput,
  SeatLegend,
  Select,
} from '@/components/forms'
import {
  authFormDefaults,
  categories,
  contactCategories,
  supportEmail,
} from '@/lib/constants'
import { getCategoryFromSearchParams, normalizeEvent } from '@/lib/events'
import { formatDuration, formatINR, formatOrganizerStatus } from '@/lib/formatters'
import { getAvatarUrl, getOrganizerLink, getUserInitial } from '@/lib/user'
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

function escapeMarkup(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function getCurrentTimestamp() {
  return Date.now()
}

export function HomePage() {
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

export function EventsPage() {
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

export function SettingsPage() {
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

export function OrganizerApplyPage() {
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

export function AboutPage() {
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

export function ContactPage() {
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

export function ConnectedAuthPage({ mode }) {
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
