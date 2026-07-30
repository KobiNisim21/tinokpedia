import { useRef, useState } from 'react';
import logo from '../assets/logo.png';
import { eddFromInputs, parseDdMmYyyy, isoToDdMmYyyy } from '../utils/pregnancy';

function MethodOption({ label, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 flex flex-row items-center justify-center h-12 rounded-full border transition-all duration-200 gap-2 ${
        selected 
          ? 'bg-primary-container border-primary text-on-primary-container font-heebo font-medium shadow-sm' 
          : 'bg-white border-outline text-on-surface font-heebo'
      }`}
    >
      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selected ? 'border-primary' : 'border-outline'}`}>
        {selected && <div className="w-2.5 h-2.5 bg-primary rounded-full" />}
      </div>
      <span className="text-body-medium">{label}</span>
    </button>
  );
}

const maskDate = (value) => {
  const v = value.replace(/\D/g, '');
  if (v.length >= 5) {
    return `${v.slice(0, 2)}/${v.slice(2, 4)}/${v.slice(4, 8)}`;
  }
  else if (v.length >= 3) {
    return `${v.slice(0, 2)}/${v.slice(2, 4)}`;
  }
  return v;
};

export default function OnboardingForm({ onComplete }) {
  const [name, setName] = useState('');
  const [method, setMethod] = useState('last_period');
  const [dateText, setDateText] = useState('');
  const dateInputRef = useRef(null);

  const handleDateChange = (e) => {
    setDateText(maskDate(e.target.value));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      alert("אנא הזיני שם.");
      return;
    }
    const parsed = parseDdMmYyyy(dateText);
    if (!parsed) {
      alert("אנא הזיני תאריך חוקי בפורמט DD/MM/YYYY.");
      return;
    }
    const edd = eddFromInputs(method, isoToDdMmYyyy(parsed.toISOString()));
    if (!edd) {
      alert("אנא הזיני תאריך חוקי");
      return;
    }
    onComplete({ name, edd, calculationMethod: method === 'last_period' ? 'LMP' : 'EDD' });
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background py-8" dir="rtl">
      <div className="w-full max-w-[600px] px-margin-mobile flex flex-col items-center">
        <header className="flex flex-col items-center mb-8">
          <div className="w-[120px] mb-6">
            <img src={logo} alt="תינוקפדיה" className="w-full h-auto drop-shadow-sm" />
          </div>
          <h1 className="text-headline-small font-assistant font-bold text-on-surface mb-2 text-center">
            עוד קצת פרטים...
          </h1>
          <p className="text-body-large text-on-surface-variant font-heebo text-center max-w-[280px]">
            כדי שנוכל להתאים לך את התוכן הטוב ביותר
          </p>
        </header>
        
        <main className="w-full bg-white rounded-3xl p-card-padding shadow-[0_8px_30px_rgb(0,0,0,0.04)] mb-stack-gap">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label className="text-body-medium font-heebo text-on-surface pr-1">איך קוראים לך?</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="השם שלך"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-14 bg-surface rounded-xl px-4 border border-outline focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all font-heebo text-body-large text-on-surface placeholder:text-on-surface-variant/50"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <label className="text-body-medium font-heebo text-on-surface pr-1">חישוב שבוע הריון לפי:</label>
              <div className="flex gap-3">
                <MethodOption 
                  label="וסת אחרון" 
                  selected={method === 'last_period'} 
                  onClick={() => setMethod('last_period')} 
                />
                <MethodOption 
                  label="תאריך לידה משוער" 
                  selected={method === 'due_date'} 
                  onClick={() => setMethod('due_date')} 
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-body-medium font-heebo text-on-surface pr-1">
                {method === 'last_period' ? 'תאריך וסת אחרון' : 'תאריך לידה משוער'}
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="DD/MM/YYYY"
                  value={dateText}
                  onChange={handleDateChange}
                  className="w-full h-14 bg-surface rounded-xl px-4 pl-12 border border-outline focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all font-heebo text-body-large text-on-surface placeholder:text-on-surface-variant/50 dir-ltr text-right"
                  required
                />
                <button
                  type="button"
                  onClick={() => dateInputRef.current?.showPicker?.()}
                  className="absolute left-3 top-1/2 -translate-y-1/2 p-2 text-primary hover:bg-primary/5 rounded-full transition-colors"
                >
                  <span className="material-symbols-rounded">calendar_month</span>
                </button>
                <input
                  ref={dateInputRef}
                  type="date"
                  className="absolute opacity-0 w-0 h-0"
                  onChange={(e) => {
                    const d = new Date(e.target.value);
                    if (!isNaN(d)) {
                      setDateText(isoToDdMmYyyy(d.toISOString()));
                    }
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              className="mt-2 w-full h-14 bg-primary text-on-primary rounded-xl font-assistant font-bold text-title-medium flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-[0.98] transition-all shadow-sm"
            >
              <span>בואי נתחיל</span>
              <span className="material-symbols-rounded text-[20px]">arrow_back</span>
            </button>
          </form>
        </main>
        
        <footer className="text-label-medium font-heebo text-on-surface-variant/70 text-center px-4">
          בהרשמה את מסכימה ל<a href="#" className="underline hover:text-primary">תנאי השימוש</a> ול<a href="#" className="underline hover:text-primary">מדיניות הפרטיות</a> שלנו
        </footer>
      </div>
    </div>
  );
}
