import Link from "next/link"
import { ArrowLeft, Menu, MoonStar } from "lucide-react"
import { formatIslamicDate } from "@/lib/islamic-date"
import { useAppNav } from "@/components/layout/app-nav-context"

interface PageHeaderProps {
  eyebrow?: string
  title: string
  description?: string
  backHref?: string
  action?: React.ReactNode
}

export function PageHeader({ eyebrow, title, description, backHref, action }: PageHeaderProps) {
  const { openMenu } = useAppNav()
  const { masehiShort, hijri } = formatIslamicDate()

  return (
    <header className="relative overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br from-card via-card to-primary/[0.06] px-3.5 py-3 sm:px-6 sm:py-6">
      <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-primary via-amber-400 to-primary" />
      <div className="absolute -right-12 -top-14 h-36 w-36 rounded-full border border-primary/10" />
      <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-primary/5" />
      <MoonStar className="absolute -right-3 -top-3 h-16 w-16 rotate-12 text-primary/[0.07]" />
      <div className="relative flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="flex min-w-0 items-start gap-2 sm:gap-3">
          {openMenu && (
            <button
              onClick={openMenu}
              className="mt-0.5 shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
              aria-label="Buka menu"
            >
              <Menu className="h-4 w-4" />
            </button>
          )}
          {backHref && (
            <Link href={backHref} aria-label="Kembali" className="mt-0.5 shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              {eyebrow && (
                <p className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-primary sm:text-[10px]">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  {eyebrow}
                </p>
              )}
              {masehiShort && <span className="hidden items-center gap-1 text-[10px] font-medium tracking-[0.04em] text-muted-foreground sm:inline-flex"><MoonStar className="h-3 w-3 text-amber-600/70" />{masehiShort}</span>}
              {hijri && <span className="hidden items-center gap-1 text-[10px] font-medium tracking-[0.04em] text-muted-foreground sm:inline-flex">· {hijri}</span>}
            </div>
            <h1 className="mt-1 text-lg font-semibold leading-tight tracking-[-0.03em] text-foreground sm:mt-2 sm:text-[1.9rem]">{title}</h1>
            {(masehiShort || hijri) && <p className="mt-1 text-[10px] font-medium text-muted-foreground sm:hidden">{masehiShort}{hijri ? ` · ${hijri}` : ""}</p>}
            {description && <p className="mt-1 hidden max-w-[62ch] text-sm leading-6 text-muted-foreground sm:block">{description}</p>}
          </div>
        </div>
        {action && <div className="shrink-0 sm:pt-1">{action}</div>}
      </div>
    </header>
  )
}