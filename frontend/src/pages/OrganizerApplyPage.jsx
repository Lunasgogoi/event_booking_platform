import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { ListChecks } from 'lucide-react'
import { SectionTitle } from '@/components/shared'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { formatOrganizerStatus } from '@/lib/formatters'
import { useAuth } from '@/context/useAuth'
import { getApiErrorMessage } from '@/services/api'
import { cn } from '@/lib/utils'

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
      <section className="mt-6 rounded-lg border border-border bg-card p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Organizer application</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Share the details an admin needs to review your organizer profile.
            </p>
          </div>
          <span className="w-fit rounded bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
            {formatOrganizerStatus(organizerStatus)}
          </span>
        </div>

        {user?.role === 'admin' && (
          <p className="mt-5 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm font-semibold text-muted-foreground">
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
              className={cn(buttonVariants(), 'mt-3 w-fit px-4 py-3 text-sm font-semibold')}
            >
              <ListChecks size={17} /> Organizer dashboard
            </Link>
          </div>
        )}
        {organizerStatus === 'suspended' && (
          <p className="mt-5 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">
            Organizer access is suspended. Contact support before applying again.
          </p>
        )}
        {user?.organizerProfile?.reviewNote && (
          <p className="mt-3 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
            {user.organizerProfile.reviewNote}
          </p>
        )}

        {canApply && (
          <form onSubmit={handleOrganizerSubmit(submitOrganizerRequest)} className="mt-6 grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Label className="grid gap-2 text-sm font-semibold text-foreground">
                Organization name
                <Input
                  {...registerOrganizerField('organizationName', { required: true, minLength: 2 })}
                  required
                  minLength={2}
                  className="h-11 bg-muted/40 px-3"
                />
              </Label>
              <Label className="grid gap-2 text-sm font-semibold text-foreground">
                Contact email
                <Input
                  {...registerOrganizerField('contactEmail', { required: true })}
                  type="email"
                  required
                  className="h-11 bg-muted/40 px-3"
                />
              </Label>
              <Label className="grid gap-2 text-sm font-semibold text-foreground">
                Phone
                <Input
                  {...registerOrganizerField('phone')}
                  className="h-11 bg-muted/40 px-3"
                />
              </Label>
              <Label className="grid gap-2 text-sm font-semibold text-foreground">
                City
                <Input
                  {...registerOrganizerField('city')}
                  className="h-11 bg-muted/40 px-3"
                />
              </Label>
              <Label className="grid gap-2 text-sm font-semibold text-foreground">
                Website or social link
                <Input
                  {...registerOrganizerField('website')}
                  type="url"
                  placeholder="https://"
                  className="h-11 bg-muted/40 px-3"
                />
              </Label>
              <Label className="grid gap-2 text-sm font-semibold text-foreground">
                Event types
                <Input
                  {...registerOrganizerField('eventTypes')}
                  placeholder="Music, comedy, workshops"
                  className="h-11 bg-muted/40 px-3"
                />
              </Label>
            </div>
            <Label className="grid gap-2 text-sm font-semibold text-foreground">
              Message
              <Textarea
                {...registerOrganizerField('message')}
                rows={4}
                className="bg-muted/40 px-3 py-2"
              />
            </Label>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-fit px-4 py-3 text-sm font-semibold"
            >
              {isSubmitting ? 'Submitting...' : ['rejected', 'revoked'].includes(organizerStatus) ? 'Apply again' : 'Request organizer access'}
            </Button>
          </form>
        )}
      </section>
    </main>
  )
}
