export function FieldIcon({ icon: Icon, children }) {
  return (
    <label className="flex min-h-12 items-center gap-3 rounded-lg border border-border bg-muted/40 px-3 text-sm font-semibold text-muted-foreground">
      <Icon size={18} className="shrink-0 text-muted-foreground/70" />
      {children}
    </label>
  )
}
