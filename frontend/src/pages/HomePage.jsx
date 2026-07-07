import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, Ticket } from 'lucide-react'
import { EmptyState, LoadingPanel, SectionHeader } from '@/components/shared'
import { CategoryStrip, EventGrid, EventMeta, EventPoster, SearchPanel } from '@/components/events'
import { normalizeEvent } from '@/lib/events'
import api from '@/services/api'

export function HomePage() {
  const [featuredEvents, setFeaturedEvents] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const featuredEvent = featuredEvents[0]

  useEffect(() => {
    async function loadFeaturedEvents() {
      setIsLoading(true)

      try {
        const { data } = await api.get('/events', { params: { limit: 4 } })
        setFeaturedEvents(data.events ? data.events.map(normalizeEvent) : [])
      } catch {
        setFeaturedEvents([])
      } finally {
        setIsLoading(false)
      }
    }

    loadFeaturedEvents()
  }, [])

  return (
    <main>
      <section className="bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-10">
          <div className="flex flex-col justify-center gap-6">
            <div>
              <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-normal text-slate-950 sm:text-5xl lg:text-6xl">
                Discover events, reserve seats, and book tickets faster.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                Concerts, comedy, sports, food festivals, and business sessions curated into one fast booking flow.
              </p>
            </div>
            <SearchPanel />
            <CategoryStrip />
          </div>

          <div className="relative min-h-[420px] overflow-hidden rounded border border-slate-200 bg-slate-950">
            {featuredEvent ? (
              <>
                <EventPoster event={featuredEvent} className="h-full min-h-[420px] w-full opacity-80" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-5 text-white sm:p-7">
                  <div className="mb-4 flex flex-wrap gap-2">
                    <span className="rounded bg-white px-3 py-1 text-xs font-semibold text-slate-950">Featured</span>
                    <span className="rounded bg-emerald-400 px-3 py-1 text-xs font-semibold text-emerald-950">
                      {featuredEvent.sold}% sold
                    </span>
                  </div>
                  <h2 className="text-2xl font-semibold sm:text-3xl">{featuredEvent.title}</h2>
                  <EventMeta event={featuredEvent} light />
                  <Link
                    to={`/events/${featuredEvent.id}`}
                    className="mt-5 inline-flex items-center gap-2 rounded bg-white px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-slate-100"
                  >
                    <Ticket size={18} /> Book now
                  </Link>
                </div>
              </>
            ) : (
              <div className="flex min-h-[420px] flex-col justify-end p-6 text-white sm:p-8">
                <div className="mb-6 grid h-14 w-14 place-items-center rounded bg-white text-slate-950">
                  <Ticket size={28} />
                </div>
                <p className="text-sm font-semibold uppercase tracking-wide text-white/60">
                  {isLoading ? 'Loading events' : 'No published events'}
                </p>
                <h2 className="mt-2 max-w-md text-3xl font-semibold">
                  {isLoading ? 'Finding available events...' : 'Publish an event to feature it here.'}
                </h2>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <SectionHeader title="Trending events" action="View all" to="/events" />
        {isLoading ? (
          <LoadingPanel label="Loading events..." />
        ) : featuredEvents.length ? (
          <EventGrid items={featuredEvents.slice(0, 4)} />
        ) : (
          <EmptyState
            icon={CalendarDays}
            title="No published events yet"
            message="Create and publish an event from the admin area to start showing live inventory here."
            actionLabel="Manage events"
            actionTo="/admin/events"
          />
        )}
      </section>
    </main>
  )
}
