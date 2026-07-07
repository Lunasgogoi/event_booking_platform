import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { CalendarDays, Mail, Ticket, Users } from 'lucide-react'
import { SectionTitle } from '@/components/shared'
import { contactCategories, supportEmail } from '@/lib/constants'
import { useAuth } from '@/context/useAuth'
import api, { getApiErrorMessage } from '@/services/api'

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
