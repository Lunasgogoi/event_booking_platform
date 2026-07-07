import { Link } from 'react-router-dom'

export function SectionHeader({ title, action, to }) {
  return (
    <div className="mb-5 flex items-center justify-between gap-4">
      <h2 className="text-2xl font-semibold tracking-normal">{title}</h2>
      <Link to={to} className="text-sm font-semibold text-rose-600 hover:text-rose-700">
        {action}
      </Link>
    </div>
  )
}
