"use client";

import { useEffect, useRef, useState } from "react";
import { authClient } from "@/lib/auth/client";
import { Loader2, X, ArrowRight, Lock, Mail, User as UserIcon, Sparkles } from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
}

export default function AuthModal({ isOpen, onClose, isDarkMode }: AuthModalProps) {
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    const focusable = dialog?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]',
    );
    focusable?.[0]?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !dialog) return;

      const items = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]',
        ),
      );
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // --- GOOGLE LOGIN ---
  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setFeedback(null);
    try {
      const callbackURL =
        typeof window !== "undefined" ? window.location.pathname : "/";
      const { error } = await authClient.signIn.social({
        provider: "google",
        callbackURL,
      });
      if (error) {
        setFeedback({ type: "error", text: error.message || "Failed to sign in with Google." });
        setGoogleLoading(false);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to sign in with Google.";
      setFeedback({ type: "error", text: message });
      setGoogleLoading(false);
    }
  };

  // --- EMAIL LOGIN ---
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);

    try {
      if (isSignUp) {
        const { error } = await authClient.signUp.email({
          email,
          password,
          name: name || email.split("@")[0],
        });
        if (error) {
          setFeedback({ type: "error", text: error.message || "Sign up failed." });
          setLoading(false);
          return;
        }
        setLoading(false);
        setIsSignUp(false);
        setFeedback({
          type: "success",
          text: "Account created successfully. You can now sign in with your email and password.",
        });
        return;
      } else {
        const { error } = await authClient.signIn.email({
          email,
          password,
        });
        if (error) {
          setFeedback({ type: "error", text: error.message || "Sign in failed. Please check your credentials." });
          setLoading(false);
          return;
        }
      }

      setLoading(false);
      onClose();
      window.location.reload();
    } catch (error: unknown) {
      setLoading(false);
      setFeedback({
        type: "error",
        text: error instanceof Error ? error.message : "Authentication error occurred.",
      });
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
      onMouseDown={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-title"
        onMouseDown={(e) => e.stopPropagation()}
        className={`w-full max-w-[400px] rounded-t-3xl sm:rounded-3xl border-2 border-b-0 sm:border-b-2 p-6 transition-all animate-in slide-in-from-bottom-6 sm:zoom-in-95 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] ${
          isDarkMode
            ? "bg-[#18181B] border-white text-white"
            : "bg-[#FFFFFF] border-black text-black"
        }`}
      >
        {/* HEADER & CLOSE BUTTON */}
        <div className="flex items-center justify-between pb-4 border-b-2 border-current/10">
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center font-black text-xs ${
              isDarkMode ? "bg-white text-black border-white" : "bg-black text-white border-black"
            }`}>
              <Sparkles size={14} />
            </div>
            <div>
              <h2 id="auth-title" className="text-base font-black uppercase tracking-tight leading-none">
                {isSignUp ? "Create Account" : "Sign In"}
              </h2>
              <p className="text-[10px] font-bold opacity-50 uppercase tracking-wider mt-0.5">Kmlxly Suite Cloud</p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close"
            className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-transform active:scale-90 ${
              isDarkMode ? "border-white/30 hover:border-white text-white" : "border-black/30 hover:border-black text-black"
            }`}
          >
            <X size={16} />
          </button>
        </div>

        {/* MODE TOGGLE PILLS */}
        <div className="grid grid-cols-2 gap-1.5 p-1 my-4 rounded-2xl border-2 border-current/10 bg-current/5">
          <button
            type="button"
            onClick={() => { setIsSignUp(false); setFeedback(null); }}
            className={`py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all ${
              !isSignUp
                ? (isDarkMode ? "bg-white text-black shadow-sm" : "bg-black text-white shadow-sm")
                : "opacity-60 hover:opacity-100"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setIsSignUp(true); setFeedback(null); }}
            className={`py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all ${
              isSignUp
                ? (isDarkMode ? "bg-white text-black shadow-sm" : "bg-black text-white shadow-sm")
                : "opacity-60 hover:opacity-100"
            }`}
          >
            Sign Up
          </button>
        </div>

        <div className="space-y-4">
          {/* GOOGLE 1-TAP LOGIN BUTTON */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            className={`w-full py-3.5 px-4 rounded-2xl border-2 flex items-center justify-center gap-3 font-black text-xs uppercase tracking-wider transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none ${
              isDarkMode
                ? "bg-[#24242B] border-white text-white shadow-[3px_3px_0px_0px_rgba(255,255,255,0.2)] hover:bg-[#2A2A33]"
                : "bg-white border-black text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:bg-neutral-50"
            }`}
          >
            {googleLoading ? (
              <Loader2 className="animate-spin w-4 h-4" />
            ) : (
              <>
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continue with Google</span>
              </>
            )}
          </button>

          {/* DIVIDER */}
          <div className="flex items-center gap-3">
            <div className="h-[1.5px] bg-current opacity-15 flex-1" />
            <span className="text-[10px] font-black uppercase opacity-40">OR EMAIL</span>
            <div className="h-[1.5px] bg-current opacity-15 flex-1" />
          </div>

          {/* EMAIL / PASSWORD FORM */}
          <form onSubmit={handleAuth} className="space-y-3">
            {isSignUp && (
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider opacity-70">Name</label>
                <div className={`flex items-center border-2 rounded-2xl overflow-hidden px-3 py-2.5 transition-all ${
                  isDarkMode ? "bg-[#121214] border-white/20 focus-within:border-white" : "bg-neutral-50 border-black/20 focus-within:border-black"
                }`}>
                  <UserIcon size={16} className="opacity-40 shrink-0 mr-2" />
                  <input
                    type="text"
                    autoComplete="name"
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full bg-transparent outline-none text-xs font-bold"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-wider opacity-70">Email Address</label>
              <div className={`flex items-center border-2 rounded-2xl overflow-hidden px-3 py-2.5 transition-all ${
                isDarkMode ? "bg-[#121214] border-white/20 focus-within:border-white" : "bg-neutral-50 border-black/20 focus-within:border-black"
              }`}>
                <Mail size={16} className="opacity-40 shrink-0 mr-2" />
                <input
                  type="email"
                  autoComplete="email"
                  placeholder="name@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-transparent outline-none text-xs font-bold"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-wider opacity-70">Password</label>
              <div className={`flex items-center border-2 rounded-2xl overflow-hidden px-3 py-2.5 transition-all ${
                isDarkMode ? "bg-[#121214] border-white/20 focus-within:border-white" : "bg-neutral-50 border-black/20 focus-within:border-black"
              }`}>
                <Lock size={16} className="opacity-40 shrink-0 mr-2" />
                <input
                  type="password"
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                  minLength={8}
                  placeholder="Minimum 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-transparent outline-none text-xs font-bold"
                />
              </div>
            </div>

            {feedback && (
              <div className={`rounded-2xl border-2 p-2.5 text-xs font-bold ${
                feedback.type === "error"
                  ? (isDarkMode ? "border-red-500 bg-red-500/10 text-red-400" : "border-red-600 bg-red-50 text-red-700")
                  : (isDarkMode ? "border-green-500 bg-green-500/10 text-green-400" : "border-green-600 bg-green-50 text-green-700")
              }`}>
                {feedback.text}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3.5 rounded-full border-2 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none mt-2 ${
                isDarkMode
                  ? "bg-white text-black border-white shadow-[3px_3px_0px_0px_rgba(255,255,255,0.3)] hover:bg-neutral-100"
                  : "bg-black text-white border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:bg-neutral-800"
              }`}
            >
              {loading ? (
                <Loader2 className="animate-spin w-4 h-4" />
              ) : (
                <>
                  <span>{isSignUp ? "Create Account Now" : "Sign In Now"}</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </form>

          {/* CONTINUE AS GUEST BUTTON */}
          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={onClose}
              className="text-[11px] font-bold uppercase tracking-wider opacity-60 hover:opacity-100 transition-opacity"
            >
              Continue as guest (Offline Mode)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
