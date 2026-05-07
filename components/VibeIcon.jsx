"use client"

const VIBE_CONFIG = {
  chill: {
    emoji: "😌",
    label: "Chill",
    color: "text-indigo-300",
    bg: "bg-indigo-500/15",
    border: "border-indigo-400/25",
    gradient: "from-indigo-400 to-blue-400",
    hex: "#818cf8",
  },
  coffee: {
    emoji: "☕",
    label: "Coffee",
    color: "text-amber-300",
    bg: "bg-amber-500/15",
    border: "border-amber-400/25",
    gradient: "from-amber-400 to-yellow-400",
    hex: "#f59e0b",
  },
  chai: {
    emoji: "🫖",
    label: "Chai",
    color: "text-orange-300",
    bg: "bg-orange-500/15",
    border: "border-orange-400/25",
    gradient: "from-orange-400 to-amber-400",
    hex: "#fb923c",
  },
  food: {
    emoji: "🍕",
    label: "Food",
    color: "text-red-300",
    bg: "bg-red-500/15",
    border: "border-red-400/25",
    gradient: "from-red-400 to-orange-400",
    hex: "#ef4444",
  },
  burger: {
    emoji: "🍔",
    label: "Burger",
    color: "text-yellow-300",
    bg: "bg-yellow-500/15",
    border: "border-yellow-400/25",
    gradient: "from-yellow-400 to-orange-400",
    hex: "#eab308",
  },
  pizza: {
    emoji: "🍕",
    label: "Pizza",
    color: "text-red-300",
    bg: "bg-red-500/15",
    border: "border-red-400/25",
    gradient: "from-red-400 to-orange-400",
    hex: "#f97316",
  },
  dessert: {
    emoji: "🍰",
    label: "Dessert",
    color: "text-pink-300",
    bg: "bg-pink-500/15",
    border: "border-pink-400/25",
    gradient: "from-pink-400 to-rose-400",
    hex: "#f472b6",
  },
  walk: {
    emoji: "🚶",
    label: "Walk",
    color: "text-emerald-300",
    bg: "bg-emerald-500/15",
    border: "border-emerald-400/25",
    gradient: "from-emerald-400 to-green-400",
    hex: "#34d399",
  },
  drinks: {
    emoji: "🍸",
    label: "Drinks",
    color: "text-violet-300",
    bg: "bg-violet-500/15",
    border: "border-violet-400/25",
    gradient: "from-violet-400 to-purple-400",
    hex: "#a78bfa",
  },
  anything: {
    emoji: "✨",
    label: "Anything",
    color: "text-cyan-300",
    bg: "bg-cyan-500/15",
    border: "border-cyan-400/25",
    gradient: "from-cyan-400 to-teal-400",
    hex: "#22d3ee",
  },
}

export function getVibeConfig(vibe) {
  return VIBE_CONFIG[vibe] || VIBE_CONFIG.anything
}

export function VibeIcon({ vibe, size = "md", showLabel = false, selected = false, onClick, className = "" }) {
  const config = getVibeConfig(vibe)
  const sizes = {
    sm: "h-8 w-8 text-sm",
    md: "h-10 w-10 text-lg",
    lg: "h-14 w-14 text-2xl",
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        group relative inline-flex flex-col items-center gap-1.5
        transition-all duration-300 ease-spring
        ${onClick ? "cursor-pointer" : "cursor-default"}
        ${className}
      `}
    >
      <span
        className={`
          ${sizes[size]}
          inline-flex items-center justify-center rounded-2xl
          border ${config.border} ${config.bg}
          transition-all duration-300
          ${selected
            ? `ring-2 ring-white/40 scale-110 shadow-lg ${config.bg}`
            : "hover:scale-105"
          }
        `}
      >
        <span className="transition-transform duration-200 group-hover:scale-110">
          {config.emoji}
        </span>
      </span>
      {showLabel && (
        <span className={`text-xs font-semibold capitalize transition-colors ${selected ? "text-white" : "text-slate-400"}`}>
          {config.label}
        </span>
      )}
      {selected && (
        <span className="absolute -bottom-1 h-1 w-5 rounded-full bg-white/60" />
      )}
    </button>
  )
}

export function VibePill({ vibe, className = "" }) {
  const config = getVibeConfig(vibe)
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${config.bg} ${config.color} border ${config.border} ${className}`}>
      <span>{config.emoji}</span>
      {config.label}
    </span>
  )
}
