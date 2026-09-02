import Link from "next/link"
import { cn } from "@/lib/utils"

interface StatCardProps {
  label: string
  value: string | number
  detail?: string
  icon: React.ComponentType<{ className?: string }>
  className: string
  href?: string
}

export function StatCard({ label, value, detail, icon: Icon, className, href }: StatCardProps) {
  const content = (
    <div className={cn("group relative overflow-hidden rounded-xl p-3 text-white shadow-sm sm:p-4", className)}>
      <Icon className="absolute -bottom-3 -right-3 h-12 w-12 text-white/10 sm:h-16 sm:w-16" />
      <div className="absolute -left-6 -top-6 h-14 w-14 rounded-full bg-white/10 sm:h-16 sm:w-16" />
      <div className="relative">
        <div className="mb-1.5 inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white/15 sm:h-8 sm:w-8">
          <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </div>
        <p className="font-mono text-xl font-semibold tracking-[-0.04em] sm:text-2xl">{value}</p>
        <p className="mt-0.5 text-[11px] font-medium text-white/85 sm:text-xs">{label}</p>
        {detail && <p className="mt-0.5 text-[10px] text-white/60">{detail}</p>}
      </div>
    </div>
  )
  return href ? (
    <Link href={href} className="block transition-transform hover:-translate-y-0.5">{content}</Link>
  ) : content
}