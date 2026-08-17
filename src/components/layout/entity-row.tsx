import { cn } from "@/lib/utils"

interface EntityRowProps {
  initials: string
  title: string
  meta?: string
  badges?: React.ReactNode
  actions?: React.ReactNode
  onClick?: () => void
}

export function EntityRow({ initials, title, meta, badges, actions, onClick }: EntityRowProps) {
  return (
    <article onClick={onClick} className={cn("flex items-center gap-3 border-b border-border/60 px-3 py-3 sm:px-4", onClick && "cursor-pointer transition-colors hover:bg-primary/[0.025]")}>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-sm font-semibold text-primary">{initials}</div>
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-semibold text-foreground">{title}</h3>
        {meta && <p className="mt-0.5 truncate text-xs text-muted-foreground">{meta}</p>}
        {badges && <div className="mt-1.5 flex flex-wrap gap-1.5">{badges}</div>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
    </article>
  )
}
