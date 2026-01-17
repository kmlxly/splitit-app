"use client";

import Link from "next/link";
import React, { useState, useEffect, useRef } from "react";
import {
  Grid, Layout, Moon, Sun, ArrowUpRight,
  LogIn, LogOut, User, Loader2,
  AlertCircle, ArrowRight, X,
  Wallet, Calculator, Sparkles, HelpCircle, ChevronDown, ChevronUp, // Tambah icon Wallet untuk Budget App
  ArrowDownLeft, CalendarClock, Lock, // Tambah icons untuk Quick Stats
  Bot, MessageSquare, Send // Tambah icons untuk AI Chat
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import AuthModal from "@/components/Auth";
import { askTheBoss } from "@/app/actions/ai-chat";

export default function Home() {
  // --- STATE ---
  const [darkMode, setDarkMode] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [loadingSession, setLoadingSession] = useState(true);

  // State untuk Modal Login biasa & Warning Google
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showLoginGuide, setShowLoginGuide] = useState(false);

  // State untuk User Guide
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [activeGuideTab, setActiveGuideTab] = useState("splitit");

  // Quick Stats State (Supabase Connected)
  const [stats, setStats] = useState({
    toCollect: 0,
    pocketBalance: 0,
    nextBill: "Tiada Data"
  });
  const [loadingStats, setLoadingStats] = useState(true);

  // AI Chat State
  const [showAIChat, setShowAIChat] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<Array<{ id: number, text: string, sender: 'user' | 'ai' }>>([
    { id: 1, text: "Apa lagi kau nak? Duit dah habis ke? Pilih menu bawah ni cepat.", sender: 'ai' }
  ]);
  const [isAIThinking, setIsAIThinking] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (showAIChat) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, showAIChat]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;

    // 1. Add User Message
    const newUserMsg = { id: Date.now(), text: text, sender: 'user' as const };
    setMessages(prev => [...prev, newUserMsg]);
    setChatInput("");
    setIsAIThinking(true);

    try {
      // 2. Hybrid Approach: Call Server Action first (for RAG Context)
      // If server fails (due to API Key 403), it returns a specific string with the PREPARED PROMPT.
      // Then client executes the prompt.

      const token = session?.access_token || "";
      let aiReply = await askTheBoss(text, token);

      // Check if server requested fallback (means 403 Blocked or Error)
      if (aiReply.startsWith("FALLBACK_TO_CLIENT::")) {
        const promptFromAction = aiReply.replace("FALLBACK_TO_CLIENT::", "");
        console.warn("Switching to Client-Side Fetch due to Server Block...");

        const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY!;
        let response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: promptFromAction }] }] })
        });

        if (!response.ok && response.status === 404) {
          response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: [{ text: promptFromAction }] }] })
          });
        }

        const data = await response.json();
        aiReply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Aduh, jem otak aku.";
      }

      const newAIMsg = { id: Date.now() + 1, text: aiReply, sender: 'ai' as const };
      setMessages(prev => [...prev, newAIMsg]);
    } catch (error) {
      console.error("AI Chat Error:", error);
      const errorMsg = { id: Date.now() + 1, text: "Internet problem la pulak. Check connection kau.", sender: 'ai' as const };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsAIThinking(false);
    }
  };

  // --- EFFECT: Load Stats from Supabase ---
  useEffect(() => {
    async function loadStats() {
      if (!session?.user) return;

      try {
        const userId = session.user.id;
        let totalOwed = 0;
        let currentBalance = 0;
        let nextBillLabel = "Tiada Data";

        // 1. SPLITIT: Fetch Sessions & Bills (Decoupled for Safety)
        const { data: mySessions, error: sessionError } = await supabase
          .from('sessions')
          .select('id, people')
          .eq('owner_id', userId);

        if (sessionError) console.error("Dashboard Session Error:", sessionError);

        if (mySessions && mySessions.length > 0) {
          const sessionIds = mySessions.map(s => s.id);

          // Fetch Bills separately to guarantee data
          const { data: myBills, error: billError } = await supabase
            .from('bills')
            .select('*')
            .in('session_id', sessionIds);

          if (billError) console.error("Dashboard Bill Error:", billError);

          if (myBills) {
            console.log(`[Dashboard] Found ${myBills.length} bills.`);
            // Map bills to sessions to calculate totals
            mySessions.forEach(sess => {
              // HARDENED LOGIC: Find "Me"
              // 1. Try to find person with id "p1" (Standard Creator ID)
              // 2. Fallback to first person in list
              const p1Exists = sess.people?.find((p: any) => p.id === 'p1');
              const myPersonId = p1Exists ? 'p1' : (sess.people && sess.people.length > 0 ? sess.people[0].id : 'p1');

              const sessBills = myBills.filter((b: any) => b.session_id === sess.id);

              sessBills.forEach((b: any) => {
                const paidBy = b.paid_by || "";

                if (paidBy === myPersonId) {
                  // People owe ME
                  const myDetail = b.details?.find((d: any) => d.personId === myPersonId);
                  // If myDetail missing, assume 0 share (I paid for everyone else completely)
                  const myShare = myDetail ? Number(myDetail.total) : 0;
                  const totalAmt = Number(b.total_amount);

                  const owed = totalAmt - myShare;

                  if (!isNaN(owed)) {
                    totalOwed += owed;
                  }
                }
              });
            });
          }
        }

        // 2. BUDGET.AI: "Baki Poket"
        try {
          const { data: budgetData } = await supabase
            .from('budget_transactions')
            .select('amount')
            .eq('user_id', userId);

          if (budgetData) {
            // Formula: Sum of valid amounts
            currentBalance = budgetData.reduce((acc, curr) => acc + (curr.amount || 0), 0);
          }
        } catch (e) { console.log("Budget Table likely missing"); }

        // 3. SUB.TRACKER: "Next Bill"
        try {
          const { data: subData } = await supabase
            .from('subscriptions')
            .select('title, price, first_bill_date, cycle')
            .eq('user_id', userId);

          if (subData && subData.length > 0) {
            // Find nearest bill logic
            const today = new Date();
            let nearestDays = Infinity;
            let nearestSub = null;

            subData.forEach((sub: any) => {
              if (!sub.first_bill_date) return;
              const firstDate = new Date(sub.first_bill_date);
              const dayOfMonth = firstDate.getDate();

              // Calculate next occurrence
              const nextDate = new Date(today.getFullYear(), today.getMonth(), dayOfMonth);
              if (nextDate < today) {
                nextDate.setMonth(nextDate.getMonth() + 1);
              }

              const diffTime = Math.abs(nextDate.getTime() - today.getTime());
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

              if (diffDays < nearestDays) {
                nearestDays = diffDays;
                nearestSub = sub;
              }
            });

            if (nearestSub) {
              nextBillLabel = `${(nearestSub as any).title} (${nearestDays} hari)`;
            }
          }
        } catch (e) { console.log("Sub Table likely missing"); }

        setStats({
          toCollect: totalOwed,
          pocketBalance: currentBalance,
          nextBill: nextBillLabel
        });

      } catch (error) {
        console.error("Error loading dashboard stats:", error);
      } finally {
        setLoadingStats(false);
      }
    }

    if (session) {
      loadStats();
    }
  }, [session]);

  // --- EFFECT: Load Dark Mode & Session ---
  useEffect(() => {
    // 1. Dark Mode Check
    const savedMode = localStorage.getItem("splitit_darkmode");
    if (savedMode !== null) setDarkMode(savedMode === "true");

    // 2. Supabase Session Check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoadingSession(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // --- HANDLERS ---
  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem("splitit_darkmode", String(newMode));
  };

  const handleLogout = async () => {
    const confirm = window.confirm("Nak logout ke?");
    if (confirm) {
      await supabase.auth.signOut();
    }
  };

  // --- LOGIN FLOW ---
  const handleLoginClick = () => {
    setShowLoginGuide(true);
  };

  const openAuthOptions = () => {
    setShowLoginGuide(false);
    setShowLoginModal(true);
  };

  // --- STYLES ---
  const bgStyle = darkMode ? "bg-black text-white" : "bg-gray-200 text-black";

  // Style Kad Link (Boleh Klik)
  const cardStyle = `group relative border-2 rounded-2xl p-6 transition-all hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${darkMode ? "bg-[#1E1E1E] border-white hover:bg-[#252525]" : "bg-white border-black hover:bg-gray-50"}`;

  // Style Kad Disabled (Tak Boleh Klik - Untuk Coming Soon)
  const disabledCardStyle = `relative border-2 rounded-2xl p-6 opacity-80 ${darkMode ? "bg-[#1E1E1E] border-white/50" : "bg-white border-black"}`;

  const btnStyle = `p-2 rounded-lg border-2 flex items-center justify-center gap-2 text-xs font-bold transition-all active:scale-95 ${darkMode ? "border-white hover:bg-white hover:text-black" : "border-black hover:bg-black hover:text-white"}`;

  return (
    <div className={`min-h-screen font-sans transition-colors duration-300 ${bgStyle} flex flex-col`}>

      {/* HEADER */}
      <header className={`p-6 border-b-2 flex justify-between items-center ${darkMode ? "border-white bg-black" : "border-black bg-gray-200"}`}>

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

          <button onClick={() => setShowHelpModal(true)} className={btnStyle} title="Bantuan">
            <HelpCircle size={18} />
          </button>

          <button onClick={toggleDarkMode} className={btnStyle}>
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 p-6 max-w-2xl mx-auto w-full space-y-8 animate-in fade-in slide-in-from-bottom-4">

        <div className="space-y-2">
          <h2 className="text-4xl font-black uppercase leading-none">
            {session ? `Welcome, ${session.user.email?.split('@')[0]}!` : "Pilih Tools."}
          </h2>
          <p className="opacity-60 font-bold text-sm">
            {session ? "Semua data anda disinkronasi." : "Login untuk simpan data di cloud."}
          </p>
        </div>

        {/* --- QUICK STATS DASHBOARD (NEW) --- */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">

          {/* CARD 1: SPLITIT (Indigo) */}
          <div className={`border-2 rounded-xl p-4 flex flex-col justify-between relative overflow-hidden ${darkMode ? "border-white bg-[#1E1E1E]" : "border-black bg-white"} shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]`}>
            <div className="flex justify-between items-start mb-2">
              <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border ${darkMode ? "bg-indigo-500 text-white border-indigo-400" : "bg-indigo-100 text-indigo-800 border-indigo-800"}`}>
                NAK KUTIP
              </span>
              <div className={`p-1.5 rounded-lg border ${darkMode ? "border-indigo-400 text-indigo-400" : "border-indigo-800 text-indigo-800"}`}>
                <ArrowDownLeft size={14} />
              </div>
            </div>

            <div className="relative">
              <p className={`text-xl font-mono font-black tracking-tighter ${!session ? "blur-sm opacity-50 select-none" : ""}`}>
                RM {stats.toCollect.toFixed(2)}
              </p>
              {!session && (
                <div className="absolute inset-0 flex items-center justify-center -translate-y-1">
                  <Lock size={16} className="opacity-70" />
                </div>
              )}
            </div>
            {!session && <p className="text-[8px] font-bold uppercase opacity-40 mt-1">Login to View</p>}
          </div>

          {/* CARD 2: BUDGET (Orange) */}
          <div className={`border-2 rounded-xl p-4 flex flex-col justify-between relative overflow-hidden ${darkMode ? "border-white bg-[#1E1E1E]" : "border-black bg-white"} shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]`}>
            <div className="flex justify-between items-start mb-2">
              <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border ${darkMode ? "bg-orange-600 text-white border-white" : "bg-orange-100 text-orange-900 border-orange-900"}`}>
                BAKI POKET
              </span>
              <div className={`p-1.5 rounded-lg border ${darkMode ? "border-orange-400 text-orange-400" : "border-orange-900 text-orange-900"}`}>
                <Wallet size={14} />
              </div>
            </div>

            <div className="relative">
              <p className={`text-xl font-mono font-black tracking-tighter ${!session ? "blur-sm opacity-50 select-none" : ""}`}>
                RM {stats.pocketBalance.toFixed(2)}
              </p>
              {!session && (
                <div className="absolute inset-0 flex items-center justify-center -translate-y-1">
                  <Lock size={16} className="opacity-70" />
                </div>
              )}
            </div>
            {!session && <p className="text-[8px] font-bold uppercase opacity-40 mt-1">Login to View</p>}
          </div>

          {/* CARD 3: SUB.TRACKER (Pink) */}
          <div className={`border-2 rounded-xl p-4 flex flex-col justify-between relative overflow-hidden ${darkMode ? "border-white bg-[#1E1E1E]" : "border-black bg-white"} shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]`}>
            <div className="flex justify-between items-start mb-2">
              <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border ${darkMode ? "bg-pink-500 text-white border-white" : "bg-pink-100 text-pink-900 border-pink-900"}`}>
                NEXT BILL
              </span>
              <div className={`p-1.5 rounded-lg border ${darkMode ? "border-pink-400 text-pink-400" : "border-pink-900 text-pink-900"}`}>
                <CalendarClock size={14} />
              </div>
            </div>

            <div className="relative">
              <p className={`text-sm font-mono font-black tracking-tight leading-tight pt-1 ${!session ? "blur-sm opacity-50 select-none" : ""}`}>
                {stats.nextBill}
              </p>
              {!session && (
                <div className="absolute inset-0 flex items-center justify-center -translate-y-1">
                  <Lock size={16} className="opacity-70" />
                </div>
              )}
            </div>
            {!session && <p className="text-[8px] font-bold uppercase opacity-40 mt-1">Login to View</p>}
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

            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-xl font-black uppercase">Budget.AI</h3>
              <span className="bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded border border-black font-black animate-pulse flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-white"></span>
                NEW
              </span>
            </div>

            <p className="text-xs font-bold opacity-60 leading-relaxed">
              Track duit poket. Auto-Scan Resit, Analitik Belanja & Monitor Baki.
            </p>
            <div className="mt-4 pt-4 border-t border-dashed border-current border-opacity-20 flex gap-2">
              <span className="text-[9px] font-black uppercase px-2 py-1 rounded border border-current opacity-60">Personal</span>
              <span className="text-[9px] font-black uppercase px-2 py-1 rounded border border-current opacity-60">Tracker</span>
            </div>
          </Link>

          {/* APP 3: SUB.TRACKER (COMING SOON) */}
          <div className={disabledCardStyle}>
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-xl border-2 grayscale opacity-70 ${darkMode ? "bg-pink-500 border-white text-white" : "bg-pink-100 border-pink-900 text-pink-900"}`}>
                <Sparkles size={24} />
              </div>
              <span className="text-[9px] font-black uppercase px-2 py-1 rounded bg-gray-500/20 text-gray-500 border border-current">COMING SOON</span>
            </div>

            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-xl font-black uppercase opacity-60">Sub.Tracker</h3>
              <span className="bg-gray-400 text-white text-[9px] px-1.5 py-0.5 rounded border border-black font-black grayscale opacity-70">NEW</span>
            </div>

            <p className="text-xs font-bold opacity-40 leading-relaxed">
              Urus komitmen wajib & subscription lifestyle. Realiti check kos setahun.
            </p>
            <div className="mt-4 pt-4 border-t border-dashed border-current border-opacity-20 flex gap-2 opacity-50">
              <span className="text-[9px] font-black uppercase px-2 py-1 rounded border border-current">Fixed Cost</span>
              <span className="text-[9px] font-black uppercase px-2 py-1 rounded border border-current">Lifestyle</span>
            </div>
          </div>

          {/* APP 4: NEXT PROJECT IDEA (Kekal Asal) */}
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

      {showLoginGuide && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in">
          <div className={`w-full max-w-[320px] p-6 rounded-2xl border-2 ${darkMode ? "bg-[#1E1E1E] border-white text-white" : "bg-white border-black text-black"} shadow-2xl relative animate-in zoom-in-95`}>
            <button onClick={() => setShowLoginGuide(false)} className="absolute top-4 right-4 opacity-50 hover:opacity-100"><X size={20} /></button>

            <div className="text-center mb-4">
              <div className="w-16 h-16 mx-auto bg-yellow-100 rounded-full flex items-center justify-center mb-3 border-2 border-black">
                <AlertCircle size={32} className="text-yellow-600" />
              </div>
              <h2 className="text-lg font-black uppercase leading-tight text-red-500">Google Warning!</h2>
              <p className="text-[10px] font-bold opacity-60 mt-2 leading-relaxed">
                App status "Beta". Kalau nampak warning merah, jangan panik. Ikut langkah di bawah.
              </p>
            </div>

            <div className={`p-4 rounded-xl border-2 border-dashed mb-6 text-left space-y-3 ${darkMode ? "bg-black/30 border-white/20" : "bg-gray-50 border-black/10"}`}>
              <p className="text-[9px] font-black uppercase opacity-50 mb-1">CARA LEPAS WARNING:</p>
              <div className="flex items-start gap-3">
                <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">1</span>
                <p className="text-xs font-bold">Tekan link <span className="underline decoration-red-500 decoration-2">Advanced</span> (Kiri Bawah).</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">2</span>
                <p className="text-xs font-bold">Tekan <span className="underline decoration-red-500 decoration-2">Go to SplitIt (unsafe)</span>.</p>
              </div>
            </div>

            <button onClick={openAuthOptions} className={`w-full py-3 rounded-xl font-black uppercase text-xs border-2 flex items-center justify-center gap-2 transition-all active:scale-95 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] ${darkMode ? "bg-white text-black border-white shadow-none" : "bg-blue-600 text-white border-black"}`}>
              FAHAM, PILIH CARA LOGIN <ArrowRight size={14} />
            </button>
            <p className="text-[9px] text-center mt-3 opacity-40 font-bold">Safe & Secure. No password stored.</p>
          </div>
        </div>
      )}

      {/* --- MODAL: HELP GUIDE --- */}
      {showHelpModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className={`w-full max-w-[320px] max-h-[80vh] flex flex-col rounded-[2.5rem] border-2 ${darkMode ? "bg-[#1E1E1E] border-white text-white" : "bg-white border-black text-black"} shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative animate-in zoom-in-95 overflow-hidden`}>

            {/* Header Bergaya */}
            <div className="p-6 pb-2">
              <div className="flex justify-between items-start mb-4">
                <div className={`w-12 h-12 rounded-2xl border-2 flex items-center justify-center ${darkMode ? "bg-white text-black" : "bg-black text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,0.2)]"}`}>
                  <HelpCircle size={28} />
                </div>
                <button onClick={() => setShowHelpModal(false)} className="p-1 opacity-40 hover:opacity-100 transition-opacity">
                  <X size={24} />
                </button>
              </div>
              <h2 className="text-2xl font-black uppercase leading-none tracking-tighter italic">
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

      {/* --- FLOATING AI AGENT (THE BOSS) --- */}

      {/* 1. Trigger Button */}
      <button
        onClick={() => setShowAIChat(!showAIChat)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-xl border-2 border-black bg-yellow-400 flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none active:scale-95`}
      >
        {showAIChat ? <X size={28} className="text-black" /> : <Bot size={28} className="text-black" />}
      </button>

      {/* 2. Chat Window (Popover) */}
      {showAIChat && (
        <div className={`fixed bottom-24 right-6 z-50 w-80 max-w-[90vw] flex flex-col rounded-xl border-2 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] animate-in slide-in-from-bottom-10 zoom-in-95 ${darkMode ? "bg-[#1E1E1E] border-white text-white" : "bg-white border-black text-black"}`}>

          {/* Header */}
          <div className={`p-4 border-b-2 flex justify-between items-center ${darkMode ? "border-white bg-black/20" : "border-black bg-gray-50"}`}>
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center ${darkMode ? "bg-white text-black border-white" : "bg-black text-white border-black"}`}>
                <Bot size={18} />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase leading-none">The Boss 🤖</h3>
                <p className="text-[9px] font-bold opacity-60">Financial Ruthless Advisor</p>
              </div>
            </div>
            <button onClick={() => setShowAIChat(false)} className="opacity-50 hover:opacity-100">
              <X size={18} />
            </button>
          </div>

          {/* Body (Messages) */}
          <div className="h-64 overflow-y-auto p-4 space-y-4 text-xs font-bold relative bg-opacity-50">

            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-2 items-end ${msg.sender === 'user' ? "justify-end" : ""}`}>
                {msg.sender === 'ai' && (
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mb-1 ${darkMode ? "bg-white text-black border-white" : "bg-black text-white border-black"}`}>
                    <Bot size={12} />
                  </div>
                )}

                <div className={`p-3 rounded-2xl border-2 max-w-[80%] ${msg.sender === 'user' ?
                  "bg-black text-white border-black rounded-br-sm" :
                  (darkMode ? "bg-gray-800 border-white rounded-bl-sm" : "bg-gray-100 border-black rounded-bl-sm")}`}>
                  <p className="leading-snug">{msg.text}</p>
                </div>
              </div>
            ))}

            {isAIThinking && (
              <div className="flex gap-2 items-end">
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mb-1 ${darkMode ? "bg-white text-black border-white" : "bg-black text-white border-black"}`}>
                  <Bot size={12} />
                </div>
                <div className={`p-3 rounded-2xl rounded-bl-sm border-2 ${darkMode ? "bg-gray-800 border-white" : "bg-gray-100 border-black"}`}>
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce delay-75"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce delay-150"></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Quick Actions (Chips) */}
          <div className="px-4 pb-2 flex gap-2 overflow-x-auto no-scrollbar mask-linear">
            {["💸 Can I Buy This?", "🤬 Minta Hutang", "🔥 Roast Me"].map((action) => (
              <button
                key={action}
                onClick={() => handleSendMessage(action)}
                className={`whitespace-nowrap px-3 py-1.5 rounded-full border-2 text-[10px] font-black uppercase transition-all hover:scale-105 active:scale-95 ${darkMode ? "border-white hover:bg-white hover:text-black" : "border-black hover:bg-black hover:text-white"}`}
              >
                {action}
              </button>
            ))}
          </div>

          {/* Footer (Input) */}
          <div className={`p-3 border-t-2 ${darkMode ? "border-white bg-[#1E1E1E]" : "border-black bg-white"}`}>
            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(chatInput)}
                placeholder="Tanya Boss..."
                className={`flex-1 px-3 py-2 rounded-lg border-2 text-xs font-bold outline-none focus:ring-2 focus:ring-yellow-400 ${darkMode ? "bg-black border-white text-white" : "bg-gray-50 border-black text-black"}`}
              />
              <button
                onClick={() => handleSendMessage(chatInput)}
                className={`p-2 rounded-lg border-2 flex items-center justify-center transition-all active:scale-95 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${darkMode ? "bg-white text-black border-white hover:bg-gray-200" : "bg-yellow-400 text-black border-black hover:bg-yellow-300"}`}
              >
                <Send size={16} />
              </button>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
