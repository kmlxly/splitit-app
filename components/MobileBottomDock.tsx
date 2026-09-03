"use client";

import React from "react";
import Link from "next/link";
import { Grid, Receipt, Wallet, Plane, RefreshCw } from "lucide-react";

export type ActiveDockTab = "home" | "splitit" | "budget" | "tripit" | "subtracker";

interface MobileBottomDockProps {
  activeTab: ActiveDockTab;
  darkMode: boolean;
}

export default function MobileBottomDock({ activeTab, darkMode }: MobileBottomDockProps) {
  const tabs = [
    {
      id: "home" as const,
      label: "Home",
      href: "/",
      icon: Grid,
      activeBg: darkMode ? "bg-white text-black" : "bg-black text-white",
    },
    {
      id: "splitit" as const,
      label: "SplitIt",
      href: "/splitit",
      icon: Receipt,
      activeBg: "bg-[#FF6B55] text-black border-black",
    },
    {
      id: "budget" as const,
      label: "Budget",
      href: "/budget",
      icon: Wallet,
      activeBg: "bg-[#FBBF24] text-black border-black",
    },
    {
      id: "tripit" as const,
      label: "TripIt",
      href: "/tripit",
      icon: Plane,
      activeBg: "bg-[#6366F1] text-white border-black",
    },
    {
      id: "subtracker" as const,
      label: "Subs",
      href: "/sub-tracker",
      icon: RefreshCw,
      activeBg: "bg-[#10B981] text-black border-black",
    },
  ];

  return (
    <nav
      aria-label="Navigasi Utama Mudah Alih"
      className={`fixed bottom-[calc(env(safe-area-inset-bottom)+0.6rem)] left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm py-1.5 px-2.5 rounded-full border-2 backdrop-blur-xl flex items-center justify-between z-40 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${
        darkMode ? "bg-[#18181B]/95 border-white text-white" : "bg-white/95 border-black text-black"
      }`}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const IconComponent = tab.icon;

        if (isActive) {
          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={`px-3 py-1.5 rounded-full flex items-center gap-1.5 text-[10px] font-black uppercase transition-all shadow-sm ${tab.activeBg}`}
            >
              <IconComponent size={14} />
              <span>{tab.label}</span>
            </Link>
          );
        }

        return (
          <Link
            key={tab.id}
            href={tab.href}
            className={`p-2 rounded-full transition-all opacity-60 hover:opacity-100 hover:bg-current/10 active:scale-90`}
            title={tab.label}
          >
            <IconComponent size={17} />
          </Link>
        );
      })}
    </nav>
  );
}
