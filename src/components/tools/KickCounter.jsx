import React, { useState, useEffect, useRef } from "react";
import { useUser } from "@clerk/clerk-react";
import { readStoredJson, userStorageKey, writeStoredJson } from "../../utils/storage";

export default function KickCounter() {
  const { user } = useUser();
  const [counting, setCounting] = useState(false);
  const [count, setCount] = useState(0);
  const [_startTime, setStartTime] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [sessions, setSessions] = useState([]);
  
  const timerRef = useRef(null);
  const sessionsStorageKey = userStorageKey(user?.id, "kick-sessions");

  useEffect(() => {
    setSessions(readStoredJson(sessionsStorageKey, []));
  }, [sessionsStorageKey]);

  useEffect(() => {
    if (counting) {
      timerRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [counting]);

  const formatTime = (totalSeconds) => {
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
    const s = (totalSeconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const handleStart = () => {
    setCounting(true);
    setCount(0);
    setStartTime(new Date());
    setElapsed(0);
  };

  const handleStop = (finalCount, finalElapsed) => {
    setCounting(false);
    if (timerRef.current) clearInterval(timerRef.current);
    
    const session = {
      date: new Date().toISOString(),
      count: finalCount,
      elapsed: finalElapsed,
      duration: formatTime(finalElapsed)
    };
    
    const updatedSessions = [session, ...sessions];
    setSessions(updatedSessions);
    writeStoredJson(sessionsStorageKey, updatedSessions);
  };

  const handleKick = () => {
    if (!counting) return;
    const newCount = count + 1;
    setCount(newCount);
    
    if (newCount >= 10) {
      handleStop(newCount, elapsed);
    }
  };

  const handleManualStop = () => {
    handleStop(count, elapsed);
  };

  return (
    <div className="flex flex-col gap-4 font-assistant" dir="rtl">
      {/* Status display */}
      <div className="rounded-3xl bg-white p-card-padding soft-shadow text-center">
        <h2 className="font-heebo text-headline-xl text-primary mb-2">מונה בעיטות עובריות</h2>
        <div className="text-headline-3xl-mobile text-slate-800 font-bold my-4">
          {count}/10
        </div>
        <div className="text-body-base text-on-surface-variant mb-4">
          זמן: {formatTime(elapsed)}
        </div>
        <div className="h-2 w-full rounded-full bg-surface-container-high mb-2 overflow-hidden">
          <div 
            className="h-full rounded-full bg-primary transition-all duration-300" 
            style={{ width: `${Math.min(100, (count / 10) * 100)}%` }} 
          />
        </div>
        {count >= 10 && !counting && (
          <div className="text-primary font-bold text-body-base mt-2">
            השלמת 10 תנועות, כל הכבוד!
          </div>
        )}
      </div>

      {/* Main kick button */}
      <button
        onClick={handleKick}
        disabled={!counting}
        className="mx-auto flex h-36 w-36 items-center justify-center rounded-full bg-primary-container text-on-primary-container shadow-lg transition-transform active:scale-90 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <div className="flex flex-col items-center gap-1">
          <span className="material-symbols-outlined text-4xl">touch_app</span>
          <span className="font-heebo text-body-sm">לחצי בכל תנועה</span>
        </div>
      </button>

      {/* Start/Stop buttons */}
      <div className="flex gap-4 w-full">
        {!counting ? (
          <button 
            onClick={handleStart}
            className="flex-1 rounded-xl bg-primary text-white py-3 font-heebo text-body-base shadow-sm"
          >
            התחלת ספירה
          </button>
        ) : (
          <button 
            onClick={handleManualStop}
            className="flex-1 rounded-xl bg-surface-container-low text-on-surface-variant py-3 font-heebo text-body-base shadow-sm"
          >
            סיום ספירה
          </button>
        )}
      </div>

      {/* Past sessions list */}
      {sessions.length > 0 && (
        <div className="rounded-3xl bg-white p-card-padding soft-shadow mt-2">
          <h3 className="font-heebo text-body-base text-primary mb-4 border-b pb-2">היסטוריית ספירות</h3>
          <div className="flex flex-col gap-3">
            {sessions.map((session, i) => {
              const d = new Date(session.date);
              const dateStr = `${d.getDate()}/${d.getMonth() + 1} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
              return (
                <div key={i} className="flex justify-between items-center text-body-sm text-slate-800 border-b border-surface-variant last:border-b-0 pb-2 last:pb-0">
                  <span>{dateStr}</span>
                  <span>{session.count} תנועות</span>
                  <span dir="ltr">{session.duration} דקות</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
