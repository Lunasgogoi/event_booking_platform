export function getUserInitial(user) {
  const source = user?.name || user?.email || 'User'
  return source.trim().charAt(0).toUpperCase()
}

export function getAvatarUrl(user) {
  return user?.avatar?.url || user?.avatarUrl || ''
}

export function getOrganizerLink(user) {
  if (user?.role === 'organizer') {
    return { to: '/organizer/events', label: 'Organizer dashboard' }
  }

  const status = user?.organizerProfile?.status || 'none'
  if (status === 'pending') {
    return { to: '/organizer/apply', label: 'Organizer request' }
  }

  if (['rejected', 'revoked'].includes(status)) {
    return { to: '/organizer/apply', label: 'Apply again' }
  }

  if (status === 'suspended') {
    return { to: '/organizer/apply', label: 'Organizer status' }
  }

  return { to: '/organizer/apply', label: 'Become organizer' }
}
