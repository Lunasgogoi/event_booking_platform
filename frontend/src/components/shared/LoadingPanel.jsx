import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function LoadingPanel({ label }) {
  return (
    <Card className="rounded-lg py-0 text-center">
      <CardContent className="p-6" aria-busy="true" aria-live="polite">
        <p className="text-sm font-semibold text-muted-foreground">{label}</p>
        <div className="mx-auto mt-4 grid max-w-md gap-2">
          <Skeleton className="mx-auto h-3 w-44" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="mx-auto h-3 w-2/3" />
        </div>
      </CardContent>
    </Card>
  )
}
