"use client";

import React, { useState, useEffect, useRef } from "react";
import html2canvas from "html2canvas";
import { 
  Moon, Sun, CheckCircle, Trash2, 
  Edit3, Copy, Check, Bike, Tag, RotateCcw, Plus, X, 
  ChevronDown, ChevronUp, Receipt, Users, AlertCircle, 
  CreditCard, QrCode, Upload, Wallet, ExternalLink, ArrowRight, Info, Folder, Calculator, Save, ShoppingBag, User
} from "lucide-react";

// --- TYPES ---
type Person = { 
  id: string; name: string; 
  bankName?: string; bankAccount?: string; qrImage?: string; 
};
type BillType = "EQUAL" | "ITEMIZED";
type SplitMethod = "PROPORTIONAL" | "EQUAL_SPLIT";
type BillDetail = { personId: string; base: number; tax: number; misc: number; discount: number; total: number; };

type MenuItem = {
    id: string;
    name: string;
    price: number;
    sharedBy: string[];
};

type Bill = {
  id: string; title: string; type: BillType; totalAmount: number; paidBy: string;
  details: BillDetail[]; itemsSubtotal: number; miscAmount: number; discountAmount: number;
  taxMethod: SplitMethod; discountMethod: SplitMethod;
  menuItems?: MenuItem[]; 
};
type Transfer = { fromId: string; toId: string; fromName: string; toName: string; amount: number; };

type Session = {
    id: string;
    name: string;
    createdAt: number;
    people: Person[];
    bills: Bill[];
    paidStatus: Record<string, boolean>;
};

export default function SplitBillBrutalV2() {
  // --- STATE ---
  const [darkMode, setDarkMode] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [newSessionName, setNewSessionName] = useState("");
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null); 
  const [tempSessionName, setTempSessionName] = useState(""); 

  const activeSession = sessions.find(s => s.id === activeSessionId);
  const people = activeSession?.people || [];
  const bills = activeSession?.bills || [];
  const paidStatus = activeSession?.paidStatus || {};

  const [newPersonName, setNewPersonName] = useState("");
  const [editingPersonId, setEditingPersonId] = useState<string | null>(null);
  const [expandedBillId, setExpandedBillId] = useState<string | null>(null); 
  const [copied, setCopied] = useState(false);
  const [mode, setMode] = useState<"DASHBOARD" | "FORM">("DASHBOARD");
  
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentProfileId, setPaymentProfileId] = useState<string | null>(null);
  const [showPayModal, setShowPayModal] = useState(false);
  const [activeTransfer, setActiveTransfer] = useState<Transfer | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  
  const receiptRef = useRef<HTMLDivElement>(null);

  const [editingBillId, setEditingBillId] = useState<string | null>(null);
  const [billType, setBillType] = useState<BillType>("EQUAL");
  const [billTitle, setBillTitle] = useState("");
  const [billTotal, setBillTotal] = useState(""); 
  const [miscFee, setMiscFee] = useState(""); 
  const [discountFee, setDiscountFee] = useState(""); 
  const [payerId, setPayerId] = useState("");
  const [taxMethod, setTaxMethod] = useState<SplitMethod>("PROPORTIONAL");
  const [discountMethod, setDiscountMethod] = useState<SplitMethod>("PROPORTIONAL");

  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [newItemName, setNewItemName] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [newItemSharedBy, setNewItemSharedBy] = useState<string[]>([]);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);

  // --- STORAGE & MIGRATION ---
  useEffect(() => {
    const savedMode = localStorage.getItem("splitit_darkmode");
    if (savedMode !== null) setDarkMode(savedMode === "true"); else setDarkMode(false);
    const savedSessions = localStorage.getItem("splitit_sessions");
    const savedActiveId = localStorage.getItem("splitit_active_session_id");
    if (savedSessions) {
        const parsedSessions = JSON.parse(savedSessions);
        setSessions(parsedSessions);
        if (savedActiveId && parsedSessions.some((s:Session) => s.id === savedActiveId)) {
            setActiveSessionId(savedActiveId);
        } else if (parsedSessions.length > 0) {
            setActiveSessionId(parsedSessions[0].id);
        }
    } else {
        const newSession: Session = {
            id: `s${Date.now()}`, name: "Sesi Lepak 1", createdAt: Date.now(),
            people: [{ id: "p1", name: "Aku" }, { id: "p2", name: "Member 1" }],
            bills: [], paidStatus: {}
        };
        setSessions([newSession]);
        setActiveSessionId(newSession.id);
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
        localStorage.setItem("splitit_sessions", JSON.stringify(sessions));
        localStorage.setItem("splitit_darkmode", String(darkMode));
        if (activeSessionId) localStorage.setItem("splitit_active_session_id", activeSessionId);
    }
  }, [sessions, darkMode, activeSessionId, isLoaded]);

  const updateActiveSession = (updates: Partial<Session>) => {
      setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, ...updates } : s));
  };

  const createNewSession = () => {
      if (!newSessionName.trim()) return;
      const newSession: Session = {
          id: `s${Date.now()}`, name: newSessionName, createdAt: Date.now(),
          people: [{ id: "p1", name: "Aku" }, { id: "p2", name: "Member 1" }],
          bills: [], paidStatus: {}
      };
      setSessions([...sessions, newSession]);
      setActiveSessionId(newSession.id);
      setNewSessionName("");
      setShowSessionModal(false);
      setMode("DASHBOARD");
  };

  const deleteSession = (sid: string) => {
      if (sessions.length <= 1) { alert("Tinggal satu je sesi, tak boleh delete bos."); return; }
      if (confirm("Padam sesi ni?")) {
          const newSessions = sessions.filter(s => s.id !== sid);
          setSessions(newSessions);
          if (activeSessionId === sid) setActiveSessionId(newSessions[0].id);
      }
  };

  const startRenameSession = (s: Session) => { setEditingSessionId(s.id); setTempSessionName(s.name); };
  const saveRenameSession = () => {
      if (!tempSessionName.trim()) return;
      setSessions(prev => prev.map(s => s.id === editingSessionId ? { ...s, name: tempSessionName } : s));
      setEditingSessionId(null);
  };

  const addPerson = () => {
    if (!newPersonName.trim()) return;
    updateActiveSession({ people: [...people, { id: `p${Date.now()}`, name: newPersonName }] });
    setNewPersonName("");
  };
  const updatePersonName = (id: string, newName: string) => {
    updateActiveSession({ people: people.map(p => p.id === id ? { ...p, name: newName } : p) });
  };
  const updatePaymentProfile = (id: string, bankName: string, acc: string, qr: string) => {
    updateActiveSession({ people: people.map(p => p.id === id ? { ...p, bankName, bankAccount: acc, qrImage: qr } : p) });
  };
  const deletePerson = (id: string) => {
    if (bills.some(b => b.paidBy === id || b.details.some(d => d.personId === id))) {
      alert("Member ni ada rekod dalam bill."); return;
    }
    updateActiveSession({ people: people.filter(p => p.id !== id) });
    setEditingPersonId(null);
  };
  const togglePaymentStatus = (fromId: string, toId: string) => {
    const key = `${fromId}-${toId}`;
    updateActiveSession({ paidStatus: { ...paidStatus, [key]: !paidStatus[key] } });
  };

  const addMenuItem = () => {
      if (!newItemName || !newItemPrice || newItemSharedBy.length === 0) return;
      const price = parseFloat(newItemPrice);
      if (isNaN(price)) return;
      const newItem: MenuItem = { id: `m${Date.now()}`, name: newItemName, price: price, sharedBy: newItemSharedBy };
      setMenuItems([...menuItems, newItem]);
      setNewItemName(""); setNewItemPrice(""); setNewItemSharedBy([]); setIsMultiSelectMode(false);
  };

  const removeMenuItem = (mid: string) => { setMenuItems(menuItems.filter(m => m.id !== mid)); };

  const selectPersonForMenu = (pid: string) => {
      if (isMultiSelectMode) {
          if (newItemSharedBy.includes(pid)) {
              setNewItemSharedBy(newItemSharedBy.filter(id => id !== pid));
          } else {
              setNewItemSharedBy([...newItemSharedBy, pid]);
          }
      } else {
          setNewItemSharedBy([pid]);
      }
  };

  const toggleMultiSelect = () => {
      const newMode = !isMultiSelectMode;
      setIsMultiSelectMode(newMode);
      if (!newMode && newItemSharedBy.length > 1) setNewItemSharedBy([]);
  };

  const startEditBill = (bill: Bill) => {
    setEditingBillId(bill.id); setBillTitle(bill.title); setBillTotal(String(bill.totalAmount));
    setBillType(bill.type); setPayerId(bill.paidBy);
    setMiscFee(bill.miscAmount > 0 ? String(bill.miscAmount) : "");
    setDiscountFee(bill.discountAmount > 0 ? String(bill.discountAmount) : "");
    setTaxMethod(bill.taxMethod); setDiscountMethod(bill.discountMethod);
    if (bill.menuItems) { setMenuItems(bill.menuItems); } else { setMenuItems([]); }
    setMode("FORM");
  };

  const resetForm = () => {
    setEditingBillId(null); setBillTitle(""); setBillTotal(""); setBillType("EQUAL");
    setMiscFee(""); setDiscountFee(""); setMenuItems([]); 
    setPayerId(people[0]?.id || ""); 
    setTaxMethod("PROPORTIONAL"); setDiscountMethod("PROPORTIONAL"); setMode("DASHBOARD");
    setNewItemName(""); setNewItemPrice(""); setNewItemSharedBy([]); setIsMultiSelectMode(false);
  };

  const saveBill = () => {
    if (!billTitle || !billTotal || !payerId) return;
    const grandTotal = parseFloat(billTotal);
    const miscTotal = parseFloat(miscFee) || 0;
    const discountTotal = parseFloat(discountFee) || 0;
    let calculatedDetails: BillDetail[] = [];
    let itemsSubtotal = 0;

    if (billType === "EQUAL") {
      const splitAmt = grandTotal / people.length;
      calculatedDetails = people.map(p => ({ personId: p.id, base: splitAmt, tax: 0, misc: 0, discount: 0, total: splitAmt }));
      itemsSubtotal = grandTotal;
    } else {
      const personBaseMap: Record<string, number> = {};
      people.forEach(p => personBaseMap[p.id] = 0);
      menuItems.forEach(item => {
          const splitCount = item.sharedBy.length;
          if (splitCount > 0) {
              const share = item.price / splitCount;
              item.sharedBy.forEach(pid => { if (personBaseMap[pid] !== undefined) personBaseMap[pid] += share; });
          }
      });
      itemsSubtotal = menuItems.reduce((sum, item) => sum + item.price, 0);
      const rawTax = grandTotal - (itemsSubtotal + miscTotal) + discountTotal;
      const taxTotal = rawTax > 0.05 ? rawTax : 0;
      const miscPerHead = miscTotal / people.length;

      calculatedDetails = people.map(p => {
        const base = personBaseMap[p.id] || 0;
        let taxShare = 0;
        if (taxTotal > 0) { taxShare = taxMethod === "PROPORTIONAL" && itemsSubtotal > 0 ? (base / itemsSubtotal) * taxTotal : taxTotal / people.length; }
        let discountShare = 0;
        if (discountTotal > 0) { discountShare = discountMethod === "PROPORTIONAL" && itemsSubtotal > 0 ? (base / itemsSubtotal) * discountTotal : discountTotal / people.length; }
        return { personId: p.id, base: base, tax: taxShare, misc: miscPerHead, discount: discountShare, total: base + taxShare + miscPerHead - discountShare };
      });
    }

    const newBill: Bill = {
        id: editingBillId || `b${Date.now()}`, title: billTitle, type: billType, totalAmount: grandTotal, paidBy: payerId, 
        details: calculatedDetails, itemsSubtotal, miscAmount: miscTotal, discountAmount: discountTotal, taxMethod, discountMethod,
        menuItems: billType === "ITEMIZED" ? menuItems : []
    };
    
    let updatedBills = [...bills];
    if (editingBillId) { updatedBills = bills.map(b => b.id === editingBillId ? newBill : b); } 
    else { updatedBills = [newBill, ...bills]; }
    updateActiveSession({ bills: updatedBills });
    resetForm();
  };

  const deleteBill = (id: string) => { 
      if(confirm("Padam resit ni?")) updateActiveSession({ bills: bills.filter(b => b.id !== id) });
  };

  const getCalcStatus = () => {
    const total = parseFloat(billTotal) || 0; const misc = parseFloat(miscFee) || 0; const disc = parseFloat(discountFee) || 0; 
    const items = menuItems.reduce((sum, item) => sum + item.price, 0); 
    return total - (items + misc - disc);
  };
  
  const calculateSettlement = () => {
    let bal: Record<string, number> = {}; people.forEach(p => bal[p.id] = 0);
    bills.forEach(b => { bal[b.paidBy] += b.totalAmount; b.details.forEach(d => { bal[d.personId] -= d.total; }); });
    const netPeople = people.map(p => ({ ...p, net: bal[p.id] || 0 }));
    let debtors = netPeople.filter(p => p.net < -0.01).map(p => ({...p, net: Math.abs(p.net)})).sort((a,b) => b.net - a.net);
    let creditors = netPeople.filter(p => p.net > 0.01).sort((a,b) => b.net - a.net);
    let txs: Transfer[] = []; let i=0, j=0;
    while(i < debtors.length && j < creditors.length) {
        let amt = Math.min(debtors[i].net, creditors[j].net);
        if (amt > 0.01) txs.push({ fromId: debtors[i].id, fromName: debtors[i].name, toId: creditors[j].id, toName: creditors[j].name, amount: amt });
        debtors[i].net -= amt; creditors[j].net -= amt;
        if (debtors[i].net < 0.01) i++; if (creditors[j].net < 0.01) j++;
    }
    return { netPeople, txs };
  };
  const { netPeople, txs } = calculateSettlement(); const taxGap = getCalcStatus();
  const totalSpent = bills.reduce((sum, b) => sum + b.totalAmount, 0);

  const handleOpenImage = async () => { 
    if (!receiptRef.current) return;
    setIsSharing(true);
    await new Promise(r => setTimeout(r, 200));
    try {
        const canvas = await html2canvas(receiptRef.current, { backgroundColor: darkMode ? "#000000" : "#E5E7EB", scale: 2, useCORS: true, allowTaint: true, logging: false });
        canvas.toBlob((blob) => { if (blob) { const url = URL.createObjectURL(blob); const newWindow = window.open(url, '_blank'); if (!newWindow) alert("Pop-up diblock!"); } else alert("Gagal."); setIsSharing(false); }, "image/png");
    } catch (err) { alert("Ralat."); setIsSharing(false); }
  };
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, pid: string) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2000000) { alert("File besar > 2MB."); return; }
      const reader = new FileReader();
      reader.onloadend = async () => { const rawBase64 = reader.result as string; const p = people.find(per => per.id === pid); if(p) updatePaymentProfile(pid, p.bankName || "", p.bankAccount || "", rawBase64); };
      reader.readAsDataURL(file);
    }
  };

  const bgStyle = darkMode ? "bg-black text-white" : "bg-gray-200 text-black";
  const cardStyle = `${darkMode ? "bg-[#1E1E1E] border-white" : "bg-white border-black"} border-2 rounded-2xl`;
  const shadowStyle = darkMode ? "" : "shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]";
  const buttonBase = `border-2 font-bold rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 ${darkMode ? "border-white hover:bg-white hover:text-black" : "border-black hover:bg-black hover:text-white"} ${shadowStyle} hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]`;
  const inputStyle = `w-full p-3 rounded-xl bg-transparent border-2 outline-none font-bold transition-all focus:ring-0 ${darkMode ? "border-white focus:border-lime-300 placeholder:text-white/50" : "border-black focus:border-blue-500 placeholder:text-black/50"}`;

  if (!isLoaded) return <div className="min-h-screen bg-gray-200"/>;

  return (
    <div className={`min-h-screen font-sans transition-colors duration-300 ${bgStyle}`}>
      <div className="max-w-md mx-auto min-h-screen flex flex-col relative overflow-hidden">
        
        {/* HEADER */}
        <header className={`p-6 border-b-2 relative z-10 ${darkMode ? "border-white bg-black" : "border-black bg-gray-200"}`}>
            <div className="flex justify-between items-center">
                <a href="/" className="flex items-center gap-3 cursor-pointer group">
                     <div className={`w-12 h-12 border-2 rounded-xl flex items-center justify-center overflow-hidden transition-transform group-hover:scale-105 ${darkMode ? "bg-white border-white" : "bg-white/10 backdrop-blur border-black"}`}>
                        <img src="/icon.png" width={40} height={40} alt="Logo" className="object-cover"/>
                     </div>
                     <div>
                        <h1 className="text-2xl font-black tracking-tight leading-none uppercase group-hover:underline decoration-2 underline-offset-2">SplitIt.</h1>
                        <p className="text-[10px] uppercase tracking-widest font-bold mt-1 opacity-70 truncate max-w-[100px]">{activeSession?.name || "Loading..."}</p>
                     </div>
                </a>
                <div className="flex gap-2">
                    <button onClick={() => setShowSessionModal(true)} className={`p-2 ${buttonBase}`}><Folder size={20}/></button>
                    <button onClick={() => setDarkMode(!darkMode)} className={`p-2 ${buttonBase}`}>{darkMode ? <Sun size={20}/> : <Moon size={20}/>}</button>
                </div>
            </div>
        </header>

        <main className="flex-1 p-6 flex flex-col gap-8 relative z-10">
            {/* DASHBOARD */}
            {mode === "DASHBOARD" && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="grid grid-cols-2 gap-3">
                        <div className={`${cardStyle} p-4 flex flex-col items-center justify-center ${shadowStyle}`}>
                            <span className="text-[10px] uppercase font-bold opacity-60 mb-1">Total Hangus</span>
                            <span className="text-xl font-mono font-black">RM{totalSpent.toFixed(2)}</span>
                        </div>
                        <button onClick={() => setShowSessionModal(true)} className={`${cardStyle} p-4 flex flex-col items-center justify-center cursor-pointer transition-all ${shadowStyle} ${darkMode ? "hover:bg-gray-800" : "hover:bg-yellow-50"}`}>
                            <span className="text-[10px] uppercase font-bold opacity-60 mb-1 flex items-center gap-1">Event <Folder size={10}/></span>
                            <div className="flex items-center gap-1 max-w-full"><span className="text-sm font-black truncate">{activeSession?.name || "Loading..."}</span><ChevronDown size={14}/></div>
                        </button>
                    </div>

                    <section className={`${cardStyle} p-5 ${darkMode ? "" : "bg-violet-100"} ${shadowStyle}`}>
                        <div className="flex items-center justify-between mb-4"><h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2"><Users size={16}/> Geng Lepak</h2></div>
                        <div className="flex flex-wrap gap-2">
                            {people.map(p => (
                                <div key={p.id} className="relative">
                                    {editingPersonId === p.id ? (
                                        <div className={`flex items-center border-2 rounded-xl p-1 gap-1 ${darkMode ? "border-blue-400 bg-blue-400/20" : "border-blue-600 bg-blue-100"}`}>
                                            <input autoFocus value={p.name} onChange={e => updatePersonName(p.id, e.target.value)} onKeyDown={e => e.key === "Enter" && setEditingPersonId(null)} className="bg-transparent outline-none text-sm font-bold px-2 w-24"/>
                                            <button onClick={() => deletePerson(p.id)} className={`p-1.5 rounded-lg ${darkMode ? "text-red-400 hover:bg-red-400/20" : "text-red-600 hover:bg-red-200"}`}><Trash2 size={14}/></button>
                                            <button onClick={() => setEditingPersonId(null)} className={`p-1.5 rounded-lg ${darkMode ? "text-green-400 hover:bg-green-400/20" : "text-green-600 hover:bg-green-200"}`}><Check size={14}/></button>
                                        </div>
                                    ) : (
                                        <div className="flex gap-1"><button onClick={() => setEditingPersonId(p.id)} className={`group relative px-6 py-2 text-sm font-bold border-2 rounded-xl transition-all hover:shadow-none overflow-hidden ${darkMode ? "border-white bg-[#333] hover:bg-[#444]" : "border-black bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"}`}><span className="block transition-transform duration-300 group-hover:-translate-x-3">{p.name}</span><div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-10 group-hover:translate-x-[-12px] transition-transform duration-300 ease-out"><Edit3 size={16} className="fill-yellow-400 text-black stroke-[2.5px]" /></div></button><button onClick={() => {setPaymentProfileId(p.id); setShowPaymentModal(true)}} className={`p-2 border-2 rounded-xl flex items-center justify-center transition-all active:scale-95 ${p.bankAccount ? (darkMode ? "bg-green-400 text-black border-green-400" : "bg-green-400 text-black border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]") : (darkMode ? "border-white/20 text-white/20 hover:border-white hover:text-white" : "border-black/20 text-black/20 hover:border-black hover:text-black")}`}><Wallet size={16}/></button></div>
                                    )}
                                </div>
                            ))}
                            <div className={`flex items-center border-2 rounded-xl px-3 py-2 ${darkMode ? "border-white bg-[#333]" : "border-black bg-white"}`}><input value={newPersonName} onChange={e => setNewPersonName(e.target.value)} onKeyDown={e => e.key === "Enter" && addPerson()} placeholder="Tambah..." className={`bg-transparent font-bold outline-none text-sm w-20 ${darkMode ? "placeholder:text-white/50" : "placeholder:text-black/50"}`}/><button onClick={addPerson} className={`p-1 rounded-full ${darkMode ? "bg-white text-black" : "bg-black text-white"} ml-2 hover:scale-110 transition`}><Plus size={14}/></button></div>
                        </div>
                    </section>

                    <section>
                        <div className="flex items-center justify-between mb-4"><h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2"><Receipt size={16}/> Resit / Bill</h2></div>
                        <div className="space-y-4">
                            {bills.length === 0 ? (
                                <button onClick={() => {resetForm(); setMode("FORM")}} className={`w-full p-8 border-2 border-dashed rounded-2xl text-center opacity-60 hover:opacity-100 hover:border-solid transition flex flex-col items-center gap-2 ${darkMode ? "border-white" : "border-black"}`}><Plus size={32} className="mb-2"/><p className="text-base font-bold">Tiada rekod. Tambah bill pertama!</p></button>
                            ) : (
                                <>
                                {bills.map(bill => (
                                    <div key={bill.id} className={`${cardStyle} ${shadowStyle} overflow-hidden transition-all`}>
                                        <div onClick={() => setExpandedBillId(expandedBillId === bill.id ? null : bill.id)} className={`p-5 cursor-pointer flex justify-between items-center ${darkMode ? "hover:bg-[#333]" : "hover:bg-gray-50"}`}>
                                            <div><h3 className="font-black text-lg uppercase truncate">{bill.title}</h3><div className="flex gap-2 mt-1"><span className={`text-[10px] font-bold px-2 py-0.5 border rounded-full ${bill.type === "EQUAL" ? (darkMode ? "border-green-400 text-green-400" : "border-green-600 text-green-700 bg-green-100") : (darkMode ? "border-blue-400 text-blue-400" : "border-blue-600 text-blue-700 bg-blue-100")}`}>{bill.type === "EQUAL" ? "KONGSI RATA" : "SPLIT ITEM"}</span><span className="text-[10px] font-bold opacity-70 self-center">Bayar: {people.find(p=>p.id === bill.paidBy)?.name}</span></div></div>
                                            <div className="text-right"><div className="font-mono font-black text-xl">RM{bill.totalAmount.toFixed(2)}</div>{expandedBillId === bill.id ? <ChevronUp size={20} className="ml-auto mt-1"/> : <ChevronDown size={20} className="ml-auto mt-1"/>}</div>
                                        </div>
                                        {expandedBillId === bill.id && (
                                            <div className={`text-sm border-t-2 p-5 space-y-3 ${darkMode ? "border-white bg-[#1a1a1a]" : "border-black bg-gray-50"}`}>
                                                {bill.type === "ITEMIZED" && bill.menuItems && bill.menuItems.length > 0 && (
                                                    <div className="mb-4 pb-4 border-b border-dashed border-current border-opacity-20">
                                                        <p className="text-[10px] font-bold uppercase opacity-50 mb-2">Menu Dipesan:</p>
                                                        {bill.menuItems.map(m => (
                                                            <div key={m.id} className="flex justify-between text-xs py-1">
                                                                <span>{m.name} ({m.sharedBy.map(pid => people.find(p=>p.id===pid)?.name).join(", ")})</span>
                                                                <span className="font-mono opacity-70">RM{m.price.toFixed(2)}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                                {bill.details.map(d => (
                                                    <div key={d.personId} className="flex justify-between items-center py-2 border-b border-dashed border-current border-opacity-20 last:border-0"><span className="font-bold">{people.find(p=>p.id === d.personId)?.name}</span><span className="font-mono font-black text-base">RM{d.total.toFixed(2)}</span></div>
                                                ))}
                                                <div className="flex gap-3 pt-4 mt-2 justify-end"><button onClick={() => startEditBill(bill)} className={`px-4 py-2 border-2 rounded-xl text-xs font-bold flex items-center gap-2 ${darkMode ? "border-blue-400 text-blue-400 hover:bg-blue-400 hover:text-black" : "border-blue-600 text-blue-700 bg-blue-50 hover:bg-blue-600 hover:text-white hover:border-black"}`}><Edit3 size={14}/> EDIT</button><button onClick={() => deleteBill(bill.id)} className={`px-4 py-2 border-2 rounded-xl text-xs font-bold flex items-center gap-2 ${darkMode ? "border-red-400 text-red-400 hover:bg-red-400 hover:text-black" : "border-red-600 text-red-700 bg-red-50 hover:bg-red-600 hover:text-white hover:border-black"}`}><Trash2 size={14}/> DELETE</button></div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                                <button onClick={() => {resetForm(); setMode("FORM")}} className={`w-full py-4 ${buttonBase} ${darkMode ? "bg-[#333]" : "bg-white"} mt-4 text-sm uppercase tracking-wider`}><Plus size={18}/> Tambah Bill Lagi</button>
                                </>
                            )}
                        </div>
                    </section>

                    {bills.length > 0 && (
                        <section>
                            <div className="flex items-center justify-between mb-4"><h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2"><CheckCircle size={16}/> Final Settlement</h2></div>
                            <div className={`${cardStyle} p-6 ${shadowStyle} ${darkMode ? "bg-[#222]" : "bg-lime-200"}`}>
                                <div className="mb-6 text-center border-b-2 border-current border-opacity-10 pb-4"><span className="text-[10px] uppercase font-bold opacity-60">Total Hangus</span><div className="text-3xl font-mono font-black mt-1">RM{totalSpent.toFixed(2)}</div></div>
                                <div className="grid grid-cols-2 gap-3 mb-6">{netPeople.map(p => (<div key={p.id} className={`p-4 border-2 rounded-xl flex flex-col gap-1 ${darkMode ? "border-white bg-[#333]" : "border-black bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"}`}><span className="text-xs font-bold uppercase opacity-70">{p.name}</span><span className={`text-lg font-mono font-black ${p.net > 0 ? (darkMode ? "text-green-400" : "text-green-600") : p.net < 0 ? (darkMode ? "text-red-400" : "text-red-600") : "opacity-50"}`}>{p.net > 0 ? "+" : ""}{p.net.toFixed(2)}</span></div>))}</div>
                                <div className={`rounded-xl border-2 overflow-hidden ${darkMode ? "bg-[#121212] border-white" : "bg-white border-black"}`}>
                                    <div className={`p-4 flex justify-between items-center border-b-2 ${darkMode ? "bg-white/10 border-white/20" : "bg-gray-100 border-black/10"}`}><span className={`text-[10px] uppercase tracking-widest font-black opacity-60 ${darkMode ? "text-white" : "text-black"}`}>Senarai Transfer</span>{txs.length > 0 && (<button onClick={() => {const text = txs.map(t => `${t.fromName} -> ${t.toName}: RM${t.amount.toFixed(2)} ${paidStatus[`${t.fromId}-${t.toId}`] ? '✅' : '❌'}`).join("\n");navigator.clipboard.writeText(`*SplitIt. by kmlxly*\n\n${text}\n\n*Settled? Use SplitIt.*`);setCopied(true); setTimeout(() => setCopied(false), 2000);}} className={`text-[10px] font-bold flex items-center gap-1 px-2 py-1 border-2 rounded hover:translate-x-[1px] hover:translate-y-[1px] transition-all ${darkMode ? "border-white hover:bg-white hover:text-black" : "border-black hover:bg-black hover:text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none"}`}>{copied ? <Check size={12}/> : <Copy size={12}/>} {copied ? "COPIED!" : "COPY ALL"}</button>)}</div>
                                    {txs.length === 0 ? (<div className="flex flex-col items-center justify-center py-8 opacity-50 gap-2"><CheckCircle size={24}/><p className="text-xs font-bold uppercase">Semua setel! Tiada hutang.</p></div>) : (<div className="divide-y-2 divide-current divide-dashed divide-opacity-10">{txs.map((t, i) => {const isPaid = paidStatus[`${t.fromId}-${t.toId}`];return (<div key={i} className={`flex justify-between items-center font-mono text-sm p-4 transition-colors ${isPaid ? (darkMode ? "bg-green-900/20" : "bg-green-100") : ""}`}><div className="flex flex-col gap-1"><div className="flex items-center gap-2 font-bold"><span className={isPaid ? "opacity-50 line-through decoration-2" : (darkMode ? "text-red-400" : "text-red-600")}>{t.fromName}</span><ArrowRight size={14} className="opacity-50"/><span className={isPaid ? "opacity-50" : (darkMode ? "text-green-400" : "text-green-600")}>{t.toName}</span></div><div className="flex items-center gap-2"><span className={`text-[10px] px-1.5 py-0.5 rounded border border-current opacity-70 ${isPaid ? "text-green-600 border-green-600" : ""}`}>{isPaid ? "PAID" : "UNPAID"}</span><span className="text-[10px] opacity-50">RM{t.amount.toFixed(2)}</span></div></div><button onClick={() => {setActiveTransfer(t); setShowPayModal(true)}} className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg border-2 flex items-center gap-2 transition-all ${isPaid ? (darkMode ? "bg-transparent border-green-500 text-green-500 hover:bg-green-500/20" : "bg-white border-green-600 text-green-600 hover:bg-green-50") : (darkMode ? "bg-white text-black hover:bg-green-400" : "bg-black text-white hover:bg-green-500 hover:border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px]")}`}>{isPaid ? <Check size={12}/> : <CreditCard size={12}/>} {isPaid ? "DONE" : "BAYAR"}</button></div>)})}</div>)}
                                </div>
                            </div>
                        </section>
                    )}
                    <div className="pt-8 pb-4 text-center"><div className="opacity-40"><p className="text-[10px] font-black uppercase tracking-widest">SplitIt. by kmlxly</p><p className="text-[9px] font-mono mt-1">v2.3.2 (UI Hotfix)</p></div></div>
                </div>
            )}

            {/* FORM VIEW */}
            {mode === "FORM" && (
                <div className="flex flex-col h-full animate-in slide-in-from-right duration-300">
                    <div className="flex items-center gap-4 mb-8">
                        <button onClick={resetForm} className={`p-3 rounded-xl ${buttonBase} ${darkMode ? "bg-[#333]" : "bg-white"}`}><ArrowRight size={20} className="rotate-180"/></button>
                        <h2 className="text-2xl font-black uppercase tracking-tight">{editingBillId ? "Kemaskini Bill" : "Tambah Bill Baru"}</h2>
                    </div>

                    <div className={`flex-1 space-y-8 overflow-y-auto pb-6 px-1 ${darkMode ? "scrollbar-thumb-white" : "scrollbar-thumb-black"} scrollbar-thin`}>
                        <div className={`${cardStyle} p-5 space-y-5 ${darkMode ? "bg-[#1E1E1E]" : "bg-white"} ${shadowStyle}`}>
                            <div className="space-y-2"><label className="text-xs uppercase font-black tracking-wider opacity-70">Nama Kedai</label><input value={billTitle} onChange={e => setBillTitle(e.target.value)} placeholder="Contoh: Mamak Bistro" className={inputStyle}/></div>
                            <div className="space-y-2"><label className="text-xs uppercase font-black tracking-wider opacity-70">Total Resit (RM)</label><input type="number" value={billTotal} onChange={e => setBillTotal(e.target.value)} placeholder="0.00" className={`${inputStyle} text-2xl font-black font-mono`}/></div>
                            <div className="space-y-2"><label className="text-xs uppercase font-black tracking-wider opacity-70">Tukang Bayar</label><div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">{people.map(p => (<button key={p.id} onClick={() => setPayerId(p.id)} className={`px-4 py-3 rounded-xl text-sm font-bold border-2 whitespace-nowrap transition-all ${payerId === p.id ? (darkMode ? "bg-white text-black border-white shadow-[2px_2px_0px_0px_#ffffff50]" : "bg-black text-white border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] translate-x-[-2px] translate-y-[-2px]") : (darkMode ? "border-[#444] text-gray-400 hover:border-white" : "border-gray-300 text-gray-500 hover:border-black hover:text-black hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]")}`}>{p.name}</button>))}</div></div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                             <button onClick={() => setBillType("EQUAL")} className={`p-4 rounded-xl border-2 text-sm font-black uppercase tracking-wider transition-all flex flex-col items-center gap-2 ${billType === "EQUAL" ? (darkMode ? "border-green-400 bg-green-400/20 text-green-400" : "border-black bg-green-300 text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] translate-x-[-2px] translate-y-[-2px]") : (darkMode ? "border-[#444] opacity-50 hover:opacity-100" : "border-black bg-white opacity-50 hover:opacity-100 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]")}`}><span className="text-2xl">🍰</span> KONGSI RATA</button>
                             <button onClick={() => setBillType("ITEMIZED")} className={`p-4 rounded-xl border-2 text-sm font-black uppercase tracking-wider transition-all flex flex-col items-center gap-2 ${billType === "ITEMIZED" ? (darkMode ? "border-blue-400 bg-blue-400/20 text-blue-400" : "border-black bg-blue-300 text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] translate-x-[-2px] translate-y-[-2px]") : (darkMode ? "border-[#444] opacity-50 hover:opacity-100" : "border-black bg-white opacity-50 hover:opacity-100 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]")}`}><span className="text-2xl">🧾</span> SPLIT ITEM</button>
                        </div>

                        {billType === "ITEMIZED" && (
                            <div className="space-y-6 animate-in fade-in">
                                <div className={`${cardStyle} p-5 space-y-4 ${darkMode ? "bg-[#1E1E1E]" : "bg-white"} ${shadowStyle} overflow-hidden transition-all duration-300`}>
                                    <p className="text-xs uppercase font-black tracking-wider opacity-70 mb-2 flex items-center gap-2"><ShoppingBag size={14}/> Tambah Menu / Makanan</p>
                                    <div className="flex gap-2">
                                        <input value={newItemName} onChange={e => setNewItemName(e.target.value)} placeholder="Nama Item (cth: Siakap)" className={`flex-[2] ${inputStyle} text-sm`}/>
                                        <div className="flex-1 relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold opacity-50">RM</span><input type="number" value={newItemPrice} onChange={e => setNewItemPrice(e.target.value)} placeholder="0.00" className={`${inputStyle} pl-8 text-sm`}/></div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="flex items-center gap-2 text-xs font-bold cursor-pointer opacity-70 hover:opacity-100 w-fit"><input type="checkbox" checked={isMultiSelectMode} onChange={toggleMultiSelect} className="accent-blue-500 w-4 h-4"/>Kongsi item ni? (Split ramai-ramai)</label>
                                        {isMultiSelectMode && (<div className="animate-in slide-in-from-top-2 text-[10px] p-2 rounded bg-blue-500/10 text-blue-500 font-bold border border-blue-500/20 mb-2"><Info size={12} className="inline mr-1 mb-[2px]"/>Harga akan dibahagi sama rata kepada semua yang dipilih.</div>)}
                                        <div className={`flex gap-2 pb-2 ${isMultiSelectMode ? "flex-wrap" : "overflow-x-auto scrollbar-none"}`}>
                                            {people.map(p => {
                                                const isSelected = newItemSharedBy.includes(p.id);
                                                return (
                                                    <button key={p.id} onClick={() => selectPersonForMenu(p.id)} className={`px-4 py-2 rounded-lg text-xs font-bold border-2 whitespace-nowrap transition-all flex items-center gap-1 
                                                        ${isSelected 
                                                            ? (darkMode ? "bg-blue-400 text-black border-blue-400" : "bg-blue-500 text-white border-blue-500 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] translate-x-[-1px] translate-y-[-1px]") 
                                                            : (darkMode ? "border-[#444] text-gray-400 hover:border-white" : "border-gray-200 text-gray-400 hover:border-black")}`}>
                                                        {isMultiSelectMode ? (isSelected ? <Check size={12}/> : <div className="w-3 h-3 rounded-sm border border-current opacity-50"/>) : <User size={12}/>}
                                                        <span className={isSelected ? (darkMode ? "text-black" : "text-white") : ""}>{p.name}</span>
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>
                                    <button disabled={!newItemName || !newItemPrice || newItemSharedBy.length === 0} onClick={addMenuItem} className={`w-full py-3 rounded-xl text-xs font-black uppercase tracking-wider border-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${darkMode ? "bg-white text-black border-white hover:bg-gray-200" : "bg-black text-white border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]"}`}>+ Tambah Item</button>
                                </div>

                                {menuItems.length > 0 && (
                                    <div className="space-y-2">
                                        {menuItems.map((item) => (
                                            <div key={item.id} className={`p-3 border-2 rounded-xl flex justify-between items-center ${darkMode ? "bg-[#222] border-white/20" : "bg-white border-black/10"}`}>
                                                <div className="flex-1">
                                                    <div className="flex justify-between items-start"><span className="font-bold text-sm">{item.name}</span><span className="font-mono font-black">RM{item.price.toFixed(2)}</span></div>
                                                    {/* THE FIX: Updated styling for name badges below item */}
                                                    <div className="text-[10px] font-bold mt-2 flex flex-wrap gap-1">
                                                        {item.sharedBy.map(pid => (
                                                            <span key={pid} className={`px-2 py-0.5 rounded border ${darkMode ? "bg-blue-900/40 border-blue-400 text-blue-300" : "bg-blue-100 border-blue-600 text-blue-800"}`}>
                                                                {people.find(p=>p.id===pid)?.name}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                                <button onClick={() => removeMenuItem(item.id)} className="ml-3 p-2 text-red-500 hover:bg-red-500/10 rounded-lg"><Trash2 size={14}/></button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className={`${cardStyle} p-5 space-y-6 ${darkMode ? "bg-[#1E1E1E]" : "bg-violet-100"} ${shadowStyle}`}>
                                    <div className="flex gap-4">
                                        <div className="flex-1 space-y-2"><label className="text-xs uppercase font-black opacity-70 flex items-center gap-2"><Bike size={16}/> Caj Tetap</label><input type="number" placeholder="0.00" value={miscFee} onChange={e => setMiscFee(e.target.value)} className={`${inputStyle} font-mono`}/></div>
                                        <div className="flex-1 space-y-2"><label className="text-xs uppercase font-black opacity-70 flex items-center gap-2"><Tag size={16}/> Diskaun</label><input type="number" placeholder="0.00" value={discountFee} onChange={e => setDiscountFee(e.target.value)} className={`${inputStyle} font-mono ${darkMode ? "focus:border-green-400" : "focus:border-green-500"}`}/></div>
                                    </div>
                                </div>

                                <div className={`p-5 border-2 rounded-xl ${shadowStyle} ${taxGap > 0.05 ? (darkMode ? "border-blue-400 bg-blue-400/10" : "border-black bg-blue-200") : taxGap < -0.05 ? (darkMode ? "border-red-400 bg-red-400/10" : "border-black bg-red-200") : (darkMode ? "border-green-400 bg-green-400/10" : "border-black bg-green-200")}`}>
                                    <div className="flex justify-between items-center mb-3"><span className="text-xs uppercase font-black tracking-widest flex items-center gap-2">{taxGap > 0.05 ? <AlertCircle size={16}/> : taxGap < -0.05 ? <X size={16}/> : <CheckCircle size={16}/>}{taxGap > 0.05 ? "BAKI (TAX/SERVIS)" : taxGap < -0.05 ? "TERLEBIH KIRA!" : "NGAM-NGAM!"}</span><span className="font-mono font-black text-xl">{taxGap < 0 ? "-" : ""}RM{Math.abs(taxGap).toFixed(2)}</span></div>
                                    {(taxGap > 0.05 || parseFloat(discountFee) > 0) && (
                                        <div className={`space-y-3 mt-4 pt-4 border-t-2 border-current ${darkMode ? "border-opacity-30" : "border-black"}`}>
                                            {taxGap > 0.05 && (<div className="flex items-center justify-between"><span className="text-xs font-bold opacity-70">Cara Agih Tax:</span><div className="flex gap-2"><button onClick={() => setTaxMethod("PROPORTIONAL")} className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border-2 transition-all ${taxMethod === "PROPORTIONAL" ? (darkMode ? "bg-blue-400 text-black border-blue-400" : "bg-black text-white border-black shadow-[2px_2px_0px_0px_#000]") : "border-current opacity-50 hover:opacity-100"}`}>% MAKAN</button><button onClick={() => setTaxMethod("EQUAL_SPLIT")} className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border-2 transition-all ${taxMethod === "EQUAL_SPLIT" ? (darkMode ? "bg-blue-400 text-black border-blue-400" : "bg-black text-white border-black shadow-[2px_2px_0px_0px_#000]") : "border-current opacity-50 hover:opacity-100"}`}>SAMA RATA</button></div></div>)}
                                            {parseFloat(discountFee) > 0 && (<div className="flex items-center justify-between"><span className="text-xs font-bold opacity-70">Cara Agih Diskaun:</span><div className="flex gap-2"><button onClick={() => setDiscountMethod("PROPORTIONAL")} className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border-2 transition-all ${discountMethod === "PROPORTIONAL" ? (darkMode ? "bg-green-400 text-black border-green-400" : "bg-black text-white border-black shadow-[2px_2px_0px_0px_#000]") : "border-current opacity-50 hover:opacity-100"}`}>% MAKAN</button><button onClick={() => setDiscountMethod("EQUAL_SPLIT")} className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border-2 transition-all ${discountMethod === "EQUAL_SPLIT" ? (darkMode ? "bg-green-400 text-black border-green-400" : "bg-black text-white border-black shadow-[2px_2px_0px_0px_#000]") : "border-current opacity-50 hover:opacity-100"}`}>SAMA RATA</button></div></div>)}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                    <button disabled={!billTitle || !billTotal || (billType === "ITEMIZED" && taxGap < -0.1)} onClick={saveBill} className={`w-full py-5 rounded-xl text-sm font-black uppercase tracking-widest border-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none ${darkMode ? "bg-white text-black border-white hover:bg-gray-200" : "bg-lime-300 text-black border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px]"}`}>{editingBillId ? "KEMASKINI BILL SEKARANG" : "SIMPAN BILL NI"}</button>
                </div>
            )}
            
            {showPaymentModal && paymentProfileId && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                    <div className={`w-full max-w-[320px] p-5 rounded-2xl border-2 ${darkMode ? "bg-[#1E1E1E] border-white text-white" : "bg-white border-black text-black"} ${shadowStyle} relative animate-in slide-in-from-bottom-10`}>
                        <button onClick={() => setShowPaymentModal(false)} className="absolute top-3 right-3 opacity-50 hover:opacity-100"><X size={20}/></button>
                        <h3 className="text-lg font-black uppercase mb-4 flex items-center gap-2"><Wallet size={20}/> Payment Profile</h3>
                        <div className="space-y-4">
                            <div className="space-y-2"><label className="text-[10px] font-bold uppercase opacity-70">Nama Bank / E-Wallet</label><input placeholder="Maybank / TNG" value={people.find(p=>p.id===paymentProfileId)?.bankName || ""} onChange={e => updatePaymentProfile(paymentProfileId, e.target.value, people.find(p=>p.id===paymentProfileId)?.bankAccount || "", people.find(p=>p.id===paymentProfileId)?.qrImage || "")} className={inputStyle}/></div>
                            <div className="space-y-2"><label className="text-[10px] font-bold uppercase opacity-70">No. Akaun</label><input placeholder="1234567890" value={people.find(p=>p.id===paymentProfileId)?.bankAccount || ""} onChange={e => updatePaymentProfile(paymentProfileId, people.find(p=>p.id===paymentProfileId)?.bankName || "", e.target.value, people.find(p=>p.id===paymentProfileId)?.qrImage || "")} className={`${inputStyle} font-mono`}/></div>
                            <div className="space-y-2 pt-2 border-t border-dashed border-current border-opacity-30">
                                <label className="text-[10px] font-bold uppercase opacity-70 block mb-2">DuitNow QR (Optional)</label>
                                <div className={`flex items-start gap-2 p-3 rounded-lg text-[10px] font-bold mb-3 ${darkMode ? "bg-yellow-900/30 text-yellow-200" : "bg-yellow-100 text-yellow-800"}`}><Info size={14} className="flex-shrink-0 mt-[1px]"/><p>Tips: Crop gambar QR code jadi petak (Square) sebelum upload supaya QR dapat dibaca tanpa masalah.</p></div>
                                <div className="flex items-center gap-3">
                                    {people.find(p=>p.id===paymentProfileId)?.qrImage ? (<div className="relative w-16 h-16 border-2 border-current rounded-lg overflow-hidden group"><img src={people.find(p=>p.id===paymentProfileId)?.qrImage!} className="w-full h-full object-cover" alt="QR"/><button onClick={() => updatePaymentProfile(paymentProfileId, people.find(p=>p.id===paymentProfileId)?.bankName || "", people.find(p=>p.id===paymentProfileId)?.bankAccount || "", "")} className="absolute inset-0 bg-red-500/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"><Trash2 size={16} className="text-white"/></button></div>) : (<div className="w-16 h-16 border-2 border-dashed border-current rounded-lg flex items-center justify-center opacity-30"><QrCode size={20}/></div>)}<label className={`flex-1 py-3 px-4 border-2 rounded-xl flex items-center justify-center gap-2 cursor-pointer font-bold uppercase text-[10px] hover:opacity-80 ${darkMode ? "bg-white text-black" : "bg-black text-white"}`}><Upload size={14}/> Upload Image<input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, paymentProfileId)}/></label>
                                </div>
                            </div>
                        </div>
                        <button onClick={() => setShowPaymentModal(false)} className={`w-full py-3 mt-5 text-sm font-black uppercase rounded-xl border-2 ${darkMode ? "bg-green-400 text-black border-green-400" : "bg-green-400 text-black border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px]"}`}>SIMPAN PROFILE</button>
                    </div>
                </div>
            )}

            {showPayModal && activeTransfer && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
                    <div className={`w-full max-w-[340px] max-h-[85vh] flex flex-col rounded-2xl overflow-hidden ${darkMode ? "bg-[#1E1E1E] text-white" : "bg-white text-black"} shadow-2xl relative animate-in zoom-in-95`}>
                         <div className="p-4 flex-shrink-0 flex justify-between items-center border-b border-current border-opacity-10"><span className="text-[10px] font-black uppercase tracking-widest opacity-50">SIAP UNTUK SHARE</span><button onClick={() => setShowPayModal(false)}><X size={20} className="opacity-50 hover:opacity-100"/></button></div>
                         <div className={`flex-1 overflow-y-auto p-6 flex flex-col items-center ${darkMode ? "bg-[#111]" : "bg-gray-200"}`}>
                            <div ref={receiptRef} className={`w-full bg-white text-black p-5 rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden`}>
                                <div className="absolute top-[-10px] left-1/2 -translate-x-1/2 w-4 h-4 bg-black rounded-full"></div>
                                <div className="text-center border-b-2 border-dashed border-black/20 pb-4 mb-4"><p className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-1">TOTAL BAYARAN</p><h2 className="text-3xl font-black font-mono">RM{activeTransfer.amount.toFixed(2)}</h2></div>
                                <div className="text-center mb-4"><p className="text-[9px] font-bold opacity-40 uppercase mb-1">KEPADA</p><h3 className="text-xl font-black uppercase leading-none mb-2">{activeTransfer.toName}</h3><p className="text-[9px] font-bold opacity-40 uppercase">{people.find(p=>p.id===activeTransfer.toId)?.bankName || "Unknown Bank"}</p></div>
                                {people.find(p=>p.id===activeTransfer.toId)?.qrImage ? (<div className="w-32 h-32 mx-auto border-2 border-black rounded-lg overflow-hidden mb-4"><img src={people.find(p=>p.id===activeTransfer.toId)?.qrImage!} className="w-full h-full object-cover bg-white" alt="QR"/></div>) : (<div className="w-full py-4 border-2 border-dashed border-black/20 rounded-lg flex flex-col items-center justify-center opacity-30 mb-4"><QrCode size={24}/><span className="text-[8px] font-bold mt-1">NO QR</span></div>)}
                                <div className="bg-gray-100 p-2 rounded border border-black/10 text-center"><p className="text-[8px] font-bold uppercase opacity-40 mb-1">NO AKAUN</p><p className="font-mono font-black text-sm tracking-wider">{people.find(p=>p.id===activeTransfer.toId)?.bankAccount || "Ask Member"}</p></div>
                                <div className="mt-4 pt-2 border-t-2 border-black/10 flex justify-between items-center opacity-40"><span className="text-[8px] font-bold tracking-widest">SPLITIT.</span><span className="text-[8px] font-mono">{new Date().toLocaleDateString()}</span></div>
                            </div>
                         </div>
                         <div className={`p-4 flex-shrink-0 space-y-3 border-t-2 ${darkMode ? "bg-black border-white/20" : "bg-white border-black/10"}`}>
                             <button onClick={handleOpenImage} disabled={isSharing} className={`w-full py-3 text-xs font-bold uppercase rounded-xl border-2 flex items-center justify-center gap-2 ${darkMode ? "border-white hover:bg-white hover:text-black" : "border-black hover:bg-gray-100"}`}>{isSharing ? <RotateCcw size={14} className="animate-spin"/> : <ExternalLink size={14}/>} {isSharing ? "GENERATING..." : "BUKA GAMBAR RESIT"}</button>
                             <button onClick={() => {togglePaymentStatus(activeTransfer.fromId, activeTransfer.toId); setShowPayModal(false);}} className={`w-full py-3 text-xs font-black uppercase rounded-xl transition-all shadow-lg hover:shadow-none hover:translate-y-[2px] ${paidStatus[`${activeTransfer.fromId}-${activeTransfer.toId}`] ? "bg-red-500 text-white" : "bg-green-500 text-black"}`}>{paidStatus[`${activeTransfer.fromId}-${activeTransfer.toId}`] ? "BATAL / MARK UNPAID" : "✅ DAH TRANSFER"}</button>
                         </div>
                    </div>
                </div>
            )}

            {showSessionModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
                    <div className={`w-full max-w-[340px] p-6 rounded-2xl border-2 ${darkMode ? "bg-[#1E1E1E] border-white text-white" : "bg-white border-black text-black"} ${shadowStyle} relative`}>
                        <button onClick={() => setShowSessionModal(false)} className="absolute top-4 right-4 opacity-50 hover:opacity-100"><X size={20}/></button>
                        <h2 className="text-xl font-black uppercase mb-6 flex items-center gap-2"><Folder size={24}/> Pilih Sesi</h2>
                        <div className="space-y-3 max-h-[300px] overflow-y-auto mb-6 pr-1">
                            {sessions.map(s => (
                                <div key={s.id} className={`p-4 rounded-xl border-2 flex items-center justify-between transition-all ${activeSessionId === s.id ? (darkMode ? "border-green-400 bg-green-900/20" : "border-black bg-green-100") : "border-transparent bg-current bg-opacity-5 hover:border-current"}`}>
                                    {editingSessionId === s.id ? (<div className="flex-1 flex gap-2"><input autoFocus value={tempSessionName} onChange={e => setTempSessionName(e.target.value)} onKeyDown={e => e.key === "Enter" && saveRenameSession()} className={`flex-1 bg-transparent border-b-2 outline-none font-bold text-sm ${darkMode ? "border-white" : "border-black"}`}/><button onClick={saveRenameSession} className="p-1 text-green-500 hover:scale-110 transition"><Save size={16}/></button></div>) : (<div onClick={() => {setActiveSessionId(s.id); setShowSessionModal(false);}} className="flex-1 cursor-pointer"><h3 className="font-bold text-sm">{s.name}</h3><p className="text-[10px] opacity-50">{new Date(s.createdAt).toLocaleDateString()}</p></div>)}
                                    <div className="flex items-center gap-1 pl-2">{activeSessionId === s.id && !editingSessionId && <CheckCircle size={16} className="text-green-500 mr-1"/>}{!editingSessionId && (<><button onClick={() => startRenameSession(s)} className="p-2 opacity-50 hover:opacity-100 hover:text-blue-500 transition"><Edit3 size={14}/></button>{sessions.length > 1 && (<button onClick={() => deleteSession(s.id)} className="p-2 opacity-50 hover:opacity-100 hover:text-red-500 transition"><Trash2 size={14}/></button>)}</>)}</div>
                                </div>
                            ))}
                        </div>
                        <div className="pt-6 border-t border-dashed border-current border-opacity-30"><label className="text-[10px] font-bold uppercase opacity-70 block mb-2">Buka Sesi Baru</label><div className="flex gap-2"><input value={newSessionName} onChange={e => setNewSessionName(e.target.value)} placeholder="Contoh: Trip Hatyai" className={`flex-1 px-3 py-2 rounded-lg bg-transparent border-2 outline-none text-sm font-bold ${darkMode ? "border-white/30 focus:border-white" : "border-black/30 focus:border-black"}`}/><button onClick={createNewSession} disabled={!newSessionName} className={`px-4 py-2 rounded-lg border-2 font-bold text-sm ${darkMode ? "bg-white text-black border-white" : "bg-black text-white border-black"} disabled:opacity-50`}>OK</button></div></div>
                    </div>
                </div>
            )}
        </main>
      </div>
    </div>
  );
}