import Link from "next/link"
import { ArrowUpRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface MetricItem {
  label: string
  value: string | number
  detail?: string
  href?: string
  tone?: "primary" | "neutral" | "amber"
}

export function MetricRail({ items }: { items: MetricItem[] }) {
  return (
    <div className="grid grid-cols-2 divide-x divide-y divide-border/70 border-y border-border/70 lg:grid-cols-4 lg:divide-y-0">
      {items.map((item) => {
        const content = (
          <div className="group relative px-3 py-3 sm:px-5 sm:py-5">
            <div className="flex items-start justify-between gap-3">
              <p className="eyebrow">{item.label}</p>
              {item.href && <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />}
            </div>
            <p className={cn("mt-1.5 font-mono text-2xl font-semibold tracking-[-0.06em] sm:mt-2 sm:text-3xl", item.tone === "primary" && "text-primary", item.tone === "amber" && "text-amber-700")}>{item.value}</p>
            {item.detail && <p className="mt-1 text-xs text-muted-foreground">{item.detail}</p>}
          </div>
        )
        return item.href ? <Link key={item.label} href={item.href} className="transition-colors hover:bg-primary/[0.035]">{content}</Link> : <div key={item.label}>{content}</div>
      })}
    </div>
  )
}
