export function SummaryRow({ label, value, strong = false }) {
  return (
    <div className={`flex items-center justify-between gap-4 ${strong ? 'text-lg font-semibold' : 'text-slate-600'}`}>
      <span>{label}</span>
      <span className={strong ? '' : 'font-semibold text-slate-950'}>{value}</span>
    </div>
  )
}
