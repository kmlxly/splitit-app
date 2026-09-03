"use client";

import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, CircleHelp, X } from "lucide-react";

export type OnboardingStep = {
    target: string;
    kicker: string;
    title: string;
    description: string;
    bullets: readonly string[];
};

export const APP_ONBOARDING_STEPS = {
    splitit: [
        {
            target: "splitit-event",
            kicker: "Step 1",
            title: "Select Event",
            description: "Tap this card to switch between or create isolated bill sessions.",
            bullets: ["One session per meal, house, or group trip.", "Change currency via the top header button."],
        },
        {
            target: "splitit-people",
            kicker: "Build Crew",
            title: "Add Members",
            description: "Add everyone who is participating before splitting the bill.",
            bullets: ["Type a name in the Add box and tap +.", "Tap any member name to edit."],
        },
        {
            target: "splitit-bills",
            kicker: "Calculate & Split",
            title: "Add Bills",
            description: "Open the bill form to add items manually or use AI Scan.",
            bullets: ["Select who is sharing each item.", "Save to calculate balances and settlements."],
        },
    ],
    budget: [
        {
            target: "budget-month",
            kicker: "Time Period",
            title: "Switch Month",
            description: "Swipe across the month picker to view records from different months.",
            bullets: ["Active month is clearly highlighted."],
        },
        {
            target: "budget-limit",
            kicker: "Set Goals",
            title: "Set Monthly Limit",
            description: "Tap this card to establish your monthly spending boundary.",
            bullets: ["The progress bar changes color as you approach your limit."],
        },
        {
            target: "budget-manual",
            kicker: "Record Money",
            title: "Add Transaction",
            description: "Use Manual Input to log income or expenses accurately.",
            bullets: ["Enter amount, category, and transaction date."],
        },
        {
            target: "budget-scan",
            kicker: "Save Time",
            title: "Scan Receipt",
            description: "AI Scan extracts transactions from receipt photos or bank statement PDFs.",
            bullets: ["Review scanned line items before saving."],
        },
        {
            target: "budget-analytics",
            kicker: "Read Patterns",
            title: "Open Analytics",
            description: "View category breakdowns, daily calendar heatmaps, and budget usage.",
            bullets: ["Tap again to return to recent transactions."],
        },
    ],
    subTracker: [
        {
            target: "sub-yearly",
            kicker: "True Reality",
            title: "Check Yearly Cost",
            description: "This card converts all monthly commitments into annual totals.",
            bullets: ["Compare your yearly cost against monthly payments."],
        },
        {
            target: "sub-add-commitment",
            kicker: "Fixed Costs",
            title: "Add Commitment",
            description: "Use this for loans, bills, insurance, savings, and utilities.",
            bullets: ["Set amount, billing cycle, and next due date."],
        },
        {
            target: "sub-add-lifestyle",
            kicker: "Lifestyle Costs",
            title: "Add Subscription",
            description: "Track entertainment, digital services, gyms, and memberships.",
            bullets: ["Add cancellation URLs as quick Kill Switches."],
        },
        {
            target: "sub-sync",
            kicker: "Smart Link",
            title: "Auto-sync Budget",
            description: "When enabled, tapping Pay also logs an expense in Budget.AI.",
            bullets: ["Tap this icon to toggle synchronization."],
        },
    ],
    tripit: [
        {
            target: "tripit-create",
            kicker: "Start Adventure",
            title: "Create Trip",
            description: "Tap here to set trip name, dates, currency, budget, and cover photo.",
            bullets: ["Sign in required to persist trips."],
        },
        {
            target: "tripit-list",
            kicker: "Open Workspace",
            title: "Open Trip Card",
            description: "Trip cards give access to itinerary, budget, expenses, and split bill.",
            bullets: ["Tap to open; use pencil icon to edit."],
        },
    ],
} satisfies Record<string, readonly OnboardingStep[]>;

type AppOnboardingProps = {
    appName: string;
    storageKey: string;
    steps: readonly OnboardingStep[];
    darkMode: boolean;
    accentClassName: string;
    hidden?: boolean;
    hideFloatingTrigger?: boolean;
};

type CoachmarkGeometry = {
    target: { top: number; left: number; width: number; height: number };
    popover: { top: number; left: number; width: number };
    placement: "above" | "below";
    arrowLeft: number;
};

export default function AppOnboarding({
    appName,
    storageKey,
    steps,
    darkMode,
    accentClassName,
    hidden = false,
    hideFloatingTrigger = false,
}: AppOnboardingProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [activeStep, setActiveStep] = useState(0);
    const [geometry, setGeometry] = useState<CoachmarkGeometry | null>(null);
    const [hasActiveModal, setHasActiveModal] = useState(false);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const closeButtonRef = useRef<HTMLButtonElement>(null);
    const popoverRef = useRef<HTMLDivElement>(null);
    const titleId = useId();
    const descriptionId = useId();
    const seenKey = `kmlxly:onboarding:${storageKey}:v4`;
    const currentStep = steps[activeStep];
    const isLastStep = activeStep === steps.length - 1;

    useEffect(() => {
        const checkModals = () => {
            const modalElements = document.querySelectorAll(
                '.fixed.inset-0:not([aria-hidden="true"]), [role="dialog"]:not([data-onboarding-app])'
            );
            let found = false;
            modalElements.forEach((el) => {
                if (el instanceof HTMLElement && el.offsetParent !== null && !el.closest('[data-onboarding-app]')) {
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

    useEffect(() => {
        const frame = window.requestAnimationFrame(() => {
            try {
                if (localStorage.getItem(seenKey) !== "seen") setIsOpen(true);
            } catch {
                setIsOpen(true);
            }
        });
        return () => window.cancelAnimationFrame(frame);
    }, [seenKey]);

    const markSeen = useCallback(() => {
        try {
            localStorage.setItem(seenKey, "seen");
        } catch {
            // The guide remains usable when browser storage is unavailable.
        }
    }, [seenKey]);

    const closeTour = useCallback(() => {
        markSeen();
        setIsOpen(false);
        setGeometry(null);
        window.requestAnimationFrame(() => triggerRef.current?.focus());
    }, [markSeen]);

    const openTour = () => {
        setActiveStep(0);
        setGeometry(null);
        setIsOpen(true);
    };

    useEffect(() => {
        if (!isOpen || !currentStep) return;

        const selector = `[data-guide="${currentStep.target}"]`;
        const targetElement = document.querySelector<HTMLElement>(selector);
        if (!targetElement) return;

        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        targetElement.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "center", inline: "nearest" });

        const updateGeometry = () => {
            const liveTarget = document.querySelector<HTMLElement>(selector);
            if (!liveTarget) return;

            const rect = liveTarget.getBoundingClientRect();
            const viewportPadding = 12;
            const gap = 14;
            const popoverWidth = Math.min(340, window.innerWidth - viewportPadding * 2);
            const popoverHeight = popoverRef.current?.offsetHeight || 250;
            const roomBelow = window.innerHeight - rect.bottom;
            const roomAbove = rect.top;
            const placement: "above" | "below" = roomBelow < popoverHeight + gap && roomAbove > roomBelow ? "above" : "below";
            const idealTop = placement === "above" ? rect.top - popoverHeight - gap : rect.bottom + gap;
            const top = Math.max(viewportPadding, Math.min(idealTop, window.innerHeight - popoverHeight - viewportPadding));
            const targetCenter = rect.left + rect.width / 2;
            const left = Math.max(viewportPadding, Math.min(targetCenter - popoverWidth / 2, window.innerWidth - popoverWidth - viewportPadding));

            setGeometry({
                target: { top: rect.top - 6, left: rect.left - 6, width: rect.width + 12, height: rect.height + 12 },
                popover: { top, left, width: popoverWidth },
                placement,
                arrowLeft: Math.max(24, Math.min(targetCenter - left, popoverWidth - 24)),
            });
        };

        const firstFrame = window.requestAnimationFrame(updateGeometry);
        const settleTimer = window.setTimeout(updateGeometry, reducedMotion ? 0 : 420);
        window.addEventListener("resize", updateGeometry);
        window.addEventListener("scroll", updateGeometry, true);

        return () => {
            window.cancelAnimationFrame(firstFrame);
            window.clearTimeout(settleTimer);
            window.removeEventListener("resize", updateGeometry);
            window.removeEventListener("scroll", updateGeometry, true);
        };
    }, [activeStep, currentStep, isOpen]);

    useEffect(() => {
        if (!isOpen) return;

        const focusFrame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                event.preventDefault();
                closeTour();
            }
        };
        document.addEventListener("keydown", handleKeyDown);
        return () => {
            window.cancelAnimationFrame(focusFrame);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [closeTour, isOpen]);

    if (!currentStep) return null;

    const shouldShowTrigger = !hidden && !hasActiveModal && !hideFloatingTrigger && !isOpen;

    return (
        <>
            {shouldShowTrigger && (
                <button
                    ref={triggerRef}
                    type="button"
                    onClick={openTour}
                    aria-label={`Open ${appName} guide`}
                    title={`${appName} guide`}
                    className={`fixed bottom-[calc(env(safe-area-inset-bottom)+4.8rem)] right-4 z-30 flex min-h-9 items-center gap-1.5 rounded-full border-2 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] ${darkMode
                        ? "border-white bg-[#1E1E1E] text-white hover:bg-white hover:text-black shadow-none"
                        : "border-black bg-white text-black hover:bg-black hover:text-white"
                        }`}
                >
                    <CircleHelp size={14} aria-hidden="true" /> Guide
                </button>
            )}

            {isOpen && (
                <>
                    {geometry && (
                        <div
                            aria-hidden="true"
                            data-coachmark="true"
                            className={`pointer-events-none fixed z-[80] rounded-2xl border-[3px] ${darkMode ? "border-white" : "border-black"}`}
                            style={{
                                top: geometry.target.top,
                                left: geometry.target.left,
                                width: geometry.target.width,
                                height: geometry.target.height,
                                boxShadow: "0 0 0 9999px rgba(0,0,0,0.48), 4px 4px 0 rgba(0,0,0,0.9)",
                            }}
                        />
                    )}

                    <div
                        ref={popoverRef}
                        role="dialog"
                        aria-modal="false"
                        aria-labelledby={titleId}
                        aria-describedby={descriptionId}
                        data-onboarding-app={storageKey}
                        data-coachmark="true"
                        className={`fixed z-[90] max-h-[calc(100vh-1.5rem)] overflow-y-auto rounded-2xl border-2 p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-opacity duration-150 motion-reduce:transition-none ${darkMode ? "border-white bg-[#171717] text-white" : "border-black bg-[#fffdf5] text-black"} ${geometry ? "opacity-100" : "pointer-events-none opacity-0"}`}
                        style={{
                            top: geometry?.popover.top ?? 12,
                            left: geometry?.popover.left ?? 12,
                            width: geometry?.popover.width ?? "calc(100vw - 24px)",
                            maxWidth: 340,
                        }}
                    >
                        {geometry && (
                            <span
                                aria-hidden="true"
                                className={`absolute h-3 w-3 rotate-45 border-black ${accentClassName} ${geometry.placement === "below" ? "-top-1.5 border-l-2 border-t-2" : "-bottom-1.5 border-b-2 border-r-2"}`}
                                style={{ left: geometry.arrowLeft - 6 }}
                            />
                        )}

                        <div className="mb-3 flex items-start gap-3">
                            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-black text-sm font-black text-black ${accentClassName}`} aria-hidden="true">
                                {String(activeStep + 1).padStart(2, "0")}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-[8px] font-black uppercase tracking-[0.18em] opacity-50">{currentStep.kicker}</p>
                                <p className="text-[9px] font-black uppercase opacity-65">{appName} · {activeStep + 1}/{steps.length}</p>
                            </div>
                            <button
                                ref={closeButtonRef}
                                type="button"
                                onClick={closeTour}
                                aria-label="Close guide"
                                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border-2 active:scale-95 ${darkMode ? "border-white bg-white text-black" : "border-black bg-white"}`}
                            >
                                <X size={16} aria-hidden="true" />
                            </button>
                        </div>

                        <div key={currentStep.title} className="animate-in fade-in slide-in-from-right-2 duration-200 motion-reduce:animate-none" aria-live="polite">
                            <h2 id={titleId} className="mb-1.5 text-lg font-black uppercase leading-tight tracking-tight">{currentStep.title}</h2>
                            <p id={descriptionId} className="text-xs font-bold leading-relaxed opacity-70">{currentStep.description}</p>
                            <ul className="mt-3 space-y-1.5">
                                {currentStep.bullets.map((bullet) => (
                                    <li key={bullet} className="flex items-start gap-2 text-[10px] font-bold leading-relaxed">
                                        <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full border border-black ${accentClassName}`} aria-hidden="true" />
                                        <span>{bullet}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="mt-4 flex gap-1.5" aria-hidden="true">
                            {steps.map((step, index) => (
                                <span key={step.title} className={`h-1 flex-1 rounded-full border border-current ${index <= activeStep ? accentClassName : "opacity-15"}`} />
                            ))}
                        </div>

                        <div className="mt-4 flex items-center gap-2 border-t border-dashed border-current/20 pt-3">
                            <button type="button" onClick={closeTour} className="min-h-10 px-1 text-[9px] font-black uppercase opacity-50 hover:opacity-100">Skip</button>
                            <button
                                type="button"
                                onClick={() => {
                                    setGeometry(null);
                                    setActiveStep((step) => Math.max(0, step - 1));
                                }}
                                disabled={activeStep === 0}
                                aria-label="Previous step"
                                className={`ml-auto flex min-h-10 items-center gap-1 rounded-lg border-2 px-2 text-[9px] font-black uppercase disabled:pointer-events-none disabled:opacity-25 ${darkMode ? "border-white" : "border-black bg-white"}`}
                            >
                                <ArrowLeft size={13} aria-hidden="true" /> Back
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    if (isLastStep) {
                                        closeTour();
                                    } else {
                                        setGeometry(null);
                                        setActiveStep((step) => Math.min(steps.length - 1, step + 1));
                                    }
                                }}
                                className={`flex min-h-10 items-center gap-1 rounded-lg border-2 border-black px-3 text-[9px] font-black uppercase text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none ${accentClassName}`}
                            >
                                {isLastStep ? <>Got it <Check size={13} aria-hidden="true" /></> : <>Next <ArrowRight size={13} aria-hidden="true" /></>}
                            </button>
                        </div>
                    </div>
                </>
            )}
        </>
    );
}
