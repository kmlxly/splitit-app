"use client";

import Link from "next/link";
import React, { useState, useEffect, useCallback } from "react";
import {
  Grid, Moon, Sun, ArrowUpRight,
  LogIn, LogOut, User, Loader2,
  X, Wallet, HelpCircle, ChevronDown, ChevronUp,
  Receipt, RefreshCw, Plane, AlertCircle, Sparkles, ChevronRight, Check
} from "lucide-react";
import { useUser, authClient } from "@/lib/auth/client";
import AuthModal from "@/components/Auth";
import WelcomeScreen from "@/components/WelcomeScreen";
import MobileBottomDock from "@/components/MobileBottomDock";
import { getDashboardStats } from "@/app/actions/dashboard";

export default function Home() {
  // --- STATE ---
  const [darkMode, setDarkMode] = useState(false);
  const user = useUser();
  const loadingSession = user === undefined;
  const session = user
    ? { user: { ...user, email: user.primaryEmail || "" } }
    : null;

  // Guest & Welcome Flow State
  const [guestDismissed, setGuestDismissed] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [activeGuideTab, setActiveGuideTab] = useState("splitit");

  // Dashboard Stats State
  const [stats, setStats] = useState({
    toCollect: 0,
    pocketBalance: 0,
    nextBill: "Tiada Data"
  });
  const [, setLoadingStats] = useState(true);

  // --- FUNCTION: Load Stats via Server Action ---
  const loadStats = useCallback(async () => {
    if (!user) return;
    setLoadingStats(true);
    try {
      const data = await getDashboardStats();
      setStats(data);
    } catch (err) {
      console.error("Dashboard Stats Error:", err);
    } finally {
      setLoadingStats(false);
    }
  }, [user]);

  // --- EFFECT: Dark Mode & Guest Session Init ---
  useEffect(() => {
    const savedMode = localStorage.getItem("splitit_darkmode");
    if (savedMode !== null) setDarkMode(savedMode === "true");

    const savedGuest = sessionStorage.getItem("kmlxly_guest_dismissed");
    if (savedGuest === "true") setGuestDismissed(true);
  }, []);

  // --- EFFECT: Stats Loading on Mount + on Focus ---
  useEffect(() => {
    if (!user) return;
    loadStats();

    const handleFocusOrVisible = () => {
      if (document.visibilityState === "visible") {
        loadStats();
      }
    };

    window.addEventListener("focus", handleFocusOrVisible);
    document.addEventListener("visibilitychange", handleFocusOrVisible);

    return () => {
      window.removeEventListener("focus", handleFocusOrVisible);
      document.removeEventListener("visibilitychange", handleFocusOrVisible);
    };
  }, [user, loadStats]);

  // --- HANDLERS ---
  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem("splitit_darkmode", String(newMode));
  };

  const handleLogout = async () => {
    const confirm = window.confirm("Are you sure you want to log out?");
    if (confirm && user) {
      await user.signOut();
      sessionStorage.removeItem("kmlxly_guest_dismissed");
      setGuestDismissed(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const callbackURL = typeof window !== "undefined" ? window.location.pathname : "/";
      await authClient.signIn.social({
        provider: "google",
        callbackURL,
      });
    } catch (err) {
      console.error("Google login error:", err);
      setShowLoginModal(true);
    }
  };

  const handleContinueGuest = () => {
    setGuestDismissed(true);
    sessionStorage.setItem("kmlxly_guest_dismissed", "true");
  };

  // --- 1. WELCOME SCREEN (Shown to unauthenticated guests who haven't dismissed) ---
  if (!session && !loadingSession && !guestDismissed) {
    return (
      <WelcomeScreen
        onLoginGoogle={handleGoogleLogin}
        onOpenEmailAuth={() => setShowLoginModal(true)}
        onContinueGuest={handleContinueGuest}
        isDarkMode={darkMode}
      />
    );
  }

  // --- 2. MAIN MOBILE HOME DASHBOARD ---
  const bgClass = darkMode ? "bg-[#121214] text-white" : "bg-[#F4F5F7] text-black";

  return (
    <div className={`min-h-screen w-full transition-colors duration-200 ${bgClass} font-sans`}>
      <div className="max-w-md mx-auto min-h-screen flex flex-col justify-between px-4 pb-28 pt-[calc(env(safe-area-inset-top)+0.75rem)] space-y-5 relative">

        {/* TOP MOBILE APP BAR */}
        <header className="flex items-center justify-between pt-1">
          {/* User Profile / Greeting */}
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-2xl border-2 flex items-center justify-center font-black text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
              darkMode ? "bg-white text-black border-white" : "bg-black text-white border-black"
            }`}>
              {session?.user.email ? session.user.email[0].toUpperCase() : "G"}
            </div>
            <div>
              <h1 className="text-sm font-black uppercase tracking-tight leading-none">
                {session ? `Hi, ${session.user.email.split("@")[0]}!` : "Hey there!"}
              </h1>
              <p className="text-[10px] font-bold opacity-50 uppercase tracking-wider mt-0.5">
                {session ? "Cloud Synced" : "Guest Mode"}
              </p>
            </div>
          </div>

          {/* Right Action Pills */}
          <div className="flex items-center gap-1.5">
            {loadingSession ? (
              <div className="p-2 rounded-full border-2">
                <Loader2 size={14} className="animate-spin" />
              </div>
            ) : session ? (
              <button
                onClick={handleLogout}
                className={`px-2.5 py-1.5 rounded-full border-2 text-[10px] font-black uppercase flex items-center gap-1 transition-all active:scale-95 ${
                  darkMode ? "border-white/30 hover:border-white text-white" : "border-black/30 hover:border-black text-black"
                }`}
                title="Log Out"
              >
                <User size={12} />
                <LogOut size={11} className="opacity-60" />
              </button>
            ) : (
              <button
                onClick={() => setShowLoginModal(true)}
                className="px-3 py-1.5 rounded-full border-2 text-[10px] font-black uppercase bg-[#FF6B55] text-black border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
              >
                SIGN IN
              </button>
            )}

            {/* Help Button */}
            <button
              onClick={() => setShowHelpModal(true)}
              className={`p-2 rounded-full border-2 transition-all active:scale-95 ${
                darkMode ? "border-white/30 text-white hover:border-white" : "border-black/30 text-black hover:border-black"
              }`}
              aria-label="Help"
            >
              <HelpCircle size={15} />
            </button>

            {/* Dark / Light Toggle */}
            <button
              onClick={toggleDarkMode}
              className={`p-2 rounded-full border-2 transition-all active:scale-95 ${
                darkMode ? "border-white/30 text-white hover:border-white" : "border-black/30 text-black hover:border-black"
              }`}
              aria-label="Toggle theme"
            >
              {darkMode ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          </div>
        </header>

        {/* SMART FINANCE STATUS CARD (DRIBBBLE 'STABILIZING LABOR COST' INSPIRED) */}
        <div className={`p-4 rounded-3xl border-2 transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] ${
          darkMode ? "bg-[#18181B] border-white/20 text-white" : "bg-black text-white border-black"
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-amber-400 text-black flex items-center justify-center font-black border-2 border-amber-300">
                <AlertCircle size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">FINANCE RADAR</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                </div>
                <p className="text-xs font-bold leading-tight mt-0.5">
                  {session
                    ? (stats.toCollect !== 0
                        ? (stats.toCollect > 0 ? `RM ${stats.toCollect.toFixed(0)} to collect from friends.` : `Outstanding balance to settle.`)
                        : "All bills & balances are in sync.")
                    : "Guest Mode: SplitIt & Budget available offline."}
                </p>
              </div>
            </div>

            <Link
              href="/splitit"
              className="w-8 h-8 rounded-full border-2 border-white/30 hover:border-white flex items-center justify-center text-white transition-transform active:scale-90"
              title="Go to SplitIt"
            >
              <ArrowUpRight size={15} />
            </Link>
          </div>
        </div>

        {/* HERO BENTO METRIC CARD (DRIBBBLE 'REVENUE' INSPIRED) */}
        <div className="p-5 rounded-3xl border-2 border-black bg-[#FF6B55] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-80">POCKET BALANCE</p>
              <h2 className="text-3xl font-black tracking-tight font-mono mt-0.5">
                {session ? `RM ${stats.pocketBalance.toFixed(2)}` : "RM 0.00"}
              </h2>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-black text-white text-[9px] font-black uppercase tracking-wider">
              {session ? "SAFE TO SPEND" : "OFFLINE"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-black/15">
            <div className="bg-black/10 rounded-2xl p-2.5">
              <span className="text-[9px] font-black uppercase opacity-70 block">TO COLLECT (SPLITIT)</span>
              <span className="text-sm font-black font-mono">
                {session ? `RM ${Math.abs(stats.toCollect).toFixed(0)}` : "SIGN IN"}
              </span>
            </div>
            <div className="bg-black/10 rounded-2xl p-2.5">
              <span className="text-[9px] font-black uppercase opacity-70 block">UPCOMING BILL</span>
              <span className="text-xs font-black uppercase truncate block">
                {session ? stats.nextBill.split(' (')[0] : "SIGN IN"}
              </span>
            </div>
          </div>
        </div>

        {/* CORE MINI-APPS SECTION */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-black uppercase tracking-wider opacity-80">Featured Apps</h3>
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full border border-current opacity-60">
              4 Modules
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            {/* 1. SPLITIT */}
            <Link
              href="/splitit"
              className={`p-4 rounded-3xl border-2 transition-all group active:scale-[0.99] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] ${
                darkMode ? "bg-[#18181B] border-white/20 hover:border-white" : "bg-white border-black hover:bg-neutral-50"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-[#FF6B55] text-black border-2 border-black flex items-center justify-center font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    <Receipt size={22} />
                  </div>
                  <div>
                    <h4 className="text-base font-black uppercase tracking-tight">SplitIt v5.2</h4>
                    <p className="text-[11px] font-bold opacity-60">Split dining bills, OCR receipt scan & multiplayer</p>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full border-2 border-current opacity-50 group-hover:opacity-100 flex items-center justify-center transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                  <ArrowUpRight size={14} />
                </div>
              </div>
              <div className="flex gap-1.5 mt-3 pt-2.5 border-t border-dashed border-current/10">
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-[#FF6B55]/15 text-[#FF6B55] border border-[#FF6B55]/40">AI Scanner</span>
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full border border-current/20 opacity-70">Tax Split</span>
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full border border-current/20 opacity-70">Multiplayer</span>
              </div>
            </Link>

            {/* 2. BUDGET.AI */}
            <Link
              href="/budget"
              className={`p-4 rounded-3xl border-2 transition-all group active:scale-[0.99] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] ${
                darkMode ? "bg-[#18181B] border-white/20 hover:border-white" : "bg-white border-black hover:bg-neutral-50"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-[#FBBF24] text-black border-2 border-black flex items-center justify-center font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    <Wallet size={22} />
                  </div>
                  <div>
                    <h4 className="text-base font-black uppercase tracking-tight">Budget.AI</h4>
                    <p className="text-[11px] font-bold opacity-60">Track daily spending & pocket balance</p>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full border-2 border-current opacity-50 group-hover:opacity-100 flex items-center justify-center transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                  <ArrowUpRight size={14} />
                </div>
              </div>
              <div className="flex gap-1.5 mt-3 pt-2.5 border-t border-dashed border-current/10">
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-[#FBBF24]/15 text-[#D97706] border border-[#FBBF24]/40">Pocket Balance</span>
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full border border-current/20 opacity-70">Auto-Category</span>
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full border border-current/20 opacity-70">Analytics</span>
              </div>
            </Link>

            {/* 3. TRIPIT */}
            <Link
              href="/tripit"
              className={`p-4 rounded-3xl border-2 transition-all group active:scale-[0.99] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] ${
                darkMode ? "bg-[#18181B] border-white/20 hover:border-white" : "bg-white border-black hover:bg-neutral-50"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-[#6366F1] text-white border-2 border-black flex items-center justify-center font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    <Plane size={22} />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-base font-black uppercase tracking-tight">TripIt</h4>
                      <span className="px-1.5 py-0.2 rounded-md bg-[#6366F1] text-white text-[8px] font-black uppercase">NEW</span>
                    </div>
                    <p className="text-[11px] font-bold opacity-60">Trip itinerary & group expenses</p>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full border-2 border-current opacity-50 group-hover:opacity-100 flex items-center justify-center transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                  <ArrowUpRight size={14} />
                </div>
              </div>
              <div className="flex gap-1.5 mt-3 pt-2.5 border-t border-dashed border-current/10">
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-[#6366F1]/15 text-[#6366F1] border border-[#6366F1]/40">Travel Itinerary</span>
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full border border-current/20 opacity-70">Group Split</span>
              </div>
            </Link>

            {/* 4. SUB.TRACKER */}
            <Link
              href="/sub-tracker"
              className={`p-4 rounded-3xl border-2 transition-all group active:scale-[0.99] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] ${
                darkMode ? "bg-[#18181B] border-white/20 hover:border-white" : "bg-white border-black hover:bg-neutral-50"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-[#10B981] text-black border-2 border-black flex items-center justify-center font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    <RefreshCw size={22} />
                  </div>
                  <div>
                    <h4 className="text-base font-black uppercase tracking-tight">Sub.Tracker</h4>
                    <p className="text-[11px] font-bold opacity-60">Subscription radar & 1-year cost check</p>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full border-2 border-current opacity-50 group-hover:opacity-100 flex items-center justify-center transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                  <ArrowUpRight size={14} />
                </div>
              </div>
              <div className="flex gap-1.5 mt-3 pt-2.5 border-t border-dashed border-current/10">
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-[#10B981]/15 text-[#059669] border border-[#10B981]/40">Fixed Commitments</span>
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full border border-current/20 opacity-70">Yearly Shock</span>
              </div>
            </Link>
          </div>
        </div>

        {/* FOOTER LINKS */}
        <footer className="pt-2 text-center space-y-2">
          <p className="text-[9px] font-black uppercase tracking-[0.25em] opacity-40">Built by kmlxly</p>
          <div className="flex justify-center gap-3">
            <Link href="/privacy-policy" className="text-[9px] font-bold uppercase tracking-wider opacity-50 hover:opacity-100">
              Privacy Policy
            </Link>
            <span className="opacity-20">•</span>
            <Link href="/terms-of-service" className="text-[9px] font-bold uppercase tracking-wider opacity-50 hover:opacity-100">
              Terms of Service
            </Link>
          </div>
        </footer>

      </div>

      {/* FLOATING BOTTOM DOCK NAVIGATION (MOBILE FIRST) */}
      <MobileBottomDock activeTab="home" darkMode={darkMode} />

      {/* MODAL: AUTHENTICATION */}
      <AuthModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        isDarkMode={darkMode}
      />

      {/* MODAL: USER MANUAL GUIDE */}
      {showHelpModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="help-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in"
        >
          <div
            className={`w-full max-w-[340px] max-h-[82vh] flex flex-col rounded-3xl border-2 ${
              darkMode ? "bg-[#18181B] border-white text-white" : "bg-white border-black text-black"
            } shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] relative animate-in zoom-in-95 overflow-hidden`}
          >
            {/* Header */}
            <div className="p-5 pb-2">
              <div className="flex justify-between items-start mb-3">
                <div className={`w-10 h-10 rounded-2xl border-2 flex items-center justify-center ${
                  darkMode ? "bg-white text-black border-white" : "bg-black text-white border-black"
                }`}>
                  <HelpCircle size={20} />
                </div>
                <button
                  onClick={() => setShowHelpModal(false)}
                  className="p-1.5 opacity-60 hover:opacity-100 transition-opacity"
                  aria-label="Close help"
                >
                  <X size={20} />
                </button>
              </div>
              <h2 id="help-title" className="text-xl font-black uppercase leading-tight tracking-tight">
                User Guide
              </h2>
              <p className="text-[10px] font-bold opacity-50 uppercase tracking-wider mt-0.5">
                Quick tips & feature walkthroughs
              </p>
            </div>

            {/* Accordion List */}
            <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
              {/* 1. SPLITIT */}
              <div className={`border-2 rounded-2xl overflow-hidden transition-all ${darkMode ? "border-white/20" : "border-black/20"}`}>
                <button
                  onClick={() => setActiveGuideTab(activeGuideTab === "splitit" ? "" : "splitit")}
                  className={`w-full px-3.5 py-2.5 flex justify-between items-center font-black uppercase text-[11px] tracking-tight ${
                    activeGuideTab === "splitit" ? (darkMode ? "bg-white text-black" : "bg-black text-white") : ""
                  }`}
                >
                  <span>1. SplitIt (Dining Bills)</span>
                  {activeGuideTab === "splitit" ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                {activeGuideTab === "splitit" && (
                  <div className="px-3.5 py-2.5 space-y-1.5 text-[10px] font-bold leading-snug border-t-2 border-current/10">
                    <p className="flex gap-2 items-start"><span className="text-[#FF6B55]">▶</span> Snap long receipts with the AI camera scanner.</p>
                    <p className="flex gap-2 items-start"><span className="text-[#FF6B55]">▶</span> Assign individual items or share them with friends.</p>
                    <p className="flex gap-2 items-start"><span className="text-[#FF6B55]">▶</span> Auto-distribute tax & service charge proportionally by amount spent.</p>
                    <p className="flex gap-2 items-start"><span className="text-[#FF6B55]">▶</span> Share detailed receipt summaries directly to WhatsApp.</p>
                  </div>
                )}
              </div>

              {/* 2. BUDGET.AI */}
              <div className={`border-2 rounded-2xl overflow-hidden transition-all ${darkMode ? "border-white/20" : "border-black/20"}`}>
                <button
                  onClick={() => setActiveGuideTab(activeGuideTab === "budget" ? "" : "budget")}
                  className={`w-full px-3.5 py-2.5 flex justify-between items-center font-black uppercase text-[11px] tracking-tight ${
                    activeGuideTab === "budget" ? (darkMode ? "bg-white text-black" : "bg-black text-white") : ""
                  }`}
                >
                  <span>2. Budget.AI (Pocket Balance)</span>
                  {activeGuideTab === "budget" ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                {activeGuideTab === "budget" && (
                  <div className="px-3.5 py-2.5 space-y-1.5 text-[10px] font-bold leading-snug border-t-2 border-current/10">
                    <p className="flex gap-2 items-start"><span className="text-[#FBBF24]">▶</span> Log daily expenses with AI scanner or manual entry.</p>
                    <p className="flex gap-2 items-start"><span className="text-[#FBBF24]">▶</span> Monitor your daily Safe-to-Spend limit.</p>
                    <p className="flex gap-2 items-start"><span className="text-[#FBBF24]">▶</span> Analyze monthly categorical breakdowns & insights.</p>
                  </div>
                )}
              </div>

              {/* 3. TRIPIT */}
              <div className={`border-2 rounded-2xl overflow-hidden transition-all ${darkMode ? "border-white/20" : "border-black/20"}`}>
                <button
                  onClick={() => setActiveGuideTab(activeGuideTab === "tripit" ? "" : "tripit")}
                  className={`w-full px-3.5 py-2.5 flex justify-between items-center font-black uppercase text-[11px] tracking-tight ${
                    activeGuideTab === "tripit" ? (darkMode ? "bg-white text-black" : "bg-black text-white") : ""
                  }`}
                >
                  <span>3. TripIt (Travel & Trips)</span>
                  {activeGuideTab === "tripit" ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                {activeGuideTab === "tripit" && (
                  <div className="px-3.5 py-2.5 space-y-1.5 text-[10px] font-bold leading-snug border-t-2 border-current/10">
                    <p className="flex gap-2 items-start"><span className="text-[#6366F1]">▶</span> Plan trip schedules, destinations & budget targets.</p>
                    <p className="flex gap-2 items-start"><span className="text-[#6366F1]">▶</span> Log shared group expenses while traveling.</p>
                    <p className="flex gap-2 items-start"><span className="text-[#6366F1]">▶</span> Auto-settle final debt balances between travel companions.</p>
                  </div>
                )}
              </div>

              {/* 4. SUB.TRACKER */}
              <div className={`border-2 rounded-2xl overflow-hidden transition-all ${darkMode ? "border-white/20" : "border-black/20"}`}>
                <button
                  onClick={() => setActiveGuideTab(activeGuideTab === "subtracker" ? "" : "subtracker")}
                  className={`w-full px-3.5 py-2.5 flex justify-between items-center font-black uppercase text-[11px] tracking-tight ${
                    activeGuideTab === "subtracker" ? (darkMode ? "bg-white text-black" : "bg-black text-white") : ""
                  }`}
                >
                  <span>4. Sub.Tracker (Commitments)</span>
                  {activeGuideTab === "subtracker" ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                {activeGuideTab === "subtracker" && (
                  <div className="px-3.5 py-2.5 space-y-1.5 text-[10px] font-bold leading-snug border-t-2 border-current/10">
                    <p className="flex gap-2 items-start"><span className="text-[#10B981]">▶</span> Monitor recurring commitments and subscriptions.</p>
                    <p className="flex gap-2 items-start"><span className="text-[#10B981]">▶</span> Yearly Shock: Review accumulated 1-year total cost.</p>
                    <p className="flex gap-2 items-start"><span className="text-[#10B981]">▶</span> Receive automated renewal reminders before billing.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer button */}
            <div className="p-4 pt-2">
              <button
                onClick={() => setShowHelpModal(false)}
                className={`w-full py-3 rounded-2xl font-black uppercase text-xs border-2 transition-all active:translate-x-[1px] active:translate-y-[1px] active:shadow-none ${
                  darkMode
                    ? "bg-white text-black border-white shadow-[2px_2px_0px_0px_rgba(255,255,255,0.3)]"
                    : "bg-black text-white border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                }`}
              >
                GOT IT & CLOSE
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
