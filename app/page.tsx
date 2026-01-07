"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Moon, Sun, Users, Receipt, ArrowRight, CheckCircle, Trash2, Edit3, Save, AlertCircle, Edit2, Copy, Check, PieChart, Divide, ChevronDown, ChevronUp, Bike, RefreshCw } from "lucide-react";

// --- TYPES ---
type Person = { id: string; name: string };
type BillType = "EQUAL" | "ITEMIZED";
type TaxMethod = "PROPORTIONAL" | "EQUAL_SPLIT";

type BillDetail = {
  personId: string;
  base: number;
  tax: number;
  misc: number;
  total: number;
};

type Bill = {
  id: string;
  title: string;
  type: BillType;
  totalAmount: number;
  paidBy: string;
  details: BillDetail[];
  itemsSubtotal?: number;
  miscAmount?: number;
  taxMethod?: TaxMethod;
};

type Transfer = {
  from: string;
  to: string;
  amount: number;
};

export default function SplitBillPro() {
  // --- STATE ---
  const [darkMode, setDarkMode] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false); // Untuk elak glitch masa loading
  
  // 1. Setup Orang (Default)
  const [people, setPeople] = useState<Person[]>([
    { id: "p1", name: "Aku" },
    { id: "p2", name: "Member 1" },
  ]);
  const [newPersonName, setNewPersonName] = useState("");
  const [editingPersonId, setEditingPersonId] = useState<string | null>(null);

  // 2. Senarai Bill (History)
  const [bills, setBills] = useState<Bill[]>([]);

  // UI State
  const [expandedBillId, setExpandedBillId] = useState<string | null>(null); 
  const [copied, setCopied] = useState(false);

  // Form State
  const [mode, setMode] = useState<"DASHBOARD" | "ADD_BILL">("DASHBOARD");
  const [editingBillId, setEditingBillId] = useState<string | null>(null);

  const [billType, setBillType] = useState<BillType>("EQUAL");
  const [billTitle, setBillTitle] = useState("");
  const [billTotal, setBillTotal] = useState(""); 
  const [miscFee, setMiscFee] = useState(""); 
  const [payerId, setPayerId] = useState("p1");
  
  const [tempItems, setTempItems] = useState<{ personId: string; amount: number }[]>([]);
  const [taxMethod, setTaxMethod] = useState<TaxMethod>("PROPORTIONAL");

  // --- LOCAL STORAGE LOGIC (THE BRAIN) ---
  
  // 1. Load Data bila apps mula-mula buka
  useEffect(() => {
    const savedPeople = localStorage.getItem("splitit_people");
    const savedBills = localStorage.getItem("splitit_bills");
    const savedMode = localStorage.getItem("splitit_darkmode");

    if (savedPeople) setPeople(JSON.parse(savedPeople));
    if (savedBills) setBills(JSON.parse(savedBills));
    if (savedMode) setDarkMode(savedMode === "true");
    
    setIsLoaded(true); // Tanda dah siap loading
  }, []);

  // 2. Auto-Save bila ada perubahan
  useEffect(() => {
    if (isLoaded) {
        localStorage.setItem("splitit_people", JSON.stringify(people));
        localStorage.setItem("splitit_bills", JSON.stringify(bills));
        localStorage.setItem("splitit_darkmode", String(darkMode));
    }
  }, [people, bills, darkMode, isLoaded]);

  // 3. Function Reset untuk start sesi baru
  const resetAllData = () => {
    if (confirm("Reset semua data? Data 'Geng Lepak' dan 'Bill' akan hilang.")) {
        setPeople([{ id: "p1", name: "Aku" }, { id: "p2", name: "Member 1" }]);
        setBills([]);
        localStorage.removeItem("splitit_people");
        localStorage.removeItem("splitit_bills");
    }
  }

  // --- LOGIC HELPER ---

  const addPerson = () => {
    if (!newPersonName) return;
    setPeople([...people, { id: `p${Date.now()}`, name: newPersonName }]);
    setNewPersonName("");
  };

  const updatePersonName = (id: string, newName: string) => {
    setPeople(people.map(p => p.id === id ? { ...p, name: newName } : p));
  };

  const deletePerson = (id: string) => {
    const isInvolved = bills.some(b => 
      b.paidBy === id || b.details.some(d => d.personId === id)
    );
    if (isInvolved) {
      alert("Tak boleh buang member ni sebab ada rekod bill.");
      return;
    }
    setPeople(people.filter(p => p.id !== id));
    setEditingPersonId(null);
  };

  const handleEditBill = (bill: Bill) => {
    setEditingBillId(bill.id); 
    setBillTitle(bill.title);
    setBillTotal(String(bill.totalAmount));
    setBillType(bill.type);
    setPayerId(bill.paidBy);
    setMiscFee(bill.miscAmount ? String(bill.miscAmount) : "");
    
    if (bill.type === "ITEMIZED") {
        const rawItems = bill.details.map(d => ({ personId: d.personId, amount: d.base }));
        setTempItems(rawItems); 
        if(bill.taxMethod) setTaxMethod(bill.taxMethod);
    } else {
        setTempItems([]);
    }
    setMode("ADD_BILL");
  };

  const saveBill = () => {
    if (!billTitle || !billTotal) return;
    const grandTotal = parseFloat(billTotal);
    const miscTotal = parseFloat(miscFee) || 0; 
    
    let calculatedDetails: BillDetail[] = [];
    let itemsSubtotal = 0;

    if (billType === "EQUAL") {
      const splitAmount = grandTotal / people.length;
      calculatedDetails = people.map((p) => ({ 
          personId: p.id, 
          base: splitAmount, 
          tax: 0, 
          misc: 0,
          total: splitAmount 
      }));
      itemsSubtotal = grandTotal;

    } else {
      itemsSubtotal = tempItems.reduce((sum, item) => sum + item.amount, 0);
      const taxTotal = grandTotal - (itemsSubtotal + miscTotal);
      const miscPerPerson = miscTotal / people.length;

      calculatedDetails = people.map(p => {
          const userItem = tempItems.find(i => i.personId === p.id);
          const base = userItem ? userItem.amount : 0;
          let taxPortion = 0;
          if (taxTotal > 0.01) {
              if (taxMethod === "PROPORTIONAL") {
                  if (itemsSubtotal > 0) {
                      taxPortion = (base / itemsSubtotal) * taxTotal;
                  } else {
                      taxPortion = taxTotal / people.length;
                  }
              } else {
                  taxPortion = taxTotal / people.length;
              }
          }
          return {
              personId: p.id,
              base: base,
              tax: taxPortion,
              misc: miscPerPerson,
              total: base + taxPortion + miscPerPerson
          };
      });
    }

    const billData: Bill = {
      id: editingBillId || `b${Date.now()}`,
      title: billTitle,
      type: billType,
      totalAmount: grandTotal,
      itemsSubtotal: itemsSubtotal,
      miscAmount: miscTotal,
      paidBy: payerId,
      details: calculatedDetails,
      taxMethod: billType === "ITEMIZED" ? taxMethod : undefined
    };

    if (editingBillId) {
        setBills(bills.map(b => b.id === editingBillId ? billData : b));
    } else {
        setBills([...bills, billData]);
    }
    
    setMode("DASHBOARD");
    setEditingBillId(null);
    setBillTitle("");
    setBillTotal("");
    setMiscFee("");
    setTempItems([]);
    setTaxMethod("PROPORTIONAL");
  };

  const cancelEdit = () => {
      setMode("DASHBOARD");
      setEditingBillId(null);
      setBillTitle("");
      setBillTotal("");
      setMiscFee("");
      setTempItems([]);
      setTaxMethod("PROPORTIONAL");
  }

  const deleteBill = (id: string) => {
    if(confirm("Confirm delete bill ni?")) setBills(bills.filter(b => b.id !== id));
  }

  const updateItemizedAmount = (pId: string, val: string) => {
    const amt = parseFloat(val) || 0;
    const existing = tempItems.find(i => i.personId === pId);
    if (existing) {
      setTempItems(tempItems.map(i => i.personId === pId ? { ...i, amount: amt } : i));
    } else {
      setTempItems([...tempItems, { personId: pId, amount: amt }]);
    }
  };

  const getAllocatedTotal = () => tempItems.reduce((sum, item) => sum + item.amount, 0);
  
  const getRemainingTax = () => {
      const total = parseFloat(billTotal) || 0;
      const misc = parseFloat(miscFee) || 0;
      const items = getAllocatedTotal();
      return total - items - misc;
  }

  const calculateFinalSettlement = () => {
    let balances: Record<string, number> = {};
    people.forEach(p => balances[p.id] = 0);

    bills.forEach(bill => {
      if (balances[bill.paidBy] !== undefined) balances[bill.paidBy] += bill.totalAmount;
      bill.details.forEach(d => {
        if (balances[d.personId] !== undefined) balances[d.personId] -= d.total;
      });
    });

    const peopleWithNet = people.map(p => ({
      ...p,
      net: balances[p.id] || 0,
      totalConsumed: bills.reduce((sum, b) => {
        const detail = b.details.find(d => d.personId === p.id);
        return sum + (detail ? detail.total : 0);
      }, 0)
    }));

    let debtors = peopleWithNet.filter(p => p.net < -0.01).map(p => ({ ...p, net: Math.abs(p.net) }));
    let creditors = peopleWithNet.filter(p => p.net > 0.01).map(p => ({ ...p, net: p.net }));
    let transfers: Transfer[] = [];

    debtors.sort((a, b) => b.net - a.net);
    creditors.sort((a, b) => b.net - a.net);

    let i = 0, j = 0;
    while (i < debtors.length && j < creditors.length) {
        let debtor = debtors[i];
        let creditor = creditors[j];
        let amount = Math.min(debtor.net, creditor.net);

        if (amount > 0.01) {
            transfers.push({ from: debtor.name, to: creditor.name, amount: amount });
        }
        debtors[i].net -= amount;
        creditors[j].net -= amount;
        if (debtors[i].net < 0.01) i++;
        if (creditors[j].net < 0.01) j++;
    }

    return { peopleWithNet, transfers };
  };

  const { peopleWithNet, transfers } = calculateFinalSettlement();
  const remainingTax = getRemainingTax();

  const copyToClipboard = () => {
    let text = "📋 *SplitIt. Summary*\n";
    text += "by kmlxly\n\n";
    transfers.forEach(t => {
        text += `👉 ${t.from} transfer ${t.to}: RM${t.amount.toFixed(2)}\n`;
    });
    text += "\nGenerate by SplitIt. by kmlxly";
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // --- UI START ---
  // Elak glitch: kalau belum loaded, jangan render content lagi (optional)
  if (!isLoaded) return <div className="min-h-screen bg-slate-900"/>;

  return (
    <div className={`min-h-screen transition-colors duration-500 font-sans ${darkMode ? "bg-slate-900 text-slate-100" : "bg-slate-50 text-slate-800"}`}>
      
      {/* PERFORMANCE FIX: Static Background, No Blur on Blob */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
         <div className={`absolute -top-20 -right-20 w-80 h-80 rounded-full opacity-20 ${darkMode ? "bg-purple-900" : "bg-purple-200"}`}></div>
         <div className={`absolute top-40 -left-20 w-80 h-80 rounded-full opacity-20 ${darkMode ? "bg-blue-900" : "bg-blue-200"}`}></div>
      </div>

      <main className="relative z-10 max-w-md mx-auto min-h-screen flex flex-col p-4">
        
        {/* BRAND HEADER */}
        <div className="flex justify-between items-center py-6 mb-2">
          <div className="flex items-center gap-3">
            <div className="relative w-12 h-12 shadow-lg rounded-full overflow-hidden border border-white/10">
                <Image src="/icon.png" alt="SplitIt Logo" width={48} height={48} className="object-cover"/>
            </div>
            <div>
                <h1 className="text-3xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400 leading-none">SplitIt.</h1>
                <p className="text-[10px] font-bold tracking-widest uppercase opacity-40 text-slate-500 mt-0.5">by kmlxly</p>
            </div>
          </div>
          <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 hover:bg-white/20 transition">
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>

        {/* --- VIEW: DASHBOARD --- */}
        {mode === "DASHBOARD" && (
          <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 flex-1">
            
            {/* GENG LEPAK */}
            <div className={`p-4 rounded-3xl border backdrop-blur-md transition-all ${darkMode ? "bg-white/5 border-white/10" : "bg-white/80 border-slate-200 shadow-sm"}`}>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-sm font-bold uppercase tracking-widest opacity-70 flex items-center gap-2"><Users size={14}/> Geng Lepak</h2>
              </div>
              
              <div className="flex flex-wrap gap-2 mb-3">
                {people.map(p => (
                  <div key={p.id}>
                    {editingPersonId === p.id ? (
                        <div className={`flex items-center gap-1 p-1 rounded-xl border animate-in zoom-in-95 duration-200 ${darkMode ? "bg-black/40 border-blue-500" : "bg-white border-blue-500 shadow-md"}`}>
                            <input 
                                autoFocus
                                value={p.name}
                                onChange={(e) => updatePersonName(p.id, e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && setEditingPersonId(null)}
                                className={`w-24 text-sm px-2 bg-transparent outline-none font-bold ${darkMode ? "text-white" : "text-slate-800"}`}
                            />
                            <button onClick={() => deletePerson(p.id)} className="p-1.5 rounded-lg bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition"><Trash2 size={14}/></button>
                            <button onClick={() => setEditingPersonId(null)} className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500 hover:text-white transition"><Check size={14}/></button>
                        </div>
                    ) : (
                        <button onClick={() => setEditingPersonId(p.id)} className={`px-4 py-2 rounded-xl text-base font-bold border transition active:scale-95 flex items-center gap-2 ${darkMode ? "bg-slate-800/50 border-slate-700 hover:bg-slate-800" : "bg-slate-50 border-slate-200 hover:bg-slate-100"}`}>
                            <div className={`w-2 h-2 rounded-full ${darkMode ? "bg-blue-400" : "bg-blue-500"}`}></div>
                            {p.name}
                        </button>
                    )}
                  </div>
                ))}
                
                <div className={`flex items-center gap-1 p-1 pl-3 rounded-xl border ${darkMode ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200"}`}>
                    <input value={newPersonName} onChange={e => setNewPersonName(e.target.value)} onKeyDown={e => e.key === "Enter" && addPerson()} placeholder="Tambah..." className="w-20 bg-transparent text-sm outline-none"/>
                    <button onClick={addPerson} className="p-1.5 bg-blue-600 rounded-lg text-white hover:bg-blue-500 transition"><ArrowRight size={14}/></button>
                </div>
              </div>
            </div>

            {/* BILL HISTORY */}
            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <h2 className="text-sm font-bold uppercase tracking-widest opacity-70">Sejarah Bill</h2>
                <span className="text-xs opacity-50">{bills.length} resit</span>
              </div>
              {bills.length === 0 ? (
                <div className="text-center py-8 opacity-40 border-2 border-dashed rounded-3xl border-slate-600"><p className="text-sm">Belum ada bill.</p></div>
              ) : (
                bills.map(bill => (
                  <div key={bill.id} className={`rounded-2xl border relative overflow-hidden transition-all duration-300 ${darkMode ? "bg-white/5 border-white/10" : "bg-white border-slate-200 shadow-sm"}`}>
                    <div className="p-4 flex justify-between items-center cursor-pointer" onClick={() => setExpandedBillId(expandedBillId === bill.id ? null : bill.id)}>
                        <div>
                          <h3 className="font-bold flex items-center gap-2">
                            {bill.title} 
                            {bill.type === "ITEMIZED" && bill.taxMethod === "PROPORTIONAL" && <span className="text-[8px] px-1 py-0.5 rounded border border-white/20 opacity-50">% TAX</span>}
                            {bill.type === "ITEMIZED" && bill.taxMethod === "EQUAL_SPLIT" && <span className="text-[8px] px-1 py-0.5 rounded border border-white/20 opacity-50">= TAX</span>}
                          </h3>
                          <div className="text-xs opacity-60 flex gap-2 mt-1">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${bill.type === "EQUAL" ? "bg-emerald-500/20 text-emerald-400" : "bg-orange-500/20 text-orange-400"}`}>{bill.type === "EQUAL" ? "KONGSI" : "ASING"}</span>
                            <span>Bayar: {people.find(p => p.id === bill.paidBy)?.name || "Deleted"}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="font-mono font-bold text-lg">RM{bill.totalAmount.toFixed(2)}</span>
                            {expandedBillId === bill.id ? <ChevronUp size={18} className="opacity-50"/> : <ChevronDown size={18} className="opacity-50"/>}
                        </div>
                    </div>
                    {expandedBillId === bill.id && (
                        <div className={`p-4 border-t text-sm ${darkMode ? "bg-black/20 border-white/10" : "bg-slate-50 border-slate-100"}`}>
                            <div className="space-y-2">
                                <div className="grid grid-cols-4 text-[10px] uppercase opacity-50 font-bold mb-1">
                                    <div className="col-span-1">Nama</div>
                                    <div className="text-right">Makan</div>
                                    <div className="text-right">Tax+Caj</div>
                                    <div className="text-right">Total</div>
                                </div>
                                {bill.details.map((d, idx) => (
                                    <div key={idx} className="grid grid-cols-4 items-center border-b border-dashed border-white/5 pb-1 last:border-0">
                                        <div className="col-span-1 font-medium truncate">{people.find(p=>p.id === d.personId)?.name || "Deleted"}</div>
                                        <div className="text-right opacity-70 text-xs">{d.base > 0 ? d.base.toFixed(2) : "-"}</div>
                                        <div className="text-right opacity-50 text-[10px]">{(d.tax + d.misc) > 0 ? `+${(d.tax + d.misc).toFixed(2)}` : "-"}</div>
                                        <div className="text-right font-bold font-mono">{d.total.toFixed(2)}</div>
                                    </div>
                                ))}
                                <div className="flex justify-end gap-2 mt-4 pt-2 border-t border-white/10">
                                    <button onClick={(e) => { e.stopPropagation(); handleEditBill(bill); }} className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg flex items-center gap-1 text-xs"><Edit2 size={14}/> Edit</button>
                                    <button onClick={(e) => { e.stopPropagation(); deleteBill(bill.id); }} className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg flex items-center gap-1 text-xs"><Trash2 size={14}/> Delete</button>
                                </div>
                            </div>
                        </div>
                    )}
                  </div>
                ))
              )}
              <div className="grid grid-cols-2 gap-3 mt-2">
                <button onClick={() => { setBillType("EQUAL"); setMode("ADD_BILL"); setEditingBillId(null); setBillTitle(""); setBillTotal(""); setMiscFee(""); }} className="py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2 transition-transform active:scale-95"><Users size={16}/> Split Rata</button>
                <button onClick={() => { setBillType("ITEMIZED"); setMode("ADD_BILL"); setEditingBillId(null); setBillTitle(""); setBillTotal(""); setMiscFee(""); }} className="py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 transition-transform active:scale-95"><Receipt size={16}/> Split Item</button>
              </div>
            </div>

            {/* SETTLEMENT SECTION */}
            {bills.length > 0 && (
              <div className={`mt-4 p-5 rounded-3xl border-t-4 border-t-purple-500 shadow-2xl ${darkMode ? "bg-slate-800" : "bg-white"}`}>
                <h2 className="text-lg font-black mb-4 flex items-center gap-2 text-purple-400"><CheckCircle size={20}/> Keputusan Akhir</h2>
                <div className="space-y-2 mb-6 opacity-80">
                  {peopleWithNet.map(p => (
                    <div key={p.id} className="flex justify-between items-center text-xs border-b border-dashed border-white/10 pb-1 last:border-0">
                      <span>{p.name} (Total Guna: RM{p.totalConsumed.toFixed(2)})</span>
                      <span className={p.net > 0 ? "text-emerald-400" : p.net < 0 ? "text-red-400" : "text-slate-500"}>{p.net > 0 ? `+RM${p.net.toFixed(2)}` : p.net < 0 ? `-RM${Math.abs(p.net).toFixed(2)}` : "0.00"}</span>
                    </div>
                  ))}
                </div>
                <div className="bg-black/10 -mx-5 -mb-5 p-5 rounded-b-3xl border-t border-white/10">
                  <div className="flex justify-between items-center mb-3">
                    <p className="text-xs uppercase tracking-widest opacity-50 font-bold">Transfer Yang Perlu Dibuat</p>
                    {transfers.length > 0 && (
                        <button onClick={copyToClipboard} className="flex items-center gap-1 text-[10px] px-2 py-1 bg-white/10 hover:bg-white/20 rounded border border-white/20 transition-all">
                            {copied ? <Check size={10}/> : <Copy size={10}/>} {copied ? "Disalin!" : "Salin List"}
                        </button>
                    )}
                  </div>
                  {transfers.length > 0 ? (
                    <div className="space-y-2">
                        {transfers.map((t, idx) => (
                            <div key={idx} className={`p-3 rounded-xl flex justify-between items-center shadow-lg ${darkMode ? "bg-slate-700" : "bg-white"}`}>
                                <div className="flex items-center gap-2">
                                    <div className="text-right">
                                        <div className="text-xs font-bold text-red-400">{t.from}</div>
                                        <div className="text-[10px] opacity-50">transfer ke</div>
                                    </div>
                                    <ArrowRight size={14} className="opacity-30"/>
                                    <div className="text-left">
                                        <div className="text-xs font-bold text-emerald-400">{t.to}</div>
                                    </div>
                                </div>
                                <div className="font-mono font-bold text-lg">RM{t.amount.toFixed(2)}</div>
                            </div>
                        ))}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                        <CheckCircle size={30} className="mx-auto mb-2 text-emerald-500 opacity-50"/>
                        <p className="text-xs italic opacity-50">Semua akaun dah settle! Tiada hutang.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* FOOTER & RESET */}
            <div className="text-center opacity-40 text-[10px] py-8 space-y-1">
                <p className="font-bold">SplitIt. by kmlxly</p>
                <p className="italic opacity-70">Bahagi bill cara tenang.</p>
                <button onClick={resetAllData} className="mt-4 flex items-center gap-1 mx-auto text-red-400 hover:text-red-300 transition opacity-50 hover:opacity-100">
                    <RefreshCw size={10}/> Reset Semua Data
                </button>
            </div>
          </div>
        )}

        {/* --- VIEW: ADD/EDIT BILL FORM --- */}
        {mode === "ADD_BILL" && (
          <div className="flex flex-col h-full animate-in slide-in-from-right-8 fade-in">
            <div className="flex items-center gap-4 mb-6">
              <button onClick={cancelEdit} className="p-2 rounded-xl bg-white/10 hover:bg-white/20"><ArrowRight size={20} className="rotate-180"/></button>
              <h2 className="text-xl font-bold">{editingBillId ? "Edit Bill" : "Tambah Bill"} {billType === "EQUAL" ? "Kongsi" : "Asing"}</h2>
            </div>

            <div className={`flex-1 overflow-y-auto p-1 space-y-6`}>
              <div className="space-y-2">
                <label className="text-xs opacity-60 uppercase font-bold">Nama Kedai / Tajuk</label>
                <input autoFocus value={billTitle} onChange={e => setBillTitle(e.target.value)} placeholder="Cth: Mamak Bistro" className={`w-full p-4 rounded-2xl text-base font-bold outline-none ${darkMode ? "bg-white/5" : "bg-white border"}`}/>
              </div>
              <div className="space-y-2">
                <label className="text-xs opacity-60 uppercase font-bold">Total Resit (RM)</label>
                <input type="number" value={billTotal} onChange={e => setBillTotal(e.target.value)} placeholder="0.00" className={`w-full p-4 rounded-2xl text-3xl font-black outline-none ${darkMode ? "bg-white/5" : "bg-white border"}`}/>
              </div>
              <div className="space-y-2">
                <label className="text-xs opacity-60 uppercase font-bold">Siapa Tukang Bayar?</label>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {people.map(p => (
                    <button key={p.id} onClick={() => setPayerId(p.id)} className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-bold border transition ${payerId === p.id ? "bg-emerald-500 border-emerald-500 text-white" : "border-white/20 opacity-60"}`}>{p.name}</button>
                  ))}
                </div>
              </div>

              {billType === "ITEMIZED" && (
                <div className="space-y-4 pt-4 border-t border-white/10 animate-in fade-in">
                   
                   <div className={`p-4 rounded-2xl border transition-colors duration-300 ${remainingTax === 0 ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-400" : remainingTax < 0 ? "bg-red-500/10 border-red-500/50 text-red-400" : "bg-blue-500/10 border-blue-500/50 text-blue-400"}`}>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                                {remainingTax === 0 ? <Check size={14}/> : <AlertCircle size={14}/>}
                                {remainingTax > 0 ? "TAX / SERVICE CHARGE" : remainingTax < 0 ? "TERLEBIH AGIH" : "SEMPURNA"}
                            </span>
                            <span className="text-xl font-mono font-bold">{remainingTax < 0 ? "-" : ""}RM{Math.abs(remainingTax).toFixed(2)}</span>
                        </div>
                        {remainingTax > 0.05 && (
                             <div className="flex gap-1 bg-black/20 p-1 rounded-xl">
                                <button onClick={() => setTaxMethod("PROPORTIONAL")} className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all ${taxMethod === "PROPORTIONAL" ? "bg-white text-blue-600 shadow-sm" : "opacity-50 hover:opacity-100"}`}><PieChart size={12}/> Ikut % Makan</button>
                                <button onClick={() => setTaxMethod("EQUAL_SPLIT")} className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all ${taxMethod === "EQUAL_SPLIT" ? "bg-white text-blue-600 shadow-sm" : "opacity-50 hover:opacity-100"}`}><Divide size={12}/> Kongsi Rata</button>
                             </div>
                        )}
                   </div>
                   
                   <div className="space-y-2">
                    <p className="text-xs opacity-50 px-2 uppercase font-bold">Harga Makanan (Subtotal)</p>
                    {people.map(p => {
                       const currentVal = tempItems.find(i => i.personId === p.id)?.amount || "";
                       return (
                         <div key={p.id} className="flex items-center gap-3">
                           <span className="w-24 text-sm font-medium truncate">{p.name}</span>
                           <div className="flex-1 relative">
                             <span className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50 text-xs">RM</span>
                             <input type="number" placeholder="0.00" value={currentVal} onChange={(e) => updateItemizedAmount(p.id, e.target.value)} className={`w-full pl-8 pr-4 py-3 text-base rounded-xl outline-none transition-all ${darkMode ? "bg-white/5 focus:bg-white/10" : "bg-slate-100 focus:bg-white focus:shadow-md"}`}/>
                           </div>
                         </div>
                       )
                    })}
                   </div>

                   <div className="space-y-2 pt-2 border-t border-dashed border-white/10">
                        <label className="text-xs opacity-60 uppercase font-bold flex items-center gap-2"><Bike size={14}/> Caj Tetap (Delivery/Deposit)</label>
                        <div className="relative">
                             <span className="absolute left-4 top-1/2 -translate-y-1/2 opacity-50 text-sm">RM</span>
                             <input type="number" placeholder="0.00" value={miscFee} onChange={(e) => setMiscFee(e.target.value)} className={`w-full pl-10 pr-4 py-3 rounded-xl text-base outline-none font-bold ${darkMode ? "bg-white/5 border border-white/10 focus:border-blue-500" : "bg-slate-100 border border-slate-200 focus:border-blue-500"}`}/>
                        </div>
                        <p className="text-[10px] opacity-50 px-1">Nilai ni akan dibahagi sama rata kepada semua orang.</p>
                   </div>
                </div>
              )}
            </div>

            <button onClick={saveBill} disabled={!billTitle || !billTotal || (billType === "ITEMIZED" && remainingTax < -0.1)} className="mt-4 w-full py-4 rounded-2xl bg-white text-black font-bold text-lg hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition">
              {editingBillId ? "Kemaskini Bill" : "Simpan Bill"}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}