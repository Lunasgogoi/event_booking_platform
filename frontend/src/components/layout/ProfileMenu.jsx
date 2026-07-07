import { Link } from 'react-router-dom'
import { ChevronDown, Info, LogOut, Mail, Settings, Users } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  getAvatarUrl,
  getOrganizerLink,
  getUserInitial,
} from '@/lib/user'

export function ProfileMenu({ user, onLogout }) {
  const avatarUrl = getAvatarUrl(user)
  const initial = getUserInitial(user)
  const organizerLink = getOrganizerLink(user)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-background px-1.5 pr-2 text-sm font-semibold text-foreground transition hover:bg-muted"
        aria-haspopup="menu"
        aria-label="Open profile menu"
      >
        <Avatar className="h-8 w-8 bg-primary text-primary-foreground">
          {avatarUrl && <AvatarImage src={avatarUrl} alt="" />}
          <AvatarFallback className="bg-primary text-sm font-semibold text-primary-foreground">{initial}</AvatarFallback>
        </Avatar>
        <ChevronDown size={16} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-72 overflow-hidden rounded-lg p-0 shadow-2xl">
        <div className="border-b border-border px-4 py-3">
          <p className="truncate text-sm font-semibold text-foreground">{user?.name || 'Ticketo user'}</p>
          <p className="mt-0.5 truncate text-xs font-medium text-muted-foreground">{user?.email}</p>
        </div>
        <div className="p-2">
          <DropdownMenuItem render={<Link to="/settings" />} className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold text-foreground hover:bg-accent">
            <Settings size={17} className="text-muted-foreground" />
            Settings
          </DropdownMenuItem>
          <DropdownMenuItem render={<Link to="/about" />} className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold text-foreground hover:bg-accent">
            <Info size={17} className="text-muted-foreground" />
            About us
          </DropdownMenuItem>
          {user?.role !== 'admin' && (
            <DropdownMenuItem render={<Link to={organizerLink.to} />} className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold text-foreground hover:bg-accent">
              <Users size={17} className="text-muted-foreground" />
              {organizerLink.label}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem render={<Link to="/contact" />} className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold text-foreground hover:bg-accent">
            <Mail size={17} className="text-muted-foreground" />
            Contact us
          </DropdownMenuItem>
        </div>
        <DropdownMenuSeparator className="m-0" />
        <div className="p-2">
          <DropdownMenuItem
            onClick={onLogout}
            variant="destructive"
            className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm font-semibold"
          >
            <LogOut size={17} />
            Logout
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
