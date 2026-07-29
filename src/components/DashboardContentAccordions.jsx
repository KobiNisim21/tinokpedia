import { useState } from "react"

/**
 * A single expandable accordion card.
 * `variant="tip"` renders the rose-highlighted weekly-tip style with an info icon.
 */
function AccordionCard({ title, children, variant = "default", isOpen, onToggle }) {
  const isTip = variant === "tip"
  const contentId = `accordion-${title}`

  return (
    <div
      className={`overflow-hidden rounded-xl soft-shadow ${
        isTip ? "bg-rose-100" : "bg-white"
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={contentId}
        className="flex w-full items-center justify-between p-4 text-right"
      >
        <div className="flex items-center gap-2">
          {isTip && (
            <span className="material-symbols-outlined text-rose-800">info</span>
          )}
          <h3 className="font-heebo text-headline-xl text-slate-800">{title}</h3>
        </div>
        <span
          className={`material-symbols-outlined text-slate-500 transition-transform duration-300 ${
            isOpen ? "rotate-180" : ""
          }`}
        >
          expand_more
        </span>
      </button>

      {/* Animated collapse using a grid-rows trick (no fixed max-height guesswork) */}
      <div
        id={contentId}
        className={`grid transition-all duration-300 ease-out ${
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="px-4 pb-4">
            <p
              className={`font-assistant text-body-sm leading-relaxed ${
                isTip ? "text-slate-800 opacity-80" : "text-slate-500"
              }`}
            >
              {children}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * DashboardContentAccordions
 * The three weekly content cards: what's happening to the fetus, to your body,
 * and the weekly tip / preparations. Behaves as an accordion where opening one
 * card closes the others. Pass your own `items` to override the defaults.
 */
export default function DashboardContentAccordions({ items = [] }) {
  const cards = items

  // First card open by default, like the prototype.
  const [openIndex, setOpenIndex] = useState(0)

  const toggle = (index) =>
    setOpenIndex((current) => (current === index ? -1 : index))

  return (
    <div className="flex flex-col gap-3">
      {cards.map((card, index) => (
        <AccordionCard
          key={card.title}
          title={card.title}
          variant={card.variant}
          isOpen={openIndex === index}
          onToggle={() => toggle(index)}
        >
          {card.body}
        </AccordionCard>
      ))}
    </div>
  )
}
