import Link from "next/link"
import { ArrowLeft } from "lucide-react"

interface PageHeaderProps {
  eyebrow?: string
  title: string
  description?: string
  backHref?: string
  action?: React.ReactNode
}

export function PageHeader({ eyebrow, title, description, backHref, action }: PageHeaderProps) {
  return (
    <header className="flex items-start justify-between gap-4 border-b border-border/70 pb-6">
      <div className="flex min-w-0 items-start gap-3">
        {backHref && (
          <Link href={backHref} aria-label="Kembali" className="mt-1 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        )}
        <div className="min-w-0">
          {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
          <h1 className="text-2xl font-semibold tracking-[-0.035em] text-foreground sm:text-[2rem]">{title}</h1>
          {description && <p className="mt-1 max-w-[62ch] text-sm leading-6 text-muted-foreground">{description}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  )
}
