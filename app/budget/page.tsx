"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
    ArrowLeft, Camera, Plus, Wallet,
    TrendingUp, TrendingDown, MoreHorizontal,
    ShoppingBag, Coffee, Car, Home, Zap,
    Moon, Sun, ChevronDown, ScanLine, X, Loader2, Utensils, Fuel, Trash2, Pencil, Image as ImageIcon, Calendar, User, Receipt, AlertCircle, ArrowRight, Eye, EyeOff, Target, Search, RotateCcw, Link as LinkIcon, Link2Off,
    ShieldCheck, AlertTriangle, Activity
} from "lucide-react";
import AuthModal from "@/components/Auth";
import { supabase } from "@/lib/supabaseClient";

// --- 1. CONFIG & STYLES ---
const APP_NAME = "Budget.AI";
const APP_VERSION = "v1.0.1-clean";

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

// Helper: Convert PDF to Base64 (Gemini can handle PDF directly)
const convertFileToBase64 = (file: File): Promise<{ base64: string; mimeType: string }> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const result = event.target?.result as string;
            const base64 = result.split(",")[1];
            const mimeType = file.type === "application/pdf" ? "application/pdf" : "image/jpeg";
            resolve({ base64, mimeType });
        };
        reader.onerror = (err) => reject(err);
    });
};

// Helper: Pilih Icon ikut Kategori
const getCategoryIcon = (category: string) => {
    switch (category) {
        case "Makan": return <Utensils size={16} />;
        case "Transport": return <Car size={16} />;
        case "Shopping": return <ShoppingBag size={16} />;
        case "Bills": return <Zap size={16} />;
        case "Income": return <Wallet size={16} />;
        case "Utility": return <Zap size={16} />;
        default: return <ScanLine size={16} />;
    }
};

// Helper: Pilih Warna ikut Kategori (New Brutalism Style)
const getCategoryColor = (category: string) => {
    switch (category) {
        case "Makan": return { bg: "bg-pink-300", text: "text-pink-700", border: "border-pink-700" };
        case "Transport": return { bg: "bg-blue-300", text: "text-blue-700", border: "border-blue-700" };
        case "Shopping": return { bg: "bg-purple-300", text: "text-purple-700", border: "border-purple-700" };
        case "Bills": return { bg: "bg-orange-300", text: "text-orange-700", border: "border-orange-700" };
        case "Income": return { bg: "bg-green-300", text: "text-green-700", border: "border-green-700" };
        case "Utility": return { bg: "bg-yellow-300", text: "text-yellow-700", border: "border-yellow-700" };
        case "Lain-lain": return { bg: "bg-indigo-300", text: "text-indigo-700", border: "border-indigo-700" };
        default: return { bg: "bg-gray-300", text: "text-gray-700", border: "border-gray-700" };
    }
};

// Type Definition untuk Transaksi
type Transaction = {
    id: number;
    title: string;
    category: string;
    amount: number; // Negatif = Belanja, Positif = Income
    date: string;
    isoDate: string; // Format: "YYYY-MM-DD" untuk calendar heatmap
};

export default function BudgetPage() {
    // --- STATE ---
    const [darkMode, setDarkMode] = useState(false);
    const [isScanning, setIsScanning] = useState(false); // Loading state untuk AI
    const [scanStatus, setScanStatus] = useState("Ready");
    const [showManualModal, setShowManualModal] = useState(false); // Modal Manual
    const [showAnalytics, setShowAnalytics] = useState(false); // Toggle Analitik
    const [showAllTransactions, setShowAllTransactions] = useState(false); // Modal Senarai Semua
    const [showScanMethodModal, setShowScanMethodModal] = useState(false); // Modal Pilih Camera/Gallery
    const [showScanResultModal, setShowScanResultModal] = useState(false); // Modal Review Scan Result
    const [scannedTransaction, setScannedTransaction] = useState<Transaction | null>(null); // Preview scanned transaction (single)
    const [scannedTransactions, setScannedTransactions] = useState<Transaction[]>([]); // Multiple scanned transactions (from PDF)
    const [editingId, setEditingId] = useState<number | null>(null);
    const [isDataLoaded, setIsDataLoaded] = useState(false); // Flag untuk prevent overwrite semasa initial load

    // Calendar & Date Filter State
    const [selectedDate, setSelectedDate] = useState<Date>(new Date()); // Default: current month
    const [showCalendarModal, setShowCalendarModal] = useState(false);
    const [user, setUser] = useState<any>(null); // Auth user state
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [showLoginGuide, setShowLoginGuide] = useState(false); // Google Warning Modal

    // Sync Status State
    const [syncStatus, setSyncStatus] = useState<"SAVED" | "SAVING" | "ERROR" | "OFFLINE">("OFFLINE");

    // Feature 1: Ghost Mode State
    const [isGhostMode, setIsGhostMode] = useState(false);

    // Feature 2: Budget Limit State
    const [budgetLimit, setBudgetLimit] = useState(0);
    const [showBudgetLimitModal, setShowBudgetLimitModal] = useState(false);
    const [tempBudgetLimit, setTempBudgetLimit] = useState("");

    // Feature 3: Smart Balance / Safe-to-Spend
    const [showSafeToSpend, setShowSafeToSpend] = useState(false);
    const [totalCommitments, setTotalCommitments] = useState(0);
    const [unpaidCommitments, setUnpaidCommitments] = useState(0);

    // NEW: State untuk Filter (Multi-select)
    const [activeFilters, setActiveFilters] = useState<string[]>([]);

    // Smart Search Bar State
    const [searchQuery, setSearchQuery] = useState("");

    // Senarai Kategori (Kita extract keluar supaya senang nak map)
    const EXPENSE_CATEGORIES = ["Makan", "Transport", "Shopping", "Bills", "Utility", "Lain-lain"];
    const INCOME_CATEGORIES = ["Income", "Lain-lain"];
    const ALL_CATEGORIES = ["Makan", "Transport", "Shopping", "Bills", "Income", "Utility", "Lain-lain"];

    // Form State (Untuk Manual Input)
    const [newTitle, setNewTitle] = useState("");
    const [newAmount, setNewAmount] = useState("");
    const [newCategory, setNewCategory] = useState("Makan");
    const [newType, setNewType] = useState("expense"); // 'expense' or 'income'
    const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]); // Default: Today

    // Data Transaksi (Boleh save ke LocalStorage/Supabase nanti)
    // Start dengan array kosong - akan load dari localStorage
    const [transactions, setTransactions] = useState<Transaction[]>([]);

    // Calculated State
    const [balance, setBalance] = useState(0);
    const [expenseMonth, setExpenseMonth] = useState(0);
    const currency = "RM"; // Currency symbol

    // Ref untuk Input Kamera
    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- EFFECT: LOAD & SAVE DATA ---

    // 0. Check Supabase Session (Link dengan Home Page)
    useEffect(() => {
        // Check session dari Supabase
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user || null);
        });

        // Listen untuk auth state changes (sync dengan home page)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user || null);
            // TODO: Load data dari cloud jika ada
        });

        return () => subscription.unsubscribe();
    }, []);

    // 1. Load data bila app mula buka (Run sekali je)
    useEffect(() => {
        const savedData = localStorage.getItem("budget_data");
        if (savedData) {
            try {
                const parsed = JSON.parse(savedData);
                // Migrate old data: Add isoDate if missing
                const migrated = parsed.map((t: Transaction) => {
                    if (!t.isoDate) {
                        // Try to generate isoDate from date string
                        try {
                            const parts = t.date.split(' ');
                            if (parts.length >= 2) {
                                const day = parseInt(parts[0]);
                                const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                                const month = monthNames.indexOf(parts[1]);
                                if (month !== -1 && !isNaN(day)) {
                                    const txDate = new Date(new Date().getFullYear(), month, day);
                                    return { ...t, isoDate: txDate.toISOString().split('T')[0] };
                                }
                            }
                            // Fallback: use current date
                            return { ...t, isoDate: new Date().toISOString().split('T')[0] };
                        } catch {
                            return { ...t, isoDate: new Date().toISOString().split('T')[0] };
                        }
                    }
                    return t;
                });
                setTransactions(migrated);
                setSyncStatus(user ? "SAVED" : "OFFLINE");
            } catch (e) {
                console.error("Failed to load data:", e);
                setSyncStatus("ERROR");
            }
        } else {
            setSyncStatus(user ? "SAVED" : "OFFLINE");
        }
        setIsDataLoaded(true);

        // Load Budget Limit
        const savedLimit = localStorage.getItem("budget_limit");
        if (savedLimit) {
            try {
                setBudgetLimit(parseFloat(savedLimit) || 0);
            } catch (e) {
                console.error("Failed to load budget limit:", e);
            }
        }

        // Load Safe-to-Spend Preference
        const savedSafePreference = localStorage.getItem("budget_show_safe_to_spend");
        if (savedSafePreference === "true") {
            setShowSafeToSpend(true);
        }
    }, [user]);

    // 2. Save data setiap kali 'transactions' berubah
    useEffect(() => {
        // Jangan save kalau data belum loaded (elak overwrite masa first load)
        if (!isDataLoaded) return;

        // Elak overwrite data dengan array kosong jika baru saja load
        // Tapi kita benarkan save array kosong jika user memadam semua data (handled by isDataLoaded logic)

        setSyncStatus("SAVING");
        try {
            // Save ke localStorage
            localStorage.setItem("budget_data", JSON.stringify(transactions));

            // Delay sedikit untuk show SAVING status
            setTimeout(() => {
                setSyncStatus(user ? "SAVED" : "OFFLINE");
            }, 300);
        } catch (e) {
            console.error("Failed to save data:", e);
            setSyncStatus("ERROR");
        }
    }, [transactions, user, isDataLoaded]);

    // Save Budget Limit
    useEffect(() => {
        if (budgetLimit > 0) {
            localStorage.setItem("budget_limit", String(budgetLimit));
        }
    }, [budgetLimit]);

    // Save Safe-to-Spend Preference
    useEffect(() => {
        localStorage.setItem("budget_show_safe_to_spend", String(showSafeToSpend));
    }, [showSafeToSpend]);

    // Effect: Baca subtracker_data (Link Sub.Tracker)
    useEffect(() => {
        const loadCommitments = () => {
            const savedData = localStorage.getItem("subtracker_data");
            if (savedData) {
                try {
                    const parsed = JSON.parse(savedData);
                    let monthlySum = 0;
                    let unpaidSum = 0;

                    const today = new Date();
                    today.setHours(0, 0, 0, 0);

                    parsed.forEach((s: any) => {
                        const price = s.cycle === "Monthly" ? s.price : (s.price / 12);
                        monthlySum += price;

                        // Logic Check: Unpaid Commitments (Kalau tarikh bayar belum lepas hari ni)
                        const dueDate = new Date(s.nextPaymentDate);
                        dueDate.setHours(0, 0, 0, 0);

                        if (dueDate >= today) {
                            unpaidSum += price;
                        }
                    });

                    setTotalCommitments(monthlySum);
                    setUnpaidCommitments(unpaidSum);
                } catch (e) {
                    console.error("Failed to parse subtracker data:", e);
                }
            }
        };

        loadCommitments();
        // Listen to storage changes (if user updates sub-tracker in another tab)
        window.addEventListener("storage", loadCommitments);
        return () => window.removeEventListener("storage", loadCommitments);
    }, []);

    // Helper: Filter transactions by selected date/month
    const getFilteredTransactions = () => {
        const selectedYear = selectedDate.getFullYear();
        const selectedMonth = selectedDate.getMonth();

        return transactions.filter(t => {
            // Use isoDate if available (more accurate)
            if (t.isoDate) {
                try {
                    const txDate = new Date(t.isoDate);
                    if (!isNaN(txDate.getTime())) {
                        return txDate.getFullYear() === selectedYear && txDate.getMonth() === selectedMonth;
                    }
                } catch {
                    // Fall through to date parsing
                }
            }

            // Fallback: Parse from date string (format: "12 Jan")
            try {
                const parts = t.date.split(' ');
                if (parts.length >= 2) {
                    const day = parseInt(parts[0]);
                    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    const month = monthNames.indexOf(parts[1]);
                    if (month !== -1 && !isNaN(day)) {
                        // Use selected year for comparison
                        const txDate = new Date(selectedYear, month, day);
                        return txDate.getFullYear() === selectedYear && txDate.getMonth() === selectedMonth;
                    }
                }
                // If can't parse, include it (for backward compatibility)
                return true;
            } catch {
                // If error, include it (for backward compatibility)
                return true;
            }
        });
    };

    // --- EFFECT: AUTO CALCULATE ---
    useEffect(() => {
        const filtered = getFilteredTransactions();

        // Kira Baki Semasa (dari filtered transactions)
        const total = filtered.reduce((acc, curr) => acc + curr.amount, 0);
        setBalance(total);

        // Kira Belanja Sahaja (Amount Negatif)
        const expense = filtered
            .filter(t => t.amount < 0)
            .reduce((acc, curr) => acc + Math.abs(curr.amount), 0);
        setExpenseMonth(expense);

    }, [transactions, selectedDate]);

    // --- HANDLERS ---

    // 1. Manual Input Handler (UPGRADED: ADD & EDIT)
    const handleSaveTransaction = () => {
        // Validation: Check title and amount
        if (!newTitle || !newTitle.trim()) {
            alert("Sila isi tajuk/kedai!");
            return;
        }

        if (!newAmount || newAmount.trim() === "") {
            alert("Sila isi jumlah!");
            return;
        }

        const amountVal = parseFloat(newAmount);
        if (isNaN(amountVal) || amountVal <= 0) {
            alert("Sila masukkan jumlah yang sah (lebih dari 0)!");
            return;
        }

        // Logic: Expense jadi Negatif, Income jadi Positif
        const finalAmount = newType === "expense" ? -Math.abs(amountVal) : Math.abs(amountVal);

        // Generate ISO Date (YYYY-MM-DD)
        const dateObj = newDate ? new Date(newDate) : new Date();
        const isoDate = newDate || dateObj.toISOString().split('T')[0];
        const displayDate = dateObj.toLocaleDateString('en-MY', { day: 'numeric', month: 'short' });

        if (editingId) {
            // --- MODE EDIT: Cari item lama & update ---
            const updatedList = transactions.map(t =>
                t.id === editingId
                    ? { ...t, title: newTitle.trim(), amount: finalAmount, category: newCategory, date: displayDate, isoDate: isoDate }
                    : t
            );
            setTransactions(updatedList);
            alert("Rekod berjaya dikemaskini!");
        } else {
            // --- MODE BARU: Tambah item baru ---
            const newTx: Transaction = {
                id: Date.now(),
                title: newTitle.trim(),
                category: newCategory,
                amount: finalAmount,
                date: displayDate,
                isoDate: isoDate,
            };
            setTransactions([newTx, ...transactions]);

            // Auto-switch selectedDate ke bulan rekod baru (bulan semasa) untuk memastikan rekod muncul
            const today = new Date();
            const currentYear = today.getFullYear();
            const currentMonth = today.getMonth();
            const selectedYear = selectedDate.getFullYear();
            const selectedMonth = selectedDate.getMonth();

            // Kalau selectedDate bukan bulan semasa, switch ke bulan semasa
            if (selectedYear !== currentYear || selectedMonth !== currentMonth) {
                setSelectedDate(new Date(currentYear, currentMonth, 1));
            }

            alert("Rekod berjaya disimpan!");
        }

        // Reset & Tutup
        setShowManualModal(false);
        setEditingId(null); // Reset ID
        setNewTitle("");
        setNewAmount("");
        setNewCategory("Makan");
        setNewType("expense");
        setNewDate(new Date().toISOString().split('T')[0]);
    };

    // 2. Delete Handler
    const handleDelete = (id: number) => {
        // Tanya user dulu (Safety)
        if (confirm("Betul nak buang rekod ni?")) {
            const updatedList = transactions.filter(t => t.id !== id);
            setTransactions(updatedList);
        }
    };

    // 4. Reset All Data Handler (Macam SplitIt)
    const handleResetData = () => {
        if (confirm("⚠️ AMARAN KRITIKAL:\n\nAdakah anda pasti nak RESET semua data?")) {
            localStorage.clear();
            window.location.reload();
        }
    };

    // 3. AI Scanner Logic (Gemini API) - Support Image & PDF
    const handleScanReceipt = async (e: React.ChangeEvent<HTMLInputElement>) => {
        setShowScanMethodModal(false);
        const file = e.target.files?.[0];
        if (!file) return;

        const isPDF = file.type === "application/pdf";
        setIsScanning(true);
        setScanStatus(isPDF ? "Proses PDF..." : "Compress...");

        try {
            const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";

            if (!API_KEY) {
                alert("API Key tidak ditemui. Sila tambah NEXT_PUBLIC_GEMINI_API_KEY dalam .env.local");
                setIsScanning(false);
                return;
            }

            // Convert file to base64
            let base64Data: string;
            let mimeType: string;

            if (isPDF) {
                const result = await convertFileToBase64(file);
                base64Data = result.base64;
                mimeType = result.mimeType;
            } else {
                base64Data = await compressImage(file);
                mimeType = "image/jpeg";
            }

            setScanStatus(isPDF ? "AI Analisis Bank..." : "AI Analisis Resit...");

            const fetchGemini = async (modelName: string) => {
                const prompt = isPDF
                    ? `Extract ALL transactions from this bank statement PDF. Analyze the document carefully and return valid JSON array with ALL transactions found:

{
  "transactions": [
    {
      "title": "Merchant/Description",
      "amount": 0.00,
      "category": "One of: Makan, Transport, Shopping, Bills, Utility, Lain-lain",
      "date": "DD MMM YYYY format (e.g., 15 Jan 2025)"
    }
  ]
}

IMPORTANT FOR BANK STATEMENTS:
- Extract EVERY transaction you can find (debits and credits)
- For ALL spending/debits: amount should be positive (we'll make it negative)
- For ALL income/credits/salary: category should be "Income"
- Include FULL date from statement (day, month, year).
- Group similar transactions if they appear multiple times

CATEGORY GUIDELINES:
- "Makan": Food, restaurants, cafes, groceries, food delivery
- "Transport": Petrol, parking, toll, Grab, transport fees
- "Shopping": Retail, online shopping, purchases
- "Bills": TNB, water, internet, phone, subscriptions
- "Utility": Services, maintenance, repairs
- "Lain-lain": Other expenses

Return ONLY valid JSON array, no other text.`
                    : `Extract receipt information from this image. Analyze the receipt carefully and return valid JSON with these fields:
{
  "title": "Merchant/Store Name",
  "amount": 0.00,
  "category": "One of: Makan, Transport, Shopping, Bills, Utility, Lain-lain",
  "date": "DD MMM YYYY format (e.g., 12 Jan 2025)"
}

IMPORTANT: Try to find the transaction date and year from the receipt.

CATEGORY GUIDELINES (Choose the MOST appropriate):
- "Makan": Restaurants, cafes, food delivery, groceries, food stalls, mamak, fast food
- "Transport": Petrol, parking, toll, Grab/ride-hailing, public transport, car maintenance
- "Shopping": Retail stores, online shopping, clothing, electronics, general merchandise
- "Bills": Utilities (TNB, water), internet, phone bills, subscriptions, recurring payments
- "Utility": Similar to Bills but for services like maintenance, repairs, professional services
- "Lain-lain": Anything that doesn't fit above categories

EXAMPLES:
- 7-Eleven, KK Mart, Tesco → "Shopping"
- McDonald's, KFC, Nasi Lemak stall → "Makan"
- Petronas, Shell, Grab → "Transport"
- TNB, Maxis, Unifi → "Bills"
- Salary, payment received → "Income" (Note: AI should return "Income" as category if detected as salary)

Return ONLY valid JSON, no other text. Amount should be positive number.`;

                return fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{
                                text: prompt
                            }, {
                                inline_data: {
                                    mime_type: mimeType,
                                    data: base64Data
                                }
                            }]
                        }]
                    })
                });
            };

            let response = await fetchGemini("gemini-2.0-flash");
            if (!response.ok && response.status === 404) {
                console.log("Gemini 2.0 404, trying Fallback...");
                setScanStatus("Mencuba Backup...");
                response = await fetchGemini("gemini-1.5-flash-8b");
            }

            if (!response.ok) {
                const errJson = await response.json();
                const errMessage = errJson.error?.message || response.statusText;
                alert(`Gemini Error (${response.status}): ${errMessage}`);
                throw new Error(`Gemini API Failed: ${errMessage}`);
            }

            const result = await response.json();
            if (!result.candidates || !result.candidates[0] || !result.candidates[0].content) {
                throw new Error("AI tak dapat baca data dari dokumen ni.");
            }

            const rawText = result.candidates[0].content.parts[0].text;

            // Logic baru: Extract JSON menggunakan Regex untuk lebih selamat (handle jika ada teks luar JSON)
            let cleanJson = "";
            const jsonMatch = rawText.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
            if (jsonMatch) {
                cleanJson = jsonMatch[0];
            } else {
                cleanJson = rawText.replace(/```json|```/g, '').trim();
            }

            let parsedData;
            try {
                parsedData = JSON.parse(cleanJson);
            } catch (e) {
                console.error("Failed to parse JSON", rawText);
                throw new Error("Format data AI tak valid.");
            }

            // Handle multiple transactions (PDF) or single transaction (Image)
            if (isPDF && parsedData.transactions && Array.isArray(parsedData.transactions)) {
                // Multiple transactions from PDF
                const validCategories = ["Makan", "Transport", "Shopping", "Bills", "Income", "Utility", "Lain-lain"];

                const mappedTransactions: Transaction[] = parsedData.transactions.map((tx: any, idx: number) => {
                    const amount = parseFloat(tx.amount) || 0;
                    const category = (tx.category === "Income" || validCategories.includes(tx.category)) ? tx.category : "Lain-lain";
                    const isIncome = category === "Income";

                    // Parse date from AI or use current date
                    const today = new Date();
                    let txDate = new Date();
                    if (tx.date) {
                        // Try to parse date from format like "12 Jan 2025" or "12 Jan"
                        const parts = tx.date.split(' ');
                        if (parts.length >= 2) {
                            const day = parseInt(parts[0]);
                            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                            const month = monthNames.indexOf(parts[1]);

                            if (month !== -1 && !isNaN(day)) {
                                let year = today.getFullYear();
                                // Ambil tahun dari AI jika ada
                                if (parts.length >= 3 && !isNaN(parseInt(parts[2]))) {
                                    year = parseInt(parts[2]);
                                    // Handle 2 digit year
                                    if (year < 100) year += 2000;
                                } else {
                                    // Smart Guessing: Jika bulan resit (0-11) > bulan sekarang (0-11), berkemungkinan besar ia rekod tahun lepas
                                    // Hanya laksanakan jika ia bukan bulan yang sama
                                    if (month > today.getMonth()) {
                                        year = today.getFullYear() - 1;
                                    }
                                }
                                txDate = new Date(year, month, day);
                            }
                        }
                    }

                    const isoDate = txDate.toISOString().split('T')[0];
                    const displayDate = txDate.toLocaleDateString('en-MY', { day: 'numeric', month: 'short' });

                    return {
                        id: Date.now() + idx,
                        title: tx.title || `Transaction ${idx + 1}`,
                        category: category,
                        amount: isIncome ? Math.abs(amount) : -Math.abs(amount), // Income positive, expense negative
                        date: displayDate,
                        isoDate: isoDate,
                    };
                });

                setScannedTransactions(mappedTransactions);
                setShowScanResultModal(true);
            } else {
                // Single transaction from image
                const title = parsedData.title || "Resit (AI Scan)";
                const amount = parseFloat(parsedData.amount) || 0;
                const category = parsedData.category || "Lain-lain";

                // Validate category
                const validCategories = ["Makan", "Transport", "Shopping", "Bills", "Income", "Utility", "Lain-lain"];
                const finalCategory = validCategories.includes(category) ? category : "Lain-lain";

                // Create preview transaction (user can edit before saving)
                const today = new Date();
                let txDate = new Date();

                if (parsedData.date) {
                    const parts = parsedData.date.split(' ');
                    if (parts.length >= 2) {
                        const day = parseInt(parts[0]);
                        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                        const month = monthNames.indexOf(parts[1]);
                        if (month !== -1 && !isNaN(day)) {
                            let year = today.getFullYear();
                            if (parts.length >= 3 && !isNaN(parseInt(parts[2]))) {
                                year = parseInt(parts[2]);
                                if (year < 100) year += 2000;
                            } else {
                                // Smart Guessing: Jika bulan resit > bulan sekarang, kemungkinan tahun lepas
                                if (month > today.getMonth()) {
                                    year = today.getFullYear() - 1;
                                }
                            }
                            txDate = new Date(year, month, day);
                        }
                    }
                }

                const isoDate = txDate.toISOString().split('T')[0];
                const displayDate = txDate.toLocaleDateString('en-MY', { day: 'numeric', month: 'short' });

                const previewTx: Transaction = {
                    id: Date.now(),
                    title: title,
                    category: finalCategory,
                    amount: finalCategory === "Income" ? Math.abs(amount) : -Math.abs(amount),
                    date: displayDate,
                    isoDate: isoDate,
                };

                setScannedTransaction(previewTx);
                setScannedTransactions([]); // Clear multiple
            }

            setIsScanning(false);
            setShowScanResultModal(true);
        } catch (err: any) {
            console.error(err);
            alert(`Gagal scan: ${err.message}`);
            setIsScanning(false);
        }
    };

    // Helper: Buka Modal Edit
    const openEditModal = (t: Transaction) => {
        setEditingId(t.id);
        setNewTitle(t.title);
        setNewAmount(String(Math.abs(t.amount))); // Buang tanda negatif untuk display
        setNewCategory(t.category);
        setNewType(t.amount < 0 ? "expense" : "income");
        setNewDate(t.isoDate || new Date().toISOString().split('T')[0]);
        setShowManualModal(true);
    };

    // Helper: Buka Modal Baru (Reset Form)
    const openNewModal = () => {
        setEditingId(null); // Pastikan mod baru
        setNewTitle("");
        setNewAmount("");
        setNewCategory("Makan");
        setNewType("expense");
        setNewDate(new Date().toISOString().split('T')[0]);
        setShowManualModal(true);
    };

    // Feature 1: Helper untuk format currency (Ghost Mode)
    const formatCurrency = (amount: number): string => {
        if (isGhostMode) {
            return "RM ****";
        }
        return `RM${amount.toLocaleString("en-MY", { minimumFractionDigits: 2 })}`;
    };

    // Feature 2: Handler untuk set Budget Limit
    const handleSetBudgetLimit = () => {
        setTempBudgetLimit(budgetLimit > 0 ? String(budgetLimit) : "");
        setShowBudgetLimitModal(true);
    };

    const handleSaveBudgetLimit = () => {
        if (tempBudgetLimit.trim() === "") {
            setBudgetLimit(0);
            localStorage.removeItem("budget_limit");
            setShowBudgetLimitModal(false);
            return;
        }

        const limit = parseFloat(tempBudgetLimit);
        if (!isNaN(limit) && limit >= 0) {
            setBudgetLimit(limit);
            setShowBudgetLimitModal(false);
        } else {
            alert("Sila masukkan nombor yang sah!");
        }
    };

    // Calendar Heatmap: Helper untuk generate calendar days
    const getCalendarDays = () => {
        const year = selectedDate.getFullYear();
        const month = selectedDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        // Get first day of month (0 = Sunday, 1 = Monday, etc.)
        const firstDay = new Date(year, month, 1).getDay();
        // Convert to Monday = 0 format (Isnin = 0, Ahad = 6)
        const firstDayMonday = firstDay === 0 ? 6 : firstDay - 1;

        return { year, month, daysInMonth, firstDayMonday };
    };

    // Calendar Heatmap: Helper untuk generate data harian dengan isoDate
    const getDailyExpenses = () => {
        const { year, month, daysInMonth, firstDayMonday } = getCalendarDays();

        // Get filtered transactions for this month
        const filtered = getFilteredTransactions();

        // Group transactions by isoDate and calculate total expense per day
        const expensesByDate = filtered
            .filter(t => t.amount < 0) // Only expenses (negative amounts)
            .reduce((acc, t) => {
                // Use isoDate if available, otherwise try to parse from date string
                let dateKey = t.isoDate || "";

                // If isoDate not available, try to generate from date string
                if (!dateKey && t.date) {
                    try {
                        const parts = t.date.split(' ');
                        if (parts.length >= 2) {
                            const day = parseInt(parts[0]);
                            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                            const monthIdx = monthNames.indexOf(parts[1]);
                            if (monthIdx !== -1 && !isNaN(day)) {
                                const txDate = new Date(year, monthIdx, day);
                                dateKey = txDate.toISOString().split('T')[0];
                            }
                        }
                    } catch {
                        // Skip if can't parse
                    }
                }

                if (dateKey) {
                    acc[dateKey] = (acc[dateKey] || 0) + Math.abs(t.amount);
                }
                return acc;
            }, {} as Record<string, number>);

        // Create array for all days in month
        const dailyData: Array<{ day: number; amount: number; date: string; isoDate: string }> = [];

        for (let day = 1; day <= daysInMonth; day++) {
            const currentDate = new Date(year, month, day);
            const isoDate = currentDate.toISOString().split('T')[0];
            const dateStr = currentDate.toLocaleDateString('en-MY', { day: 'numeric', month: 'short' });

            // Get expense amount for this day from grouped data
            const dayExpense = expensesByDate[isoDate] || 0;

            dailyData.push({
                day,
                amount: dayExpense,
                date: dateStr,
                isoDate: isoDate
            });
        }

        return { dailyData, firstDayMonday, daysInMonth };
    };

    // Calendar Heatmap: Helper untuk dapatkan warna berdasarkan jumlah
    const getHeatmapColor = (amount: number) => {
        if (amount === 0) {
            return darkMode ? "bg-gray-800" : "bg-gray-200";
        } else if (amount <= 50) {
            return "bg-green-300";
        } else if (amount <= 150) {
            return "bg-yellow-400";
        } else {
            return "bg-red-500";
        }
    };

    // 1. Trigger bila tekan butang LOGIN (Buka Warning dulu)
    const handleLoginClick = () => {
        setShowLoginGuide(true);
    };

    // 2. Lepas faham warning, buka Menu Pilihan (Google/Email)
    const openAuthOptions = () => {
        setShowLoginGuide(false); // Tutup warning
        setShowAuthModal(true);   // Buka AuthModal
    };

    // --- STYLES ---
    const bgStyle = darkMode ? "bg-black text-white" : "bg-gray-200 text-black";
    const cardStyle = `${darkMode ? "bg-[#1E1E1E] border-white" : "bg-white border-black"} border-2 rounded-2xl`;
    const shadowStyle = darkMode ? "" : "shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]";
    const buttonBase = `border-2 font-black uppercase tracking-wider rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 ${darkMode ? "border-white hover:bg-white hover:text-black" : "border-black hover:bg-black hover:text-white"} ${shadowStyle} hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]`;
    const inputStyle = `w-full p-3 rounded-xl border-2 outline-none font-bold mb-3 ${darkMode ? "bg-black border-white text-white focus:bg-white/10" : "bg-white border-black focus:bg-yellow-50"}`;

    return (
        <div className={`min-h-screen font-sans transition-colors duration-300 ${bgStyle}`}>
            <div className="max-w-md mx-auto min-h-screen flex flex-col relative">

                {/* --- HEADER --- */}
                <header className={`px-4 py-3 border-b-2 sticky top-0 z-40 transition-colors duration-300 ${darkMode ? "border-white bg-black" : "border-black bg-gray-200"}`}>
                    <div className="flex justify-between items-center">

                        {/* 1. KIRI: Logo & Info (Vertical Stack) */}
                        <Link href="/" className="flex flex-col items-start justify-center gap-0.5 cursor-pointer group min-w-0 mr-2">
                            {/* Baris 1: Logo + Title */}
                            <div className="flex items-center gap-2">
                                <div className={`w-7 h-7 flex-shrink-0 border-2 rounded-lg flex items-center justify-center overflow-hidden transition-transform group-hover:scale-105 ${darkMode ? "bg-orange-600 border-white text-white shadow-none" : "bg-orange-100 border-black text-orange-900 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"}`}>
                                    <Wallet size={16} />
                                </div>
                                <h1 className="text-lg font-black tracking-tight leading-none uppercase group-hover:underline decoration-2 underline-offset-2">{APP_NAME}</h1>
                            </div>
                            {/* Baris 2: Subtitle + Status Sync */}
                            <div className="flex items-center gap-2 pl-0.5">
                                <p className="text-[10px] uppercase tracking-widest font-bold opacity-70">
                                    Personal Finance
                                </p>

                                {/* Status Sync (Mini Badge) */}
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

                            {/* LOGIN BUTTON */}
                            {user ? (
                                <button
                                    onClick={async () => {
                                        if (confirm("Nak logout ke?")) {
                                            await supabase.auth.signOut();
                                            setUser(null);
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

                            {/* CALENDAR BUTTON */}
                            <button
                                onClick={() => setShowCalendarModal(true)}
                                className={`w-9 h-9 rounded-lg border-2 flex items-center justify-center transition-all active:scale-95 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] ${darkMode ? "border-white bg-transparent text-white shadow-none hover:bg-white hover:text-black" : "border-black bg-white text-black"}`}
                            >
                                <Calendar size={16} />
                            </button>

                            {/* GHOST MODE BUTTON */}
                            <button
                                onClick={() => setIsGhostMode(!isGhostMode)}
                                className={`w-9 h-9 rounded-lg border-2 flex items-center justify-center transition-all active:scale-95 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] ${isGhostMode ? (darkMode ? "border-purple-400 bg-purple-500 text-white shadow-none" : "border-purple-600 bg-purple-500 text-white") : (darkMode ? "border-white bg-transparent text-white shadow-none hover:bg-white hover:text-black" : "border-black bg-white text-black")}`}
                                title={isGhostMode ? "Ghost Mode ON" : "Ghost Mode OFF"}
                            >
                                {isGhostMode ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>

                            {/* DARK MODE BUTTON */}
                            <button onClick={() => setDarkMode(!darkMode)} className={`w-9 h-9 rounded-lg border-2 flex items-center justify-center transition-all active:scale-95 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] ${darkMode ? "border-white bg-white text-black shadow-none" : "border-black bg-black text-white"}`}>
                                {darkMode ? <Sun size={16} /> : <Moon size={16} />}
                            </button>
                        </div>
                    </div>
                </header>

                {/* --- MAIN CONTENT --- */}
                <main className="flex-1 p-6 flex flex-col gap-6">

                    {/* 1. BALANCE CARD */}
                    <section className={`${cardStyle} p-6 ${shadowStyle} relative overflow-hidden transition-all duration-500 ${darkMode ? "bg-[#222]" : showSafeToSpend ? "bg-emerald-400" : "bg-orange-400"}`}>
                        <div className="absolute -right-4 -top-4 opacity-20"><Wallet size={120} /></div>

                        {/* Toggle Link Sub.Tracker */}
                        <button
                            onClick={() => setShowSafeToSpend(!showSafeToSpend)}
                            className={`absolute top-4 right-4 p-2 rounded-lg border-2 z-20 transition-all active:scale-95 ${darkMode ? "border-white/20 bg-black/40 hover:bg-black" : "border-black/20 bg-white/40 hover:bg-white"}`}
                            title={showSafeToSpend ? "Unlink Sub.Tracker" : "Link Sub.Tracker"}
                        >
                            {showSafeToSpend ? <LinkIcon size={14} /> : <Link2Off size={14} />}
                        </button>

                        <div className="relative z-10">
                            {!showSafeToSpend ? (
                                /* MODE BIASA: Baki Wallet Sahaja */
                                <div className="animate-in fade-in slide-in-from-left-4 duration-300">
                                    <div className="flex justify-between items-start mb-4">
                                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded border-2 ${darkMode ? "bg-white text-black border-white" : "bg-black text-white border-black"}`}>
                                            Baki Wallet
                                        </span>
                                    </div>
                                    <h2 className="text-4xl font-mono font-black tracking-tighter mb-1">
                                        {formatCurrency(balance)}
                                    </h2>
                                    <p className="text-xs font-bold opacity-70 uppercase">
                                        Belanja Bulan Ini: {formatCurrency(expenseMonth)}
                                    </p>
                                </div>
                            ) : (
                                /* MODE SAFE-TO-SPEND: Kiraan Bersih */
                                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded border-2 ${darkMode ? "bg-white text-black border-white" : "bg-black text-white border-black"}`}>
                                            Safe-To-Spend
                                        </span>
                                    </div>

                                    <div className="space-y-1 mb-3">
                                        <div className="flex justify-between items-center text-[10px] font-bold opacity-80 uppercase tracking-tight">
                                            <span>Baki Wallet:</span>
                                            <span>{formatCurrency(balance)}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-[10px] font-bold text-red-700 uppercase tracking-tight">
                                            <span>Tolak Komitmen:</span>
                                            <span>- {formatCurrency(totalCommitments)}</span>
                                        </div>
                                        <div className="border-t border-black/10 my-1"></div>
                                    </div>

                                    <h2 className="text-4xl font-mono font-black tracking-tighter mb-1 leading-none">
                                        {formatCurrency(balance - totalCommitments)}
                                    </h2>
                                    <p className="text-[10px] font-black opacity-70 uppercase tracking-widest">
                                        Baki Bersih Selepas Komitmen
                                    </p>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Feature 2: BUDGET LIMIT & PROGRESS BAR */}
                    <section className={`${cardStyle} p-4 ${shadowStyle}`}>
                        <div
                            onClick={handleSetBudgetLimit}
                            className="cursor-pointer transition-all hover:opacity-80 active:scale-[0.98]"
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <Target size={16} className={darkMode ? "text-white" : "text-black"} />
                                    <label className={`text-[10px] font-black uppercase tracking-widest ${darkMode ? "text-white" : "text-black"}`}>
                                        Monthly Limit: {isGhostMode ? "RM ****" : budgetLimit > 0 ? `RM${budgetLimit.toLocaleString("en-MY", { minimumFractionDigits: 2 })}` : "Not Set"}
                                    </label>
                                </div>
                            </div>

                            {budgetLimit > 0 ? (
                                <div className="relative">
                                    {/* Progress Bar dengan Border Tebal */}
                                    <div className={`h-6 rounded-lg border-4 overflow-hidden relative ${darkMode ? "border-white bg-white/10" : "border-black bg-gray-100 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"}`}>
                                        <div
                                            className={`h-full transition-all duration-300 ${expenseMonth / budgetLimit > 1
                                                ? "bg-red-500"
                                                : expenseMonth / budgetLimit > 0.75
                                                    ? "bg-yellow-500"
                                                    : "bg-green-500"}`}
                                            style={{
                                                width: `${Math.min(100, (expenseMonth / budgetLimit) * 100)}%`
                                            }}
                                        ></div>

                                        {/* Peratusan di dalam bar (jika ada ruang) */}
                                        {expenseMonth / budgetLimit > 0.15 && (
                                            <div className="absolute inset-0 flex items-center justify-start pl-2 pointer-events-none">
                                                <span className={`text-[10px] font-mono font-black ${expenseMonth / budgetLimit > 1 ? "text-white" : expenseMonth / budgetLimit > 0.75 ? "text-black" : "text-black"}`}>
                                                    {expenseMonth > 0 && budgetLimit > 0
                                                        ? `${Math.min(100, (expenseMonth / budgetLimit) * 100).toFixed(0)}%`
                                                        : "0%"}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Peratusan di tepi bar (jika terlalu kecil untuk dalam bar) */}
                                    {expenseMonth / budgetLimit <= 0.15 && (
                                        <div className="absolute right-0 top-0 h-6 flex items-center pr-2 pointer-events-none">
                                            <span className={`text-[10px] font-mono font-black ${darkMode ? "text-white" : "text-black"}`}>
                                                {expenseMonth > 0 && budgetLimit > 0
                                                    ? `${Math.min(100, (expenseMonth / budgetLimit) * 100).toFixed(0)}%`
                                                    : "0%"}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className={`h-6 rounded-lg border-4 flex items-center justify-center ${darkMode ? "border-white/30 bg-white/5" : "border-black/30 bg-gray-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"}`}>
                                    <p className={`text-[9px] font-bold uppercase ${darkMode ? "text-white/50" : "text-black/50"}`}>
                                        Click to set budget limit
                                    </p>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* 2. ACTION BUTTONS */}
                    <section className="grid grid-cols-2 gap-3">
                        {/* Hidden File Input for AI Camera */}
                        <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            ref={fileInputRef}
                            className="hidden"
                            onChange={handleScanReceipt}
                        />

                        <button
                            onClick={() => setShowScanMethodModal(true)}
                            disabled={isScanning}
                            className={`col-span-2 py-4 text-sm ${buttonBase} ${darkMode ? "bg-indigo-600 border-white text-white shadow-none" : "bg-indigo-500 border-black text-white"} relative overflow-hidden`}
                        >
                            {isScanning ? (
                                <div className="flex flex-col items-center gap-1 py-1 w-full px-4">
                                    <div className="flex items-center gap-2 max-w-full overflow-hidden">
                                        <Loader2 size={20} className="animate-spin text-white flex-shrink-0" />
                                        <span className="animate-pulse text-[10px] truncate max-w-[150px]">{scanStatus}</span>
                                    </div>
                                    <div className="w-48 h-1 bg-white/20 rounded-full mt-1 overflow-hidden">
                                        <div className="h-full bg-white animate-progress-indefinite rounded-full w-1/2"></div>
                                    </div>
                                    <p className="text-[7px] font-bold opacity-70 uppercase tracking-tighter mt-1">AI sedang memproses data mendalam, mohon tunggu sebentar...</p>
                                </div>
                            ) : (
                                <><Camera size={20} /> SNAP RESIT (AI)</>
                            )}
                        </button>

                        <button onClick={openNewModal} className={`py-3 text-[10px] ${buttonBase} ${darkMode ? "bg-[#333]" : "bg-white"}`}>
                            <Plus size={14} /> MANUAL INPUT
                        </button>
                        <button onClick={() => setShowAnalytics(!showAnalytics)} className={`py-3 text-[10px] ${buttonBase} ${darkMode ? "bg-[#333]" : "bg-white"} ${showAnalytics ? "bg-yellow-300 text-black border-black" : ""}`}>
                            {showAnalytics ? "TUTUP DATA" : "ANALITIK"} <ScanLine size={14} />
                        </button>
                    </section>

                    {/* 3. RECENT TRANSACTIONS / ANALYTICS VIEW */}
                    <section>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                                {showAnalytics ? <TrendingDown size={16} /> : <ShoppingBag size={16} />}
                                {showAnalytics ? "Analitik Belanja" : "Transaksi Terkini"}
                            </h2>
                            {!showAnalytics && (
                                <button
                                    onClick={() => setShowAllTransactions(true)}
                                    className="text-[10px] font-bold underline decoration-2 underline-offset-2 opacity-60 hover:opacity-100"
                                >
                                    LIHAT SEMUA
                                </button>
                            )}
                        </div>

                        {/* --- SMART SEARCH BAR (Pill Style) --- */}
                        {!showAnalytics && (
                            <div className="mb-4">
                                <div className="relative max-w-sm mx-auto">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10">
                                        <Search size={14} className={darkMode ? "text-white/40" : "text-black/40"} />
                                    </div>
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Cari transaksi..."
                                        className={`w-full py-2 pl-9 pr-9 rounded-full border-2 text-sm font-bold transition-all outline-none ${darkMode
                                            ? "bg-[#1E1E1E] border-white/30 text-white placeholder:text-white/40 focus:border-white focus:bg-[#2a2a2a] focus:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.5)]"
                                            : "bg-white/80 border-black/20 text-black placeholder:text-black/40 focus:border-black focus:bg-white focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]"
                                            }`}
                                    />
                                    {searchQuery && (
                                        <button
                                            onClick={() => setSearchQuery("")}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-current/10 transition-colors z-10"
                                        >
                                            <X size={14} className={darkMode ? "text-white/60" : "text-black/60"} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* --- NEW: CATEGORY FILTER (Grid Style - Multi-select) --- */}
                        {!showAnalytics && (
                            <div className="mb-6">
                                {/* Header dengan Tajuk dan Clear Button */}
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-xs font-black uppercase tracking-widest opacity-70">KATEGORI</h3>
                                    {activeFilters.length > 0 && (
                                        <button
                                            onClick={() => setActiveFilters([])}
                                            className={`px-3 py-1.5 text-[9px] font-black uppercase rounded-lg border-2 transition-all active:scale-95 ${darkMode ? "bg-blue-600 text-white border-blue-600" : "bg-blue-500 text-white border-blue-600"} shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px]`}
                                        >
                                            Clear
                                        </button>
                                    )}
                                </div>

                                {/* Flex Wrap Kategori (Auto Width) */}
                                <div className="flex flex-wrap gap-2">
                                    {/* Mapping Kategori */}
                                    {ALL_CATEGORIES.map((cat) => {
                                        const isActive = activeFilters.includes(cat);

                                        return (
                                            <button
                                                key={cat}
                                                onClick={() => {
                                                    if (activeFilters.includes(cat)) {
                                                        // Toggle off - buang dari array
                                                        const newFilters = activeFilters.filter(f => f !== cat);
                                                        // Kalau semua kategori dah off, kosongkan (show semua)
                                                        setActiveFilters(newFilters);
                                                    } else {
                                                        // Toggle on - tambah ke array
                                                        setActiveFilters([...activeFilters, cat]);
                                                    }
                                                }}
                                                className={`rounded-full border-2 px-3 py-1.5 flex items-center gap-1.5 transition-all active:scale-95 font-black uppercase text-[9px] whitespace-nowrap ${isActive ? (darkMode ? "bg-white text-black border-white" : "bg-black text-white border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]") : "opacity-60 border-current hover:opacity-100"}`}
                                            >
                                                <div className="flex-shrink-0">
                                                    {getCategoryIcon(cat)}
                                                </div>
                                                <span>{cat}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {showAnalytics ? (
                            // --- ANALYTICS VIEW (ADVANCED) ---
                            <div className={`${cardStyle} p-6 ${shadowStyle} animate-in fade-in zoom-in-95 pb-20`}>
                                {/* Title removed per feedback */}

                                {/* 1. FINANCIAL HEALTH CARD (Only if Link is ON) */}
                                {showSafeToSpend ? (
                                    <div className={`p-6 rounded-2xl border-4 mb-6 relative overflow-hidden ${darkMode ? "bg-black border-white" : "bg-white border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"}`}>
                                        <div className="relative z-10">
                                            <h4 className="text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                                                <Activity size={14} className="text-blue-500" /> Total Financial Health
                                            </h4>

                                            <div className="grid grid-cols-1 gap-6">
                                                {/* A) The Real Breakdown (Fixed vs Lifestyle) */}
                                                <div className="space-y-3">
                                                    <div className="flex justify-between items-end">
                                                        <p className="text-[10px] font-black uppercase opacity-60">Spending Structure</p>
                                                        <div className="flex gap-3">
                                                            <div className="flex items-center gap-1">
                                                                <div className="w-2 h-2 rounded-full bg-red-600"></div>
                                                                <span className="text-[9px] font-bold uppercase">Fixed</span>
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                <div className="w-2 h-2 rounded-full bg-orange-400"></div>
                                                                <span className="text-[9px] font-bold uppercase">Lifestyle</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="h-10 w-full flex rounded-xl border-2 border-black overflow-hidden bg-gray-100 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                                        <div
                                                            className="h-full bg-red-700 flex items-center justify-center border-r-2 border-black"
                                                            style={{ width: `${(totalCommitments / (totalCommitments + expenseMonth)) * 100}%` }}
                                                        >
                                                            <span className="text-[10px] font-black text-white">{((totalCommitments / (totalCommitments + expenseMonth)) * 100).toFixed(0)}%</span>
                                                        </div>
                                                        <div
                                                            className="h-full bg-orange-400 flex items-center justify-center"
                                                            style={{ width: `${(expenseMonth / (totalCommitments + expenseMonth)) * 100}%` }}
                                                        >
                                                            <span className="text-[10px] font-black text-black">{((expenseMonth / (totalCommitments + expenseMonth)) * 100).toFixed(0)}%</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* B) Health Score */}
                                                {(() => {
                                                    // Simple logic: Balance / Total Expenses (approximation of saving rate)
                                                    const income = balance + totalCommitments + expenseMonth; // Rough estimate of total in
                                                    const totalOut = totalCommitments + expenseMonth;
                                                    const savingRate = income > 0 ? (balance / income) * 100 : 0;

                                                    const isHealthy = savingRate > 20;
                                                    const isDanger = savingRate < 10;

                                                    return (
                                                        <div className={`p-4 rounded-xl border-2 ${darkMode ? "bg-white/5" : "bg-gray-50"} border-black`}>
                                                            <div className="flex justify-between items-center mb-2">
                                                                <p className="text-[10px] font-black uppercase opacity-60">Financial Health Score</p>
                                                                <span className={`text-xs font-black uppercase ${isHealthy ? "text-green-500" : isDanger ? "text-red-500" : "text-yellow-500"}`}>
                                                                    {isHealthy ? "Sihat" : isDanger ? "Bahaya" : "Sederhana"}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-4">
                                                                <span className="text-3xl font-mono font-black">{Math.max(0, Math.min(100, savingRate * 2 + 30)).toFixed(0)}<span className="text-sm">/100</span></span>
                                                                <div className="flex-1 h-3 rounded-full bg-gray-200 border border-black overflow-hidden">
                                                                    <div
                                                                        className={`h-full transition-all duration-1000 ${isHealthy ? "bg-green-500" : isDanger ? "bg-red-500" : "bg-yellow-500"}`}
                                                                        style={{ width: `${Math.max(5, Math.min(100, savingRate * 2 + 30))}%` }}
                                                                    ></div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })()}

                                                {/* C) Unpaid Commitments Reminder */}
                                                <div className={`p-3 rounded-xl border-2 border-dashed flex items-center gap-3 ${unpaidCommitments > 0 ? "border-red-500 bg-red-500/10 text-red-600" : "border-green-500 bg-green-500/10 text-green-600"}`}>
                                                    {unpaidCommitments > 0 ? <AlertTriangle size={20} /> : <ShieldCheck size={20} />}
                                                    <div>
                                                        <p className="text-[10px] font-black uppercase tracking-tight">
                                                            {unpaidCommitments > 0 ? "Komitmen Belum Settle" : "Semua Komitmen Selesai"}
                                                        </p>
                                                        <p className="text-sm font-mono font-black">
                                                            {unpaidCommitments > 0 ? formatCurrency(unpaidCommitments) : "RM 0.00"}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    /* Nudge to link */
                                    <div className={`p-4 rounded-xl border-2 border-dashed mb-6 text-center opacity-60 ${darkMode ? "border-white/20" : "border-black/20"}`}>
                                        <p className="text-[10px] font-bold uppercase tracking-widest mb-1">Dapatkan Gambaran Penuh?</p>
                                        <p className="text-[9px] font-medium opacity-70 mb-2">Aktifkan butang Link (penjuru kanan atas kad baki) untuk Full Financial Health.</p>
                                    </div>
                                )}

                                {/* Summary Cards (Optimized for Large Amounts) */}
                                <div className="grid grid-cols-2 gap-3 mb-6">
                                    <div className={`p-3 rounded-xl border-2 ${darkMode ? "bg-[#222] border-white" : "bg-orange-100 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"}`}>
                                        <p className="text-[8px] font-black uppercase opacity-60 mb-1">Total Belanja</p>
                                        <p className="text-sm sm:text-base font-mono font-black truncate" title={formatCurrency(expenseMonth)}>
                                            {formatCurrency(expenseMonth)}
                                        </p>
                                    </div>
                                    <div className={`p-3 rounded-xl border-2 ${darkMode ? "bg-[#222] border-white" : "bg-green-100 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"}`}>
                                        <p className="text-[8px] font-black uppercase opacity-60 mb-1">Baki Wallet</p>
                                        <p className="text-sm sm:text-base font-mono font-black truncate" title={formatCurrency(balance)}>
                                            {formatCurrency(balance)}
                                        </p>
                                    </div>
                                </div>

                                {/* Category Breakdown */}
                                <div className="mb-6">
                                    <h4 className="text-xs font-black uppercase mb-3 opacity-70">Belanja Ikut Kategori</h4>
                                    <div className="space-y-3">
                                        {EXPENSE_CATEGORIES.map(cat => {
                                            const filtered = getFilteredTransactions();
                                            const catTotal = filtered
                                                .filter(t => t.category === cat && t.amount < 0)
                                                .reduce((sum, t) => sum + Math.abs(t.amount), 0);
                                            const percentage = expenseMonth > 0 ? (catTotal / expenseMonth * 100) : 0;

                                            if (catTotal === 0) return null;

                                            return (
                                                <div key={cat} className="space-y-1">
                                                    <div className="flex justify-between items-end mb-1">
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <div className="flex-shrink-0">{getCategoryIcon(cat)}</div>
                                                            <span className="text-[10px] font-black uppercase truncate">{cat}</span>
                                                        </div>
                                                        <div className="text-right flex-shrink-0 pl-2">
                                                            <span className="text-[10px] font-mono font-black">{formatCurrency(catTotal)}</span>
                                                            <span className="text-[8px] font-bold opacity-50 ml-1.5">{percentage.toFixed(0)}%</span>
                                                        </div>
                                                    </div>
                                                    {/* Progress Bar */}
                                                    <div className={`h-2 rounded-full overflow-hidden border ${darkMode ? "border-white/20 bg-white/5" : "border-black/20 bg-gray-100"}`}>
                                                        <div
                                                            className={`h-full transition-all ${getCategoryColor(cat).bg}`}
                                                            style={{ width: `${percentage}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Spending Ratio */}
                                <div className={`p-4 rounded-xl border-2 border-dashed ${darkMode ? "border-white/30 bg-white/5" : "border-black/20 bg-gray-50"}`}>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[10px] font-black uppercase opacity-70">Nisbah Belanja</span>
                                        <span className="text-lg font-mono font-black">
                                            {expenseMonth > 0 && balance + expenseMonth > 0
                                                ? ((expenseMonth / (balance + expenseMonth)) * 100).toFixed(0)
                                                : 0}%
                                        </span>
                                    </div>
                                    <div className={`h-3 rounded-full overflow-hidden border ${darkMode ? "border-white/20 bg-white/5" : "border-black/20 bg-gray-100"}`}>
                                        <div
                                            className={`h-full transition-all ${darkMode ? "bg-orange-400" : "bg-orange-400"}`}
                                            style={{
                                                width: `${expenseMonth > 0 && balance + expenseMonth > 0
                                                    ? (expenseMonth / (balance + expenseMonth)) * 100
                                                    : 0}%`
                                            }}
                                        ></div>
                                    </div>
                                </div>

                                {/* Calendar Heatmap */}
                                <div className="mt-6">
                                    <h4 className="text-xs font-black uppercase mb-3 opacity-70">Kalendar Belanja Harian</h4>
                                    {(() => {
                                        const { dailyData, firstDayMonday, daysInMonth } = getDailyExpenses();
                                        const weekDays = ['I', 'S', 'R', 'K', 'J', 'S', 'A']; // Isnin-Ahad

                                        return (
                                            <div className="space-y-2">
                                                {/* Header: Hari Minggu */}
                                                <div className="grid grid-cols-7 gap-1">
                                                    {weekDays.map((day, idx) => (
                                                        <div
                                                            key={idx}
                                                            className={`text-center text-[9px] font-black uppercase ${darkMode ? "text-white/60" : "text-black/60"}`}
                                                        >
                                                            {day}
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* Grid: Kotak Hari */}
                                                <div className="grid grid-cols-7 gap-1">
                                                    {/* Empty cells untuk hari sebelum bulan bermula */}
                                                    {Array.from({ length: firstDayMonday }).map((_, idx) => (
                                                        <div key={`empty-${idx}`} className="aspect-square"></div>
                                                    ))}

                                                    {/* Kotak untuk setiap hari dalam bulan */}
                                                    {dailyData.map((item) => (
                                                        <div
                                                            key={item.day}
                                                            className={`aspect-square rounded-sm border transition-all cursor-pointer relative group ${darkMode ? "border-white/30" : "border-black"} ${getHeatmapColor(item.amount)}`}
                                                            title={`${item.date}: ${item.amount > 0 ? `RM${item.amount.toFixed(2)}` : "Tiada belanja"}`}
                                                        >
                                                            {/* Tooltip on hover */}
                                                            <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded border-2 ${darkMode ? "bg-white text-black border-white" : "bg-white text-black border-black"} text-[9px] font-black uppercase whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-10 transition-opacity shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]`}>
                                                                {item.date}: {item.amount > 0 ? `RM${item.amount.toFixed(2)}` : "Tiada belanja"}
                                                                <div className={`absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent ${darkMode ? "border-t-white" : "border-t-black"}`}></div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* Legend */}
                                                <div className="flex items-center justify-center gap-3 mt-3 pt-3 border-t-2 border-dashed border-current border-opacity-20">
                                                    <div className="flex items-center gap-1">
                                                        <div className={`w-3 h-3 rounded-sm border ${darkMode ? "border-white/30 bg-gray-800" : "border-black bg-gray-200"}`}></div>
                                                        <span className={`text-[8px] font-bold uppercase ${darkMode ? "text-white/70" : "text-black/70"}`}>RM 0</span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <div className={`w-3 h-3 rounded-sm border ${darkMode ? "border-white/30" : "border-black"} bg-green-300`}></div>
                                                        <span className={`text-[8px] font-bold uppercase ${darkMode ? "text-white/70" : "text-black/70"}`}>RM 1-50</span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <div className={`w-3 h-3 rounded-sm border ${darkMode ? "border-white/30" : "border-black"} bg-yellow-400`}></div>
                                                        <span className={`text-[8px] font-bold uppercase ${darkMode ? "text-white/70" : "text-black/70"}`}>RM 51-150</span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <div className={`w-3 h-3 rounded-sm border ${darkMode ? "border-white/30" : "border-black"} bg-red-500`}></div>
                                                        <span className={`text-[8px] font-bold uppercase ${darkMode ? "text-white/70" : "text-black/70"}`}>RM 150+</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                        ) : (
                            // --- TRANSACTION LIST VIEW ---
                            <div className="space-y-3 pb-20">
                                {(() => {
                                    const filtered = getFilteredTransactions();

                                    // Filter by Category (activeFilters)
                                    const categoryFiltered = filtered.filter(t => {
                                        // Kalau tiada filter aktif, show semua
                                        if (activeFilters.length === 0) return true;
                                        // Show transaksi yang match dengan kategori yang dipilih
                                        return activeFilters.includes(t.category);
                                    });

                                    // Filter by Search Query (AND logic dengan category filter)
                                    const searchFiltered = categoryFiltered.filter(t => {
                                        // Kalau tiada search query, show semua
                                        if (!searchQuery.trim()) return true;

                                        const query = searchQuery.toLowerCase().trim();

                                        // Search by Title (case-insensitive)
                                        const titleMatch = t.title.toLowerCase().includes(query);

                                        // Search by Amount (convert to string)
                                        const amountMatch = Math.abs(t.amount).toString().includes(query);

                                        // Search by Date (case-insensitive)
                                        const dateMatch = t.date.toLowerCase().includes(query);

                                        // Return true if any field matches
                                        return titleMatch || amountMatch || dateMatch;
                                    });

                                    if (searchFiltered.length === 0) {
                                        return (
                                            <button
                                                onClick={openNewModal}
                                                className={`w-full p-8 border-2 border-dashed rounded-2xl text-center opacity-60 hover:opacity-100 hover:border-solid transition flex flex-col items-center gap-2 ${darkMode ? "border-white" : "border-black"}`}
                                            >
                                                <Plus size={32} className="mb-2" />
                                                <p className="text-base font-bold">
                                                    {searchQuery.trim() ? "Tiada hasil carian." : "Tiada rekod. Tambah transaksi pertama!"}
                                                </p>
                                            </button>
                                        );
                                    }

                                    return searchFiltered.map((t) => (
                                        <div
                                            key={t.id}
                                            onClick={() => openEditModal(t)}
                                            className={`${cardStyle} p-3 flex justify-between items-center transition-transform active:scale-95 group relative overflow-hidden cursor-pointer ${darkMode ? "hover:bg-white/5" : "hover:bg-gray-50"}`}
                                        >

                                            <div className="flex items-center gap-3 relative z-10">
                                                <div className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center flex-shrink-0 ${darkMode ? "border-white bg-white/10" : "border-black bg-yellow-300"}`}>
                                                    {getCategoryIcon(t.category)}
                                                </div>
                                                <div>
                                                    <h3 className="text-xs font-black uppercase leading-tight">{t.title}</h3>
                                                    <div className="flex gap-2 text-[9px] font-bold opacity-60 mt-0.5">
                                                        <span>{t.category}</span>
                                                        <span>•</span>
                                                        <span>{t.date}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3 relative z-10">
                                                <div className={`text-right font-mono font-black text-sm ${t.amount > 0 ? "text-green-500" : (darkMode ? "text-red-400" : "text-red-600")}`}>
                                                    {isGhostMode ? "RM ****" : `${t.amount > 0 ? "+" : ""}${t.amount.toFixed(2)}`}
                                                </div>

                                                {/* BUTANG EDIT */}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation(); // Elak trigger klik card
                                                        openEditModal(t);
                                                    }}
                                                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                                                >
                                                    <Pencil size={14} />
                                                </button>

                                                {/* BUTANG DELETE */}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation(); // Elak trigger klik card
                                                        handleDelete(t.id);
                                                    }}
                                                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>

                                        </div>
                                    ));
                                })()}
                            </div>
                        )}
                    </section>

                    {/* RESET DATA BUTTON (Macam SplitIt) */}
                    <div className="pt-8 pb-6 text-center space-y-4">
                        <button
                            onClick={handleResetData}
                            className={`mx-auto px-5 py-2 rounded-full border border-red-500 text-red-500 text-[9px] font-bold uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2 ${darkMode ? "border-red-500 text-red-500 hover:bg-red-500 hover:text-white" : "border-red-500 text-red-500 hover:bg-red-500 hover:text-white"}`}
                        >
                            <RotateCcw size={12} /> Reset Data
                        </button>
                    </div>

                </main>

                {/* --- FOOTER --- */}
                <div className="pb-8 pt-4 text-center opacity-40">
                    <p className="text-[10px] font-black uppercase tracking-widest">Budget.AI by kmlxly</p>
                    <p className="text-[9px] font-mono mt-1 opacity-70">{APP_VERSION}</p>
                </div>

                {/* --- MODAL: MANUAL INPUT --- */}
                {showManualModal && (
                    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
                        <div className={`w-full max-w-sm p-6 rounded-2xl border-2 ${darkMode ? "bg-[#1E1E1E] border-white text-white" : "bg-white border-black text-black"} shadow-2xl animate-in slide-in-from-bottom-10`}>

                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-black uppercase italic">
                                    {editingId ? "Edit Rekod" : "Tambah Rekod"}
                                </h2>
                                <button onClick={() => setShowManualModal(false)} className="opacity-50 hover:opacity-100"><X size={24} /></button>
                            </div>

                            {/* Type Toggle */}
                            <div className="flex gap-2 mb-4">
                                <button
                                    onClick={() => {
                                        setNewType("expense");
                                        if (newCategory === "Income") setNewCategory("Makan");
                                    }}
                                    className={`flex-1 py-2 text-[10px] font-black uppercase border-2 rounded-lg ${newType === "expense" ? (darkMode ? "bg-red-500 border-red-500 text-white" : "bg-red-500 border-black text-white") : "opacity-50 border-current"}`}
                                >
                                    Expense
                                </button>
                                <button
                                    onClick={() => {
                                        setNewType("income");
                                        setNewCategory("Income");
                                    }}
                                    className={`flex-1 py-2 text-[10px] font-black uppercase border-2 rounded-lg ${newType === "income" ? (darkMode ? "bg-green-500 border-green-500 text-black" : "bg-green-500 border-black text-white") : "opacity-50 border-current"}`}
                                >
                                    Income
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-[9px] font-bold opacity-60 uppercase mb-1 block">Tarikh</label>
                                    <input
                                        type="date"
                                        value={newDate}
                                        onChange={(e) => setNewDate(e.target.value)}
                                        className={inputStyle}
                                    />
                                </div>
                                <div>
                                    <label className="text-[9px] font-bold opacity-60 uppercase mb-1 block">Tajuk / Kedai</label>
                                    <input
                                        type="text"
                                        value={newTitle}
                                        onChange={(e) => setNewTitle(e.target.value)}
                                        placeholder="Cth: Nasi Lemak, Gaji"
                                        className={inputStyle}
                                        autoFocus
                                    />
                                </div>
                                <div>
                                    <label className="text-[9px] font-bold opacity-60 uppercase mb-1 block">Jumlah (RM)</label>
                                    <input
                                        type="number"
                                        value={newAmount}
                                        onChange={(e) => setNewAmount(e.target.value)}
                                        placeholder="0.00"
                                        className={`${inputStyle} text-xl font-mono`}
                                    />
                                </div>
                                <div>
                                    <label className="text-[9px] font-bold opacity-60 uppercase mb-1 block">Kategori</label>
                                    <div className="relative">
                                        <select
                                            value={newCategory}
                                            onChange={(e) => setNewCategory(e.target.value)}
                                            className={`${inputStyle} appearance-none pr-10`}
                                        >
                                            {(newType === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map(cat => (
                                                <option key={cat} value={cat}>{cat}</option>
                                            ))}
                                        </select>
                                        <div className="absolute right-3 top-[38%] -translate-y-1/2 pointer-events-none opacity-50">
                                            <ChevronDown size={18} />
                                        </div>
                                    </div>
                                </div>

                                <button onClick={handleSaveTransaction} className={`w-full py-4 mt-2 text-sm ${buttonBase} ${darkMode ? "bg-white text-black border-white" : "bg-black text-white border-black"}`}>
                                    {editingId ? "UPDATE DATA" : "SIMPAN REKOD"}
                                </button>
                            </div>

                        </div>
                    </div>
                )}

                {/* --- MODAL: SEMUA TRANSAKSI --- */}
                {showAllTransactions && (
                    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
                        <div className={`w-full max-w-sm max-h-[80vh] flex flex-col rounded-2xl border-2 ${darkMode ? "bg-[#1E1E1E] border-white text-white" : "bg-white border-black text-black"} shadow-2xl animate-in slide-in-from-bottom-10`}>

                            <div className="flex justify-between items-center p-6 border-b-2 border-current border-opacity-20">
                                <h2 className="text-xl font-black uppercase italic">Semua Transaksi</h2>
                                <button onClick={() => setShowAllTransactions(false)} className="opacity-50 hover:opacity-100"><X size={24} /></button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-3">
                                {transactions.length === 0 ? (
                                    <div className="text-center py-10 opacity-50 font-bold text-xs uppercase">Belum ada data.</div>
                                ) : transactions.map((t) => (
                                    <div
                                        key={t.id}
                                        onClick={() => {
                                            setShowAllTransactions(false);
                                            openEditModal(t);
                                        }}
                                        className={`${cardStyle} p-3 flex justify-between items-center transition-transform active:scale-95 group relative overflow-hidden cursor-pointer ${darkMode ? "hover:bg-white/5" : "hover:bg-gray-50"}`}
                                    >

                                        <div className="flex items-center gap-3 relative z-10">
                                            <div className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center flex-shrink-0 ${darkMode ? "border-white bg-white/10" : "border-black bg-yellow-300"}`}>
                                                {getCategoryIcon(t.category)}
                                            </div>
                                            <div>
                                                <h3 className="text-xs font-black uppercase leading-tight">{t.title}</h3>
                                                <div className="flex gap-2 text-[9px] font-bold opacity-60 mt-0.5">
                                                    <span>{t.category}</span>
                                                    <span>•</span>
                                                    <span>{t.date}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 relative z-10">
                                            <div className={`text-right font-mono font-black text-sm ${t.amount > 0 ? "text-green-500" : (darkMode ? "text-red-400" : "text-red-600")}`}>
                                                {isGhostMode ? "RM ****" : `${t.amount > 0 ? "+" : ""}${t.amount.toFixed(2)}`}
                                            </div>

                                            {/* BUTANG EDIT */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setShowAllTransactions(false);
                                                    openEditModal(t);
                                                }}
                                                className="w-8 h-8 flex items-center justify-center rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                                            >
                                                <Pencil size={14} />
                                            </button>

                                            {/* BUTANG DELETE */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDelete(t.id);
                                                }}
                                                className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>

                                    </div>
                                ))}
                            </div>

                        </div>
                    </div>
                )}

                {/* --- MODAL: REVIEW SCAN RESULT --- */}
                {showScanResultModal && (scannedTransaction || scannedTransactions.length > 0) && (
                    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
                        <div className={`w-full max-w-sm max-h-[85vh] flex flex-col rounded-2xl border-2 ${darkMode ? "bg-[#1E1E1E] border-white text-white" : "bg-white border-black text-black"} shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] animate-in slide-in-from-bottom-10`}>

                            <div className={`flex justify-between items-center p-6 border-b-2 ${darkMode ? "border-white" : "border-black"} bg-opacity-20 flex-shrink-0`}>
                                <h2 className="text-xl font-black uppercase italic flex items-center gap-2">
                                    <ScanLine size={20} /> Preview Scan
                                </h2>
                                <button onClick={() => {
                                    setShowScanResultModal(false);
                                    setScannedTransaction(null);
                                    setScannedTransactions([]);
                                }} className="opacity-50 hover:opacity-100 transition-opacity"><X size={24} /></button>
                            </div>

                            {scannedTransactions.length > 0 ? (
                                /* Multiple Transactions (PDF) */
                                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                                    <div className={`p-4 rounded-xl border-2 border-dashed ${darkMode ? "border-white/50 bg-white/5" : "border-black/50 bg-yellow-50"}`}>
                                        <p className="text-xs font-bold leading-relaxed opacity-80">
                                            Found <span className="text-blue-500 font-black">{scannedTransactions.length} items</span> from your file.
                                            Please verify details before saving.
                                        </p>
                                    </div>

                                    <div className="space-y-3">
                                        {scannedTransactions.map((tx, idx) => (
                                            <div key={tx.id} className={`${cardStyle} p-4 relative group`}>

                                                {/* Header Bar */}
                                                <div className="flex items-center gap-3 mb-3">
                                                    <div className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center flex-shrink-0 ${darkMode ? "border-white bg-white/10" : "border-black bg-white"}`}>
                                                        <span className="text-xs font-black">{idx + 1}</span>
                                                    </div>
                                                    <input
                                                        type="text"
                                                        value={tx.title}
                                                        onChange={(e) => {
                                                            const updated = [...scannedTransactions];
                                                            updated[idx].title = e.target.value;
                                                            setScannedTransactions(updated);
                                                        }}
                                                        className={`${inputStyle} text-sm font-bold py-1.5 h-auto flex-1`}
                                                        placeholder="Sila isi tajuk..."
                                                    />
                                                </div>

                                                {/* Details Row */}
                                                <div className="flex gap-2 mb-3">
                                                    <div className="flex-1">
                                                        <label className="text-[9px] font-black uppercase opacity-50 mb-1 block">Date</label>
                                                        <input
                                                            type="date"
                                                            value={tx.isoDate || ""}
                                                            onChange={(e) => {
                                                                const updated = [...scannedTransactions];
                                                                const newIso = e.target.value;
                                                                const dateObj = new Date(newIso);
                                                                updated[idx].isoDate = newIso;
                                                                updated[idx].date = dateObj.toLocaleDateString('en-MY', { day: 'numeric', month: 'short' });
                                                                setScannedTransactions(updated);
                                                            }}
                                                            className={`${inputStyle} text-xs py-1.5 h-auto w-full`}
                                                        />
                                                    </div>
                                                    <div className="flex-1">
                                                        <label className="text-[9px] font-black uppercase opacity-50 mb-1 block">Category</label>
                                                        <select
                                                            value={tx.category}
                                                            onChange={(e) => {
                                                                const updated = [...scannedTransactions];
                                                                updated[idx].category = e.target.value;
                                                                setScannedTransactions(updated);
                                                            }}
                                                            className={`${inputStyle} text-xs py-1.5 h-auto w-full appearance-none`}
                                                        >
                                                            {ALL_CATEGORIES.map(cat => (
                                                                <option key={cat} value={cat}>{cat}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>

                                                {/* Amount Row */}
                                                <div>
                                                    <label className="text-[9px] font-black uppercase opacity-50 mb-1 block">Amount</label>
                                                    <div className="flex gap-2">
                                                        <input
                                                            type="number"
                                                            value={Math.abs(tx.amount)}
                                                            onChange={(e) => {
                                                                const updated = [...scannedTransactions];
                                                                const val = parseFloat(e.target.value) || 0;
                                                                updated[idx].amount = tx.category === "Income" ? Math.abs(val) : -Math.abs(val);
                                                                setScannedTransactions(updated);
                                                            }}
                                                            className={`${inputStyle} text-sm font-mono font-black py-1.5 h-auto flex-1`}
                                                        />
                                                        <button
                                                            onClick={() => {
                                                                const updated = scannedTransactions.filter((_, i) => i !== idx);
                                                                setScannedTransactions(updated);
                                                            }}
                                                            className="p-2 text-red-500 border-2 border-transparent hover:border-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                                            title="Buang Item"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : scannedTransaction ? (
                                /* Single Transaction (Image) */
                                <div className="flex-1 overflow-y-auto p-6 space-y-5">

                                    {/* Edit Form */}
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-[9px] font-black uppercase opacity-50 mb-1 block tracking-wider">Title / Merchant</label>
                                            <input
                                                type="text"
                                                value={scannedTransaction.title}
                                                onChange={(e) => setScannedTransaction({ ...scannedTransaction, title: e.target.value })}
                                                className={`${inputStyle} text-sm font-bold`}
                                                autoFocus
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-[9px] font-black uppercase opacity-50 mb-1 block tracking-wider">Date</label>
                                                <input
                                                    type="date"
                                                    value={scannedTransaction.isoDate || ""}
                                                    onChange={(e) => {
                                                        const newIso = e.target.value;
                                                        const dateObj = new Date(newIso);
                                                        const newDateStr = dateObj.toLocaleDateString('en-MY', { day: 'numeric', month: 'short' });
                                                        setScannedTransaction({ ...scannedTransaction, isoDate: newIso, date: newDateStr });
                                                    }}
                                                    className={inputStyle}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[9px] font-black uppercase opacity-50 mb-1 block tracking-wider">Category</label>
                                                <select
                                                    value={scannedTransaction.category}
                                                    onChange={(e) => {
                                                        const newCategory = e.target.value;
                                                        const isIncome = newCategory === "Income";
                                                        setScannedTransaction({
                                                            ...scannedTransaction,
                                                            category: newCategory,
                                                            amount: isIncome ? Math.abs(scannedTransaction.amount) : -Math.abs(scannedTransaction.amount)
                                                        });
                                                    }}
                                                    className={`${inputStyle} appearance-none`}
                                                >
                                                    {ALL_CATEGORIES.map(cat => (
                                                        <option key={cat} value={cat}>{cat}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        <div className={`p-4 rounded-xl border-2 ${darkMode ? "bg-white/5 border-white/20" : "bg-gray-50 border-black/10"}`}>
                                            <label className="text-[9px] font-black uppercase opacity-50 mb-1 block tracking-wider text-center">Amount (RM)</label>
                                            <input
                                                type="number"
                                                value={Math.abs(scannedTransaction.amount)}
                                                onChange={(e) => {
                                                    const val = parseFloat(e.target.value) || 0;
                                                    setScannedTransaction({ ...scannedTransaction, amount: scannedTransaction.category === "Income" ? Math.abs(val) : -Math.abs(val) });
                                                }}
                                                className={`w-full bg-transparent text-center text-3xl font-black font-mono outline-none ${darkMode ? "text-white" : "text-black"}`}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ) : null}

                            <div className={`flex gap-3 p-6 border-t-2 ${darkMode ? "border-white" : "border-black"} bg-opacity-20 flex-shrink-0`}>
                                <button
                                    onClick={() => {
                                        setShowScanResultModal(false);
                                        setScannedTransaction(null);
                                        setScannedTransactions([]);
                                    }}
                                    className={`flex-1 py-3.5 rounded-xl border-2 text-xs font-black uppercase transition-all active:scale-95 ${darkMode ? "border-white hover:bg-white hover:text-black" : "border-black hover:bg-gray-100"}`}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        // Logic Baru: Auto-jump ke bulan transaksi tersebut
                                        const targetTx = scannedTransactions.length > 0 ? scannedTransactions[0] : scannedTransaction;

                                        if (targetTx && targetTx.isoDate) {
                                            const txDate = new Date(targetTx.isoDate);
                                            // Check valid date
                                            if (!isNaN(txDate.getTime())) {
                                                // Set SelectedDate kepada 1hb bulan transaksi tersebut supaya ia visible dalam list
                                                setSelectedDate(new Date(txDate.getFullYear(), txDate.getMonth(), 1));
                                            }
                                        }

                                        if (scannedTransactions.length > 0) {
                                            // Save all multiple transactions
                                            setTransactions([...scannedTransactions, ...transactions]);
                                            setShowScanResultModal(false);
                                            setScannedTransactions([]);
                                            alert(`${scannedTransactions.length} transaksi berjaya disimpan!`);
                                        } else if (scannedTransaction) {
                                            // Save single transaction
                                            setTransactions([scannedTransaction, ...transactions]);
                                            setShowScanResultModal(false);
                                            setScannedTransaction(null);
                                            alert("Transaksi berjaya disimpan!");
                                        }
                                    }}
                                    className={`flex-1 py-3.5 rounded-xl border-2 text-xs font-black uppercase transition-all active:scale-95 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] ${darkMode ? "bg-white text-black border-white" : "bg-black text-white border-black"}`}
                                >
                                    {scannedTransactions.length > 0 ? `Confirm All (${scannedTransactions.length})` : "Confirm & Save"}
                                </button>
                            </div>

                        </div>
                    </div>
                )}

                {/* --- MODAL: PILIH SUMBER RESIT --- */}
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
                                <label className={`block w-full p-4 rounded-xl border-2 text-center cursor-pointer transition-all active:scale-95 hover:bg-opacity-10 ${darkMode ? "border-blue-400 bg-blue-500/10 hover:bg-blue-500/20" : "border-blue-600 bg-blue-50 hover:bg-blue-100"}`}>
                                    <input type="file" accept="application/pdf" className="hidden" onChange={handleScanReceipt} />
                                    <Receipt size={32} className={`mx-auto mb-2 ${darkMode ? "text-blue-400" : "text-blue-600"}`} />
                                    <span className="block font-black uppercase text-sm">Upload PDF Statement</span>
                                    <span className="block text-[9px] font-bold opacity-60 mt-1">Bank Statement / Multiple Transactions</span>
                                </label>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- MODAL: CALENDAR --- */}
                {showCalendarModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
                        <div className={`w-full max-w-[320px] p-6 rounded-2xl border-2 ${darkMode ? "bg-[#1E1E1E] border-white text-white" : "bg-white border-black text-black"} shadow-2xl relative animate-in zoom-in-95`}>
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-black uppercase flex items-center gap-2"><Calendar size={20} /> Pilih Bulan/Tahun</h3>
                                <button onClick={() => setShowCalendarModal(false)}><X size={20} /></button>
                            </div>

                            <div className="space-y-4">
                                {/* Month Selector */}
                                <div>
                                    <label className="text-[10px] font-bold uppercase opacity-70 block mb-2">Bulan</label>
                                    <div className="relative">
                                        <select
                                            value={selectedDate.getMonth()}
                                            onChange={(e) => {
                                                const newDate = new Date(selectedDate);
                                                newDate.setMonth(parseInt(e.target.value));
                                                setSelectedDate(newDate);
                                            }}
                                            className={`w-full p-3 pr-10 rounded-xl border-2 outline-none font-bold appearance-none cursor-pointer ${darkMode ? "bg-black border-white text-white" : "bg-white border-black text-black"}`}
                                        >
                                            <option value={0}>Januari</option>
                                            <option value={1}>Februari</option>
                                            <option value={2}>Mac</option>
                                            <option value={3}>April</option>
                                            <option value={4}>Mei</option>
                                            <option value={5}>Jun</option>
                                            <option value={6}>Julai</option>
                                            <option value={7}>Ogos</option>
                                            <option value={8}>September</option>
                                            <option value={9}>Oktober</option>
                                            <option value={10}>November</option>
                                            <option value={11}>Disember</option>
                                        </select>
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                                            <ChevronDown size={18} />
                                        </div>
                                    </div>
                                </div>

                                {/* Year Selector */}
                                <div>
                                    <label className="text-[10px] font-bold uppercase opacity-70 block mb-2">Tahun</label>
                                    <div className="relative">
                                        <select
                                            value={selectedDate.getFullYear()}
                                            onChange={(e) => {
                                                const newDate = new Date(selectedDate);
                                                newDate.setFullYear(parseInt(e.target.value));
                                                setSelectedDate(newDate);
                                            }}
                                            className={`w-full p-3 pr-10 rounded-xl border-2 outline-none font-bold appearance-none cursor-pointer ${darkMode ? "bg-black border-white text-white" : "bg-white border-black text-black"}`}
                                        >
                                            {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map(year => (
                                                <option key={year} value={year}>{year}</option>
                                            ))}
                                        </select>
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                                            <ChevronDown size={18} />
                                        </div>
                                    </div>
                                </div>

                                {/* Quick Actions */}
                                <div className="flex gap-2 pt-2">
                                    <button
                                        onClick={() => {
                                            setSelectedDate(new Date());
                                            setShowCalendarModal(false);
                                        }}
                                        className={`flex-1 py-2 text-[10px] font-black uppercase border-2 rounded-lg transition-all ${darkMode ? "border-white hover:bg-white hover:text-black" : "border-black hover:bg-black hover:text-white"}`}
                                    >
                                        Bulan Ini
                                    </button>
                                    <button
                                        onClick={() => setShowCalendarModal(false)}
                                        className={`flex-1 py-2 text-[10px] font-black uppercase border-2 rounded-lg transition-all ${darkMode ? "bg-white text-black border-white" : "bg-black text-white border-black"}`}
                                    >
                                        OK
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- LOGIN GUIDE MODAL (Google Unverified Warning) --- */}
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
                                    <p className="text-xs font-bold">Tekan <span className="underline decoration-red-500 decoration-2">Go to Budget.AI (unsafe)</span>.</p>
                                </div>
                            </div>

                            <button onClick={openAuthOptions} className={`w-full py-3 rounded-xl font-black uppercase text-xs border-2 flex items-center justify-center gap-2 transition-all active:scale-95 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] ${darkMode ? "bg-white text-black border-white shadow-none" : "bg-blue-600 text-white border-black"}`}>
                                FAHAM, TERUSKAN LOGIN <ArrowRight size={14} />
                            </button>

                            <p className="text-[9px] text-center mt-3 opacity-40 font-bold">Kami tak simpan password anda.</p>
                        </div>
                    </div>
                )}

                {/* --- MODAL: BUDGET LIMIT --- */}
                {showBudgetLimitModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
                        <div className={`w-full max-w-[320px] p-8 rounded-3xl border-2 ${darkMode ? "bg-[#1E1E1E] border-white text-white" : "bg-white border-black text-black"} ${shadowStyle} relative animate-in zoom-in-95`}>

                            <button
                                onClick={() => setShowBudgetLimitModal(false)}
                                className="absolute top-6 right-6 opacity-40 hover:opacity-100 transition-opacity"
                            >
                                <X size={24} />
                            </button>

                            <div className="flex flex-col items-center text-center mb-8">
                                <div className={`w-14 h-14 rounded-2xl border-2 flex items-center justify-center mb-4 ${darkMode ? "bg-white text-black" : "bg-black text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]"}`}>
                                    <Target size={32} />
                                </div>
                                <h3 className="text-xl font-black uppercase leading-tight tracking-tight">
                                    Set Monthly<br />Budget Limit
                                </h3>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className={`text-[10px] font-black uppercase tracking-widest opacity-60 block mb-2 ${darkMode ? "text-white" : "text-black"}`}>
                                        Limit Belanja (RM)
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={tempBudgetLimit}
                                            onChange={(e) => setTempBudgetLimit(e.target.value)}
                                            placeholder="0.00"
                                            className={`w-full p-4 rounded-2xl border-2 outline-none font-mono font-black text-2xl text-center ${darkMode ? "bg-black border-white text-white focus:bg-white/10" : "bg-gray-50 border-black focus:bg-yellow-50"}`}
                                            autoFocus
                                        />
                                    </div>
                                    <p className={`text-[9px] font-bold text-center mt-3 uppercase tracking-widest opacity-40 ${darkMode ? "text-white" : "text-black"}`}>
                                        Kosongkan untuk reset limit
                                    </p>
                                </div>

                                <div className="flex flex-col gap-3">
                                    <button
                                        onClick={handleSaveBudgetLimit}
                                        className={`w-full py-4 text-xs ${buttonBase} ${darkMode ? "bg-white text-black border-white shadow-none" : "bg-black text-white border-black"}`}
                                    >
                                        SIMPAN HAD BELANJA
                                    </button>
                                    <button
                                        onClick={() => setShowBudgetLimitModal(false)}
                                        className={`w-full py-3 text-[10px] font-black uppercase transition-all hover:underline opacity-60 hover:opacity-100 ${darkMode ? "text-white" : "text-black"}`}
                                    >
                                        KEMBALI
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- AUTH MODAL --- */}
                <AuthModal
                    isOpen={showAuthModal}
                    onClose={() => setShowAuthModal(false)}
                    isDarkMode={darkMode}
                />

            </div>
        </div>
    );
}
