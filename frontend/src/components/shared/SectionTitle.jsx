export function SectionTitle({ kicker, title }) {
  return (
    <div>
      <p className="text-sm font-semibold uppercase tracking-wide text-rose-600">{kicker}</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-normal">{title}</h1>
    </div>
  )
}
