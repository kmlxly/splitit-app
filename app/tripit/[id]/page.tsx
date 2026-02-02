"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
    Grid,
    Moon,
    Sun,
    ArrowLeft,
    Calendar,
    Wallet,
    Users,
    Plus,
    MoreHorizontal,
    ChevronRight,
    Plane,
    Hotel,
    Coffee,
    Share2,
    Copy,
    Check,
    Trash2,
    Edit2,
    Maximize,
    ZoomIn,
    ZoomOut,
    X,
    Utensils,
    Car,
    Train,
    Bus,
    Camera,
    Ticket,
    ShoppingBag,
    Music,
    Waves,
    Landmark,
    MapPin,
    Beer,
    ChevronLeft,
    Bike,
    Ship,
    Calculator,
    ShieldCheck,
    FileText,
    Lock,
    Download,
    ExternalLink,
    Briefcase,
    ListChecks,
    Circle,
    CheckCircle2,
    Cloud,
    CloudRain,
    Snowflake,
    Wind,
    Thermometer,
    Droplets,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import Cropper from "react-easy-crop";

// Helper to create an image from a URL
const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
        const image = new Image();
        image.addEventListener("load", () => resolve(image));
        image.addEventListener("error", (error) => reject(error));
        image.setAttribute("crossOrigin", "anonymous");
        image.src = url;
    });

// Helper to get the cropped image as a Blob
async function getCroppedImg(imageSrc: string, pixelCrop: any) {
    const image = await createImage(imageSrc);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

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
        pixelCrop.height,
    );

    return new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (!blob) {
                reject(new Error("Canvas is empty"));
                return;
            }
            resolve(blob);
        }, "image/jpeg");
    });
}

const planIconMap: Record<string, any> = {
    activity: Coffee,
    food: Utensils,
    flight: Plane,
    hotel: Hotel,
    transport: Car,
    train: Train,
    bus: Bus,
    ship: Ship,
    camera: Camera,
    ticket: Ticket,
    shopping: ShoppingBag,
    music: Music,
    waves: Waves,
    landmark: Landmark,
    mappin: MapPin,
    beer: Beer,
    bike: Bike,
};

// --- CURRENCY HELPERS ---
const CURRENCY_MAP: Record<string, string> = {
    RM: "MYR",
    MYR: "MYR",
    THB: "THB",
    "฿": "THB",
    IDR: "IDR",
    Rp: "IDR",
    SGD: "SGD",
    S$: "SGD",
    VND: "VND",
    "₫": "VND",
    PHP: "PHP",
    "₱": "PHP",
    USD: "USD",
    $: "USD",
    JPY: "JPY",
    "¥": "JPY",
    CNY: "CNY",
    KRW: "KRW",
    "₩": "KRW",
    EUR: "EUR",
    "€": "EUR",
    GBP: "GBP",
    "£": "GBP",
    AUD: "AUD",
};

const API_TO_SYMBOL: Record<string, string> = {
    MYR: "RM",
    THB: "฿",
    IDR: "Rp",
    SGD: "S$",
    VND: "₫",
    PHP: "₱",
    USD: "$",
    JPY: "¥",
    CNY: "¥",
    KRW: "₩",
    EUR: "€",
    GBP: "£",
    AUD: "$",
};

const fetchExchangeRate = async (fromCurr: string, toCurr: string) => {
    try {
        const apiFrom = CURRENCY_MAP[fromCurr] || fromCurr;
        const apiTo = CURRENCY_MAP[toCurr] || toCurr;
        if (apiFrom === apiTo) return 1;
        const res = await fetch(
            `https://api.exchangerate-api.com/v4/latest/${apiFrom}`,
        );
        if (!res.ok) return null;
        const data = await res.json();
        return data.rates?.[apiTo] || null;
    } catch (e) {
        return null;
    }
};

export default function TripDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = React.use(params);
    // --- STATE ---
    const [darkMode, setDarkMode] = useState(false);
    const [activeTab, setActiveTab] = useState<
        "itinerary" | "budget" | "people" | "vault" | "checklist"
    >("itinerary");
    const [loading, setLoading] = useState(true);
    const [trip, setTrip] = useState<any>(null);
    const [items, setItems] = useState<any[]>([]);
    const [members, setMembers] = useState<any[]>([]);
    const [documents, setDocuments] = useState<any[]>([]);
    const [checklists, setChecklists] = useState<any[]>([]);
    const [showShareModal, setShowShareModal] = useState(false);
    const [copied, setCopied] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [user, setUser] = useState<any>(null);

    // Document State
    const [showAddDocModal, setShowAddDocModal] = useState(false);
    const [docTitle, setDocTitle] = useState("");
    const [docType, setDocType] = useState("other");
    const [docFile, setDocFile] = useState<File | null>(null);
    const [docIsPrivate, setDocIsPrivate] = useState(false);

    // Checklist State
    const [showAddChecklistModal, setShowAddChecklistModal] = useState(false);
    const [newChecklistTitle, setNewChecklistTitle] = useState("");
    const [newItemName, setNewItemName] = useState("");
    const [activeChecklistId, setActiveChecklistId] = useState<string | null>(
        null,
    );

    // Offline Mode State
    const [isOffline, setIsOffline] = useState(false);

    // Monitor Network Status
    useEffect(() => {
        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);

        if (typeof window !== 'undefined') {
            window.addEventListener('online', handleOnline);
            window.addEventListener('offline', handleOffline);
            if (!navigator.onLine) setIsOffline(true);
        }

        return () => {
            if (typeof window !== 'undefined') {
                window.removeEventListener('online', handleOnline);
                window.removeEventListener('offline', handleOffline);
            }
        };
    }, []);

    // People/Traveler State
    const [showManageTravelersModal, setShowManageTravelersModal] =
        useState(false);
    const [addMemberName, setAddMemberName] = useState("");

    // Weather State
    const [weatherData, setWeatherData] = useState<any>({});
    const fetchingRef = useRef<Set<string>>(new Set());

    // Cropper State
    const [imageToCrop, setImageToCrop] = useState<string | null>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

    // Edit Modal State
    const [showEditModal, setShowEditModal] = useState(false);
    const [editName, setEditName] = useState("");
    const [editStartDate, setEditStartDate] = useState("");
    const [editEndDate, setEditEndDate] = useState("");
    const [editBudget, setEditBudget] = useState("");
    const [editCoverImage, setEditCoverImage] = useState("");
    const [editCurrency, setEditCurrency] = useState("MYR");
    const [editDestCurrency, setEditDestCurrency] = useState("SGD");
    const [destinationRate, setDestinationRate] = useState<number>(1);

    // Add Plan State
    const [showAddPlanModal, setShowAddPlanModal] = useState(false);
    const [planTitle, setPlanTitle] = useState("");
    const [planType, setPlanType] = useState("activity");
    const [planLocation, setPlanLocation] = useState("");
    const [planTime, setPlanTime] = useState("");
    const [planDate, setPlanDate] = useState("");
    const [planCost, setPlanCost] = useState("0");
    const [planCurrency, setPlanCurrency] = useState("MYR");
    const [planExchangeRate, setPlanExchangeRate] = useState("1");
    const [planForeignAmount, setPlanForeignAmount] = useState("");

    // Edit Plan State
    const [showEditPlanModal, setShowEditPlanModal] = useState(false);
    const [editPlanId, setEditPlanId] = useState<string | null>(null);
    const [editPlanTitle, setEditPlanTitle] = useState("");
    const [editPlanType, setEditPlanType] = useState("activity");
    const [editPlanLocation, setEditPlanLocation] = useState("");
    const [editPlanTime, setEditPlanTime] = useState("");
    const [editPlanDate, setEditPlanDate] = useState("");
    const [editPlanCost, setEditPlanCost] = useState("0");
    const [editPlanCurrency, setEditPlanCurrency] = useState("MYR");
    const [editPlanExchangeRate, setEditPlanExchangeRate] = useState("1");
    const [editPlanForeignAmount, setEditPlanForeignAmount] = useState("");
    const [planColor, setPlanColor] = useState("bg-blue-600");
    const [editPlanColor, setEditPlanColor] = useState("bg-blue-600");

    const planColors = [
        "bg-blue-600",
        "bg-rose-500",
        "bg-emerald-500",
        "bg-amber-500",
        "bg-violet-600",
        "bg-cyan-500",
        "bg-orange-500",
        "bg-fuchsia-500",
        "bg-indigo-600",
        "bg-lime-500",
        "bg-yellow-500",
        "bg-teal-500",
        "bg-pink-500",
        "bg-sky-500",
        "bg-slate-700",
        "bg-gray-800",
        "bg-red-600",
        "bg-green-600",
        "bg-purple-600",
        "bg-orange-600",
        "bg-yellow-600",
        "bg-emerald-600",
        "bg-lime-600",
        "bg-rose-600",
    ];

    const getBorderClass = (colorClass: string) => {
        const mapping: { [key: string]: string } = {
            "bg-blue-600": "border-blue-600",
            "bg-rose-500": "border-rose-500",
            "bg-emerald-500": "border-emerald-500",
            "bg-amber-500": "border-amber-500",
            "bg-violet-600": "border-violet-600",
            "bg-cyan-500": "border-cyan-500",
            "bg-orange-500": "border-orange-500",
            "bg-fuchsia-500": "border-fuchsia-500",
            "bg-indigo-600": "border-indigo-600",
            "bg-lime-500": "border-lime-500",
            "bg-yellow-500": "border-yellow-500",
            "bg-teal-500": "border-teal-500",
            "bg-pink-500": "border-pink-500",
            "bg-sky-500": "border-sky-500",
            "bg-slate-700": "border-slate-700",
            "bg-gray-800": "border-gray-800",
            "bg-red-600": "border-red-600",
            "bg-green-600": "border-green-600",
            "bg-purple-600": "border-purple-600",
            "bg-orange-600": "border-orange-600",
            "bg-yellow-600": "border-yellow-600",
            "bg-emerald-600": "border-emerald-600",
            "bg-lime-600": "border-lime-600",
            "bg-rose-600": "border-rose-600",
        };
        return mapping[colorClass] || (darkMode ? "border-white" : "border-black");
    };

    const [selectedDayIndex, setSelectedDayIndex] = useState(0);
    const [showPushToSplitItModal, setShowPushToSplitItModal] = useState(false);

    // Personal Expenses State
    const [budgetSubTab, setBudgetSubTab] = useState<"trip" | "personal">("trip");
    const [personalExpenses, setPersonalExpenses] = useState<any[]>([]);
    const [showAddPersonalModal, setShowAddPersonalModal] = useState(false);
    const [personalTitle, setPersonalTitle] = useState("");
    const [personalAmount, setPersonalAmount] = useState("");
    const [personalCurrency, setPersonalCurrency] = useState("MYR");
    const [personalExchangeRate, setPersonalExchangeRate] = useState("1");
    const [personalForeignAmount, setPersonalForeignAmount] = useState("");
    const [personalCategory, setPersonalCategory] = useState("shopping");

    // --- CURRENCY EFFECTS ---
    // 1. Group Plan (Add)
    useEffect(() => {
        const tripCurr = trip?.currency || "MYR";
        if (planCurrency === tripCurr) {
            setPlanCost(planForeignAmount || "0");
            return;
        }
        const amount = Number(planForeignAmount);
        const rate = Number(planExchangeRate);
        if (!isNaN(amount) && !isNaN(rate) && rate > 0) {
            setPlanCost((amount * rate).toFixed(2));
        }
    }, [planForeignAmount, planExchangeRate, planCurrency, trip?.currency]);

    // 2. Group Plan (Edit)
    useEffect(() => {
        const tripCurr = trip?.currency || "MYR";
        if (editPlanCurrency === tripCurr) {
            setEditPlanCost(editPlanForeignAmount || "0");
            return;
        }
        const amount = Number(editPlanForeignAmount);
        const rate = Number(editPlanExchangeRate);
        if (!isNaN(amount) && !isNaN(rate) && rate > 0) {
            setEditPlanCost((amount * rate).toFixed(2));
        }
    }, [
        editPlanForeignAmount,
        editPlanExchangeRate,
        editPlanCurrency,
        trip?.currency,
    ]);

    // 3. Personal Pocket
    useEffect(() => {
        const tripCurr = trip?.currency || "MYR";
        if (personalCurrency === tripCurr) {
            setPersonalAmount(personalForeignAmount || "0");
            return;
        }
        const amount = Number(personalForeignAmount);
        const rate = Number(personalExchangeRate);
        if (!isNaN(amount) && !isNaN(rate) && rate > 0) {
            setPersonalAmount((amount * rate).toFixed(2));
        }
    }, [
        personalForeignAmount,
        personalExchangeRate,
        personalCurrency,
        trip?.currency,
    ]);

    // 4. Rate Auto-Fetch
    useEffect(() => {
        const updateRate = async (
            curr: string,
            target: string,
            setRate: (r: string) => void,
        ) => {
            if (curr === target) return setRate("1");
            const rate = await fetchExchangeRate(curr, target);
            if (rate) setRate(rate.toString());
        };
        const tripCurr = trip?.currency || "MYR";
        if (showAddPlanModal)
            updateRate(planCurrency, tripCurr, setPlanExchangeRate);
        if (showEditPlanModal)
            updateRate(editPlanCurrency, tripCurr, setEditPlanExchangeRate);
        if (showAddPersonalModal)
            updateRate(personalCurrency, tripCurr, setPersonalExchangeRate);
    }, [
        planCurrency,
        editPlanCurrency,
        personalCurrency,
        trip?.currency,
        showAddPlanModal,
        showEditPlanModal,
        showAddPersonalModal,
    ]);

    // 5. Destination Rate
    useEffect(() => {
        const fetchRate = async () => {
            if (!trip?.currency || !trip?.destination_currency) return;
            const rate = await fetchExchangeRate(
                trip.currency,
                trip.destination_currency,
            );
            if (rate) setDestinationRate(rate);
        };
        fetchRate();
    }, [trip?.currency, trip?.destination_currency]);

    const handleToggleComplete = async (
        itemId: string,
        currentStatus: boolean,
    ) => {
        try {
            const { error } = await supabase
                .from("trip_items")
                .update({ is_completed: !currentStatus })
                .eq("id", itemId);

            if (error) throw error;

            setItems(
                items.map((item) =>
                    item.id === itemId ? { ...item, is_completed: !currentStatus } : item,
                ),
            );
        } catch (e: any) {
            alert("Gagal update status: " + e.message);
        }
    };

    // --- EFFECT: LOAD DATA ---
    useEffect(() => {
        const checkSessionAndFetch = async () => {
            const {
                data: { session },
            } = await supabase.auth.getSession();
            if (session) {
                setUser(session.user);
                fetchTripData();
            } else {
                fetchTripData();
            }
        };
        checkSessionAndFetch();
    }, [id]);

    // Fetch weather for all itinerary items with locations (with rate limiting)
    // Fetch weather for all itinerary items with locations (with rate limiting)
    useEffect(() => {
        if (items.length > 0) {
            // Get unique location-date combinations
            const uniqueMap = new Map();
            items.forEach((item: any) => {
                if (item.location && item.day_date) {
                    const key = `${item.location}_${item.day_date}`;
                    if (!uniqueMap.has(key)) {
                        uniqueMap.set(key, { location: item.location, date: item.day_date });
                    }
                }
            });

            const uniqueItems = Array.from(uniqueMap.values());

            // Fetch with delay to respect rate limits
            uniqueItems.forEach((ld: any, index: number) => {
                const key = `${ld.location}_${ld.date}`;
                // Skip if already fetched or currently fetching
                if (weatherData[key] || fetchingRef.current.has(key)) return;

                fetchingRef.current.add(key);
                setTimeout(() => {
                    fetchWeather(ld.location, ld.date);
                }, index * 800); // 800ms delay to be safe but faster
            });
        }
    }, [items]);

    const fetchTripData = async () => {
        console.log("Fetching trip with ID:", id);
        setLoading(true);
        try {
            // Check if online before making requests
            if (!navigator.onLine) {
                console.log("Offline mode detected. Attempting to load from cache.");
                throw new Error("Offline");
            }

            // 1. Fetch Trip Info
            const { data: tripData, error: tripError } = await supabase
                .from("trips")
                .select("*")
                .eq("id", id)
                .single();

            if (tripError) throw tripError;

            // 2. Fetch Itinerary, Members, Documents, & Checklists
            const [itemsRes, membersRes, docsRes, checklistRes] = await Promise.all([
                supabase
                    .from("trip_items")
                    .select("*")
                    .eq("trip_id", id)
                    .order("day_date", { ascending: true }),
                supabase.from("trip_members").select("*").eq("trip_id", id),
                supabase
                    .from("trip_documents")
                    .select("*")
                    .eq("trip_id", id)
                    .order("created_at", { ascending: false }),
                supabase
                    .from("trip_checklists")
                    .select("*, trip_checklist_items(*)")
                    .eq("trip_id", id)
                    .order("created_at", { ascending: true }),
            ]);

            // Save to Cache
            if (typeof window !== 'undefined') {
                localStorage.setItem(`offline_trip_${id}`, JSON.stringify(tripData));
                localStorage.setItem(`offline_items_${id}`, JSON.stringify(itemsRes.data || []));
                localStorage.setItem(`offline_members_${id}`, JSON.stringify(membersRes.data || []));
                localStorage.setItem(`offline_docs_${id}`, JSON.stringify(docsRes.data || []));
                localStorage.setItem(`offline_checklists_${id}`, JSON.stringify(checklistRes.data || []));
                localStorage.setItem(`offline_timestamp_${id}`, new Date().toISOString());
            }

            setTrip(tripData);
            setItems(itemsRes.data || []);
            setMembers(membersRes.data || []);
            setDocuments(docsRes.data || []);
            setChecklists(checklistRes.data || []);
            setIsOffline(false);

            // 3. Fetch Personal Expenses
            fetchPersonalExpenses();

        } catch (e: any) {
            console.error("Error/Offline loading trip:", e);
            setIsOffline(true);

            // Load from Cache
            if (typeof window !== 'undefined') {
                const cachedTrip = localStorage.getItem(`offline_trip_${id}`);
                const cachedItems = localStorage.getItem(`offline_items_${id}`);
                const cachedMembers = localStorage.getItem(`offline_members_${id}`);
                const cachedDocs = localStorage.getItem(`offline_docs_${id}`);
                const cachedChecklists = localStorage.getItem(`offline_checklists_${id}`);

                if (cachedTrip && cachedItems) {
                    console.log("Loaded trip from offline cache");
                    setTrip(JSON.parse(cachedTrip));
                    setItems(JSON.parse(cachedItems));
                    setMembers(cachedMembers ? JSON.parse(cachedMembers) : []);
                    setDocuments(cachedDocs ? JSON.parse(cachedDocs) : []);
                    setChecklists(cachedChecklists ? JSON.parse(cachedChecklists) : []);
                    // Don't set failure state if we successfully loaded from cache
                } else {
                    setTrip(null);
                }
            }
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = (text: string, type: string) => {
        navigator.clipboard.writeText(text);
        setCopied(type);
        setTimeout(() => setCopied(null), 2000);
    };

    const uploadImage = async (fileOrBlob: File | Blob) => {
        try {
            setUploading(true);
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (!user) return alert("Sila log masuk semula.");

            const fileName = `trip-${Date.now()}.jpg`;
            const filePath = `${user.id}/${fileName}`;

            console.log("Mencuba muat naik ke:", filePath);

            const { error: uploadError } = await supabase.storage
                .from("trips")
                .upload(filePath, fileOrBlob, {
                    contentType: "image/jpeg",
                    upsert: true,
                });

            if (uploadError) throw uploadError;

            const {
                data: { publicUrl },
            } = supabase.storage.from("trips").getPublicUrl(filePath);

            // Update Trip Cover URL in DB
            const { error: updateError } = await supabase
                .from("trips")
                .update({ cover_image: publicUrl })
                .eq("id", id);

            if (updateError) throw updateError;

            setTrip({ ...trip, cover_image: publicUrl });
            setEditCoverImage(publicUrl); // Sync if edit modal is open
        } catch (error: any) {
            console.error("Ralat muat naik:", error);
            alert(
                "Gagal muat naik: " +
                (error.message || "Sila pastikan bucket 'trips' wujud."),
            );
        } finally {
            setUploading(false);
            setImageToCrop(null);
        }
    };

    const handleConfirmCrop = async () => {
        if (!imageToCrop || !croppedAreaPixels) return;
        try {
            const croppedImageBlob = await getCroppedImg(
                imageToCrop,
                croppedAreaPixels,
            );
            if (croppedImageBlob) {
                await uploadImage(croppedImageBlob);
            }
        } catch (e) {
            console.error(e);
            alert("Gagal memproses gambar cropping.");
        }
    };

    const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.addEventListener("load", () => {
                setImageToCrop(reader.result as string);
                setZoom(1);
                setCrop({ x: 0, y: 0 });
            });
            reader.readAsDataURL(file);
        }
    };

    const handleOpenEdit = () => {
        setEditName(trip.name);
        setEditStartDate(trip.start_date || "");
        setEditEndDate(trip.end_date || "");
        setEditBudget(trip.budget_limit?.toString() || "0");
        setEditCoverImage(trip.cover_image || "");
        setEditCurrency(trip.currency || "MYR");
        setEditDestCurrency(trip.destination_currency || "SGD");
        setShowEditModal(true);
    };

    const handleUpdateTrip = async () => {
        try {
            const { error } = await supabase
                .from("trips")
                .update({
                    name: editName,
                    start_date: editStartDate,
                    end_date: editEndDate || null,
                    budget_limit: parseFloat(editBudget) || 0,
                    cover_image: editCoverImage,
                    currency: editCurrency,
                    destination_currency: editDestCurrency,
                })
                .eq("id", id);

            if (error) throw error;

            setTrip({
                ...trip,
                name: editName,
                start_date: editStartDate,
                end_date: editEndDate,
                budget_limit: parseFloat(editBudget),
                cover_image: editCoverImage,
                currency: editCurrency,
                destination_currency: editDestCurrency,
            });
            setShowEditModal(false);
        } catch (e: any) {
            alert("Gagal update trip: " + e.message);
        }
    };

    const fetchWeather = async (location: string, date: string) => {
        const key = `${location}_${date}`;
        // Double check inside function in case state updated
        if (!location || weatherData[key]) {
            fetchingRef.current.delete(key);
            return;
        }

        try {
            // 1. Geocode using Open-Meteo Geocoding API
            const geoRes = await fetch(
                `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`,
            );

            if (!geoRes.ok) throw new Error("Geocoding failed");

            const geoData = await geoRes.json();

            if (!geoData.results || geoData.results.length === 0) {
                console.log("⚠️ Location not found:", location);
                fetchingRef.current.delete(key);
                return;
            }

            const { latitude, longitude } = geoData.results[0];

            // 2. Fetch Weather (Open-Meteo) including past days
            const weatherRes = await fetch(
                `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto&past_days=92&forecast_days=16`,
            );

            if (!weatherRes.ok) throw new Error("Weather API failed");

            const dailyData = await weatherRes.json();

            // Find index for the target date
            const dateStr = new Date(date).toISOString().split("T")[0];
            const dateIdx = dailyData.daily.time.indexOf(dateStr);

            if (dateIdx !== -1) {
                const info = {
                    maxTemp: dailyData.daily.temperature_2m_max[dateIdx],
                    minTemp: dailyData.daily.temperature_2m_min[dateIdx],
                    code: dailyData.daily.weathercode[dateIdx],
                };
                console.log("✅ Weather saved:", location, date, info);
                setWeatherData((prev: any) => ({
                    ...prev,
                    [key]: info,
                }));
            } else {
                console.log("⚠️ Date not found in forecast:", dateStr);
            }
        } catch (e: any) {
            console.error("❌ Weather fetch error:", e.message);
        } finally {
            fetchingRef.current.delete(key);
        }
    };

    const getWeatherIcon = (code: number) => {
        // Make sure to import these icons from 'lucide-react'
        // import { Cloud, CloudRain, Sun, Snowflake, Wind } from 'lucide-react';
        if (code === 0) return <Sun className="text-amber-500" size={14} />;
        if (code <= 3) return <Cloud className="text-gray-400" size={14} />;
        if (code <= 67) return <CloudRain className="text-blue-500" size={14} />;
        if (code <= 77) return <Snowflake className="text-blue-300" size={14} />;
        return <Wind className="text-gray-500" size={14} />;
    };

    const handleAddPlan = async () => {
        if (!planTitle || !planDate) return alert("Sila isi Tajuk & Tarikh!");

        try {
            const { data, error } = await supabase
                .from("trip_items")
                .insert({
                    trip_id: id,
                    title: planTitle,
                    type: planType,
                    location: planLocation,
                    start_time: planTime || null,
                    day_date: planDate,
                    color: planColor,
                    cost: parseFloat(planCost) || 0,
                    original_currency: planCurrency,
                    original_amount: parseFloat(planForeignAmount) || 0,
                    exchange_rate: parseFloat(planExchangeRate) || 1,
                })
                .select()
                .single();

            if (error) throw error;

            setItems(
                [...items, data].sort((a, b) => {
                    const dateA = new Date(`${a.day_date} ${a.start_time || "00:00"}`);
                    const dateB = new Date(`${b.day_date} ${b.start_time || "00:00"}`);
                    return dateA.getTime() - dateB.getTime();
                }),
            );

            setShowAddPlanModal(false);
            setPlanTitle("");
            setPlanLocation("");
            setPlanTime("");
            setPlanCost("0");
        } catch (e: any) {
            alert("Gagal tambah plan: " + e.message);
        }
    };

    const handleOpenEditPlan = (item: any) => {
        setEditPlanId(item.id);
        setEditPlanTitle(item.title);
        setEditPlanType(item.type);
        setEditPlanLocation(item.location || "");
        setEditPlanTime(item.start_time || "");
        setEditPlanDate(item.day_date || "");
        setEditPlanColor(item.color || "bg-blue-600");
        setEditPlanCost(item.cost?.toString() || "0");
        setEditPlanCurrency(item.original_currency || trip?.currency || "RM");
        setEditPlanForeignAmount(
            item.original_amount?.toString() || item.cost?.toString() || "",
        );
        setEditPlanExchangeRate(item.exchange_rate?.toString() || "1");
        setShowEditPlanModal(true);
    };

    const handleUpdatePlan = async () => {
        if (!editPlanTitle || !editPlanDate)
            return alert("Sila isi Tajuk & Tarikh!");

        try {
            const { error } = await supabase
                .from("trip_items")
                .update({
                    title: editPlanTitle,
                    type: editPlanType,
                    location: editPlanLocation,
                    start_time: editPlanTime || null,
                    day_date: editPlanDate,
                    color: editPlanColor,
                    cost: parseFloat(editPlanCost) || 0,
                    original_currency: editPlanCurrency,
                    original_amount: parseFloat(editPlanForeignAmount) || 0,
                    exchange_rate: parseFloat(editPlanExchangeRate) || 1,
                })
                .eq("id", editPlanId);

            if (error) throw error;

            const updatedItems = items
                .map((item) =>
                    item.id === editPlanId
                        ? {
                            ...item,
                            title: editPlanTitle,
                            type: editPlanType,
                            location: editPlanLocation,
                            start_time: editPlanTime,
                            day_date: editPlanDate,
                            color: editPlanColor,
                            is_completed: item.is_completed,
                            cost: parseFloat(editPlanCost) || 0,
                        }
                        : item,
                )
                .sort((a, b) => {
                    const dateA = new Date(`${a.day_date} ${a.start_time || "00:00"}`);
                    const dateB = new Date(`${b.day_date} ${b.start_time || "00:00"}`);
                    return dateA.getTime() - dateB.getTime();
                });

            setItems(updatedItems);
            setShowEditPlanModal(false);
        } catch (e: any) {
            alert("Gagal update plan: " + e.message);
        }
    };

    const handleDeleteItem = async (itemId: string) => {
        if (!confirm("Padam plan ini?")) return;
        try {
            const { error } = await supabase
                .from("trip_items")
                .delete()
                .eq("id", itemId);
            if (error) throw error;
            setItems(items.filter((i) => i.id !== itemId));
        } catch (e: any) {
            alert("Gagal padam: " + e.message);
        }
    };

    const handlePushToSplitIt = () => {
        const itemsWithCost = items.filter(
            (it: any) => (parseFloat(it.cost) || 0) > 0,
        );

        // Prepare data for SplitIt
        const importData = {
            tripName: trip.name,
            currency: trip.currency || "MYR",
            people: members.map((m) => ({
                id: m.user_id || `m-${m.id}`,
                name: m.name,
            })),
            bills: itemsWithCost.map((it) => ({
                id: crypto.randomUUID(),
                title: it.title,
                totalAmount: parseFloat(it.cost) || 0,
                type: "EQUAL",
                date: it.day_date,
            })),
        };

        // Store in localStorage for SplitIt to pick up
        localStorage.setItem("splitit_trip_import", JSON.stringify(importData));

        // Redirect to SplitIt with import flag
        window.location.href = "/splitit?import=trip";
    };

    const fetchPersonalExpenses = async () => {
        try {
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (!user) return;
            const { data, error } = await supabase
                .from("trip_personal_expenses")
                .select("*")
                .eq("trip_id", id)
                .eq("user_id", user.id)
                .order("created_at", { ascending: false });

            if (error) throw error;
            setPersonalExpenses(data || []);
        } catch (e: any) {
            console.error("Gagal load belanja peribadi:", e.message);
        }
    };

    const handleAddDocument = async () => {
        if (!docTitle || !docFile || !user)
            return alert("Sila isi tajuk & pilih fail!");

        setUploading(true);
        try {
            // 1. Upload to Storage
            const fileExt = docFile.name.split(".").pop();
            const fileName = `doc_${Date.now()}.${fileExt}`;
            const filePath = `${user.id}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from("trip_docs")
                .upload(filePath, docFile);

            if (uploadError) throw uploadError;

            const {
                data: { publicUrl },
            } = supabase.storage.from("trip_docs").getPublicUrl(filePath);

            // 2. Save to Database
            const { data, error: dbError } = await supabase
                .from("trip_documents")
                .insert({
                    trip_id: id,
                    user_id: user.id,
                    title: docTitle,
                    file_url: publicUrl,
                    type: docType,
                    is_private: docIsPrivate,
                })
                .select()
                .single();

            if (dbError) throw dbError;

            setDocuments([data, ...documents]);
            setShowAddDocModal(false);
            setDocTitle("");
            setDocFile(null);
            setDocType("other");
            setDocIsPrivate(false);
        } catch (e: any) {
            alert("Gagal simpan dokumen: " + e.message);
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteDocument = async (doc: any) => {
        if (!confirm("Padam dokumen ini?")) return;
        try {
            // 1. Delete from Storage (Extract path from URL if possible, or just delete DB record)
            // For simplicity, we'll just delete the DB record here as storage paths are tricky to extract reliably from publicUrl
            // In production, you'd want to delete the storage object too.
            const { error } = await supabase
                .from("trip_documents")
                .delete()
                .eq("id", doc.id);
            if (error) throw error;
            setDocuments(documents.filter((d) => d.id !== doc.id));
        } catch (e: any) {
            alert("Gagal padam: " + e.message);
        }
    };

    const handleAddChecklist = async () => {
        if (!newChecklistTitle.trim()) return;
        try {
            const { data, error } = await supabase
                .from("trip_checklists")
                .insert({ trip_id: id, title: newChecklistTitle })
                .select("*, trip_checklist_items(*)")
                .single();
            if (error) throw error;
            setChecklists([...checklists, data]);
            setNewChecklistTitle("");
            setShowAddChecklistModal(false);
        } catch (e: any) {
            alert("Gagal tambah senarai: " + e.message);
        }
    };

    const handleAddChecklistItem = async (
        checklistId: string,
        itemName: string,
    ) => {
        if (!itemName.trim()) return;
        try {
            const { data, error } = await supabase
                .from("trip_checklist_items")
                .insert({ checklist_id: checklistId, item_name: itemName })
                .select()
                .single();
            if (error) throw error;
            setChecklists(
                checklists.map((cl) =>
                    cl.id === checklistId
                        ? {
                            ...cl,
                            trip_checklist_items: [
                                ...(cl.trip_checklist_items || []),
                                data,
                            ],
                        }
                        : cl,
                ),
            );
        } catch (e: any) {
            alert("Gagal tambah item: " + e.message);
        }
    };

    const handleToggleChecklistItem = async (
        itemId: string,
        currentStatus: boolean,
        checklistId: string,
    ) => {
        try {
            const { error } = await supabase
                .from("trip_checklist_items")
                .update({ is_checked: !currentStatus, checked_by: user?.id })
                .eq("id", itemId);
            if (error) throw error;

            setChecklists(
                checklists.map((cl) => {
                    if (cl.id === checklistId) {
                        return {
                            ...cl,
                            trip_checklist_items: cl.trip_checklist_items.map((it: any) =>
                                it.id === itemId ? { ...it, is_checked: !currentStatus } : it,
                            ),
                        };
                    }
                    return cl;
                }),
            );
        } catch (e: any) {
            alert("Gagal kemaskini item: " + e.message);
        }
    };

    const handleDeleteChecklist = async (checklistId: string) => {
        if (!confirm("Padam senarai ini? Semua item akan hilang.")) return;
        try {
            const { error } = await supabase
                .from("trip_checklists")
                .delete()
                .eq("id", checklistId);
            if (error) throw error;
            setChecklists(checklists.filter((cl) => cl.id !== checklistId));
        } catch (e: any) {
            alert("Gagal padam: " + e.message);
        }
    };

    const handleAddPersonalExpense = async () => {
        if (!personalTitle || !personalAmount)
            return alert("Sila isi semua maklumat!");
        try {
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (!user) return alert("Sila log masuk.");

            const { data, error } = await supabase
                .from("trip_personal_expenses")
                .insert({
                    trip_id: id,
                    user_id: user.id,
                    title: personalTitle,
                    amount: parseFloat(personalAmount),
                    category: personalCategory,
                    original_currency: personalCurrency,
                    original_amount: parseFloat(personalForeignAmount) || 0,
                    exchange_rate: parseFloat(personalExchangeRate) || 1,
                })
                .select()
                .single();

            if (error) throw error;
            setPersonalExpenses([data, ...personalExpenses]);
            setShowAddPersonalModal(false);
            setPersonalTitle("");
            setPersonalAmount("");
        } catch (e: any) {
            alert("Gagal tambah belanja: " + e.message);
        }
    };

    const handleDeletePersonal = async (expenseId: string) => {
        if (!confirm("Padam belanja peribadi ini?")) return;
        try {
            const { error } = await supabase
                .from("trip_personal_expenses")
                .delete()
                .eq("id", expenseId);
            if (error) throw error;
            setPersonalExpenses(personalExpenses.filter((e) => e.id !== expenseId));
        } catch (e: any) {
            alert("Gagal padam: " + e.message);
        }
    };

    const handleAddMember = async () => {
        if (!addMemberName.trim()) return;
        try {
            const { data, error } = await supabase
                .from("trip_members")
                .insert({
                    trip_id: id,
                    name: addMemberName,
                    role: "editor",
                })
                .select()
                .single();

            if (error) throw error;
            setMembers([...members, data]);
            setAddMemberName("");
        } catch (e: any) {
            alert("Gagal tambah ahli: " + e.message);
        }
    };

    const handleRemoveMember = async (memberId: string) => {
        const member = members.find((m) => m.id === memberId);
        if (member?.role === "owner") return alert("Tuan tanah tak boleh dibuang!");
        if (!confirm(`Padam ${member?.name} dari trip ini?`)) return;

        try {
            const { error } = await supabase
                .from("trip_members")
                .delete()
                .eq("id", memberId);

            if (error) throw error;
            setMembers(members.filter((m) => m.id !== memberId));
        } catch (e: any) {
            alert("Gagal padam ahli: " + e.message);
        }
    };

    if (loading)
        return (
            <div
                className={`min-h-screen flex items-center justify-center ${darkMode ? "bg-black text-white" : "bg-gray-50 text-black"}`}
            >
                <p className="font-black uppercase animate-pulse">
                    Loading Adventure...
                </p>
            </div>
        );

    if (!trip)
        return (
            <div
                className={`min-h-screen flex flex-col items-center justify-center p-6 text-center ${darkMode ? "bg-black text-white" : "bg-gray-50 text-black"}`}
            >
                <h2 className="text-2xl font-black uppercase mb-2">Trip Not Found</h2>
                <p className="text-sm opacity-60 mb-6">
                    Mungkin link salah atau anda tiada akses.
                </p>
                <Link
                    href="/tripit"
                    className="py-3 px-6 rounded-xl bg-black text-white border-2 border-black font-bold uppercase"
                >
                    Back to Trips
                </Link>
            </div>
        );

    // --- STYLES ---
    const bgStyle = darkMode ? "bg-black text-white" : "bg-gray-50 text-black";
    const cardStyle = `${darkMode ? "bg-[#1E1E1E] border-white" : "bg-white border-black"} border-2 rounded-2xl`;
    const tabActiveStyle = darkMode
        ? "bg-white text-black"
        : "bg-black text-white";
    const tabInactiveStyle = darkMode
        ? "bg-white/10 text-white"
        : "bg-gray-200 text-black/60";

    const daysLeft = trip.start_date
        ? Math.ceil(
            (new Date(trip.start_date).setHours(0, 0, 0, 0) -
                new Date().setHours(0, 0, 0, 0)) /
            (1000 * 3600 * 24),
        )
        : 0;

    return (
        <div
            className={`min-h-screen font-sans transition-colors duration-300 ${bgStyle}`}
        >
            <div className="max-w-md mx-auto min-h-screen flex flex-col relative">
                {isOffline && (
                    <div className="bg-amber-500 text-white text-[10px] font-black uppercase text-center py-1 sticky top-0 z-[60] shadow-md animate-in slide-in-from-top">
                        You are currently offline. Viewing cached data.
                    </div>
                )}
                {/* --- HEADER --- */}
                <header
                    className={`px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-3 border-b-2 sticky top-0 z-40 transition-colors duration-300 ${darkMode ? "border-white bg-black" : "border-black bg-white"}`}
                >
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <Link
                                href="/tripit"
                                className={`p-2 rounded-xl border-2 transition-all active:scale-95 ${darkMode ? "border-white hover:bg-white hover:text-black" : "border-black hover:bg-black hover:text-white"}`}
                            >
                                <ArrowLeft size={18} />
                            </Link>
                            <div>
                                <h1 className="text-xl font-black uppercase leading-none tracking-tighter">
                                    TripIt.
                                </h1>
                                <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest">
                                    Travel Master
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowShareModal(true)}
                                className={`p-2 rounded-xl border-2 transition-all active:scale-95 ${darkMode ? "border-white" : "border-black"}`}
                            >
                                <Share2 size={18} />
                            </button>
                            <button
                                onClick={() => setDarkMode(!darkMode)}
                                className={`p-2 rounded-xl border-2 transition-all active:scale-95 ${darkMode ? "border-white" : "border-black"}`}
                            >
                                {darkMode ? <Sun size={18} /> : <Moon size={18} />}
                            </button>
                        </div>
                    </div>
                </header>

                {/* --- MAIN CONTENT --- */}
                <main className="flex-1 p-4 flex flex-col gap-6">
                    {/* TRIP HEADER CARD */}
                    <div
                        className={`relative h-48 rounded-3xl border-2 overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${darkMode ? "border-white" : "border-black"}`}
                    >
                        <img
                            src={
                                trip.cover_image ||
                                "https://images.unsplash.com/photo-1542051841-8d029e53f2c0?q=80&w=2970&auto=format&fit=crop"
                            }
                            alt="Cover"
                            className="absolute inset-0 w-full h-full object-cover opacity-80"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-6">
                            <div className="flex items-start justify-between">
                                <div>
                                    <span className="bg-yellow-400 text-black text-[9px] font-black uppercase px-2 py-1 rounded-md border-2 border-black mb-2 inline-block">
                                        {daysLeft > 0 ? `${daysLeft} Days Left` : "Happening Now"}
                                    </span>
                                    <h2 className="text-3xl font-black text-white uppercase leading-none mb-1">
                                        {trip.name}
                                    </h2>
                                    <div className="flex items-center gap-2 text-white/80">
                                        <Calendar size={12} />
                                        <p className="text-xs font-bold">
                                            {new Date(trip.start_date).toLocaleDateString("en-GB")} -{" "}
                                            {trip.end_date
                                                ? new Date(trip.end_date).toLocaleDateString("en-GB")
                                                : "TBA"}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleOpenEdit}
                                        className="p-2 bg-white/20 backdrop-blur-md rounded-xl border-2 border-white/50 text-white active:scale-95 transition-all"
                                    >
                                        <MoreHorizontal size={20} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* NAVIGATION TABS */}
                    {/* NAVIGATION TABS */}
                    <div className="relative group/tabs flex items-center">
                        <div className={`absolute left-0 z-20 h-full flex items-center pl-1 ${darkMode ? "bg-gradient-to-r from-[#121212] via-[#121212] to-transparent" : "bg-gradient-to-r from-gray-50 via-gray-50 to-transparent"} opacity-0 group-hover/tabs:opacity-100 transition-opacity pointer-events-none`}>
                            <ChevronLeft size={16} className={`text-current ${darkMode ? 'text-white' : 'text-black'}`} />
                        </div>
                        <div className="flex-1 flex p-1 rounded-xl border-2 border-dashed border-current gap-1 overflow-x-auto no-scrollbar scroll-smooth">
                            <button
                                onClick={() => setActiveTab("itinerary")}
                                className={`flex-1 min-w-[80px] py-2 rounded-lg text-xs font-black uppercase whitespace-nowrap transition-all ${activeTab === "itinerary" ? tabActiveStyle : tabInactiveStyle}`}
                            >
                                Itinerary
                            </button>
                            <button
                                onClick={() => setActiveTab("budget")}
                                className={`flex-1 min-w-[80px] py-2 rounded-lg text-xs font-black uppercase whitespace-nowrap transition-all ${activeTab === "budget" ? tabActiveStyle : tabInactiveStyle}`}
                            >
                                Budget
                            </button>
                            <button
                                onClick={() => setActiveTab("people")}
                                className={`flex-1 min-w-[80px] py-2 rounded-lg text-xs font-black uppercase whitespace-nowrap transition-all ${activeTab === "people" ? tabActiveStyle : tabInactiveStyle}`}
                            >
                                People
                            </button>
                            <button
                                onClick={() => setActiveTab("vault")}
                                className={`flex-1 min-w-[80px] py-2 rounded-lg text-xs font-black uppercase whitespace-nowrap transition-all ${activeTab === "vault" ? tabActiveStyle : tabInactiveStyle}`}
                            >
                                Vault
                            </button>
                            <button
                                onClick={() => setActiveTab("checklist")}
                                className={`flex-1 min-w-[80px] py-2 rounded-lg text-xs font-black uppercase whitespace-nowrap transition-all ${activeTab === "checklist" ? tabActiveStyle : tabInactiveStyle}`}
                            >
                                Pack
                            </button>
                        </div>
                        <div className={`absolute right-0 z-20 h-full flex items-center pr-1 ${darkMode ? "bg-gradient-to-l from-[#121212] via-[#121212] to-transparent" : "bg-gradient-to-l from-gray-50 via-gray-50 to-transparent"} opacity-100 pointer-events-none`}>
                            <ChevronRight size={16} className={`text-current ${darkMode ? 'text-white' : 'text-black'}`} />
                        </div>
                    </div>

                    {/* CONTENT AREA */}
                    {activeTab === "itinerary" && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                            {/* DAY TABS */}
                            {items.length > 0 && (
                                <div className="flex overflow-x-auto gap-2 pb-2 px-1 no-scrollbar -mx-4 px-4 sticky top-0 z-20 bg-inherit py-2 border-b-2 border-dashed border-current/10">
                                    {(() => {
                                        const grouped = items.reduce((acc: any, item: any) => {
                                            const date = item.day_date;
                                            if (!acc[date]) acc[date] = [];
                                            acc[date].push(item);
                                            return acc;
                                        }, {});
                                        const sortedDates = Object.keys(grouped).sort();

                                        return sortedDates.map((dateStr, idx) => {
                                            const isSelected = selectedDayIndex === idx;
                                            const dateObj = new Date(dateStr);
                                            const dayNum = trip.start_date
                                                ? Math.floor(
                                                    (new Date(dateStr).setHours(0, 0, 0, 0) -
                                                        new Date(trip.start_date).setHours(0, 0, 0, 0)) /
                                                    (1000 * 3600 * 24),
                                                ) + 1
                                                : idx + 1;
                                            const allDone = grouped[dateStr].every(
                                                (it: any) => it.is_completed,
                                            );

                                            return (
                                                <button
                                                    key={dateStr}
                                                    onClick={() => setSelectedDayIndex(idx)}
                                                    className={`flex-shrink-0 px-4 py-2 rounded-xl border-2 flex items-center gap-2 transition-all ${isSelected ? (darkMode ? "bg-white text-black border-white" : "bg-black text-white border-black") : darkMode ? "border-white/20 text-white/60" : "border-black/10 text-black/60"}`}
                                                >
                                                    <span className="text-[10px] font-black uppercase">
                                                        Day {dayNum}
                                                    </span>
                                                    {allDone && (
                                                        <Check size={10} className="text-green-500" />
                                                    )}
                                                </button>
                                            );
                                        });
                                    })()}
                                </div>
                            )}

                            {items.length === 0 ? (
                                <div className="text-center py-10 opacity-40 border-2 border-dashed rounded-2xl">
                                    <Plane size={32} className="mx-auto mb-2" />
                                    <p className="text-xs font-bold uppercase">No plans yet.</p>
                                    <button
                                        onClick={() => {
                                            setPlanDate(trip.start_date || "");
                                            setShowAddPlanModal(true);
                                        }}
                                        className={`mt-4 mx-auto text-[10px] font-black uppercase px-4 py-2 rounded-lg border-2 flex items-center gap-1 ${darkMode ? "bg-white text-black border-white" : "bg-black text-white border-black"}`}
                                    >
                                        <Plus size={10} /> Add First Plan
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {(() => {
                                        const grouped = items.reduce((acc: any, item: any) => {
                                            const date = item.day_date;
                                            if (!acc[date]) acc[date] = [];
                                            acc[date].push(item);
                                            return acc;
                                        }, {});
                                        const sortedDates = Object.keys(grouped).sort();
                                        const targetDate =
                                            sortedDates[selectedDayIndex] || sortedDates[0];
                                        const dayItems = grouped[targetDate] || [];
                                        const dateObj = new Date(targetDate);

                                        return (
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-4">
                                                        <div>
                                                            <h4 className="text-sm font-black uppercase">
                                                                {dateObj.toLocaleDateString("en-GB", {
                                                                    weekday: "long",
                                                                })}
                                                            </h4>
                                                            <p className="text-[10px] font-bold opacity-60 uppercase">
                                                                {dateObj.toLocaleDateString("en-GB", {
                                                                    day: "numeric",
                                                                    month: "short",
                                                                    year: "numeric",
                                                                })}
                                                            </p>
                                                        </div>

                                                        {(() => {
                                                            const firstLoc = dayItems.find(
                                                                (it: any) => it.location,
                                                            )?.location;
                                                            if (firstLoc) {
                                                                const data =
                                                                    weatherData[`${firstLoc}_${targetDate}`];
                                                                if (data) {
                                                                    return (
                                                                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl border-2">
                                                                            {getWeatherIcon(data.code)}
                                                                            <span className="text-[10px] font-black uppercase text-current">
                                                                                {Math.round(data.maxTemp)}° |{" "}
                                                                                {Math.round(data.minTemp)}°
                                                                            </span>
                                                                        </div>
                                                                    );
                                                                }
                                                            }
                                                            return null;
                                                        })()}
                                                    </div>
                                                    <button
                                                        onClick={() => {
                                                            setPlanDate(targetDate);
                                                            setPlanCurrency(
                                                                trip.destination_currency || "MYR",
                                                            );
                                                            setPlanForeignAmount("");
                                                            setShowAddPlanModal(true);
                                                        }}
                                                        className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-lg border-2 flex items-center gap-1 ${darkMode ? "bg-white text-black border-white" : "bg-black text-white border-black"}`}
                                                    >
                                                        <Plus size={10} /> Add Plan
                                                    </button>
                                                </div>

                                                <div className="space-y-3">
                                                    {dayItems.map((item: any) => {
                                                        const Icon = planIconMap[item.type] || Coffee;
                                                        return (
                                                            <div
                                                                key={item.id}
                                                                className={`group relative p-4 rounded-2xl border-2 flex gap-4 items-center transition-all ${item.is_completed ? "opacity-40 grayscale-[0.5]" : ""} ${darkMode ? "bg-[#1E1E1E]" : "bg-white"} ${getBorderClass(item.color || "")}`}
                                                            >
                                                                <button
                                                                    onClick={() =>
                                                                        handleToggleComplete(
                                                                            item.id,
                                                                            item.is_completed,
                                                                        )
                                                                    }
                                                                    className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all flex-shrink-0 ${item.is_completed ? (darkMode ? "bg-green-500 border-green-500" : "bg-green-600 border-green-600") : darkMode ? "border-white/20" : "border-black/20"}`}
                                                                >
                                                                    {item.is_completed && (
                                                                        <Check size={12} className="text-white" />
                                                                    )}
                                                                </button>

                                                                <div
                                                                    className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center flex-shrink-0 ${item.color || (darkMode ? "bg-blue-600" : "bg-blue-100")} border-white text-white shadow-sm`}
                                                                >
                                                                    <Icon size={18} />
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-2 mb-0.5">
                                                                        <span className="text-[10px] font-black opacity-50 uppercase tracking-widest bg-current/5 px-1.5 py-0.5 rounded-md">
                                                                            {item.start_time ? (
                                                                                <>
                                                                                    {item.start_time?.slice(0, 5)} {parseInt(item.start_time?.slice(0, 2) || "0") >= 12 ? "PM" : "AM"}
                                                                                </>
                                                                            ) : "ALL DAY"}
                                                                        </span>
                                                                    </div>
                                                                    <h4
                                                                        className={`text-sm font-black uppercase leading-tight line-clamp-2 ${item.is_completed ? "line-through opacity-70" : ""}`}
                                                                    >
                                                                        {item.title}
                                                                    </h4>
                                                                    <div className="flex flex-col gap-1 mt-0.5">
                                                                        {item.location && (
                                                                            <a
                                                                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.location)}`}
                                                                                target="_blank"
                                                                                rel="noopener noreferrer"
                                                                                className="flex items-center gap-1 opacity-60 hover:opacity-100 transition-all group/loc"
                                                                            >
                                                                                <MapPin
                                                                                    size={10}
                                                                                    className="flex-shrink-0"
                                                                                />
                                                                                <p className="text-[10px] font-bold truncate group-hover/loc:underline">
                                                                                    {item.location}
                                                                                </p>
                                                                            </a>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-1 opacity-40 group-hover:opacity-100 transition-all">
                                                                    {item.cost > 0 && (
                                                                        <Link
                                                                            href={`/splitit?title=${encodeURIComponent(item.title)}&amount=${item.cost}`}
                                                                            className={`p-2 rounded-lg transition-all ${darkMode ? "text-indigo-400 hover:bg-indigo-500/10" : "text-indigo-600 hover:bg-indigo-50"}`}
                                                                            title="Split this bill"
                                                                        >
                                                                            <Calculator size={16} />
                                                                        </Link>
                                                                    )}
                                                                    <button
                                                                        onClick={() => handleOpenEditPlan(item)}
                                                                        className={`p-2 rounded-lg transition-all ${darkMode ? "text-white hover:bg-white/10" : "text-black hover:bg-gray-100"}`}
                                                                    >
                                                                        <Edit2 size={16} />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDeleteItem(item.id)}
                                                                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                                    >
                                                                        <X size={16} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === "budget" && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                            {(() => {
                                const itemsWithCost = items.filter(
                                    (it: any) => (parseFloat(it.cost) || 0) > 0,
                                );
                                const totalSpent = items.reduce((acc, item) => {
                                    const cost =
                                        typeof item.cost === "string"
                                            ? parseFloat(item.cost)
                                            : item.cost || 0;
                                    return acc + cost;
                                }, 0);
                                const budgetLimit = trip.budget_limit || 0;
                                const spentPercent =
                                    budgetLimit > 0
                                        ? Math.min((totalSpent / budgetLimit) * 100, 100)
                                        : 0;
                                const budgetLeft = budgetLimit - totalSpent;
                                const personalSpent = personalExpenses.reduce(
                                    (acc, e) => acc + (parseFloat(e.amount) || 0),
                                    0,
                                );

                                return (
                                    <>
                                        {/* SUB-TAB SWITCHER */}
                                        <div className="flex gap-2 p-1 bg-gray-100 dark:bg-white/5 rounded-2xl border-2 border-black/5">
                                            <button
                                                onClick={() => setBudgetSubTab("trip")}
                                                className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${budgetSubTab === "trip" ? (darkMode ? "bg-white text-black shadow-lg" : "bg-black text-white shadow-lg") : "opacity-40 hover:opacity-100"}`}
                                            >
                                                🏔️ Trip Budget
                                            </button>
                                            <button
                                                onClick={() => setBudgetSubTab("personal")}
                                                className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${budgetSubTab === "personal" ? (darkMode ? "bg-white text-black shadow-lg" : "bg-black text-white shadow-lg") : "opacity-40 hover:opacity-100"}`}
                                            >
                                                💳 Personal Pocket
                                            </button>
                                        </div>

                                        {budgetSubTab === "trip" ? (
                                            <>
                                                {/* BREAKDOWN CARD */}
                                                <div
                                                    className={`p-6 rounded-3xl border-2 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${darkMode ? "bg-indigo-900/30 border-white shadow-white/20" : "bg-indigo-50 border-black"}`}
                                                >
                                                    <p className="text-[10px] font-bold uppercase opacity-60 mb-2 tracking-widest">
                                                        Total Budget Trip
                                                    </p>
                                                    <h3 className="text-4xl font-black mb-1">
                                                        {API_TO_SYMBOL[trip?.currency] ||
                                                            trip?.currency ||
                                                            "RM"}{" "}
                                                        {budgetLimit.toLocaleString()}
                                                    </h3>
                                                    <div className="w-full bg-gray-200 h-3 rounded-full mt-4 overflow-hidden border-2 border-black/10">
                                                        <div
                                                            className={`h-full transition-all duration-1000 ${spentPercent > 90 ? "bg-red-500" : "bg-green-500"}`}
                                                            style={{ width: `${spentPercent}%` }}
                                                        ></div>
                                                    </div>
                                                    <div className="flex justify-between mt-3 text-[10px] font-black uppercase">
                                                        <div className="flex flex-col items-start">
                                                            <span className="opacity-50">Spent</span>
                                                            <span className="text-sm">
                                                                {API_TO_SYMBOL[trip?.currency] ||
                                                                    trip?.currency ||
                                                                    "RM"}{" "}
                                                                {totalSpent.toLocaleString()}
                                                            </span>
                                                            {trip?.destination_currency &&
                                                                trip?.currency !==
                                                                trip?.destination_currency && (
                                                                    <span className="text-[10px] font-bold opacity-40">
                                                                        {API_TO_SYMBOL[trip.destination_currency]}{" "}
                                                                        {(
                                                                            totalSpent * destinationRate
                                                                        ).toLocaleString(undefined, {
                                                                            maximumFractionDigits: 0,
                                                                        })}
                                                                    </span>
                                                                )}
                                                        </div>
                                                        <div className="flex flex-col items-end">
                                                            <span className="opacity-50">Balance Left</span>
                                                            <span
                                                                className={`text-sm ${budgetLeft < 0 ? "text-red-500" : "text-green-600"}`}
                                                            >
                                                                {API_TO_SYMBOL[trip?.currency] ||
                                                                    trip?.currency ||
                                                                    "RM"}{" "}
                                                                {budgetLeft.toLocaleString()}
                                                            </span>
                                                            {trip?.destination_currency &&
                                                                trip?.currency !==
                                                                trip?.destination_currency && (
                                                                    <span
                                                                        className={`text-[10px] font-bold opacity-40 ${budgetLeft < 0 ? "text-red-400" : "text-green-500"}`}
                                                                    >
                                                                        {API_TO_SYMBOL[trip.destination_currency]}{" "}
                                                                        {(
                                                                            budgetLeft * destinationRate
                                                                        ).toLocaleString(undefined, {
                                                                            maximumFractionDigits: 0,
                                                                        })}
                                                                    </span>
                                                                )}
                                                        </div>
                                                    </div>

                                                    <button
                                                        onClick={() => setShowPushToSplitItModal(true)}
                                                        className={`w-full mt-6 py-3 rounded-xl border-2 font-black uppercase text-[10px] flex items-center justify-center gap-2 transition-all ${darkMode ? "bg-white text-black border-white hover:bg-gray-200" : "bg-black text-white border-black hover:opacity-90"}`}
                                                    >
                                                        <Share2 size={14} /> Push All to SplitIt
                                                    </button>
                                                </div>

                                                {/* EXPENSE LIST */}
                                                <div className="space-y-4">
                                                    <div className="flex items-center justify-between px-1">
                                                        <h4 className="text-[10px] font-black uppercase opacity-60 tracking-widest">
                                                            Category Breakdown
                                                        </h4>
                                                    </div>
                                                    <div className="grid grid-cols-1 gap-3">
                                                        {(() => {
                                                            const catTotals = items.reduce(
                                                                (acc: any, it: any) => {
                                                                    const cost =
                                                                        typeof it.cost === "string"
                                                                            ? parseFloat(it.cost)
                                                                            : it.cost || 0;
                                                                    if (cost <= 0) return acc;
                                                                    const type = it.type || "activity";
                                                                    acc[type] = (acc[type] || 0) + cost;
                                                                    return acc;
                                                                },
                                                                {},
                                                            );

                                                            const sortedCats = Object.entries(catTotals).sort(
                                                                (a: any, b: any) => b[1] - a[1],
                                                            );

                                                            if (sortedCats.length === 0)
                                                                return (
                                                                    <div className="text-center py-6 opacity-30 border-2 border-dashed rounded-2xl">
                                                                        <p className="text-[10px] font-black uppercase tracking-widest">
                                                                            No Group Expenses
                                                                        </p>
                                                                    </div>
                                                                );

                                                            return sortedCats.map(([type, total]: any) => {
                                                                const Icon = planIconMap[type] || Coffee;
                                                                const percentage = (total / totalSpent) * 100;
                                                                return (
                                                                    <div
                                                                        key={type}
                                                                        className={`p-4 rounded-2xl border-2 ${darkMode ? "bg-[#1E1E1E] border-white/20" : "bg-white border-black/5"}`}
                                                                    >
                                                                        <div className="flex items-center justify-between mb-2">
                                                                            <div className="flex items-center gap-2">
                                                                                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                                                                                    <Icon size={16} />
                                                                                </div>
                                                                                <span className="text-[11px] font-black uppercase tracking-tight">
                                                                                    {type}
                                                                                </span>
                                                                            </div>
                                                                            <span className="text-xs font-black">
                                                                                {API_TO_SYMBOL[trip?.currency] ||
                                                                                    trip?.currency ||
                                                                                    "RM"}{" "}
                                                                                {total.toLocaleString()}
                                                                            </span>
                                                                        </div>
                                                                        <div className="w-full bg-gray-100 dark:bg-white/5 h-1.5 rounded-full overflow-hidden">
                                                                            <div
                                                                                className="bg-indigo-500 h-full transition-all duration-1000"
                                                                                style={{ width: `${percentage}%` }}
                                                                            ></div>
                                                                        </div>
                                                                        <p className="text-[9px] font-bold opacity-40 uppercase mt-1">
                                                                            {percentage.toFixed(0)}% of total spent
                                                                        </p>
                                                                    </div>
                                                                );
                                                            });
                                                        })()}
                                                    </div>
                                                </div>

                                                {/* DETAILED LOG */}
                                                <div className="space-y-3">
                                                    <h4 className="text-[10px] font-black uppercase opacity-60 tracking-widest px-1">
                                                        Detailed Expense Log
                                                    </h4>
                                                    {itemsWithCost.length === 0 ? (
                                                        <div className="text-center py-8 opacity-40 border-2 border-dashed rounded-2xl">
                                                            <Wallet size={24} className="mx-auto mb-2" />
                                                            <p className="text-[10px] font-bold uppercase">
                                                                No expenses recorded yet.
                                                            </p>
                                                        </div>
                                                    ) : (
                                                        itemsWithCost.map((item: any) => (
                                                            <div
                                                                key={item.id}
                                                                className={`p-4 rounded-2xl border-2 flex items-center justify-between transition-all ${darkMode ? "bg-[#1E1E1E] border-white" : "bg-white border-black"}`}
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <div
                                                                        className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center flex-shrink-0 ${item.color || "bg-blue-600"} border-white text-white shadow-sm`}
                                                                    >
                                                                        {(() => {
                                                                            const Icon =
                                                                                planIconMap[item.type] || Coffee;
                                                                            return <Icon size={14} />;
                                                                        })()}
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-[11px] font-black uppercase leading-none">
                                                                            {item.title}
                                                                        </p>
                                                                        <p className="text-[9px] font-bold opacity-50 uppercase mt-1">
                                                                            {new Date(
                                                                                item.day_date,
                                                                            ).toLocaleDateString("en-GB", {
                                                                                day: "numeric",
                                                                                month: "short",
                                                                            })}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-4">
                                                                    <div className="text-right">
                                                                        <p className="text-sm font-black">
                                                                            {API_TO_SYMBOL[trip?.currency] ||
                                                                                trip?.currency ||
                                                                                "RM"}{" "}
                                                                            {parseFloat(item.cost).toLocaleString()}
                                                                        </p>
                                                                        {item.original_currency &&
                                                                            item.original_currency !==
                                                                            trip?.currency && (
                                                                                <p className="text-[9px] font-bold opacity-40 uppercase">
                                                                                    (
                                                                                    {API_TO_SYMBOL[
                                                                                        item.original_currency
                                                                                    ] || item.original_currency}{" "}
                                                                                    {item.original_amount?.toLocaleString()}
                                                                                    )
                                                                                </p>
                                                                            )}
                                                                        <Link
                                                                            href={`/splitit?title=${encodeURIComponent(item.title)}&amount=${item.cost}`}
                                                                            className="text-[9px] font-black uppercase text-indigo-500 hover:underline flex items-center gap-1 mt-1"
                                                                        >
                                                                            <Calculator size={10} /> Split Bill
                                                                        </Link>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            </>
                                        ) : (
                                            <div className="space-y-6 animate-in slide-in-from-right-4">
                                                {/* PERSONAL BUDGET SUMMARY */}
                                                <div
                                                    className={`p-6 rounded-3xl border-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${darkMode ? "bg-emerald-900/30 border-white shadow-white/20" : "bg-emerald-50 border-black"}`}
                                                >
                                                    <div className="flex items-center gap-3 mb-4">
                                                        <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow-lg">
                                                            <Wallet size={20} />
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] font-black uppercase opacity-60 leading-none mb-1">
                                                                Total Personal Spending
                                                            </p>
                                                            <h3 className="text-2xl font-black">
                                                                {API_TO_SYMBOL[trip?.currency] ||
                                                                    trip?.currency ||
                                                                    "RM"}{" "}
                                                                {personalSpent.toLocaleString()}
                                                            </h3>
                                                            {trip?.destination_currency &&
                                                                trip?.currency !==
                                                                trip?.destination_currency && (
                                                                    <p className="text-[10px] font-bold opacity-40 uppercase mt-1">
                                                                        Est.{" "}
                                                                        {API_TO_SYMBOL[trip.destination_currency]}{" "}
                                                                        {(
                                                                            personalSpent * destinationRate
                                                                        ).toLocaleString(undefined, {
                                                                            maximumFractionDigits: 0,
                                                                        })}
                                                                    </p>
                                                                )}
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => {
                                                            setPersonalCurrency(
                                                                trip.destination_currency || "MYR",
                                                            );
                                                            setPersonalForeignAmount("");
                                                            setShowAddPersonalModal(true);
                                                        }}
                                                        className={`w-full py-4 rounded-xl border-2 font-black uppercase text-xs flex items-center justify-center gap-2 transition-all ${darkMode ? "bg-white text-black border-white hover:bg-gray-200" : "bg-black text-white border-black hover:opacity-90"}`}
                                                    >
                                                        <Plus size={16} /> Add Personal Expense
                                                    </button>
                                                </div>

                                                {/* PERSONAL LOG */}
                                                <div className="space-y-3">
                                                    <div className="flex items-center justify-between px-1">
                                                        <h4 className="text-[10px] font-black uppercase opacity-60 tracking-widest">
                                                            Personal Transactions
                                                        </h4>
                                                        <span className="text-[9px] font-bold opacity-40 uppercase">
                                                            {personalExpenses.length} Items
                                                        </span>
                                                    </div>

                                                    {personalExpenses.length === 0 ? (
                                                        <div className="text-center py-12 px-6 border-2 border-dashed rounded-3xl opacity-40">
                                                            <ShoppingBag
                                                                size={32}
                                                                className="mx-auto mb-3 opacity-20"
                                                            />
                                                            <p className="text-[10px] font-black uppercase tracking-widest text-center">
                                                                No personal shopping yet.
                                                                <br />
                                                                Time to splurge?
                                                            </p>
                                                        </div>
                                                    ) : (
                                                        personalExpenses.map((exp: any) => (
                                                            <div
                                                                key={exp.id}
                                                                className={`p-4 rounded-2xl border-2 flex items-center justify-between ${darkMode ? "bg-[#1E1E1E] border-white/20" : "bg-white border-black/5"}`}
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                                                                        {exp.category === "food" ? (
                                                                            <Utensils size={18} />
                                                                        ) : exp.category === "transport" ? (
                                                                            <Car size={18} />
                                                                        ) : (
                                                                            <ShoppingBag size={18} />
                                                                        )}
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-xs font-black uppercase leading-none">
                                                                            {exp.title}
                                                                        </p>
                                                                        <p className="text-[9px] font-bold opacity-40 uppercase mt-1">
                                                                            {new Date(
                                                                                exp.created_at,
                                                                            ).toLocaleDateString("en-GB", {
                                                                                day: "numeric",
                                                                                month: "short",
                                                                            })}{" "}
                                                                            • {exp.category}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-3">
                                                                    <div className="text-right">
                                                                        <p className="text-sm font-black whitespace-nowrap">
                                                                            {API_TO_SYMBOL[trip?.currency] ||
                                                                                trip?.currency ||
                                                                                "RM"}{" "}
                                                                            {parseFloat(exp.amount).toLocaleString()}
                                                                        </p>
                                                                        {exp.original_currency &&
                                                                            exp.original_currency !==
                                                                            trip?.currency && (
                                                                                <p className="text-[8px] font-bold opacity-40 uppercase">
                                                                                    (
                                                                                    {API_TO_SYMBOL[
                                                                                        exp.original_currency
                                                                                    ] || exp.original_currency}{" "}
                                                                                    {exp.original_amount?.toLocaleString()}
                                                                                    )
                                                                                </p>
                                                                            )}
                                                                    </div>
                                                                    <button
                                                                        onClick={() => handleDeletePersonal(exp.id)}
                                                                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                                    >
                                                                        <X size={14} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </>
                                );
                            })()}
                        </div>
                    )}

                    {activeTab === "people" && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                            <div className="grid grid-cols-1 gap-3">
                                {members.map((member) => (
                                    <div
                                        key={member.id}
                                        className={`group p-4 rounded-3xl border-2 flex items-center justify-between transition-all hover:scale-[1.02] ${darkMode ? "bg-[#1E1E1E] border-white/20" : "bg-white border-black/5"}`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div
                                                className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black uppercase shadow-sm border-2 ${member.role === "owner" ? "bg-amber-100 border-amber-500 text-amber-700" : "bg-indigo-50 border-indigo-200 text-indigo-600"}`}
                                            >
                                                {member.name?.[0] || "M"}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-black uppercase tracking-tight">
                                                        {member.name}
                                                    </p>
                                                    {member.role === "owner" && (
                                                        <span className="px-1.5 py-0.5 rounded-md bg-amber-500 text-[8px] font-black text-white uppercase">
                                                            Leader
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[10px] font-bold uppercase opacity-40 leading-none mt-1">
                                                    {member.auth_id ? "Linked User" : "Manual Guest"} •{" "}
                                                    {member.role}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                            <span className="text-[9px] font-black uppercase opacity-60">
                                                Online
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {user?.id === trip?.owner_id && (
                                <button
                                    onClick={() => setShowManageTravelersModal(true)}
                                    className={`w-full py-5 rounded-3xl border-2 border-dashed flex items-center justify-center gap-3 font-black uppercase text-[10px] tracking-widest transition-all hover:border-solid hover:bg-black/5 ${darkMode ? "border-white/40 text-white/60 hover:text-white" : "border-black/20 text-black/40 hover:text-black hover:border-black"}`}
                                >
                                    <Users size={16} /> Manage Travelers
                                </button>
                            )}
                        </div>
                    )}

                    {activeTab === "vault" && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                            <div className="grid grid-cols-1 gap-3">
                                {documents.length === 0 ? (
                                    <div className="text-center py-12 opacity-40">
                                        <Lock size={48} className="mx-auto mb-4 opacity-20" />
                                        <p className="font-black uppercase text-xs">
                                            Your Digital Vault is empty.
                                        </p>
                                        <p className="text-[10px] font-bold">
                                            Store passports, boarding passes, and more.
                                        </p>
                                    </div>
                                ) : (
                                    documents
                                        .filter(
                                            (doc) => !doc.is_private || doc.user_id === user?.id,
                                        )
                                        .map((doc) => (
                                            <div
                                                key={doc.id}
                                                className={`p-4 rounded-[24px] border-2 flex items-center justify-between transition-all ${darkMode ? "bg-white/5 border-white/10" : "bg-white border-black/5"} ${doc.is_private ? "ring-2 ring-amber-500/20" : ""}`}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div
                                                        className={`w-12 h-12 rounded-2xl flex items-center justify-center relative ${darkMode ? "bg-white/10" : "bg-black/5"}`}
                                                    >
                                                        {doc.type === "passport" ? (
                                                            <ShieldCheck className="text-amber-500" />
                                                        ) : (
                                                            <FileText className="text-blue-500" />
                                                        )}
                                                        {doc.is_private && (
                                                            <div className="absolute -top-1 -right-1 bg-amber-500 text-white p-1 rounded-full border-2 border-inherit">
                                                                <Lock size={8} />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <p className="text-sm font-black uppercase tracking-tight leading-none">
                                                                {doc.title}
                                                            </p>
                                                            {doc.is_private && (
                                                                <span className="text-[8px] font-black p-1 bg-amber-500/10 text-amber-600 rounded">
                                                                    PRIVATE
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-[10px] font-bold uppercase opacity-40 mt-1">
                                                            {doc.type} •{" "}
                                                            {new Date(doc.created_at).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <a
                                                        href={doc.file_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="p-2.5 rounded-xl bg-indigo-500 text-white shadow-lg active:scale-90 transition-all"
                                                    >
                                                        <ExternalLink size={16} />
                                                    </a>
                                                    <button
                                                        onClick={() => handleDeleteDocument(doc)}
                                                        className="p-2.5 rounded-xl bg-red-500/10 text-red-500 active:scale-90 transition-all"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                )}
                            </div>

                            <button
                                onClick={() => setShowAddDocModal(true)}
                                className={`w-full py-5 rounded-[32px] border-2 border-dashed flex items-center justify-center gap-3 font-black uppercase text-[10px] tracking-widest transition-all ${darkMode ? "border-white/20 hover:border-white text-white/40 hover:text-white" : "border-black/10 hover:border-black text-black/40 hover:text-black"}`}
                            >
                                <Plus size={16} /> Add Secure Document
                            </button>
                        </div>
                    )}

                    {activeTab === "checklist" && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                            <div className="space-y-4">
                                {checklists.length === 0 ? (
                                    <div className="text-center py-12 opacity-40">
                                        <ListChecks size={48} className="mx-auto mb-4 opacity-20" />
                                        <p className="font-black uppercase text-xs">
                                            Packing list is empty.
                                        </p>
                                        <p className="text-[10px] font-bold">
                                            Plan what to bring with your team.
                                        </p>
                                    </div>
                                ) : (
                                    checklists.map((cl) => (
                                        <div
                                            key={cl.id}
                                            className={`p-5 rounded-[32px] border-2 shadow-sm ${darkMode ? "bg-white/5 border-white/10" : "bg-white border-black/5"}`}
                                        >
                                            <div className="flex justify-between items-center mb-4">
                                                <h3 className="text-sm font-black uppercase tracking-tight">
                                                    {cl.title}
                                                </h3>
                                                <button
                                                    onClick={() => handleDeleteChecklist(cl.id)}
                                                    className="opacity-30 hover:opacity-100 p-1"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>

                                            <div className="space-y-2 mb-4">
                                                {cl.trip_checklist_items?.map((item: any) => (
                                                    <div
                                                        key={item.id}
                                                        className={`group flex items-center justify-between p-2 rounded-xl border-2 transition-all ${item.is_checked ? "bg-green-500/10 border-green-500/20 opacity-60" : "border-transparent hover:bg-black/5"}`}
                                                    >
                                                        <div
                                                            onClick={() =>
                                                                handleToggleChecklistItem(
                                                                    item.id,
                                                                    item.is_checked,
                                                                    cl.id,
                                                                )
                                                            }
                                                            className="flex items-center gap-3 flex-1 cursor-pointer"
                                                        >
                                                            {item.is_checked ? (
                                                                <CheckCircle2
                                                                    size={18}
                                                                    className="text-green-500"
                                                                />
                                                            ) : (
                                                                <Circle size={18} className="opacity-20" />
                                                            )}
                                                            <span
                                                                className={`text-xs font-bold ${item.is_checked ? "line-through" : ""}`}
                                                            >
                                                                {item.item_name}
                                                            </span>
                                                        </div>
                                                        <button
                                                            onClick={async () => {
                                                                if (!confirm("Padam item ini?")) return;
                                                                try {
                                                                    const { error } = await supabase
                                                                        .from("trip_checklist_items")
                                                                        .delete()
                                                                        .eq("id", item.id);
                                                                    if (error) throw error;
                                                                    setChecklists(
                                                                        checklists.map((prevCl) =>
                                                                            prevCl.id === cl.id
                                                                                ? {
                                                                                    ...prevCl,
                                                                                    trip_checklist_items:
                                                                                        prevCl.trip_checklist_items.filter(
                                                                                            (it: any) => it.id !== item.id,
                                                                                        ),
                                                                                }
                                                                                : prevCl,
                                                                        ),
                                                                    );
                                                                } catch (e: any) {
                                                                    alert("Gagal padam item: " + e.message);
                                                                }
                                                            }}
                                                            className="opacity-20 hover:opacity-100 p-2 text-red-500 transition-all"
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    placeholder="Add item..."
                                                    className={`flex-1 bg-transparent border-b-2 border-dashed border-current/20 outline-none text-xs font-bold py-1 focus:border-indigo-500 transition-all`}
                                                    onKeyPress={(e) => {
                                                        if (e.key === "Enter") {
                                                            handleAddChecklistItem(
                                                                cl.id,
                                                                (e.target as HTMLInputElement).value,
                                                            );
                                                            (e.target as HTMLInputElement).value = "";
                                                        }
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            <button
                                onClick={() => setShowAddChecklistModal(true)}
                                className={`w-full py-5 rounded-[32px] border-2 border-dashed flex items-center justify-center gap-3 font-black uppercase text-[10px] tracking-widest transition-all ${darkMode ? "border-white/40 text-white/60 hover:text-white" : "border-black/20 text-black/40 hover:text-black hover:border-black"}`}
                            >
                                <Plus size={16} /> Create New Category
                            </button>
                        </div>
                    )}
                </main>
            </div>

            {/* --- MODAL: MANAGE TRAVELERS --- */}
            {showManageTravelersModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
                    <div
                        className={`w-full max-w-[360px] p-6 rounded-[32px] border-2 shadow-2xl animate-in zoom-in-95 ${darkMode ? "bg-[#1E1E1E] border-white text-white" : "bg-white border-black text-black"}`}
                    >
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-xl font-black uppercase tracking-tight">
                                    Travelers
                                </h2>
                                <p className="text-[10px] font-bold opacity-40 uppercase">
                                    Manage who's on this adventure
                                </p>
                            </div>
                            <button
                                onClick={() => setShowManageTravelersModal(false)}
                                className="p-2 opacity-50 hover:opacity-100 hover:bg-black/5 rounded-full transition-all"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-6">
                            {/* Add Member Input */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase opacity-60 ml-1">
                                    Add Traveler
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Full Name..."
                                        value={addMemberName}
                                        onChange={(e) => setAddMemberName(e.target.value)}
                                        onKeyPress={(e) => e.key === "Enter" && handleAddMember()}
                                        className={`flex-1 p-3 rounded-2xl border-2 font-bold outline-none text-sm transition-all ${darkMode ? "bg-black border-white/20 focus:border-white focus:bg-white/5" : "bg-gray-50 border-black/10 focus:border-black focus:bg-white"}`}
                                    />
                                    <button
                                        onClick={handleAddMember}
                                        disabled={!addMemberName.trim()}
                                        className={`p-3 rounded-2xl border-2 flex items-center justify-center transition-all disabled:opacity-30 ${darkMode ? "bg-white text-black border-white" : "bg-black text-white border-black active:scale-90"}`}
                                    >
                                        <Plus size={20} />
                                    </button>
                                </div>
                            </div>

                            {/* Members List */}
                            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scroll">
                                <label className="text-[10px] font-black uppercase opacity-60 ml-1">
                                    Current Team
                                </label>
                                {members.map((member) => (
                                    <div
                                        key={member.id}
                                        className={`p-3 rounded-2xl border-2 flex items-center justify-between ${darkMode ? "bg-white/5 border-white/10" : "bg-gray-50 border-black/5"}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div
                                                className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black uppercase ${member.role === "owner" ? "bg-amber-400 text-white" : "bg-indigo-400 text-white"}`}
                                            >
                                                {member.name?.[0] || "M"}
                                            </div>
                                            <div>
                                                <p className="text-xs font-black uppercase leading-none">
                                                    {member.name}
                                                </p>
                                                <p className="text-[9px] font-bold opacity-40 uppercase mt-0.5">
                                                    {member.role}
                                                </p>
                                            </div>
                                        </div>
                                        {member.role !== "owner" && (
                                            <button
                                                onClick={() => handleRemoveMember(member.id)}
                                                className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Share Links */}
                            <div className="pt-4 border-t-2 border-dashed border-black/10 flex gap-2">
                                <button
                                    onClick={() => {
                                        setShowManageTravelersModal(false);
                                        setShowShareModal(true);
                                    }}
                                    className={`flex-1 py-3 rounded-xl border-2 font-black uppercase text-[10px] flex items-center justify-center gap-2 transition-all ${darkMode ? "bg-indigo-600 border-white text-white" : "bg-indigo-50 border-indigo-200 text-indigo-600 hover:bg-indigo-100"}`}
                                >
                                    <Share2 size={14} /> Invite Options
                                </button>
                                <button
                                    onClick={() => setShowManageTravelersModal(false)}
                                    className={`flex-1 py-3 rounded-xl border-2 font-black uppercase text-[10px] flex items-center justify-center gap-2 transition-all ${darkMode ? "border-white/20 hover:border-white" : "border-black/10 hover:border-black"}`}
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- MODAL: SHARE --- */}
            {showShareModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
                    <div
                        className={`w-full max-w-sm p-6 rounded-3xl border-2 ${darkMode ? "bg-[#1E1E1E] border-white text-white" : "bg-white border-black text-black"} shadow-2xl animate-in zoom-in-95`}
                    >
                        <h2 className="text-xl font-black uppercase mb-4">Share Trip</h2>

                        <div className="space-y-4">
                            <div className="p-3 rounded-xl border-2 border-dashed border-current opacity-70">
                                <p className="text-[9px] font-black uppercase mb-2">
                                    View Only Link
                                </p>
                                <div className="flex items-center gap-2">
                                    <input
                                        readOnly
                                        value={`${window.location.origin}/tripit/join?token=${trip.share_token_view}`}
                                        className="flex-1 bg-transparent text-[10px] outline-none truncate"
                                    />
                                    <button
                                        onClick={() =>
                                            copyToClipboard(
                                                `${window.location.origin}/tripit/join?token=${trip.share_token_view}`,
                                                "view",
                                            )
                                        }
                                        className="p-2 rounded-lg bg-black text-white"
                                    >
                                        {copied === "view" ? (
                                            <Check size={14} />
                                        ) : (
                                            <Copy size={14} />
                                        )}
                                    </button>
                                </div>
                            </div>

                            <div className="p-3 rounded-xl border-2 border-dashed border-red-500/50 bg-red-500/5 text-red-500">
                                <p className="text-[9px] font-black uppercase mb-2">
                                    Editor Link (Expert Use)
                                </p>
                                <div className="flex items-center gap-2">
                                    <input
                                        readOnly
                                        value={`${window.location.origin}/tripit/join?token=${trip.share_token_edit}`}
                                        className="flex-1 bg-transparent text-[10px] outline-none truncate"
                                    />
                                    <button
                                        onClick={() =>
                                            copyToClipboard(
                                                `${window.location.origin}/tripit/join?token=${trip.share_token_edit}`,
                                                "edit",
                                            )
                                        }
                                        className="p-2 rounded-lg bg-red-600 text-white"
                                    >
                                        {copied === "edit" ? (
                                            <Check size={14} />
                                        ) : (
                                            <Copy size={14} />
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => setShowShareModal(false)}
                            className={`w-full mt-6 py-3 rounded-xl font-black uppercase border-2 ${darkMode ? "border-white bg-transparent" : "border-black bg-transparent"}`}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
            {/* --- MODAL: VAULT (ADD DOCUMENT) --- */}
            {showAddDocModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
                    <div
                        className={`w-full max-w-[340px] p-6 rounded-[32px] border-2 shadow-2xl animate-in zoom-in-95 ${darkMode ? "bg-[#1E1E1E] border-white text-white" : "bg-white border-black text-black"}`}
                    >
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-xl font-black uppercase tracking-tight">
                                    Add Document
                                </h2>
                                <p className="text-[10px] font-bold opacity-40 uppercase">
                                    Secure your travel files
                                </p>
                            </div>
                            <button
                                onClick={() => setShowAddDocModal(false)}
                                className="opacity-50 hover:opacity-100"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black uppercase opacity-60 ml-1 block mb-1">
                                    Document Title
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. My Passport"
                                    value={docTitle}
                                    onChange={(e) => setDocTitle(e.target.value)}
                                    className={`w-full p-3 rounded-2xl border-2 font-bold outline-none text-sm ${darkMode ? "bg-black border-white/20 focus:border-white" : "bg-gray-50 border-black/10 focus:border-black"}`}
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase opacity-60 ml-1 block mb-2">
                                    Category
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { id: "passport", label: "Passport", icon: "🛂" },
                                        { id: "visa", label: "Visa", icon: "📄" },
                                        { id: "boarding_pass", label: "Ticket", icon: "✈️" },
                                        { id: "hotel_booking", label: "Hotel", icon: "🏨" },
                                        { id: "insurance", label: "Insurance", icon: "🛡️" },
                                        { id: "other", label: "Others", icon: "📎" },
                                    ].map((cat) => (
                                        <button
                                            key={cat.id}
                                            onClick={() => setDocType(cat.id)}
                                            className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all ${docType === cat.id ? (darkMode ? "bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.2)]" : "bg-black text-white border-black shadow-lg") : darkMode ? "bg-white/5 border-white/10 opacity-60" : "bg-gray-50 border-black/5 opacity-60"}`}
                                        >
                                            <span className="text-xl mb-1">{cat.icon}</span>
                                            <span className="text-[8px] font-black uppercase text-center leading-none">
                                                {cat.label}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase opacity-60 ml-1 block mb-1">
                                    File
                                </label>
                                <label
                                    className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${docFile ? (darkMode ? "bg-green-500/10 border-green-500/50" : "bg-green-50 border-green-200") : darkMode ? "border-white/20 hover:border-white/40" : "border-black/10 hover:border-black/20"}`}
                                >
                                    {docFile ? (
                                        <>
                                            <Check className="text-green-500 mb-2" />
                                            <p className="text-[10px] font-black uppercase text-green-600 truncate max-w-full px-2">
                                                {docFile.name}
                                            </p>
                                        </>
                                    ) : (
                                        <>
                                            <Plus size={24} className="opacity-20 mb-2" />
                                            <p className="text-[10px] font-black uppercase opacity-40">
                                                Choose File / Take Photo
                                            </p>
                                        </>
                                    )}
                                    <input
                                        type="file"
                                        className="hidden"
                                        onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                                    />
                                </label>
                            </div>

                            <div className="pt-2">
                                <button
                                    onClick={() => setDocIsPrivate(!docIsPrivate)}
                                    className={`w-full p-4 rounded-2xl border-2 flex items-center justify-between transition-all ${docIsPrivate ? "border-amber-500 bg-amber-500/10" : "border-black/5 bg-black/5 opacity-60"}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div
                                            className={`p-2 rounded-xl ${docIsPrivate ? "bg-amber-500 text-white" : "bg-gray-200 text-gray-500"}`}
                                        >
                                            {docIsPrivate ? (
                                                <Lock size={16} />
                                            ) : (
                                                <Lock size={16} className="opacity-40" />
                                            )}
                                        </div>
                                        <div className="text-left">
                                            <p className="text-[10px] font-black uppercase tracking-tight">
                                                Private Document
                                            </p>
                                            <p className="text-[8px] font-bold opacity-60">
                                                Only you can see this
                                            </p>
                                        </div>
                                    </div>
                                    <div
                                        className={`w-10 h-6 rounded-full p-1 transition-all ${docIsPrivate ? "bg-amber-500" : "bg-gray-300"}`}
                                    >
                                        <div
                                            className={`h-4 w-4 bg-white rounded-full shadow-sm transition-all ${docIsPrivate ? "translate-x-4" : "translate-x-0"}`}
                                        />
                                    </div>
                                </button>
                            </div>

                            <div className="flex gap-2 pt-4">
                                <button
                                    onClick={() => setShowAddDocModal(false)}
                                    className={`flex-1 py-3 rounded-xl font-black uppercase text-[10px] border-2 ${darkMode ? "border-white/20" : "border-black/10"}`}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAddDocument}
                                    disabled={uploading || !docFile || !docTitle}
                                    className={`flex-[1.5] py-3 rounded-xl font-black uppercase text-[10px] border-2 flex items-center justify-center gap-2 ${darkMode ? "bg-white text-black border-white" : "bg-black text-white border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] active:translate-y-1 active:shadow-none transition-all"}`}
                                >
                                    {uploading ? (
                                        "Securing..."
                                    ) : (
                                        <>
                                            <Lock size={12} /> Save Securely
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- MODAL: CHECKLIST (ADD CATEGORY) --- */}
            {showAddChecklistModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
                    <div
                        className={`w-full max-w-[340px] p-6 rounded-[32px] border-2 shadow-2xl animate-in zoom-in-95 ${darkMode ? "bg-[#1E1E1E] border-white text-white" : "bg-white border-black text-black"}`}
                    >
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-xl font-black uppercase tracking-tight">
                                    New Category
                                </h2>
                                <p className="text-[10px] font-bold opacity-40 uppercase">
                                    Group your packing items
                                </p>
                            </div>
                            <button
                                onClick={() => setShowAddChecklistModal(false)}
                                className="opacity-50 hover:opacity-100"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black uppercase opacity-60 ml-1 block mb-1">
                                    Category Title
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. Toiletries, Electronics..."
                                    value={newChecklistTitle}
                                    onChange={(e) => setNewChecklistTitle(e.target.value)}
                                    className={`w-full p-3 rounded-2xl border-2 font-bold outline-none text-sm ${darkMode ? "bg-black border-white focus:border-white" : "bg-gray-50 border-black focus:border-black"}`}
                                />
                            </div>

                            <div className="flex gap-2 pt-4">
                                <button
                                    onClick={() => setShowAddChecklistModal(false)}
                                    className={`flex-1 py-3 rounded-xl font-black uppercase text-[10px] border-2 ${darkMode ? "border-white/20" : "border-black/10"}`}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAddChecklist}
                                    disabled={!newChecklistTitle.trim()}
                                    className={`flex-[1.5] py-3 rounded-xl font-black uppercase text-[10px] border-2 flex items-center justify-center gap-2 ${darkMode ? "bg-white text-black border-white" : "bg-black text-white border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]"}`}
                                >
                                    Create Category
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- MODAL: EDIT TRIP --- */}
            {showEditModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
                    <div
                        className={`w-full max-w-[340px] p-5 rounded-3xl border-2 ${darkMode ? "bg-[#1E1E1E] border-white text-white" : "bg-white border-black text-black"} shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto`}
                    >
                        <div className="flex justify-between items-center mb-3">
                            <h2 className="text-lg font-black uppercase">Edit Trip</h2>
                            <button
                                onClick={() => setShowEditModal(false)}
                                className="opacity-50 hover:opacity-100"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="text-[10px] font-bold uppercase opacity-60 block mb-1">
                                    Trip Name
                                </label>
                                <input
                                    type="text"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className={`w-full p-2.5 rounded-xl border-2 font-bold outline-none text-sm ${darkMode ? "bg-black border-white focus:bg-white/10" : "bg-gray-50 border-black focus:bg-white"}`}
                                />
                            </div>

                            <div className="grid grid-cols-1 gap-3">
                                <div>
                                    <label className="text-[10px] font-bold uppercase opacity-60 block mb-1">
                                        Start Date
                                    </label>
                                    <input
                                        type="date"
                                        value={editStartDate}
                                        onChange={(e) => setEditStartDate(e.target.value)}
                                        className={`w-full p-2.5 rounded-xl border-2 font-bold outline-none text-sm ${darkMode ? "bg-black border-white" : "bg-gray-50 border-black"}`}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold uppercase opacity-60 block mb-1">
                                        End Date
                                    </label>
                                    <input
                                        type="date"
                                        value={editEndDate}
                                        onChange={(e) => setEditEndDate(e.target.value)}
                                        className={`w-full p-2.5 rounded-xl border-2 font-bold outline-none text-sm ${darkMode ? "bg-black border-white" : "bg-gray-50 border-black"}`}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-1">
                                    <label className="text-[10px] font-bold uppercase opacity-60 block mb-1">
                                        Home Currency
                                    </label>
                                    <select
                                        value={editCurrency}
                                        onChange={(e) => setEditCurrency(e.target.value)}
                                        className={`w-full p-2.5 rounded-xl border-2 font-black outline-none text-sm ${darkMode ? "bg-black border-white" : "bg-gray-50 border-black"}`}
                                    >
                                        {Object.keys(API_TO_SYMBOL).map((curr) => (
                                            <option key={curr} value={curr}>
                                                {curr} ({API_TO_SYMBOL[curr]})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="col-span-1">
                                    <label className="text-[10px] font-bold uppercase opacity-60 block mb-1">
                                        Destination
                                    </label>
                                    <select
                                        value={editDestCurrency}
                                        onChange={(e) => setEditDestCurrency(e.target.value)}
                                        className={`w-full p-2.5 rounded-xl border-2 font-black outline-none text-sm ${darkMode ? "bg-black border-white" : "bg-gray-50 border-black"}`}
                                    >
                                        {Object.keys(API_TO_SYMBOL).map((curr) => (
                                            <option key={curr} value={curr}>
                                                {curr} ({API_TO_SYMBOL[curr]})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-bold uppercase opacity-60 block mb-1">
                                    Budget ({API_TO_SYMBOL[editCurrency] || editCurrency})
                                </label>
                                <input
                                    type="number"
                                    value={editBudget}
                                    onChange={(e) => setEditBudget(e.target.value)}
                                    className={`w-full p-2.5 rounded-xl border-2 font-bold outline-none text-sm ${darkMode ? "bg-black border-white focus:bg-white/10" : "bg-gray-50 border-black focus:bg-white"}`}
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-bold uppercase opacity-60 block mb-1">
                                    Cover Photo
                                </label>
                                <div
                                    className={`relative h-20 rounded-xl border-2 border-dashed mb-2 overflow-hidden flex items-center justify-center ${darkMode ? "border-white/20" : "border-black/10"}`}
                                >
                                    {editCoverImage ? (
                                        <img
                                            src={editCoverImage}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <p className="text-[9px] font-bold opacity-40 uppercase">
                                            No Image
                                        </p>
                                    )}
                                    {uploading && (
                                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center font-bold text-[9px] text-white animate-pulse">
                                            UPLOADING...
                                        </div>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <label
                                        className={`flex-1 cursor-pointer p-2 rounded-lg border-2 text-[9px] font-bold uppercase text-center ${darkMode ? "border-white bg-white/5" : "border-black bg-gray-50"}`}
                                    >
                                        Upload
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={onFileChange}
                                            disabled={uploading}
                                        />
                                    </label>
                                    <button
                                        onClick={() => setEditCoverImage("")}
                                        className="flex-1 p-2 rounded-lg border-2 border-red-500/30 text-red-500 text-[9px] font-bold uppercase"
                                    >
                                        Remove
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2 mt-6">
                            <button
                                onClick={() => setShowEditModal(false)}
                                className={`flex-1 py-3 rounded-xl font-black uppercase text-xs border-2 opacity-60 ${darkMode ? "border-white" : "border-black"}`}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUpdateTrip}
                                className={`flex-[1.5] py-3 rounded-xl font-black uppercase text-xs border-2 text-white ${darkMode ? "bg-blue-600 border-white" : "bg-black border-black"}`}
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- MODAL: ADD PLAN --- */}
            {showAddPlanModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
                    <div
                        className={`w-full max-w-[340px] p-5 rounded-3xl border-2 ${darkMode ? "bg-[#1E1E1E] border-white text-white" : "bg-white border-black text-black"} shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto`}
                    >
                        <div className="flex justify-between items-center mb-3">
                            <h2 className="text-lg font-black uppercase">Add New Plan</h2>
                            <button
                                onClick={() => setShowAddPlanModal(false)}
                                className="opacity-50 hover:opacity-100"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase opacity-60 block">
                                    Select Type
                                </label>
                                <div
                                    className="grid grid-cols-6 gap-2 p-2 rounded-xl border-2 border-dashed border-current max-h-[82px] overflow-y-auto custom-scroll"
                                    style={{
                                        scrollbarWidth: "thin",
                                        scrollbarColor: darkMode
                                            ? "#444 transparent"
                                            : "#ccc transparent",
                                    }}
                                >
                                    <style>{`
                                        .custom-scroll::-webkit-scrollbar { width: 3px; }
                                        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
                                        .custom-scroll::-webkit-scrollbar-thumb { background: ${darkMode ? "#444" : "#ccc"}; border-radius: 10px; }
                                    `}</style>
                                    {Object.entries(planIconMap).map(([id, IconComponent]) => (
                                        <button
                                            key={id}
                                            onClick={() => setPlanType(id)}
                                            className={`aspect-square rounded-lg flex items-center justify-center transition-all ${planType === id ? (darkMode ? "bg-white text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" : "bg-black text-white shadow-[2px_2px_1px_rgba(255,255,255,0.4)]") : "opacity-40 hover:opacity-100"}`}
                                        >
                                            <IconComponent size={16} />
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase opacity-60 block">
                                    Theme Color
                                </label>
                                <div className="grid grid-cols-6 gap-2 p-2 rounded-xl border-2 border-dashed border-current max-h-[82px] overflow-y-auto custom-scroll">
                                    {planColors.map((c) => (
                                        <button
                                            key={c}
                                            onClick={() => setPlanColor(c)}
                                            className={`aspect-square rounded-lg border-2 transition-all ${c} ${planColor === c ? (darkMode ? "border-white scale-110 shadow-[0_0_10px_rgba(255,255,255,0.3)]" : "border-black scale-110") : "border-transparent opacity-40 hover:opacity-100"}`}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-bold uppercase opacity-60 block mb-1">
                                    Activity Name
                                </label>
                                <input
                                    type="text"
                                    value={planTitle}
                                    onChange={(e) => setPlanTitle(e.target.value)}
                                    placeholder="e.g. Dinner at Jimbaran"
                                    className={`w-full p-2.5 rounded-xl border-2 font-bold outline-none text-sm ${darkMode ? "bg-black border-white focus:bg-white/10" : "bg-gray-50 border-black focus:bg-white"}`}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div className="col-span-1">
                                    <label className="text-[10px] font-bold uppercase opacity-60 block mb-1">
                                        Currency
                                    </label>
                                    <select
                                        value={planCurrency}
                                        onChange={(e) => setPlanCurrency(e.target.value)}
                                        className={`w-full p-2.5 rounded-xl border-2 font-black outline-none text-sm ${darkMode ? "bg-black border-white" : "bg-gray-50 border-black"}`}
                                    >
                                        {Object.keys(API_TO_SYMBOL).map((curr) => (
                                            <option key={curr} value={curr}>
                                                {curr} ({API_TO_SYMBOL[curr]})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="col-span-1">
                                    <label className="text-[10px] font-bold uppercase opacity-60 block mb-1">
                                        Cost ({API_TO_SYMBOL[planCurrency] || planCurrency})
                                    </label>
                                    <input
                                        type="number"
                                        value={planForeignAmount}
                                        onChange={(e) => setPlanForeignAmount(e.target.value)}
                                        placeholder="0"
                                        className={`w-full p-2.5 rounded-xl border-2 font-black outline-none text-sm ${darkMode ? "bg-black border-white focus:bg-white/10" : "bg-gray-50 border-black focus:bg-white"}`}
                                    />
                                </div>
                            </div>

                            {planCurrency !== (trip?.currency || "RM") && (
                                <div
                                    className={`p-3 rounded-2xl border-2 border-dashed ${darkMode ? "bg-white/5 border-white/20" : "bg-indigo-50 bg-opacity-50 border-indigo-200"}`}
                                >
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-[9px] font-black uppercase opacity-60">
                                            Exchange Rate (1 {planCurrency} → ?)
                                        </span>
                                        <input
                                            type="number"
                                            value={planExchangeRate}
                                            onChange={(e) => setPlanExchangeRate(e.target.value)}
                                            className="w-20 bg-transparent text-right font-black text-xs outline-none"
                                        />
                                    </div>
                                    <div className="flex justify-between items-center text-indigo-500">
                                        <span className="text-[9px] font-black uppercase">
                                            Converted Total
                                        </span>
                                        <span className="text-xs font-black">
                                            {trip?.currency || "RM"} {planCost}
                                        </span>
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="text-[10px] font-bold uppercase opacity-60 block mb-1">
                                    Location
                                </label>
                                <input
                                    type="text"
                                    value={planLocation}
                                    onChange={(e) => setPlanLocation(e.target.value)}
                                    placeholder="Optional"
                                    className={`w-full p-2.5 rounded-xl border-2 font-bold outline-none text-sm ${darkMode ? "bg-black border-white focus:bg-white/10" : "bg-gray-50 border-black focus:bg-white"}`}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-bold uppercase opacity-60 block mb-1">
                                        Date
                                    </label>
                                    <input
                                        type="date"
                                        value={planDate}
                                        onChange={(e) => setPlanDate(e.target.value)}
                                        className={`w-full p-2.5 rounded-xl border-2 font-bold outline-none text-sm ${darkMode ? "bg-black border-white" : "bg-gray-50 border-black"}`}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold uppercase opacity-60 block mb-1">
                                        Time
                                    </label>
                                    <input
                                        type="time"
                                        value={planTime}
                                        onChange={(e) => setPlanTime(e.target.value)}
                                        className={`w-full p-2.5 rounded-xl border-2 font-bold outline-none text-sm ${darkMode ? "bg-black border-white" : "bg-gray-50 border-black"}`}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2 mt-6">
                            <button
                                onClick={() => setShowAddPlanModal(false)}
                                className={`flex-1 py-3 rounded-xl font-black uppercase text-xs border-2 opacity-60 ${darkMode ? "border-white" : "border-black"}`}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddPlan}
                                className={`flex-[1.5] py-3 rounded-xl font-black uppercase text-xs border-2 text-white ${darkMode ? "bg-blue-600 border-white" : "bg-black border-black"}`}
                            >
                                Add to Itinerary
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- MODAL: EDIT PLAN --- */}
            {showEditPlanModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
                    <div
                        className={`w-full max-w-[340px] p-5 rounded-3xl border-2 ${darkMode ? "bg-[#1E1E1E] border-white text-white" : "bg-white border-black text-black"} shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto`}
                    >
                        <div className="flex justify-between items-center mb-3">
                            <h2 className="text-lg font-black uppercase">Edit Plan</h2>
                            <button
                                onClick={() => setShowEditPlanModal(false)}
                                className="opacity-50 hover:opacity-100"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase opacity-60 block">
                                    Select Type
                                </label>
                                <div
                                    className="grid grid-cols-6 gap-2 p-2 rounded-xl border-2 border-dashed border-current max-h-[82px] overflow-y-auto custom-scroll"
                                    style={{
                                        scrollbarWidth: "thin",
                                        scrollbarColor: darkMode
                                            ? "#444 transparent"
                                            : "#ccc transparent",
                                    }}
                                >
                                    <style>{`
                                        .custom-scroll::-webkit-scrollbar { width: 3px; }
                                        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
                                        .custom-scroll::-webkit-scrollbar-thumb { background: ${darkMode ? "#444" : "#ccc"}; border-radius: 10px; }
                                    `}</style>
                                    {Object.entries(planIconMap).map(([id, IconComponent]) => (
                                        <button
                                            key={id}
                                            onClick={() => setEditPlanType(id)}
                                            className={`aspect-square rounded-lg flex items-center justify-center transition-all ${editPlanType === id ? (darkMode ? "bg-white text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" : "bg-black text-white shadow-[2px_2px_1px_rgba(255,255,255,0.4)]") : "opacity-40 hover:opacity-100"}`}
                                        >
                                            <IconComponent size={16} />
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase opacity-60 block">
                                    Theme Color
                                </label>
                                <div className="grid grid-cols-6 gap-2 p-2 rounded-xl border-2 border-dashed border-current max-h-[82px] overflow-y-auto custom-scroll">
                                    {planColors.map((c) => (
                                        <button
                                            key={c}
                                            onClick={() => setEditPlanColor(c)}
                                            className={`aspect-square rounded-lg border-2 transition-all ${c} ${editPlanColor === c ? (darkMode ? "border-white scale-110 shadow-[0_0_10px_rgba(255,255,255,0.3)]" : "border-black scale-110") : "border-transparent opacity-40 hover:opacity-100"}`}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-bold uppercase opacity-60 block mb-1">
                                    Activity Name
                                </label>
                                <input
                                    type="text"
                                    value={editPlanTitle}
                                    onChange={(e) => setEditPlanTitle(e.target.value)}
                                    className={`w-full p-2.5 rounded-xl border-2 font-bold outline-none text-sm ${darkMode ? "bg-black border-white focus:bg-white/10" : "bg-gray-50 border-black focus:bg-white"}`}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div className="col-span-1">
                                    <label className="text-[10px] font-bold uppercase opacity-60 block mb-1">
                                        Currency
                                    </label>
                                    <select
                                        value={editPlanCurrency}
                                        onChange={(e) => setEditPlanCurrency(e.target.value)}
                                        className={`w-full p-2.5 rounded-xl border-2 font-black outline-none text-sm ${darkMode ? "bg-black border-white" : "bg-gray-50 border-black"}`}
                                    >
                                        {Object.keys(API_TO_SYMBOL).map((curr) => (
                                            <option key={curr} value={curr}>
                                                {curr} ({API_TO_SYMBOL[curr]})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="col-span-1">
                                    <label className="text-[10px] font-bold uppercase opacity-60 block mb-1">
                                        Cost ({API_TO_SYMBOL[editPlanCurrency] || editPlanCurrency})
                                    </label>
                                    <input
                                        type="number"
                                        value={editPlanForeignAmount}
                                        onChange={(e) => setEditPlanForeignAmount(e.target.value)}
                                        className={`w-full p-2.5 rounded-xl border-2 font-black outline-none text-sm ${darkMode ? "bg-black border-white focus:bg-white/10" : "bg-gray-50 border-black focus:bg-white"}`}
                                    />
                                </div>
                            </div>

                            {editPlanCurrency !== (trip?.currency || "RM") && (
                                <div
                                    className={`p-3 rounded-2xl border-2 border-dashed ${darkMode ? "bg-white/5 border-white/20" : "bg-indigo-50 bg-opacity-50 border-indigo-200"}`}
                                >
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-[9px] font-black uppercase opacity-60">
                                            Exchange Rate (1 {editPlanCurrency} → ?)
                                        </span>
                                        <input
                                            type="number"
                                            value={editPlanExchangeRate}
                                            onChange={(e) => setEditPlanExchangeRate(e.target.value)}
                                            className="w-20 bg-transparent text-right font-black text-xs outline-none"
                                        />
                                    </div>
                                    <div className="flex justify-between items-center text-indigo-500">
                                        <span className="text-[9px] font-black uppercase">
                                            Converted Total
                                        </span>
                                        <span className="text-xs font-black">
                                            {trip?.currency || "RM"} {editPlanCost}
                                        </span>
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="text-[10px] font-bold uppercase opacity-60 block mb-1">
                                    Location
                                </label>
                                <input
                                    type="text"
                                    value={editPlanLocation}
                                    onChange={(e) => setEditPlanLocation(e.target.value)}
                                    className={`w-full p-2.5 rounded-xl border-2 font-bold outline-none text-sm ${darkMode ? "bg-black border-white focus:bg-white/10" : "bg-gray-50 border-black focus:bg-white"}`}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-bold uppercase opacity-60 block mb-1">
                                        Date
                                    </label>
                                    <input
                                        type="date"
                                        value={editPlanDate}
                                        onChange={(e) => setEditPlanDate(e.target.value)}
                                        className={`w-full p-2.5 rounded-xl border-2 font-bold outline-none text-sm ${darkMode ? "bg-black border-white" : "bg-gray-50 border-black"}`}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold uppercase opacity-60 block mb-1">
                                        Time
                                    </label>
                                    <input
                                        type="time"
                                        value={editPlanTime}
                                        onChange={(e) => setEditPlanTime(e.target.value)}
                                        className={`w-full p-2.5 rounded-xl border-2 font-bold outline-none text-sm ${darkMode ? "bg-black border-white" : "bg-gray-50 border-black"}`}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2 mt-6">
                            <button
                                onClick={() => setShowEditPlanModal(false)}
                                className={`flex-1 py-3 rounded-xl font-black uppercase text-xs border-2 opacity-60 ${darkMode ? "border-white" : "border-black"}`}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUpdatePlan}
                                className={`flex-[1.5] py-3 rounded-xl font-black uppercase text-xs border-2 text-white ${darkMode ? "bg-blue-600 border-white" : "bg-black border-black"}`}
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- MODAL: IMAGE CROPPER --- */}
            {imageToCrop && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
                    <div
                        className={`w-full max-w-[340px] rounded-3xl border-2 overflow-hidden shadow-2xl animate-in zoom-in-95 ${darkMode ? "bg-[#1E1E1E] border-white text-white" : "bg-white border-black text-black"}`}
                    >
                        <div className="p-4 border-b-2 border-dashed border-current flex justify-between items-center">
                            <h3 className="font-black uppercase text-sm flex items-center gap-2">
                                <Maximize size={16} /> Adjust Cover
                            </h3>
                            <button
                                onClick={() => setImageToCrop(null)}
                                className="opacity-50 hover:opacity-100"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="relative h-48 bg-black">
                            <Cropper
                                image={imageToCrop}
                                crop={crop}
                                zoom={zoom}
                                aspect={16 / 9}
                                onCropChange={setCrop}
                                onCropComplete={(croppedArea, croppedAreaPixels) =>
                                    setCroppedAreaPixels(croppedAreaPixels)
                                }
                                onZoomChange={setZoom}
                            />
                        </div>

                        <div className="p-4 space-y-4">
                            <div className="flex items-center gap-3">
                                <ZoomOut size={16} className="opacity-40" />
                                <input
                                    type="range"
                                    value={zoom}
                                    min={1}
                                    max={3}
                                    step={0.1}
                                    aria-labelledby="Zoom"
                                    onChange={(e) => setZoom(Number(e.target.value))}
                                    className="flex-1 accent-current h-1.5 rounded-lg appearance-none bg-gray-300/30"
                                />
                                <ZoomIn size={16} className="opacity-40" />
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => setImageToCrop(null)}
                                    className={`flex-1 py-3 rounded-xl font-black uppercase text-xs border-2 ${darkMode ? "border-white" : "border-black"}`}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleConfirmCrop}
                                    className={`flex-[1.5] py-3 rounded-xl font-black uppercase text-xs border-2 ${darkMode ? "bg-white text-black border-white" : "bg-black text-white border-black"} active:scale-95 transition-all`}
                                >
                                    {uploading ? "Applying..." : "Set Photo"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* --- MODAL: PUSH TO SPLITIT --- */}
            {showPushToSplitItModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
                    <div
                        className={`w-full max-w-[340px] p-6 rounded-3xl border-2 ${darkMode ? "bg-[#1E1E1E] border-white text-white" : "bg-white border-black text-black"} shadow-2xl animate-in zoom-in-95`}
                    >
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-indigo-500 rounded-2xl mx-auto flex items-center justify-center text-white mb-4 rotate-3 shadow-lg">
                                <Calculator size={32} />
                            </div>
                            <h2 className="text-xl font-black uppercase leading-tight">
                                Sync Trip to <span className="text-indigo-500">SplitIt</span>
                            </h2>
                            <p className="text-[10px] font-bold opacity-60 uppercase mt-2">
                                Create a dedicated group bill for this adventure
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div
                                className={`p-4 rounded-2xl border-2 ${darkMode ? "bg-white/5 border-white/10" : "bg-gray-50 border-black/5"}`}
                            >
                                <p className="text-[9px] font-black uppercase opacity-40 mb-2">
                                    What's going to happen:
                                </p>
                                <ul className="space-y-2">
                                    <li className="flex items-center gap-2 text-[10px] font-bold uppercase">
                                        <Check size={12} className="text-green-500" /> Create
                                        Session: <span className="ml-auto">{trip.name}</span>
                                    </li>
                                    <li className="flex items-center gap-2 text-[10px] font-bold uppercase">
                                        <Check size={12} className="text-green-500" /> Add Members:{" "}
                                        <span className="ml-auto">{members.length} People</span>
                                    </li>
                                    <li className="flex items-center gap-2 text-[10px] font-bold uppercase">
                                        <Check size={12} className="text-green-500" /> Push
                                        Expenses:{" "}
                                        <span className="ml-auto">
                                            {
                                                items.filter(
                                                    (it: any) => (parseFloat(it.cost) || 0) > 0,
                                                ).length
                                            }{" "}
                                            Items
                                        </span>
                                    </li>
                                </ul>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2 mt-6">
                            <button
                                onClick={handlePushToSplitIt}
                                className={`w-full py-4 rounded-xl font-black uppercase text-xs border-2 text-white shadow-[4px_4px_0px_0px_rgba(79,70,229,0.3)] ${darkMode ? "bg-indigo-600 border-white" : "bg-black border-black"}`}
                            >
                                Confirm & Open SplitIt
                            </button>
                            <button
                                onClick={() => setShowPushToSplitItModal(false)}
                                className={`w-full py-3 rounded-xl font-bold uppercase text-[10px] opacity-40 hover:opacity-100 ${darkMode ? "text-white" : "text-black"}`}
                            >
                                Not now
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- MODAL: ADD PERSONAL EXPENSE --- */}
            {showAddPersonalModal && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
                    <div
                        className={`w-full max-w-[400px] p-8 rounded-t-3xl sm:rounded-3xl border-x-2 border-t-2 sm:border-2 ${darkMode ? "bg-[#1E1E1E] border-white text-white" : "bg-white border-black text-black"} shadow-[0_-10px_40px_rgba(0,0,0,0.5)] animate-in slide-in-from-bottom-20`}
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-black uppercase">
                                Add Personal spending
                            </h2>
                            <button
                                onClick={() => setShowAddPersonalModal(false)}
                                className="p-2 opacity-40 hover:opacity-100 transition-all"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase opacity-60 ml-1">
                                    Title
                                </label>
                                <input
                                    placeholder="CTH: SOUVENIR UNTUK MAK"
                                    value={personalTitle}
                                    onChange={(e) => setPersonalTitle(e.target.value)}
                                    className={`w-full p-4 rounded-xl border-2 font-black uppercase outline-none transition-all ${darkMode ? "bg-white/5 border-white focus:bg-white/10" : "bg-gray-50 border-black focus:bg-white"}`}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-1">
                                    <label className="text-[10px] font-black uppercase opacity-60 ml-1">
                                        Currency
                                    </label>
                                    <select
                                        value={personalCurrency}
                                        onChange={(e) => setPersonalCurrency(e.target.value)}
                                        className={`w-full p-4 rounded-xl border-2 font-black uppercase outline-none transition-all ${darkMode ? "bg-white/5 border-white" : "bg-gray-50 border-black"}`}
                                    >
                                        {Object.keys(API_TO_SYMBOL).map((curr) => (
                                            <option key={curr} value={curr}>
                                                {curr} ({API_TO_SYMBOL[curr]})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="col-span-1">
                                    <label className="text-[10px] font-black uppercase opacity-60 ml-1">
                                        Amount (
                                        {API_TO_SYMBOL[personalCurrency] || personalCurrency})
                                    </label>
                                    <input
                                        type="number"
                                        placeholder="0.00"
                                        value={personalForeignAmount}
                                        onChange={(e) => setPersonalForeignAmount(e.target.value)}
                                        className={`w-full p-4 rounded-xl border-2 font-black uppercase outline-none transition-all ${darkMode ? "bg-white/5 border-white focus:bg-white/10" : "bg-gray-50 border-black focus:bg-white"}`}
                                    />
                                </div>
                            </div>

                            {personalCurrency !== (trip?.currency || "RM") && (
                                <div
                                    className={`p-4 rounded-2xl border-2 border-dashed ${darkMode ? "bg-white/5 border-white/20" : "bg-emerald-50 bg-opacity-50 border-emerald-200"}`}
                                >
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-[10px] font-black uppercase opacity-60">
                                            Exchange Rate (1 {personalCurrency} → ?)
                                        </span>
                                        <input
                                            type="number"
                                            value={personalExchangeRate}
                                            onChange={(e) => setPersonalExchangeRate(e.target.value)}
                                            className="w-24 bg-transparent text-right font-black text-sm outline-none"
                                        />
                                    </div>
                                    <div className="flex justify-between items-center text-emerald-600">
                                        <span className="text-[10px] font-black uppercase">
                                            Converted Total
                                        </span>
                                        <span className="text-sm font-black">
                                            {trip?.currency || "RM"} {personalAmount}
                                        </span>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase opacity-60 ml-1">
                                    Category
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    {["shopping", "food", "transport"].map((cat) => (
                                        <button
                                            key={cat}
                                            onClick={() => setPersonalCategory(cat)}
                                            className={`py-3 rounded-xl border-2 font-black uppercase text-[10px] transition-all ${personalCategory === cat ? (darkMode ? "bg-white text-black border-white" : "bg-black text-white border-black") : "opacity-40 hover:opacity-100 border-current"}`}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button
                                onClick={handleAddPersonalExpense}
                                className={`w-full py-4 mt-4 rounded-xl font-black uppercase text-xs border-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)] transition-all active:translate-x-1 active:translate-y-1 active:shadow-none ${darkMode ? "bg-emerald-500 text-white border-white" : "bg-black text-white border-black"}`}
                            >
                                Save Personal Spending
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
