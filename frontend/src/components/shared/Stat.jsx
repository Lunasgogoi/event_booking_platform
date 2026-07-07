import { Card, CardContent } from '@/components/ui/card'

export function Stat({ icon: Icon, label, value }) {
  return (
    <Card className="rounded border border-slate-200 bg-white py-0 ring-0">
      <CardContent className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <span className="grid h-10 w-10 place-items-center rounded bg-rose-50 text-rose-600">
            <Icon size={20} />
          </span>
        </div>
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <p className="mt-1 text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  )
}
