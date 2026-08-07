import { useState, useMemo } from "react"

// ---------------------------------------------------------------------------
// Inline SVG icons – independent of any icon font subset.
// ---------------------------------------------------------------------------
const SvgIcons = {
  close: (cls) => (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="24" height="24">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  search: (cls) => (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  ),
  searchOff: (cls) => (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="48" height="48">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="4" y1="4" x2="18" y2="18" strokeDasharray="2 2"/>
    </svg>
  ),
  // Section header icons
  cancel: (cls) => (
    <svg className={cls} viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
      <path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"/>
    </svg>
  ),
  warning: (cls) => (
    <svg className={cls} viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
      <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
    </svg>
  ),
  checkCircle: (cls) => (
    <svg className={cls} viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
    </svg>
  ),
  // Food item icons
  fish: (cls) => (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="24" height="24">
      <path d="M6.5 12c3-6 10-6 14-3-4 3-11 3-14 3z"/><path d="M6.5 12c3 6 10 6 14 3"/><circle cx="18" cy="11" r="0.5" fill="currentColor"/><path d="M2 12s2-3 4.5-3M2 12s2 3 4.5 3"/>
    </svg>
  ),
  wine: (cls) => (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="24" height="24">
      <path d="M8 2h8l-1 7a5 5 0 01-6 0L8 2z"/><line x1="12" y1="14" x2="12" y2="20"/><line x1="8" y1="22" x2="16" y2="22"/><line x1="7" y1="2" x2="17" y2="2"/>
    </svg>
  ),
  coffee: (cls) => (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="24" height="24">
      <path d="M17 8h1a4 4 0 110 8h-1"/><path d="M3 8h14v9a4 4 0 01-4 4H7a4 4 0 01-4-4V8z"/><line x1="6" y1="2" x2="6" y2="4"/><line x1="10" y1="2" x2="10" y2="4"/><line x1="14" y1="2" x2="14" y2="4"/>
    </svg>
  ),
  egg: (cls) => (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="24" height="24">
      <path d="M12 22c4.418 0 8-3.582 8-8 0-5.523-3.582-12-8-12S4 8.477 4 14c0 4.418 3.582 8 8 8z"/>
    </svg>
  ),
}

// Default fallback icon
const defaultIcon = (cls) => (
  <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="24" height="24">
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
)

// Map icon key → SVG renderer
const ICON_MAP = {
  set_meal: SvgIcons.fish,
  liquor: SvgIcons.wine,
  local_cafe: SvgIcons.coffee,
  egg: SvgIcons.egg,
}

function FoodIcon({ name, className }) {
  const renderer = ICON_MAP[name] || defaultIcon
  return renderer(className || "")
}

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
    headerIcon: SvgIcons.cancel,
    titleColor: "text-error",
    cardBg: "bg-error-container",
    iconBg: "bg-white",
    iconColor: "text-error",
    textColor: "text-on-error-container",
    subtextColor: "text-on-secondary-fixed-variant",
  },
  limited: {
    title: "מומלץ להגביל",
    headerIcon: SvgIcons.warning,
    titleColor: "text-secondary",
    cardBg: "bg-secondary-container",
    iconBg: "bg-white",
    iconColor: "text-secondary",
    textColor: "text-on-secondary-container",
    subtextColor: "text-on-secondary-fixed-variant",
  },
  allowed: {
    title: "מותר ומומלץ",
    headerIcon: SvgIcons.checkCircle,
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
          {SvgIcons.close("w-6 h-6")}
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
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-outline">
              {SvgIcons.search("")}
            </div>
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
              <div className="mb-4 text-outline opacity-40">
                {SvgIcons.searchOff("")}
              </div>
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
        {cfg.headerIcon("w-6 h-6")}
        {cfg.title}
      </h3>

      {items.map((item) => (
        <div
          key={item.id}
          className={`flex items-start gap-4 rounded-3xl p-card-padding shadow-[0_12px_12px_0_rgba(30,41,59,0.04)] ${cfg.cardBg}`}
        >
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full shadow-sm ${cfg.iconBg} ${cfg.iconColor}`}>
            <FoodIcon name={item.icon} className="w-5 h-5" />
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
