export function Select({ value, onChange, options }) {
  return (
    <select value={value} onChange={onChange} className="min-h-12 rounded border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700">
      {options.map((option) => (
        <option key={option}>{option}</option>
      ))}
    </select>
  )
}
