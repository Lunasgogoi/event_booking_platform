import { Ticket } from 'lucide-react'

export function EventPoster({ event, className = '' }) {
  const title = event?.title || 'Event'
  const category = event?.category || 'Event'

  if (event?.image) {
    return <img src={event.image} alt={title} className={`${className} object-cover`} />
  }

  return (
    <div className={`${className} grid place-items-center bg-slate-900 p-4 text-center text-white`}>
      <div>
        <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded bg-white text-slate-950">
          <Ticket size={22} />
        </div>
        <p className="text-xs font-semibold uppercase tracking-wide text-white/60">{category}</p>
        <p className="mt-1 line-clamp-2 text-sm font-semibold">{title}</p>
      </div>
    </div>
  )
}
