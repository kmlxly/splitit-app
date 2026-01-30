"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import html2canvas from "html2canvas";
import AuthModal from "@/components/Auth";
import Cropper from "react-easy-crop";
import { supabase } from "../../lib/supabaseClient"; // Path updated
import {
    Moon, Sun, CheckCircle, Trash2,
    Edit3, Copy, Check, Bike, Tag, RotateCcw, Plus, X,
    ChevronDown, ChevronUp, Receipt, Users, AlertCircle,
    CreditCard, QrCode, Upload, Wallet, ExternalLink, ArrowRight, Info, Folder, Calculator, Save, ShoppingBag, User, Globe, Camera, Loader2, Image as ImageIcon, XCircle, List, Crop, UserPlus
} from "lucide-react";

// --- 1. HELPER FUNCTIONS ---
const APP_VERSION = "v5.1.0 (Real-time Sync)";

// --- 2. CURRENCY API HELPER (FREE) ---
// Mapping: App Symbol -> API Currency Code
const CURRENCY_MAP: Record<string, string> = {
    "RM": "MYR",
    "MYR": "MYR",
    "THB": "THB",
    "฿": "THB",
    "IDR": "IDR",
    "Rp": "IDR",
    "SGD": "SGD",
    "S$": "SGD",
    "VND": "VND",
    "₫": "VND",
    "PHP": "PHP",
    "₱": "PHP",
    "USD": "USD",
    "$": "USD",
    "JPY": "JPY",
    "¥": "JPY",
    "CNY": "CNY",
    "KRW": "KRW",
    "₩": "KRW",
    "EUR": "EUR",
    "€": "EUR",
    "GBP": "GBP",
    "£": "GBP",
    "AUD": "AUD",
};

// Reverse mapping: API Code -> App Symbol (for display)
const API_TO_SYMBOL: Record<string, string> = {
    "MYR": "RM",
    "THB": "฿",
    "IDR": "Rp",
    "SGD": "S$",
    "VND": "₫",
    "PHP": "₱",
    "USD": "$",
    "JPY": "¥",
    "CNY": "¥",
    "KRW": "₩",
    "EUR": "€",
    "GBP": "£",
    "AUD": "$",
};

const fetchExchangeRate = async (fromCurr: string, toCurr: string) => {
    try {
        // Convert app symbols to API currency codes
        const apiFrom = CURRENCY_MAP[fromCurr] || fromCurr;
        const apiTo = CURRENCY_MAP[toCurr] || toCurr;

        // If same currency, return 1
        if (apiFrom === apiTo) return 1;

        // Fetch exchange rate from API
        const res = await fetch(`https://api.exchangerate-api.com/v4/latest/${apiFrom}`);
        if (!res.ok) {
            console.error("Exchange rate API error:", res.status);
            return null;
        }

        const data = await res.json();

        // Get rate for target currency
        const rate = data.rates?.[apiTo];

        if (!rate) {
            console.error(`Rate not found for ${apiTo}`);
            return null;
        }

        return rate; // Return exact rate
    } catch (e) {
        console.error("Gagal tarik rate:", e);
        return null;
    }
};

// Helper: Create Image element
const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
        const image = new Image();
        image.addEventListener("load", () => resolve(image));
        image.addEventListener("error", (error) => reject(error));
        image.setAttribute("crossOrigin", "anonymous");
        image.src = url;
    });

// Helper: Crop Image Logic
async function getCroppedImg(imageSrc: string, pixelCrop: any): Promise<string> {
    const image = await createImage(imageSrc);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) return "";

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height
    );

    return canvas.toDataURL("image/jpeg", 0.9);
}

// Helper: Compress Image
const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement("canvas");
                const MAX_WIDTH = 1024;
                const MAX_HEIGHT = 1024;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
                } else {
                    if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext("2d");
                ctx?.drawImage(img, 0, 0, width, height);

                const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
                const base64 = dataUrl.split(",")[1];
                resolve(base64);
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
};

// --- DATABASE CONVERTERS (SQL <-> APP) ---
const mapSqlBillToLocal = (sqlBill: any): Bill => ({
    id: sqlBill.id,
    title: sqlBill.title,
    type: sqlBill.type as BillType,
    totalAmount: Number(sqlBill.total_amount),
    paidBy: sqlBill.paid_by,
    details: sqlBill.details || [],
    menuItems: sqlBill.menu_items || [],
    itemsSubtotal: 0,
    miscAmount: Number(sqlBill.misc_amount || 0),
    discountAmount: Number(sqlBill.discount_amount || 0),
    taxMethod: sqlBill.tax_method || "PROPORTIONAL",
    discountMethod: sqlBill.discount_method || "PROPORTIONAL",
    originalCurrency: sqlBill.original_currency || null,
    originalAmount: Number(sqlBill.original_amount || 0),
    exchangeRate: Number(sqlBill.exchange_rate || 1)
});

const mapLocalBillToSql = (bill: Bill, sessionId: string) => ({
    id: bill.id,
    session_id: sessionId,
    title: bill.title,
    type: bill.type,
    total_amount: bill.totalAmount,
    paid_by: bill.paidBy,
    details: bill.details,
    menu_items: bill.menuItems,
    misc_amount: bill.miscAmount,
    discount_amount: bill.discountAmount,
    tax_method: bill.taxMethod,
    discount_method: bill.discountMethod,
    original_currency: bill.originalCurrency,
    original_amount: bill.originalAmount,
    exchange_rate: bill.exchangeRate,
    created_at: new Date().toISOString()
});

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

    // --- V5 UPDATE: Tambah 3 field ini supaya error hilang ---
    originalCurrency?: string; // cth: "THB"
    originalAmount?: number;   // cth: 150
    exchangeRate?: number;     // cth: 0.13
};
type Transfer = { fromId: string; toId: string; fromName: string; toName: string; amount: number; };

type Session = {
    id: string;
    name: string;
    ownerId?: string;
    isShared?: boolean;
    createdAt: number;
    people: Person[];
    bills: Bill[];
    paidStatus: Record<string, boolean>;
    currency?: string;
};

type ScannedItem = {
    id: string;
    name: string;
    price: string;
    selected: boolean;
    sharedBy: string[];
};

// --- MAIN COMPONENT ---
function SplitItContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    // --- STATE ---
    const [darkMode, setDarkMode] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);

    // Auth & Sync State
    const [user, setUser] = useState<any>(null);
    const [syncStatus, setSyncStatus] = useState<"SAVED" | "SAVING" | "ERROR" | "OFFLINE" | "SYNCING">("OFFLINE");
    const [pendingChanges, setPendingChanges] = useState(false);

    // Data State
    const [sessions, setSessions] = useState<Session[]>([]);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

    // UI Modal States
    const [showSessionModal, setShowSessionModal] = useState(false);
    const [showCurrencyModal, setShowCurrencyModal] = useState(false);
    const [showLoginGuide, setShowLoginGuide] = useState(false);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [showScanModal, setShowScanModal] = useState(false);
    const [showScanMethodModal, setShowScanMethodModal] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    // Crop Modal State
    const [tempQrImage, setTempQrImage] = useState<string | null>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

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
    const [scannedExtraInfo, setScannedExtraInfo] = useState({ tax: 0, service: 0, discount: 0, deposit: 0 });
    const [includeScannedTax, setIncludeScannedTax] = useState(true);
    const [includeScannedDiscount, setIncludeScannedDiscount] = useState(true);

    // Refs
    const receiptRef = useRef<HTMLDivElement>(null);

    // Form Inputs
    const [editingBillId, setEditingBillId] = useState<string | null>(null);
    const [billType, setBillType] = useState<BillType>("EQUAL");
    const [billTitle, setBillTitle] = useState("");
    const [billTotal, setBillTotal] = useState("");
    const [formCurrency, setFormCurrency] = useState("RM"); // Default currency form
    const [exchangeRate, setExchangeRate] = useState("1");  // Default rate 1:1
    const [foreignAmount, setForeignAmount] = useState(""); // Input nilai asing (cth: 100 THB)
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
    const [editingItemId, setEditingItemId] = useState<string | null>(null);

    // 1. Trigger bila tekan butang LOGIN (Buka Warning dulu)
    const handleLoginClick = () => {
        setShowLoginGuide(true);
    };

    // 2. Lepas faham warning, buka Menu Pilihan (Google/Email)
    const openAuthOptions = () => {
        setShowLoginGuide(false); // Tutup warning
        setShowAuthModal(true);   // Buka AuthModal
    };

    // --- V5 FIX: AUTO-CALCULATE (MESIN KIRA AGRESIF) ---
    useEffect(() => {
        // 1. Pastikan bukan mode base currency (same currency)
        if (formCurrency === currency) return;

        // 2. Tukar string kepada nombor (Guna Number() lebih selamat dari parseFloat)
        const amount = Number(foreignAmount);
        const rate = Number(exchangeRate);

        // 3. Kira hanya jika nombor valid (Bukan NaN dan Rate > 0)
        if (!isNaN(amount) && !isNaN(rate) && rate > 0) {
            // Calculate: foreignAmount * rate = baseCurrencyAmount
            const totalBase = amount * rate;
            setBillTotal(totalBase.toFixed(2));
        }
    }, [foreignAmount, exchangeRate, formCurrency, currency]);
    // ^ Auto-calculate setiap kali foreignAmount, exchangeRate, formCurrency, atau base currency berubah 

    // --- HYBRID SYNC ENGINE ---

    // 1. Load Data (Cloud First -> Local Fallback)
    useEffect(() => {
        const initApp = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            const currentUser = session?.user;
            setUser(currentUser);

            // Check kalau ada link invite (?join=SESSION_ID)
            const joinSessionId = searchParams.get("join");

            if (currentUser) {
                setSyncStatus("SAVING");
                try {
                    // A. Kalau ada link invite, cuba join dulu
                    if (joinSessionId) {
                        const { data: alreadyMember } = await supabase.from('session_members').select('*').eq('session_id', joinSessionId).eq('user_id', currentUser.id).single();
                        if (!alreadyMember) {
                            await supabase.from('session_members').insert({ session_id: joinSessionId, user_id: currentUser.id });
                            alert("Berjaya join session member!");
                        }
                    }

                    // B. Tarik session sendiri (Owner)
                    const { data: mySessions } = await supabase.from('sessions').select('*').eq('owner_id', currentUser.id);

                    // C. Tarik session member (Shared)
                    const { data: sharedRaw } = await supabase.from('session_members').select('session_id, sessions(*)').eq('user_id', currentUser.id);

                    // Gabungkan dua-dua list
                    let allSessions = [...(mySessions || [])];
                    if (sharedRaw) {
                        sharedRaw.forEach((row: any) => {
                            // Pastikan tak duplicate dan session wujud
                            if (row.sessions && !allSessions.find(s => s.id === row.sessions.id)) {
                                allSessions.push(row.sessions);
                            }
                        });
                    }

                    // D. Tarik Bills untuk SEMUA session tadi
                    const sessionIds = allSessions.map(s => s.id);
                    let allBills: any[] = [];
                    if (sessionIds.length > 0) {
                        const { data: billData } = await supabase.from('bills').select('*').in('session_id', sessionIds);
                        allBills = billData || [];
                    }

                    // E. Convert Cloud Data to App Format
                    const cloudSessions: Session[] = allSessions.map(s => ({
                        id: s.id,
                        name: s.name,
                        ownerId: s.owner_id,
                        createdAt: new Date(s.created_at).getTime(),
                        currency: s.currency || "RM",
                        people: s.people || [],
                        paidStatus: s.paid_status || {},
                        bills: allBills.filter(b => b.session_id === s.id).map(mapSqlBillToLocal),
                        isShared: s.owner_id !== currentUser.id
                    }));

                    // F. MERGE WITH LOCAL STORAGE (Critical for Offline/Unsynced Data)
                    const savedSessions = localStorage.getItem("splitit_sessions");
                    let localSessions: Session[] = [];
                    if (savedSessions) {
                        try { localSessions = JSON.parse(savedSessions); } catch (e) { console.error("Local Parse Error", e); }
                    }

                    // Gabung: Ambil semua Cloud + Local dengan Smart Conflict Resolution
                    const mergedSessions = [...cloudSessions];

                    localSessions.forEach(localS => {
                        const cloudIndex = mergedSessions.findIndex(c => c.id === localS.id);

                        if (cloudIndex === -1) {
                            // CASE 1: Session tiada di Cloud (Belum sync) -> Add Local
                            mergedSessions.push(localS);
                        } else {
                            // CASE 2: Conflict - Session wujud di Cloud & Local. Compare!
                            const cloudS = mergedSessions[cloudIndex];

                            // Logik Mudah: Kalau Local ada lagi banyak bills dari Cloud, kita percaya Local 
                            // (Sebab mungkin Save Bill ke DB fail tadi tapi Session header lepas)
                            if (localS.bills.length > cloudS.bills.length) {
                                console.log(`Restoring Local Session [${localS.name}] (Local: ${localS.bills.length} bills vs Cloud: ${cloudS.bills.length})`);
                                mergedSessions[cloudIndex] = localS;
                            }
                        }
                    });

                    // Sort descending (latest first)
                    mergedSessions.sort((a, b) => b.createdAt - a.createdAt);

                    setSessions(mergedSessions);

                    // Auto-pilih session (utamakn yang baru join)
                    if (joinSessionId && mergedSessions.find(s => s.id === joinSessionId)) {
                        setActiveSessionId(joinSessionId);
                        router.replace("/splitit"); // Bersihkan URL
                    } else if (mergedSessions.length > 0) {
                        setActiveSessionId(mergedSessions[0].id); // First item is latest
                    } else {
                        // Kalau kosong sangat, buat satu local
                        const newSession: Session = {
                            id: crypto.randomUUID(), name: "Sesi Pertama", createdAt: Date.now(), ownerId: currentUser.id,
                            people: [{ id: "p1", name: "Aku" }, { id: "p2", name: "Member 1" }], bills: [], paidStatus: {}, currency: "RM"
                        };
                        setSessions([newSession]);
                        setActiveSessionId(newSession.id);
                    }
                    setSyncStatus("SAVED");

                } catch (err) {
                    console.error("Cloud Error:", err);
                    setSyncStatus("ERROR");
                }
            } else {
                // 2. OFFLINE MODE: Load dari LocalStorage
                if (joinSessionId) {
                    alert("Sila Login (Tekan ikon Orang kat atas) untuk join session kawan!");
                }
                setSyncStatus("OFFLINE");

                const savedSessions = localStorage.getItem("splitit_sessions");
                let parsedSessions: Session[] = [];

                // Cuba parse, kalau error jadikan array kosong
                if (savedSessions) {
                    try {
                        parsedSessions = JSON.parse(savedSessions);
                    } catch (e) {
                        parsedSessions = [];
                    }
                }

                // SAFETY CHECK: Pastikan array TIDAK KOSONG sebelum baca
                if (parsedSessions.length > 0) {
                    setSessions(parsedSessions);
                    // Restore last active session
                    const lastActive = localStorage.getItem("splitit_active_session_id");
                    if (lastActive && parsedSessions.find((s: Session) => s.id === lastActive)) {
                        setActiveSessionId(lastActive);
                    } else {
                        setActiveSessionId(parsedSessions[0].id);
                    }
                } else {
                    // Kalau array kosong atau user baru, buat session default
                    const newSession: Session = {
                        id: `s${Date.now()}`, name: "Sesi Lepak 1", createdAt: Date.now(),
                        people: [{ id: "p1", name: "Aku" }, { id: "p2", name: "Member 1" }],
                        bills: [], paidStatus: {}, currency: "RM"
                    };
                    setSessions([newSession]);
                    setActiveSessionId(newSession.id);
                }
            }
            setIsLoaded(true);
        };
        initApp();
    }, []);

    // 1.5 REALTIME LISTENER (Live Update)
    useEffect(() => {
        if (!user || !activeSessionId) return;

        // Langgan channel Supabase
        const channel = supabase.channel('realtime-room')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'bills', filter: `session_id=eq.${activeSessionId}` },
                async () => {
                    setSyncStatus("SYNCING");
                    const { data } = await supabase.from('bills').select('*').eq('session_id', activeSessionId);
                    if (data) {
                        const freshBills = data.map(mapSqlBillToLocal);
                        setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, bills: freshBills } : s));
                    }
                    setTimeout(() => setSyncStatus("SAVED"), 500);
                })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [activeSessionId, user]);

    // 2. Save Logic (Auto Sync with Debounce)
    useEffect(() => {
        if (!isLoaded) return;

        // A. Backup Local
        localStorage.setItem("splitit_sessions", JSON.stringify(sessions));
        localStorage.setItem("splitit_darkmode", String(darkMode));
        if (activeSessionId) localStorage.setItem("splitit_active_session_id", activeSessionId);

        // B. Cloud Sync
        if (user) {
            setSyncStatus("SAVING");
            setPendingChanges(true);

            const timer = setTimeout(async () => {
                try {
                    const currentSession = sessions.find(s => s.id === activeSessionId);
                    if (currentSession) {
                        // 1. Upsert Session (Only update if needed)
                        // Use original owner_id if exists, else fallback to current user
                        const ownerId = currentSession.ownerId || user.id;

                        const { error: sessError } = await supabase.from('sessions').upsert({
                            id: currentSession.id,
                            owner_id: ownerId,
                            name: currentSession.name,
                            currency: currentSession.currency || "RM", // Ensure currency has default
                            people: currentSession.people,
                            paid_status: currentSession.paidStatus,
                            updated_at: new Date().toISOString()
                        });

                        if (sessError) {
                            console.error("Session Sync Error (Likely RLS):", sessError);
                            // Don't throw here, usually members can't update session details but CAN update bills
                        }

                        // 2. Upsert Bills
                        if (currentSession.bills && currentSession.bills.length > 0) {
                            const billsPayload = currentSession.bills.map(b => mapLocalBillToSql(b, currentSession.id));
                            const { error: billError } = await supabase.from('bills').upsert(billsPayload);
                            if (billError) throw billError;
                        } else if (currentSession.bills && currentSession.bills.length === 0) {
                            // Handle case where all bills deleted? 
                            // Current logic doesn't delete bills here, only upserts. 
                            // Deletion is handled by deleteBill function.
                        }
                    }
                    setSyncStatus("SAVED");
                } catch (err) {
                    console.error("Auto-Save Error:", err);
                    setSyncStatus("ERROR");
                } finally {
                    setPendingChanges(false);
                }
            }, 2000);

            return () => clearTimeout(timer);
        }
    }, [sessions, darkMode, activeSessionId, isLoaded, user]);


    // --- LOGIC FUNCTIONS (ORIGINAL APP LOGIC) ---
    const resetData = () => {
        if (confirm("⚠️ AMARAN KRITIKAL:\n\nAdakah anda pasti nak RESET semua data?")) {
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
            id: user ? crypto.randomUUID() : `s${Date.now()}`,
            name: newSessionName, createdAt: Date.now(),
            people: [{ id: "p1", name: "Aku" }, { id: "p2", name: "Member 1" }],
            bills: [], paidStatus: {}, currency: "RM"
        };
        setSessions([...sessions, newSession]);
        setActiveSessionId(newSession.id);
        setNewSessionName("");
        setShowSessionModal(false);
        setMode("DASHBOARD");
    };

    const deleteSession = async (sid: string) => {
        if (sessions.length <= 1) { alert("Tinggal satu je sesi, tak boleh delete bos."); return; }
        if (confirm("Padam sesi ni?")) {
            const newSessions = sessions.filter(s => s.id !== sid);
            setSessions(newSessions);
            if (activeSessionId === sid) setActiveSessionId(newSessions[0].id);

            // Delete from Cloud if logged in
            if (user) {
                await supabase.from('sessions').delete().eq('id', sid);
            }
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

    // --- MENU ITEM LOGIC ---
    const addMenuItem = () => {
        if (!newItemName || !newItemPrice || newItemSharedBy.length === 0) return;
        const price = parseFloat(newItemPrice);
        if (isNaN(price)) return;

        if (editingItemId) {
            setMenuItems(prev => prev.map(item =>
                item.id === editingItemId
                    ? { ...item, name: newItemName, price: price, sharedBy: newItemSharedBy }
                    : item
            ));
            setEditingItemId(null);
        } else {
            const newItem: MenuItem = {
                id: `m${Date.now()}`,
                name: newItemName,
                price: price,
                sharedBy: newItemSharedBy
            };
            setMenuItems([...menuItems, newItem]);
        }
        setNewItemName(""); setNewItemPrice(""); setNewItemSharedBy([]); setIsMultiSelectMode(false);
    };

    const startEditItem = (item: MenuItem) => {
        setEditingItemId(item.id); setNewItemName(item.name); setNewItemPrice(String(item.price)); setNewItemSharedBy(item.sharedBy); setIsMultiSelectMode(item.sharedBy.length > 1);
    };
    const cancelEditItem = () => {
        setEditingItemId(null); setNewItemName(""); setNewItemPrice(""); setNewItemSharedBy([]); setIsMultiSelectMode(false);
    };
    const removeMenuItem = (mid: string) => {
        if (editingItemId === mid) cancelEditItem();
        setMenuItems(menuItems.filter(m => m.id !== mid));
    };
    const selectPersonForMenu = (pid: string) => {
        if (isMultiSelectMode) {
            if (newItemSharedBy.includes(pid)) { setNewItemSharedBy(newItemSharedBy.filter(id => id !== pid)); } else { setNewItemSharedBy([...newItemSharedBy, pid]); }
        } else { setNewItemSharedBy([pid]); }
    };
    const toggleMultiSelect = () => {
        const newMode = !isMultiSelectMode; setIsMultiSelectMode(newMode); if (!newMode) { if (newItemSharedBy.length > 1) setNewItemSharedBy([]); }
    };

    const startEditBill = (bill: Bill) => {
        setEditingBillId(bill.id); setBillTitle(bill.title); setBillTotal(String(bill.totalAmount));
        setBillType(bill.type); setPayerId(bill.paidBy);
        setMiscFee(bill.miscAmount > 0 ? String(bill.miscAmount) : "");
        setDiscountFee(bill.discountAmount > 0 ? String(bill.discountAmount) : "");
        setTaxMethod(bill.taxMethod); setDiscountMethod(bill.discountMethod);
        if (bill.menuItems) { setMenuItems(bill.menuItems); } else { setMenuItems([]); }
        setFormCurrency(bill.originalCurrency || currency);
        setForeignAmount(bill.originalAmount ? String(bill.originalAmount) : "");
        setExchangeRate(bill.exchangeRate ? String(bill.exchangeRate) : "1");

        setMode("FORM");
    };

    const resetForm = () => {
        setEditingBillId(null); setBillTitle(""); setBillTotal(""); setBillType("EQUAL");
        setMiscFee(""); setDiscountFee(""); setMenuItems([]);
        setPayerId(people[0]?.id || "");
        setTaxMethod("PROPORTIONAL"); setDiscountMethod("PROPORTIONAL"); setMode("DASHBOARD");
        setNewItemName(""); setNewItemPrice(""); setNewItemSharedBy([]); setIsMultiSelectMode(false);
        setEditingItemId(null);
        setFormCurrency(currency); // Ikut session currency (cth: RM)
        setExchangeRate("1");
        setForeignAmount("");
    };

    const applyQuickTax = (percentage: number) => {
        const currentTotal = parseFloat(billTotal);
        if (!isNaN(currentTotal) && currentTotal > 0) {
            const newTotal = currentTotal * (1 + percentage / 100);
            setBillTotal(newTotal.toFixed(2));
        }
    };

    const saveBill = async () => {
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
            id: editingBillId || (user ? crypto.randomUUID() : `b${Date.now()}`),
            title: billTitle, type: billType, totalAmount: grandTotal, paidBy: payerId,
            details: calculatedDetails, itemsSubtotal, miscAmount: miscTotal, discountAmount: discountTotal, taxMethod, discountMethod, originalCurrency: formCurrency,
            originalAmount: parseFloat(foreignAmount) || 0,
            exchangeRate: parseFloat(exchangeRate) || 1,
            menuItems: billType === "ITEMIZED" ? menuItems : []

        };

        let updatedBills = [...bills];
        if (editingBillId) { updatedBills = bills.map(b => b.id === editingBillId ? newBill : b); }
        else { updatedBills = [newBill, ...bills]; }
        updateActiveSession({ bills: updatedBills });
        resetForm();
    };

    const deleteBill = async (id: string) => {
        if (confirm("Padam resit ni?")) {
            updateActiveSession({ bills: bills.filter(b => b.id !== id) });
            // Kalau cloud, delete dari DB
            if (user) await supabase.from('bills').delete().eq('id', id);
        }
    };

    const getCalcStatus = () => {
        const total = parseFloat(billTotal) || 0; const misc = parseFloat(miscFee) || 0; const disc = parseFloat(discountFee) || 0;
        const items = menuItems.reduce((sum, item) => sum + item.price, 0);
        return total - (items + misc - disc);
    };

    const calculateSettlement = () => {
        // 1. Kira Net Balance Individu (Untuk Kad Atas) - Kekal Logik Asal
        let bal: Record<string, number> = {};
        people.forEach(p => bal[p.id] = 0);

        bills.forEach(b => {
            // Payer dapat Credit (+)
            if (bal[b.paidBy] !== undefined) bal[b.paidBy] += b.totalAmount;

            // Consumer dapat Debit (-)
            b.details.forEach(d => {
                if (bal[d.personId] !== undefined) bal[d.personId] -= d.total;
            });
        });

        const netPeople = people.map(p => ({ ...p, net: bal[p.id] || 0 })).sort((a, b) => b.net - a.net);

        // 2. Kira Settlement (PAIRWISE - Siapa hutang Siapa directly)
        // V5 FIX: Guna Pairwise Matriks, bukan Global Simplification.
        // Ini memastikan A hutang B, B hutang C tidak diringkaskan jadi A hutang C (sebab user confuse).

        let debtMap: Record<string, Record<string, number>> = {};

        people.forEach(p => debtMap[p.id] = {});

        bills.forEach(b => {
            const payerId = b.paidBy;
            b.details.forEach(d => {
                const consumerId = d.personId;
                // Jika Consumer bukan Payer, dia berhutang dengan Payer
                if (consumerId !== payerId && d.total > 0) {
                    if (!debtMap[consumerId]) debtMap[consumerId] = {};
                    debtMap[consumerId][payerId] = (debtMap[consumerId][payerId] || 0) + d.total;
                }
            });
        });

        let txs: Transfer[] = [];
        let processed = new Set<string>();

        people.forEach(pA => {
            people.forEach(pB => {
                if (pA.id === pB.id) return;

                // Kunci unik untuk pasangan A-B
                const key = [pA.id, pB.id].sort().join("-");
                if (processed.has(key)) return;

                // Tengok siapa hutang siapa lagi banyak
                const aOwesB = debtMap[pA.id]?.[pB.id] || 0;
                const bOwesA = debtMap[pB.id]?.[pA.id] || 0;

                if (aOwesB > bOwesA) {
                    const netAmt = aOwesB - bOwesA;
                    if (netAmt > 0.01) {
                        txs.push({ fromId: pA.id, fromName: pA.name, toId: pB.id, toName: pB.name, amount: netAmt });
                    }
                } else if (bOwesA > aOwesB) {
                    const netAmt = bOwesA - aOwesB;
                    if (netAmt > 0.01) {
                        txs.push({ fromId: pB.id, fromName: pB.name, toId: pA.id, toName: pA.name, amount: netAmt });
                    }
                }

                processed.add(key);
            });
        });

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

        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text).then(() => {
                setCopied(true); setTimeout(() => setCopied(false), 2000);
            }).catch(err => {
                alert("Gagal copy: " + err);
            });
        } else {
            const textArea = document.createElement("textarea");
            textArea.value = text;
            textArea.style.position = "fixed";
            textArea.style.left = "-9999px";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
                document.execCommand('copy');
                setCopied(true); setTimeout(() => setCopied(false), 2000);
            } catch (err) {
                alert("Browser tak bagi copy. Sila screenshot manual.");
            }
            document.body.removeChild(textArea);
        }

    };

    const getTransferDetails = (fromId: string, toId: string) => {
        let details: string[] = [];
        bills.forEach(b => {
            if (b.paidBy === toId) {
                if (b.type === "EQUAL") {
                    const detail = b.details.find(d => d.personId === fromId);
                    if (detail && detail.total > 0) details.push(`Kongsi: ${b.title}`);
                } else if (b.type === "ITEMIZED" && b.menuItems) {
                    const userItems = b.menuItems.filter(item => item.sharedBy.includes(fromId));
                    userItems.forEach(item => details.push(item.name));
                }
            }
        });
        return details;
    };


    // --- OCR / SCAN LOGIC ---
    const handleScanReceipt = async (e: React.ChangeEvent<HTMLInputElement>) => {
        setShowScanMethodModal(false); const file = e.target.files?.[0]; if (!file) return;
        setIsScanning(true); setScanStatus("Memproses gambar (Compressing)..."); setShowScanModal(true); setScannedItems([]); setScannedExtraInfo({ tax: 0, service: 0, discount: 0, deposit: 0 });
        try {
            const base64Data = await compressImage(file);
            setScanStatus("AI sedang menganalisis resit...");

            const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";

            const fetchGemini = async (modelName: string) => {
                return fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`, {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ contents: [{ parts: [{ text: "Extract items, prices, tax, service, discount, deposit, AND currency code (e.g. MYR, THB, USD) from receipt. Return valid JSON: { \"items\": [{\"name\": \"Item\", \"price\": 0.00}], \"currency\": \"MYR\", \"tax\": 0.00, \"serviceCharge\": 0.00, \"discount\": 0.00, \"deposit\": 0.00 }. If unsure, default currency to 'MYR'." }, { inline_data: { mime_type: "image/jpeg", data: base64Data } }] }] })
                });
            };

            let response = await fetchGemini("gemini-2.0-flash");
            if (!response.ok && response.status === 404) {
                console.log("Gemini 2.0 404, trying Fallback...");
                setScanStatus("Gemini 2.0 sibuk, mencuba model backup...");
                response = await fetchGemini("gemini-1.5-flash-8b");
            }

            if (!response.ok) {
                const errJson = await response.json();
                const errMessage = errJson.error?.message || response.statusText;
                alert(`Gemini Error (${response.status}): ${errMessage}`);
                throw new Error(`Gemini API Failed: ${errMessage}`);
            }

            const result = await response.json();
            if (!result.candidates || !result.candidates[0] || !result.candidates[0].content) { throw new Error("AI tak dapat baca data dari resit ni."); }

            const rawText = result.candidates[0].content.parts[0].text;
            const cleanJson = rawText.replace(/```json|```/g, '').trim();
            let parsedData;
            try { parsedData = JSON.parse(cleanJson); } catch (e) { console.error("Failed to parse JSON", rawText); throw new Error("Format data AI tak valid."); }

            const itemsArray = parsedData.items || (Array.isArray(parsedData) ? parsedData : []);
            if (Array.isArray(itemsArray)) {
                const mappedItems: ScannedItem[] = itemsArray.map((item: any, idx: number) => ({ id: `scan-${Date.now()}-${idx}`, name: item.name || "Unknown Item", price: item.price ? String(item.price.toFixed(2)) : "0.00", selected: true, sharedBy: [] }));
                setScannedItems(mappedItems);
                // Normalize AI detected currency code
                let aiCode = (parsedData.currency || currency).toUpperCase();

                // Convert to API code first, then to app symbol
                const apiCode = CURRENCY_MAP[aiCode] || aiCode;
                const appSymbol = API_TO_SYMBOL[apiCode] || aiCode;

                setFormCurrency(appSymbol); // Update Form

                if (appSymbol !== currency) {
                    setScanStatus(`Mengambil rate ${appSymbol} ke ${currency}...`);
                    fetchExchangeRate(appSymbol, currency).then(rate => {
                        if (rate) {
                            setExchangeRate(String(rate));
                        } else {
                            setExchangeRate(""); // Let user enter manually if API fails
                        }
                    });
                } else {
                    setExchangeRate("1");
                }

                const detectedTax = parseFloat(parsedData.tax) || 0;
                const detectedService = parseFloat(parsedData.serviceCharge) || 0;
                const detectedDiscount = parseFloat(parsedData.discount) || 0;
                const detectedDeposit = parseFloat(parsedData.deposit) || 0;
                setScannedExtraInfo({ tax: detectedTax, service: detectedService, discount: Math.abs(detectedDiscount), deposit: Math.abs(detectedDeposit) });
            } else { alert("AI tidak menjumpai senarai item."); }

        } catch (err: any) { console.error(err); alert(`Gagal scan: ${err.message}`); }
        setIsScanning(false);
    };

    const addSelectedScannedItems = () => {
        const itemsToAdd = scannedItems.filter(i => i.selected); if (itemsToAdd.length === 0) return;
        const newMenuItems = itemsToAdd.map(i => ({ id: `m${Date.now()}-${Math.random()}`, name: i.name, price: parseFloat(i.price), sharedBy: i.sharedBy }));
        setMenuItems([...menuItems, ...newMenuItems]);
        const currentTotal = parseFloat(billTotal) || 0; const scannedTotal = itemsToAdd.reduce((sum, i) => sum + parseFloat(i.price), 0);
        if (currentTotal === 0) { setBillTotal(scannedTotal.toFixed(2)); }
        if (includeScannedTax && (scannedExtraInfo.tax > 0 || scannedExtraInfo.service > 0)) { const totalTaxService = scannedExtraInfo.tax + scannedExtraInfo.service; const currentMisc = parseFloat(miscFee) || 0; setMiscFee((currentMisc + totalTaxService).toFixed(2)); }
        if (includeScannedDiscount && (scannedExtraInfo.discount > 0 || scannedExtraInfo.deposit > 0)) { const totalDeductions = scannedExtraInfo.discount + scannedExtraInfo.deposit; const currentDisc = parseFloat(discountFee) || 0; setDiscountFee((currentDisc + totalDeductions).toFixed(2)); }
        setShowScanModal(false);
    };

    const toggleScanItem = (id: string) => { setScannedItems(items => items.map(i => i.id === id ? { ...i, selected: !i.selected } : i)); };
    const updateScannedItem = (id: string, field: 'name' | 'price', val: string) => { setScannedItems(items => items.map(i => i.id === id ? { ...i, [field]: val } : i)); };
    const deleteScannedItem = (id: string) => { setScannedItems(items => items.filter(i => i.id !== id)); };
    const togglePersonInScan = (itemId: string, personId: string) => {
        setScannedItems(items => items.map(item => {
            if (item.id !== itemId) return item;
            const isAlreadyAdded = item.sharedBy.includes(personId);
            const newSharedBy = isAlreadyAdded
                ? item.sharedBy.filter(id => id !== personId)
                : [...item.sharedBy, personId];
            return { ...item, sharedBy: newSharedBy };
        }));
    };

    // --- IMAGE HELPERS ---
    const handleOpenImage = async () => {
        if (!receiptRef.current) return;
        setIsSharing(true);
        await new Promise(r => setTimeout(r, 200));

        try {
            const canvas = await html2canvas(receiptRef.current, {
                backgroundColor: darkMode ? "#1E1E1E" : "#FFFFFF",
                scale: 3,
                useCORS: true,
                allowTaint: true,
                logging: false
            });
            const imageUrl = canvas.toDataURL("image/png");
            setPreviewImage(imageUrl);
            setShowPreviewModal(true);
        } catch (err) {
            console.error("Ralat:", err);
            alert("Gagal menjana gambar.");
        } finally {
            setIsSharing(false);
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, pid: string) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5000000) { alert("File besar > 5MB."); return; }
            const reader = new FileReader();
            reader.onloadend = () => {
                setTempQrImage(reader.result as string);
                setPaymentProfileId(pid);
                setZoom(1);
                setCrop({ x: 0, y: 0 });
            };
            reader.readAsDataURL(file);
        }
    };

    const onCropComplete = (croppedArea: any, croppedAreaPixels: any) => {
        setCroppedAreaPixels(croppedAreaPixels);
    };

    const saveCroppedQr = async () => {
        if (!tempQrImage || !croppedAreaPixels || !paymentProfileId) return;
        try {
            const croppedImageBase64 = await getCroppedImg(tempQrImage, croppedAreaPixels);
            const p = people.find(per => per.id === paymentProfileId);
            if (p) {
                updatePaymentProfile(paymentProfileId, p.bankName || "", p.bankAccount || "", croppedImageBase64);
            }
            setTempQrImage(null);
        } catch (e) {
            console.error(e);
            alert("Gagal crop gambar.");
        }
    };

    const cancelCrop = () => {
        setTempQrImage(null);
    };

    // --- STYLES ---
    const bgStyle = darkMode ? "bg-black text-white" : "bg-gray-200 text-black";
    const cardStyle = `${darkMode ? "bg-[#1E1E1E] border-white" : "bg-white border-black"} border-2 rounded-2xl`;
    const shadowStyle = darkMode ? "" : "shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]";
    const buttonBase = `border-2 font-bold rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 ${darkMode ? "border-white hover:bg-white hover:text-black" : "border-black hover:bg-black hover:text-white"} ${shadowStyle} hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]`;
    const inputStyle = `w-full p-3 rounded-xl bg-transparent border-2 outline-none font-bold transition-all focus:ring-0 ${darkMode ? "border-white focus:border-lime-300 placeholder:text-white/50" : "border-black focus:border-blue-500 placeholder:text-black/50"}`;

    if (!isLoaded) return <div className="min-h-screen bg-gray-200 flex items-center justify-center"><Loader2 className="animate-spin text-black" /></div>;

    // --- MANUAL SYNC DEBUGGER ---
    const forceSync = async () => {
        if (!user) return alert("Sila login dulu!");
        if (!activeSession) return alert("Tiada session aktif!");
        if (confirm("Nak paksa sync ke Cloud sekarang?") === false) return;

        setSyncStatus("SYNCING");
        try {
            // 1. Session Upsert
            const { error: sessError } = await supabase.from('sessions').upsert({
                id: activeSession.id,
                owner_id: user.id || activeSession.ownerId,
                name: activeSession.name,
                currency: activeSession.currency || "RM",
                people: activeSession.people,
                paid_status: activeSession.paidStatus,
                updated_at: new Date().toISOString()
            });

            if (sessError) throw new Error("Session Error: " + sessError.message + "\nHint: Run fix_splitit_db.sql");

            // 2. Bills Upsert
            if (activeSession.bills.length > 0) {
                const billsPayload = activeSession.bills.map(b => mapLocalBillToSql(b, activeSession.id));
                const { error: billError } = await supabase.from('bills').upsert(billsPayload);
                if (billError) throw new Error("Bill Error: " + billError.message);
            }

            setSyncStatus("SAVED");
            alert("✅ SYNC BERJAYA! \nData kini dalam Cloud. \nSila check Dashboard sekarang.");
        } catch (e: any) {
            console.error(e);
            setSyncStatus("ERROR");
            alert("❌ SYNC FAILED:\n" + e.message);
        }
    };

    return (
        <div className={`min-h-screen font-sans transition-colors duration-300 ${bgStyle}`}>
            <div className="max-w-md mx-auto min-h-screen flex flex-col relative overflow-hidden">







                {/* HEADER - MATCHING BUDGET.AI STYLE */}
                <header className={`px-4 py-3 border-b-2 relative z-10 transition-colors duration-300 ${darkMode ? "border-white bg-black" : "border-black bg-gray-200"}`}>
                    <div className="flex justify-between items-center">

                        {/* 1. KIRI: Logo & Info (Vertical Stack) */}
                        <div onClick={() => router.push("/")} className="flex flex-col items-start justify-center gap-0.5 cursor-pointer group min-w-0 mr-2">

                            {/* Baris 1: Logo + Title */}
                            <div className="flex items-center gap-2">
                                <div className={`w-7 h-7 flex-shrink-0 border-2 rounded-lg flex items-center justify-center overflow-hidden transition-transform group-hover:scale-105 ${darkMode ? "bg-blue-600 border-white text-white shadow-none" : "bg-blue-100 border-black text-blue-900 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"}`}>
                                    <img src="/icon.png" width={24} height={24} alt="Logo" className="object-cover" />
                                </div>
                                <h1 className="text-lg font-black tracking-tight leading-none uppercase group-hover:underline decoration-2 underline-offset-2">SplitIt.</h1>
                            </div>

                            {/* Baris 2: Nama Event + Status */}
                            <div className="flex items-center gap-2 pl-0.5">
                                <p className="text-[10px] uppercase tracking-widest font-bold opacity-70 truncate max-w-[140px]">
                                    {activeSession?.name || "Loading..."}
                                </p>

                                {/* Status Sync (Mini Badge) */}
                                <div className="text-[8px] font-bold flex items-center gap-1 opacity-50 scale-90 origin-left">
                                    <span>|</span>
                                    {syncStatus === "SAVING" && <span className="text-yellow-500 animate-pulse">SAVING</span>}
                                    {syncStatus === "SYNCING" && <span className="text-blue-500 animate-pulse">SYNCING</span>}
                                    {syncStatus === "SAVED" && <span className="text-green-500">SAVED</span>}
                                    {syncStatus === "OFFLINE" && <span>OFFLINE</span>}
                                </div>
                            </div>
                        </div>

                        {/* 2. KANAN: Butang Compact */}
                        <div className="flex items-center gap-1.5 flex-shrink-0">

                            {/* DEBUG SYNC BUTTON */}
                            {user && (
                                <button onClick={forceSync} className="h-9 px-2 rounded-lg bg-blue-600 text-white text-[10px] font-bold flex items-center shadow-md active:scale-95">
                                    SYNC
                                </button>
                            )}

                            {/* LOGIC BUTTON: Invite / Login */}
                            {user ? (
                                <button onClick={() => setShowInviteModal(true)} className={`w-9 h-9 rounded-lg border-2 flex items-center justify-center transition-all active:scale-95 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] ${darkMode ? "bg-indigo-600 border-white text-white shadow-none" : "bg-indigo-500 border-black text-white"}`}>
                                    <UserPlus size={16} />
                                </button>
                            ) : (
                                <button onClick={handleLoginClick} className={`w-auto px-3 h-9 rounded-lg border-2 flex items-center justify-center gap-1 transition-all active:scale-95 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] ${darkMode ? "bg-green-600 border-white text-white shadow-none" : "bg-green-500 border-black text-white"}`}>
                                    <span className="text-[10px] font-black uppercase">LOGIN</span>
                                </button>
                            )}

                            <button onClick={() => setShowCurrencyModal(true)} className={`h-9 px-2 min-w-[36px] rounded-lg border-2 text-[10px] font-black flex items-center justify-center transition-all active:scale-95 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] ${darkMode ? "border-white bg-transparent text-white shadow-none hover:bg-white hover:text-black" : "border-black bg-white text-black"}`}>
                                {currency}
                            </button>

                            <button onClick={() => setShowSessionModal(true)} className={`w-9 h-9 rounded-lg border-2 flex items-center justify-center transition-all active:scale-95 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] ${darkMode ? "border-white bg-transparent text-white shadow-none hover:bg-white hover:text-black" : "border-black bg-white text-black"}`}>
                                <Folder size={16} />
                            </button>

                            <button onClick={() => setDarkMode(!darkMode)} className={`w-9 h-9 rounded-lg border-2 flex items-center justify-center transition-all active:scale-95 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] ${darkMode ? "border-white bg-white text-black shadow-none" : "border-black bg-black text-white"}`}>
                                {darkMode ? <Sun size={16} /> : <Moon size={16} />}
                            </button>
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
                                    <span className="text-[10px] uppercase font-bold opacity-60 mb-1 flex items-center gap-1">Event <Folder size={10} /></span>
                                    <div className="flex items-center gap-1 max-w-full"><span className="text-sm font-black truncate">{activeSession?.name || "Loading..."}</span><ChevronDown size={14} /></div>
                                </button>
                            </div>

                            <section className={`${cardStyle} p-5 ${darkMode ? "" : "bg-violet-100"} ${shadowStyle}`}>
                                <div className="flex items-center justify-between mb-4"><h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2"><Users size={16} /> Geng Lepak</h2></div>
                                <div className="flex flex-wrap gap-2">
                                    {people.map(p => (
                                        <div key={p.id} className="relative">
                                            {editingPersonId === p.id ? (
                                                <div className={`flex items-center border-2 rounded-xl p-1 gap-1 ${darkMode ? "border-blue-400 bg-blue-400/20" : "border-blue-600 bg-blue-100"}`}>
                                                    <input autoFocus value={p.name} onChange={e => updatePersonName(p.id, e.target.value)} onKeyDown={e => e.key === "Enter" && setEditingPersonId(null)} className="bg-transparent outline-none text-sm font-bold px-2 w-24" />
                                                    <button onClick={() => deletePerson(p.id)} className={`p-1.5 rounded-lg ${darkMode ? "text-red-400 hover:bg-red-400/20" : "text-red-600 hover:bg-red-200"}`}><Trash2 size={14} /></button>
                                                    <button onClick={() => setEditingPersonId(null)} className={`p-1.5 rounded-lg ${darkMode ? "text-green-400 hover:bg-green-400/20" : "text-green-600 hover:bg-green-200"}`}><Check size={14} /></button>
                                                </div>
                                            ) : (
                                                <div className="flex gap-1"><button onClick={() => setEditingPersonId(p.id)} className={`group relative px-6 py-2 text-sm font-bold border-2 rounded-xl transition-all hover:shadow-none overflow-hidden ${darkMode ? "border-white bg-[#333] hover:bg-[#444]" : "border-black bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"}`}><span className="block transition-transform duration-300 group-hover:-translate-x-3">{p.name}</span><div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-10 group-hover:translate-x-[-12px] transition-transform duration-300 ease-out"><Edit3 size={16} className="fill-yellow-400 text-black stroke-[2.5px]" /></div></button><button onClick={() => { setPaymentProfileId(p.id); setShowPaymentModal(true) }} className={`p-2 border-2 rounded-xl flex items-center justify-center transition-all active:scale-95 ${p.bankAccount ? (darkMode ? "bg-green-400 text-black border-green-400" : "bg-green-400 text-black border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]") : (darkMode ? "border-white/20 text-white/20 hover:border-white hover:text-white" : "border-black/20 text-black/20 hover:border-black hover:text-black")}`}><Wallet size={16} /></button></div>
                                            )}
                                        </div>
                                    ))}
                                    <div className={`flex items-center border-2 rounded-xl px-3 py-2 ${darkMode ? "border-white bg-[#333]" : "border-black bg-white"}`}><input value={newPersonName} onChange={e => setNewPersonName(e.target.value)} onKeyDown={e => e.key === "Enter" && addPerson()} placeholder="Tambah..." className={`bg-transparent font-bold outline-none text-sm w-20 ${darkMode ? "placeholder:text-white/50" : "placeholder:text-black/50"}`} /><button onClick={addPerson} className={`p-1 rounded-full ${darkMode ? "bg-white text-black" : "bg-black text-white"} ml-2 hover:scale-110 transition`}><Plus size={14} /></button></div>
                                </div>
                            </section>

                            <section>
                                <div className="flex items-center justify-between mb-4"><h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2"><Receipt size={16} /> Resit / Bill</h2></div>
                                <div className="space-y-4">
                                    {bills.length === 0 ? (
                                        <button onClick={() => { resetForm(); setMode("FORM") }} className={`w-full p-8 border-2 border-dashed rounded-2xl text-center opacity-60 hover:opacity-100 hover:border-solid transition flex flex-col items-center gap-2 ${darkMode ? "border-white" : "border-black"}`}><Plus size={32} className="mb-2" /><p className="text-base font-bold">Tiada rekod. Tambah bill pertama!</p></button>
                                    ) : (
                                        <>
                                            {bills.map(bill => (
                                                <div key={bill.id} className={`${cardStyle} ${shadowStyle} overflow-hidden transition-all`}>
                                                    <div onClick={() => setExpandedBillId(expandedBillId === bill.id ? null : bill.id)} className={`p-5 cursor-pointer flex justify-between items-center ${darkMode ? "hover:bg-[#333]" : "hover:bg-gray-50"}`}>
                                                        <div><h3 className="font-black text-lg uppercase truncate">{bill.title}</h3><div className="flex gap-2 mt-1"><span className={`text-[10px] font-bold px-2 py-0.5 border rounded-full ${bill.type === "EQUAL" ? (darkMode ? "border-green-400 text-green-400" : "border-green-600 text-green-700 bg-green-100") : (darkMode ? "border-blue-400 text-blue-400" : "border-blue-600 text-blue-700 bg-blue-100")}`}>{bill.type === "EQUAL" ? "KONGSI RATA" : "SPLIT ITEM"}</span><span className="text-[10px] font-bold opacity-70 self-center">Bayar: {people.find(p => p.id === bill.paidBy)?.name}</span></div></div>
                                                        <div className="text-right">
                                                            {/* Harga Utama (RM) */}
                                                            <div className="font-mono font-black text-xl">{currency}{bill.totalAmount.toFixed(2)}</div>

                                                            {/* --- V5 DISPLAY: Tunjuk Harga Asal (THB/USD) --- */}
                                                            {bill.originalCurrency && bill.originalCurrency !== currency && (
                                                                <div className="text-[10px] font-bold opacity-50 font-mono -mt-1 mb-1">
                                                                    ({bill.originalCurrency} {bill.originalAmount?.toFixed(2)})
                                                                </div>
                                                            )}

                                                            {/* Icon Panah */}
                                                            {expandedBillId === bill.id ? <ChevronUp size={20} className="ml-auto" /> : <ChevronDown size={20} className="ml-auto" />}
                                                        </div>
                                                    </div>
                                                    {expandedBillId === bill.id && (
                                                        <div className={`text-sm border-t-2 p-5 space-y-3 ${darkMode ? "border-white bg-[#1a1a1a]" : "border-black bg-gray-50"}`}>
                                                            {/* SHOW MENU ITEMS IF ITEMIZED */}
                                                            {bill.type === "ITEMIZED" && bill.menuItems && bill.menuItems.length > 0 && (
                                                                <div className="mb-4 pb-4 border-b border-dashed border-current border-opacity-20">
                                                                    <p className="text-[10px] font-bold uppercase opacity-50 mb-2">Menu Dipesan:</p>
                                                                    {bill.menuItems.map(m => (
                                                                        <div key={m.id} className="flex justify-between text-xs py-1">
                                                                            <span>{m.name} ({m.sharedBy.map(pid => people.find(p => p.id === pid)?.name).join(", ")})</span>
                                                                            <span className="font-mono opacity-70">{currency}{m.price.toFixed(2)}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                            {bill.details.map(d => (
                                                                <div key={d.personId} className="flex justify-between items-center py-2 border-b border-dashed border-current border-opacity-20 last:border-0"><span className="font-bold">{people.find(p => p.id === d.personId)?.name}</span><span className="font-mono font-black text-base">{currency}{d.total.toFixed(2)}</span></div>
                                                            ))}
                                                            <div className="flex gap-3 pt-4 mt-2 justify-end"><button onClick={() => startEditBill(bill)} className={`px-4 py-2 border-2 rounded-xl text-xs font-bold flex items-center gap-2 ${darkMode ? "border-blue-400 text-blue-400 hover:bg-blue-400 hover:text-black" : "border-blue-600 text-blue-700 bg-blue-50 hover:bg-blue-600 hover:text-white hover:border-black"}`}><Edit3 size={14} /> EDIT</button><button onClick={() => deleteBill(bill.id)} className={`px-4 py-2 border-2 rounded-xl text-xs font-bold flex items-center gap-2 ${darkMode ? "border-red-400 text-red-400 hover:bg-red-400 hover:text-black" : "border-red-600 text-red-700 bg-red-50 hover:bg-red-600 hover:text-white hover:border-black"}`}><Trash2 size={14} /> DELETE</button></div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                            <button onClick={() => { resetForm(); setMode("FORM") }} className={`w-full py-4 ${buttonBase} ${darkMode ? "bg-[#333]" : "bg-white"} mt-4 text-sm uppercase tracking-wider`}><Plus size={18} /> Tambah Bill Lagi</button>
                                        </>
                                    )}
                                </div>
                            </section>

                            {bills.length > 0 && (
                                <section>
                                    <div className="flex items-center justify-between mb-4">
                                        <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2"><CheckCircle size={16} /> Final Settlement</h2>
                                        <button onClick={copyWhatsAppSummary} className={`px-2 py-1 rounded text-[10px] font-bold border-2 transition-all ${darkMode ? "border-white bg-white text-black" : "border-black bg-black text-white"}`}>
                                            {copied ? "COPIED" : "COPY FOR WHATSAPP"}
                                        </button>
                                    </div>
                                    <div className={`${cardStyle} p-6 ${shadowStyle} ${darkMode ? "bg-[#222]" : "bg-lime-200"}`}>
                                        <div className="mb-6 text-center border-b-2 border-current border-opacity-10 pb-4"><span className="text-[10px] uppercase font-bold opacity-60">Total Hangus</span><div className="text-3xl font-mono font-black mt-1">{currency}{totalSpent.toFixed(2)}</div></div>
                                        <div className="grid grid-cols-2 gap-3 mb-6">{netPeople.map(p => (<div key={p.id} className={`p-4 border-2 rounded-xl flex flex-col gap-1 ${darkMode ? "border-white bg-[#333]" : "border-black bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"}`}><span className="text-xs font-bold uppercase opacity-70">{p.name}</span><span className={`text-lg font-mono font-black ${p.net > 0 ? (darkMode ? "text-green-400" : "text-green-600") : p.net < 0 ? (darkMode ? "text-red-400" : "text-red-600") : "opacity-50"}`}>{p.net > 0 ? "+" : ""}{p.net.toFixed(2)}</span></div>))}</div>
                                        <div className={`rounded-xl border-2 overflow-hidden ${darkMode ? "bg-[#121212] border-white" : "bg-white border-black"}`}>
                                            <div className={`p-4 flex justify-between items-center border-b-2 ${darkMode ? "bg-white/10 border-white/20" : "bg-gray-100 border-black/10"}`}><span className={`text-[10px] uppercase tracking-widest font-black opacity-60 ${darkMode ? "text-white" : "text-black"}`}>Senarai Transfer</span></div>
                                            {txs.length === 0 ? (<div className="flex flex-col items-center justify-center py-8 opacity-50 gap-2"><CheckCircle size={24} /><p className="text-xs font-bold uppercase">Semua setel! Tiada hutang.</p></div>) : (<div className="divide-y-2 divide-current divide-dashed divide-opacity-10">{txs.map((t, i) => { const isPaid = paidStatus[`${t.fromId}-${t.toId}`]; return (<div key={i} className={`flex justify-between items-center font-mono text-sm p-4 transition-colors ${isPaid ? (darkMode ? "bg-green-900/20" : "bg-green-100") : ""}`}><div className="flex flex-col gap-1"><div className="flex items-center gap-2 font-bold"><span className={isPaid ? "opacity-50 line-through decoration-2" : (darkMode ? "text-red-400" : "text-red-600")}>{t.fromName}</span><ArrowRight size={14} className="opacity-50" /><span className={isPaid ? "opacity-50" : (darkMode ? "text-green-400" : "text-green-600")}>{t.toName}</span></div><div className="flex items-center gap-2"><span className={`text-[10px] px-1.5 py-0.5 rounded border border-current opacity-70 ${isPaid ? "text-green-600 border-green-600" : ""}`}>{isPaid ? "PAID" : "UNPAID"}</span><span className="text-[10px] opacity-50">{currency}{t.amount.toFixed(2)}</span></div></div><button onClick={() => { setActiveTransfer(t); setShowPayModal(true) }} className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg border-2 flex items-center gap-2 transition-all ${isPaid ? (darkMode ? "bg-transparent border-green-500 text-green-500 hover:bg-green-500/20" : "bg-white border-green-600 text-green-600 hover:bg-green-50") : (darkMode ? "bg-white text-black hover:bg-green-400" : "bg-black text-white hover:bg-green-500 hover:border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px]")}`}>{isPaid ? <Check size={12} /> : <CreditCard size={12} />} {isPaid ? "DONE" : "BAYAR"}</button></div>) })}</div>)}
                                        </div>
                                    </div>
                                </section>
                            )}
                            <div className="pt-8 pb-10 text-center space-y-4">
                                <button onClick={resetData} className="mx-auto px-5 py-2 rounded-full border border-red-500 text-red-500 text-[9px] font-bold uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2"><RotateCcw size={12} /> Reset Data</button>
                                <div className="opacity-40"><p className="text-[10px] font-black uppercase tracking-widest">SplitIt. by kmlxly</p><p className="text-[9px] font-mono mt-1">{APP_VERSION}</p></div>
                            </div>
                        </div>
                    )}

                    {/* FORM VIEW */}
                    {mode === "FORM" && (
                        <div className="flex flex-col h-full animate-in slide-in-from-right duration-300">
                            <div className="flex items-center gap-4 mb-8">
                                <button onClick={resetForm} className={`p-3 rounded-xl ${buttonBase} ${darkMode ? "bg-[#333]" : "bg-white"}`}><ArrowRight size={20} className="rotate-180" /></button>
                                <h2 className="text-2xl font-black uppercase tracking-tight">{editingBillId ? "Kemaskini Bill" : "Tambah Bill Baru"}</h2>
                            </div>

                            <div className={`flex-1 space-y-8 overflow-y-auto pb-6 px-1 ${darkMode ? "scrollbar-thumb-white" : "scrollbar-thumb-black"} scrollbar-thin`}>
                                <div className={`${cardStyle} p-5 space-y-5 ${darkMode ? "bg-[#1E1E1E]" : "bg-white"} ${shadowStyle}`}>
                                    <div className="space-y-2"><label className="text-xs uppercase font-black tracking-wider opacity-70">Nama Kedai</label><input value={billTitle} onChange={e => setBillTitle(e.target.value)} placeholder="Contoh: Mamak Bistro" className={inputStyle} /></div>
                                    {/* --- V5 UI: SMART CURRENCY INPUT --- */}
                                    <div className="space-y-2 p-3 rounded-xl border-2 border-dashed border-current border-opacity-30 bg-current/5">
                                        <div className="flex flex-col items-start gap-1 relative">
                                            <label className="text-[10px] uppercase font-black tracking-wider opacity-70 flex items-center gap-1">
                                                <Globe size={12} /> Mata Wang
                                            </label>

                                            {/* DROPDOWN - Full Width Bawah Title */}
                                            <div className="relative group w-full">
                                                <select
                                                    value={formCurrency}
                                                    onChange={async (e) => {
                                                        const code = e.target.value;
                                                        setFormCurrency(code);

                                                        if (code === currency) {
                                                            // Same as base currency, no conversion needed
                                                            setExchangeRate("1");
                                                            setForeignAmount("");
                                                        } else {
                                                            // Fetch live exchange rate from foreign currency to base currency
                                                            setExchangeRate("...");
                                                            const rate = await fetchExchangeRate(code, currency);
                                                            if (rate) {
                                                                setExchangeRate(String(rate));
                                                            } else {
                                                                setExchangeRate(""); // Let user enter manually if API fails
                                                            }
                                                        }
                                                    }}
                                                    // UPDATE: 'text-left' (sebab duduk bawah) & 'w-full'
                                                    className={`appearance-none bg-transparent font-black text-[10px] outline-none text-left pr-4 cursor-pointer border-b border-dashed border-current/30 hover:border-current transition-all uppercase w-full ${formCurrency !== currency ? "text-blue-500" : ""}`}
                                                >
                                                    <optgroup label="Session Base">
                                                        <option value={currency}>{currency} (Duit Asal)</option>
                                                    </optgroup>
                                                    <optgroup label="Popular ASEAN">
                                                        <option value="THB">THB - Thai Baht (฿)</option>
                                                        <option value="IDR">IDR - Rupiah (Rp)</option>
                                                        <option value="SGD">SGD - Dollar (S$)</option>
                                                        <option value="VND">VND - Dong (₫)</option>
                                                        <option value="PHP">PHP - Peso (₱)</option>
                                                    </optgroup>
                                                    <optgroup label="World Major">
                                                        <option value="USD">USD - US Dollar ($)</option>
                                                        <option value="JPY">JPY - Yen (¥)</option>
                                                        <option value="CNY">CNY - Yuan (¥)</option>
                                                        <option value="KRW">KRW - Won (₩)</option>
                                                        <option value="EUR">EUR - Euro (€)</option>
                                                        <option value="GBP">GBP - Pound (£)</option>
                                                        <option value="AUD">AUD - Aus Dollar ($)</option>
                                                    </optgroup>
                                                </select>

                                                {/* Ikon Panah */}
                                                <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                                                    <ChevronDown size={12} />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Kalau Currency ASING dipilih, tunjuk input Rate & Original */}
                                        {formCurrency !== currency && (
                                            <div className="grid grid-cols-2 gap-2 animate-in slide-in-from-top-2">

                                                {/* INPUT 1: AMOUNT ASING */}
                                                <div>
                                                    <label className="text-[10px] font-bold opacity-50 block">Amount ({formCurrency})</label>
                                                    <input
                                                        type="number"
                                                        placeholder="100"
                                                        value={foreignAmount}
                                                        onChange={(e) => setForeignAmount(e.target.value)}
                                                        className={`${inputStyle} text-lg py-1`}
                                                    />
                                                </div>

                                                {/* INPUT 2: EXCHANGE RATE */}
                                                <div>
                                                    <label className="text-[9px] font-bold opacity-50 block">Rate (ke {currency})</label>
                                                    <input
                                                        type="number"
                                                        placeholder="0.00"
                                                        value={exchangeRate}
                                                        onChange={(e) => setExchangeRate(e.target.value)}
                                                        className={`${inputStyle} text-lg py-1`}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {/* Total Akhir (RM) - Sentiasa ReadOnly kalau Foreign, atau Editable kalau Base */}
                                        <div>
                                            <label className="text-[9px] font-bold opacity-50 block mt-1">
                                                {formCurrency !== currency ? `Auto-Convert (${currency})` : `Total Resit (${currency})`}
                                            </label>
                                            <input
                                                type="number"
                                                value={billTotal}
                                                onChange={e => setBillTotal(e.target.value)}
                                                readOnly={formCurrency !== currency} // Lock kalau auto-convert
                                                placeholder="0.00"
                                                className={`${inputStyle} text-2xl font-black font-mono ${formCurrency !== currency ? "opacity-50 cursor-not-allowed" : ""}`}
                                            />
                                        </div>
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

                                        {/* 1. SCAN BUTTON */}
                                        <div className="flex flex-col gap-2">
                                            <button onClick={() => setShowScanMethodModal(true)} className={`w-full py-3 rounded-xl border-2 flex items-center justify-center gap-2 font-black uppercase text-xs transition-all active:scale-95 ${darkMode ? "bg-indigo-500 text-white border-indigo-400" : "bg-indigo-100 text-indigo-700 border-indigo-300 hover:bg-indigo-200"}`}>
                                                <Camera size={16} /> Scan Resit (Auto-Fill)
                                            </button>
                                            <div className="flex items-center gap-2 opacity-40">
                                                <div className="h-[1px] bg-current flex-1"></div>
                                                <span className="text-[9px] font-bold uppercase">ATAU MANUAL</span>
                                                <div className="h-[1px] bg-current flex-1"></div>
                                            </div>
                                        </div>

                                        {/* 2. INPUT CARD */}
                                        <div className={`${cardStyle} p-4 space-y-4 ${darkMode ? "bg-[#1E1E1E]" : "bg-white"} ${shadowStyle} overflow-hidden transition-all duration-300 relative`}>

                                            {/* Indicator Edit Mode */}
                                            {editingItemId && (
                                                <div className="absolute top-0 right-0 p-2">
                                                    <span className="text-[9px] font-black uppercase bg-yellow-400 text-black px-2 py-1 rounded-bl-xl rounded-tr-xl animate-pulse">EDITING MODE</span>
                                                </div>
                                            )}

                                            {/* Input Baris 1: Nama & Harga */}
                                            <div className="flex gap-3">
                                                <div className="flex-[2] space-y-1">
                                                    <label className="text-[9px] font-bold uppercase opacity-50 ml-1">Nama Item</label>
                                                    <input value={newItemName} onChange={e => setNewItemName(e.target.value)} placeholder="cth: Nasi Goreng" className={`${inputStyle} text-sm py-2`} />
                                                </div>
                                                <div className="flex-1 space-y-1 relative">
                                                    <label className="text-[9px] font-bold uppercase opacity-50 ml-1">Harga</label>
                                                    <div className="relative">
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold opacity-50">{currency}</span>
                                                        <input type="number" value={newItemPrice} onChange={e => setNewItemPrice(e.target.value)} placeholder="0.00" className={`${inputStyle} pl-8 text-sm py-2`} />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Input Baris 2: Orang & Add Button */}
                                            <div className="pt-2 border-t border-dashed border-current border-opacity-20">
                                                <div className="flex justify-between items-center mb-2">
                                                    <label className="flex items-center gap-2 text-[10px] font-bold cursor-pointer opacity-70 hover:opacity-100"><input type="checkbox" checked={isMultiSelectMode} onChange={toggleMultiSelect} className="accent-blue-500 w-3 h-3 rounded-sm" />Kongsi ramai-ramai?</label>
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
                                                                {isMultiSelectMode ? (isSelected ? <Check size={10} /> : <div className="w-2.5 h-2.5 rounded-sm border border-current opacity-50" />) : <User size={10} />}
                                                                <span className={isSelected ? (darkMode ? "text-black" : "text-white") : ""}>{p.name}</span>
                                                            </button>
                                                        )
                                                    })}
                                                </div>
                                            </div>

                                            <div className="flex gap-2">
                                                {editingItemId && (
                                                    <button onClick={cancelEditItem} className={`px-4 py-3 rounded-xl border-2 font-black uppercase text-xs transition-all ${darkMode ? "border-red-400 text-red-400 hover:bg-red-400/20" : "border-red-600 text-red-600 hover:bg-red-50"}`}>
                                                        <X size={16} />
                                                    </button>
                                                )}
                                                <button disabled={!newItemName || !newItemPrice || newItemSharedBy.length === 0} onClick={addMenuItem} className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wider border-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${editingItemId ? (darkMode ? "bg-yellow-400 text-black border-yellow-400 hover:bg-yellow-300" : "bg-yellow-400 text-black border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]") : (darkMode ? "bg-white text-black border-white hover:bg-gray-200" : "bg-black text-white border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]")}`}>
                                                    {editingItemId ? "Update Item" : "+ Tambah Item"}
                                                </button>
                                            </div>
                                        </div>

                                        {/* LIST ITEM */}
                                        {menuItems.map((item) => (
                                            <div key={item.id} className={`p-3 border-2 rounded-xl flex justify-between items-center animate-in slide-in-from-bottom-2 ${editingItemId === item.id ? (darkMode ? "border-yellow-400 bg-yellow-400/10" : "border-black bg-yellow-50") : (darkMode ? "bg-[#222] border-white/20" : "bg-white border-black/10")}`}>
                                                <div className="flex-1">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <span className="font-bold text-sm">{item.name}</span>
                                                        <span className="font-mono font-black text-sm">{currency}{item.price.toFixed(2)}</span>
                                                    </div>
                                                    <div className="flex flex-wrap gap-1">
                                                        {item.sharedBy.map(pid => (
                                                            <span key={pid} className={`text-[9px] px-2 py-1 rounded font-black border-2 ${darkMode ? "bg-white text-black border-white" : "bg-white text-black border-black text-opacity-100"}`}>
                                                                {people.find(p => p.id === pid)?.name}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1 ml-2">
                                                    <button onClick={() => startEditItem(item)} className={`p-2 rounded-lg transition-colors ${editingItemId === item.id ? "text-yellow-500 bg-yellow-100" : "text-blue-500 hover:bg-blue-500/10"}`}><Edit3 size={16} /></button>
                                                    <button onClick={() => removeMenuItem(item.id)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"><Trash2 size={16} /></button>
                                                </div>
                                            </div>
                                        ))}

                                        {/* FOOTER INPUTS (Tax/Discount) */}
                                        <div className={`${cardStyle} p-4 space-y-4 ${darkMode ? "bg-[#1E1E1E]" : "bg-violet-100"} ${shadowStyle}`}>
                                            <div className="flex gap-3">
                                                <div className="flex-1 space-y-1"><label className="text-[9px] uppercase font-black opacity-70 flex items-center gap-1"><Bike size={12} /> Caj Tetap</label><input type="number" placeholder="0.00" value={miscFee} onChange={e => setMiscFee(e.target.value)} className={`${inputStyle} py-2 font-mono text-sm`} /></div>
                                                <div className="flex-1 space-y-1"><label className="text-[9px] uppercase font-black opacity-70 flex items-center gap-1"><Tag size={12} /> Diskaun</label><input type="number" placeholder="0.00" value={discountFee} onChange={e => setDiscountFee(e.target.value)} className={`${inputStyle} py-2 font-mono text-sm ${darkMode ? "focus:border-green-400" : "focus:border-green-500"}`} /></div>
                                            </div>
                                        </div>

                                        <div className={`p-4 border-2 rounded-xl ${shadowStyle} ${taxGap > 0.05 ? (darkMode ? "border-blue-400 bg-blue-400/10" : "border-black bg-blue-200") : taxGap < -0.05 ? (darkMode ? "border-red-400 bg-red-400/10" : "border-black bg-red-200") : (darkMode ? "border-green-400 bg-green-400/10" : "border-black bg-green-200")}`}>
                                            <div className="flex justify-between items-center mb-2"><span className="text-[10px] uppercase font-black tracking-widest flex items-center gap-2">{taxGap > 0.05 ? <AlertCircle size={14} /> : taxGap < -0.05 ? <X size={14} /> : <CheckCircle size={14} />}{taxGap > 0.05 ? "BAKI (TAX/SERVIS)" : taxGap < -0.05 ? "TERLEBIH KIRA!" : "NGAM-NGAM!"}</span><span className="font-mono font-black text-lg">{taxGap < 0 ? "-" : ""}{currency}{Math.abs(taxGap).toFixed(2)}</span></div>
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
                            <div className={`w-full max-w-[320px] p-5 rounded-2xl border-2 ${darkMode ? "bg-[#1E1E1E] border-white text-white" : "bg-white border-black text-black"} ${shadowStyle} relative animate-in slide-in-from-bottom-10 max-h-[90vh] overflow-y-auto`}>

                                {!tempQrImage && (
                                    <button onClick={() => setShowPaymentModal(false)} className="absolute top-3 right-3 opacity-50 hover:opacity-100"><X size={20} /></button>
                                )}

                                <h3 className="text-lg font-black uppercase mb-4 flex items-center gap-2"><Wallet size={20} /> Payment Profile</h3>

                                {/* JIKA SEDANG CROP GAMBAR */}
                                {tempQrImage ? (
                                    <div className="space-y-4">
                                        <div className="relative w-full h-64 bg-black rounded-xl border-2 border-dashed border-gray-500 overflow-hidden">
                                            <Cropper
                                                image={tempQrImage}
                                                crop={crop}
                                                zoom={zoom}
                                                aspect={1} // Square Crop
                                                onCropChange={setCrop}
                                                onCropComplete={onCropComplete}
                                                onZoomChange={setZoom}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold uppercase opacity-70">Zoom: {zoom.toFixed(1)}x</label>
                                            <input
                                                type="range"
                                                value={zoom}
                                                min={1}
                                                max={3}
                                                step={0.1}
                                                aria-labelledby="Zoom"
                                                onChange={(e) => setZoom(Number(e.target.value))}
                                                className="w-full accent-blue-500 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                            />
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={cancelCrop} className={`flex-1 py-2 rounded-lg font-bold border-2 ${darkMode ? "border-white text-white" : "border-black text-black"}`}>BATAL</button>
                                            <button onClick={saveCroppedQr} className={`flex-[2] py-2 rounded-lg font-bold border-2 ${darkMode ? "bg-green-500 text-black border-green-500" : "bg-green-500 text-white border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"}`}>CONFIRM CROP</button>
                                        </div>
                                    </div>
                                ) : (
                                    /* UI ASAL (FORM INPUT) */
                                    <div className="space-y-4">
                                        <div className="space-y-2"><label className="text-[10px] font-bold uppercase opacity-70">Nama Bank / E-Wallet</label><input placeholder="Maybank / TNG" value={people.find(p => p.id === paymentProfileId)?.bankName || ""} onChange={e => updatePaymentProfile(paymentProfileId, e.target.value, people.find(p => p.id === paymentProfileId)?.bankAccount || "", people.find(p => p.id === paymentProfileId)?.qrImage || "")} className={inputStyle} /></div>
                                        <div className="space-y-2"><label className="text-[10px] font-bold uppercase opacity-70">No. Akaun</label><input placeholder="1234567890" value={people.find(p => p.id === paymentProfileId)?.bankAccount || ""} onChange={e => updatePaymentProfile(paymentProfileId, people.find(p => p.id === paymentProfileId)?.bankName || "", e.target.value, people.find(p => p.id === paymentProfileId)?.qrImage || "")} className={`${inputStyle} font-mono`} /></div>
                                        <div className="space-y-2 pt-2 border-t border-dashed border-current border-opacity-30">
                                            <label className="text-[10px] font-bold uppercase opacity-70 block mb-2">DuitNow QR (Optional)</label>

                                            <div className="flex items-center gap-3">
                                                {people.find(p => p.id === paymentProfileId)?.qrImage ? (<div className="relative w-24 h-24 border-2 border-current rounded-lg overflow-hidden group flex-shrink-0"><img src={people.find(p => p.id === paymentProfileId)?.qrImage!} className="w-full h-full object-cover" alt="QR" /><button onClick={() => updatePaymentProfile(paymentProfileId, people.find(p => p.id === paymentProfileId)?.bankName || "", people.find(p => p.id === paymentProfileId)?.bankAccount || "", "")} className="absolute inset-0 bg-red-500/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"><Trash2 size={16} className="text-white" /></button></div>) : (<div className="w-24 h-24 border-2 border-dashed border-current rounded-lg flex items-center justify-center opacity-30 flex-shrink-0"><QrCode size={24} /></div>)}
                                                <div className="flex-1 space-y-2">
                                                    <div className={`p-2 rounded text-[9px] leading-tight font-bold ${darkMode ? "bg-yellow-900/30 text-yellow-200" : "bg-yellow-100 text-yellow-800"}`}><p>Sila upload gambar QR. Anda boleh crop & zoom selepas pilih gambar.</p></div>
                                                    <label className={`w-full py-2 px-3 border-2 rounded-xl flex items-center justify-center gap-2 cursor-pointer font-bold uppercase text-[10px] hover:opacity-80 ${darkMode ? "bg-white text-black" : "bg-black text-white"}`}><Upload size={14} /> Pilih Gambar<input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, paymentProfileId)} /></label>
                                                </div>
                                            </div>
                                        </div>
                                        <button onClick={() => setShowPaymentModal(false)} className={`w-full py-3 mt-5 text-sm font-black uppercase rounded-xl border-2 ${darkMode ? "bg-green-400 text-black border-green-400" : "bg-green-400 text-black border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px]"}`}>SIMPAN PROFILE</button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {showPayModal && activeTransfer && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
                            <div className={`w-full max-w-[340px] max-h-[85vh] flex flex-col rounded-2xl overflow-hidden ${darkMode ? "bg-[#1E1E1E] text-white" : "bg-white text-black"} shadow-2xl relative animate-in zoom-in-95`}>
                                <div className="p-4 flex-shrink-0 flex justify-between items-center border-b border-current border-opacity-10"><span className="text-[10px] font-black uppercase tracking-widest opacity-50">SIAP UNTUK SHARE</span><button onClick={() => setShowPayModal(false)}><X size={20} className="opacity-50 hover:opacity-100" /></button></div>
                                <div className={`flex-1 overflow-y-auto p-4 flex flex-col items-center ${darkMode ? "bg-[#111]" : "bg-gray-200"}`}>

                                    <div ref={receiptRef} className={`w-full ${darkMode ? "bg-[#222]" : "bg-white"} p-3 rounded-2xl ${darkMode ? "border-white" : "border-black"} border-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden`}>
                                        <div className={`rounded-xl border-2 border-dashed ${darkMode ? "border-white/30 bg-white/5" : "border-black/20 bg-gray-50"} p-4 relative`}>
                                            <div className="absolute top-[-8px] left-1/2 -translate-x-1/2 w-4 h-1.5 bg-current rounded-full opacity-20"></div>
                                            <div className="text-center border-b-2 border-dashed border-current/20 pb-3 mb-3">
                                                <p className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-1">TOTAL BAYARAN</p>
                                                <h2 className="text-3xl font-black font-mono tracking-tight">{currency}{activeTransfer.amount.toFixed(2)}</h2>
                                            </div>
                                            <div className="flex justify-between items-end mb-4">
                                                <div className="text-left">
                                                    <p className="text-[8px] font-bold opacity-40 uppercase mb-0.5">KEPADA</p>
                                                    <h3 className="text-base font-black uppercase leading-none">{activeTransfer.toName}</h3>
                                                    <p className="text-[8px] font-bold opacity-60 uppercase">{people.find(p => p.id === activeTransfer.toId)?.bankName || "Unknown Bank"}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[8px] font-bold opacity-40 uppercase mb-0.5">DARI</p>
                                                    <h3 className="text-sm font-black uppercase leading-none">{activeTransfer.fromName}</h3>
                                                </div>
                                            </div>
                                            <div className={`p-2 rounded border ${darkMode ? "border-white/20 bg-black/30" : "border-black/10 bg-white"} flex justify-between items-center mb-4`}>
                                                <span className="text-[8px] font-bold uppercase opacity-50">NO AKAUN</span>
                                                <span className="font-mono font-black text-sm tracking-wider">{people.find(p => p.id === activeTransfer.toId)?.bankAccount || "MINTA MEMBER"}</span>
                                            </div>
                                            <div className="mb-4">
                                                <p className="text-[8px] font-bold uppercase opacity-40 mb-1 flex items-center gap-1"><List size={10} /> UNTUK:</p>
                                                <div className="flex flex-wrap gap-1">
                                                    {getTransferDetails(activeTransfer.fromId, activeTransfer.toId).slice(0, 3).map((item, idx) => (
                                                        <span key={idx} className={`text-[9px] font-bold px-1.5 py-0.5 border rounded ${darkMode ? "border-white/20 bg-white/10" : "border-black/20 bg-white"}`}>{item}</span>
                                                    ))}
                                                    {getTransferDetails(activeTransfer.fromId, activeTransfer.toId).length > 3 && (
                                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 border rounded opacity-60 ${darkMode ? "border-white/20 bg-white/5" : "border-black/20 bg-gray-100"}`}>+{getTransferDetails(activeTransfer.fromId, activeTransfer.toId).length - 3} lagi...</span>
                                                    )}
                                                    {getTransferDetails(activeTransfer.fromId, activeTransfer.toId).length === 0 && <span className="text-[9px] italic opacity-50">Settlement baki akaun...</span>}
                                                </div>
                                            </div>
                                            {people.find(p => p.id === activeTransfer.toId)?.qrImage && (
                                                <div className="w-28 h-28 mx-auto border-2 border-current rounded-xl overflow-hidden mb-1">
                                                    <img src={people.find(p => p.id === activeTransfer.toId)?.qrImage!} className="w-full h-full object-cover bg-white" alt="QR" crossOrigin="anonymous" />
                                                </div>
                                            )}
                                            <div className="flex justify-between items-center opacity-40 pt-2 border-t-2 border-dashed border-current/20 mt-2">
                                                <span className="text-[8px] font-bold tracking-widest">SPLITIT.</span>
                                                <span className="text-[8px] font-mono">{new Date().toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    </div>

                                </div>
                                <div className={`p-4 flex-shrink-0 space-y-2 border-t-2 ${darkMode ? "bg-black border-white/20" : "bg-white border-black/10"}`}>
                                    <button onClick={handleOpenImage} disabled={isSharing} className={`w-full py-2.5 text-xs font-bold uppercase rounded-xl border-2 flex items-center justify-center gap-2 ${darkMode ? "border-white hover:bg-white hover:text-black" : "border-black hover:bg-gray-100"}`}>{isSharing ? <RotateCcw size={14} className="animate-spin" /> : <ExternalLink size={14} />} {isSharing ? "GENERATING..." : "BUKA GAMBAR RESIT"}</button>
                                    <button onClick={() => { togglePaymentStatus(activeTransfer.fromId, activeTransfer.toId); setShowPayModal(false); }} className={`w-full py-2.5 text-xs font-black uppercase rounded-xl transition-all shadow-lg hover:shadow-none hover:translate-y-[2px] ${paidStatus[`${activeTransfer.fromId}-${activeTransfer.toId}`] ? "bg-red-500 text-white" : "bg-green-500 text-black"}`}>{paidStatus[`${activeTransfer.fromId}-${activeTransfer.toId}`] ? "BATAL / MARK UNPAID" : "✅ DAH TRANSFER"}</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {showScanMethodModal && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
                            <div className={`w-full max-w-[320px] p-6 rounded-2xl border-2 ${darkMode ? "bg-[#1E1E1E] border-white text-white" : "bg-white border-black text-black"} shadow-2xl relative animate-in zoom-in-95`}>
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-lg font-black uppercase flex items-center gap-2"><Camera size={20} /> Pilih Sumber Resit</h3>
                                    <button onClick={() => setShowScanMethodModal(false)}><X size={20} /></button>
                                </div>
                                <div className="space-y-4">
                                    <label className={`block w-full p-4 rounded-xl border-2 text-center cursor-pointer transition-all active:scale-95 hover:bg-opacity-10 ${darkMode ? "border-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20" : "border-indigo-600 bg-indigo-50 hover:bg-indigo-100"}`}>
                                        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleScanReceipt} />
                                        <Camera size={32} className={`mx-auto mb-2 ${darkMode ? "text-indigo-400" : "text-indigo-600"}`} />
                                        <span className="block font-black uppercase text-sm">Ambil Gambar (Camera)</span>
                                    </label>
                                    <label className={`block w-full p-4 rounded-xl border-2 text-center cursor-pointer transition-all active:scale-95 hover:bg-opacity-10 ${darkMode ? "border-white/30 bg-white/5 hover:bg-white/10" : "border-black/20 bg-gray-50 hover:bg-gray-100"}`}>
                                        <input type="file" accept="image/*" className="hidden" onChange={handleScanReceipt} />
                                        <ImageIcon size={32} className="mx-auto mb-2 opacity-50" />
                                        <span className="block font-black uppercase text-sm opacity-70">Pilih Dari Gallery</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}

                    {showScanModal && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
                            <div className={`w-full max-w-[360px] max-h-[85vh] flex flex-col rounded-2xl border-2 ${darkMode ? "bg-[#1E1E1E] border-white text-white" : "bg-white border-black text-black"} shadow-2xl relative animate-in zoom-in-95`}>
                                {isScanning ? (
                                    <div className="flex-1 flex flex-col items-center justify-center p-10 text-center space-y-4">
                                        <Loader2 size={48} className="animate-spin text-blue-500" />
                                        <div><h3 className="text-xl font-black uppercase">Sedang Scan...</h3><p className="text-xs font-bold opacity-60 mt-1">{scanStatus}</p></div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="p-4 border-b border-current border-opacity-10 flex justify-between items-center">
                                            <h3 className="text-sm font-black uppercase flex items-center gap-2"><Camera size={16} /> Hasil Scan AI</h3>
                                            <button onClick={() => setShowScanModal(false)}><X size={20} /></button>
                                        </div>
                                        <div className="px-4 pt-4 space-y-2">
                                            {(scannedExtraInfo.tax > 0 || scannedExtraInfo.service > 0) && (
                                                <div className={`p-2 rounded-xl border-2 border-dashed flex items-start gap-2 ${darkMode ? "border-yellow-500/50 bg-yellow-500/10" : "border-yellow-600/30 bg-yellow-50"}`}>
                                                    <AlertCircle size={14} className="mt-0.5 text-yellow-500" />
                                                    <div className="flex-1">
                                                        <p className="text-[9px] font-black uppercase opacity-70">Tax/SC: {currency}{(scannedExtraInfo.tax + scannedExtraInfo.service).toFixed(2)}</p>
                                                        <label className="flex items-center gap-1.5 text-[9px] font-bold cursor-pointer"><input type="checkbox" checked={includeScannedTax} onChange={(e) => setIncludeScannedTax(e.target.checked)} className="accent-yellow-500 w-3 h-3" />Masuk Caj Tetap?</label>
                                                    </div>
                                                </div>
                                            )}
                                            {(scannedExtraInfo.discount > 0 || scannedExtraInfo.deposit > 0) && (
                                                <div className={`p-2 rounded-xl border-2 border-dashed flex items-start gap-2 ${darkMode ? "border-green-500/50 bg-green-500/10" : "border-green-600/30 bg-green-50"}`}>
                                                    <Tag size={14} className="mt-0.5 text-green-500" />
                                                    <div className="flex-1">
                                                        <p className="text-[9px] font-black uppercase opacity-70">Disc/Depo: {currency}{(scannedExtraInfo.discount + scannedExtraInfo.deposit).toFixed(2)}</p>
                                                        <label className="flex items-center gap-1.5 text-[9px] font-bold cursor-pointer"><input type="checkbox" checked={includeScannedDiscount} onChange={(e) => setIncludeScannedDiscount(e.target.checked)} className="accent-green-500 w-3 h-3" />Masuk Kotak Diskaun?</label>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                            {scannedItems.length === 0 ? (<div className="text-center py-10 opacity-50"><p className="text-xs font-bold">Tak jumpa item. Cuba scan lagi.</p></div>) : (scannedItems.map(item => (<div key={item.id} className={`p-3 rounded-xl border-2 transition-all ${item.selected ? (darkMode ? "border-green-400 bg-green-400/5" : "border-green-500 bg-green-50/30") : "opacity-40 grayscale"}`}><div className="flex items-start gap-2 mb-3"><input type="checkbox" checked={item.selected} onChange={() => toggleScanItem(item.id)} className="mt-1 accent-green-500 w-4 h-4" /><div className="flex-1"><input value={item.name} onChange={e => updateScannedItem(item.id, 'name', e.target.value)} className="w-full bg-transparent font-bold text-xs outline-none border-b border-dashed border-current/20 focus:border-green-500 mb-1" /><div className="flex items-center gap-1"><span className="text-[10px] opacity-50">{currency}</span><input type="number" value={item.price} onChange={e => updateScannedItem(item.id, 'price', e.target.value)} className="w-20 bg-transparent font-mono font-black text-sm outline-none" /></div></div><button onClick={() => deleteScannedItem(item.id)} className="p-1 text-red-500 hover:bg-red-500/10 rounded-lg"><Trash2 size={14} /></button></div><div className="flex flex-wrap gap-1 pt-2 border-t border-dashed border-current/10">{people.map(p => { const isAssigned = item.sharedBy.includes(p.id); return (<button key={p.id} onClick={() => togglePersonInScan(item.id, p.id)} className={`px-2 py-1 rounded-md text-[9px] font-black uppercase border transition-all ${isAssigned ? (darkMode ? "bg-blue-500 border-blue-400 text-white" : "bg-blue-600 border-black text-white shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]") : (darkMode ? "border-white/20 text-white/40" : "border-black/20 text-black/40")}`}>{p.name}</button>); })}</div></div>)))}
                                        </div>
                                        <div className="p-4 border-t border-current border-opacity-10 bg-current/5">
                                            <button onClick={addSelectedScannedItems} className={`w-full py-3 rounded-xl font-black uppercase text-xs border-2 ${darkMode ? "bg-white text-black border-white" : "bg-black text-white border-black"} shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all`}>Masukkan {scannedItems.filter(i => i.selected).length} Item Ke Bill</button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {showCurrencyModal && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
                            <div className={`w-full max-w-[320px] p-6 rounded-[2rem] border-2 ${darkMode ? "bg-zinc-900 border-white text-white" : "bg-white border-black text-black"} shadow-2xl relative`}>
                                <button onClick={() => setShowCurrencyModal(false)} className="absolute top-5 right-5 opacity-50 hover:opacity-100"><X size={20} /></button>
                                <h2 className="text-xl font-black uppercase mb-6 flex items-center gap-2 tracking-tighter"><Globe size={24} /> Pilih Mata Wang</h2>
                                <div className="grid grid-cols-2 gap-3">
                                    {[{ s: "RM", n: "Malaysia" }, { s: "S$", n: "Singapore" }, { s: "฿", n: "Thailand" }, { s: "Rp", n: "Indonesia" }, { s: "₱", n: "Philippines" }, { s: "₫", n: "Vietnam" }].map((c) => (
                                        <button key={c.s} onClick={() => { setCurrency(c.s); setShowCurrencyModal(false); }} className={`p-4 rounded-xl border-2 flex flex-col items-center gap-1 transition-all active:scale-95 ${currency === c.s ? (darkMode ? "bg-white text-black border-white" : "bg-black text-white border-black") : "border-current opacity-50 hover:opacity-100"}`}>
                                            <span className="text-2xl font-black">{c.s}</span>
                                            <span className="text-[9px] uppercase font-bold tracking-widest opacity-70">{c.n}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {showSessionModal && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
                            <div className={`w-full max-w-[340px] p-6 rounded-2xl border-2 ${darkMode ? "bg-[#1E1E1E] border-white text-white" : "bg-white border-black text-black"} ${shadowStyle} relative`}>
                                <button onClick={() => setShowSessionModal(false)} className="absolute top-4 right-4 opacity-50 hover:opacity-100"><X size={20} /></button>
                                <h2 className="text-xl font-black uppercase mb-6 flex items-center gap-2"><Folder size={24} /> Pilih Sesi</h2>
                                <div className="space-y-3 max-h-[300px] overflow-y-auto mb-6 pr-1">
                                    {sessions.map(s => (
                                        <div key={s.id} className={`p-4 rounded-xl border-2 flex items-center justify-between transition-all ${activeSessionId === s.id ? (darkMode ? "border-green-400 bg-green-900/20" : "border-black bg-green-100") : (darkMode ? "border-white/10 bg-white/5" : "border-black/5 bg-gray-50")}`}>
                                            {editingSessionId === s.id ? (
                                                <div className="flex-1 flex gap-2"><input autoFocus value={tempSessionName} onChange={e => setTempSessionName(e.target.value)} onKeyDown={e => e.key === "Enter" && saveRenameSession()} className={`flex-1 bg-transparent border-b-2 outline-none font-bold text-sm ${darkMode ? "border-white" : "border-black"}`} /><button onClick={saveRenameSession} className="p-1 text-green-500 hover:scale-110 transition"><Save size={16} /></button></div>
                                            ) : (
                                                <div onClick={() => { setActiveSessionId(s.id); setShowSessionModal(false); }} className="flex-1 cursor-pointer"><h3 className={`font-bold text-sm ${darkMode ? "text-white" : "text-black"}`}>{s.name}</h3><p className="text-[10px] opacity-50">{new Date(s.createdAt).toLocaleDateString()}</p></div>
                                            )}
                                            <div className="flex items-center gap-1 pl-2">
                                                {activeSessionId === s.id && !editingSessionId && <CheckCircle size={16} className="text-green-500 mr-1" />}
                                                {!editingSessionId && (<><button onClick={() => startRenameSession(s)} className={`p-2 transition-all ${darkMode ? "text-white/50 hover:text-blue-400" : "text-black/50 hover:text-blue-600"}`}><Edit3 size={14} /></button>{sessions.length > 1 && (<button onClick={() => deleteSession(s.id)} className="p-2 opacity-50 hover:opacity-100 hover:text-red-500 transition"><Trash2 size={14} /></button>)}</>)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="pt-6 border-t border-dashed border-current border-opacity-30">
                                    <label className="text-[10px] font-bold uppercase opacity-70 block mb-2">Buka Sesi Baru</label>
                                    <div className="flex gap-2"><input value={newSessionName} onChange={e => setNewSessionName(e.target.value)} placeholder="Contoh: Trip Hatyai" className={`flex-1 px-3 py-2 rounded-lg bg-transparent border-2 outline-none text-sm font-bold ${darkMode ? "border-white/30 focus:border-white" : "border-black/30 focus:border-black"}`} /><button onClick={createNewSession} disabled={!newSessionName} className={`px-4 py-2 rounded-lg border-2 font-bold text-sm ${darkMode ? "bg-white text-black border-white" : "bg-black text-white border-black"} disabled:opacity-50`}>OK</button></div>
                                </div>
                            </div>
                        </div>
                    )}

                    {showPreviewModal && previewImage && (
                        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md animate-in fade-in">
                            <div className="relative w-full max-w-sm flex flex-col items-center gap-4 animate-in zoom-in-95 duration-300">
                                <button onClick={() => setShowPreviewModal(false)} className="absolute -top-12 right-0 p-2 text-white/50 hover:text-white bg-white/10 rounded-full transition-colors"><X size={24} /></button>
                                <h3 className="text-white text-xs font-bold uppercase tracking-[0.2em] text-center opacity-80">Preview Resit</h3>
                                <img src={previewImage} alt="Receipt Preview" className="w-full rounded-2xl border-2 border-white/20 shadow-2xl" />
                                <div className="text-center space-y-3 mt-2">
                                    <div className="bg-white/10 px-4 py-2 rounded-lg backdrop-blur"><p className="text-white text-[10px] font-bold uppercase tracking-wide animate-pulse">📲 iPhone: Tekan Lama (Long Press) Gambar</p><p className="text-white/50 text-[9px]">Pilih "Save to Photos" atau "Share"</p></div>
                                    {typeof navigator !== "undefined" && navigator.share && (<button onClick={async () => { try { const blob = await (await fetch(previewImage)).blob(); const file = new File([blob], "Settlement.png", { type: "image/png" }); await navigator.share({ files: [file], title: 'Resit SplitIt' }); } catch (e) { } }} className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white font-bold rounded-full text-[10px] uppercase tracking-widest hover:bg-blue-500 transition-colors mx-auto"><ExternalLink size={12} /> Share Sekarang</button>)}
                                </div>
                            </div>
                        </div>
                    )}
                    {/* INVITE MODAL (New V4.3) */}
                    {showInviteModal && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
                            <div className={`w-full max-w-[340px] p-6 rounded-2xl border-2 ${darkMode ? "bg-[#1E1E1E] border-white text-white" : "bg-white border-black text-black"} shadow-2xl relative animate-in zoom-in-95`}>
                                <button onClick={() => setShowInviteModal(false)} className="absolute top-4 right-4 opacity-50 hover:opacity-100"><X size={20} /></button>

                                <div className="text-center mb-6">
                                    <div className={`w-16 h-16 mx-auto rounded-2xl border-2 flex items-center justify-center mb-4 ${darkMode ? "bg-indigo-600 border-white text-white" : "bg-indigo-100 border-black text-indigo-600"}`}>
                                        <Users size={32} />
                                    </div>
                                    <h2 className="text-xl font-black uppercase leading-tight">Ajak Member Join!</h2>
                                    <p className="text-xs font-bold opacity-60 mt-2 leading-relaxed">
                                        Share link ni dekat group WhatsApp. Member boleh masuk, tolong key-in item, dan tanda makan apa sendiri.
                                    </p>
                                </div>

                                <div className={`p-4 rounded-xl border-2 mb-6 flex flex-col items-center gap-2 ${darkMode ? "bg-black border-white/20" : "bg-gray-100 border-black/10"}`}>
                                    <p className="text-[9px] font-black uppercase tracking-widest opacity-50">SESSION LINK</p>
                                    <div className="flex items-center gap-2 w-full">
                                        <Globe size={14} className="opacity-50" />
                                        <span className="text-xs font-mono truncate flex-1 opacity-70">
                                            {window.location.origin}/splitit?join={activeSessionId}
                                        </span>
                                    </div>
                                </div>

                                <button onClick={() => {
                                    const link = `${window.location.origin}/splitit?join=${activeSessionId}`;
                                    if (typeof navigator !== "undefined" && navigator.share) {
                                        navigator.share({ title: 'Jom Split Bill!', text: `Jom settle bill ${activeSession?.name} kat sini:`, url: link }).catch(console.error);
                                    } else {
                                        navigator.clipboard.writeText(link);
                                        alert("Link dah copy! Paste kat WhatsApp.");
                                    }
                                    setShowInviteModal(false);
                                }} className={`w-full py-4 rounded-xl font-black uppercase text-sm border-2 flex items-center justify-center gap-2 transition-all active:scale-95 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] ${darkMode ? "bg-white text-black border-white shadow-none" : "bg-indigo-500 text-white border-black"}`}>
                                    <Copy size={16} /> COPY / SHARE LINK
                                </button>
                            </div>
                        </div>
                    )}
                    {/* LOGIN GUIDE MODAL (Google Unverified Warning) */}
                    {showLoginGuide && (
                        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in">
                            <div className={`w-full max-w-[320px] p-6 rounded-2xl border-2 ${darkMode ? "bg-[#1E1E1E] border-white text-white" : "bg-white border-black text-black"} shadow-2xl relative animate-in zoom-in-95`}>
                                <button onClick={() => setShowLoginGuide(false)} className="absolute top-4 right-4 opacity-50 hover:opacity-100"><X size={20} /></button>

                                <div className="text-center mb-4">
                                    <div className="w-16 h-16 mx-auto bg-yellow-100 rounded-full flex items-center justify-center mb-3 border-2 border-black">
                                        <AlertCircle size={32} className="text-yellow-600" />
                                    </div>
                                    <h2 className="text-lg font-black uppercase leading-tight text-red-500">Google Warning!</h2>
                                    <p className="text-[10px] font-bold opacity-60 mt-2 leading-relaxed">
                                        App ni masih status "Beta" di Google. Anda mungkin nampak amaran keselamatan. Jangan risau, ini normal.
                                    </p>
                                </div>

                                {/* Visual Guide (Kotak Arahan) */}
                                <div className={`p-4 rounded-xl border-2 border-dashed mb-6 text-left space-y-3 ${darkMode ? "bg-black/30 border-white/20" : "bg-gray-50 border-black/10"}`}>
                                    <p className="text-[9px] font-black uppercase opacity-50 mb-1">LANGKAH UNTUK LEPAS:</p>
                                    <div className="flex items-start gap-3">
                                        <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">1</span>
                                        <p className="text-xs font-bold">Tekan link <span className="underline decoration-red-500 decoration-2">Advanced</span> di bawah kiri.</p>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">2</span>
                                        <p className="text-xs font-bold">Tekan <span className="underline decoration-red-500 decoration-2">Go to SplitIt (unsafe)</span>.</p>
                                    </div>
                                </div>

                                <button onClick={openAuthOptions} className={`w-full py-3 rounded-xl font-black uppercase text-xs border-2 flex items-center justify-center gap-2 transition-all active:scale-95 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] ${darkMode ? "bg-white text-black border-white shadow-none" : "bg-blue-600 text-white border-black"}`}>
                                    FAHAM, TERUSKAN LOGIN <ArrowRight size={14} />
                                </button>

                                <p className="text-[9px] text-center mt-3 opacity-40 font-bold">Kami tak simpan password anda.</p>
                            </div>
                        </div>
                    )}
                    {/* 1. AUTH MODAL (Pilihan Google/Email) */}
                    <AuthModal
                        isOpen={showAuthModal}
                        onClose={() => setShowAuthModal(false)}
                        isDarkMode={darkMode}
                    />

                    {/* 2. LOGIN GUIDE MODAL (Warning Google) */}
                    {showLoginGuide && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in">
                            <div className={`w-full max-w-[320px] p-6 rounded-2xl border-2 ${darkMode ? "bg-[#1E1E1E] border-white text-white" : "bg-white border-black text-black"} shadow-2xl relative animate-in zoom-in-95`}>
                                <button onClick={() => setShowLoginGuide(false)} className="absolute top-4 right-4 opacity-50 hover:opacity-100"><X size={20} /></button>

                                <div className="text-center mb-4">
                                    <div className="w-16 h-16 mx-auto bg-yellow-100 rounded-full flex items-center justify-center mb-3 border-2 border-black">
                                        <AlertCircle size={32} className="text-yellow-600" />
                                    </div>
                                    <h2 className="text-lg font-black uppercase leading-tight text-red-500">Google Warning!</h2>
                                    <p className="text-[10px] font-bold opacity-60 mt-2 leading-relaxed">
                                        App status "Beta". Kalau nampak warning merah, jangan panik. Ikut langkah di bawah.
                                    </p>
                                </div>

                                <div className={`p-4 rounded-xl border-2 border-dashed mb-6 text-left space-y-3 ${darkMode ? "bg-black/30 border-white/20" : "bg-gray-50 border-black/10"}`}>
                                    <p className="text-[9px] font-black uppercase opacity-50 mb-1">CARA LEPAS WARNING:</p>
                                    <div className="flex items-start gap-3">
                                        <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">1</span>
                                        <p className="text-xs font-bold">Tekan link <span className="underline decoration-red-500 decoration-2">Advanced</span> (Kiri Bawah).</p>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">2</span>
                                        <p className="text-xs font-bold">Tekan <span className="underline decoration-red-500 decoration-2">Go to SplitIt (unsafe)</span>.</p>
                                    </div>
                                </div>

                                <button onClick={openAuthOptions} className={`w-full py-3 rounded-xl font-black uppercase text-xs border-2 flex items-center justify-center gap-2 transition-all active:scale-95 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] ${darkMode ? "bg-white text-black border-white shadow-none" : "bg-blue-600 text-white border-black"}`}>
                                    FAHAM, PILIH CARA LOGIN <ArrowRight size={14} />
                                </button>
                                <p className="text-[9px] text-center mt-3 opacity-40 font-bold">Safe & Secure. No password stored.</p>
                            </div>
                        </div>
                    )}
                </main>
            </div >
        </div >
    );
}

// --- WRAPPER UNTUK ELAK ERROR BUILD (STEP 3) ---
export default function SplitItCloud() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-black">
                <Loader2 className="animate-spin w-10 h-10 text-blue-500" />
            </div>
        }>
            <SplitItContent />
        </Suspense>
    );
}