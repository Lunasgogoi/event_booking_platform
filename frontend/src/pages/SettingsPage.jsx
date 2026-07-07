import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Users } from 'lucide-react'
import { SectionTitle } from '@/components/shared'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supportEmail } from '@/lib/constants'
import { formatOrganizerStatus } from '@/lib/formatters'
import { getAvatarUrl, getOrganizerLink, getUserInitial } from '@/lib/user'
import { useAuth } from '@/context/useAuth'
import { getApiErrorMessage } from '@/services/api'
import { cn } from '@/lib/utils'

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
        <section className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center gap-4">
            <span className="grid h-16 w-16 overflow-hidden rounded-full bg-primary text-primary-foreground">
              {avatarDisplayUrl ? (
                <img src={avatarDisplayUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="grid h-full w-full place-items-center text-xl font-semibold">
                  {getUserInitial(user)}
                </span>
              )}
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-xl font-semibold text-foreground">{user?.name || 'Ticketo user'}</h2>
              <p className="mt-1 truncate text-sm font-medium text-muted-foreground">{user?.email}</p>
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
            <Label className="grid gap-2 text-sm font-semibold text-foreground">
              Profile photo
              <Input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleAvatarChange}
                className="h-auto bg-muted/40 px-3 py-2 text-sm"
              />
            </Label>
            <Button
              type="submit"
              variant="outline"
              disabled={isUploadingAvatar || !avatarFile}
              className="px-4 py-3 text-sm font-semibold"
            >
              {isUploadingAvatar ? 'Uploading...' : 'Upload photo'}
            </Button>
          </form>
        </section>

        <div className="grid gap-5">
          <form onSubmit={handleProfileSubmit(submitProfile)} className="rounded-lg border border-border bg-card p-5">
            <h2 className="text-xl font-semibold text-foreground">Profile details</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Label className="grid gap-2 text-sm font-semibold text-foreground">
                Full name
                <Input
                  {...registerProfileField('name', { required: true, minLength: 2 })}
                  required
                  minLength={2}
                  className="h-11 bg-muted/40 px-3"
                />
              </Label>
              <Label className="grid gap-2 text-sm font-semibold text-foreground">
                Email
                <Input
                  {...registerProfileField('email', { required: true })}
                  type="email"
                  required
                  className="h-11 bg-muted/40 px-3"
                />
              </Label>
            </div>
            <Button
              type="submit"
              disabled={isSavingProfile}
              className="mt-5 px-4 py-3 text-sm font-semibold"
            >
              {isSavingProfile ? 'Saving...' : 'Save profile'}
            </Button>
          </form>

          <form onSubmit={handlePasswordSubmit(submitPassword)} className="rounded-lg border border-border bg-card p-5">
            <h2 className="text-xl font-semibold text-foreground">Change password</h2>
            <div className="mt-5 grid gap-4">
              <Label className="grid gap-2 text-sm font-semibold text-foreground">
                Current password
                <Input
                  {...registerPasswordField('currentPassword', { required: true })}
                  type="password"
                  required
                  className="h-11 bg-muted/40 px-3"
                />
              </Label>
              <div className="grid gap-4 sm:grid-cols-2">
                <Label className="grid gap-2 text-sm font-semibold text-foreground">
                  New password
                  <Input
                    {...registerPasswordField('newPassword', { required: true, minLength: 8 })}
                    type="password"
                    required
                    minLength={8}
                    className="h-11 bg-muted/40 px-3"
                  />
                </Label>
                <Label className="grid gap-2 text-sm font-semibold text-foreground">
                  Confirm password
                  <Input
                    {...registerPasswordField('confirmPassword', { required: true, minLength: 8 })}
                    type="password"
                    required
                    minLength={8}
                    className="h-11 bg-muted/40 px-3"
                  />
                </Label>
              </div>
            </div>
            <Button
              type="submit"
              variant="outline"
              disabled={isSavingPassword}
              className="mt-5 px-4 py-3 text-sm font-semibold"
            >
              {isSavingPassword ? 'Changing...' : 'Change password'}
            </Button>
          </form>

          <section className="rounded-lg border border-border bg-card p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Organizer access</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                  Manage your organizer application and event publishing access.
                </p>
              </div>
              <span className="w-fit rounded bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
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
              <p className="mt-5 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">
                Organizer access is suspended. Contact support before applying again.
              </p>
            )}
            {user?.organizerProfile?.reviewNote && (
              <p className="mt-3 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                {user.organizerProfile.reviewNote}
              </p>
            )}

            {user?.role !== 'admin' && (
              <Link
                to={organizerLink.to}
                className={cn(buttonVariants(), 'mt-5 w-fit px-4 py-3 text-sm font-semibold')}
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

function SettingsRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-muted/40 px-3 py-2">
      <span className="font-medium text-muted-foreground">{label}</span>
      <span className="truncate text-right font-semibold text-foreground">{value}</span>
    </div>
  )
}
