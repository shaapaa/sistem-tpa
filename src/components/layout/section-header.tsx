interface SectionHeaderProps {
  title: string
  description?: string
  count?: number
  actions?: React.ReactNode
}

export function SectionHeader({ title, description, count, actions }: SectionHeaderProps) {
  return (
    <div className="flex items-end justify-between gap-4 border-b border-border/60 pb-3">
      <div>
        <h2 className="text-sm font-semibold text-foreground">{title}{count !== undefined && <span className="ml-2 font-mono text-xs font-normal text-muted-foreground">{count}</span>}</h2>
        {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </div>
  )
}
