import { Link } from 'react-router-dom'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export function EmptyState({ icon: Icon, title, message, actionLabel, actionTo, onAction }) {
  const actionClass = 'mt-5 h-11 rounded bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800'

  return (
    <Card className="rounded border border-dashed border-slate-300 bg-white py-0 text-center ring-0">
      <CardContent className="p-8">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded bg-slate-100 text-slate-700">
          <Icon size={22} />
        </span>
        <h2 className="mt-4 text-xl font-semibold text-slate-950">{title}</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{message}</p>
        {actionTo && (
          <Link to={actionTo} className={cn(buttonVariants(), actionClass)}>
            {actionLabel}
          </Link>
        )}
        {onAction && (
          <Button type="button" onClick={onAction} className={actionClass}>
            {actionLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
