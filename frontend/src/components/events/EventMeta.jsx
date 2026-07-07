import { format } from 'date-fns'
import { CalendarDays, MapPin } from 'lucide-react'

export function EventMeta({ event, light = false }) {
  const tone = light ? 'text-white/85' : 'text-muted-foreground'

  return (
    <div className={`mt-3 grid gap-2 text-sm font-semibold ${tone}`}>
      <span className="inline-flex items-center gap-2">
        <CalendarDays size={16} /> {format(event.date, 'EEE, dd MMM')} / {event.time}
      </span>
      <span className="inline-flex items-center gap-2">
        <MapPin size={16} /> {event.venue}, {event.city}
      </span>
    </div>
  )
}
