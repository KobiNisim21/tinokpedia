import { useState, useMemo } from "react"

// ---------------------------------------------------------------------------
// Food safety data – placeholder items.
// The user will provide the full dataset later to fill in all categories.
// status: "forbidden" | "limited" | "allowed"
// ---------------------------------------------------------------------------
const FOOD_ITEMS = [
  // --- אסור בהחלט ---
  { id: "raw_fish",     name: "דגים נאים (סושי)",           reason: "חשש לליסטריה",                icon: "set_meal",   status: "forbidden", category: "בשר ודגים" },
  { id: "alcohol",      name: "אלכוהול",                    reason: "פגיעה בהתפתחות העובר",         icon: "liquor",     status: "forbidden", category: "אלכוהול וקפאין" },

  // --- מומלץ להגביל ---
  { id: "caffeine",     name: "קפאין",                      reason: 'עד 200 מ"ג ביום',              icon: "local_cafe", status: "limited",   category: "אלכוהול וקפאין" },

  // --- מותר ומומלץ ---
  { id: "cooked_eggs",  name: "ביצים מבושלות היטב",        reason: "מקור מצוין לחלבון וקולין",     icon: "egg",        status: "allowed",   category: "ביצים" },
]

const CATEGORIES = ["הכל", "בשר ודגים", "גבינות", "ביצים", "אלכוהול וקפאין"]

const STATUS_CONFIG = {
  forbidden: {
    title: "אסור בהחלט",
    icon: "cancel",
    titleColor: "text-error",
    cardBg: "bg-error-container",
    iconBg: "bg-white",
    iconColor: "text-error",
    textColor: "text-on-error-container",
    subtextColor: "text-on-secondary-fixed-variant",
  },
  limited: {
    title: "מומלץ להגביל",
    icon: "warning",
    titleColor: "text-secondary",
    cardBg: "bg-secondary-container",
    iconBg: "bg-white",
    iconColor: "text-secondary",
    textColor: "text-on-secondary-container",
    subtextColor: "text-on-secondary-fixed-variant",
  },
  allowed: {
    title: "מותר ומומלץ",
    icon: "check_circle",
    titleColor: "text-tertiary",
    cardBg: "bg-tertiary-container",
    iconBg: "bg-white",
    iconColor: "text-tertiary",
    textColor: "text-on-tertiary-container",
    subtextColor: "text-on-secondary-fixed-variant",
  },
}

export default function FoodSafetyModal({ isOpen, onClose }) {
  const [search, setSearch] = useState("")
  const [activeCategory, setActiveCategory] = useState("הכל")

  const filtered = useMemo(() => {
    let items = FOOD_ITEMS
    if (activeCategory !== "הכל") {
      items = items.filter((f) => f.category === activeCategory)
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      items = items.filter(
        (f) => f.name.includes(q) || f.reason.includes(q) || f.category.includes(q),
      )
    }
    return items
  }, [search, activeCategory])

  const forbidden = filtered.filter((f) => f.status === "forbidden")
  const limited   = filtered.filter((f) => f.status === "limited")
  const allowed   = filtered.filter((f) => f.status === "allowed")

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-surface">
      {/* Header */}
      <header className="sticky top-0 z-50 flex h-16 w-full items-center justify-between bg-white px-margin-mobile shadow-[0_12px_12px_0_rgba(30,41,59,0.04)]">
        <button
          onClick={onClose}
          className="rounded-full p-2 text-primary transition-colors duration-150 ease-in-out hover:bg-surface-container-low active:scale-95"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
        <h1 className="font-headline-xl text-headline-xl font-bold text-on-surface">
          תזונה ובטיחות מזון
        </h1>
        <div className="w-10" />
      </header>

      {/* Scrollable content */}
      <main className="flex-1 overflow-y-auto px-margin-mobile pb-8 pt-6">
        <div className="mx-auto flex max-w-[600px] flex-col gap-stack-gap">
          {/* Title */}
          <h2 className="font-headline-3xl-mobile text-headline-3xl-mobile text-primary mb-1">
            מה מותר ומה אסור?
          </h2>

          {/* Search */}
          <div className="relative mb-2 rounded-full bg-white shadow-[0_4px_12px_0_rgba(30,41,59,0.04)]">
            <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-outline">
              search
            </span>
            <input
              type="text"
              className="w-full rounded-full border-none bg-transparent py-3 pl-4 pr-12 font-body-base text-body-base text-on-surface placeholder:text-outline focus:ring-0"
              placeholder="חפשי מאכל מסוים..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Category Chips */}
          <div className="no-scrollbar flex gap-2 overflow-x-auto pb-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`whitespace-nowrap rounded-full px-4 py-2 font-label-caps text-label-caps transition-colors ${
                  activeCategory === cat
                    ? "bg-primary text-white"
                    : "border border-surface-variant bg-white text-on-surface"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* --- Forbidden Section --- */}
          {forbidden.length > 0 && (
            <FoodSection status="forbidden" items={forbidden} />
          )}

          {/* --- Limited Section --- */}
          {limited.length > 0 && (
            <FoodSection status="limited" items={limited} />
          )}

          {/* --- Allowed Section --- */}
          {allowed.length > 0 && (
            <FoodSection status="allowed" items={allowed} />
          )}

          {/* Empty state */}
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <span className="material-symbols-outlined mb-4 text-6xl text-outline opacity-40">
                search_off
              </span>
              <p className="font-body-base text-on-surface-variant">
                לא נמצאו תוצאות עבור &quot;{search}&quot;
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Section component – renders a section header + list of food cards
// ---------------------------------------------------------------------------
function FoodSection({ status, items }) {
  const cfg = STATUS_CONFIG[status]

  return (
    <section className="mt-4 flex flex-col gap-4">
      <h3 className={`flex items-center gap-2 font-headline-xl text-headline-xl ${cfg.titleColor}`}>
        <span
          className="material-symbols-outlined"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          {cfg.icon}
        </span>
        {cfg.title}
      </h3>

      {items.map((item) => (
        <div
          key={item.id}
          className={`flex items-start gap-4 rounded-3xl p-card-padding shadow-[0_12px_12px_0_rgba(30,41,59,0.04)] ${cfg.cardBg}`}
        >
          <div className={`flex items-center justify-center rounded-full p-3 ${cfg.iconBg} ${cfg.iconColor}`}>
            <span className="material-symbols-outlined">{item.icon}</span>
          </div>
          <div>
            <h4 className={`font-headline-xl text-headline-xl ${cfg.textColor}`}>
              {item.name}
            </h4>
            <p className={`mt-1 font-body-sm text-body-sm ${cfg.subtextColor}`}>
              {item.reason}
            </p>
          </div>
        </div>
      ))}
    </section>
  )
}
