export function FilterBar({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">{children}</div>
}
