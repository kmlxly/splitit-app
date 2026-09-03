"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
    Plus, CreditCard,
    AlertTriangle, Moon, Sun, Trash2, ExternalLink,
    Tv, Wifi, Dumbbell, Zap, Shield, Sparkles, Home, Heart, FileText, X, RefreshCw,
    Cloud, BookOpen, ChevronDown, User, Eye, EyeOff, RotateCcw, Link as LinkIcon, Link2Off, Check
} from "lucide-react";
import AuthModal from "@/components/Auth";
import AppOnboarding, { APP_ONBOARDING_STEPS } from "@/components/AppOnboarding";
import MobileBottomDock from "@/components/MobileBottomDock";
import { createNumericId } from "@/lib/clientIds";
import { useUser } from "@/lib/auth/client";
import {
    getSubscriptions,
    upsertSubscriptions,
    deleteSubscription,
} from "@/app/actions/subscriptions";
import { insertBudgetTransaction } from "@/app/actions/budget";
import { getDaysUntilBilling, isOriginalBillingDatePast } from "@/lib/billing";

// --- 1. CONFIG & TYPES ---
const APP_NAME = "Sub.Tracker";
const APP_VERSION = "v1.2.0-polish";

type Subscription = {
    id: number;
    name: string;
    price: number;
    cycle: "Monthly" | "Yearly";
    nextPaymentDate: string; // Format: YYYY-MM-DD
    category: "Loan" | "Insurance" | "Savings" | "Bills" | "Entertainment" | "Utility" | "Digital Service" | "Gym/Health" | "Education";
    shareWith?: string; // Feature Family Plan
    link?: string; // Feature Kill Switch
};

export default function SubTrackerPage() {
    // --- STATE ---
    const [darkMode, setDarkMode] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);

    // Start dengan array kosong
    const [subs, setSubs] = useState<Subscription[]>([]);

    // Form State
    const [formType, setFormType] = useState<"commitment" | "lifestyle">("commitment"); // Komitmen Wajib atau Hiburan
    const [formName, setFormName] = useState("");
    const [formPrice, setFormPrice] = useState("");
    const [formCycle, setFormCycle] = useState<"Monthly" | "Yearly">("Monthly");
    const [formNextDate, setFormNextDate] = useState("");
    const [formCategory, setFormCategory] = useState<Subscription["category"]>("Loan");
    const [formShareWith, setFormShareWith] = useState("");
    const [formLink, setFormLink] = useState("");

    // Sync Status & Ghost Mode (Match Budget.AI)
    const [syncStatus, setSyncStatus] = useState<"SAVED" | "SAVING" | "ERROR" | "OFFLINE">("OFFLINE");
    const [isGhostMode, setIsGhostMode] = useState(false);
    const stackUser = useUser();
    const user = stackUser ?? null;
    const [showAuthModal, setShowAuthModal] = useState(false);

    // Sync Consent State
    const [syncWithBudget, setSyncWithBudget] = useState(true);
    const [showSyncModal, setShowSyncModal] = useState(false);

    // --- LOAD & SAVE DATA ---
    // 0. Load Cloud Data when authenticated
    useEffect(() => {
        const loadCloud = async () => {
            if (!user) return;
            try {
                const cloudSubs = await getSubscriptions();
                if (cloudSubs.length > 0) {
                    setSubs(cloudSubs as any);
                }
            } catch (e) {
                console.error("Failed to load subscriptions:", e);
            }
        };
        loadCloud();
    }, [user]);

    // 0.1 SYNC TO CLOUD (Auto-Save)
    useEffect(() => {
        const syncToCloud = async () => {
            if (!user || subs.length === 0) return;

            const payload = subs.map(s => ({
                id: s.id,
                title: s.name,
                price: s.price,
                cycle: s.cycle,
                first_bill_date: s.nextPaymentDate,
                category: s.category,
                share_with: s.shareWith ?? null,
                link: s.link ?? null,
            }));

            try {
                await upsertSubscriptions(payload);
            } catch (e) {
                console.error("Sync Subs Error:", e);
            }
        };

        const timeout = setTimeout(syncToCloud, 2000);
        return () => clearTimeout(timeout);
    }, [subs, user]);

    useEffect(() => {
        const savedData = localStorage.getItem("subtracker_data");
        const savedSyncPref = localStorage.getItem("subtracker_sync_pref");
        let nextSubs: Subscription[] | null = null;

        try {
            nextSubs = savedData ? JSON.parse(savedData) : null;
        } catch (error) {
            console.error("Failed to load data:", error);
            const errorFrame = requestAnimationFrame(() => setSyncStatus("ERROR"));
            return () => cancelAnimationFrame(errorFrame);
        }

        const frame = requestAnimationFrame(() => {
            if (nextSubs) {
                setSubs(nextSubs);
                setSyncStatus(user ? "SAVED" : "OFFLINE");
            }
            if (savedSyncPref !== null) {
                setSyncWithBudget(savedSyncPref === "true");
            }
        });

        return () => cancelAnimationFrame(frame);
    }, [user]);

    // Save Sync Preference
    useEffect(() => {
        localStorage.setItem("subtracker_sync_pref", String(syncWithBudget));
    }, [syncWithBudget]);

    useEffect(() => {
        let statusTimer: ReturnType<typeof setTimeout>;
        try {
            if (subs.length > 0) {
                localStorage.setItem("subtracker_data", JSON.stringify(subs));
            } else {
                localStorage.removeItem("subtracker_data");
            }
            statusTimer = setTimeout(() => setSyncStatus(user ? "SAVED" : "OFFLINE"), 300);
        } catch {
            statusTimer = setTimeout(() => setSyncStatus("ERROR"), 0);
        }

        return () => clearTimeout(statusTimer);
    }, [subs, user]);

    // --- CALCULATIONS ---
    const totalMonthly = useMemo(() => subs.reduce(
        (sum, subscription) => sum + (subscription.cycle === "Monthly" ? subscription.price : subscription.price / 12),
        0,
    ), [subs]);
    const totalYearly = totalMonthly * 12;

    // Helper: Kira berapa hari lagi (Countdown) - Smart Monthly Renewal
    const getDaysLeft = (dateStr: string, cycle: "Monthly" | "Yearly") => {
        return getDaysUntilBilling(dateStr, cycle) ?? 0;
    };

    // Helper: Check jika tarikh asal dah lepas (untuk visual indicator)
    const isOriginalDatePassed = (dateStr: string, cycle: "Monthly" | "Yearly") => {
        return isOriginalBillingDatePast(dateStr) && cycle === "Monthly";
    };

    // Helper: Group subscriptions (Updated dengan cycle parameter)
    const fixedCommitments = subs.filter(s =>
        ["Loan", "Insurance", "Savings", "Bills", "Utility"].includes(s.category)
    ).sort((a, b) => getDaysLeft(a.nextPaymentDate, a.cycle) - getDaysLeft(b.nextPaymentDate, b.cycle));

    const subscriptionList = subs.filter(s =>
        ["Entertainment", "Digital Service", "Gym/Health", "Education"].includes(s.category)
    ).sort((a, b) => getDaysLeft(a.nextPaymentDate, a.cycle) - getDaysLeft(b.nextPaymentDate, b.cycle));

    // Helper: Icon & Color Category
    const getCategoryTheme = (cat: string) => {
        switch (cat) {
            case "Loan": return { icon: <Home size={16} />, color: "bg-red-500" };
            case "Insurance": return { icon: <Shield size={16} />, color: "bg-blue-500" };
            case "Savings": return { icon: <Heart size={16} />, color: "bg-green-500" };
            case "Bills": return { icon: <FileText size={16} />, color: "bg-orange-500" };
            case "Entertainment": return { icon: <Tv size={16} />, color: "bg-pink-400" };
            case "Utility": return { icon: <Wifi size={16} />, color: "bg-yellow-400" };
            case "Digital Service": return { icon: <Cloud size={16} />, color: "bg-indigo-400" };
            case "Gym/Health": return { icon: <Dumbbell size={16} />, color: "bg-emerald-400" };
            case "Education": return { icon: <BookOpen size={16} />, color: "bg-yellow-500" };
            default: return { icon: <Zap size={16} />, color: "bg-gray-400" };
        }
    };

    // Handler: Open Add Modal
    const openAddModal = (type: "commitment" | "lifestyle") => {
        setFormType(type);
        setFormName("");
        setFormPrice("");
        setFormCycle("Monthly");
        setFormNextDate("");
        setFormCategory(type === "commitment" ? "Loan" : "Entertainment");
        setFormShareWith("");
        setFormLink("");
        setEditingId(null);
        setShowAddModal(true);
    };

    // Handler: Open Edit Modal
    const openEditModal = (sub: Subscription) => {
        setFormType(["Loan", "Insurance", "Savings", "Bills", "Utility"].includes(sub.category) ? "commitment" : "lifestyle");
        setFormName(sub.name);
        setFormPrice(String(sub.price));
        setFormCycle(sub.cycle);
        setFormNextDate(sub.nextPaymentDate);
        setFormCategory(sub.category);
        setFormShareWith(sub.shareWith || "");
        setFormLink(sub.link || "");
        setEditingId(sub.id);
        setShowAddModal(true);
    };

    // Handler: Save Subscription
    const handleSaveSubscription = () => {
        if (!formName.trim() || !formPrice || !formNextDate) {
            alert("Please fill in all required fields!");
            return;
        }

        const price = parseFloat(formPrice);
        if (isNaN(price) || price <= 0) {
            alert("Please enter a valid price!");
            return;
        }

        const newSub: Subscription = {
            id: editingId || createNumericId(),
            name: formName.trim(),
            price: price,
            cycle: formCycle,
            nextPaymentDate: formNextDate,
            category: formCategory,
            shareWith: formShareWith.trim() || undefined,
            link: formLink.trim() || undefined,
        };

        if (editingId) {
            setSubs(subs.map(s => s.id === editingId ? newSub : s));
            alert("Commitment updated successfully!");
        } else {
            setSubs([...subs, newSub]);
            alert("Commitment added successfully!");
        }

        setShowAddModal(false);
        resetForm();
    };

    // Handler: Delete Subscription
    const handleDelete = async (id: number) => {
        if (confirm("Are you sure you want to delete this commitment?")) {
            setSubs(subs.filter(s => s.id !== id));
            if (user) {
                try {
                    await deleteSubscription(id);
                } catch (e) {
                    console.error("Failed to delete from cloud:", e);
                }
            }
        }
    };

    // Reset Form
    const resetForm = () => {
        setFormName("");
        setFormPrice("");
        setFormCycle("Monthly");
        setFormNextDate("");
        setFormCategory("Loan");
        setFormShareWith("");
        setFormLink("");
        setEditingId(null);
    };

    // Handler: Bayar (Update Date & Sync to Budget.AI)
    const handlePay = async (sub: Subscription) => {
        // 1. Kira tarikh baru
        const currentDue = new Date(sub.nextPaymentDate);
        const nextDue = new Date(currentDue);

        if (sub.cycle === "Monthly") {
            nextDue.setMonth(nextDue.getMonth() + 1);
        } else {
            nextDue.setFullYear(nextDue.getFullYear() + 1);
        }

        const nextDateStr = nextDue.toISOString().split('T')[0];

        // 2. Update Subscription List
        const updatedSubs = subs.map(s =>
            s.id === sub.id ? { ...s, nextPaymentDate: nextDateStr } : s
        );
        setSubs(updatedSubs);

        // 3. Sync to Budget.AI (If Enabled)
        if (syncWithBudget) {
            try {
                const savedBudgetData = localStorage.getItem("budget_data");
                const budgetTransactions = savedBudgetData ? JSON.parse(savedBudgetData) : [];

                const today = new Date();
                const displayDate = today.toLocaleDateString('en-MY', { day: 'numeric', month: 'short' });
                const isoDate = today.toISOString().split('T')[0];

                const newTx = {
                    id: createNumericId(),
                    user_id: user?.id, // Link to user if logged in
                    title: `Paid: ${sub.name}`,
                    amount: -Math.abs(sub.price),
                    category: sub.category === "Gym/Health" ? "Lifestyle" : sub.category,
                    date: displayDate,
                    isoDate: isoDate,
                    items: [{ id: createNumericId(), title: sub.name, amount: -Math.abs(sub.price) }]
                };

                // Save to localStorage
                const updatedBudget = [newTx, ...budgetTransactions];
                localStorage.setItem("budget_data", JSON.stringify(updatedBudget));

                // SYNC TO CLOUD IMMEDIATELY (If logged in)
                if (user) {
                    try {
                        await insertBudgetTransaction({
                            id: newTx.id,
                            title: newTx.title,
                            amount: newTx.amount,
                            category: newTx.category,
                            date: newTx.date,
                            iso_date: newTx.isoDate,
                            items: newTx.items,
                        });
                    } catch (e) {
                        console.error("Failed to sync transaction to cloud:", e);
                    }
                }

                alert(`Success! Next payment date updated to ${nextDateStr} & recorded in Budget.AI (${newTx.category})`);
            } catch (e) {
                console.error("Failed to sync with budget:", e);
                alert("Date updated, but failed to sync to Budget.AI");
            }
        } else {
            alert(`Date updated to ${nextDateStr} (Without Sync)`);
        }
    };

    // Helper: Reset Data
    const handleResetData = () => {
        if (confirm("⚠️ CRITICAL WARNING:\n\nAre you sure you want to RESET all data?")) {
            localStorage.removeItem("subtracker_data");
            window.location.reload();
        }
    };

    // Helper: Format Price (Ghost Mode)
    const formatPrice = (price: number) => {
        if (isGhostMode) return "RM ****";
        return `RM${price.toFixed(2)}`;
    };

    const handleLoginClick = () => {
        setShowAuthModal(true);
    };

    // --- STYLES (NEO-BRUTALISM SHARED) ---
    const bgStyle = darkMode ? "bg-[#121214] text-white" : "bg-[#F4F5F7] text-black";
    const cardStyle = `${darkMode ? "bg-[#18181B] border-white/20" : "bg-white border-black"} border-2 rounded-3xl`;
    const shadowStyle = darkMode ? "shadow-[3px_3px_0px_0px_rgba(255,255,255,0.15)]" : "shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]";
    const buttonBase = `border-2 font-black uppercase tracking-wider rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2 ${darkMode ? "border-white hover:bg-white hover:text-black" : "border-black hover:bg-black hover:text-white"} ${shadowStyle} hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]`;
    const inputStyle = `w-full p-2.5 rounded-2xl border-2 outline-none font-bold text-sm ${darkMode ? "bg-[#121214] border-white/30 text-white focus:border-white" : "bg-white border-black/30 text-black focus:border-black"}`;

    // Category options based on type
    const commitmentCategories: Subscription["category"][] = ["Loan", "Insurance", "Savings", "Bills", "Utility"];
    const lifestyleCategories: Subscription["category"][] = ["Entertainment", "Digital Service", "Gym/Health", "Education"];

    const isModalOpen = showAddModal || showAuthModal || showSyncModal;

    return (
        <div className={`min-h-screen font-sans transition-colors duration-300 ${bgStyle}`}>
            <AppOnboarding
                appName="Sub.Tracker"
                storageKey="sub-tracker"
                steps={APP_ONBOARDING_STEPS.subTracker}
                darkMode={darkMode}
                accentClassName="bg-pink-400"
                hidden={isModalOpen}
            />
            <div className="max-w-md mx-auto min-h-screen flex flex-col relative pb-32">

                {/* --- HEADER (Matched with Budget.AI) --- */}
                <header className={`px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-3 border-b-2 sticky top-0 z-40 transition-colors duration-300 ${darkMode ? "border-white/20 bg-[#121214]" : "border-black bg-[#F4F5F7]"}`}>
                    <div className="flex justify-between items-center">

                        {/* 1. KIRI: Logo & Info (Vertical Stack) */}
                        <Link href="/" className="flex flex-col items-start justify-center gap-0.5 cursor-pointer group min-w-0 mr-2">
                            <div className="flex items-center gap-2">
                                <div className={`w-7 h-7 flex-shrink-0 border-2 rounded-lg flex items-center justify-center overflow-hidden transition-transform group-hover:scale-105 ${darkMode ? "bg-pink-500 border-white text-white shadow-none" : "bg-pink-100 border-black text-pink-900 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"}`}>
                                    <Sparkles size={16} />
                                </div>
                                <h1 className="text-lg font-black tracking-tight leading-none uppercase group-hover:underline decoration-2 underline-offset-2">{APP_NAME}</h1>
                            </div>
                            <div className="flex items-center gap-2 pl-0.5">
                                <p className="text-[10px] uppercase tracking-widest font-bold opacity-70 text-nowrap">
                                    Cost Manager
                                </p>
                                <div className="text-[8px] font-bold flex items-center gap-1 opacity-50 scale-90 origin-left">
                                    <span>|</span>
                                    {syncStatus === "SAVING" && <span className="text-yellow-500 animate-pulse">SAVING</span>}
                                    {syncStatus === "SAVED" && <span className="text-green-500">SAVED</span>}
                                    {syncStatus === "ERROR" && <span className="text-red-500">ERROR</span>}
                                    {syncStatus === "OFFLINE" && <span>OFFLINE</span>}
                                </div>
                            </div>
                        </Link>

                        {/* 2. KANAN: Butang Compact */}
                        <div className="flex gap-1.5 items-center flex-shrink-0">
                            {/* SYNC TOGGLE */}
                            <button
                                data-guide="sub-sync"
                                onClick={() => setShowSyncModal(true)}
                                className={`w-9 h-9 rounded-lg border-2 flex items-center justify-center transition-all active:scale-95 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] ${syncWithBudget ? (darkMode ? "bg-green-600 border-white text-white shadow-none" : "bg-green-500 border-black text-white") : (darkMode ? "border-white/20 bg-transparent text-white/20 shadow-none" : "border-black/20 bg-white text-black/20")}`}
                                title="Auto-Sync Settings"
                            >
                                {syncWithBudget ? <LinkIcon size={16} /> : <Link2Off size={16} />}
                            </button>

                            {/* LOGIN BUTTON */}
                            {user ? (
                                <button
                                    onClick={async () => {
                                        if (confirm("Do you want to sign out?") && stackUser) {
                                            await stackUser.signOut();
                                        }
                                    }}
                                    className={`w-9 h-9 rounded-lg border-2 flex items-center justify-center transition-all active:scale-95 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] ${darkMode ? "bg-green-600 border-white text-white shadow-none" : "bg-green-500 border-black text-white"}`}
                                    title={user.email || "User"}
                                >
                                    <User size={16} />
                                </button>
                            ) : (
                                <button onClick={handleLoginClick} className={`w-auto px-3 h-9 rounded-lg border-2 flex items-center justify-center gap-1 transition-all active:scale-95 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] ${darkMode ? "bg-green-600 border-white text-white shadow-none" : "bg-green-500 border-black text-white"}`}>
                                    <span className="text-[10px] font-black uppercase">LOGIN</span>
                                </button>
                            )}

                            <button
                                onClick={() => setIsGhostMode(!isGhostMode)}
                                className={`w-9 h-9 rounded-lg border-2 flex items-center justify-center transition-all active:scale-95 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] ${isGhostMode ? (darkMode ? "border-purple-400 bg-purple-500 text-white shadow-none" : "border-purple-600 bg-purple-500 text-white") : (darkMode ? "border-white bg-transparent text-white shadow-none hover:bg-white hover:text-black" : "border-black bg-white text-black")}`}
                            >
                                {isGhostMode ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                            <button onClick={() => setDarkMode(!darkMode)} className={`w-9 h-9 rounded-lg border-2 flex items-center justify-center transition-all active:scale-95 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] ${darkMode ? "border-white bg-white text-black shadow-none" : "border-black bg-black text-white"}`}>
                                {darkMode ? <Sun size={16} /> : <Moon size={16} />}
                            </button>
                        </div>
                    </div>
                </header>

                {/* --- MAIN CONTENT --- */}
                <main className="flex-1 p-4 flex flex-col gap-4">

                    {/* 1. THE YEARLY SHOCK (Hero Card - Compact) */}
                    <section data-guide="sub-yearly" className={`p-4 border-2 rounded-2xl ${shadowStyle} relative overflow-hidden ${darkMode ? "bg-[#222] border-white text-white" : "bg-red-500 border-black text-white"}`}>
                        <div className="relative z-10 text-center">
                            <p className={`text-[9px] font-black uppercase tracking-widest border-2 inline-block px-2 py-0.5 rounded mb-1.5 ${darkMode ? "bg-white text-black border-white" : "bg-black text-white border-white"}`}>
                                REALITY CHECK
                            </p>
                            <h2 className="text-xs font-bold uppercase mb-0.5 text-white">Total Annual Commitments</h2>
                            {/* The Shocking Number */}
                            <h1 className="text-3xl font-mono font-black tracking-tighter leading-none mb-1 text-white">
                                {isGhostMode ? "RM ****" : `RM${totalYearly.toLocaleString("en-MY", { minimumFractionDigits: 0 })}`}
                            </h1>
                            <p className="text-[9px] font-bold uppercase inline-block px-2 py-0.5 rounded-sm bg-white text-black">
                                {isGhostMode ? "RM ****" : `RM${totalMonthly.toFixed(0)}`} / Month
                            </p>
                        </div>
                        {/* Background Deco */}
                        <div className="absolute -right-2 -top-2 opacity-10 rotate-12 text-white">
                            <AlertTriangle size={80} />
                        </div>
                    </section>

                    {/* SECTION 1: KOMITMEN WAJIB (Fixed Commitments) */}
                    <section>
                        <div className="flex items-center justify-between mb-3">
                            <h2 className={`text-xs font-black uppercase tracking-widest flex items-center gap-1.5 ${darkMode ? "text-white" : "text-black"}`}>
                                <Shield size={14} className={darkMode ? "text-gray-400" : "text-gray-700"} /> Fixed Commitments
                            </h2>
                            <button
                                data-guide="sub-add-commitment"
                                onClick={() => openAddModal("commitment")}
                                className={`text-[9px] font-bold px-2 py-1 border-2 rounded transition-all active:scale-95 ${darkMode ? "border-white bg-white text-black hover:bg-white/80" : "border-black bg-black text-white hover:bg-black/80"}`}
                            >
                                + ADD
                            </button>
                        </div>

                        <div className="space-y-2">
                            {fixedCommitments.length === 0 ? (
                                <button
                                    onClick={() => openAddModal("commitment")}
                                    className={`w-full p-6 border-2 border-dashed rounded-2xl text-center opacity-60 hover:opacity-100 hover:border-solid transition flex flex-col items-center gap-2 ${darkMode ? "border-white" : "border-black"}`}
                                >
                                    <Plus size={24} className="mb-1" />
                                    <p className="text-sm font-bold">No fixed commitments yet. Add your first commitment!</p>
                                </button>
                            ) : (
                                fixedCommitments.map((sub) => {
                                    const daysLeft = getDaysLeft(sub.nextPaymentDate, sub.cycle);
                                    const theme = getCategoryTheme(sub.category);
                                    const isUrgent = daysLeft <= 3 && daysLeft >= 0;
                                    const isAutoRenew = isOriginalDatePassed(sub.nextPaymentDate, sub.cycle);

                                    return (
                                        // PROFESSIONAL CARD STYLE (Compact)
                                        <div
                                            key={sub.id}
                                            onClick={() => openEditModal(sub)}
                                            className={`${cardStyle} ${shadowStyle} cursor-pointer transition-transform active:scale-95 ${isUrgent ? (darkMode ? "border-red-500 bg-red-900/20" : "border-red-600 bg-red-50") : ""}`}
                                        >
                                            <div className="p-3 flex justify-between items-center">
                                                <div className="flex gap-2.5 flex-1">
                                                    {/* Icon Box - Compact */}
                                                    <div className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center flex-shrink-0 ${theme.color} text-white ${darkMode ? "border-white" : "border-black"} ${shadowStyle}`}>
                                                        {theme.icon}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-1">
                                                            <h3 className={`text-xs font-black uppercase leading-tight truncate ${isUrgent && !darkMode ? "text-black" : darkMode ? "text-white" : "text-black"}`}>
                                                                {sub.name}
                                                            </h3>
                                                            {isAutoRenew && (
                                                                <span title="Auto-renews next month" className="flex-shrink-0">
                                                                    <RefreshCw size={10} className={darkMode ? "text-blue-400" : "text-blue-600"} />
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className={`text-[9px] font-bold mt-0.5 ${isUrgent && !darkMode ? "text-black/70" : darkMode ? "text-white/70" : "text-black/70"}`}>
                                                            {sub.cycle} • {sub.category}
                                                        </p>

                                                        {/* Family Tag */}
                                                        {sub.shareWith && (
                                                            <div className={`mt-0.5 inline-flex items-center gap-1 px-1 py-0.5 rounded border text-[7px] font-bold uppercase ${darkMode ? "border-white/50 text-white/80 bg-white/20" : "border-black/50 text-black/80 bg-black/10"}`}>
                                                                <CreditCard size={7} /> Share: {sub.shareWith}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="text-right ml-2">
                                                    {/* Pay Button */}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handlePay(sub);
                                                        }}
                                                        className={`mb-1 px-2 py-0.5 rounded border text-[8px] font-black uppercase transition-all active:scale-90 ${darkMode ? "bg-white text-black border-white" : "bg-black text-white border-black"}`}
                                                    >
                                                        PAY
                                                    </button>
                                                    <h3 className={`text-base font-mono font-black ${isUrgent && !darkMode ? "text-black" : darkMode ? "text-white" : "text-black"}`}>
                                                        {formatPrice(sub.price)}
                                                    </h3>
                                                    {/* Countdown Badge - Compact with Auto-renew indicator */}
                                                    <div className="flex items-center justify-end gap-1 mt-0.5">
                                                        {isAutoRenew && (
                                                            <span title="Auto-renews next month" className="flex-shrink-0">
                                                                <RefreshCw size={8} className={darkMode ? "text-blue-400" : "text-blue-600"} />
                                                            </span>
                                                        )}
                                                        <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded border inline-block ${isUrgent ? "bg-red-600 text-white border-red-600 animate-pulse" : (darkMode ? "bg-white text-black border-white" : "bg-black text-white border-black")}`}>
                                                            {daysLeft < 0 ? "OVERDUE" : daysLeft === 0 ? "TODAY!" : `${daysLeft} Days`}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </section>

                    {/* SECTION 2: SUBSCRIPTIONS & LIFESTYLE (Entertainment Subscriptions) */}
                    <section>
                        <div className="flex items-center justify-between mb-3">
                            <h2 className={`text-xs font-black uppercase tracking-widest flex items-center gap-1.5 ${darkMode ? "text-white" : "text-black"}`}>
                                <Sparkles size={14} className={darkMode ? "text-pink-400" : "text-pink-600"} /> SUBSCRIPTIONS & LIFESTYLE
                            </h2>
                            <button
                                data-guide="sub-add-lifestyle"
                                onClick={() => openAddModal("lifestyle")}
                                className={`text-[9px] font-bold px-2 py-1 border-2 rounded transition-all active:scale-95 ${darkMode ? "border-white bg-white text-black hover:bg-white/80" : "border-black bg-black text-white hover:bg-black/80"}`}
                            >
                                + NEW SUB
                            </button>
                        </div>

                        <div className="space-y-3">
                            {subscriptionList.length === 0 ? (
                                <button
                                    onClick={() => openAddModal("lifestyle")}
                                    className={`w-full p-6 border-2 border-dashed rounded-2xl text-center opacity-60 hover:opacity-100 hover:border-solid transition flex flex-col items-center gap-2 ${darkMode ? "border-white" : "border-black"}`}
                                >
                                    <Plus size={24} className="mb-1" />
                                    <p className="text-sm font-bold">No subscriptions yet. Add your first subscription!</p>
                                </button>
                            ) : (
                                subscriptionList.map((sub) => {
                                    const daysLeft = getDaysLeft(sub.nextPaymentDate, sub.cycle);
                                    const theme = getCategoryTheme(sub.category);
                                    const isUrgent = daysLeft <= 3 && daysLeft >= 0;
                                    const isAutoRenew = isOriginalDatePassed(sub.nextPaymentDate, sub.cycle);

                                    return (
                                        // TICKET CARD STYLE
                                        <div key={sub.id} className={`relative group transition-transform active:scale-95 ${cardStyle} ${isUrgent ? (darkMode ? "border-red-500 bg-red-900/20" : "border-red-600 bg-red-50") : ""}`}>

                                            {/* Top info */}
                                            <div className="p-3 flex justify-between items-start">
                                                <div className="flex gap-2.5">
                                                    {/* Logo Box - Compact */}
                                                    <div className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center flex-shrink-0 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${theme.color} text-black ${darkMode ? "border-white" : "border-black"}`}>
                                                        {theme.icon}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-1">
                                                            <h3 className={`text-xs font-black uppercase leading-tight ${isUrgent && !darkMode ? "text-black" : darkMode ? "text-white" : "text-black"}`}>{sub.name}</h3>
                                                            {isAutoRenew && (
                                                                <span title="Auto-renews next month" className="flex-shrink-0">
                                                                    <RefreshCw size={10} className={darkMode ? "text-blue-400" : "text-blue-600"} />
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className={`text-[9px] font-bold mt-0.5 ${isUrgent && !darkMode ? "text-black" : darkMode ? "text-white" : "text-black"}`}>{sub.cycle} • {sub.category}</p>

                                                        {/* Family Tag */}
                                                        {sub.shareWith && (
                                                            <div className={`mt-0.5 inline-flex items-center gap-1 px-1 py-0.5 rounded border text-[7px] font-bold uppercase ${darkMode ? "border-white text-white bg-white/30" : "border-black text-black bg-black/30"}`}>
                                                                <CreditCard size={7} /> Share: {sub.shareWith}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="text-right ml-2">
                                                    <h3 className={`text-base font-mono font-black ${isUrgent && !darkMode ? "text-black" : darkMode ? "text-white" : "text-black"}`}>{formatPrice(sub.price)}</h3>

                                                    {/* Row: Countdown + Pay Button */}
                                                    <div className="flex items-center justify-end gap-1.5 mt-1.5">
                                                        {/* Countdown Badge */}
                                                        <span className={`text-[8px] font-black uppercase px-2 py-1 rounded border inline-block ${isUrgent ? "bg-red-600 text-white border-red-600 animate-pulse" : (darkMode ? "bg-white/10 text-white border-white/20" : "bg-gray-100 text-black border-black/10")}`}>
                                                            {daysLeft < 0 ? "OVERDUE" : daysLeft === 0 ? "TODAY!" : `${daysLeft} Days`}
                                                        </span>

                                                        {/* Pay button */}
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handlePay(sub);
                                                            }}
                                                            className={`px-3 py-1 rounded border-2 text-[8px] font-black uppercase transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[1px] active:translate-y-[1px] flex items-center gap-1 ${darkMode
                                                                ? "bg-green-500 border-white text-black hover:bg-green-400"
                                                                : "bg-green-400 border-black text-black hover:bg-green-500"
                                                                }`}
                                                            title={syncWithBudget ? "Pay & Record to Budget.AI" : "Pay (Without Sync)"}
                                                        >
                                                            {syncWithBudget && <LinkIcon size={8} />}
                                                            PAY
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Ticket Tear Line */}
                                            <div className="relative flex items-center justify-between px-2">
                                                <div className={`w-2.5 h-2.5 rounded-full border-r-2 border-b-2 border-t-0 border-l-0 rotate-45 -ml-3 ${darkMode ? "border-white bg-[#1E1E1E]" : "border-black bg-white"}`}></div>
                                                <div className={`flex-1 border-t border-dashed border-current opacity-30 h-px mx-2`}></div>
                                                <div className={`w-2.5 h-2.5 rounded-full border-l-2 border-b-2 border-t-0 border-r-0 -rotate-45 -mr-3 ${darkMode ? "border-white bg-[#1E1E1E]" : "border-black bg-white"}`}></div>
                                            </div>

                                            {/* Bottom actions */}
                                            <div className="px-3 py-2 flex justify-between items-center">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDelete(sub.id);
                                                    }}
                                                    className={`text-[9px] font-bold uppercase flex items-center gap-1 hover:text-red-500 hover:underline transition-colors ${darkMode ? "text-white" : "text-black"}`}
                                                >
                                                    <Trash2 size={10} /> Delete
                                                </button>

                                                {sub.link && (
                                                    <a
                                                        href={sub.link}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        onClick={(e) => e.stopPropagation()}
                                                        className={`text-[9px] font-black uppercase flex items-center gap-1 px-2 py-1 rounded transition-colors ${darkMode ? "bg-white text-black hover:bg-white/80" : "bg-black text-white hover:bg-gray-800"}`}
                                                    >
                                                        Kill Switch <ExternalLink size={10} />
                                                    </a>
                                                )}
                                                {!sub.link && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            openEditModal(sub);
                                                        }}
                                                        className={`text-[9px] font-black uppercase flex items-center gap-1 px-2 py-1 rounded transition-colors ${darkMode ? "bg-white text-black hover:bg-white/80" : "bg-black text-white hover:bg-gray-800"}`}
                                                    >
                                                        Edit
                                                    </button>
                                                )}
                                            </div>

                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </section>
                </main>

                {/* RESET DATA BUTTON */}
                <div className="pt-8 pb-4 text-center">
                    <button
                        onClick={handleResetData}
                        className={`mx-auto px-5 py-2 rounded-full border border-red-500 text-red-500 text-[9px] font-bold uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2`}
                    >
                        <RotateCcw size={12} /> Reset Data
                    </button>
                </div>

                {/* --- FOOTER --- */}
                <div className="pb-8 pt-4 text-center opacity-40">
                    <p className="text-[10px] font-black uppercase tracking-widest leading-none">Sub.Tracker by kmlxly</p>
                    <p className="text-[9px] font-mono mt-1 opacity-70">{APP_VERSION}</p>
                </div>

                {/* --- AUTH MODAL --- */}
                <AuthModal
                    isOpen={showAuthModal}
                    onClose={() => setShowAuthModal(false)}
                    isDarkMode={darkMode}
                />

                {/* --- MODAL: SYNC CONSENT (Neo-Brutalism) --- */}
                {showSyncModal && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
                        <div className={`w-full max-w-[320px] p-6 rounded-2xl border-2 ${darkMode ? "bg-[#1E1E1E] border-white text-white" : "bg-white border-black text-black"} shadow-2xl relative animate-in zoom-in-95`}>
                            <button onClick={() => setShowSyncModal(false)} className="absolute top-4 right-4 opacity-50 hover:opacity-100"><X size={20} /></button>

                            <div className="text-center mb-6">
                                <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 border-2 ${syncWithBudget ? "bg-green-100 border-green-600 text-green-600" : "bg-gray-100 border-gray-400 text-gray-400"}`}>
                                    <RefreshCw size={32} className={syncWithBudget ? "animate-spin-slow" : ""} />
                                </div>
                                <h2 className="text-xl font-black uppercase leading-tight">Auto-Sync Budget</h2>
                                <p className="text-[10px] font-bold opacity-60 mt-2 leading-relaxed uppercase tracking-wider">
                                    Smart Link between Sub.Tracker & Budget.AI
                                </p>
                            </div>

                            <div className={`p-4 rounded-xl border-2 border-dashed mb-6 text-left space-y-3 ${darkMode ? "bg-black/30 border-white/20" : "bg-blue-50 border-blue-200"}`}>
                                <div className="flex items-start gap-3">
                                    <div className="mt-1"><Check size={14} className="text-green-500" /></div>
                                    <p className="text-xs font-bold leading-tight">When you tap <span className="underline">PAY</span>, the expense is automatically logged to Budget.AI.</p>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="mt-1"><Check size={14} className="text-green-500" /></div>
                                    <p className="text-xs font-bold leading-tight">Saves time and eliminates double entry.</p>
                                </div>
                            </div>

                            <div className="flex flex-col gap-2">
                                <button
                                    onClick={() => {
                                        setSyncWithBudget(true);
                                        setShowSyncModal(false);
                                    }}
                                    className={`w-full py-3 rounded-xl font-black uppercase text-xs border-2 flex items-center justify-center gap-2 transition-all active:scale-95 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] ${darkMode ? "bg-white text-black border-white" : "bg-green-500 text-white border-black"}`}
                                >
                                    ENABLE AUTO-SYNC <LinkIcon size={14} />
                                </button>
                                <button
                                    onClick={() => {
                                        setSyncWithBudget(false);
                                        setShowSyncModal(false);
                                    }}
                                    className={`w-full py-3 rounded-xl font-black uppercase text-xs border-2 flex items-center justify-center gap-2 transition-all active:scale-95 ${darkMode ? "bg-transparent text-white border-white/20 hover:border-white" : "bg-white text-gray-400 border-gray-200 hover:border-gray-400"}`}
                                >
                                    DISABLE SYNC
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- MODAL: ADD/EDIT SUBSCRIPTION (Compact) --- */}
                {showAddModal && (
                    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
                        <div className={`w-full max-w-sm p-5 rounded-2xl border-2 ${darkMode ? "bg-[#1E1E1E] border-white text-white" : "bg-white border-black text-black"} shadow-2xl animate-in slide-in-from-bottom-10 max-h-[90vh] overflow-y-auto`}>

                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-lg font-black uppercase italic">
                                    {editingId ? "Edit Commitment" : formType === "commitment" ? "Add Commitment" : "Add Subscription"}
                                </h2>
                                <button onClick={() => { setShowAddModal(false); resetForm(); }} className="opacity-50 hover:opacity-100">
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Type Toggle */}
                            <div className="flex gap-2 mb-3">
                                <button
                                    onClick={() => {
                                        setFormType("commitment");
                                        setFormCategory("Loan");
                                    }}
                                    className={`flex-1 py-1.5 text-[9px] font-black uppercase border-2 rounded-lg transition-all ${formType === "commitment" ? (darkMode ? "bg-blue-500 border-blue-500 text-white" : "bg-blue-500 border-black text-white") : "opacity-50 border-current"}`}
                                >
                                    Fixed Commitments
                                </button>
                                <button
                                    onClick={() => {
                                        setFormType("lifestyle");
                                        setFormCategory("Entertainment");
                                    }}
                                    className={`flex-1 py-1.5 text-[9px] font-black uppercase border-2 rounded-lg transition-all ${formType === "lifestyle" ? (darkMode ? "bg-pink-500 border-pink-500 text-white" : "bg-pink-500 border-black text-white") : "opacity-50 border-current"}`}
                                >
                                    Subscriptions
                                </button>
                            </div>

                            <div className="space-y-2.5">
                                <div>
                                    <label className="text-[9px] font-bold opacity-60 uppercase mb-0.5 block">Name</label>
                                    <input
                                        type="text"
                                        value={formName}
                                        onChange={(e) => setFormName(e.target.value)}
                                        placeholder="e.g. Home Loan, Netflix"
                                        className={`${inputStyle}`}
                                        autoFocus
                                    />
                                </div>
                                <div>
                                    <label className="text-[9px] font-bold opacity-60 uppercase mb-0.5 block">Price (RM)</label>
                                    <input
                                        type="number"
                                        value={formPrice}
                                        onChange={(e) => setFormPrice(e.target.value)}
                                        placeholder="0.00"
                                        className={`${inputStyle} text-base font-mono`}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-[9px] font-bold opacity-60 uppercase mb-0.5 block">Billing Cycle</label>
                                        <div className="relative">
                                            <select
                                                value={formCycle}
                                                onChange={(e) => setFormCycle(e.target.value as "Monthly" | "Yearly")}
                                                className={`${inputStyle} appearance-none pr-8`}
                                            >
                                                <option value="Monthly">Monthly</option>
                                                <option value="Yearly">Yearly</option>
                                            </select>
                                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-bold opacity-60 uppercase mb-0.5 block">Due Date</label>
                                        <input
                                            type="date"
                                            value={formNextDate}
                                            onChange={(e) => setFormNextDate(e.target.value)}
                                            className={`${inputStyle}`}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[9px] font-bold opacity-60 uppercase mb-0.5 block">Category</label>
                                    <div className="relative">
                                        <select
                                            value={formCategory}
                                            onChange={(e) => setFormCategory(e.target.value as Subscription["category"])}
                                            className={`${inputStyle} appearance-none pr-8`}
                                        >
                                            {(formType === "commitment" ? commitmentCategories : lifestyleCategories).map(cat => (
                                                <option key={cat} value={cat}>{cat}</option>
                                            ))}
                                        </select>
                                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[9px] font-bold opacity-60 uppercase mb-0.5 block">Share With (Optional)</label>
                                    <input
                                        type="text"
                                        value={formShareWith}
                                        onChange={(e) => setFormShareWith(e.target.value)}
                                        placeholder="e.g. Alex, Sam"
                                        className={`${inputStyle}`}
                                    />
                                </div>
                                {formType === "lifestyle" && (
                                    <div>
                                        <label className="text-[9px] font-bold opacity-60 uppercase mb-0.5 block">Kill Switch Link (Optional)</label>
                                        <input
                                            type="url"
                                            value={formLink}
                                            onChange={(e) => setFormLink(e.target.value)}
                                            placeholder="https://www.netflix.com/cancel"
                                            className={`${inputStyle}`}
                                        />
                                    </div>
                                )}

                                {editingId && (
                                    <button
                                        onClick={() => {
                                            handleDelete(editingId);
                                            setShowAddModal(false);
                                        }}
                                        className={`w-full py-2.5 mt-2 text-[10px] font-black uppercase rounded-xl border-2 border-red-500 text-red-500 hover:bg-red-500 hover:text-white transition-all active:scale-95`}
                                    >
                                        <Trash2 size={12} className="inline mr-1" /> DELETE COMMITMENT
                                    </button>
                                )}

                                <button
                                    onClick={handleSaveSubscription}
                                    className={`w-full py-2.5 mt-2 text-xs ${buttonBase} ${darkMode ? "bg-white text-black border-white" : "bg-black text-white border-black"}`}
                                >
                                    {editingId ? "UPDATE" : "SAVE"}
                                </button>
                            </div>

                        </div>
                    </div>
                )}

                <MobileBottomDock activeTab="subtracker" darkMode={darkMode} hidden={isModalOpen} />
            </div>
        </div>
    );
}
