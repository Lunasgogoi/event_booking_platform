import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Heart } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EventMeta } from './EventMeta'
import { EventPoster } from './EventPoster'

export function EventCard({ event }) {
  return (
    <Card className="gap-0 overflow-hidden rounded-lg py-0 transition hover:-translate-y-1 hover:shadow-md">
      <div className="relative h-48">
        <Link to={`/events/${event.id}`} className="block h-full">
          <EventPoster event={event} className="h-full w-full" />
        </Link>
        <Button
          type="button"
          variant="secondary"
          size="icon-lg"
          onClick={() => toast.success('Added to wishlist')}
          className="absolute right-3 top-3 shadow"
          aria-label="Save event"
        >
          <Heart size={18} />
        </Button>
        <Badge variant="secondary" className="absolute left-3 top-3 h-auto px-2 py-1 text-xs font-semibold shadow">
          {event.category}
        </Badge>
      </div>
      <Link to={`/events/${event.id}`} className="block">
        <CardContent className="p-4">
          <h3 className="line-clamp-2 min-h-[3.5rem] text-lg font-semibold leading-7">{event.title}</h3>
          <EventMeta event={event} />
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              from <span className="font-semibold text-foreground">INR {event.priceFrom.toLocaleString('en-IN')}</span>
            </p>
            <Badge variant="secondary" className="h-auto px-2 py-1 text-xs font-semibold text-primary">
              {event.sold}% sold
            </Badge>
          </div>
        </CardContent>
      </Link>
    </Card>
  )
}
