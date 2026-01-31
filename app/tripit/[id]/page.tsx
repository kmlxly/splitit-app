"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
    Grid, Moon, Sun, ArrowLeft, Map, Calendar, Wallet, Users,
    Plus, MoreHorizontal, ChevronRight, Plane, Hotel, Coffee, Share2, Copy, Check,
    Edit2, Maximize, ZoomIn, ZoomOut, X, Utensils, Car, Train, Bus, Camera, Ticket,
    ShoppingBag, Music, Waves, Landmark, MapPin, Beer, Bike, Ship
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import Cropper from 'react-easy-crop';

// Helper to create an image from a URL
const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
        const image = new Image();
        image.addEventListener('load', () => resolve(image));
        image.addEventListener('error', (error) => reject(error));
        image.setAttribute('crossOrigin', 'anonymous');
        image.src = url;
    });

// Helper to get the cropped image as a Blob
async function getCroppedImg(imageSrc: string, pixelCrop: any) {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
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
        pixelCrop.height
    );

    return new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (!blob) {
                reject(new Error('Canvas is empty'));
                return;
            }
            resolve(blob);
        }, 'image/jpeg');
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

export default function TripDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = React.use(params);
    // --- STATE ---
    const [darkMode, setDarkMode] = useState(false);
    const [activeTab, setActiveTab] = useState<"itinerary" | "budget" | "people">("itinerary");
    const [loading, setLoading] = useState(true);
    const [trip, setTrip] = useState<any>(null);
    const [items, setItems] = useState<any[]>([]);
    const [members, setMembers] = useState<any[]>([]);
    const [showShareModal, setShowShareModal] = useState(false);
    const [copied, setCopied] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);

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

    // Add Plan State
    const [showAddPlanModal, setShowAddPlanModal] = useState(false);
    const [planTitle, setPlanTitle] = useState("");
    const [planType, setPlanType] = useState("activity");
    const [planLocation, setPlanLocation] = useState("");
    const [planTime, setPlanTime] = useState("");
    const [planDate, setPlanDate] = useState("");

    // --- EFFECT: LOAD DATA ---
    useEffect(() => {
        const checkSessionAndFetch = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                fetchTripData();
            } else {
                // If no session, wait a bit or try to fetch regardless (RLS will handle)
                // Often better to just fetch and let Supabase return empty if no access
                fetchTripData();
            }
        };
        checkSessionAndFetch();
    }, [id]);

    const fetchTripData = async () => {
        console.log("Fetching trip with ID:", id);
        setLoading(true);
        try {
            // 1. Fetch Trip Info
            const { data: tripData, error: tripError } = await supabase
                .from('trips')
                .select('*')
                .eq('id', id)
                .single();

            if (tripError) {
                console.error("Trip fetch error:", {
                    message: tripError.message,
                    code: tripError.code,
                    details: tripError.details,
                    hint: tripError.hint
                });
                setTrip(null);
                return;
            }
            setTrip(tripData);

            // 2. Fetch Itinerary & Members
            const [itemsRes, membersRes] = await Promise.all([
                supabase.from('trip_items').select('*').eq('trip_id', id).order('day_date', { ascending: true }),
                supabase.from('trip_members').select('*').eq('trip_id', id)
            ]);

            setItems(itemsRes.data || []);
            setMembers(membersRes.data || []);

        } catch (e) {
            console.error("Unexpected error loading trip:", e);
            setTrip(null);
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
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return alert("Sila log masuk semula.");

            const fileName = `trip-${Date.now()}.jpg`;
            const filePath = `${user.id}/${fileName}`;

            console.log("Mencuba muat naik ke:", filePath);

            const { error: uploadError } = await supabase.storage
                .from('trips')
                .upload(filePath, fileOrBlob, {
                    contentType: 'image/jpeg',
                    upsert: true
                });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('trips')
                .getPublicUrl(filePath);

            // Update Trip Cover URL in DB
            const { error: updateError } = await supabase
                .from('trips')
                .update({ cover_image: publicUrl })
                .eq('id', id);

            if (updateError) throw updateError;

            setTrip({ ...trip, cover_image: publicUrl });
            setEditCoverImage(publicUrl); // Sync if edit modal is open

        } catch (error: any) {
            console.error("Ralat muat naik:", error);
            alert('Gagal muat naik: ' + (error.message || "Sila pastikan bucket 'trips' wujud."));
        } finally {
            setUploading(false);
            setImageToCrop(null);
        }
    };

    const handleConfirmCrop = async () => {
        if (!imageToCrop || !croppedAreaPixels) return;
        try {
            const croppedImageBlob = await getCroppedImg(imageToCrop, croppedAreaPixels);
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
            reader.addEventListener('load', () => {
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
        setEditBudget(trip.budget_limit?.toString() || "");
        setEditCoverImage(trip.cover_image || "");
        setShowEditModal(true);
    };

    const handleUpdateTrip = async () => {
        try {
            const { error } = await supabase
                .from('trips')
                .update({
                    name: editName,
                    start_date: editStartDate,
                    end_date: editEndDate || null,
                    budget_limit: parseFloat(editBudget) || 0,
                    cover_image: editCoverImage
                })
                .eq('id', id);

            if (error) throw error;

            setTrip({
                ...trip,
                name: editName,
                start_date: editStartDate,
                end_date: editEndDate,
                budget_limit: parseFloat(editBudget),
                cover_image: editCoverImage
            });
            setShowEditModal(false);
        } catch (e: any) {
            alert("Gagal update trip: " + e.message);
        }
    };

    const handleAddPlan = async () => {
        if (!planTitle || !planDate) return alert("Sila isi Tajuk & Tarikh!");

        try {
            const { data, error } = await supabase
                .from('trip_items')
                .insert({
                    trip_id: id,
                    title: planTitle,
                    type: planType,
                    location: planLocation,
                    start_time: planTime || null,
                    day_date: planDate,
                })
                .select()
                .single();

            if (error) throw error;

            setItems([...items, data].sort((a, b) => {
                const dateA = new Date(`${a.day_date} ${a.start_time || '00:00'}`);
                const dateB = new Date(`${b.day_date} ${b.start_time || '00:00'}`);
                return dateA.getTime() - dateB.getTime();
            }));

            setShowAddPlanModal(false);
            setPlanTitle("");
            setPlanLocation("");
            setPlanTime("");
        } catch (e: any) {
            alert("Gagal tambah plan: " + e.message);
        }
    };

    const handleDeleteItem = async (itemId: string) => {
        if (!confirm("Padam plan ini?")) return;
        try {
            const { error } = await supabase.from('trip_items').delete().eq('id', itemId);
            if (error) throw error;
            setItems(items.filter(i => i.id !== itemId));
        } catch (e: any) {
            alert("Gagal padam: " + e.message);
        }
    };

    if (loading) return (
        <div className={`min-h-screen flex items-center justify-center ${darkMode ? "bg-black text-white" : "bg-gray-50 text-black"}`}>
            <p className="font-black uppercase animate-pulse">Loading Adventure...</p>
        </div>
    );

    if (!trip) return (
        <div className={`min-h-screen flex flex-col items-center justify-center p-6 text-center ${darkMode ? "bg-black text-white" : "bg-gray-50 text-black"}`}>
            <h2 className="text-2xl font-black uppercase mb-2">Trip Not Found</h2>
            <p className="text-sm opacity-60 mb-6">Mungkin link salah atau anda tiada akses.</p>
            <Link href="/tripit" className="py-3 px-6 rounded-xl bg-black text-white border-2 border-black font-bold uppercase">Back to Trips</Link>
        </div>
    );

    // --- STYLES ---
    const bgStyle = darkMode ? "bg-black text-white" : "bg-gray-50 text-black";
    const cardStyle = `${darkMode ? "bg-[#1E1E1E] border-white" : "bg-white border-black"} border-2 rounded-2xl`;
    const tabActiveStyle = darkMode ? "bg-white text-black" : "bg-black text-white";
    const tabInactiveStyle = darkMode ? "bg-white/10 text-white" : "bg-gray-200 text-black/60";

    const daysLeft = trip.start_date ? Math.ceil((new Date(trip.start_date).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / (1000 * 3600 * 24)) : 0;

    return (
        <div className={`min-h-screen font-sans transition-colors duration-300 ${bgStyle}`}>
            <div className="max-w-md mx-auto min-h-screen flex flex-col relative">

                {/* --- HEADER --- */}
                <header className={`px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-3 border-b-2 sticky top-0 z-40 transition-colors duration-300 ${darkMode ? "border-white bg-black" : "border-black bg-white"}`}>
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <Link href="/tripit" className={`p-2 rounded-xl border-2 transition-all active:scale-95 ${darkMode ? "border-white hover:bg-white hover:text-black" : "border-black hover:bg-black hover:text-white"}`}>
                                <ArrowLeft size={18} />
                            </Link>
                            <div>
                                <h1 className="text-xl font-black uppercase leading-none tracking-tighter">TripIt.</h1>
                                <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest">Travel Master</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => setShowShareModal(true)} className={`p-2 rounded-xl border-2 transition-all active:scale-95 ${darkMode ? "border-white" : "border-black"}`}>
                                <Share2 size={18} />
                            </button>
                            <button onClick={() => setDarkMode(!darkMode)} className={`p-2 rounded-xl border-2 transition-all active:scale-95 ${darkMode ? "border-white" : "border-black"}`}>
                                {darkMode ? <Sun size={18} /> : <Moon size={18} />}
                            </button>
                        </div>
                    </div>
                </header>

                {/* --- MAIN CONTENT --- */}
                <main className="flex-1 p-4 flex flex-col gap-6">

                    {/* TRIP HEADER CARD */}
                    <div className={`relative h-48 rounded-3xl border-2 overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${darkMode ? "border-white" : "border-black"}`}>
                        <img src={trip.cover_image || "https://images.unsplash.com/photo-1542051841-8d029e53f2c0?q=80&w=2970&auto=format&fit=crop"} alt="Cover" className="absolute inset-0 w-full h-full object-cover opacity-80" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-6">
                            <div className="flex items-start justify-between">
                                <div>
                                    <span className="bg-yellow-400 text-black text-[9px] font-black uppercase px-2 py-1 rounded-md border-2 border-black mb-2 inline-block">
                                        {daysLeft > 0 ? `${daysLeft} Days Left` : "Happening Now"}
                                    </span>
                                    <h2 className="text-3xl font-black text-white uppercase leading-none mb-1">{trip.name}</h2>
                                    <div className="flex items-center gap-2 text-white/80">
                                        <Calendar size={12} />
                                        <p className="text-xs font-bold">{new Date(trip.start_date).toLocaleDateString('en-GB')} - {trip.end_date ? new Date(trip.end_date).toLocaleDateString('en-GB') : "TBA"}</p>
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
                    <div className="flex p-1 rounded-xl border-2 border-dashed border-current gap-1">
                        <button
                            onClick={() => setActiveTab("itinerary")}
                            className={`flex-1 py-2 rounded-lg text-xs font-black uppercase transition-all ${activeTab === "itinerary" ? tabActiveStyle : tabInactiveStyle}`}
                        >
                            Itinerary
                        </button>
                        <button
                            onClick={() => setActiveTab("budget")}
                            className={`flex-1 py-2 rounded-lg text-xs font-black uppercase transition-all ${activeTab === "budget" ? tabActiveStyle : tabInactiveStyle}`}
                        >
                            Budget
                        </button>
                        <button
                            onClick={() => setActiveTab("people")}
                            className={`flex-1 py-2 rounded-lg text-xs font-black uppercase transition-all ${activeTab === "people" ? tabActiveStyle : tabInactiveStyle}`}
                        >
                            People
                        </button>
                    </div>

                    {/* CONTENT AREA */}
                    {activeTab === "itinerary" && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-black uppercase flex items-center gap-2 opacity-60"><Map size={14} /> Itinerary Plans</h3>
                                <button
                                    onClick={() => {
                                        setPlanDate(trip.start_date || "");
                                        setShowAddPlanModal(true);
                                    }}
                                    className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-lg border-2 flex items-center gap-1 ${darkMode ? "bg-white text-black border-white" : "bg-black text-white border-black"}`}
                                >
                                    <Plus size={10} /> Add Plan
                                </button>
                            </div>

                            {items.length === 0 ? (
                                <div className="text-center py-10 opacity-40 border-2 border-dashed rounded-2xl">
                                    <Plane size={32} className="mx-auto mb-2" />
                                    <p className="text-xs font-bold uppercase">No plans yet.</p>
                                </div>
                            ) : (
                                items.map(item => (
                                    <div key={item.id} className={`group relative p-4 rounded-2xl border-2 flex gap-4 items-center ${darkMode ? "bg-[#1E1E1E] border-white" : "bg-white border-black"}`}>
                                        <div className="flex flex-col items-center gap-1 min-w-[50px]">
                                            <span className="text-xs font-black">{item.start_time?.slice(0, 5) || "--:--"}</span>
                                            <span className="text-[9px] font-bold opacity-50 uppercase">AM</span>
                                        </div>
                                        <div className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center flex-shrink-0 ${darkMode ? "bg-blue-600 border-white text-white" : "bg-blue-100 border-black text-blue-900"}`}>
                                            {(() => {
                                                const Icon = planIconMap[item.type] || Coffee;
                                                return <Icon size={18} />;
                                            })()}
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="text-sm font-black uppercase">{item.title}</h4>
                                            <p className="text-[10px] font-bold opacity-60">{item.location}</p>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteItem(item.id)}
                                            className="opacity-0 group-hover:opacity-100 p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {activeTab === "budget" && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                            <div className={`p-6 rounded-3xl border-2 text-center ${darkMode ? "bg-indigo-900/30 border-white" : "bg-indigo-50 border-black"}`}>
                                <p className="text-[10px] font-bold uppercase opacity-60 mb-2">Total Budget Trip</p>
                                <h3 className="text-4xl font-black mb-1">RM {trip.budget_limit?.toLocaleString() || "0"}</h3>
                                <div className="w-full bg-gray-200 h-2 rounded-full mt-4 overflow-hidden border border-black/10">
                                    <div className="bg-green-500 h-full w-[0%]"></div>
                                </div>
                                <div className="flex justify-between mt-2 text-[9px] font-bold uppercase opacity-60">
                                    <span>Spent: RM 0</span>
                                    <span>Left: RM {trip.budget_limit?.toLocaleString() || "0"}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "people" && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                            {members.map(member => (
                                <div key={member.id} className={`p-4 rounded-2xl border-2 flex items-center justify-between ${darkMode ? "bg-[#1E1E1E] border-white" : "bg-white border-black"}`}>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-indigo-500 border-2 border-black flex items-center justify-center text-white font-black uppercase">
                                            {member.name?.[0] || 'M'}
                                        </div>
                                        <div>
                                            <p className="text-sm font-black uppercase">{member.name} {member.role === 'owner' && "(Leader)"}</p>
                                            <p className="text-[10px] font-bold uppercase opacity-60">{member.role}</p>
                                        </div>
                                    </div>
                                    <span className="text-green-500 font-bold text-xs">OK</span>
                                </div>
                            ))}

                            <button className={`w-full py-4 rounded-xl border-2 border-dashed flex items-center justify-center gap-2 font-bold uppercase text-xs opacity-60 hover:opacity-100 ${darkMode ? "border-white" : "border-black"}`}>
                                <Users size={16} /> Manage Travelers
                            </button>
                        </div>
                    )}

                </main>
            </div>

            {/* --- MODAL: SHARE --- */}
            {showShareModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
                    <div className={`w-full max-w-sm p-6 rounded-3xl border-2 ${darkMode ? "bg-[#1E1E1E] border-white text-white" : "bg-white border-black text-black"} shadow-2xl animate-in zoom-in-95`}>
                        <h2 className="text-xl font-black uppercase mb-4">Share Trip</h2>

                        <div className="space-y-4">
                            <div className="p-3 rounded-xl border-2 border-dashed border-current opacity-70">
                                <p className="text-[9px] font-black uppercase mb-2">View Only Link</p>
                                <div className="flex items-center gap-2">
                                    <input readOnly value={`${window.location.origin}/tripit/join?token=${trip.share_token_view}`} className="flex-1 bg-transparent text-[10px] outline-none truncate" />
                                    <button onClick={() => copyToClipboard(`${window.location.origin}/tripit/join?token=${trip.share_token_view}`, 'view')} className="p-2 rounded-lg bg-black text-white">
                                        {copied === 'view' ? <Check size={14} /> : <Copy size={14} />}
                                    </button>
                                </div>
                            </div>

                            <div className="p-3 rounded-xl border-2 border-dashed border-red-500/50 bg-red-500/5 text-red-500">
                                <p className="text-[9px] font-black uppercase mb-2">Editor Link (Expert Use)</p>
                                <div className="flex items-center gap-2">
                                    <input readOnly value={`${window.location.origin}/tripit/join?token=${trip.share_token_edit}`} className="flex-1 bg-transparent text-[10px] outline-none truncate" />
                                    <button onClick={() => copyToClipboard(`${window.location.origin}/tripit/join?token=${trip.share_token_edit}`, 'edit')} className="p-2 rounded-lg bg-red-600 text-white">
                                        {copied === 'edit' ? <Check size={14} /> : <Copy size={14} />}
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

            {/* --- MODAL: EDIT TRIP --- */}
            {showEditModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
                    <div className={`w-full max-w-[340px] p-5 rounded-3xl border-2 ${darkMode ? "bg-[#1E1E1E] border-white text-white" : "bg-white border-black text-black"} shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto`}>
                        <div className="flex justify-between items-center mb-3">
                            <h2 className="text-lg font-black uppercase">Edit Trip</h2>
                            <button onClick={() => setShowEditModal(false)} className="opacity-50 hover:opacity-100"><X size={18} /></button>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="text-[10px] font-bold uppercase opacity-60 block mb-1">Trip Name</label>
                                <input
                                    type="text"
                                    value={editName}
                                    onChange={e => setEditName(e.target.value)}
                                    className={`w-full p-2.5 rounded-xl border-2 font-bold outline-none text-sm ${darkMode ? "bg-black border-white focus:bg-white/10" : "bg-gray-50 border-black focus:bg-white"}`}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-[10px] font-bold uppercase opacity-60 block mb-1">Start Date</label>
                                    <input
                                        type="date"
                                        value={editStartDate}
                                        onChange={e => setEditStartDate(e.target.value)}
                                        className={`w-full p-2.5 rounded-xl border-2 font-bold outline-none text-sm ${darkMode ? "bg-black border-white" : "bg-gray-50 border-black"}`}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold uppercase opacity-60 block mb-1">End Date</label>
                                    <input
                                        type="date"
                                        value={editEndDate}
                                        onChange={e => setEditEndDate(e.target.value)}
                                        className={`w-full p-2.5 rounded-xl border-2 font-bold outline-none text-sm ${darkMode ? "bg-black border-white" : "bg-gray-50 border-black"}`}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-bold uppercase opacity-60 block mb-1">Budget (RM)</label>
                                <input
                                    type="number"
                                    value={editBudget}
                                    onChange={e => setEditBudget(e.target.value)}
                                    className={`w-full p-2.5 rounded-xl border-2 font-bold outline-none text-sm ${darkMode ? "bg-black border-white focus:bg-white/10" : "bg-gray-50 border-black focus:bg-white"}`}
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-bold uppercase opacity-60 block mb-1">Cover Photo</label>
                                <div className={`relative h-20 rounded-xl border-2 border-dashed mb-2 overflow-hidden flex items-center justify-center ${darkMode ? "border-white/20" : "border-black/10"}`}>
                                    {editCoverImage ? <img src={editCoverImage} className="w-full h-full object-cover" /> : <p className="text-[9px] font-bold opacity-40 uppercase">No Image</p>}
                                    {uploading && <div className="absolute inset-0 bg-black/60 flex items-center justify-center font-bold text-[9px] text-white animate-pulse">UPLOADING...</div>}
                                </div>
                                <div className="flex gap-2">
                                    <label className={`flex-1 cursor-pointer p-2 rounded-lg border-2 text-[9px] font-bold uppercase text-center ${darkMode ? "border-white bg-white/5" : "border-black bg-gray-50"}`}>
                                        Upload
                                        <input type="file" accept="image/*" className="hidden" onChange={onFileChange} disabled={uploading} />
                                    </label>
                                    <button onClick={() => setEditCoverImage("")} className="flex-1 p-2 rounded-lg border-2 border-red-500/30 text-red-500 text-[9px] font-bold uppercase">Remove</button>
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
                    <div className={`w-full max-w-[340px] p-5 rounded-3xl border-2 ${darkMode ? "bg-[#1E1E1E] border-white text-white" : "bg-white border-black text-black"} shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto`}>
                        <div className="flex justify-between items-center mb-3">
                            <h2 className="text-lg font-black uppercase">Add New Plan</h2>
                            <button onClick={() => setShowAddPlanModal(false)} className="opacity-50 hover:opacity-100"><X size={18} /></button>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase opacity-60 block">Select Type</label>
                                <div className="grid grid-cols-6 gap-2 p-2 rounded-xl border-2 border-dashed border-current max-h-[82px] overflow-y-auto custom-scroll" style={{ scrollbarWidth: 'thin', scrollbarColor: darkMode ? '#444 transparent' : '#ccc transparent' }}>
                                    <style>{`
                                        .custom-scroll::-webkit-scrollbar { width: 3px; }
                                        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
                                        .custom-scroll::-webkit-scrollbar-thumb { background: ${darkMode ? '#444' : '#ccc'}; border-radius: 10px; }
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

                            <div>
                                <label className="text-[10px] font-bold uppercase opacity-60 block mb-1">Activity Name</label>
                                <input
                                    type="text"
                                    value={planTitle}
                                    onChange={e => setPlanTitle(e.target.value)}
                                    placeholder="e.g. Dinner at Jimbaran"
                                    className={`w-full p-2.5 rounded-xl border-2 font-bold outline-none text-sm ${darkMode ? "bg-black border-white focus:bg-white/10" : "bg-gray-50 border-black focus:bg-white"}`}
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-bold uppercase opacity-60 block mb-1">Location</label>
                                <input
                                    type="text"
                                    value={planLocation}
                                    onChange={e => setPlanLocation(e.target.value)}
                                    placeholder="Optional"
                                    className={`w-full p-2.5 rounded-xl border-2 font-bold outline-none text-sm ${darkMode ? "bg-black border-white focus:bg-white/10" : "bg-gray-50 border-black focus:bg-white"}`}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-[10px] font-bold uppercase opacity-60 block mb-1">Date</label>
                                    <input
                                        type="date"
                                        value={planDate}
                                        onChange={e => setPlanDate(e.target.value)}
                                        className={`w-full p-2.5 rounded-xl border-2 font-bold outline-none text-sm ${darkMode ? "bg-black border-white" : "bg-gray-50 border-black"}`}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold uppercase opacity-60 block mb-1">Time</label>
                                    <input
                                        type="time"
                                        value={planTime}
                                        onChange={e => setPlanTime(e.target.value)}
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

            {/* --- MODAL: IMAGE CROPPER --- */}
            {imageToCrop && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
                    <div className={`w-full max-w-[340px] rounded-3xl border-2 overflow-hidden shadow-2xl animate-in zoom-in-95 ${darkMode ? "bg-[#1E1E1E] border-white text-white" : "bg-white border-black text-black"}`}>
                        <div className="p-4 border-b-2 border-dashed border-current flex justify-between items-center">
                            <h3 className="font-black uppercase text-sm flex items-center gap-2"><Maximize size={16} /> Adjust Cover</h3>
                            <button onClick={() => setImageToCrop(null)} className="opacity-50 hover:opacity-100"><X size={18} /></button>
                        </div>

                        <div className="relative h-48 bg-black">
                            <Cropper
                                image={imageToCrop}
                                crop={crop}
                                zoom={zoom}
                                aspect={16 / 9}
                                onCropChange={setCrop}
                                onCropComplete={(croppedArea, croppedAreaPixels) => setCroppedAreaPixels(croppedAreaPixels)}
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
        </div>
    );
}
