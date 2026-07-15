import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { EventMeta } from './EventMeta'
import { EventPoster } from './EventPoster'

export function ComingSoonCard({ event }) {
  return (
    <Card className="gap-0 overflow-hidden rounded-lg py-0">
      <div className="relative h-48">
        <EventPoster event={event} className="h-full w-full" />
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/55 to-transparent" />
        <Badge className="absolute left-3 top-3 h-auto bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground shadow">
          Tickets coming soon
        </Badge>
        <Badge variant="secondary" className="absolute bottom-3 left-3 h-auto px-2 py-1 text-xs font-semibold shadow">
          {event.category}
        </Badge>
      </div>
      <CardContent className="p-4">
        <h3 className="line-clamp-2 min-h-[3.5rem] text-lg font-semibold leading-7">{event.title}</h3>
        <EventMeta event={event} />
        <p className="mt-4 text-sm font-semibold text-primary">Booking will open soon</p>
      </CardContent>
    </Card>
  )
}
