import { useClerk } from "@clerk/clerk-react"

export default function SideDrawer({ isOpen, onClose, user, edd, onNavigate }) {
  const { signOut } = useClerk()
  
  if (!isOpen) return null

  // Calculate current week
  let currentWeek = 0
  if (edd) {
    const dueDate = new Date(edd)
    const today = new Date()
    const diffTime = dueDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    const weeksToDue = Math.floor(diffDays / 7)
    currentWeek = 40 - weeksToDue
  }

  const handleAction = (action) => {
    onClose()
    if (action === "logout") {
      signOut()
    } else {
      onNavigate(action)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-[60] flex w-[280px] flex-col bg-white shadow-2xl transition-transform duration-300">
        {/* Header */}
        <div className="bg-primary/5 p-6 pt-12">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-container text-headline-sm font-bold text-on-primary-container shadow-sm">
              {user?.firstName?.[0] || "?"}
            </div>
            <div>
              <h2 className="font-heebo text-body-lg font-bold text-slate-800">
                {user?.fullName ? `ההריון של ${user.fullName}` : "ההריון שלי"}
              </h2>
              {currentWeek > 0 && (
                <span className="inline-block rounded-full bg-surface-container px-2 py-0.5 text-label-sm text-slate-600">
                  שבוע {currentWeek}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <div className="flex flex-1 flex-col py-4">
          <button 
            onClick={() => handleAction("timeline")}
            className="flex items-center gap-4 px-6 py-4 text-right transition-colors hover:bg-slate-50 active:bg-slate-100"
          >
            <span className="material-symbols-outlined text-primary">monitor_heart</span>
            <span className="font-body-base text-slate-700">ציר זמן בדיקות רפואיות</span>
          </button>
          
          <button 
            onClick={() => handleAction("food")}
            className="flex items-center gap-4 px-6 py-4 text-right transition-colors hover:bg-slate-50 active:bg-slate-100"
          >
            <span className="material-symbols-outlined text-primary">restaurant</span>
            <span className="font-body-base text-slate-700">מה מותר ואסור לאכול?</span>
          </button>
          
          <div className="my-2 h-px w-full bg-slate-100" />
          
          <button 
            onClick={() => handleAction("profile")}
            className="flex items-center gap-4 px-6 py-4 text-right transition-colors hover:bg-slate-50 active:bg-slate-100"
          >
            <span className="material-symbols-outlined text-slate-500">person</span>
            <span className="font-body-base text-slate-700">הגדרות ופרופיל</span>
          </button>
          
          <button 
            onClick={() => handleAction("logout")}
            className="mt-auto flex items-center gap-4 px-6 py-4 text-right transition-colors hover:bg-red-50 active:bg-red-100"
          >
            <span className="material-symbols-outlined text-error">logout</span>
            <span className="font-body-base text-error">התנתקות</span>
          </button>
        </div>
      </div>
    </>
  )
}
