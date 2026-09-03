"use client";

import React, { useState } from "react";
import { ArrowRight, Receipt, Wallet, Plane, RefreshCw, Sparkles, Shield, ChevronRight } from "lucide-react";

interface WelcomeScreenProps {
  onLoginGoogle: () => void;
  onOpenEmailAuth: () => void;
  onContinueGuest: () => void;
  isDarkMode: boolean;
}

export default function WelcomeScreen({
  onLoginGoogle,
  onOpenEmailAuth,
  onContinueGuest,
  isDarkMode,
}: WelcomeScreenProps) {
  const [activeDeckTab, setActiveDeckTab] = useState<number>(0);

  const previewApps = [
    {
      id: "splitit",
      title: "SPLITIT",
      tagline: "Kira & Split Bil Makan",
      desc: "OCR scan resit pintar, sokong multiplayer live & agih tax mengikut % makan.",
      accent: "bg-[#FF6B55] text-black",
      border: isDarkMode ? "border-white" : "border-black",
      badge: "AI SCANNER",
      icon: Receipt,
    },
    {
      id: "budget",
      title: "BUDGET.AI",
      tagline: "Track Duit Poket Harian",
      desc: "Kawal had harian, auto-kategori belanja & pantau 'Safe-To-Spend' tanpa stres.",
      accent: "bg-[#FBBF24] text-black",
      border: isDarkMode ? "border-white" : "border-black",
      badge: "AUTO TRACK",
      icon: Wallet,
    },
    {
      id: "tripit",
      title: "TRIPIT",
      tagline: "Perjalanan & Percutian",
      desc: "Kongsi itinerary, catat perbelanjaan kumpulan & auto-settle hutang travel.",
      accent: "bg-[#6366F1] text-white",
      border: isDarkMode ? "border-white" : "border-black",
      badge: "GROUP SYNC",
      icon: Plane,
    },
    {
      id: "subtracker",
      title: "SUB.TRACKER",
      tagline: "Radar Langganan Tetap",
      desc: "Kawal komitmen bulanan, alert tarikh renew & semak realiti kos setahun.",
      accent: "bg-[#10B981] text-black",
      border: isDarkMode ? "border-white" : "border-black",
      badge: "RENEW RADAR",
      icon: RefreshCw,
    },
  ];

  return (
    <div className={`min-h-screen w-full flex flex-col justify-between p-5 max-w-md mx-auto relative select-none ${
      isDarkMode ? "bg-[#121214] text-white" : "bg-[#F4F5F7] text-black"
    }`}>
      {/* TOP BRAND BAR */}
      <div className="pt-[calc(env(safe-area-inset-top)+0.5rem)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-xl border-2 flex items-center justify-center font-black text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
            isDarkMode ? "bg-white text-black border-white" : "bg-black text-white border-black"
          }`}>
            K
          </div>
          <span className="font-black text-xs uppercase tracking-widest opacity-80">KMLXLY SUITE</span>
        </div>

        <div className={`px-3 py-1 rounded-full border-2 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
          isDarkMode ? "bg-[#1E1E24] border-white/40 text-white" : "bg-white border-black text-black"
        }`}>
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
          v5.2 HYBRID
        </div>
      </div>

      {/* HERO SECTION */}
      <div className="my-6 space-y-3">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border bg-amber-400/10 border-amber-500/40 text-amber-500 text-[10px] font-black uppercase tracking-wide">
          <Sparkles size={12} />
          Modern Brutalism x Clean
        </div>

        <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight leading-[0.95]">
          All Your Bills. <br />
          <span className="text-[#FF6B55]">Zero Friction.</span>
        </h1>

        <p className="text-xs font-semibold opacity-70 leading-relaxed max-w-sm">
          Aplikasi pengurusan bil restoran, belanja harian, trip percutian dan komitmen langganan berkuasa AI dalam satu ekosistem kemas.
        </p>
      </div>

      {/* STACKED CARDS DECK (INSPIRED BY DRIBBLE REFERENCE) */}
      <div className="my-2">
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-[10px] font-black uppercase tracking-widest opacity-60">PILIH & JELAJAH MODUL</span>
          <span className="text-[10px] font-bold opacity-40">Tekan tab untuk tukar</span>
        </div>

        {/* Tab Pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-none">
          {previewApps.map((app, idx) => (
            <button
              key={app.id}
              onClick={() => setActiveDeckTab(idx)}
              className={`px-3 py-1.5 rounded-full border-2 text-[10px] font-black uppercase whitespace-nowrap transition-all active:scale-95 ${
                activeDeckTab === idx
                  ? (isDarkMode ? "bg-white text-black border-white shadow-[2px_2px_0px_0px_rgba(255,255,255,0.3)]" : "bg-black text-white border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]")
                  : (isDarkMode ? "bg-[#1A1A1E] text-white/60 border-white/20" : "bg-white text-black/60 border-black/20")
              }`}
            >
              {app.title}
            </button>
          ))}
        </div>

        {/* Active Layered Card */}
        {(() => {
          const current = previewApps[activeDeckTab];
          const IconComponent = current.icon;
          return (
            <div
              className={`p-5 rounded-3xl border-2 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${current.accent} ${current.border} relative overflow-hidden`}
            >
              {/* Watermark / Background Accent Circle */}
              <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-black/10 pointer-events-none" />

              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-2xl bg-black text-white flex items-center justify-center border-2 border-black">
                  <IconComponent size={20} />
                </div>
                <span className="px-2.5 py-1 rounded-full bg-black text-white text-[9px] font-black uppercase tracking-wider">
                  {current.badge}
                </span>
              </div>

              <h3 className="text-xl font-black uppercase tracking-tight">{current.title}</h3>
              <p className="text-xs font-bold opacity-80 mb-2">{current.tagline}</p>
              <p className="text-[11px] font-medium opacity-90 leading-snug">{current.desc}</p>
            </div>
          );
        })()}
      </div>

      {/* ACTION CTAs CONTAINER */}
      <div className="pt-4 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] space-y-2.5">
        {/* Google 1-Tap Login Pill */}
        <button
          onClick={onLoginGoogle}
          className={`w-full py-3.5 px-4 rounded-full border-2 flex items-center justify-center gap-3 font-black text-xs uppercase tracking-wider transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none ${
            isDarkMode
              ? "bg-white text-black border-white shadow-[3px_3px_0px_0px_rgba(255,255,255,0.3)] hover:bg-neutral-100"
              : "bg-black text-white border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:bg-neutral-800"
          }`}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
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
          <span>Masuk Pantas Dengan Google</span>
        </button>

        {/* Email Login Button */}
        <button
          onClick={onOpenEmailAuth}
          className={`w-full py-3 px-4 rounded-full border-2 flex items-center justify-center gap-2 font-black text-xs uppercase tracking-wider transition-all active:scale-98 ${
            isDarkMode
              ? "bg-[#1E1E24] text-white border-white/30 hover:border-white"
              : "bg-white text-black border-black/30 hover:border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)]"
          }`}
        >
          <span>Guna Emel & Kata Laluan</span>
          <ChevronRight size={14} className="opacity-60" />
        </button>

        {/* Guest Mode Fallback */}
        <button
          onClick={onContinueGuest}
          className={`w-full py-2.5 text-center font-bold text-[11px] uppercase tracking-wider transition-all flex items-center justify-center gap-1 opacity-70 hover:opacity-100 ${
            isDarkMode ? "text-white/80" : "text-black/80"
          }`}
        >
          <span>Terus Sebagai Tetamu (Offline Mode)</span>
          <ArrowRight size={12} />
        </button>

        {/* Small Trust Microcopy */}
        <div className="flex items-center justify-center gap-1.5 pt-1 text-[9px] font-medium opacity-40">
          <Shield size={10} />
          <span>Data disimpan dengan enkripsi selamat & sokongan mod offline</span>
        </div>
      </div>
    </div>
  );
}
