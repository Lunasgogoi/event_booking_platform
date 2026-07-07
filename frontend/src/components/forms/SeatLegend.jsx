export function SeatLegend() {
  const items = [
    { label: 'Available', className: 'bg-slate-50 border-slate-300' },
    { label: 'Selected', className: 'bg-rose-600 border-rose-600' },
    { label: 'Unavailable', className: 'bg-slate-200 border-slate-300' },
  ]

  return (
    <div className="flex flex-wrap gap-3 text-xs font-semibold text-slate-500">
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-2">
          <span className={`h-3 w-3 rounded border ${item.className}`} />
          {item.label}
        </span>
      ))}
    </div>
  )
}
