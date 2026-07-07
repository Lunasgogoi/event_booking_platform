import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function AuthInput({ label, type = 'text', placeholder, minLength, registration }) {
  return (
    <Label className="grid gap-2 text-sm font-medium text-slate-700">
      {label}
      <Input
        type={type}
        placeholder={placeholder}
        minLength={minLength}
        {...registration}
        required
        className="h-12 rounded border border-slate-200 bg-slate-50 px-3 text-slate-950 outline-none focus:border-rose-500"
      />
    </Label>
  )
}
