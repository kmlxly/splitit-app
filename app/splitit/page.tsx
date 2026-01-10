"use client";

import React, { useState, useEffect, useRef } from "react";
import html2canvas from "html2canvas";
import { GoogleGenerativeAI } from "@google/generative-ai"; 
import { 
  Moon, Sun, CheckCircle, Trash2, 
  Edit3, Copy, Check, Bike, Tag, RotateCcw, Plus, X, 
  ChevronDown, ChevronUp, Receipt, Users, AlertCircle, 
  CreditCard, QrCode, Upload, Wallet, ExternalLink, ArrowRight, Info, Folder, Calculator, Save, ShoppingBag, User, Globe, Camera, Loader2, Image as ImageIcon
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
    currency?: string;
};

// Type untuk item hasil scan
type ScannedItem = {
    id: string;
    name: string;
    price: string;
    selected: boolean;
};

export default function SplitBillBrutalV2() {
  // --- STATE ---
  const [darkMode, setDarkMode] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Data State
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  
  // UI Modal States
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [showScanModal, setShowScanModal] = useState(false); 
  const [showScanMethodModal, setShowScanMethodModal] = useState(false); // NEW: Modal Pilihan Scan
  
  const [newSessionName, setNewSessionName] = useState("");
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null); 
  const [tempSessionName, setTempSessionName] = useState(""); 

  // Derived State
  const activeSession = sessions.find(s => s.id === activeSessionId);
  const people = activeSession?.people || [];
  const bills = activeSession?.bills || [];
  const paidStatus = activeSession?.paidStatus || {};
  const currency = activeSession?.currency || "RM";

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
  
  // OCR States
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState("Ready");
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);

  // Ref
  const receiptRef = useRef<HTMLDivElement>(null);

  // Form Inputs
  const [editingBillId, setEditingBillId] = useState<string | null>(null);
  const [billType, setBillType] = useState<BillType>("EQUAL");
  const [billTitle, setBillTitle] = useState("");
  const [billTotal, setBillTotal] = useState(""); 
  const [miscFee, setMiscFee] = useState(""); 
  const [discountFee, setDiscountFee] = useState(""); 
  const [payerId, setPayerId] = useState("");
  const [taxMethod, setTaxMethod] = useState<SplitMethod>("PROPORTIONAL");
  const [discountMethod, setDiscountMethod] = useState<SplitMethod>("PROPORTIONAL");

  // Smart Menu Inputs
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
            bills: [], paidStatus: {}, currency: "RM"
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

  // --- LOGIC FUNCTIONS ---
  
  const resetData = () => {
    if (confirm("⚠️ AMARAN KRITIKAL:\n\nAdakah anda pasti nak RESET semua data?\nSemua history bill & nama member akan hilang dari device ini.")) {
        localStorage.clear();
        window.location.reload();
    }
  };

  const updateActiveSession = (updates: Partial<Session>) => {
      setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, ...updates } : s));
  };

  const setCurrency = (curr: string) => {
      updateActiveSession({ currency: curr });
  };

  const createNewSession = () => {
      if (!newSessionName.trim()) return;
      const newSession: Session = {
          id: `s${Date.now()}`, name: newSessionName, createdAt: Date.now(),
          people: [{ id: "p1", name: "Aku" }, { id: "p2", name: "Member 1" }],
          bills: [], paidStatus: {}, currency: "RM"
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

      const newItem: MenuItem = {
          id: `m${Date.now()}`,
          name: newItemName,
          price: price,
          sharedBy: newItemSharedBy
      };
      setMenuItems([...menuItems, newItem]);
      setNewItemName("");
      setNewItemPrice("");
      setNewItemSharedBy([]);
      setIsMultiSelectMode(false); 
  };

  const removeMenuItem = (mid: string) => {
      setMenuItems(menuItems.filter(m => m.id !== mid));
  };

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
      if (!newMode) {
          if (newItemSharedBy.length > 1) setNewItemSharedBy([]);
      }
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

  const applyQuickTax = (percentage: number) => {
      const currentTotal = parseFloat(billTotal);
      if (!isNaN(currentTotal) && currentTotal > 0) {
          const newTotal = currentTotal * (1 + percentage / 100);
          setBillTotal(newTotal.toFixed(2));
      }
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
  const totalSpent = bills.reduce((sum, b) => sum + b.totalAmount, 0);

  const copyWhatsAppSummary = () => {
      let text = `*PROSES SETTLEMENT: ${activeSession?.name?.toUpperCase()}*\n`;
      text += `----------------------------------\n`;
      text += `💰 *Total Hangus:* ${currency}${totalSpent.toFixed(2)}\n\n`;
      if (txs.length > 0) {
          text += `*SENARAI HUTANG:*\n`;
          txs.forEach(t => {
              const status = paidStatus[`${t.fromId}-${t.toId}`] ? "✅ SETTLED" : "❌ UNPAID";
              text += `• *${t.fromName}* ➡️ *${t.toName}*: _${currency}${t.amount.toFixed(2)}_ [${status}]\n`;
          });
      } else { text += `✅ Semua hutang dah selesai!\n`; }
      text += `\n_Generated by SplitIt._`;
      navigator.clipboard.writeText(text);
      setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  // --- GEMINI AI OCR / SCAN LOGIC ---
  const handleScanReceipt = async (e: React.ChangeEvent<HTMLInputElement>) => {
      setShowScanMethodModal(false); // Tutup modal pilihan
      const file = e.target.files?.[0];
      if (!file) return;

      setIsScanning(true);
      setScanStatus("Menghantar ke AI...");
      setShowScanModal(true);
      setScannedItems([]);

      try {
          // 1. Convert Image ke Base64 (Untuk Gemini)
          const base64Data = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.readAsDataURL(file);
              reader.onload = () => {
                  const result = reader.result as string;
                  const base64String = result.split(",")[1]; // Buang data:image/ prefix
                  resolve(base64String);
              };
              reader.onerror = error => reject(error);
          });

          // 2. Setup Gemini AI
          const genAI = new GoogleGenerativeAI("AIzaSyC_kxh5AkWCG2XJUp1Z7tXlC-4zXzVmAKk");
          const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

          setScanStatus("AI sedang membaca resit...");

          // 3. Prompt untuk AI (Strict JSON)
          const prompt = `
            Analyze this receipt image. Extract all purchased items and their prices.
            Ignore tax, subtotal, total, cash, change, date, or store info.
            Return ONLY a raw JSON array with this format:
            [{"name": "Item Name", "price": "0.00"}, ...]
            Do not use markdown formatting like \`\`\`json. Just the raw array.
          `;

          const imagePart = {
              inlineData: {
                  data: base64Data,
                  mimeType: file.type,
              },
          };

          // 4. Hantar ke AI
          const result = await model.generateContent([prompt, imagePart]);
          const response = await result.response;
          let text = response.text();

          // 5. Bersihkan response JSON
          text = text.replace(/```json/g, "").replace(/```/g, "").trim();
          
          setScanStatus("Menyusun data...");
          
          const parsedData = JSON.parse(text);
          
          // 6. Map ke format aplikasi
          const formattedItems: ScannedItem[] = parsedData.map((item: any, index: number) => ({
              id: `scan-${Date.now()}-${index}`,
              name: item.name,
              price: item.price.toString(), // Pastikan string untuk input
              selected: true
          }));

          setScannedItems(formattedItems);

      } catch (err) {
          console.error("Gemini Error:", err);
          alert("Gagal scan. Pastikan internet laju atau gambar jelas.");
          setScanStatus("Error. Cuba lagi.");
      }
      setIsScanning(false);
  };

  const addSelectedScannedItems = () => {
      const itemsToAdd = scannedItems.filter(i => i.selected);
      if (itemsToAdd.length === 0) return;

      const newMenuItems = itemsToAdd.map(i => ({
          id: `m${Date.now()}-${Math.random()}`,
          name: i.name,
          price: parseFloat(i.price),
          sharedBy: [] 
      }));

      setMenuItems([...menuItems, ...newMenuItems]);
      
      const currentTotal = parseFloat(billTotal) || 0;
      const scannedTotal = itemsToAdd.reduce((sum, i) => sum + parseFloat(i.price), 0);
      
      if (currentTotal === 0) {
          setBillTotal(scannedTotal.toFixed(2));
      }

      setShowScanModal(false);
  };

  const toggleScanItem = (id: string) => {
      setScannedItems(items => items.map(i => i.id === id ? { ...i, selected: !i.selected } : i));
  };
  
  const updateScannedItem = (id: string, field: 'name' | 'price', val: string) => {
       setScannedItems(items => items.map(i => i.id === id ? { ...i, [field]: val } : i));
  };

  const deleteScannedItem = (id: string) => {
      setScannedItems(items => items.filter(i => i.id !== id));
  };

  // --- IMAGE & UPLOAD ---
  const handleOpenImage = async () => { 
    if (!receiptRef.current) return;
    setIsSharing(true);
    await new Promise(r => setTimeout(r, 200));
    try {
        const canvas = await html2canvas(receiptRef.current, { backgroundColor: darkMode ? "#000000" : "#E5E7EB", scale: 2, useCORS: true, allowTaint: true, logging: false });
        canvas.toBlob((blob) => { if (blob) { const url = URL.createObjectURL(blob); const newWindow = window.open(url, '_blank'); if (!newWindow) alert("Pop-up diblock!"); } else alert("Gagal."); setIsSharing(false); }, "image/png");
    } catch (err) { alert("Ralat Kritikal."); setIsSharing(false); }
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

  // --- BRUTAL STYLES ---
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
                <div className="flex gap-2 items-center">
                    <button onClick={() => setShowCurrencyModal(true)} className={`w-10 h-10 text-xs font-black ${buttonBase}`}>{currency}</button>
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
                            <span className="text-xl font-mono font-black">{currency}{totalSpent.toFixed(2)}</span>
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
                                            <div className="text-right"><div className="font-mono font-black text-xl">{currency}{bill.totalAmount.toFixed(2)}</div>{expandedBillId === bill.id ? <ChevronUp size={20} className="ml-auto mt-1"/> : <ChevronDown size={20} className="ml-auto mt-1"/>}</div>
                                        </div>
                                        {expandedBillId === bill.id && (
                                            <div className={`text-sm border-t-2 p-5 space-y-3 ${darkMode ? "border-white bg-[#1a1a1a]" : "border-black bg-gray-50"}`}>
                                                {/* SHOW MENU ITEMS IF ITEMIZED */}
                                                {bill.type === "ITEMIZED" && bill.menuItems && bill.menuItems.length > 0 && (
                                                    <div className="mb-4 pb-4 border-b border-dashed border-current border-opacity-20">
                                                        <p className="text-[10px] font-bold uppercase opacity-50 mb-2">Menu Dipesan:</p>
                                                        {bill.menuItems.map(m => (
                                                            <div key={m.id} className="flex justify-between text-xs py-1">
                                                                <span>{m.name} ({m.sharedBy.map(pid => people.find(p=>p.id===pid)?.name).join(", ")})</span>
                                                                <span className="font-mono opacity-70">{currency}{m.price.toFixed(2)}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                                {bill.details.map(d => (
                                                    <div key={d.personId} className="flex justify-between items-center py-2 border-b border-dashed border-current border-opacity-20 last:border-0"><span className="font-bold">{people.find(p=>p.id === d.personId)?.name}</span><span className="font-mono font-black text-base">{currency}{d.total.toFixed(2)}</span></div>
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
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2"><CheckCircle size={16}/> Final Settlement</h2>
                                <button onClick={copyWhatsAppSummary} className={`px-2 py-1 rounded text-[10px] font-bold border-2 transition-all ${darkMode ? "border-white bg-white text-black" : "border-black bg-black text-white"}`}>
                                    {copied ? "COPIED" : "COPY FOR WHATSAPP"}
                                </button>
                            </div>
                            <div className={`${cardStyle} p-6 ${shadowStyle} ${darkMode ? "bg-[#222]" : "bg-lime-200"}`}>
                                <div className="mb-6 text-center border-b-2 border-current border-opacity-10 pb-4"><span className="text-[10px] uppercase font-bold opacity-60">Total Hangus</span><div className="text-3xl font-mono font-black mt-1">{currency}{totalSpent.toFixed(2)}</div></div>
                                <div className="grid grid-cols-2 gap-3 mb-6">{netPeople.map(p => (<div key={p.id} className={`p-4 border-2 rounded-xl flex flex-col gap-1 ${darkMode ? "border-white bg-[#333]" : "border-black bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"}`}><span className="text-xs font-bold uppercase opacity-70">{p.name}</span><span className={`text-lg font-mono font-black ${p.net > 0 ? (darkMode ? "text-green-400" : "text-green-600") : p.net < 0 ? (darkMode ? "text-red-400" : "text-red-600") : "opacity-50"}`}>{p.net > 0 ? "+" : ""}{p.net.toFixed(2)}</span></div>))}</div>
                                <div className={`rounded-xl border-2 overflow-hidden ${darkMode ? "bg-[#121212] border-white" : "bg-white border-black"}`}>
                                    <div className={`p-4 flex justify-between items-center border-b-2 ${darkMode ? "bg-white/10 border-white/20" : "bg-gray-100 border-black/10"}`}><span className={`text-[10px] uppercase tracking-widest font-black opacity-60 ${darkMode ? "text-white" : "text-black"}`}>Senarai Transfer</span></div>
                                    {txs.length === 0 ? (<div className="flex flex-col items-center justify-center py-8 opacity-50 gap-2"><CheckCircle size={24}/><p className="text-xs font-bold uppercase">Semua setel! Tiada hutang.</p></div>) : (<div className="divide-y-2 divide-current divide-dashed divide-opacity-10">{txs.map((t, i) => {const isPaid = paidStatus[`${t.fromId}-${t.toId}`];return (<div key={i} className={`flex justify-between items-center font-mono text-sm p-4 transition-colors ${isPaid ? (darkMode ? "bg-green-900/20" : "bg-green-100") : ""}`}><div className="flex flex-col gap-1"><div className="flex items-center gap-2 font-bold"><span className={isPaid ? "opacity-50 line-through decoration-2" : (darkMode ? "text-red-400" : "text-red-600")}>{t.fromName}</span><ArrowRight size={14} className="opacity-50"/><span className={isPaid ? "opacity-50" : (darkMode ? "text-green-400" : "text-green-600")}>{t.toName}</span></div><div className="flex items-center gap-2"><span className={`text-[10px] px-1.5 py-0.5 rounded border border-current opacity-70 ${isPaid ? "text-green-600 border-green-600" : ""}`}>{isPaid ? "PAID" : "UNPAID"}</span><span className="text-[10px] opacity-50">{currency}{t.amount.toFixed(2)}</span></div></div><button onClick={() => {setActiveTransfer(t); setShowPayModal(true)}} className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg border-2 flex items-center gap-2 transition-all ${isPaid ? (darkMode ? "bg-transparent border-green-500 text-green-500 hover:bg-green-500/20" : "bg-white border-green-600 text-green-600 hover:bg-green-50") : (darkMode ? "bg-white text-black hover:bg-green-400" : "bg-black text-white hover:bg-green-500 hover:border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px]")}`}>{isPaid ? <Check size={12}/> : <CreditCard size={12}/>} {isPaid ? "DONE" : "BAYAR"}</button></div>)})}</div>)}
                                </div>
                            </div>
                        </section>
                    )}
                    <div className="pt-8 pb-10 text-center space-y-4">
                        <button onClick={resetData} className="mx-auto px-5 py-2 rounded-full border border-red-500 text-red-500 text-[9px] font-bold uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2"><RotateCcw size={12}/> Reset Data</button>
                        <div className="opacity-40"><p className="text-[10px] font-black uppercase tracking-widest">SplitIt. by kmlxly</p><p className="text-[9px] font-mono mt-1">v2.6.2 (Gemini AI Scan)</p></div>
                    </div>
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
                            <div className="space-y-2">
                                <label className="text-xs uppercase font-black tracking-wider opacity-70">Total Resit ({currency})</label>
                                <input type="number" value={billTotal} onChange={e => setBillTotal(e.target.value)} placeholder="0.00" className={`${inputStyle} text-2xl font-black font-mono`}/>
                                {/* NEW: QUICK TAX TOGGLES */}
                                <div className="flex gap-2 pt-2">
                                    <button onClick={() => applyQuickTax(6)} className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider border-2 rounded-lg transition-all active:scale-95 ${darkMode ? "border-white hover:bg-white hover:text-black" : "border-black hover:bg-black hover:text-white"}`}>+6% SST</button>
                                    <button onClick={() => applyQuickTax(10)} className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider border-2 rounded-lg transition-all active:scale-95 ${darkMode ? "border-white hover:bg-white hover:text-black" : "border-black hover:bg-black hover:text-white"}`}>+10% SC</button>
                                </div>
                            </div>
                            <div className="space-y-2"><label className="text-xs uppercase font-black tracking-wider opacity-70">Tukang Bayar</label><div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">{people.map(p => (<button key={p.id} onClick={() => setPayerId(p.id)} className={`px-4 py-3 rounded-xl text-sm font-bold border-2 whitespace-nowrap transition-all ${payerId === p.id ? (darkMode ? "bg-white text-black border-white shadow-[2px_2px_0px_0px_#ffffff50]" : "bg-black text-white border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] translate-x-[-2px] translate-y-[-2px]") : (darkMode ? "border-[#444] text-gray-400 hover:border-white" : "border-gray-300 text-gray-500 hover:border-black hover:text-black hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]")}`}>{p.name}</button>))}</div></div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                             <button onClick={() => setBillType("EQUAL")} className={`p-4 rounded-xl border-2 text-sm font-black uppercase tracking-wider transition-all flex flex-col items-center gap-2 ${billType === "EQUAL" ? (darkMode ? "border-green-400 bg-green-400/20 text-green-400" : "border-black bg-green-300 text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] translate-x-[-2px] translate-y-[-2px]") : (darkMode ? "border-[#444] opacity-50 hover:opacity-100" : "border-black bg-white opacity-50 hover:opacity-100 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]")}`}><span className="text-2xl">🍰</span> KONGSI RATA</button>
                             <button onClick={() => setBillType("ITEMIZED")} className={`p-4 rounded-xl border-2 text-sm font-black uppercase tracking-wider transition-all flex flex-col items-center gap-2 ${billType === "ITEMIZED" ? (darkMode ? "border-blue-400 bg-blue-400/20 text-blue-400" : "border-black bg-blue-300 text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] translate-x-[-2px] translate-y-[-2px]") : (darkMode ? "border-[#444] opacity-50 hover:opacity-100" : "border-black bg-white opacity-50 hover:opacity-100 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]")}`}><span className="text-2xl">🧾</span> SPLIT ITEM</button>
                        </div>

                        {billType === "ITEMIZED" && (
                            <div className="space-y-6 animate-in fade-in">
                                
                                {/* 1. SCAN BUTTON (DUDUK LUAR & JELAS) */}
                                <div className="flex flex-col gap-2">
                                    <button onClick={() => setShowScanMethodModal(true)} className={`w-full py-3 rounded-xl border-2 flex items-center justify-center gap-2 font-black uppercase text-xs transition-all active:scale-95 ${darkMode ? "bg-indigo-500 text-white border-indigo-400" : "bg-indigo-100 text-indigo-700 border-indigo-300 hover:bg-indigo-200"}`}>
                                        <Camera size={16}/> Scan Resit (Auto-Fill)
                                    </button>
                                    <div className="flex items-center gap-2 opacity-40">
                                        <div className="h-[1px] bg-current flex-1"></div>
                                        <span className="text-[9px] font-bold uppercase">ATAU MANUAL</span>
                                        <div className="h-[1px] bg-current flex-1"></div>
                                    </div>
                                </div>

                                {/* 2. INPUT CARD (LEBIH KEMAS) */}
                                <div className={`${cardStyle} p-4 space-y-4 ${darkMode ? "bg-[#1E1E1E]" : "bg-white"} ${shadowStyle} overflow-hidden transition-all duration-300`}>
                                    
                                    {/* Input Baris 1: Nama & Harga */}
                                    <div className="flex gap-3">
                                        <div className="flex-[2] space-y-1">
                                            <label className="text-[9px] font-bold uppercase opacity-50 ml-1">Nama Item</label>
                                            <input value={newItemName} onChange={e => setNewItemName(e.target.value)} placeholder="cth: Nasi Goreng" className={`${inputStyle} text-sm py-2`}/>
                                        </div>
                                        <div className="flex-1 space-y-1 relative">
                                            <label className="text-[9px] font-bold uppercase opacity-50 ml-1">Harga</label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold opacity-50">{currency}</span>
                                                <input type="number" value={newItemPrice} onChange={e => setNewItemPrice(e.target.value)} placeholder="0.00" className={`${inputStyle} pl-8 text-sm py-2`}/>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Input Baris 2: Orang & Add Button */}
                                    <div className="pt-2 border-t border-dashed border-current border-opacity-20">
                                        <div className="flex justify-between items-center mb-2">
                                            <label className="flex items-center gap-2 text-[10px] font-bold cursor-pointer opacity-70 hover:opacity-100"><input type="checkbox" checked={isMultiSelectMode} onChange={toggleMultiSelect} className="accent-blue-500 w-3 h-3 rounded-sm"/>Kongsi ramai-ramai?</label>
                                            {isMultiSelectMode && <span className="text-[9px] text-blue-500 font-bold bg-blue-500/10 px-2 py-0.5 rounded">Split Mode ON</span>}
                                        </div>
                                        
                                        <div className={`flex gap-2 pb-2 ${isMultiSelectMode ? "flex-wrap" : "overflow-x-auto scrollbar-none"}`}>
                                            {people.map(p => {
                                                const isSelected = newItemSharedBy.includes(p.id);
                                                return (
                                                    <button key={p.id} onClick={() => selectPersonForMenu(p.id)} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border-2 whitespace-nowrap transition-all flex items-center gap-1 
                                                        ${isSelected 
                                                            ? (darkMode ? "bg-blue-400 text-black border-blue-400" : "bg-blue-500 text-white border-blue-500 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] translate-x-[-1px] translate-y-[-1px]") 
                                                            : (darkMode ? "border-[#444] text-gray-400 hover:border-white" : "border-gray-200 text-gray-400 hover:border-black")}`}>
                                                        {isMultiSelectMode ? (isSelected ? <Check size={10}/> : <div className="w-2.5 h-2.5 rounded-sm border border-current opacity-50"/>) : <User size={10}/>}
                                                        <span className={isSelected ? (darkMode ? "text-black" : "text-white") : ""}>{p.name}</span>
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>

                                    <button disabled={!newItemName || !newItemPrice || newItemSharedBy.length === 0} onClick={addMenuItem} className={`w-full py-3 rounded-xl text-xs font-black uppercase tracking-wider border-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${darkMode ? "bg-white text-black border-white hover:bg-gray-200" : "bg-black text-white border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]"}`}>+ Tambah Item</button>
                                </div>

                                {/* LIST ITEM (KOD ASAL, Cuma Refined Sikit Jarak) */}
                                {menuItems.map((item) => (
                                    <div key={item.id} className={`p-3 border-2 rounded-xl flex justify-between items-center animate-in slide-in-from-bottom-2 ${darkMode ? "bg-[#222] border-white/20" : "bg-white border-black/10"}`}>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="font-bold text-sm">{item.name}</span>
                                                <span className="font-mono font-black text-sm">{currency}{item.price.toFixed(2)}</span>
                                            </div>
                                            <div className="flex flex-wrap gap-1">
                                                {item.sharedBy.map(pid => (
                                                    <span key={pid} className={`text-[9px] px-2 py-1 rounded font-black border-2 ${darkMode ? "bg-white text-black border-white" : "bg-white text-black border-black text-opacity-100"}`}>
                                                        {people.find(p=>p.id===pid)?.name}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        <button onClick={() => removeMenuItem(item.id)} className="ml-2 p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"><Trash2 size={16}/></button>
                                    </div>
                                ))}

                                {/* FOOTER INPUTS (Tax/Discount) */}
                                <div className={`${cardStyle} p-4 space-y-4 ${darkMode ? "bg-[#1E1E1E]" : "bg-violet-100"} ${shadowStyle}`}>
                                    <div className="flex gap-3">
                                        <div className="flex-1 space-y-1"><label className="text-[9px] uppercase font-black opacity-70 flex items-center gap-1"><Bike size={12}/> Caj Tetap</label><input type="number" placeholder="0.00" value={miscFee} onChange={e => setMiscFee(e.target.value)} className={`${inputStyle} py-2 font-mono text-sm`}/></div>
                                        <div className="flex-1 space-y-1"><label className="text-[9px] uppercase font-black opacity-70 flex items-center gap-1"><Tag size={12}/> Diskaun</label><input type="number" placeholder="0.00" value={discountFee} onChange={e => setDiscountFee(e.target.value)} className={`${inputStyle} py-2 font-mono text-sm ${darkMode ? "focus:border-green-400" : "focus:border-green-500"}`}/></div>
                                    </div>
                                </div>

                                <div className={`p-4 border-2 rounded-xl ${shadowStyle} ${taxGap > 0.05 ? (darkMode ? "border-blue-400 bg-blue-400/10" : "border-black bg-blue-200") : taxGap < -0.05 ? (darkMode ? "border-red-400 bg-red-400/10" : "border-black bg-red-200") : (darkMode ? "border-green-400 bg-green-400/10" : "border-black bg-green-200")}`}>
                                    <div className="flex justify-between items-center mb-2"><span className="text-[10px] uppercase font-black tracking-widest flex items-center gap-2">{taxGap > 0.05 ? <AlertCircle size={14}/> : taxGap < -0.05 ? <X size={14}/> : <CheckCircle size={14}/>}{taxGap > 0.05 ? "BAKI (TAX/SERVIS)" : taxGap < -0.05 ? "TERLEBIH KIRA!" : "NGAM-NGAM!"}</span><span className="font-mono font-black text-lg">{taxGap < 0 ? "-" : ""}{currency}{Math.abs(taxGap).toFixed(2)}</span></div>
                                    {(taxGap > 0.05 || parseFloat(discountFee) > 0) && (
                                        <div className={`space-y-2 mt-3 pt-3 border-t-2 border-current ${darkMode ? "border-opacity-30" : "border-black"}`}>
                                            {taxGap > 0.05 && (<div className="flex items-center justify-between"><span className="text-[9px] font-bold opacity-70">Agih Tax:</span><div className="flex gap-1"><button onClick={() => setTaxMethod("PROPORTIONAL")} className={`text-[9px] font-bold px-2 py-1 rounded border transition-all ${taxMethod === "PROPORTIONAL" ? (darkMode ? "bg-blue-400 text-black border-blue-400" : "bg-black text-white border-black") : "border-current opacity-50 hover:opacity-100"}`}>% MAKAN</button><button onClick={() => setTaxMethod("EQUAL_SPLIT")} className={`text-[9px] font-bold px-2 py-1 rounded border transition-all ${taxMethod === "EQUAL_SPLIT" ? (darkMode ? "bg-blue-400 text-black border-blue-400" : "bg-black text-white border-black") : "border-current opacity-50 hover:opacity-100"}`}>SAMA RATA</button></div></div>)}
                                            {parseFloat(discountFee) > 0 && (<div className="flex items-center justify-between"><span className="text-[9px] font-bold opacity-70">Agih Diskaun:</span><div className="flex gap-1"><button onClick={() => setDiscountMethod("PROPORTIONAL")} className={`text-[9px] font-bold px-2 py-1 rounded border transition-all ${discountMethod === "PROPORTIONAL" ? (darkMode ? "bg-green-400 text-black border-green-400" : "bg-black text-white border-black") : "border-current opacity-50 hover:opacity-100"}`}>% MAKAN</button><button onClick={() => setDiscountMethod("EQUAL_SPLIT")} className={`text-[9px] font-bold px-2 py-1 rounded border transition-all ${discountMethod === "EQUAL_SPLIT" ? (darkMode ? "bg-green-400 text-black border-green-400" : "bg-black text-white border-black") : "border-current opacity-50 hover:opacity-100"}`}>SAMA RATA</button></div></div>)}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}                    </div>
                    <button disabled={!billTitle || !billTotal || (billType === "ITEMIZED" && taxGap < -0.1)} onClick={saveBill} className={`w-full py-5 rounded-xl text-sm font-black uppercase tracking-widest border-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none ${darkMode ? "bg-white text-black border-white hover:bg-gray-200" : "bg-lime-300 text-black border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px]"}`}>{editingBillId ? "KEMASKINI BILL SEKARANG" : "SIMPAN BILL NI"}</button>
                </div>
            )}
            
            {showPaymentModal && paymentProfileId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
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
                                <div className="text-center border-b-2 border-dashed border-black/20 pb-4 mb-4"><p className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-1">TOTAL BAYARAN</p><h2 className="text-3xl font-black font-mono">{currency}{activeTransfer.amount.toFixed(2)}</h2></div>
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

            {/* SCANNING METHOD MODAL (NEW) */}
            {showScanMethodModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
                    <div className={`w-full max-w-[320px] p-6 rounded-2xl border-2 ${darkMode ? "bg-[#1E1E1E] border-white text-white" : "bg-white border-black text-black"} shadow-2xl relative animate-in zoom-in-95`}>
                        <div className="flex justify-between items-center mb-6">
                             <h3 className="text-lg font-black uppercase flex items-center gap-2"><Camera size={20}/> Pilih Sumber Resit</h3>
                             <button onClick={() => setShowScanMethodModal(false)}><X size={20}/></button>
                        </div>
                        <div className="space-y-4">
                            {/* CAMERA OPTION */}
                            <label className={`block w-full p-4 rounded-xl border-2 text-center cursor-pointer transition-all active:scale-95 hover:bg-opacity-10 ${darkMode ? "border-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20" : "border-indigo-600 bg-indigo-50 hover:bg-indigo-100"}`}>
                                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleScanReceipt}/>
                                <Camera size={32} className={`mx-auto mb-2 ${darkMode ? "text-indigo-400" : "text-indigo-600"}`}/>
                                <span className="block font-black uppercase text-sm">Ambil Gambar (Camera)</span>
                            </label>
                            
                            {/* GALLERY OPTION */}
                            <label className={`block w-full p-4 rounded-xl border-2 text-center cursor-pointer transition-all active:scale-95 hover:bg-opacity-10 ${darkMode ? "border-white/30 bg-white/5 hover:bg-white/10" : "border-black/20 bg-gray-50 hover:bg-gray-100"}`}>
                                <input type="file" accept="image/*" className="hidden" onChange={handleScanReceipt}/>
                                <ImageIcon size={32} className="mx-auto mb-2 opacity-50"/>
                                <span className="block font-black uppercase text-sm opacity-70">Pilih Dari Gallery</span>
                            </label>
                        </div>
                    </div>
                </div>
            )}

            {/* SCANNING RESULTS MODAL */}
            {showScanModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
                    <div className={`w-full max-w-[360px] max-h-[85vh] flex flex-col rounded-2xl border-2 ${darkMode ? "bg-[#1E1E1E] border-white text-white" : "bg-white border-black text-black"} shadow-2xl relative animate-in zoom-in-95`}>
                        {isScanning ? (
                            <div className="flex-1 flex flex-col items-center justify-center p-10 text-center space-y-4">
                                <Loader2 size={48} className="animate-spin text-blue-500"/>
                                <div>
                                    <h3 className="text-xl font-black uppercase">Sedang Scan...</h3>
                                    <p className="text-xs font-bold opacity-60 mt-1">{scanStatus}</p>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="p-4 border-b border-current border-opacity-10 flex justify-between items-center">
                                    <h3 className="text-sm font-black uppercase flex items-center gap-2"><Camera size={16}/> Hasil Scan AI</h3>
                                    <button onClick={() => setShowScanModal(false)}><X size={20}/></button>
                                </div>
                                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                    {scannedItems.length === 0 ? (
                                        <div className="text-center py-10 opacity-50">
                                            <p className="text-xs font-bold">Tak jumpa item. Cuba scan lagi.</p>
                                        </div>
                                    ) : (
                                        scannedItems.map(item => (
                                            <div key={item.id} className={`flex items-start gap-2 p-3 rounded-xl border-2 transition-all ${item.selected ? (darkMode ? "border-green-400 bg-green-400/10" : "border-green-500 bg-green-50") : (darkMode ? "border-white/20 opacity-50" : "border-black/20 opacity-50")}`}>
                                                <input type="checkbox" checked={item.selected} onChange={() => toggleScanItem(item.id)} className="mt-1 accent-green-500 w-4 h-4"/>
                                                <div className="flex-1 space-y-1">
                                                    <input value={item.name} onChange={e => updateScannedItem(item.id, 'name', e.target.value)} className="w-full bg-transparent font-bold text-xs outline-none border-b border-transparent focus:border-current"/>
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-[10px] opacity-50">{currency}</span>
                                                        <input type="number" value={item.price} onChange={e => updateScannedItem(item.id, 'price', e.target.value)} className="w-20 bg-transparent font-mono font-black text-sm outline-none border-b border-transparent focus:border-current"/>
                                                    </div>
                                                </div>
                                                <button onClick={() => deleteScannedItem(item.id)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg"><Trash2 size={14}/></button>
                                            </div>
                                        ))
                                    )}
                                </div>
                                <div className="p-4 border-t border-current border-opacity-10">
                                    <button onClick={addSelectedScannedItems} className={`w-full py-3 rounded-xl font-black uppercase text-xs border-2 ${darkMode ? "bg-white text-black border-white" : "bg-black text-white border-black"} shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all`}>
                                        Masukkan {scannedItems.filter(i => i.selected).length} Item Ke Bill
                                    </button>
                                </div>
                            </>
                        )}
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
            
            {/* CURRENCY MODAL */}
            {showCurrencyModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
                    <div className={`w-full max-w-[320px] p-6 rounded-[2rem] border-2 ${darkMode ? "bg-zinc-900 border-white text-white" : "bg-white border-black text-black"} shadow-2xl relative`}>
                        <button onClick={() => setShowCurrencyModal(false)} className="absolute top-5 right-5 opacity-50 hover:opacity-100"><X size={20}/></button>
                        <h2 className="text-xl font-black uppercase mb-6 flex items-center gap-2 tracking-tighter"><Globe size={24}/> Pilih Mata Wang</h2>
                        <div className="grid grid-cols-2 gap-3">
                            {[{ s: "RM", n: "Malaysia" }, { s: "S$", n: "Singapore" }, { s: "฿", n: "Thailand" }, { s: "Rp", n: "Indonesia" }, { s: "₱", n: "Philippines" }, { s: "₫", n: "Vietnam" }].map((c) => (
                                <button key={c.s} onClick={() => { setCurrency(c.s); setShowCurrencyModal(false); }} className={`p-4 rounded-xl border-2 flex flex-col items-center gap-1 transition-all active:scale-95 ${currency === c.s ? (darkMode ? "bg-white text-black border-white" : "bg-black text-white border-black") : "border-current opacity-50 hover:opacity-100"}`}>
                                    <span className="text-2xl font-black">{c.s}</span><span className="text-[9px] uppercase font-bold tracking-widest opacity-70">{c.n}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </main>
      </div>
    </div>
  );
}