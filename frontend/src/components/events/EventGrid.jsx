import { EventCard } from './EventCard'

export function EventGrid({ items }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  )
}
