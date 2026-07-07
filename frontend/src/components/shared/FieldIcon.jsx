export function FieldIcon({ icon: Icon, children }) {
  return (
    <label className="flex min-h-12 items-center gap-3 rounded border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-600">
      <Icon size={18} className="shrink-0 text-slate-400" />
      {children}
    </label>
  )
}
