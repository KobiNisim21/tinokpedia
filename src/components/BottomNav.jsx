/**
 * BottomNav — סרגל ניווט תחתון (mobile)
 * Fixed bottom bar with four destinations. The active item gets the
 * pill-shaped primary-container highlight, matching the prototype.
 */
const ITEMS = [
  { id: "tracking", label: "מעקב", icon: "pregnant_woman" },
  { id: "community", label: "קהילה", icon: "group" },
  { id: "tools", label: "כלים", icon: "handyman" },
  { id: "profile", label: "פרופיל", icon: "person" },
]

export default function BottomNav({ active = "tracking", onSelect }) {
  return (
    <nav className="fixed bottom-0 left-1/2 z-50 w-full max-w-[600px] -translate-x-1/2 border-t border-outline-variant bg-white nav-shadow md:hidden">
      <div className="flex h-20 items-center justify-around px-2">
        {ITEMS.map((item) => {
          const isActive = item.id === active
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect?.(item.id)}
              aria-current={isActive ? "page" : undefined}
              className={`flex flex-col items-center justify-center rounded-full px-4 py-1 duration-200 active:scale-90 ${
                isActive
                  ? "bg-primary-container text-on-primary-container"
                  : "text-on-surface-variant transition-colors hover:text-primary"
              }`}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span className="mt-1 font-heebo text-label-caps">{item.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
