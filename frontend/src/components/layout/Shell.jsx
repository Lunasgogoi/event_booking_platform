import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Info, LogOut, Mail, Menu, Moon, Settings, Sun, Ticket } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { useAuth } from '@/context/useAuth'
import { getAvatarUrl, getOrganizerLink, getUserInitial } from '@/lib/user'
import { getApiErrorMessage } from '@/services/api'
import { ProfileMenu } from './ProfileMenu'
import { ThemeToggle } from './ThemeToggle'

export function Shell({ children, theme, onToggleTheme }) {
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
