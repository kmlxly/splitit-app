"use client";

import Link from "next/link";
import React, { useState, useEffect } from "react";
import {
  Grid, Layout, Moon, Sun, ArrowUpRight,
  LogIn, LogOut, User, Loader2,
  X,
  Wallet, HelpCircle, ChevronDown, ChevronUp,
  ArrowDownLeft, CalendarClock, Lock, RefreshCw, Plane, // Tambah icons untuk Quick Stats
} from "lucide-react";
import { useUser } from "@/lib/auth/client";
import AuthModal from "@/components/Auth";
import { getDashboardStats } from "@/app/actions/dashboard";

export default function Home() {
  // --- STATE ---
  const [darkMode, setDarkMode] = useState(false);
  const user = useUser();
  const loadingSession = user === undefined;
  const session = user
    ? { user: { ...user, email: user.primaryEmail || "" } }
    : null;

  // State untuk Modal Login
  const [showLoginModal, setShowLoginModal] = useState(false);

  // State untuk User Guide
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [activeGuideTab, setActiveGuideTab] = useState("splitit");

  // Quick Stats State (Supabase Connected)
  const [stats, setStats] = useState({
    toCollect: 0,
    pocketBalance: 0,
    nextBill: "Tiada Data"
  });
  const [, setLoadingStats] = useState(true);

  // --- FUNCTION: Load Stats via Server Action ---
  const loadStats = React.useCallback(async () => {
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

  // --- EFFECT: Dark Mode init ---
  useEffect(() => {
    const savedMode = localStorage.getItem("splitit_darkmode");
    if (savedMode !== null) setDarkMode(savedMode === "true");
  }, []);

  // --- EFFECT: Stats Loading + Polling (replaces Supabase Realtime) ---
  useEffect(() => {
    if (user) {
      loadStats();
      const interval = setInterval(loadStats, 10000); // poll every 10s
      return () => clearInterval(interval);
    }
  }, [user, loadStats]);

  // --- HANDLERS ---
  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem("splitit_darkmode", String(newMode));
  };

  const handleLogout = async () => {
    const confirm = window.confirm("Nak logout ke?");
    if (confirm && user) {
      await user.signOut();
    }
  };

  // --- LOGIN FLOW ---
  const handleLoginClick = () => {
    setShowLoginModal(true);
  };

  // --- STYLES ---
  const bgStyle = darkMode ? "bg-black text-white" : "bg-gray-200 text-black";

  // Style Kad Link (Boleh Klik)
  const cardStyle = `group relative border-2 rounded-2xl p-6 transition-all hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${darkMode ? "bg-[#1E1E1E] border-white hover:bg-[#252525]" : "bg-white border-black hover:bg-gray-50"}`;

  const btnStyle = `p-2 rounded-lg border-2 flex items-center justify-center gap-2 text-xs font-bold transition-all active:scale-95 ${darkMode ? "border-white hover:bg-white hover:text-black" : "border-black hover:bg-black hover:text-white"}`;

  return (
    <div className={`min-h-screen font-sans transition-colors duration-300 ${bgStyle} flex flex-col`}>

      {/* HEADER */}
      <header className={`px-6 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-6 border-b-2 flex justify-between items-center ${darkMode ? "border-white bg-black" : "border-black bg-gray-200"}`}>

        {/* Logo Area */}
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 border-2 rounded-lg flex items-center justify-center ${darkMode ? "bg-white border-white" : "bg-black border-black"}`}>
            <Grid size={20} className={darkMode ? "text-black" : "text-white"} />
          </div>
          <div>
            <h1 className="text-xl font-black uppercase tracking-tighter leading-none">Kmlxly Apps.</h1>
            {/* Status Login */}
            {session ? (
              <p className="text-[10px] font-bold text-green-500 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                ONLINE
              </p>
            ) : (
              <p className="text-[10px] font-bold opacity-50">GUEST MODE</p>
            )}
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex gap-2">
          {loadingSession ? (
            <div className={btnStyle}>
              <Loader2 size={18} className="animate-spin" />
            </div>
          ) : session ? (
            <button onClick={handleLogout} className={btnStyle} title="Logout">
              <User size={18} />
              <span className="hidden sm:inline">{session.user.email?.split('@')[0]}</span>
              <LogOut size={14} className="opacity-50" />
            </button>
          ) : (
            <button onClick={handleLoginClick} className={btnStyle}>
              <LogIn size={18} />
              <span className="hidden sm:inline">LOGIN</span>
            </button>
          )}

          <button onClick={() => setShowHelpModal(true)} className={btnStyle} title="Bantuan" aria-label="Buka bantuan">
            <HelpCircle size={18} />
          </button>

          <button onClick={toggleDarkMode} className={btnStyle} aria-label={darkMode ? "Guna tema cerah" : "Guna tema gelap"}>
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 p-6 pb-28 max-w-2xl mx-auto w-full space-y-8 animate-in fade-in slide-in-from-bottom-4">

        <div className="space-y-2">
          <h2 className="text-4xl font-black uppercase leading-none">
            {session ? `Welcome, ${session.user.email?.split('@')[0]}!` : "Pilih Tools."}
          </h2>
          <p className="opacity-60 font-bold text-sm">
            {session ? "Semua data anda disinkronasi." : "Login untuk simpan data di cloud."}
          </p>
        </div>

        {/* --- QUICK STATS DASHBOARD (PILL V3) --- */}
        <section className="grid grid-cols-3 gap-3 mb-6">

          {/* STAT 1: SPLITIT (KUTIP/BAYAR) */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center px-1">
              <span className={`text-[10px] font-black uppercase tracking-widest ${darkMode ? "text-white/60" : "text-black/60"}`}>
                {stats.toCollect >= 0 ? "KUTIP" : "BAYAR"}
              </span>
              <div className={stats.toCollect >= 0
                ? (darkMode ? "text-indigo-400" : "text-indigo-600")
                : (darkMode ? "text-red-500" : "text-red-600")
              }>
                {stats.toCollect >= 0 ? <ArrowDownLeft size={12} /> : <ArrowUpRight size={12} />}
              </div>
            </div>
            <div className={`relative h-8 rounded-full border-2 flex items-center justify-center px-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${stats.toCollect >= 0
              ? (darkMode ? "bg-indigo-600 border-white text-white" : "bg-indigo-100 border-black text-indigo-900")
              : (darkMode ? "bg-red-600 border-white text-white" : "bg-red-100 border-black text-red-900")
              }`}>
              <p className="text-[11px] font-black font-mono tracking-tighter truncate">
                {session ? `RM ${Math.abs(stats.toCollect).toFixed(0)}` : "LOG MASUK"}
              </p>
              {!session && <div className="absolute inset-0 flex items-center justify-center"><Lock size={10} /></div>}
            </div>
          </div>

          {/* STAT 2: BUDGET (BAKI) */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center px-1">
              <span className={`text-[10px] font-black uppercase tracking-widest ${darkMode ? "text-white/60" : "text-black/60"}`}>BAKI</span>
              <Wallet size={12} className={darkMode ? "text-orange-400" : "text-orange-600"} />
            </div>
            <div className={`relative h-8 rounded-full border-2 flex items-center justify-center px-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${darkMode ? "bg-orange-600 border-white text-white" : "bg-orange-100 border-black text-orange-900"
              }`}>
              <p className="text-[11px] font-black font-mono tracking-tighter truncate">
                {session ? `RM ${stats.pocketBalance.toFixed(0)}` : "LOG MASUK"}
              </p>
              {!session && <div className="absolute inset-0 flex items-center justify-center"><Lock size={10} /></div>}
            </div>
          </div>

          {/* STAT 3: SUB.TRACKER (BIL) */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center px-1">
              <span className={`text-[10px] font-black uppercase tracking-widest ${darkMode ? "text-white/60" : "text-black/60"}`}>BIL</span>
              <CalendarClock size={12} className={darkMode ? "text-pink-400" : "text-pink-600"} />
            </div>
            <div className={`relative h-8 rounded-full border-2 flex items-center justify-center px-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${darkMode ? "bg-pink-600 border-white text-white" : "bg-pink-100 border-black text-pink-900"
              }`}>
              <p className="text-[10px] font-black uppercase truncate leading-none text-center">
                {session ? stats.nextBill.split(' (')[0] : "LOG MASUK"}
              </p>
              {!session && <div className="absolute inset-0 flex items-center justify-center"><Lock size={10} /></div>}
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* APP 1: SPLITIT (ACTIVE) - Structure Asal Kekal */}
          <Link href="/splitit" className={cardStyle}>
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-xl border-2 ${darkMode ? "bg-indigo-500 border-indigo-400 text-white" : "bg-indigo-100 border-indigo-800 text-indigo-800"}`}>
                <img src="/icon.png" alt="Logo" className="w-6 h-6 object-contain" />
              </div>
              <ArrowUpRight size={20} className="opacity-50 group-hover:opacity-100 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
            </div>
            <h3 className="text-xl font-black uppercase mb-1">SplitIt v5.1</h3>
            <p className="text-xs font-bold opacity-60 leading-relaxed">
              Kira bil. Support Multiplayer, Direct Tukar Currency, Offline Mode & AI Scan.
            </p>
            <div className="mt-4 pt-4 border-t border-dashed border-current border-opacity-20 flex gap-2">
              <span className="text-[9px] font-black uppercase px-2 py-1 rounded border border-current opacity-60">Finance</span>
              <span className="text-[9px] font-black uppercase px-2 py-1 rounded border border-current opacity-60">Utility</span>
            </div>
          </Link>

          {/* APP 2: BUDGET.AI (ACTIVE) */}
          <Link href="/budget" className={cardStyle}>
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-xl border-2 ${darkMode ? "bg-orange-600 border-white text-white" : "bg-orange-100 border-orange-900 text-orange-900"}`}>
                <Wallet size={24} />
              </div>
              <ArrowUpRight size={20} className="opacity-50 group-hover:opacity-100 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
            </div>

            <h3 className="text-xl font-black uppercase mb-1">Budget.AI</h3>

            <p className="text-xs font-bold opacity-60 leading-relaxed">
              Track duit poket. Auto-Scan Resit, Analitik Belanja & Monitor Baki.
            </p>
            <div className="mt-4 pt-4 border-t border-dashed border-current border-opacity-20 flex gap-2">
              <span className="text-[9px] font-black uppercase px-2 py-1 rounded border border-current opacity-60">Personal</span>
              <span className="text-[9px] font-black uppercase px-2 py-1 rounded border border-current opacity-60">Tracker</span>
            </div>
          </Link>

          {/* APP 3: SUB.TRACKER (ACTIVE) */}
          <Link href="/sub-tracker" className={cardStyle}>
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-xl border-2 ${darkMode ? "bg-pink-600 border-white text-white" : "bg-pink-100 border-pink-900 text-pink-900"}`}>
                <RefreshCw size={24} />
              </div>
              <ArrowUpRight size={20} className="opacity-50 group-hover:opacity-100 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
            </div>

            <h3 className="text-xl font-black uppercase mb-1">Sub.Tracker</h3>

            <p className="text-xs font-bold opacity-60 leading-relaxed">
              Urus komitmen wajib & subscription lifestyle. Realiti check kos setahun.
            </p>
            <div className="mt-4 pt-4 border-t border-dashed border-current border-opacity-20 flex gap-2">
              <span className="text-[9px] font-black uppercase px-2 py-1 rounded border border-current opacity-60">Fixed Cost</span>
              <span className="text-[9px] font-black uppercase px-2 py-1 rounded border border-current opacity-60">Lifestyle</span>
            </div>
          </Link>

          {/* APP 4: TRIPIT */}
          <Link href="/tripit" className={cardStyle}>
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-xl border-2 ${darkMode ? "bg-indigo-600 border-white text-white" : "bg-indigo-100 border-indigo-900 text-indigo-900"}`}>
                <Plane size={24} />
              </div>
              <ArrowUpRight size={20} className="opacity-50 group-hover:opacity-100 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
            </div>

            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-xl font-black uppercase">TripIt</h3>
              <span className="flex items-center gap-1 rounded border border-black bg-indigo-500 px-1.5 py-0.5 text-[9px] font-black text-white animate-[pulse_3s_ease-in-out_infinite] motion-reduce:animate-none">
                <span className="h-1 w-1 rounded-full bg-white" aria-hidden="true" />
                NEW
              </span>
            </div>
            <p className="text-xs font-bold opacity-60 leading-relaxed">
              Travel Planner + Budget. Itinerary, Target Belanja & Split Bill dalam satu app.
            </p>
            <div className="mt-4 pt-4 border-t border-dashed border-current border-opacity-20 flex gap-2">
              <span className="text-[9px] font-black uppercase px-2 py-1 rounded border border-current opacity-60">Itinerary</span>
              <span className="text-[9px] font-black uppercase px-2 py-1 rounded border border-current opacity-60">Budget</span>
              <span className="text-[9px] font-black uppercase px-2 py-1 rounded border border-current opacity-60">Split</span>
            </div>
          </Link>

          {/* APP 5: NEXT PROJECT IDEA */}
          <div className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center opacity-50 ${darkMode ? "border-white" : "border-black"}`}>
            <Layout size={32} className="mb-3" />
            <h3 className="text-lg font-black uppercase">Next Project?</h3>
            <p className="text-xs font-bold mt-1">Ada Idea App Apa Next?</p>
          </div>

        </div>

      </main>

      {/* FOOTER - KEKAL ASAL (Privacy & Terms) */}
      <footer className="p-10 flex flex-col items-center gap-4">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Built by kmlxly</p>
        <div className="flex gap-4 items-center">
          <Link href="/privacy-policy" className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 border-2 rounded-lg transition-all hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:scale-95 ${darkMode ? "border-white/20 text-white/40 hover:border-white hover:text-white hover:shadow-white" : "border-black/20 text-black/40 hover:border-black hover:text-black"}`}>Privacy Policy</Link>
          <Link href="/terms-of-service" className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 border-2 rounded-lg transition-all hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:scale-95 ${darkMode ? "border-white/20 text-white/40 hover:border-white hover:text-white hover:shadow-white" : "border-black/20 text-black/40 hover:border-black hover:text-black"}`}>Terms of Service</Link>
        </div>
      </footer>

      {/* MODALS (Kekal Asal) */}
      <AuthModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        isDarkMode={darkMode}
      />

      {/* --- MODAL: HELP GUIDE --- */}
      {showHelpModal && (
        <div role="dialog" aria-modal="true" aria-labelledby="help-title" className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className={`w-full max-w-[320px] max-h-[80vh] flex flex-col rounded-[2.5rem] border-2 ${darkMode ? "bg-[#1E1E1E] border-white text-white" : "bg-white border-black text-black"} shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative animate-in zoom-in-95 overflow-hidden`}>

            {/* Header Bergaya */}
            <div className="p-6 pb-2">
              <div className="flex justify-between items-start mb-4">
                <div className={`w-12 h-12 rounded-2xl border-2 flex items-center justify-center ${darkMode ? "bg-white text-black" : "bg-black text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,0.2)]"}`}>
                  <HelpCircle size={28} />
                </div>
                <button onClick={() => setShowHelpModal(false)} className="p-2 opacity-60 hover:opacity-100 transition-opacity" aria-label="Tutup bantuan">
                  <X size={24} />
                </button>
              </div>
              <h2 id="help-title" className="text-2xl font-black uppercase leading-none tracking-tighter italic">
                Manual<br />Pengguna
              </h2>
              <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest mt-2">Tutorial & Tips Ringkas</p>
            </div>

            {/* Compact Accordion Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2.5">

              {/* 1. SPLIT IT */}
              <div className={`border-2 rounded-2xl overflow-hidden transition-all ${darkMode ? "border-white" : "border-black"}`}>
                <button
                  onClick={() => setActiveGuideTab(activeGuideTab === "splitit" ? "" : "splitit")}
                  className={`w-full px-4 py-3 flex justify-between items-center font-black uppercase text-[11px] tracking-tight ${activeGuideTab === "splitit" ? (darkMode ? "bg-white text-black" : "bg-black text-white") : ""}`}
                >
                  1. SplitIt (Bil Group) {activeGuideTab === "splitit" ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                {activeGuideTab === "splitit" && (
                  <div className="px-4 py-3 space-y-2 text-[10px] font-bold leading-snug animate-in slide-in-from-top-2 border-t-2 border-current border-opacity-10">
                    <p className="flex gap-2 items-start"><span className="text-blue-500">▶</span> Snap Resit panjang guna AI.</p>
                    <p className="flex gap-2 items-start"><span className="text-blue-500">▶</span> Agih item & kongsi makan.</p>
                    <p className="flex gap-2 items-start"><span className="text-blue-500">▶</span> Auto-kira SST & Service Charge.</p>
                    <p className="flex gap-2 items-start"><span className="text-blue-500">▶</span> Share resit terus ke WhatsApp.</p>
                  </div>
                )}
              </div>

              {/* 2. BUDGET.AI */}
              <div className={`border-2 rounded-2xl overflow-hidden transition-all ${darkMode ? "border-white" : "border-black"}`}>
                <button
                  onClick={() => setActiveGuideTab(activeGuideTab === "budget" ? "" : "budget")}
                  className={`w-full px-4 py-3 flex justify-between items-center font-black uppercase text-[11px] tracking-tight ${activeGuideTab === "budget" ? (darkMode ? "bg-white text-black" : "bg-black text-white") : ""}`}
                >
                  2. Budget.AI (Poket) {activeGuideTab === "budget" ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                {activeGuideTab === "budget" && (
                  <div className="px-4 py-3 space-y-2 text-[10px] font-bold leading-snug animate-in slide-in-from-top-2 border-t-2 border-current border-opacity-10">
                    <p className="flex gap-2 items-start"><span className="text-orange-500">▶</span> Track belanja harian (AI/Manual).</p>
                    <p className="flex gap-2 items-start"><span className="text-orange-500">▶</span> Safe-To-Spend: Link Sub.Tracker.</p>
                    <p className="flex gap-2 items-start"><span className="text-orange-500">▶</span> Ghost Mode: Sembunyi baki.</p>
                    <p className="flex gap-2 items-start"><span className="text-orange-500">▶</span> Analitik struktur perbelanjaan.</p>
                  </div>
                )}
              </div>

              {/* 3. SUB.TRACKER */}
              <div className={`border-2 rounded-2xl overflow-hidden transition-all ${darkMode ? "border-white/50" : "border-black/50"}`}>
                <button
                  onClick={() => setActiveGuideTab(activeGuideTab === "subtracker" ? "" : "subtracker")}
                  className={`w-full px-4 py-3 flex justify-between items-center font-black uppercase text-[11px] tracking-tight ${activeGuideTab === "subtracker" ? (darkMode ? "bg-white text-black" : "bg-black text-white") : ""}`}
                >
                  3. Sub.Tracker <span className="text-[8px] border px-1 rounded-md ml-1 border-current opacity-60">BETA</span> {activeGuideTab === "subtracker" ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                {activeGuideTab === "subtracker" && (
                  <div className="px-4 py-3 space-y-2 text-[10px] font-bold leading-snug animate-in slide-in-from-top-2 border-t-2 border-current border-opacity-10">
                    <p className="flex gap-2 items-start"><span className="text-pink-500">▶</span> Urus komitmen wajib bulanan.</p>
                    <p className="flex gap-2 items-start"><span className="text-pink-500">▶</span> Yearly Shock: Kira kos setahun.</p>
                    <p className="flex gap-2 items-start"><span className="text-pink-500">▶</span> Auto-Next-Month bayaran.</p>
                  </div>
                )}
              </div>

            </div>

            <div className="p-6">
              <button
                onClick={() => setShowHelpModal(false)}
                className={`w-full py-4 rounded-2xl font-black uppercase text-xs border-2 ${darkMode ? "bg-white text-black border-white" : "bg-black text-white border-black"} transition-all active:scale-95 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]`}
              >
                FAHAM & TUTUP
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
