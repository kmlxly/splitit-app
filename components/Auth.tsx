import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Loader2, X, Cloud, ArrowRight, Lock, Mail } from 'lucide-react'

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
}

export default function AuthModal({ isOpen, onClose, isDarkMode }: AuthModalProps) {
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)

  if (!isOpen) return null;

  // --- GOOGLE LOGIN ---
  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // Lepas login, dia akan balik ke page asal
        redirectTo: window.location.origin 
      }
    });
    
    if (error) {
        alert(error.message);
        setGoogleLoading(false);
    }
    // Nota: Kalau berjaya, dia akan redirect, so tak payah setLoading(false)
  };

  // --- EMAIL LOGIN ---
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    let error;
    if (isSignUp) {
      const { error: signUpError } = await supabase.auth.signUp({ email, password })
      error = signUpError;
      if (!error) alert('Check email anda untuk sahkan pendaftaran!');
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      error = signInError;
    }

    setLoading(false)

    if (!error) {
        onClose();
        window.location.reload(); 
    } else {
        alert(error.message);
    }
  }

  // --- STYLING ---
  const modalBg = isDarkMode ? "bg-[#1E1E1E] border-white text-white" : "bg-white border-black text-black";
  const shadowStyle = isDarkMode ? "shadow-[6px_6px_0px_0px_rgba(255,255,255,1)]" : "shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]";
  
  const inputWrapperStyle = `flex items-center border-2 rounded-lg overflow-hidden transition-all focus-within:translate-x-1 focus-within:-translate-y-1 ${isDarkMode ? "bg-black border-white focus-within:shadow-[3px_3px_0px_0px_#fff]" : "bg-gray-50 border-black focus-within:shadow-[3px_3px_0px_0px_#000]"}`;
  const inputFieldStyle = `w-full p-3 bg-transparent outline-none text-sm font-bold placeholder:font-medium placeholder:opacity-50 ${isDarkMode ? "text-white" : "text-black"}`;
  
  const btnStyle = `w-full py-2.5 rounded-lg border-2 text-sm font-black uppercase tracking-wider flex justify-center items-center gap-2 transition-all active:translate-y-1 active:shadow-none ${isDarkMode ? "bg-indigo-600 border-white text-white hover:bg-indigo-500 shadow-[3px_3px_0px_0px_#fff]" : "bg-indigo-500 border-black text-white hover:bg-indigo-400 shadow-[3px_3px_0px_0px_#000]"}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">

      <div className={`w-full max-w-sm rounded-2xl border-2 relative transition-all ${modalBg} shadow-2xl animate-in zoom-in-95`}>
        
        <button onClick={onClose} className={`absolute -top-3 -right-3 p-1.5 rounded-full border-2 hover:scale-110 transition-transform z-10 ${isDarkMode ? "bg-red-500 border-white text-white" : "bg-red-500 border-black text-white"}`}>
            <X size={14} strokeWidth={4}/>
        </button>

        <div className="p-6">
            <div className="flex flex-col items-center mb-6 space-y-2">
                <div className={`w-10 h-10 border-2 rounded-lg flex items-center justify-center transform -rotate-3 ${isDarkMode ? "bg-black border-white" : "bg-indigo-100 border-black"}`}>
                    <Cloud size={20} strokeWidth={2.5} />
                </div>
                <div className="text-center leading-tight">
                    <h2 className="text-xl font-black uppercase tracking-tight">
                        {isSignUp ? 'Join SplitIt' : 'Welcome Back'}
                    </h2>
                    <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest mt-1">Cloud Sync Access</p>
                </div>
            </div>

            <div className="space-y-3">
                {/* GOOGLE BUTTON */}
                <button 
                    onClick={handleGoogleLogin}
                    disabled={googleLoading}
                    className={`w-full py-2.5 rounded-lg border-2 flex items-center justify-center gap-2 transition-all hover:bg-opacity-10 active:scale-95 ${isDarkMode ? "border-white bg-white/5 hover:bg-white/10" : "border-black bg-gray-50 hover:bg-gray-100"}`}
                >
                    {googleLoading ? <Loader2 className="animate-spin w-4 h-4"/> : (
                        <div className="flex items-center gap-2">
                            {/* Google Logo SVG */}
                            <svg className="w-4 h-4" viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            <span className="text-xs font-black uppercase tracking-wider">Google</span>
                        </div>
                    )}
                </button>

                <div className="flex items-center gap-2 opacity-30">
                    <div className="h-[1px] bg-current flex-1"></div>
                    <span className="text-[9px] font-black uppercase">ATAU</span>
                    <div className="h-[1px] bg-current flex-1"></div>
                </div>

                {/* EMAIL FORM */}
                <form onSubmit={handleAuth} className="space-y-3">
                    <div className={inputWrapperStyle}>
                        <div className="pl-3 opacity-50"><Mail size={16}/></div>
                        <input className={inputFieldStyle} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    </div>
                    <div className={inputWrapperStyle}>
                        <div className="pl-3 opacity-50"><Lock size={16}/></div>
                        <input className={inputFieldStyle} type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                    </div>
                    
                    <button className={`mt-2 ${btnStyle}`} disabled={loading}>
                        {loading ? <Loader2 className="animate-spin w-4 h-4"/> : (
                            <>
                                {isSignUp ? 'Daftar' : 'Login'} <ArrowRight size={16} strokeWidth={3} />
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-5 pt-4 border-t-2 border-dashed border-current border-opacity-30 text-center">
                    <button onClick={() => setIsSignUp(!isSignUp)} className="text-xs font-black uppercase bg-current/10 px-3 py-1 rounded hover:bg-current/20 transition-colors">
                        {isSignUp ? "Login Sini" : "Create Account"}
                    </button>
                </div>
            </div>
        </div>
      </div>
    </div>
  )
}