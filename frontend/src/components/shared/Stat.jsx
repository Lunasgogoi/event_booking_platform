import { Card, CardContent } from '@/components/ui/card'

export function Stat({ icon: Icon, label, value }) {
  return (
    <Card className="rounded-lg py-0">
      <CardContent className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
            <Icon size={20} />
          </span>
        </div>
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  )
}
