import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Users } from 'lucide-react'
import { SectionTitle } from '@/components/shared'
import { supportEmail } from '@/lib/constants'
import { formatOrganizerStatus } from '@/lib/formatters'
import { getAvatarUrl, getOrganizerLink, getUserInitial } from '@/lib/user'
import { useAuth } from '@/context/useAuth'
import { getApiErrorMessage } from '@/services/api'

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

function SettingsRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded border border-slate-200 bg-slate-50 px-3 py-2">
      <span className="font-medium text-slate-500">{label}</span>
      <span className="truncate text-right font-semibold text-slate-950">{value}</span>
    </div>
  )
}
