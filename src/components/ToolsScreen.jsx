import { useState } from "react"
import Header from "./Header"
import BottomNav from "./BottomNav"
import KickCounter from "./tools/KickCounter"
import ContractionTimer from "./tools/ContractionTimer"
import HospitalBagChecklist from "./tools/HospitalBagChecklist"

const TOOLS = [
  { id: "kicks", label: "מונה בעיטות", icon: "touch_app" },
  { id: "contractions", label: "טיימר צירים", icon: "timer" },
  { id: "bag", label: "תיק לידה", icon: "luggage" },
]

/**
 * ToolsScreen — מסך כלים
 *
 * Three interactive pregnancy tools accessible via a segmented toggle:
 * 1. Kick Counter (מונה בעיטות)
 * 2. Contraction Timer (טיימר צירים)
 * 3. Hospital Bag Checklist (תיק לידה)
 */
export default function ToolsScreen({ onTabChange, notificationProps = {} }) {
  const [activeTool, setActiveTool] = useState("kicks")

  return (
    <div className="flex min-h-screen flex-col md:items-center">
      <Header {...notificationProps} />

      <main className="mx-auto flex w-full max-w-[600px] flex-1 flex-col gap-stack-gap px-margin-mobile py-6 pb-24 md:pb-6">
        {/* Page title */}
        <div className="mb-1">
          <h2 className="font-heebo text-headline-3xl-mobile text-slate-800">
            כלים 🛠️
          </h2>
        </div>

        {/* Tool selector — segmented toggle */}
        <div className="flex rounded-xl bg-surface-container-low p-1">
          {TOOLS.map((tool) => (
            <button
              key={tool.id}
              type="button"
              onClick={() => setActiveTool(tool.id)}
              className={`flex flex-1 flex-col items-center gap-1 rounded-lg py-2.5 transition-colors duration-200 ${
                activeTool === tool.id
                  ? "bg-white font-semibold text-primary shadow-sm"
                  : "text-on-surface-variant"
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">
                {tool.icon}
              </span>
              <span className="font-heebo text-label-caps">{tool.label}</span>
            </button>
          ))}
        </div>

        {/* Active tool */}
        <div className="mt-1">
          {activeTool === "kicks" && <KickCounter />}
          {activeTool === "contractions" && <ContractionTimer />}
          {activeTool === "bag" && <HospitalBagChecklist />}
        </div>
      </main>

      <BottomNav active="tools" onSelect={onTabChange} />
    </div>
  )
}
