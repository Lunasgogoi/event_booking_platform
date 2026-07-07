import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FieldIcon } from '@/components/shared'

export function SearchPanel() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')

  function submitSearch(event) {
    event.preventDefault()

    const params = new URLSearchParams()
    if (query.trim()) {
      params.set('search', query.trim())
    }

    navigate(params.toString() ? `/events?${params.toString()}` : '/events')
  }

  return (
    <form onSubmit={submitSearch} className="grid gap-3 rounded-lg border border-border bg-card p-3 shadow-sm md:grid-cols-[1fr_auto]">
      <FieldIcon icon={Search}>
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search events"
          className="h-auto w-full border-0 bg-transparent px-0 py-0 text-sm font-normal text-foreground focus-visible:border-transparent focus-visible:ring-0 dark:bg-transparent"
        />
      </FieldIcon>
      <Button type="submit" className="h-12 px-5 py-3 text-sm font-semibold">
        Search
      </Button>
    </form>
  )
}
