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
            kicker: "Langkah pertama",
            title: "Pilih event",
            description: "Tekan kad ini untuk bertukar atau mencipta ruang bil yang berasingan.",
            bullets: ["Satu event untuk satu makan, rumah atau trip.", "Mata wang boleh ditukar melalui butang di header."],
        },
        {
            target: "splitit-people",
            kicker: "Bina kumpulan",
            title: "Tambah peserta",
            description: "Masukkan semua nama yang terlibat sebelum anda mula membahagikan bil.",
            bullets: ["Taip nama pada kotak Tambah dan tekan +.", "Tekan nama untuk edit peserta."],
        },
        {
            target: "splitit-bills",
            kicker: "Kira & agih",
            title: "Tambah bil",
            description: "Buka borang bil, masukkan item secara manual atau gunakan Scan Resit.",
            bullets: ["Pilih siapa berkongsi setiap item.", "Simpan untuk melihat jumlah dan settlement."],
        },
    ],
    budget: [
        {
            target: "budget-month",
            kicker: "Pilih tempoh",
            title: "Tukar bulan",
            description: "Leret senarai bulan untuk melihat rekod dan baki bagi tempoh berlainan.",
            bullets: ["Bulan yang aktif ditandakan dengan jelas."],
        },
        {
            target: "budget-limit",
            kicker: "Tetapkan sasaran",
            title: "Set monthly limit",
            description: "Tekan kad ini untuk menetapkan had perbelanjaan bulanan anda.",
            bullets: ["Bar akan berubah warna apabila belanja menghampiri had."],
        },
        {
            target: "budget-manual",
            kicker: "Rekod duit",
            title: "Tambah transaksi",
            description: "Gunakan Manual Input untuk merekod income atau expense dengan tepat.",
            bullets: ["Isi jumlah, kategori dan tarikh transaksi."],
        },
        {
            target: "budget-scan",
            kicker: "Jimat masa",
            title: "Scan resit",
            description: "AI Scan boleh membaca gambar resit atau transaksi daripada PDF.",
            bullets: ["Semak hasil scan sebelum menyimpannya."],
        },
        {
            target: "budget-analytics",
            kicker: "Baca corak",
            title: "Buka analitik",
            description: "Lihat pecahan kategori, kalendar harian dan penggunaan bajet anda.",
            bullets: ["Tekan sekali lagi untuk kembali ke transaksi terkini."],
        },
    ],
    subTracker: [
        {
            target: "sub-yearly",
            kicker: "Realiti sebenar",
            title: "Semak kos setahun",
            description: "Kad ini menukar semua komitmen kepada jumlah tahunan supaya impaknya mudah difahami.",
            bullets: ["Bandingkan angka tahunan dengan jumlah bulanan."],
        },
        {
            target: "sub-add-commitment",
            kicker: "Kos wajib",
            title: "Tambah komitmen",
            description: "Gunakan butang ini untuk loan, bil, insurans, simpanan dan utiliti.",
            bullets: ["Isi harga, kitaran dan tarikh bayaran seterusnya."],
        },
        {
            target: "sub-add-lifestyle",
            kicker: "Kos pilihan",
            title: "Tambah subscription",
            description: "Rekod hiburan, servis digital, gym dan komitmen gaya hidup di sini.",
            bullets: ["Tambah pautan pembatalan sebagai Kill Switch jika ada."],
        },
        {
            target: "sub-sync",
            kicker: "Pautan pintar",
            title: "Auto-sync Budget",
            description: "Apabila aktif, butang Bayar turut menghantar rekod belanja ke Budget.AI.",
            bullets: ["Tekan ikon ini untuk hidup atau matikan sync."],
        },
    ],
    tripit: [
        {
            target: "tripit-create",
            kicker: "Mulakan perjalanan",
            title: "Cipta trip",
            description: "Tekan di sini untuk menetapkan nama, tarikh, mata wang, bajet dan gambar cover.",
            bullets: ["Login diperlukan untuk menyimpan trip."],
        },
        {
            target: "tripit-list",
            kicker: "Masuk workspace",
            title: "Buka kad trip",
            description: "Kad trip membawa anda ke itinerary, budget, expense dan fungsi split bill.",
            bullets: ["Tekan kad untuk buka; gunakan ikon pensel untuk edit."],
        },
    ],
} satisfies Record<string, readonly OnboardingStep[]>;

type AppOnboardingProps = {
    appName: string;
    storageKey: string;
    steps: readonly OnboardingStep[];
    darkMode: boolean;
    accentClassName: string;
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
}: AppOnboardingProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [activeStep, setActiveStep] = useState(0);
    const [geometry, setGeometry] = useState<CoachmarkGeometry | null>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const closeButtonRef = useRef<HTMLButtonElement>(null);
    const popoverRef = useRef<HTMLDivElement>(null);
    const titleId = useId();
    const descriptionId = useId();
    const seenKey = `kmlxly:onboarding:${storageKey}:v4`;
    const currentStep = steps[activeStep];
    const isLastStep = activeStep === steps.length - 1;

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

    return (
        <>
            <button
                ref={triggerRef}
                type="button"
                onClick={openTour}
                aria-label={`Buka cara guna ${appName}`}
                title={`Cara guna ${appName}`}
                className={`fixed bottom-[calc(env(safe-area-inset-bottom)+1rem)] right-4 z-30 flex min-h-11 items-center gap-2 rounded-xl border-2 px-3 text-[10px] font-black uppercase tracking-wider transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none ${darkMode
                    ? "border-white bg-white text-black shadow-none hover:bg-zinc-200"
                    : "border-black bg-white text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5"
                    }`}
            >
                <CircleHelp size={16} aria-hidden="true" /> Cara guna
            </button>

            {isOpen && (
                <>
                    {geometry && (
                        <div
                            aria-hidden="true"
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
                                aria-label="Tutup panduan"
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
                            <button type="button" onClick={closeTour} className="min-h-10 px-1 text-[9px] font-black uppercase opacity-50 hover:opacity-100">Langkau</button>
                            <button
                                type="button"
                                onClick={() => {
                                    setGeometry(null);
                                    setActiveStep((step) => Math.max(0, step - 1));
                                }}
                                disabled={activeStep === 0}
                                aria-label="Langkah sebelumnya"
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
                                {isLastStep ? <>Faham <Check size={13} aria-hidden="true" /></> : <>Next <ArrowRight size={13} aria-hidden="true" /></>}
                            </button>
                        </div>
                    </div>
                </>
            )}
        </>
    );
}
