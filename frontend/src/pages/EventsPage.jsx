import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Filter, Search } from 'lucide-react'
import { EmptyState, FieldIcon, LoadingPanel } from '@/components/shared'
import { EventGrid } from '@/components/events'
import { Select } from '@/components/forms'
import { Input } from '@/components/ui/input'
import { categories } from '@/lib/constants'
import { getCategoryFromSearchParams, normalizeEvent } from '@/lib/events'
import api, { getApiErrorMessage } from '@/services/api'

export function EventsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('search') || '')
  const [city, setCity] = useState('All cities')
  const [remoteEvents, setRemoteEvents] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const category = getCategoryFromSearchParams(searchParams)
  const cityOptions = ['All cities', ...new Set(remoteEvents.map((event) => event.city))]

  const filteredEvents = useMemo(() => {
    return remoteEvents.filter((event) => {
      const searchText = [
        event.title,
        event.category,
        event.city,
        event.venue,
        event.description,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      const matchesQuery = !query || searchText.includes(query.toLowerCase())
      const matchesCategory = category === 'All' || event.category === category
      const matchesCity = city === 'All cities' || event.city === city
      return matchesQuery && matchesCategory && matchesCity
    })
  }, [category, city, query, remoteEvents])

  function handleCategoryChange(value) {
    const nextParams = new URLSearchParams(searchParams)

    if (value === 'All') {
      nextParams.delete('category')
    } else {
      nextParams.set('category', value)
    }

    setSearchParams(nextParams)
  }

  function handleQueryChange(value) {
    const nextParams = new URLSearchParams(searchParams)

    if (value.trim()) {
      nextParams.set('search', value)
    } else {
      nextParams.delete('search')
    }

    setQuery(value)
    setSearchParams(nextParams)
  }

  useEffect(() => {
    async function loadEvents() {
      setIsLoading(true)

      try {
        const { data } = await api.get('/events', {
          params: {
            search: query || undefined,
            category: category === 'All' ? undefined : category,
            city: city === 'All cities' ? undefined : city,
          },
        })
        setRemoteEvents(data.events ? data.events.map(normalizeEvent) : [])
      } catch (error) {
        toast.error(getApiErrorMessage(error))
        setRemoteEvents([])
      } finally {
        setIsLoading(false)
      }
    }

    loadEvents()
  }, [category, city, query])

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-primary">Explore</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal text-foreground">Browse events</h1>
        </div>
        <div className="flex flex-wrap gap-3">
          <FieldIcon icon={Search}>
            <Input
              value={query}
              onChange={(event) => handleQueryChange(event.target.value)}
              placeholder="Search events"
              className="h-auto w-full border-0 bg-transparent px-0 py-0 focus-visible:border-transparent focus-visible:ring-0 dark:bg-transparent"
            />
          </FieldIcon>
          <Select value={category} onChange={(event) => handleCategoryChange(event.target.value)} options={categories} />
          <Select
            value={city}
            onChange={(event) => setCity(event.target.value)}
            options={cityOptions}
          />
        </div>
      </div>
      <div className="mb-5 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
        <Filter size={16} /> {isLoading ? 'Loading events...' : `${filteredEvents.length} events available`}
      </div>
      {isLoading ? (
        <LoadingPanel label="Loading events..." />
      ) : filteredEvents.length ? (
        <EventGrid items={filteredEvents} />
      ) : (
        <EmptyState
          icon={Search}
          title="No events found"
          message="Adjust the filters or publish an event from the admin area."
          actionLabel="Clear search"
          onAction={() => {
            setQuery('')
            setSearchParams({})
            setCity('All cities')
          }}
        />
      )}
    </main>
  )
}
