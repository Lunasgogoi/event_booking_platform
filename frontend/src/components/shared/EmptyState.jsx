import { Link } from 'react-router-dom'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export function EmptyState({ icon: Icon, title, message, actionLabel, actionTo, onAction }) {
  const actionClass = 'mt-5 h-11 px-4 py-3 text-sm font-semibold'

  return (
    <Card className="rounded-lg border-dashed py-0 text-center">
      <CardContent className="p-8">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-lg bg-muted text-muted-foreground">
          <Icon size={22} />
        </span>
        <h2 className="mt-4 text-xl font-semibold text-foreground">{title}</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">{message}</p>
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
