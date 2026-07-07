import { Link } from 'react-router-dom'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function SectionHeader({ title, action, to }) {
  return (
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 className="text-2xl font-semibold tracking-normal">{title}</h2>
      <Link to={to} className={cn(buttonVariants({ variant: 'link' }), 'h-auto p-0 text-sm font-semibold')}>
        {action}
      </Link>
    </div>
  )
}
