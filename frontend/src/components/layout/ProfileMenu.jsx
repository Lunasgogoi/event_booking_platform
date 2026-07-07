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
        className="inline-flex h-10 items-center gap-2 rounded border border-slate-300 bg-white px-1.5 pr-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-100"
        aria-haspopup="menu"
        aria-label="Open profile menu"
      >
        <Avatar className="h-8 w-8 bg-slate-950 text-white">
          {avatarUrl && <AvatarImage src={avatarUrl} alt="" />}
          <AvatarFallback className="bg-slate-950 text-sm font-semibold text-white">{initial}</AvatarFallback>
        </Avatar>
        <ChevronDown size={16} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-72 overflow-hidden rounded border border-slate-200 bg-white p-0 shadow-2xl">
        <div className="border-b border-slate-200 px-4 py-3">
          <p className="truncate text-sm font-semibold text-slate-950">{user?.name || 'Ticketo user'}</p>
          <p className="mt-0.5 truncate text-xs font-medium text-slate-500">{user?.email}</p>
        </div>
        <div className="p-2">
          <DropdownMenuItem render={<Link to="/settings" />} className="flex w-full items-center gap-3 rounded px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100">
            <Settings size={17} className="text-slate-400" />
            Settings
          </DropdownMenuItem>
          <DropdownMenuItem render={<Link to="/about" />} className="flex w-full items-center gap-3 rounded px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100">
            <Info size={17} className="text-slate-400" />
            About us
          </DropdownMenuItem>
          {user?.role !== 'admin' && (
            <DropdownMenuItem render={<Link to={organizerLink.to} />} className="flex w-full items-center gap-3 rounded px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100">
              <Users size={17} className="text-slate-400" />
              {organizerLink.label}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem render={<Link to="/contact" />} className="flex w-full items-center gap-3 rounded px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100">
            <Mail size={17} className="text-slate-400" />
            Contact us
          </DropdownMenuItem>
        </div>
        <DropdownMenuSeparator className="m-0 bg-slate-200" />
        <div className="p-2">
          <DropdownMenuItem
            onClick={onLogout}
            variant="destructive"
            className="flex w-full items-center gap-3 rounded px-3 py-2.5 text-left text-sm font-semibold text-rose-700 hover:bg-rose-50"
          >
            <LogOut size={17} />
            Logout
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
