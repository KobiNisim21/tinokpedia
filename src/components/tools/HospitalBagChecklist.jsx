import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { readStoredJson, userStorageKey, writeStoredJson } from '../../utils/storage';

const DEFAULT_ITEMS = {
  forMom: {
    title: "עבורך",
    icon: "woman",
    items: [
      "כותנת לידה / פיג'מה נוחה",
      "גלימה / חלוק",
      "כפכפים",
      "גרביים",
      "הלבשה תחתונה חד פעמית",
      "תחבושות לאחר לידה",
      "חזיית הנקה",
      "רפידות הנקה",
      "מוצרי טואלטיקה (שמפו, סבון, מברשת שיניים)",
      "מגבת",
      "בגדים לחזרה הביתה",
      "חטיפים ומשקאות",
      "מטען לטלפון",
    ],
  },
  forBaby: {
    title: "עבור התינוק",
    icon: "child_care",
    items: [
      "בגדי גוף (3-4)",
      "אוברולים (2-3)",
      "כובע",
      "גרביים קטנים",
      "שמיכה",
      "חיתולים לתינוק",
      "מגבונים",
      "סלקל / אמבט קטן",
      "כסא בטיחות לרכב",
    ],
  },
  documents: {
    title: "מסמכים וציוד כללי",
    icon: "description",
    items: [
      "תעודת זהות",
      "כרטיס קופת חולים",
      "תוצאות בדיקות ואולטרסאונד",
      "תוכנית לידה (אם יש)",
      "ארנק ואמצעי תשלום",
      "מצלמה / טלפון טעון",
    ],
  },
};

export default function HospitalBagChecklist() {
  const { user } = useUser();
  const [checkedItems, setCheckedItems] = useState(new Set());
  const [customItems, setCustomItems] = useState([]);
  const [newItemText, setNewItemText] = useState("");
  const [expandedCategory, setExpandedCategory] = useState(null);
  const checkedStorageKey = userStorageKey(user?.id, 'hospital-bag');
  const customStorageKey = userStorageKey(user?.id, 'hospital-bag-custom');

  useEffect(() => {
    setCheckedItems(new Set(readStoredJson(checkedStorageKey, [])));
    setCustomItems(readStoredJson(customStorageKey, []));
  }, [checkedStorageKey, customStorageKey]);

  const saveChecked = (newChecked) => {
    setCheckedItems(newChecked);
    writeStoredJson(checkedStorageKey, [...newChecked]);
  };

  const toggleItem = (item) => {
    const next = new Set(checkedItems);
    if (next.has(item)) {
      next.delete(item);
    } else {
      next.add(item);
    }
    saveChecked(next);
  };

  const addCustomItem = () => {
    const trimmed = newItemText.trim();
    if (!trimmed) return;
    const newCustomItems = [...customItems, trimmed];
    setCustomItems(newCustomItems);
    writeStoredJson(customStorageKey, newCustomItems);
    setNewItemText("");
  };

  const removeCustomItem = (item) => {
    const newCustomItems = customItems.filter((ci) => ci !== item);
    setCustomItems(newCustomItems);
    writeStoredJson(customStorageKey, newCustomItems);
    
    // Also remove from checked if it was checked
    if (checkedItems.has(item)) {
      const nextChecked = new Set(checkedItems);
      nextChecked.delete(item);
      saveChecked(nextChecked);
    }
  };

  const toggleCategory = (key) => {
    setExpandedCategory((prev) => (prev === key ? null : key));
  };

  let totalItemsCount = customItems.length;
  let totalCheckedCount = 0;

  Object.values(DEFAULT_ITEMS).forEach((cat) => {
    totalItemsCount += cat.items.length;
    cat.items.forEach((item) => {
      if (checkedItems.has(item)) {
        totalCheckedCount++;
      }
    });
  });

  customItems.forEach((item) => {
    if (checkedItems.has(item)) {
      totalCheckedCount++;
    }
  });

  const progressPct = totalItemsCount === 0 ? 0 : Math.round((totalCheckedCount / totalItemsCount) * 100);

  return (
    <div className="flex flex-col gap-4" dir="rtl">
      {/* Overall progress */}
      <div className="rounded-3xl bg-white p-card-padding soft-shadow">
        <h3 className="font-heebo text-headline-xl text-primary mb-2">תיק הלידה שלך</h3>
        <div className="flex justify-between items-center mb-2">
          <p className="font-assistant text-body-base text-slate-800">
            {totalCheckedCount} מתוך {totalItemsCount} פריטים ארוזים
          </p>
          <span className="font-assistant text-label-caps text-primary">{progressPct}%</span>
        </div>
        <div className="h-3 w-full rounded-full bg-surface-container-high overflow-hidden">
          <div 
            className="h-full rounded-full bg-primary transition-all duration-500" 
            style={{ width: `${progressPct}%` }} 
          />
        </div>
      </div>

      {/* Category sections */}
      {Object.entries(DEFAULT_ITEMS).map(([key, category]) => {
        const catCheckedCount = category.items.filter((item) => checkedItems.has(item)).length;
        const isExpanded = expandedCategory === key;

        return (
          <div key={key} className="rounded-3xl bg-white p-card-padding soft-shadow">
            <button
              onClick={() => toggleCategory(key)}
              className="flex w-full items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">{category.icon}</span>
                <h3 className="font-heebo text-headline-xl text-slate-800">{category.title}</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-assistant text-body-sm text-on-surface-variant">
                  {catCheckedCount}/{category.items.length}
                </span>
                <span className={`material-symbols-outlined text-on-surface-variant transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                  expand_more
                </span>
              </div>
            </button>
            
            {isExpanded && (
              <div className="mt-4 flex flex-col gap-2 border-t border-surface-container-low pt-4">
                {category.items.map((item) => {
                  const isChecked = checkedItems.has(item);
                  return (
                    <label key={item} className="flex items-center gap-3 py-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={isChecked} 
                        onChange={() => toggleItem(item)}
                        className="h-5 w-5 rounded border-outline-variant text-primary focus:ring-primary-container" 
                      />
                      <span className={`font-assistant text-body-base ${isChecked ? 'line-through text-on-surface-variant' : 'text-slate-800'}`}>
                        {item}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Custom items section */}
      <div className="rounded-3xl bg-white p-card-padding soft-shadow">
        <h3 className="font-heebo text-headline-xl text-slate-800 mb-4">פריטים שהוספתי</h3>
        
        {customItems.length > 0 && (
          <div className="flex flex-col gap-2 mb-4">
            {customItems.map((item, index) => {
              const isChecked = checkedItems.has(item);
              return (
                <div key={index} className="flex items-center justify-between">
                  <label className="flex items-center gap-3 py-2 cursor-pointer flex-1">
                    <input 
                      type="checkbox" 
                      checked={isChecked} 
                      onChange={() => toggleItem(item)}
                      className="h-5 w-5 rounded border-outline-variant text-primary focus:ring-primary-container" 
                    />
                    <span className={`font-assistant text-body-base ${isChecked ? 'line-through text-on-surface-variant' : 'text-slate-800'}`}>
                      {item}
                    </span>
                  </label>
                  <button 
                    onClick={() => removeCustomItem(item)}
                    className="text-on-surface-variant hover:text-error transition-colors"
                  >
                    <span className="material-symbols-outlined">delete</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex gap-2">
          <input
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addCustomItem(); }}
            placeholder="הוסיפי פריט..."
            className="flex-1 rounded-xl border-none bg-surface-container-low px-4 py-3 font-assistant text-body-base text-slate-800 outline-none placeholder:text-outline focus:ring-2 focus:ring-primary-container"
          />
          <button 
            onClick={addCustomItem}
            className="rounded-xl bg-primary-container px-4 py-3 font-heebo text-body-base text-on-primary-container transition-opacity hover:opacity-90 active:scale-[0.98]"
          >
            הוסיפי
          </button>
        </div>
      </div>
    </div>
  );
}
