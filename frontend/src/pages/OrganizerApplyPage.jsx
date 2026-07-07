import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { ListChecks } from 'lucide-react'
import { SectionTitle } from '@/components/shared'
import { formatOrganizerStatus } from '@/lib/formatters'
import { useAuth } from '@/context/useAuth'
import { getApiErrorMessage } from '@/services/api'

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
