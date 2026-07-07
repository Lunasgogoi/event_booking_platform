export function Select({ value, onChange, options }) {
  return (
    <select value={value} onChange={onChange} className="min-h-12 rounded-lg border border-input bg-background px-3 text-sm font-medium text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50">
      {options.map((option) => (
        <option key={option}>{option}</option>
      ))}
    </select>
  )
}
