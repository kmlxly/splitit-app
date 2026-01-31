"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
    ArrowLeft, Plus, Target, Wallet, TrendingUp,
    ChevronRight, X, Sparkles, Home, Heart, FileText,
    RefreshCw, Cloud, CreditCard, Shield, Lock,
    AlertCircle, ArrowRight, Trash2, Pencil, Check
} from "lucide-react";
import AuthModal from "@/components/Auth";
import { supabase } from "@/lib/supabaseClient";

// --- 1. CONFIG & TYPES ---
const APP_NAME = "Tabung.AI";
const APP_VERSION = "v1.0.0-beta";

type SavingsGoal = {
    id: number;
    title: string;
    target_amount: number;
    current_amount: number;
    color: string;
    target_date?: string;
};

export default function TabungPage() {
    // --- STATE ---
    const [darkMode, setDarkMode] = useState(false);
    const [goals, setGoals] = useState<SavingsGoal[]>([]);
    const [isDataLoaded, setIsDataLoaded] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);

    // Form State
    const [formTitle, setFormTitle] = useState("");
    const [formTarget, setFormTarget] = useState("");
    const [formColor, setFormColor] = useState("bg-blue-400");
    const [formDate, setFormDate] = useState("");

    // --- LOAD DATA ---
    useEffect(() => {
        const savedMode = localStorage.getItem("splitit_darkmode");
        if (savedMode !== null) setDarkMode(savedMode === "true");

        const initSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setUser(session?.user || null);

            if (session?.user) {
                const { data: cloudGoals } = await supabase
                    .from('savings_goals')
                    .select('*')
                    .eq('user_id', session.user.id);

                if (cloudGoals) setGoals(cloudGoals);
            } else {
                const localData = localStorage.getItem("tabung_data");
                if (localData) setGoals(JSON.parse(localData));
            }
            setIsDataLoaded(true);
        };
        initSession();
    }, []);

    // --- SAVE DATA (Local Fallback) ---
    useEffect(() => {
        if (isDataLoaded && !user) {
            localStorage.setItem("tabung_data", JSON.stringify(goals));
        }
    }, [goals, user, isDataLoaded]);

    // --- HANDLERS ---
    const handleSaveGoal = async () => {
        if (!formTitle || !formTarget) return alert("Isi tajuk & target!");

        const newGoal = {
            id: editingId || Date.now(),
            title: formTitle,
            target_amount: parseFloat(formTarget),
            current_amount: editingId ? (goals.find(g => g.id === editingId)?.current_amount || 0) : 0,
            color: formColor,
            target_date: formDate
        };

        if (user) {
            const { error } = await supabase
                .from('savings_goals')
                .upsert({ ...newGoal, user_id: user.id });
            if (error) return alert("Gagal simpan ke cloud");
        }

        if (editingId) {
            setGoals(goals.map(g => g.id === editingId ? newGoal : g));
        } else {
            setGoals([...goals, newGoal]);
        }

        setShowAddModal(false);
        resetForm();
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Betul nak padam tabung ni?")) return;

        if (user) {
            await supabase.from('savings_goals').delete().eq('id', id);
        }
        setGoals(goals.filter(g => g.id !== id));
        setShowAddModal(false);
    };

    const handleAddDeposit = async (goalId: number, amount: number) => {
        const goal = goals.find(g => g.id === goalId);
        if (!goal) return;

        const updatedGoal = { ...goal, current_amount: goal.current_amount + amount };

        // 1. Update Goal
        if (user) {
            await supabase.from('savings_goals').upsert({ ...updatedGoal, user_id: user.id });
        }
        setGoals(goals.map(g => g.id === goalId ? updatedGoal : g));

        // 2. Sync to Budget.AI as Expense (Savings Category)
        const newTx = {
            id: Date.now(),
            user_id: user?.id,
            title: `Simpan: ${goal.title}`,
            amount: -Math.abs(amount),
            category: "Savings",
            date: new Date().toLocaleDateString('en-MY', { day: 'numeric', month: 'short' }),
            isoDate: new Date().toISOString().split('T')[0]
        };

        const savedBudgetData = localStorage.getItem("budget_data");
        const budgetTransactions = savedBudgetData ? JSON.parse(savedBudgetData) : [];
        localStorage.setItem("budget_data", JSON.stringify([newTx, ...budgetTransactions]));

        if (user) {
            await supabase.from('budget_transactions').insert({
                ...newTx,
                iso_date: newTx.isoDate
            });
        }

        alert(`Alhamdulillah! RM${amount} telah dimasukkan ke dalam ${goal.title}`);
    };

    const resetForm = () => {
        setFormTitle("");
        setFormTarget("");
        setFormColor("bg-blue-400");
        setFormDate("");
        setEditingId(null);
    };

    // --- STYLES ---
    const bgStyle = darkMode ? "bg-black text-white" : "bg-gray-200 text-black";
    const cardStyle = `${darkMode ? "bg-[#1E1E1E] border-white" : "bg-white border-black"} border-2 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]`;
    const inputStyle = `w-full p-3 rounded-xl border-2 outline-none font-bold ${darkMode ? "bg-black border-white text-white" : "bg-white border-black"}`;
    const colorOptions = ["bg-blue-400", "bg-pink-400", "bg-yellow-400", "bg-green-400", "bg-purple-400", "bg-orange-400"];

    return (
        <div className={`min-h-screen font-sans ${bgStyle}`}>
            <div className="max-w-md mx-auto min-h-screen flex flex-col p-4 pb-24">

                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <Link href="/" className="p-2 border-2 rounded-xl border-black bg-white text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                        <ArrowLeft size={20} />
                    </Link>
                    <div className="flex items-center gap-2">
                        <Target className="text-pink-500" />
                        <h1 className="text-xl font-black uppercase italic">{APP_NAME}</h1>
                    </div>
                    <button onClick={() => setShowAddModal(true)} className="p-2 border-2 rounded-xl border-black bg-green-400 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                        <Plus size={20} />
                    </button>
                </div>

                {/* Summary Card */}
                <div className={`${cardStyle} p-6 mb-8 bg-indigo-500 text-white`}>
                    <p className="text-xs font-black uppercase opacity-60">Total Simpanan</p>
                    <h2 className="text-4xl font-black font-mono">RM {goals.reduce((acc, g) => acc + g.current_amount, 0).toFixed(0)}</h2>
                    <div className="mt-4 flex gap-4">
                        <div className="flex-1">
                            <p className="text-[10px] uppercase font-bold opacity-60">Aktif Goal</p>
                            <p className="text-lg font-black">{goals.length}</p>
                        </div>
                        <div className="flex-1">
                            <p className="text-[10px] uppercase font-bold opacity-60">Selesai</p>
                            <p className="text-lg font-black">{goals.filter(g => g.current_amount >= g.target_amount).length}</p>
                        </div>
                    </div>
                </div>

                {/* Goals Grid */}
                <div className="space-y-4">
                    {goals.length === 0 ? (
                        <div className="text-center py-20 opacity-30">
                            <TrendingUp size={48} className="mx-auto mb-2" />
                            <p className="font-black uppercase italic">Mula menyimpan hari ini!</p>
                        </div>
                    ) : (
                        goals.map(goal => {
                            const progress = Math.min(100, (goal.current_amount / goal.target_amount) * 100);
                            return (
                                <div key={goal.id} className={`${cardStyle} overflow-hidden`}>
                                    <div className="p-4">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <h3 className="text-lg font-black uppercase leading-tight">{goal.title}</h3>
                                                <p className="text-[10px] font-bold opacity-60 mt-1 uppercase tracking-widest">{goal.target_date || "No Deadline"}</p>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    setEditingId(goal.id);
                                                    setFormTitle(goal.title);
                                                    setFormTarget(String(goal.target_amount));
                                                    setFormColor(goal.color);
                                                    setFormDate(goal.target_date || "");
                                                    setShowAddModal(true);
                                                }}
                                                className="opacity-40 hover:opacity-100"
                                            >
                                                <Pencil size={14} />
                                            </button>
                                        </div>

                                        <div className="flex justify-between items-end mb-1">
                                            <p className="text-sm font-black font-mono">RM {goal.current_amount.toFixed(0)}</p>
                                            <p className="text-[10px] font-bold opacity-60">Target: RM {goal.target_amount}</p>
                                        </div>

                                        {/* Progress Bar */}
                                        <div className="h-6 w-full rounded-lg border-2 border-black bg-gray-100 overflow-hidden relative">
                                            <div
                                                className={`h-full ${goal.color} border-r-2 border-black transition-all duration-500`}
                                                style={{ width: `${progress}%` }}
                                            ></div>
                                            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-black mix-blend-overlay">
                                                {progress.toFixed(0)}%
                                            </span>
                                        </div>

                                        {/* Action: Quick Deposit */}
                                        <div className="mt-4 grid grid-cols-4 gap-2">
                                            {[10, 50, 100, 500].map(amt => (
                                                <button
                                                    key={amt}
                                                    onClick={() => handleAddDeposit(goal.id, amt)}
                                                    className="py-1 border-2 border-black rounded-lg text-[10px] font-black hover:bg-black hover:text-white transition-all active:scale-90"
                                                >
                                                    +{amt}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Modal: Add/Edit */}
                {showAddModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <div className={`w-full max-w-sm p-6 rounded-3xl border-2 ${darkMode ? "bg-[#1E1E1E] border-white text-white" : "bg-white border-black text-black"} shadow-2xl space-y-4`}>
                            <div className="flex justify-between items-center">
                                <h2 className="text-xl font-black uppercase italic">{editingId ? "Edit Tabung" : "Tabung Baru"}</h2>
                                <button onClick={() => { setShowAddModal(false); resetForm(); }}><X size={24} /></button>
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase opacity-50 block mb-1">Nama Matlamat</label>
                                <input type="text" value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="Cth: Cuti JP / Laptop" className={inputStyle} />
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase opacity-50 block mb-1">Target (RM)</label>
                                <input type="number" value={formTarget} onChange={e => setFormTarget(e.target.value)} placeholder="0.00" className={inputStyle} />
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase opacity-50 block mb-1">Target Tarikh (Opsional)</label>
                                <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} className={inputStyle} />
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase opacity-50 block mb-1">Warna Tabung</label>
                                <div className="flex gap-2">
                                    {colorOptions.map(c => (
                                        <button
                                            key={c}
                                            onClick={() => setFormColor(c)}
                                            className={`w-8 h-8 rounded-full border-2 border-black ${c} ${formColor === c ? "ring-2 ring-offset-2 ring-black scale-110" : "opacity-60"}`}
                                        ></button>
                                    ))}
                                </div>
                            </div>

                            {editingId && (
                                <button
                                    onClick={() => handleDelete(editingId)}
                                    className="w-full py-2.5 mt-2 text-[10px] font-black uppercase rounded-xl border-2 border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                                >
                                    <Trash2 size={12} className="inline mr-1" /> Padam Tabung
                                </button>
                            )}

                            <button onClick={handleSaveGoal} className="w-full py-3 bg-black text-white border-2 border-black rounded-2xl font-black uppercase shadow-[4px_4px_0px_0px_rgba(34,197,94,1)] active:shadow-none translate-x-[-2px] translate-y-[-2px] active:translate-x-0 active:translate-y-0 transition-all">
                                {editingId ? "Kemaskini" : "Simpan Tabung"}
                            </button>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
