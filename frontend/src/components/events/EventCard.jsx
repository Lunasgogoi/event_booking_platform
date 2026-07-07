import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Heart } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { EventMeta } from './EventMeta'
import { EventPoster } from './EventPoster'

export function EventCard({ event }) {
  return (
    <Card className="gap-0 overflow-hidden rounded border border-slate-200 bg-white py-0 shadow-sm ring-0 transition hover:-translate-y-1 hover:shadow-md">
      <Link to={`/events/${event.id}`} className="block">
        <div className="relative h-48">
          <EventPoster event={event} className="h-full w-full" />
          <button
            type="button"
            onClick={(clickEvent) => {
              clickEvent.preventDefault()
              toast.success('Added to wishlist')
            }}
            className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded bg-white text-slate-700 shadow"
            aria-label="Save event"
          >
            <Heart size={18} />
          </button>
          <Badge variant="secondary" className="absolute left-3 top-3 h-auto rounded bg-white px-2 py-1 text-xs font-semibold text-slate-950 shadow">
            {event.category}
          </Badge>
        </div>
        <CardContent className="p-4">
          <h3 className="line-clamp-2 min-h-[3.5rem] text-lg font-semibold leading-7">{event.title}</h3>
          <EventMeta event={event} />
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              from <span className="font-semibold text-slate-950">INR {event.priceFrom.toLocaleString('en-IN')}</span>
            </p>
            <Badge variant="secondary" className="h-auto rounded bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700">
              {event.sold}% sold
            </Badge>
          </div>
        </CardContent>
      </Link>
    </Card>
  )
}
