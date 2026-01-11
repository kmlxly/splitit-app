"use client";

import Link from "next/link";
import React, { useState, useEffect } from "react";
import { 
  Grid, Layout, Moon, Sun, ArrowUpRight, 
  LogIn, LogOut, User, Loader2 
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient"; // Pastikan path ni betul
import AuthModal from "@/components/Auth";       // Pastikan path ni betul

export default function Home() {
  // --- STATE ---
  const [darkMode, setDarkMode] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);

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
        alert("Berjaya logout.");
        // Tak perlu reload, UI akan auto update sebab onAuthStateChange
    }
  };

  // --- STYLES ---
  const bgStyle = darkMode ? "bg-black text-white" : "bg-gray-200 text-black";
  const cardStyle = `group relative border-2 rounded-2xl p-6 transition-all hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${darkMode ? "bg-[#1E1E1E] border-white hover:bg-[#252525]" : "bg-white border-black hover:bg-gray-50"}`;
  const btnStyle = `p-2 rounded-lg border-2 flex items-center justify-center gap-2 text-xs font-bold transition-all active:scale-95 ${darkMode ? "border-white hover:bg-white hover:text-black" : "border-black hover:bg-black hover:text-white"}`;

  return (
    <div className={`min-h-screen font-sans transition-colors duration-300 ${bgStyle} flex flex-col`}>
      
      {/* HEADER */}
      <header className={`p-6 border-b-2 flex justify-between items-center ${darkMode ? "border-white bg-black" : "border-black bg-gray-200"}`}>
         
         {/* Logo Area */}
         <div className="flex items-center gap-3">
             <div className={`w-10 h-10 border-2 rounded-lg flex items-center justify-center ${darkMode ? "bg-white border-white" : "bg-black border-black"}`}>
                <Grid size={20} className={darkMode ? "text-black" : "text-white"}/>
             </div>
             <div>
                <h1 className="text-xl font-black uppercase tracking-tighter leading-none">Kmlxly Apps.</h1>
                {/* Tunjuk status login kecil di bawah logo */}
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
             
             {/* USER AUTH BUTTON */}
             {loadingSession ? (
                 <div className={btnStyle}>
                     <Loader2 size={18} className="animate-spin"/>
                 </div>
             ) : session ? (
                 <button onClick={handleLogout} className={btnStyle} title="Logout">
                     <User size={18} />
                     <span className="hidden sm:inline">{session.user.email?.split('@')[0]}</span>
                     <LogOut size={14} className="opacity-50"/>
                 </button>
             ) : (
                 <button onClick={() => setShowLoginModal(true)} className={btnStyle}>
                     <LogIn size={18} />
                     <span className="hidden sm:inline">LOGIN</span>
                 </button>
             )}

             {/* DARK MODE BUTTON */}
             <button onClick={toggleDarkMode} className={btnStyle}>
                 {darkMode ? <Sun size={18}/> : <Moon size={18}/>}
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* APP 1: SPLITIT */}
            <Link href="/splitit" className={cardStyle}>
                <div className="flex justify-between items-start mb-4">
                    <div className={`p-3 rounded-xl border-2 ${darkMode ? "bg-indigo-500 border-indigo-400 text-white" : "bg-indigo-100 border-indigo-800 text-indigo-800"}`}>
                        <img src="/icon.png" alt="Logo" className="w-6 h-6 object-contain"/>
                    </div>
                    <ArrowUpRight size={20} className="opacity-50 group-hover:opacity-100 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1"/>
                </div>
                <h3 className="text-xl font-black uppercase mb-1">SplitIt v4.3</h3>
                <p className="text-xs font-bold opacity-60 leading-relaxed">
                    Kira bil makan member, support Tax, Service Charge & AI Scan.
                </p>
                <div className="mt-4 pt-4 border-t border-dashed border-current border-opacity-20 flex gap-2">
                    <span className="text-[9px] font-black uppercase px-2 py-1 rounded border border-current opacity-60">Finance</span>
                    <span className="text-[9px] font-black uppercase px-2 py-1 rounded border border-current opacity-60">Utility</span>
                </div>
            </Link>

            {/* APP 2: COMING SOON */}
            <div className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center opacity-50 ${darkMode ? "border-white" : "border-black"}`}>
                <Layout size={32} className="mb-3"/>
                <h3 className="text-lg font-black uppercase">Coming Soon</h3>
                <p className="text-xs font-bold mt-1">Idea app seterusnya?</p>
            </div>

        </div>

      </main>

            {/* FOOTER */}
            <footer className="p-10 flex flex-col items-center gap-4">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Built by kmlxly</p>
          
          {/* 2 PAGE BARU: PRIVACY & TERMS */}
          <div className="flex gap-4 items-center">
              <Link 
                href="/privacy-policy" 
                className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 border-2 rounded-lg transition-all hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:scale-95 ${darkMode ? "border-white/20 text-white/40 hover:border-white hover:text-white hover:shadow-white" : "border-black/20 text-black/40 hover:border-black hover:text-black"}`}
              >
                Privacy Policy
              </Link>
              <Link 
                href="/terms-of-service" 
                className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 border-2 rounded-lg transition-all hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:scale-95 ${darkMode ? "border-white/20 text-white/40 hover:border-white hover:text-white hover:shadow-white" : "border-black/20 text-black/40 hover:border-black hover:text-black"}`}
              >
                Terms of Service
              </Link>
          </div>
      </footer>


      {/* MODAL LOGIN */}
      <AuthModal 
        isOpen={showLoginModal} 
        onClose={() => setShowLoginModal(false)}
        isDarkMode={darkMode}
      />
      
    </div>
  );
}