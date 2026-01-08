"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import html2canvas from "html2canvas";
import { 
  Moon, Sun, CheckCircle, Trash2, 
  Edit3, Copy, Check, Bike, Tag, RotateCcw, Plus, X, 
  ChevronDown, ChevronUp, Receipt, Users, AlertCircle, 
  CreditCard, QrCode, Upload, Wallet, Share2, ArrowRight
} from "lucide-react";

// --- TYPES ---
type Person = { 
  id: string; name: string; 
  bankName?: string; bankAccount?: string; qrImage?: string; 
};
type BillType = "EQUAL" | "ITEMIZED";
type SplitMethod = "PROPORTIONAL" | "EQUAL_SPLIT";
type BillDetail = { personId: string; base: number; tax: number; misc: number; discount: number; total: number; };
type Bill = {
  id: string; title: string; type: BillType; totalAmount: number; paidBy: string;
  details: BillDetail[]; itemsSubtotal: number; miscAmount: number; discountAmount: number;
  taxMethod: SplitMethod; discountMethod: SplitMethod;
};
type Transfer = { fromId: string; toId: string; fromName: string; toName: string; amount: number; };

export default function SplitBillBrutalV2() {
  // --- STATE ---
  const [darkMode, setDarkMode] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  
  const [people, setPeople] = useState<Person[]>([{ id: "p1", name: "Aku" }, { id: "p2", name: "Member 1" }]);
  const [bills, setBills] = useState<Bill[]>([]);
  
  const [paidStatus, setPaidStatus] = useState<Record<string, boolean>>({});

  // UI States
  const [newPersonName, setNewPersonName] = useState("");
  const [editingPersonId, setEditingPersonId] = useState<string | null>(null);
  const [expandedBillId, setExpandedBillId] = useState<string | null>(null); 
  const [copied, setCopied] = useState(false);
  const [mode, setMode] = useState<"DASHBOARD" | "FORM">("DASHBOARD");
  
  // Modals
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentProfileId, setPaymentProfileId] = useState<string | null>(null);
  const [showPayModal, setShowPayModal] = useState(false);
  const [activeTransfer, setActiveTransfer] = useState<Transfer | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  
  // Ref for Receipt Card
  const receiptRef = useRef<HTMLDivElement>(null);

  // Form Inputs
  const [editingBillId, setEditingBillId] = useState<string | null>(null);
  const [billType, setBillType] = useState<BillType>("EQUAL");
  const [billTitle, setBillTitle] = useState("");
  const [billTotal, setBillTotal] = useState(""); 
  const [miscFee, setMiscFee] = useState(""); 
  const [discountFee, setDiscountFee] = useState(""); 
  const [payerId, setPayerId] = useState("p1");
  const [tempItems, setTempItems] = useState<{ personId: string; amount: number }[]>([]);
  const [taxMethod, setTaxMethod] = useState<SplitMethod>("PROPORTIONAL");
  const [discountMethod, setDiscountMethod] = useState<SplitMethod>("PROPORTIONAL");

  // --- STORAGE & INIT ---
  useEffect(() => {
    const savedPeople = localStorage.getItem("splitit_people");
    const savedBills = localStorage.getItem("splitit_bills");
    const savedMode = localStorage.getItem("splitit_darkmode");
    const savedStatus = localStorage.getItem("splitit_paid_status");

    if (savedPeople) setPeople(JSON.parse(savedPeople));
    if (savedBills) setBills(JSON.parse(savedBills));
    if (savedMode) setDarkMode(savedMode === "true");
    if (savedStatus) setPaidStatus(JSON.parse(savedStatus));
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
        localStorage.setItem("splitit_people", JSON.stringify(people));
        localStorage.setItem("splitit_bills", JSON.stringify(bills));
        localStorage.setItem("splitit_darkmode", String(darkMode));
        localStorage.setItem("splitit_paid_status", JSON.stringify(paidStatus));
    }
  }, [people, bills, darkMode, paidStatus, isLoaded]);

  // --- LOGIC FUNCTIONS ---
  const addPerson = () => {
    if (!newPersonName.trim()) return;
    setPeople([...people, { id: `p${Date.now()}`, name: newPersonName }]);
    setNewPersonName("");
  };
  const updatePersonName = (id: string, newName: string) => {
    setPeople(people.map(p => p.id === id ? { ...p, name: newName } : p));
  };
  const updatePaymentProfile = (id: string, bankName: string, acc: string, qr: string) => {
    setPeople(people.map(p => p.id === id ? { ...p, bankName, bankAccount: acc, qrImage: qr } : p));
  };
  const deletePerson = (id: string) => {
    if (bills.some(b => b.paidBy === id || b.details.some(d => d.personId === id))) {
      alert("Member ni ada rekod dalam bill."); return;
    }
    setPeople(people.filter(p => p.id !== id)); setEditingPersonId(null);
  };
  
  const togglePaymentStatus = (fromId: string, toId: string) => {
    const key = `${fromId}-${toId}`;
    setPaidStatus(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const startEditBill = (bill: Bill) => {
    setEditingBillId(bill.id); setBillTitle(bill.title); setBillTotal(String(bill.totalAmount));
    setBillType(bill.type); setPayerId(bill.paidBy);
    setMiscFee(bill.miscAmount > 0 ? String(bill.miscAmount) : "");
    setDiscountFee(bill.discountAmount > 0 ? String(bill.discountAmount) : "");
    setTaxMethod(bill.taxMethod); setDiscountMethod(bill.discountMethod);
    if (bill.type === "ITEMIZED") setTempItems(bill.details.map(d => ({ personId: d.personId, amount: d.base })));
    else setTempItems([]);
    setMode("FORM");
  };
  const resetForm = () => {
    setEditingBillId(null); setBillTitle(""); setBillTotal(""); setBillType("EQUAL");
    setMiscFee(""); setDiscountFee(""); setTempItems([]);
    setTaxMethod("PROPORTIONAL"); setDiscountMethod("PROPORTIONAL"); setMode("DASHBOARD");
  };
  const saveBill = () => {
    if (!billTitle || !billTotal) return;
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
      itemsSubtotal = tempItems.reduce((sum, i) => sum + i.amount, 0);
      const rawTax = grandTotal - (itemsSubtotal + miscTotal) + discountTotal;
      const taxTotal = rawTax > 0.05 ? rawTax : 0;
      const miscPerHead = miscTotal / people.length;

      calculatedDetails = people.map(p => {
        const item = tempItems.find(i => i.personId === p.id);
        const base = item ? item.amount : 0;
        let taxShare = 0;
        if (taxTotal > 0) {
            taxShare = taxMethod === "PROPORTIONAL" && itemsSubtotal > 0 ? (base / itemsSubtotal) * taxTotal : taxTotal / people.length;
        }
        let discountShare = 0;
        if (discountTotal > 0) {
            discountShare = discountMethod === "PROPORTIONAL" && itemsSubtotal > 0 ? (base / itemsSubtotal) * discountTotal : discountTotal / people.length;
        }
        return { personId: p.id, base: base, tax: taxShare, misc: miscPerHead, discount: discountShare, total: base + taxShare + miscPerHead - discountShare };
      });
    }
    const newBill: Bill = {
        id: editingBillId || `b${Date.now()}`, title: billTitle, type: billType, totalAmount: grandTotal, paidBy: payerId, details: calculatedDetails, itemsSubtotal, miscAmount: miscTotal, discountAmount: discountTotal, taxMethod, discountMethod
    };
    if (editingBillId) setBills(bills.map(b => b.id === editingBillId ? newBill : b));
    else setBills([newBill, ...bills]);
    resetForm();
  };
  const deleteBill = (id: string) => { if(confirm("Padam resit ni?")) setBills(bills.filter(b => b.id !== id)); };
  const updateItemAmount = (pid: string, val: string) => {
    const amt = parseFloat(val) || 0; const exist = tempItems.find(i => i.personId === pid);
    if (exist) setTempItems(tempItems.map(i => i.personId === pid ? {...i, amount: amt} : i));
    else setTempItems([...tempItems, { personId: pid, amount: amt }]);
  };
  const getAllocated = () => tempItems.reduce((a, b) => a + b.amount, 0);
  const getCalcStatus = () => {
    const total = parseFloat(billTotal) || 0; const misc = parseFloat(miscFee) || 0; const disc = parseFloat(discountFee) || 0; const items = getAllocated();
    return total - (items + misc - disc);
  };
  
  const calculateSettlement = () => {
    let bal: Record<string, number> = {}; people.forEach(p => bal[p.id] = 0);
    bills.forEach(b => {
        bal[b.paidBy] += b.totalAmount;
        b.details.forEach(d => { bal[d.personId] -= d.total; });
    });
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

  // --- NEW: SHARE AS IMAGE V2 (MOBILE OPTIMIZED) ---
  const handleShareImage = async () => {
    if (!receiptRef.current) return;
    setIsSharing(true);
    
    // Tunggu sekejap untuk pastikan DOM dah sedia/gambar load
    await new Promise(r => setTimeout(r, 300));

    try {
        const canvas = await html2canvas(receiptRef.current, {
            // Gunakan warna background "container" supaya nampak macam card style
            backgroundColor: darkMode ? "#000000" : "#E5E7EB", 
            scale: 2, // Scale 2 cukup untuk mobile, 3 mungkin crash kat phone low-ram
            useCORS: true,
            logging: false,
        });
        
        canvas.toBlob(async (blob) => {
            if (blob) {
                const file = new File([blob], `resit-${activeTransfer?.toName || 'splitit'}.png`, { type: "image/png" });
                
                // Cuba Native Share (Mobile)
                if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                    try {
                        await navigator.share({
                            files: [file],
                            // title/text kadang-kadang browser ignore bila ada file, tapi letak je
                            title: 'SplitIt Receipt', 
                            text: `Bayaran kepada ${activeTransfer?.toName}`,
                        });
                    } catch (error) {
                        console.log("Share user cancelled or failed", error);
                    }
                } else {
                    // Fallback Desktop
                    const link = document.createElement('a');
                    link.href = canvas.toDataURL();
                    link.download = `resit-${activeTransfer?.toName}.png`;
                    link.click();
                    alert("Gambar resit disimpan ke Gallery/Download!");
                }
            }
            setIsSharing(false);
        }, "image/png", 0.9); // Quality 90%
    } catch (err) {
        console.error("Failed to generate image", err);
        alert("Gagal generate gambar. Sila cuba screenshot manual.");
        setIsSharing(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, pid: string) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1000000) { alert("File besar sangat bos! Sila guna gambar < 1MB."); return; }
      const reader = new FileReader();
      reader.onloadend = () => {
        const p = people.find(per => per.id === pid);
        if(p) updatePaymentProfile(pid, p.bankName || "", p.bankAccount || "", reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // --- BRUTAL STYLES ---
  const bgStyle = darkMode ? "bg-black text-white" : "bg-gray-200 text-black";
  const cardStyle = `${darkMode ? "bg-[#1E1E1E] border-white" : "bg-white border-black"} border-2 rounded-2xl`;
  const shadowStyle = darkMode ? "" : "shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]";
  const buttonBase = `border-2 font-bold rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 ${darkMode ? "border-white hover:bg-white hover:text-black" : "border-black hover:bg-black hover:text-white"} ${shadowStyle} hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]`;
  const inputStyle = `w-full p-3 rounded-xl bg-transparent border-2 outline-none font-bold transition-all focus:ring-0 ${darkMode ? "border-white focus:border-lime-300 placeholder:text-white/50" : "border-black focus:border-blue-500 placeholder:text-black/50"}`;

  // --- RENDER ---
  if (!isLoaded) return <div className="min-h-screen bg-gray-200"/>;

  return (
    <div className={`min-h-screen font-sans transition-colors duration-300 ${bgStyle}`}>
      <div className="max-w-md mx-auto min-h-screen flex flex-col relative overflow-hidden">
        
        {/* HEADER */}
        <header className={`p-6 border-b-2 relative z-10 ${darkMode ? "border-white bg-black" : "border-black bg-gray-200"}`}>
            <div className="flex justify-between items-center">
                <a href="/" className="flex items-center gap-3 cursor-pointer group">
                     <div className={`w-12 h-12 border-2 ${darkMode ? "border-white" : "border-black"} rounded-xl flex items-center justify-center overflow-hidden bg-white/10 backdrop-blur group-hover:scale-105 transition-transform`}>
                        <Image src="/icon.png" width={40} height={40} alt="Logo" className="object-cover"/>
                     </div>
                     <div>
                        <h1 className="text-2xl font-black tracking-tight leading-none uppercase group-hover:underline decoration-2 underline-offset-2">SplitIt.</h1>
                        <p className="text-[10px] uppercase tracking-widest font-bold mt-1 opacity-70">by kmlxly</p>
                     </div>
                </a>
                <button onClick={() => setDarkMode(!darkMode)} className={`p-2 ${buttonBase}`}>
                    {darkMode ? <Sun size={20}/> : <Moon size={20}/>}
                </button>
            </div>
        </header>

        <main className="flex-1 p-6 flex flex-col gap-8 relative z-10">
            
            {/* VIEW: DASHBOARD */}
            {mode === "DASHBOARD" && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    
                    {/* SECTION: GENG LEPAK */}
                    <section className={`${cardStyle} p-5 ${darkMode ? "" : "bg-violet-100"} ${shadowStyle}`}>
                        <div className="flex items-center justify-between mb-4">
                             <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2"><Users size={16}/> Geng Lepak</h2>
                        </div>
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
                                        <div className="flex gap-1">
                                            <button onClick={() => setEditingPersonId(p.id)} className={`group relative px-6 py-2 text-sm font-bold border-2 rounded-xl transition-all hover:shadow-none overflow-hidden ${darkMode ? "border-white bg-[#333] hover:bg-[#444]" : "border-black bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"}`}>
                                                <span className="block transition-transform duration-300 group-hover:-translate-x-3">{p.name}</span>
                                                <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-10 group-hover:translate-x-[-12px] transition-transform duration-300 ease-out">
                                                    <Edit3 size={16} className="fill-yellow-400 text-black stroke-[2.5px]" />
                                                </div>
                                            </button>
                                            <button onClick={() => {setPaymentProfileId(p.id); setShowPaymentModal(true)}} className={`p-2 border-2 rounded-xl flex items-center justify-center transition-all active:scale-95 ${p.bankAccount ? (darkMode ? "bg-green-400 text-black border-green-400" : "bg-green-400 text-black border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]") : (darkMode ? "border-white/20 text-white/20 hover:border-white hover:text-white" : "border-black/20 text-black/20 hover:border-black hover:text-black")}`}>
                                                <Wallet size={16}/>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                            <div className={`flex items-center border-2 rounded-xl px-3 py-2 ${darkMode ? "border-white bg-[#333]" : "border-black bg-white"}`}>
                                <input value={newPersonName} onChange={e => setNewPersonName(e.target.value)} onKeyDown={e => e.key === "Enter" && addPerson()} placeholder="Tambah..." className={`bg-transparent font-bold outline-none text-sm w-20 ${darkMode ? "placeholder:text-white/50" : "placeholder:text-black/50"}`}/>
                                <button onClick={addPerson} className={`p-1 rounded-full ${darkMode ? "bg-white text-black" : "bg-black text-white"} ml-2 hover:scale-110 transition`}><Plus size={14}/></button>
                            </div>
                        </div>
                    </section>

                    {/* SECTION: BILLS */}
                    <section>
                        <div className="flex items-center justify-between mb-4">
                             <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2"><Receipt size={16}/> Resit / Bill</h2>
                        </div>
                        <div className="space-y-4">
                            {bills.length === 0 ? (
                                <button onClick={() => {resetForm(); setMode("FORM")}} className={`w-full p-8 border-2 border-dashed rounded-2xl text-center opacity-60 hover:opacity-100 hover:border-solid transition flex flex-col items-center gap-2 ${darkMode ? "border-white" : "border-black"}`}>
                                    <Plus size={32} className="mb-2"/>
                                    <p className="text-base font-bold">Tiada rekod. Tambah bill pertama!</p>
                                </button>
                            ) : (
                                <>
                                {bills.map(bill => (
                                    <div key={bill.id} className={`${cardStyle} ${shadowStyle} overflow-hidden transition-all`}>
                                        <div onClick={() => setExpandedBillId(expandedBillId === bill.id ? null : bill.id)} className={`p-5 cursor-pointer flex justify-between items-center ${darkMode ? "hover:bg-[#333]" : "hover:bg-gray-50"}`}>
                                            <div>
                                                <h3 className="font-black text-lg uppercase truncate">{bill.title}</h3>
                                                <div className="flex gap-2 mt-1">
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 border rounded-full ${bill.type === "EQUAL" ? (darkMode ? "border-green-400 text-green-400" : "border-green-600 text-green-700 bg-green-100") : (darkMode ? "border-blue-400 text-blue-400" : "border-blue-600 text-blue-700 bg-blue-100")}`}>{bill.type === "EQUAL" ? "KONGSI RATA" : "SPLIT ITEM"}</span>
                                                    <span className="text-[10px] font-bold opacity-70 self-center">Bayar: {people.find(p=>p.id === bill.paidBy)?.name}</span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-mono font-black text-xl">RM{bill.totalAmount.toFixed(2)}</div>
                                                {expandedBillId === bill.id ? <ChevronUp size={20} className="ml-auto mt-1"/> : <ChevronDown size={20} className="ml-auto mt-1"/>}
                                            </div>
                                        </div>
                                        {expandedBillId === bill.id && (
                                            <div className={`text-sm border-t-2 p-5 space-y-3 ${darkMode ? "border-white bg-[#1a1a1a]" : "border-black bg-gray-50"}`}>
                                                {bill.details.map(d => (
                                                    <div key={d.personId} className="flex justify-between items-center py-2 border-b border-dashed border-current border-opacity-20 last:border-0">
                                                        <span className="font-bold">{people.find(p=>p.id === d.personId)?.name}</span>
                                                        <span className="font-mono font-black text-base">RM{d.total.toFixed(2)}</span>
                                                    </div>
                                                ))}
                                                <div className="flex gap-3 pt-4 mt-2 justify-end">
                                                    <button onClick={() => startEditBill(bill)} className={`px-4 py-2 border-2 rounded-xl text-xs font-bold flex items-center gap-2 ${darkMode ? "border-blue-400 text-blue-400 hover:bg-blue-400 hover:text-black" : "border-blue-600 text-blue-700 bg-blue-50 hover:bg-blue-600 hover:text-white hover:border-black"}`}><Edit3 size={14}/> EDIT</button>
                                                    <button onClick={() => deleteBill(bill.id)} className={`px-4 py-2 border-2 rounded-xl text-xs font-bold flex items-center gap-2 ${darkMode ? "border-red-400 text-red-400 hover:bg-red-400 hover:text-black" : "border-red-600 text-red-700 bg-red-50 hover:bg-red-600 hover:text-white hover:border-black"}`}><Trash2 size={14}/> DELETE</button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                                <button onClick={() => {resetForm(); setMode("FORM")}} className={`w-full py-4 ${buttonBase} ${darkMode ? "bg-[#333]" : "bg-white"} mt-4 text-sm uppercase tracking-wider`}><Plus size={18}/> Tambah Bill Lagi</button>
                                </>
                            )}
                        </div>
                    </section>

                    {/* SECTION: SETTLEMENT PRO MAX */}
                    {bills.length > 0 && (
                        <section className={`${cardStyle} p-6 ${shadowStyle} ${darkMode ? "bg-[#222]" : "bg-lime-200"}`}>
                            <h2 className="text-lg font-black mb-6 flex items-center gap-2 uppercase">
                                <CheckCircle size={24} className={darkMode ? "text-white" : "text-black"}/> Final Settlement
                            </h2>
                            <div className="grid grid-cols-2 gap-3 mb-6">
                                {netPeople.map(p => (
                                    <div key={p.id} className={`p-4 border-2 rounded-xl flex flex-col gap-1 ${darkMode ? "border-white bg-[#333]" : "border-black bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"}`}>
                                        <span className="text-xs font-bold uppercase opacity-70">{p.name}</span>
                                        <span className={`text-lg font-mono font-black ${p.net > 0 ? (darkMode ? "text-green-400" : "text-green-600") : p.net < 0 ? (darkMode ? "text-red-400" : "text-red-600") : "opacity-50"}`}>{p.net > 0 ? "+" : ""}{p.net.toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>

                            <div className={`rounded-xl border-2 overflow-hidden ${darkMode ? "bg-[#121212] border-white" : "bg-white border-black"}`}>
                                <div className={`p-4 flex justify-between items-center border-b-2 ${darkMode ? "bg-white/10 border-white/20" : "bg-gray-100 border-black/10"}`}>
                                    <span className={`text-[10px] uppercase tracking-widest font-black opacity-60 ${darkMode ? "text-white" : "text-black"}`}>Senarai Transfer</span>
                                    {txs.length > 0 && (
                                        <button onClick={() => {
                                            const text = txs.map(t => `${t.fromName} -> ${t.toName}: RM${t.amount.toFixed(2)} ${paidStatus[`${t.fromId}-${t.toId}`] ? '✅' : '❌'}`).join("\n");
                                            navigator.clipboard.writeText(`*SplitIt. by kmlxly*\n\n${text}\n\n*Settled? Use SplitIt.*`);
                                            setCopied(true); setTimeout(() => setCopied(false), 2000);
                                        }} className={`text-[10px] font-bold flex items-center gap-1 px-2 py-1 border-2 rounded hover:translate-x-[1px] hover:translate-y-[1px] transition-all ${darkMode ? "border-white hover:bg-white hover:text-black" : "border-black hover:bg-black hover:text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none"}`}>
                                            {copied ? <Check size={12}/> : <Copy size={12}/>} {copied ? "COPIED!" : "COPY ALL"}
                                        </button>
                                    )}
                                </div>
                                {txs.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-8 opacity-50 gap-2"><CheckCircle size={24}/><p className="text-xs font-bold uppercase">Semua setel! Tiada hutang.</p></div>
                                ) : (
                                    <div className="divide-y-2 divide-current divide-dashed divide-opacity-10">
                                        {txs.map((t, i) => {
                                            const isPaid = paidStatus[`${t.fromId}-${t.toId}`];
                                            return (
                                                <div key={i} className={`flex justify-between items-center font-mono text-sm p-4 transition-colors ${isPaid ? (darkMode ? "bg-green-900/20" : "bg-green-100") : ""}`}>
                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex items-center gap-2 font-bold">
                                                            <span className={isPaid ? "opacity-50 line-through decoration-2" : (darkMode ? "text-red-400" : "text-red-600")}>{t.fromName}</span>
                                                            <ArrowRight size={14} className="opacity-50"/>
                                                            <span className={isPaid ? "opacity-50" : (darkMode ? "text-green-400" : "text-green-600")}>{t.toName}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className={`text-[10px] px-1.5 py-0.5 rounded border border-current opacity-70 ${isPaid ? "text-green-600 border-green-600" : ""}`}>{isPaid ? "PAID" : "UNPAID"}</span>
                                                            <span className="text-[10px] opacity-50">RM{t.amount.toFixed(2)}</span>
                                                        </div>
                                                    </div>
                                                    <button 
                                                        onClick={() => {setActiveTransfer(t); setShowPayModal(true)}}
                                                        className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg border-2 flex items-center gap-2 transition-all ${isPaid 
                                                            ? (darkMode ? "bg-transparent border-green-500 text-green-500 hover:bg-green-500/20" : "bg-white border-green-600 text-green-600 hover:bg-green-50") 
                                                            : (darkMode ? "bg-white text-black hover:bg-green-400" : "bg-black text-white hover:bg-green-500 hover:border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px]")}`}
                                                    >
                                                        {isPaid ? <Check size={12}/> : <CreditCard size={12}/>} {isPaid ? "DONE" : "BAYAR"}
                                                    </button>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        </section>
                    )}

                    {/* FOOTER */}
                    <div className="pt-8 pb-4 text-center">
                        <button onClick={() => { if(confirm("Reset semua data?")) { localStorage.clear(); window.location.reload(); }}} className={`flex items-center gap-2 mx-auto text-xs font-bold px-4 py-2 border-2 rounded-xl hover:bg-red-500 hover:text-white hover:border-black transition mb-4 ${darkMode ? "border-red-400 text-red-400" : "border-red-600 text-red-600"}`}><RotateCcw size={14}/> RESET DATA APP</button>
                        <div className="opacity-40"><p className="text-[10px] font-black uppercase tracking-widest">SplitIt. by kmlxly</p><p className="text-[9px] font-mono mt-1">v1.9.0 (Mobile & Social Ready)</p></div>
                    </div>
                </div>
            )}

            {/* FORM VIEW */}
            {mode === "FORM" && (
                <div className="flex flex-col h-full animate-in slide-in-from-right duration-300">
                    <div className="flex items-center gap-4 mb-8">
                        <button onClick={resetForm} className={`p-3 rounded-xl ${buttonBase} ${darkMode ? "bg-[#333]" : "bg-white"}`}>
                            <ArrowRight size={20} className="rotate-180"/>
                        </button>
                        <h2 className="text-2xl font-black uppercase tracking-tight">{editingBillId ? "Kemaskini Bill" : "Tambah Bill Baru"}</h2>
                    </div>

                    <div className={`flex-1 space-y-8 overflow-y-auto pb-6 px-1 ${darkMode ? "scrollbar-thumb-white" : "scrollbar-thumb-black"} scrollbar-thin`}>
                        {/* BASIC INFO */}
                        <div className={`${cardStyle} p-5 space-y-5 ${darkMode ? "bg-[#1E1E1E]" : "bg-white"} ${shadowStyle}`}>
                            <div className="space-y-2">
                                <label className="text-xs uppercase font-black tracking-wider opacity-70">Nama Kedai</label>
                                <input value={billTitle} onChange={e => setBillTitle(e.target.value)} placeholder="Contoh: Mamak Bistro" className={inputStyle}/>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs uppercase font-black tracking-wider opacity-70">Total Resit (RM)</label>
                                <input type="number" value={billTotal} onChange={e => setBillTotal(e.target.value)} placeholder="0.00" className={`${inputStyle} text-2xl font-black font-mono`}/>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs uppercase font-black tracking-wider opacity-70">Tukang Bayar</label>
                                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                                    {people.map(p => (
                                        <button key={p.id} onClick={() => setPayerId(p.id)} className={`px-4 py-3 rounded-xl text-sm font-bold border-2 whitespace-nowrap transition-all ${payerId === p.id ? (darkMode ? "bg-white text-black border-white shadow-[2px_2px_0px_0px_#ffffff50]" : "bg-black text-white border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] translate-x-[-2px] translate-y-[-2px]") : (darkMode ? "border-[#444] text-gray-400 hover:border-white" : "border-gray-300 text-gray-500 hover:border-black hover:text-black hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]")}`}>
                                            {p.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* MODE SELECTOR */}
                        <div className="grid grid-cols-2 gap-3">
                             <button onClick={() => setBillType("EQUAL")} className={`p-4 rounded-xl border-2 text-sm font-black uppercase tracking-wider transition-all flex flex-col items-center gap-2 ${billType === "EQUAL" ? (darkMode ? "border-green-400 bg-green-400/20 text-green-400" : "border-black bg-green-300 text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] translate-x-[-2px] translate-y-[-2px]") : (darkMode ? "border-[#444] opacity-50 hover:opacity-100" : "border-black bg-white opacity-50 hover:opacity-100 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]")}`}>
                                <span className="text-2xl">🍰</span> KONGSI RATA
                             </button>
                             <button onClick={() => setBillType("ITEMIZED")} className={`p-4 rounded-xl border-2 text-sm font-black uppercase tracking-wider transition-all flex flex-col items-center gap-2 ${billType === "ITEMIZED" ? (darkMode ? "border-blue-400 bg-blue-400/20 text-blue-400" : "border-black bg-blue-300 text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] translate-x-[-2px] translate-y-[-2px]") : (darkMode ? "border-[#444] opacity-50 hover:opacity-100" : "border-black bg-white opacity-50 hover:opacity-100 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]")}`}>
                                <span className="text-2xl">🧾</span> SPLIT ITEM
                             </button>
                        </div>

                        {/* ITEMIZED */}
                        {billType === "ITEMIZED" && (
                            <div className="space-y-6 animate-in fade-in">
                                <div className={`${cardStyle} p-5 space-y-4 ${darkMode ? "bg-[#1E1E1E]" : "bg-white"} ${shadowStyle}`}>
                                    <p className="text-xs uppercase font-black tracking-wider opacity-70 mb-4">Harga Makanan (Subtotal)</p>
                                    {people.map(p => (
                                        <div key={p.id} className="flex items-center gap-4">
                                            <span className="w-24 text-sm font-bold truncate opacity-80">{p.name}</span>
                                            <div className="relative flex-1">
                                                <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold opacity-50`}>RM</span>
                                                <input type="number" placeholder="0.00" value={tempItems.find(i=>i.personId===p.id)?.amount || ""} onChange={e => updateItemAmount(p.id, e.target.value)} className={`${inputStyle} pl-10 font-mono text-lg`}/>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* EXTRAS */}
                                <div className={`${cardStyle} p-5 space-y-6 ${darkMode ? "bg-[#1E1E1E]" : "bg-violet-100"} ${shadowStyle}`}>
                                    <div className="flex gap-4">
                                        <div className="flex-1 space-y-2">
                                            <label className="text-xs uppercase font-black opacity-70 flex items-center gap-2"><Bike size={16}/> Caj Tetap</label>
                                            <input type="number" placeholder="0.00" value={miscFee} onChange={e => setMiscFee(e.target.value)} className={`${inputStyle} font-mono`}/>
                                        </div>
                                        <div className="flex-1 space-y-2">
                                            <label className="text-xs uppercase font-black opacity-70 flex items-center gap-2"><Tag size={16}/> Diskaun</label>
                                            <input type="number" placeholder="0.00" value={discountFee} onChange={e => setDiscountFee(e.target.value)} className={`${inputStyle} font-mono ${darkMode ? "focus:border-green-400" : "focus:border-green-500"}`}/>
                                        </div>
                                    </div>
                                </div>

                                {/* CALC STATUS */}
                                <div className={`p-5 border-2 rounded-xl ${shadowStyle} ${
                                    taxGap > 0.05 ? (darkMode ? "border-blue-400 bg-blue-400/10" : "border-black bg-blue-200") : 
                                    taxGap < -0.05 ? (darkMode ? "border-red-400 bg-red-400/10" : "border-black bg-red-200") : 
                                    (darkMode ? "border-green-400 bg-green-400/10" : "border-black bg-green-200")
                                }`}>
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="text-xs uppercase font-black tracking-widest flex items-center gap-2">
                                            {taxGap > 0.05 ? <AlertCircle size={16}/> : taxGap < -0.05 ? <X size={16}/> : <CheckCircle size={16}/>}
                                            {taxGap > 0.05 ? "BAKI (TAX/SERVIS)" : taxGap < -0.05 ? "TERLEBIH KIRA!" : "NGAM-NGAM!"}
                                        </span>
                                        <span className="font-mono font-black text-xl">{taxGap < 0 ? "-" : ""}RM{Math.abs(taxGap).toFixed(2)}</span>
                                    </div>

                                    {(taxGap > 0.05 || parseFloat(discountFee) > 0) && (
                                        <div className={`space-y-3 mt-4 pt-4 border-t-2 border-current ${darkMode ? "border-opacity-30" : "border-black"}`}>
                                            {taxGap > 0.05 && (
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-bold opacity-70">Cara Agih Tax:</span>
                                                    <div className="flex gap-2">
                                                        <button onClick={() => setTaxMethod("PROPORTIONAL")} className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border-2 transition-all ${taxMethod === "PROPORTIONAL" ? (darkMode ? "bg-blue-400 text-black border-blue-400" : "bg-black text-white border-black shadow-[2px_2px_0px_0px_#000]") : "border-current opacity-50 hover:opacity-100"}`}>% MAKAN</button>
                                                        <button onClick={() => setTaxMethod("EQUAL_SPLIT")} className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border-2 transition-all ${taxMethod === "EQUAL_SPLIT" ? (darkMode ? "bg-blue-400 text-black border-blue-400" : "bg-black text-white border-black shadow-[2px_2px_0px_0px_#000]") : "border-current opacity-50 hover:opacity-100"}`}>SAMA RATA</button>
                                                    </div>
                                                </div>
                                            )}
                                            {parseFloat(discountFee) > 0 && (
                                                 <div className="flex items-center justify-between">
                                                    <span className="text-xs font-bold opacity-70">Cara Agih Diskaun:</span>
                                                    <div className="flex gap-2">
                                                        <button onClick={() => setDiscountMethod("PROPORTIONAL")} className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border-2 transition-all ${discountMethod === "PROPORTIONAL" ? (darkMode ? "bg-green-400 text-black border-green-400" : "bg-black text-white border-black shadow-[2px_2px_0px_0px_#000]") : "border-current opacity-50 hover:opacity-100"}`}>% MAKAN</button>
                                                        <button onClick={() => setDiscountMethod("EQUAL_SPLIT")} className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border-2 transition-all ${discountMethod === "EQUAL_SPLIT" ? (darkMode ? "bg-green-400 text-black border-green-400" : "bg-black text-white border-black shadow-[2px_2px_0px_0px_#000]") : "border-current opacity-50 hover:opacity-100"}`}>SAMA RATA</button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                    
                    <button disabled={!billTitle || !billTotal || (billType === "ITEMIZED" && taxGap < -0.1)} onClick={saveBill} className={`w-full py-5 rounded-xl text-sm font-black uppercase tracking-widest border-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none ${darkMode ? "bg-white text-black border-white hover:bg-gray-200" : "bg-lime-300 text-black border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px]"}`}>
                        {editingBillId ? "KEMASKINI BILL SEKARANG" : "SIMPAN BILL NI"}
                    </button>
                </div>
            )}
            
            {/* MODAL: PAYMENT PROFILE */}
            {showPaymentModal && paymentProfileId && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                    <div className={`w-full max-w-[320px] p-5 rounded-2xl border-2 ${darkMode ? "bg-[#1E1E1E] border-white text-white" : "bg-white border-black text-black"} ${shadowStyle} relative animate-in slide-in-from-bottom-10`}>
                        <button onClick={() => setShowPaymentModal(false)} className="absolute top-3 right-3 opacity-50 hover:opacity-100"><X size={20}/></button>
                        <h3 className="text-lg font-black uppercase mb-4 flex items-center gap-2"><Wallet size={20}/> Payment Profile</h3>
                        <div className="space-y-4">
                            <div className="space-y-2"><label className="text-[10px] font-bold uppercase opacity-70">Nama Bank / E-Wallet</label><input placeholder="Maybank / TNG" value={people.find(p=>p.id===paymentProfileId)?.bankName || ""} onChange={e => updatePaymentProfile(paymentProfileId, e.target.value, people.find(p=>p.id===paymentProfileId)?.bankAccount || "", people.find(p=>p.id===paymentProfileId)?.qrImage || "")} className={inputStyle}/></div>
                            <div className="space-y-2"><label className="text-[10px] font-bold uppercase opacity-70">No. Akaun</label><input placeholder="1234567890" value={people.find(p=>p.id===paymentProfileId)?.bankAccount || ""} onChange={e => updatePaymentProfile(paymentProfileId, people.find(p=>p.id===paymentProfileId)?.bankName || "", e.target.value, people.find(p=>p.id===paymentProfileId)?.qrImage || "")} className={`${inputStyle} font-mono`}/></div>
                            <div className="space-y-2 pt-2 border-t border-dashed border-current border-opacity-30"><label className="text-[10px] font-bold uppercase opacity-70 block mb-2">DuitNow QR (Optional)</label><div className="flex items-center gap-3">{people.find(p=>p.id===paymentProfileId)?.qrImage ? (<div className="relative w-16 h-16 border-2 border-current rounded-lg overflow-hidden group"><Image src={people.find(p=>p.id===paymentProfileId)?.qrImage!} layout="fill" objectFit="cover" alt="QR"/><button onClick={() => updatePaymentProfile(paymentProfileId, people.find(p=>p.id===paymentProfileId)?.bankName || "", people.find(p=>p.id===paymentProfileId)?.bankAccount || "", "")} className="absolute inset-0 bg-red-500/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"><Trash2 size={16} className="text-white"/></button></div>) : (<div className="w-16 h-16 border-2 border-dashed border-current rounded-lg flex items-center justify-center opacity-30"><QrCode size={20}/></div>)}<label className={`flex-1 py-3 px-4 border-2 rounded-xl flex items-center justify-center gap-2 cursor-pointer font-bold uppercase text-[10px] hover:opacity-80 ${darkMode ? "bg-white text-black" : "bg-black text-white"}`}><Upload size={14}/> Upload Image<input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, paymentProfileId)}/></label></div></div>
                        </div>
                        <button onClick={() => setShowPaymentModal(false)} className={`w-full py-3 mt-5 text-sm font-black uppercase rounded-xl border-2 ${darkMode ? "bg-green-400 text-black border-green-400" : "bg-green-400 text-black border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px]"}`}>SIMPAN PROFILE</button>
                    </div>
                </div>
            )}

            {/* MODAL: PAY TERMINAL (COMPACT & FRAMED FOR SHARING) */}
            {showPayModal && activeTransfer && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
                    <div className={`w-full max-w-[340px] rounded-2xl overflow-hidden ${darkMode ? "bg-[#1E1E1E] text-white" : "bg-white text-black"} shadow-2xl relative animate-in zoom-in-95`}>
                         
                         {/* HEADER MODAL */}
                         <div className="p-4 flex justify-between items-center border-b border-white/10">
                            <span className="text-[10px] font-black uppercase tracking-widest opacity-50">SIAP UNTUK SHARE</span>
                            <button onClick={() => setShowPayModal(false)}><X size={20} className="opacity-50 hover:opacity-100"/></button>
                         </div>

                         {/* CONTENT AREA (THIS GETS CAPTURED) */}
                         <div ref={receiptRef} className={`p-8 flex items-center justify-center ${darkMode ? "bg-[#111]" : "bg-gray-200"}`}>
                            {/* THE RECEIPT CARD ITSELF */}
                            <div className={`w-full bg-white text-black p-5 rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden`}>
                                {/* Hole punch effect */}
                                <div className="absolute top-[-10px] left-1/2 -translate-x-1/2 w-4 h-4 bg-black rounded-full"></div>

                                <div className="text-center border-b-2 border-dashed border-black/20 pb-4 mb-4">
                                    <p className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-1">TOTAL BAYARAN</p>
                                    <h2 className="text-3xl font-black font-mono">RM{activeTransfer.amount.toFixed(2)}</h2>
                                </div>

                                <div className="text-center mb-4">
                                    <p className="text-[9px] font-bold opacity-40 uppercase mb-1">KEPADA</p>
                                    <h3 className="text-xl font-black uppercase leading-none mb-2">{activeTransfer.toName}</h3>
                                    <p className="text-[9px] font-bold opacity-40 uppercase">{people.find(p=>p.id===activeTransfer.toId)?.bankName || "Unknown Bank"}</p>
                                </div>

                                {people.find(p=>p.id===activeTransfer.toId)?.qrImage ? (
                                    <div className="w-32 h-32 mx-auto border-2 border-black rounded-lg overflow-hidden mb-4">
                                        <Image src={people.find(p=>p.id===activeTransfer.toId)?.qrImage!} layout="fill" objectFit="contain" alt="QR"/>
                                    </div>
                                ) : (
                                    <div className="w-full py-4 border-2 border-dashed border-black/20 rounded-lg flex flex-col items-center justify-center opacity-30 mb-4">
                                        <QrCode size={24}/>
                                        <span className="text-[8px] font-bold mt-1">NO QR</span>
                                    </div>
                                )}

                                <div className="bg-gray-100 p-2 rounded border border-black/10 text-center">
                                    <p className="text-[8px] font-bold uppercase opacity-40 mb-1">NO AKAUN</p>
                                    <p className="font-mono font-black text-sm tracking-wider">{people.find(p=>p.id===activeTransfer.toId)?.bankAccount || "Ask Member"}</p>
                                </div>

                                <div className="mt-4 pt-2 border-t-2 border-black/10 flex justify-between items-center opacity-40">
                                    <span className="text-[8px] font-bold tracking-widest">SPLITIT.</span>
                                    <span className="text-[8px] font-mono">{new Date().toLocaleDateString()}</span>
                                </div>
                            </div>
                         </div>
                         
                         {/* ACTION BUTTONS */}
                         <div className="p-4 space-y-3 bg-current bg-opacity-5">
                             <button onClick={handleShareImage} disabled={isSharing} className={`w-full py-3 text-xs font-bold uppercase rounded-xl border-2 flex items-center justify-center gap-2 ${darkMode ? "border-white hover:bg-white hover:text-black" : "border-black hover:bg-gray-100"}`}>
                                {isSharing ? <RotateCcw size={14} className="animate-spin"/> : <Share2 size={14}/>} 
                                {isSharing ? "GENERATING..." : "SHARE GAMBAR RESIT"}
                             </button>

                             <button 
                                onClick={() => {
                                    togglePaymentStatus(activeTransfer.fromId, activeTransfer.toId);
                                    setShowPayModal(false);
                                }} 
                                className={`w-full py-3 text-xs font-black uppercase rounded-xl transition-all shadow-lg hover:shadow-none hover:translate-y-[2px] ${
                                    paidStatus[`${activeTransfer.fromId}-${activeTransfer.toId}`]
                                    ? "bg-red-500 text-white" 
                                    : "bg-green-500 text-black" 
                                }`}
                             >
                                {paidStatus[`${activeTransfer.fromId}-${activeTransfer.toId}`] ? "BATAL / MARK UNPAID" : "✅ DAH TRANSFER"}
                             </button>
                         </div>
                    </div>
                </div>
            )}
            
        </main>
      </div>
    </div>
  );
}