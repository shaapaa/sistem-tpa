import { Landmark } from "lucide-react"

interface EmptyStateProps {
  message?: string
  hint?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({ message = "Belum ada data", hint, action, className }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-card/40 px-6 py-10 text-center ${className ?? ""}`}>
      <div className="relative mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
        <Landmark className="h-6 w-6 text-primary" />
        <span className="absolute -right-1 -top-1 flex h-3 w-3 items-center justify-center">
          <span className="absolute h-3 w-3 animate-ping rounded-full bg-amber-400/60" />
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
        </span>
      </div>
      <p className="text-sm font-medium text-foreground">{message}</p>
      {hint && <p className="mt-1 max-w-[36ch] text-xs leading-5 text-muted-foreground">{hint}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}