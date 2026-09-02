import { Landmark } from "lucide-react"

export function IslamicBanner({ text, source }: { text: string; source?: string }) {
  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-emerald-800 via-primary to-teal-600 p-3 text-white sm:p-5">
      <div className="absolute -right-8 -top-10 h-32 w-32 rounded-full border border-white/15" />
      <div className="absolute -bottom-12 -left-8 h-32 w-32 rounded-full border border-white/10" />
      <div className="absolute right-6 top-4 text-3xl text-white/10">&#65021;</div>
      <div className="relative flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15 sm:h-10 sm:w-10">
          <Landmark className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-medium leading-5 sm:text-sm sm:leading-6">{text}</p>
          {source && <p className="mt-0.5 hidden text-xs text-white/70 sm:block">{source}</p>}
        </div>
      </div>
    </div>
  )
}