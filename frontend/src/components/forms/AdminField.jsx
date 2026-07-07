export function AdminField({ label, type = 'text', registration, required = false, min }) {
  return (
    <label className="grid gap-2 text-sm font-medium text-slate-700">
      {label}
      <input
        {...registration}
        type={type}
        required={required}
        min={min}
        className="h-11 rounded border border-slate-200 bg-slate-50 px-3 outline-none focus:border-rose-500"
      />
    </label>
  )
}
