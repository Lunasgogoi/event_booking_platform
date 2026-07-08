import { Ticket } from 'lucide-react'

export function EventPoster({ event, className = '', compact = false }) {
  const title = event?.title || 'Event'
  const category = event?.category || 'Event'

  if (event?.image) {
    return <img src={event.image} alt={title} className={`${className} object-cover`} />
  }

  if (compact) {
    return (
      <div className={`${className} grid place-items-center overflow-hidden bg-foreground text-background`}>
        <div className="grid h-7 w-7 place-items-center rounded-md bg-background text-foreground">
          <Ticket size={16} />
        </div>
      </div>
    )
  }

  return (
    <div className={`${className} grid place-items-center overflow-hidden bg-foreground p-4 text-center text-background`}>
      <div>
        <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-lg bg-background text-foreground">
          <Ticket size={22} />
        </div>
        <p className="text-xs font-semibold uppercase tracking-wide text-background/60">{category}</p>
        <p className="mt-1 line-clamp-2 text-sm font-semibold">{title}</p>
      </div>
    </div>
  )
}
