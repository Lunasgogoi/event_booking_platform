import { Link } from 'react-router-dom'
import { categories } from '@/lib/constants'
import { getCategoryPath } from '@/lib/events'

export function CategoryStrip() {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {categories.map((category, index) => (
        <Link
          key={category}
          to={getCategoryPath(category)}
          className={`shrink-0 rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
            index === 0
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          {category}
        </Link>
      ))}
    </div>
  )
}
