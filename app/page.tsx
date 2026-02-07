"use client";

import Link from "next/link";
import React, { useState, useEffect, useRef } from "react";
import {
  Grid, Layout, Moon, Sun, ArrowUpRight,
  LogIn, LogOut, User, Loader2,
  AlertCircle, ArrowRight, X,
  Wallet, Calculator, Sparkles, HelpCircle, ChevronDown, ChevronUp, // Tambah icon Wallet untuk Budget App
  ArrowDownLeft, CalendarClock, Lock, RefreshCw, Plane, // Tambah icons untuk Quick Stats
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

  // --- FUNCTION: Load Stats from Supabase ---
  const loadStats = React.useCallback(async () => {
    if (!session?.user) return;
    setLoadingStats(true);

    try {
      const userId = session.user.id;
      const myEmailPrefix = session.user.email?.split('@')[0].toLowerCase() || "";

      let finalToCollect = 0;
      let finalPocketBalance = 0;
      let finalNextBill = "Tiada Data";

      // 1. SPLITIT DATA
      const { data: membershipData } = await supabase.from('session_members').select('session_id').eq('user_id', userId);
      const sharedSessionIds = membershipData?.map(m => m.session_id) || [];

      const { data: allSessions } = await supabase
        .from('sessions')
        .select('id, people, owner_id, paid_status')
        .or(`owner_id.eq.${userId}${sharedSessionIds.length > 0 ? `,id.in.(${sharedSessionIds.join(',')})` : ''}`);

      if (allSessions && allSessions.length > 0) {
        const sessionIds = allSessions.map(s => s.id);
        const { data: myBills } = await supabase.from('bills').select('*').in('session_id', sessionIds);

        if (myBills) {
          let totalReceivable = 0;
          let totalPayable = 0;

          allSessions.forEach(sess => {
            const isOwner = sess.owner_id === userId;
            const people = sess.people || [];
            const paidStatus = sess.paid_status || {};
            const peopleIds = people.map((p: any) => p.id);

            // Robust Identity Check
            let myPersonId = isOwner ? 'p1' : '';
            const nameMatch = people.find((p: any) => {
              const n = p.name.toLowerCase();
              return n === 'aku' || n === 'me' || n === myEmailPrefix;
            });

            if (nameMatch) {
              if (!isOwner || (isOwner && nameMatch.id === 'p1')) myPersonId = nameMatch.id;
            }

            if (!myPersonId) {
              const guest = people.find((p: any) => p.id !== 'p1');
              myPersonId = guest ? guest.id : (people[0]?.id || 'p1');
            }

            const sessBills = myBills.filter((b: any) => b.session_id === sess.id);
            let debtMap: Record<string, Record<string, number>> = {};
            peopleIds.forEach((id: string) => debtMap[id] = {});

            sessBills.forEach((b: any) => {
              const payerId = b.paid_by;
              if (!debtMap[payerId]) return;
              b.details?.forEach((d: any) => {
                const consumerId = d.personId;
                if (consumerId !== payerId && d.total > 0 && debtMap[consumerId]) {
                  debtMap[consumerId][payerId] = (debtMap[consumerId][payerId] || 0) + Number(d.total);
                }
              });
            });

            let processed = new Set<string>();
            peopleIds.forEach((idA: string) => {
              peopleIds.forEach((idB: string) => {
                if (idA === idB) return;
                const key = [idA, idB].sort().join("-");
                if (processed.has(key)) return;

                const aOwesB = debtMap[idA]?.[idB] || 0;
                const bOwesA = debtMap[idB]?.[idA] || 0;

                let transfer = null;
                if (aOwesB > bOwesA) transfer = { from: idA, to: idB, amount: aOwesB - bOwesA };
                else if (bOwesA > aOwesB) transfer = { from: idB, to: idA, amount: bOwesA - aOwesB };

                if (transfer && transfer.amount > 0.05) {
                  const isPaid = paidStatus[`${transfer.from}-${transfer.to}`];
                  if (!isPaid) {
                    if (transfer.to === myPersonId) totalReceivable += transfer.amount;
                    if (transfer.from === myPersonId) totalPayable += transfer.amount;
                  }
                }
                processed.add(key);
              });
            });
          });
          finalToCollect = totalReceivable - totalPayable;
        }
      }

      // 2. BUDGET DATA (Current Month Only)
      const currentMonthStr = new Date().toISOString().slice(0, 7); // "YYYY-MM"
      const { data: budgetData } = await supabase
        .from('budget_transactions')
        .select('amount')
        .eq('user_id', userId)
        .gte('iso_date', `${currentMonthStr}-01`)
        .lte('iso_date', `${currentMonthStr}-31`);

      if (budgetData) {
        finalPocketBalance = budgetData.reduce((acc, curr) => acc + (curr.amount || 0), 0);
      }

      // 3. SUB DATA
      const { data: subData } = await supabase.from('subscriptions').select('*').eq('user_id', userId);
      if (subData && subData.length > 0) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        let nearestDays = Infinity;
        let nearestSub: any = null;

        subData.forEach((sub: any) => {
          if (!sub.first_bill_date) return;
          const due = new Date(sub.first_bill_date);
          due.setHours(0, 0, 0, 0);
          let diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

          if (sub.cycle === "Monthly" && diffDays < 0) {
            const nextMonth = new Date(due);
            nextMonth.setMonth(nextMonth.getMonth() + 1);
            if (nextMonth.getDate() !== due.getDate()) nextMonth.setDate(0);
            diffDays = Math.ceil((nextMonth.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          }

          if (diffDays >= 0 && diffDays < nearestDays) {
            nearestDays = diffDays;
            nearestSub = sub;
          }
        });

        if (nearestSub) {
          const label = nearestDays === 0 ? "HARI NI!" : `${nearestDays} hari`;
          finalNextBill = `${nearestSub.title} (${label})`;
        }
      }

      if (Math.abs(finalToCollect) < 0.05) finalToCollect = 0;

      setStats({
        toCollect: finalToCollect,
        pocketBalance: finalPocketBalance,
        nextBill: finalNextBill
      });

    } catch (err) {
      console.error("Dashboard Stats Error:", err);
    } finally {
      setLoadingStats(false);
    }
  }, [session]);

  // --- EFFECT: Auth & Initial Load ---
  useEffect(() => {
    // 1. Dark Mode
    const savedMode = localStorage.getItem("splitit_darkmode");
    if (savedMode !== null) setDarkMode(savedMode === "true");

    // 2. Initial Session
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setLoadingSession(false);
    });

    // 3. Auth Listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  // --- EFFECT: Real-time Stats ---
  useEffect(() => {
    if (session) {
      loadStats();

      const channel = supabase.channel('dashboard-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'bills' }, () => loadStats())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, () => loadStats())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'budget_transactions' }, () => loadStats())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'subscriptions' }, () => loadStats())
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, [session, loadStats]);

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

        {/* --- QUICK STATS DASHBOARD (PILL V3) --- */}
        <section className="grid grid-cols-3 gap-3 mb-6">

          {/* STAT 1: SPLITIT (KUTIP/BAYAR) */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center px-1">
              <span className={`text-[8px] font-black uppercase tracking-widest ${darkMode ? "text-white/60" : "text-black/60"}`}>
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
              <p className={`text-[11px] font-black font-mono tracking-tighter truncate ${!session ? "blur-[2px] opacity-50" : ""}`}>
                RM {Math.abs(stats.toCollect).toFixed(0)}
              </p>
              {!session && <div className="absolute inset-0 flex items-center justify-center"><Lock size={10} /></div>}
            </div>
          </div>

          {/* STAT 2: BUDGET (BAKI) */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center px-1">
              <span className={`text-[8px] font-black uppercase tracking-widest ${darkMode ? "text-white/60" : "text-black/60"}`}>BAKI</span>
              <Wallet size={12} className={darkMode ? "text-orange-400" : "text-orange-600"} />
            </div>
            <div className={`relative h-8 rounded-full border-2 flex items-center justify-center px-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${darkMode ? "bg-orange-600 border-white text-white" : "bg-orange-100 border-black text-orange-900"
              }`}>
              <p className={`text-[11px] font-black font-mono tracking-tighter truncate ${!session ? "blur-[2px] opacity-50" : ""}`}>
                RM {stats.pocketBalance.toFixed(0)}
              </p>
              {!session && <div className="absolute inset-0 flex items-center justify-center"><Lock size={10} /></div>}
            </div>
          </div>

          {/* STAT 3: SUB.TRACKER (BIL) */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center px-1">
              <span className={`text-[8px] font-black uppercase tracking-widest ${darkMode ? "text-white/60" : "text-black/60"}`}>BIL</span>
              <CalendarClock size={12} className={darkMode ? "text-pink-400" : "text-pink-600"} />
            </div>
            <div className={`relative h-8 rounded-full border-2 flex items-center justify-center px-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${darkMode ? "bg-pink-600 border-white text-white" : "bg-pink-100 border-black text-pink-900"
              }`}>
              <p className={`text-[9px] font-black uppercase truncate leading-none text-center ${!session ? "blur-[2px] opacity-50" : ""}`}>
                {stats.nextBill.split(' (')[0]}
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

          {/* APP 3: SUB.TRACKER (ACTIVE) */}
          <Link href="/sub-tracker" className={cardStyle}>
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-xl border-2 ${darkMode ? "bg-pink-600 border-white text-white" : "bg-pink-100 border-pink-900 text-pink-900"}`}>
                <RefreshCw size={24} />
              </div>
              <ArrowUpRight size={20} className="opacity-50 group-hover:opacity-100 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
            </div>

            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-xl font-black uppercase">Sub.Tracker</h3>
              <span className="bg-pink-500 text-white text-[9px] px-1.5 py-0.5 rounded border border-black font-black animate-pulse flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-white animate-pulse"></span>
                NEW
              </span>
            </div>

            <p className="text-xs font-bold opacity-60 leading-relaxed">
              Urus komitmen wajib & subscription lifestyle. Realiti check kos setahun.
            </p>
            <div className="mt-4 pt-4 border-t border-dashed border-current border-opacity-20 flex gap-2">
              <span className="text-[9px] font-black uppercase px-2 py-1 rounded border border-current opacity-60">Fixed Cost</span>
              <span className="text-[9px] font-black uppercase px-2 py-1 rounded border border-current opacity-60">Lifestyle</span>
            </div>
          </Link>

          {/* APP 4: TRIPIT (COMING SOON) */}
          {/* APP 4: TRIPIT (COMING SOON) */}
          <div className={disabledCardStyle}>
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-xl border-2 grayscale ${darkMode ? "bg-indigo-600 border-white text-white" : "bg-indigo-100 border-indigo-900 text-indigo-900"}`}>
                <Plane size={24} />
              </div>
              <span className="text-[9px] font-black uppercase px-2 py-1 rounded border border-current opacity-60">COMING SOON</span>
            </div>

            <h3 className="text-xl font-black uppercase mb-1">TripIt</h3>
            <p className="text-xs font-bold opacity-60 leading-relaxed">
              Travel Planner + Budget. Itinerary, Target Belanja & Split Bill dalam satu app.
            </p>
            <div className="mt-4 pt-4 border-t border-dashed border-current border-opacity-20 flex gap-2">
              <span className="text-[9px] font-black uppercase px-2 py-1 rounded border border-current opacity-60">Itinerary</span>
              <span className="text-[9px] font-black uppercase px-2 py-1 rounded border border-current opacity-60">Budget</span>
              <span className="text-[9px] font-black uppercase px-2 py-1 rounded border border-current opacity-60">Split</span>
            </div>
          </div>

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

      {showLoginGuide && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in">
          <div className={`w-full max-w-sm p-5 rounded-2xl border-2 ${darkMode ? "bg-[#1E1E1E] border-white text-white" : "bg-white border-black text-black"} shadow-2xl relative animate-in zoom-in-95`}>
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className={`w-full max-w-sm max-h-[80vh] flex flex-col rounded-2xl border-2 ${darkMode ? "bg-[#1E1E1E] border-white text-white" : "bg-white border-black text-black"} shadow-2xl relative animate-in zoom-in-95 overflow-hidden`}>

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
