import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function AuthInput({ label, type = 'text', placeholder, minLength, registration }) {
  return (
    <Label className="grid gap-2 text-sm font-medium text-foreground">
      {label}
      <Input
        type={type}
        placeholder={placeholder}
        minLength={minLength}
        {...registration}
        required
        className="h-12 bg-muted/40 px-3"
      />
    </Label>
  )
}
