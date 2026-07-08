import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Info, LogOut, Mail, Menu, Moon, QrCode, Settings, ShieldCheck, Sun, Ticket } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { buttonVariants } from '@/components/ui/button'
import { useAuth } from '@/context/useAuth'
import { supportEmail } from '@/lib/constants'
import { getAvatarUrl, getOrganizerLink, getUserInitial } from '@/lib/user'
import { cn } from '@/lib/utils'
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
    user?.role === 'admin' ? { to: '/admin/organizers', label: 'Organizers' } : null,
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
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2 text-lg font-semibold tracking-normal">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Ticket size={20} />
            </span>
            Ticketo
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/admin'}
                className={({ isActive }) =>
                  `rounded-md px-3 py-2 text-sm font-semibold transition ${
                    isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
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
                  className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'h-10 px-4')}
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className={cn(buttonVariants({ size: 'lg' }), 'h-10 px-4 shadow-sm')}
                >
                  Register
                </Link>
              </>
            )}
          </div>

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              className="grid h-10 w-10 place-items-center rounded-lg border border-border text-foreground md:hidden"
              aria-label="Toggle navigation"
            >
              <Menu size={20} />
            </SheetTrigger>
            <SheetContent side="right" className="w-[min(22rem,90vw)] border-border bg-popover p-0 md:hidden">
              <SheetHeader className="border-b border-border px-4 py-4 text-left">
                <SheetTitle className="flex items-center gap-2 text-lg font-semibold tracking-normal">
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
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
                    end={link.to === '/admin'}
                    onClick={() => setOpen(false)}
                    className="rounded-md px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-accent hover:text-foreground"
                  >
                    {link.label}
                  </NavLink>
                ))}
                <button
                  type="button"
                  onClick={onToggleTheme}
                  className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-semibold text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  {isDark ? <Sun size={17} /> : <Moon size={17} />}
                  {isDark ? 'Light mode' : 'Dark mode'}
                </button>
                {isAuthenticated ? (
                  <>
                    <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-3 py-3">
                      <Avatar className="h-10 w-10 shrink-0 bg-primary text-primary-foreground">
                        {getAvatarUrl(user) && <AvatarImage src={getAvatarUrl(user)} alt="" />}
                        <AvatarFallback className="bg-primary text-sm font-semibold text-primary-foreground">
                          {getUserInitial(user)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-foreground">{user?.name}</span>
                        <span className="block truncate text-xs font-medium text-muted-foreground">{user?.email}</span>
                      </span>
                    </div>
                    <Link
                      to="/settings"
                      onClick={() => setOpen(false)}
                      className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-accent hover:text-foreground"
                    >
                      <Settings size={17} /> Settings
                    </Link>
                    <Link
                      to="/about"
                      onClick={() => setOpen(false)}
                      className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-accent hover:text-foreground"
                    >
                      <Info size={17} /> About us
                    </Link>
                    <Link
                      to="/contact"
                      onClick={() => setOpen(false)}
                      className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-accent hover:text-foreground"
                    >
                      <Mail size={17} /> Contact us
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setOpen(false)
                        handleLogout()
                      }}
                      className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-semibold text-destructive hover:bg-destructive/10"
                    >
                      <LogOut size={17} /> Logout
                    </button>
                  </>
                ) : (
                  <Link to="/login" onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-accent hover:text-foreground">
                    Login
                  </Link>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>
      <div className="flex-1">
        {children}
      </div>
      <Footer organizerLink={organizerLink} />
    </div>
  )
}

function Footer({ organizerLink }) {
  const year = new Date().getFullYear()
  const footerLinks = [
    {
      title: 'Explore',
      links: [
        { to: '/events', label: 'Events' },
        { to: '/bookings', label: 'My bookings' },
        organizerLink,
      ],
    },
    {
      title: 'Support',
      links: [
        { to: '/about', label: 'About us' },
        { to: '/contact', label: 'Contact us' },
      ],
    },
  ]

  const trustItems = [
    { icon: ShieldCheck, label: 'Secure payments' },
    { icon: QrCode, label: 'QR ticket delivery' },
    { icon: Ticket, label: 'Managed event inventory' },
  ]

  return (
    <footer className="mt-10 border-t border-border bg-card/60">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 md:grid-cols-[1.3fr_1fr_1fr] lg:px-8">
        <div className="max-w-md">
          <Link to="/" className="inline-flex items-center gap-2 text-lg font-semibold tracking-normal text-foreground">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Ticket size={20} />
            </span>
            Ticketo
          </Link>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Discover events, reserve seats, and manage bookings in one focused flow.
          </p>
          <a
            href={`mailto:${supportEmail}`}
            className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition hover:text-foreground"
          >
            <Mail size={16} />
            {supportEmail}
          </a>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {footerLinks.map((group) => (
            <div key={group.title}>
              <h2 className="text-sm font-semibold text-foreground">{group.title}</h2>
              <div className="mt-3 grid gap-2">
                {group.links.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className="text-sm font-medium text-muted-foreground transition hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div>
          <h2 className="text-sm font-semibold text-foreground">Built for reliable booking</h2>
          <div className="mt-3 grid gap-2">
            {trustItems.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-muted text-primary">
                  <Icon size={16} />
                </span>
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-4 text-xs font-medium text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <span>© {year} Ticketo. All rights reserved.</span>
          <span>Event discovery, reservations, and ticket confirmations.</span>
        </div>
      </div>
    </footer>
  )
}
