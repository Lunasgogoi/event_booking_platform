import { format } from 'date-fns'
import { categories } from '@/lib/constants'

export function getCategoryPath(category) {
  return category === 'All' ? '/events' : `/events?category=${encodeURIComponent(category)}`
}

export function getCategoryFromSearchParams(searchParams) {
  const category = searchParams.get('category')
  return categories.includes(category) ? category : 'All'
}

export function normalizeEvent(event) {
  if (event.date) {
    return event
  }

  const startsAt = event.startsAt ? new Date(event.startsAt) : new Date()
  const totalSeats = event.totalSeats || 1
  const availableSeats = event.availableSeats ?? totalSeats
  const sold = Math.max(0, Math.min(100, Math.round(((totalSeats - availableSeats) / totalSeats) * 100)))

  return {
    id: event.slug || event._id,
    mongoId: event._id,
    title: event.title,
    description: event.description,
    category: event.category,
    city: event.venue?.city || 'Online',
    venue: event.venue?.name || 'Venue to be announced',
    address: event.venue?.address,
    date: startsAt,
    time: format(startsAt, 'h:mm a'),
    priceFrom: Number(event.priceFrom || 0),
    sold,
    image: event.poster?.url || '',
    seats: event.seats || [],
    totalSeats,
    availableSeats,
    status: event.status,
    raw: event,
  }
}
