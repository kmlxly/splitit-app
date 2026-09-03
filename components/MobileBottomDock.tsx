"use client";

import React from "react";
import Link from "next/link";
import { Grid, Receipt, Wallet, Plane, RefreshCw } from "lucide-react";

export type ActiveDockTab = "home" | "splitit" | "budget" | "tripit" | "subtracker";

interface MobileBottomDockProps {
  activeTab: ActiveDockTab;
  darkMode: boolean;
  hidden?: boolean;
}

export default function MobileBottomDock({ activeTab, darkMode, hidden = false }: MobileBottomDockProps) {
  const [hasActiveModal, setHasActiveModal] = React.useState(false);

  React.useEffect(() => {
    const checkModals = () => {
      // Auto-detect open modals, dialogs, bottom sheets, or onboarding tours
      const modalElements = document.querySelectorAll(
        '.fixed.inset-0:not([aria-hidden="true"]), [role="dialog"], [data-coachmark="true"]'
      );
      let found = false;
      modalElements.forEach((el) => {
        if (
          el instanceof HTMLElement &&
          el.offsetParent !== null &&
          !el.closest('nav[aria-label="Mobile Bottom Navigation"]')
        ) {
          found = true;
        }
      });
      setHasActiveModal(found);
    };

    checkModals();
    const observer = new MutationObserver(checkModals);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "style"],
    });

    return () => observer.disconnect();
  }, []);

  const isHidden = hidden || hasActiveModal;

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
      aria-label="Mobile Bottom Navigation"
      aria-hidden={isHidden}
      className={`fixed bottom-[calc(env(safe-area-inset-bottom)+0.6rem)] left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm py-1.5 px-2.5 rounded-full border-2 backdrop-blur-xl flex items-center justify-between z-40 transition-all duration-300 ease-in-out shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${
        isHidden
          ? "translate-y-28 opacity-0 pointer-events-none scale-95"
          : "translate-y-0 opacity-100 pointer-events-auto scale-100"
      } ${
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
