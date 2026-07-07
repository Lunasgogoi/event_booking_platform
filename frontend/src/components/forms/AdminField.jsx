import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function AdminField({ label, type = 'text', registration, required = false, min }) {
  return (
    <Label className="grid gap-2 text-sm font-medium text-foreground">
      {label}
      <Input
        {...registration}
        type={type}
        required={required}
        min={min}
        className="h-11 bg-muted/40 px-3"
      />
    </Label>
  )
}
