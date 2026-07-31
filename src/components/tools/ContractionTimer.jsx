import React, { useState, useEffect, useRef } from "react";

export default function ContractionTimer() {
  const [timing, setTiming] = useState(false);
  const [currentStart, setCurrentStart] = useState(null);
  const [currentElapsed, setCurrentElapsed] = useState(0);
  const [contractions, setContractions] = useState([]);
  
  const timerRef = useRef(null);

  useEffect(() => {
    if (timing) {
      timerRef.current = setInterval(() => {
        setCurrentElapsed((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timing]);

  const formatTime = (totalSeconds) => {
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
    const s = (totalSeconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const handleToggle = () => {
    if (!timing) {
      // Start timing
      setCurrentStart(new Date());
      setCurrentElapsed(0);
      setTiming(true);
    } else {
      // Stop timing
      setTiming(false);
      const newContraction = {
        start: currentStart,
        end: new Date(),
        durationSec: currentElapsed
      };
      setContractions([newContraction, ...contractions]);
    }
  };

  const check511Rule = () => {
    if (contractions.length < 3) return false;
    
    // Check last 3 contractions
    const recent = contractions.slice(0, 3);
    
    // Check if all last 3 lasted >= 60 seconds
    const allLongEnough = recent.every(c => c.durationSec >= 60);
    if (!allLongEnough) return false;
    
    // Check intervals between the 3 most recent contractions
    for (let i = 0; i < 2; i++) {
      const currentC = recent[i];
      const prevC = recent[i + 1];
      const intervalSec = (currentC.start.getTime() - prevC.end.getTime()) / 1000;
      if (intervalSec > 300) return false; // More than 5 minutes
    }
    
    return true;
  };

  const is511 = check511Rule();

  return (
    <div className="flex flex-col gap-4 font-assistant" dir="rtl">
      {/* Current contraction timer */}
      <div className="rounded-3xl bg-white p-card-padding soft-shadow text-center">
        <h2 className="font-heebo text-headline-xl text-primary mb-2">טיימר צירים</h2>
        <div className="text-headline-3xl-mobile text-slate-800 font-bold my-4 animate-pulse" dir="ltr">
          {formatTime(currentElapsed)}
        </div>
        
        <button
          onClick={handleToggle}
          className={`rounded-xl py-4 font-heebo text-headline-xl w-full flex items-center justify-center gap-2 transition-colors ${
            !timing ? "bg-primary text-white" : "bg-error-container text-on-error-container"
          }`}
        >
          {!timing ? (
            <>
              <span className="material-symbols-outlined">play_arrow</span>
              התחלת ציר
            </>
          ) : (
            <>
              <span className="material-symbols-outlined">stop</span>
              סיום ציר
            </>
          )}
        </button>
      </div>

      {/* 5-1-1 Rule indicator */}
      {contractions.length >= 3 && (
        <div className={`rounded-3xl p-card-padding soft-shadow transition-colors ${
          is511 ? "bg-error-container text-on-error-container" : "bg-primary-container text-on-primary-container"
        }`}>
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-3xl">
              {is511 ? "warning" : "info"}
            </span>
            <span className="font-heebo text-body-base font-bold">
              {is511 
                ? "הצירים קרובים ותכופים — שקלי לפנות לבית החולים"
                : "הצירים עדיין לא תכופים מספיק"
              }
            </span>
          </div>
        </div>
      )}

      {/* Recent contractions list */}
      <div className="rounded-3xl bg-white p-card-padding soft-shadow">
        <h3 className="font-heebo text-body-base text-primary mb-4 border-b pb-2">היסטוריית צירים</h3>
        {contractions.length === 0 ? (
          <div className="text-body-sm text-on-surface-variant text-center py-4">
            טרם תועדו צירים
          </div>
        ) : (
          <div className="flex flex-col">
            {contractions.map((c, i) => {
              // Calculate interval from previous contraction
              let intervalStr = "-";
              if (i < contractions.length - 1) {
                const prev = contractions[i + 1];
                const intervalSec = Math.floor((c.start.getTime() - prev.end.getTime()) / 1000);
                if (intervalSec >= 0) {
                  intervalStr = formatTime(intervalSec);
                }
              }

              return (
                <div key={i} className="flex justify-between items-center text-body-sm text-slate-800 border-b border-surface-variant py-3 last:border-b-0">
                  <span className="font-bold">ציר #{contractions.length - i}</span>
                  <div className="flex flex-col items-center">
                    <span className="text-label-caps text-on-surface-variant text-xs">משך</span>
                    <span dir="ltr">{formatTime(c.durationSec)}</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-label-caps text-on-surface-variant text-xs">מרווח</span>
                    <span dir="ltr">{intervalStr}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
