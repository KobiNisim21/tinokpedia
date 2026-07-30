import { useState, useRef } from 'react';
import { useSignUp, useSignIn } from '@clerk/clerk-react';
import logo from '../assets/logo.png';
import { eddFromInputs, parseDdMmYyyy, isoToDdMmYyyy } from '../utils/pregnancy';
import { syncUserProfile } from '../services/api';

const GoogleIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

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

export default function SignupScreen({ onComplete }) {
  const { isLoaded: isSignUpLoaded, signUp, setActive: setSignUpActive } = useSignUp();
  const { isLoaded: isSignInLoaded, signIn, setActive: setSignInActive } = useSignIn();

  const [activeTab, setActiveTab] = useState('register');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Register state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [method, setMethod] = useState('last_period');
  const [dateText, setDateText] = useState('');
  const dateInputRef = useRef(null);
  
  // OTP Verification state
  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState('');

  const handleDateChange = (e) => {
    setDateText(maskDate(e.target.value));
  };

  const handleGoogleSignIn = async () => {
    if (activeTab === 'register') {
      await signUp.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: '/sso-callback',
        redirectUrlComplete: '/'
      });
    } else {
      await signIn.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: '/sso-callback',
        redirectUrlComplete: '/'
      });
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!isSignUpLoaded) return;

    if (!name.trim()) return setError("אנא הזיני שם.");
    const parsed = parseDdMmYyyy(dateText);
    if (!parsed) return setError("אנא הזיני תאריך חוקי בפורמט DD/MM/YYYY.");
    
    const edd = eddFromInputs(method, isoToDdMmYyyy(parsed.toISOString()));
    if (!edd) return setError("אנא הזיני תאריך חוקי");

    try {
      setLoading(true);
      setError('');
      await signUp.create({
        emailAddress: email,
        password,
      });

      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setPendingVerification(true);
    } catch (err) {
      console.error(err);
      setError(err.errors?.[0]?.message || 'אירעה שגיאה בהרשמה');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (!isSignUpLoaded) return;
    try {
      setLoading(true);
      setError('');
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code,
      });

      if (completeSignUp.status === 'complete') {
        await setSignUpActive({ session: completeSignUp.createdSessionId });
        const parsed = parseDdMmYyyy(dateText);
        const edd = eddFromInputs(method, isoToDdMmYyyy(parsed.toISOString()));
        
        onComplete({ 
          name, 
          edd, 
          calculationMethod: method === 'last_period' ? 'LMP' : 'EDD' 
        });
      } else {
        setError('האימות נכשל, נסי שוב.');
      }
    } catch (err) {
      console.error(err);
      setError(err.errors?.[0]?.message || 'קוד אימות לא חוקי');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!isSignInLoaded) return;
    try {
      setLoading(true);
      setError('');
      const completeSignIn = await signIn.create({
        identifier: email,
        password,
      });

      if (completeSignIn.status === 'complete') {
        await setSignInActive({ session: completeSignIn.createdSessionId });
        onComplete(null);
      } else {
        setError('התחברות נכשלה');
      }
    } catch (err) {
      console.error(err);
      setError(err.errors?.[0]?.message || 'שם משתמש או סיסמה שגויים');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background py-8" dir="rtl">
      <div className="w-full max-w-[600px] px-margin-mobile flex flex-col items-center">
        <header className="flex flex-col items-center mb-8">
          <div className="w-[120px] mb-6">
            <img src={logo} alt="תינוקפדיה" className="w-full h-auto drop-shadow-sm" />
          </div>
          <h1 className="text-headline-small font-assistant font-bold text-on-surface mb-2 text-center">
            {activeTab === 'register' ? 'ברוכה הבאה לתינוקפדיה!' : 'ברוכה השבה לתינוקפדיה!'}
          </h1>
          <p className="text-body-large text-on-surface-variant font-heebo text-center max-w-[280px]">
            האפליקציה שתלווה אותך צעד אחר צעד
          </p>
        </header>

        {!pendingVerification && (
          <div className="flex w-full mb-6 border-b border-surface-variant/30">
            <button 
              className={`flex-1 pb-3 transition-colors ${activeTab === 'register' ? 'border-b-2 border-primary text-primary font-bold' : 'text-on-surface-variant'}`}
              onClick={() => { setActiveTab('register'); setError(''); }}
            >
              הרשמה
            </button>
            <button 
              className={`flex-1 pb-3 transition-colors ${activeTab === 'login' ? 'border-b-2 border-primary text-primary font-bold' : 'text-on-surface-variant'}`}
              onClick={() => { setActiveTab('login'); setError(''); }}
            >
              התחברות
            </button>
          </div>
        )}

        <main className="w-full bg-white rounded-3xl p-card-padding shadow-[0_8px_30px_rgb(0,0,0,0.04)] mb-stack-gap">
          {!pendingVerification && (
            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="w-full h-14 bg-white border border-outline rounded-xl flex items-center justify-center gap-3 hover:bg-surface transition-colors font-heebo text-body-large font-medium text-on-surface mb-6 shadow-sm"
            >
              <GoogleIcon />
              <span>{activeTab === 'register' ? 'הרשמה מהירה עם Google' : 'התחברות עם Google'}</span>
            </button>
          )}

          {!pendingVerification && (
            <div className="flex items-center gap-4 mb-6">
              <div className="h-px bg-outline-variant flex-1"></div>
              <span className="text-label-medium text-on-surface-variant font-heebo">או באמצעות דוא"ל וסיסמה</span>
              <div className="h-px bg-outline-variant flex-1"></div>
            </div>
          )}

          {error && (
            <div className="mb-6 p-3 bg-error/10 text-error rounded-lg text-body-medium font-heebo text-center">
              {error}
            </div>
          )}

          {pendingVerification ? (
            <form onSubmit={handleVerifyOTP} className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label className="text-body-medium font-heebo text-on-surface pr-1">קוד אימות</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="הזיני קוד מהמייל"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full h-14 bg-surface rounded-xl px-4 border border-outline focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all font-heebo text-body-large text-on-surface placeholder:text-on-surface-variant/50"
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="mt-2 w-full h-14 bg-primary text-on-primary rounded-xl font-assistant font-bold text-title-medium flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-[0.98] transition-all shadow-sm disabled:opacity-50"
              >
                {loading ? 'מאמת...' : 'אמתי דוא"ל'}
              </button>
            </form>
          ) : activeTab === 'register' ? (
            <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-5">
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

              <div className="flex flex-col gap-2">
                <label className="text-body-medium font-heebo text-on-surface pr-1">כתובת דוא"ל</label>
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-14 bg-surface rounded-xl px-4 border border-outline focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all font-heebo text-body-large text-on-surface placeholder:text-on-surface-variant/50 dir-ltr text-right"
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-body-medium font-heebo text-on-surface pr-1">סיסמה</label>
                <input
                  type="password"
                  placeholder="סיסמה (לפחות 8 תווים)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-14 bg-surface rounded-xl px-4 border border-outline focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all font-heebo text-body-large text-on-surface placeholder:text-on-surface-variant/50 dir-ltr text-right"
                  required
                />
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
                disabled={loading}
                className="mt-2 w-full h-14 bg-primary text-on-primary rounded-xl font-assistant font-bold text-title-medium flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-[0.98] transition-all shadow-sm disabled:opacity-50"
              >
                <span>{loading ? 'טוען...' : 'בואי נתחיל'}</span>
                {!loading && <span className="material-symbols-rounded text-[20px]">arrow_back</span>}
              </button>
            </form>
          ) : (
            <form onSubmit={handleLoginSubmit} className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label className="text-body-medium font-heebo text-on-surface pr-1">כתובת דוא"ל</label>
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-14 bg-surface rounded-xl px-4 border border-outline focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all font-heebo text-body-large text-on-surface placeholder:text-on-surface-variant/50 dir-ltr text-right"
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-body-medium font-heebo text-on-surface pr-1">סיסמה</label>
                <input
                  type="password"
                  placeholder="סיסמה"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-14 bg-surface rounded-xl px-4 border border-outline focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all font-heebo text-body-large text-on-surface placeholder:text-on-surface-variant/50 dir-ltr text-right"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 w-full h-14 bg-primary text-on-primary rounded-xl font-assistant font-bold text-title-medium flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-[0.98] transition-all shadow-sm disabled:opacity-50"
              >
                <span>{loading ? 'טוען...' : 'התחברי'}</span>
                {!loading && <span className="material-symbols-rounded text-[20px]">arrow_back</span>}
              </button>
            </form>
          )}
        </main>
        
        <footer className="text-label-medium font-heebo text-on-surface-variant/70 text-center px-4">
          בהרשמה/התחברות את מסכימה ל<a href="#" className="underline hover:text-primary">תנאי השימוש</a> ול<a href="#" className="underline hover:text-primary">מדיניות הפרטיות</a> שלנו
        </footer>
      </div>
    </div>
  );
}
