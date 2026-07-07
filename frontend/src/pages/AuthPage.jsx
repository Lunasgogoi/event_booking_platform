import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Ticket, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AuthInput } from '@/components/forms'
import { authFormDefaults } from '@/lib/constants'
import { useAuth } from '@/context/useAuth'
import { getApiErrorMessage } from '@/services/api'

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
