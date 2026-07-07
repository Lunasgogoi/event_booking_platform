export function SeatLegend() {
  const items = [
    { label: 'Available', className: 'border-border bg-background' },
    { label: 'Selected', className: 'border-primary bg-primary' },
    { label: 'Unavailable', className: 'border-border bg-muted' },
  ]

  return (
    <div className="flex flex-wrap gap-3 text-xs font-semibold text-muted-foreground">
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-2">
          <span className={`h-3 w-3 rounded border ${item.className}`} />
          {item.label}
        </span>
      ))}
    </div>
  )
}
