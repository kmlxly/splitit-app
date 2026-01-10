"use client";

import Link from "next/link";
import React, { useState, useEffect } from "react";
import { 
  Receipt, ArrowRight, Calculator, Grid, 
  Layout, Moon, Sun, ArrowUpRight 
} from "lucide-react";

export default function Home() {
  const [darkMode, setDarkMode] = useState(false);

  // Load dark mode preference (sama macam app lain supaya konsisten)
  useEffect(() => {
    const savedMode = localStorage.getItem("splitit_darkmode");
    if (savedMode !== null) setDarkMode(savedMode === "true");
  }, []);

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem("splitit_darkmode", String(newMode));
  };

  const bgStyle = darkMode ? "bg-black text-white" : "bg-gray-200 text-black";
  const cardStyle = `group relative border-2 rounded-2xl p-6 transition-all hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${darkMode ? "bg-[#1E1E1E] border-white hover:bg-[#252525]" : "bg-white border-black hover:bg-gray-50"}`;
  
  return (
    <div className={`min-h-screen font-sans transition-colors duration-300 ${bgStyle} flex flex-col`}>
      
      {/* HEADER */}
      <header className={`p-6 border-b-2 flex justify-between items-center ${darkMode ? "border-white bg-black" : "border-black bg-gray-200"}`}>
         <div className="flex items-center gap-3">
             <div className={`w-10 h-10 border-2 rounded-lg flex items-center justify-center ${darkMode ? "bg-white border-white" : "bg-black border-black"}`}>
                <Grid size={20} className={darkMode ? "text-black" : "text-white"}/>
             </div>
             <h1 className="text-xl font-black uppercase tracking-tighter">Kmlxly Apps.</h1>
         </div>
         <button onClick={toggleDarkMode} className={`p-2 rounded-lg border-2 ${darkMode ? "border-white hover:bg-white hover:text-black" : "border-black hover:bg-black hover:text-white"}`}>
             {darkMode ? <Sun size={20}/> : <Moon size={20}/>}
         </button>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 p-6 max-w-2xl mx-auto w-full space-y-8 animate-in fade-in slide-in-from-bottom-4">
        
        <div className="space-y-2">
            <h2 className="text-4xl font-black uppercase leading-none">Pilih Tools.</h2>
            <p className="opacity-60 font-bold text-sm">Semua aplikasi web dalam satu tempat.</p>
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
                <h3 className="text-xl font-black uppercase mb-1">SplitIt v3.1</h3>
                <p className="text-xs font-bold opacity-60 leading-relaxed">
                    Kira bil makan member, support Tax, Service Charge & AI Scan.
                </p>
                <div className="mt-4 pt-4 border-t border-dashed border-current border-opacity-20 flex gap-2">
                    <span className="text-[9px] font-black uppercase px-2 py-1 rounded border border-current opacity-60">Finance</span>
                    <span className="text-[9px] font-black uppercase px-2 py-1 rounded border border-current opacity-60">Utility</span>
                </div>
            </Link>

            {/* APP 2: COMING SOON (PLACEHOLDER) */}
            <div className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center opacity-50 ${darkMode ? "border-white" : "border-black"}`}>
                <Layout size={32} className="mb-3"/>
                <h3 className="text-lg font-black uppercase">Coming Soon</h3>
                <p className="text-xs font-bold mt-1">Idea app seterusnya?</p>
            </div>

        </div>

      </main>

      {/* FOOTER */}
      <footer className="p-8 text-center opacity-40">
          <p className="text-[10px] font-black uppercase tracking-widest">Built by kmlxly</p>
      </footer>
    </div>
  );
}