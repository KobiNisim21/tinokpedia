export default function FoodSafetyModal({ isOpen, onClose }) {
  if (!isOpen) return null

  return (
    <>
      <div 
        className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div className="fixed inset-x-0 bottom-0 z-50 flex h-[70vh] flex-col overflow-hidden rounded-t-[32px] bg-white shadow-2xl transition-transform duration-300">
        <div className="flex items-center justify-between border-b border-surface-container-highest px-6 py-4">
          <h2 className="font-heebo text-headline-sm font-bold text-slate-800">
            מה מותר ואסור לאכול?
          </h2>
          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-low text-slate-500 hover:bg-surface-container"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        
        <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
          <span className="material-symbols-outlined mb-4 text-6xl text-primary opacity-50">
            restaurant
          </span>
          <h3 className="font-heebo text-headline-sm font-bold text-slate-800">
            בקרוב!
          </h3>
          <p className="mt-2 text-body-base text-slate-500">
            אנחנו עובדים על הכנת מאגר מקיף של מזונות ותרופות המותרים והאסורים במהלך ההריון. השארו מעודכנים!
          </p>
        </div>
      </div>
    </>
  )
}
