export function CapaianBar({ label, value, pct, color }: { label: string; value: string; pct: number; color: string }) {
  return (
    <div className="rounded-lg border border-border/70 p-3">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="font-medium text-foreground">{label}</span>
        <span className="text-right text-xs text-muted-foreground">{value}</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
    </div>
  )
}