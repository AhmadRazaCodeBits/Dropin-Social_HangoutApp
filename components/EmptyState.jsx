"use client"

export function EmptyState({ icon, title, description, action, className = "" }) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 text-center ${className}`}>
      {icon && (
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 text-3xl animate-float">
          {icon}
        </div>
      )}
      <h3 className="font-display text-xl font-bold text-white">{title}</h3>
      {description && (
        <p className="mt-2 max-w-xs text-sm leading-relaxed text-slate-400">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
