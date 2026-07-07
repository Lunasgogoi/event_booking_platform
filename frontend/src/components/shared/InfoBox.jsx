export function InfoBox({ label, value }) {
  return (
    <div className="rounded border border-white/10 bg-white/10 p-4">
      <p className="text-sm font-medium text-white/65">{label}</p>
      <p className="mt-1 text-lg font-semibold text-white">{value}</p>
    </div>
  )
}
