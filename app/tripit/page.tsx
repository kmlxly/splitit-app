"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
    Moon, Sun, ArrowLeft, Plus, Map, Calendar, ChevronRight, Plane, Edit2, Trash2, MoreVertical, X,
    Maximize, ZoomIn, ZoomOut
} from "lucide-react";
import { useRouter } from "next/navigation";
import Cropper from 'react-easy-crop';

import { supabase } from "@/lib/supabaseClient";
import AuthModal from "@/components/Auth";

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

export default function TripListPage() {
    const router = useRouter();
    const [darkMode, setDarkMode] = useState(false);

    // --- STATE ---
    const [trips, setTrips] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [showAuthModal, setShowAuthModal] = useState(false);

    // Create Modal State
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newTripName, setNewTripName] = useState("");
    const [newStartDate, setNewStartDate] = useState("");
    const [newEndDate, setNewEndDate] = useState("");
    const [newBudget, setNewBudget] = useState("");
    const [newCoverImage, setNewCoverImage] = useState("");
    const [uploading, setUploading] = useState(false);

    // Edit Modal State
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingTripId, setEditingTripId] = useState<string | null>(null);
    const [editName, setEditName] = useState("");
    const [editStartDate, setEditStartDate] = useState("");
    const [editEndDate, setEditEndDate] = useState("");
    const [editBudget, setEditBudget] = useState("");
    const [editCoverImage, setEditCoverImage] = useState("");

    // Cropper State
    const [imageToCrop, setImageToCrop] = useState<string | null>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
    const [cropMode, setCropMode] = useState<'create' | 'edit'>('create');

    // --- EFFECT: LOAD DATA ---
    React.useEffect(() => {
        checkUser();
    }, []);

    const uploadImage = async (fileOrBlob: File | Blob, mode: 'create' | 'edit') => {
        if (!user) return alert("Sila log masuk semula.");

        try {
            setUploading(true);
            const fileName = `trip-${Date.now()}.jpg`;
            const filePath = `${user.id}/${fileName}`;

            console.log("Mencuba muat naik ke:", filePath);

            const { data, error: uploadError } = await supabase.storage
                .from('trips')
                .upload(filePath, fileOrBlob, {
                    contentType: 'image/jpeg',
                    upsert: true
                });

            if (uploadError) {
                console.error("Ralat Supabase:", uploadError);
                throw uploadError;
            }

            const { data: { publicUrl } } = supabase.storage
                .from('trips')
                .getPublicUrl(filePath);

            if (mode === 'create') setNewCoverImage(publicUrl);
            else setEditCoverImage(publicUrl);

        } catch (error: any) {
            console.error("Ralat penuh muat naik:", error);
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
                await uploadImage(croppedImageBlob, cropMode);
            }
        } catch (e) {
            console.error(e);
            alert("Gagal memproses gambar cropping.");
        }
    };

    const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>, mode: 'create' | 'edit') => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.addEventListener('load', () => {
                setImageToCrop(reader.result as string);
                setCropMode(mode);
                setZoom(1);
                setCrop({ x: 0, y: 0 });
            });
            reader.readAsDataURL(file);
        }
    };

    const checkUser = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
            setUser(session.user);
            fetchTrips(session.user.id);
        } else {
            setLoading(false);
        }
    };

    const fetchTrips = async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('trips')
                .select('*')
                .eq('owner_id', userId)
                .order('start_date', { ascending: true });

            if (error) throw error;
            setTrips(data || []);
        } catch (e) {
            console.error("Error fetching trips:", e);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateTrip = async () => {
        if (!user) return setShowAuthModal(true);
        if (!newTripName || !newStartDate) return alert("Sila isi Nama & Tarikh Mula!");

        const defaultImages = [
            "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=2021&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=2970&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1502791451862-7bd8c1df43a7?q=80&w=2000&auto=format&fit=crop"
        ];

        const { data, error } = await supabase.from('trips').insert({
            owner_id: user.id,
            name: newTripName,
            start_date: newStartDate,
            end_date: newEndDate || null,
            budget_limit: newBudget ? parseFloat(newBudget) : 0,
            cover_image: newCoverImage || defaultImages[Math.floor(Math.random() * defaultImages.length)]
        }).select().single();

        if (error) {
            alert("Gagal create trip: " + error.message);
        } else {
            // Also add owner to trip_members
            await supabase.from('trip_members').insert({
                trip_id: data.id,
                auth_id: user.id,
                name: user.user_metadata?.full_name || user.email?.split('@')[0],
                role: 'owner'
            });

            setTrips([...trips, data]);
            setShowCreateModal(false);
            setNewTripName("");
            setNewStartDate("");
            setNewEndDate("");
            setNewBudget("");
            setNewCoverImage("");
        }
    };

    const handleEditClick = (e: React.MouseEvent, trip: any) => {
        e.preventDefault();
        e.stopPropagation();
        setEditingTripId(trip.id);
        setEditName(trip.name);
        setEditStartDate(trip.start_date || "");
        setEditEndDate(trip.end_date || "");
        setEditBudget(trip.budget_limit?.toString() || "");
        setEditCoverImage(trip.cover_image || "");
        setShowEditModal(true);
    };

    const handleUpdateTrip = async () => {
        if (!editingTripId) return;
        const { error } = await supabase
            .from('trips')
            .update({
                name: editName,
                start_date: editStartDate,
                end_date: editEndDate || null,
                budget_limit: parseFloat(editBudget) || 0,
                cover_image: editCoverImage
            })
            .eq('id', editingTripId);

        if (error) {
            alert("Gagal update trip: " + error.message);
        } else {
            setTrips(trips.map(t => t.id === editingTripId ? {
                ...t,
                name: editName,
                start_date: editStartDate,
                end_date: editEndDate,
                budget_limit: parseFloat(editBudget),
                cover_image: editCoverImage
            } : t));
            setShowEditModal(false);
        }
    };

    const handleDeleteTrip = async (e: React.MouseEvent, id: string) => {
        e.preventDefault();
        e.stopPropagation();
        if (!confirm("Adakah anda pasti mahu memadam trip ini? Semua data itinerary juga akan dipadam.")) return;

        const { error } = await supabase
            .from('trips')
            .delete()
            .eq('id', id);

        if (error) {
            alert("Gagal delete trip: " + error.message);
        } else {
            setTrips(trips.filter(t => t.id !== id));
        }
    };

    // Calculate Days Left Helper
    const getDaysLeft = (dateStr: string) => {
        const target = new Date(dateStr);
        const today = new Date();
        const diff = target.getTime() - today.getTime();
        const days = Math.ceil(diff / (1000 * 3600 * 24));
        return days > 0 ? days : 0;
    };

    // --- STYLES ---
    const bgStyle = darkMode ? "bg-black text-white" : "bg-gray-50 text-black";

    return (
        <div className={`min-h-screen font-sans transition-colors duration-300 ${bgStyle}`}>
            <div className="max-w-md mx-auto min-h-screen flex flex-col relative">

                {/* --- HEADER --- */}
                <header className={`px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-3 border-b-2 sticky top-0 z-40 transition-colors duration-300 ${darkMode ? "border-white bg-black" : "border-black bg-white"}`}>
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <Link href="/" className={`p-2 rounded-xl border-2 transition-all active:scale-95 ${darkMode ? "border-white hover:bg-white hover:text-black" : "border-black hover:bg-black hover:text-white"}`}>
                                <ArrowLeft size={18} />
                            </Link>
                            <div>
                                <h1 className="text-xl font-black uppercase leading-none tracking-tighter">TripIt.</h1>
                                <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest">My Trips</p>
                            </div>
                        </div>
                        <button onClick={() => setDarkMode(!darkMode)} className={`p-2 rounded-xl border-2 transition-all active:scale-95 ${darkMode ? "border-white" : "border-black"}`}>
                            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
                        </button>
                    </div>
                </header>

                {/* --- MAIN CONTENT --- */}
                <main className="flex-1 p-4 flex flex-col gap-4">

                    {/* NEW TRIP BUTTON */}
                    <button
                        onClick={() => user ? setShowCreateModal(true) : setShowAuthModal(true)}
                        className={`w-full py-4 rounded-2xl border-2 border-dashed flex items-center justify-center gap-2 font-black uppercase transition-all active:scale-95 ${darkMode ? "border-white hover:bg-white/10" : "border-black hover:bg-black/5"}`}
                    >
                        <Plus size={20} /> Create New Trip
                    </button>

                    {/* TRIP LIST */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-black uppercase opacity-60 ml-1">Upcoming Trips</h3>

                        {loading ? (
                            <p className="text-center italic opacity-50 text-xs">Loading trips...</p>
                        ) : trips.length === 0 ? (
                            <div className="text-center py-10 opacity-50 flex flex-col items-center">
                                <Plane size={48} className="mb-2" />
                                <p className="text-xs font-bold">No trips yet. Let's fly!</p>
                            </div>
                        ) : (
                            trips.map(trip => {
                                const daysLeft = getDaysLeft(trip.start_date);
                                const dateDisplay = trip.start_date ? new Date(trip.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : "TBA";

                                return (
                                    <Link href={`/tripit/${trip.id}`} key={trip.id} className="block group">
                                        <div className={`relative h-40 rounded-3xl border-2 overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform group-hover:-translate-y-1 ${darkMode ? "border-white" : "border-black"}`}>
                                            <img src={trip.cover_image || "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=2970&auto=format&fit=crop"} alt="Cover" className="absolute inset-0 w-full h-full object-cover transition-opacity group-hover:opacity-90" />

                                            {/* ACTION BUTTONS (TOP RIGHT) */}
                                            <div className="absolute top-2 right-2 flex gap-1.5 z-20">
                                                <button
                                                    onClick={(e) => handleEditClick(e, trip)}
                                                    className="w-10 h-10 flex items-center justify-center bg-black/60 backdrop-blur-md rounded-xl border-2 border-white/30 text-white hover:bg-black hover:border-white transition-all active:scale-90"
                                                    title="Edit Trip"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={(e) => handleDeleteTrip(e, trip.id)}
                                                    className="w-10 h-10 flex items-center justify-center bg-red-600/80 backdrop-blur-md rounded-xl border-2 border-white/30 text-white hover:bg-red-700 hover:border-white transition-all active:scale-90"
                                                    title="Delete Trip"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>

                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-5">
                                                <div className="flex justify-between items-end">
                                                    <div>
                                                        <span className="bg-white/20 backdrop-blur-md text-white text-[9px] font-bold uppercase px-2 py-1 rounded mb-2 inline-block border border-white/30">{daysLeft > 0 ? `${daysLeft} Days Left` : "Past Trip"}</span>
                                                        <h2 className="text-2xl font-black text-white uppercase leading-none mb-1">{trip.name}</h2>
                                                        <p className="text-[10px] font-bold text-white/80 flex items-center gap-1"><Calendar size={10} /> {dateDisplay}</p>
                                                    </div>
                                                    <div className="p-2 rounded-full bg-white text-black">
                                                        <ChevronRight size={16} />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })
                        )}
                    </div>

                </main>
            </div>

            {/* --- MODAL: CREATE TRIP --- */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
                    <div className={`w-full max-w-[340px] p-5 rounded-3xl border-2 ${darkMode ? "bg-[#1E1E1E] border-white text-white" : "bg-white border-black text-black"} shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto`}>
                        <div className="flex justify-between items-center mb-3">
                            <h2 className="text-lg font-black uppercase">New Trip</h2>
                            <button onClick={() => setShowCreateModal(false)} className="opacity-50 hover:opacity-100"><X size={18} /></button>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="text-[10px] font-bold uppercase opacity-60 block mb-1">Trip Name</label>
                                <input
                                    type="text"
                                    value={newTripName}
                                    onChange={e => setNewTripName(e.target.value)}
                                    placeholder="e.g. Bali Summer 2026"
                                    className={`w-full p-2.5 rounded-xl border-2 font-bold outline-none text-sm ${darkMode ? "bg-black border-white focus:bg-white/10" : "bg-gray-50 border-black focus:bg-white"}`}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-[10px] font-bold uppercase opacity-60 block mb-1">Start Date</label>
                                    <input
                                        type="date"
                                        value={newStartDate}
                                        onChange={e => setNewStartDate(e.target.value)}
                                        className={`w-full p-2.5 rounded-xl border-2 font-bold outline-none text-sm ${darkMode ? "bg-black border-white" : "bg-gray-50 border-black"}`}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold uppercase opacity-60 block mb-1">End Date</label>
                                    <input
                                        type="date"
                                        value={newEndDate}
                                        onChange={e => setNewEndDate(e.target.value)}
                                        className={`w-full p-2.5 rounded-xl border-2 font-bold outline-none text-sm ${darkMode ? "bg-black border-white" : "bg-gray-50 border-black"}`}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-bold uppercase opacity-60 block mb-1">Budget (RM)</label>
                                <input
                                    type="number"
                                    value={newBudget}
                                    onChange={e => setNewBudget(e.target.value)}
                                    placeholder="0.00"
                                    className={`w-full p-2.5 rounded-xl border-2 font-bold outline-none text-sm ${darkMode ? "bg-black border-white focus:bg-white/10" : "bg-gray-50 border-black focus:bg-white"}`}
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-bold uppercase opacity-60 block mb-1">Cover Image</label>

                                {/* Image Preview & Upload */}
                                <div className={`relative h-24 rounded-xl border-2 border-dashed mb-3 overflow-hidden flex items-center justify-center ${darkMode ? "border-white/20" : "border-black/10"}`}>
                                    {newCoverImage ? (
                                        <img src={newCoverImage} className="w-full h-full object-cover" />
                                    ) : (
                                        <p className="text-[10px] font-bold opacity-40 uppercase">No Image Selected</p>
                                    )}
                                    {uploading && (
                                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                            <p className="text-[10px] font-bold text-white uppercase animate-pulse">Uploading...</p>
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-2 mb-3">
                                    <label className={`cursor-pointer p-2 rounded-lg border-2 text-[10px] font-bold uppercase text-center transition-all active:scale-95 ${darkMode ? "border-white bg-white/5 hover:bg-white/10" : "border-black bg-gray-50 hover:bg-gray-100"}`}>
                                        Upload Media
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) => onFileChange(e, 'create')}
                                            disabled={uploading}
                                        />
                                    </label>
                                    <button
                                        onClick={() => setNewCoverImage("")}
                                        className={`p-2 rounded-lg border-2 text-[10px] font-bold uppercase text-center transition-all active:scale-95 ${darkMode ? "border-red-500/50 text-red-500" : "border-red-500/50 text-red-600"}`}
                                    >
                                        Remove
                                    </button>
                                </div>

                                <div className="flex gap-2 overflow-x-auto pb-2 mb-2 no-scrollbar">
                                    {[
                                        "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=2021&auto=format&fit=crop",
                                        "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=2970&auto=format&fit=crop",
                                        "https://images.unsplash.com/photo-1502791451862-7bd8c1df43a7?q=80&w=2000&auto=format&fit=crop",
                                    ].map((url, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setNewCoverImage(url)}
                                            className={`flex-shrink-0 w-16 h-12 rounded-lg border-2 overflow-hidden transition-all ${newCoverImage === url ? "border-blue-500 scale-110" : "border-transparent opacity-60"}`}
                                        >
                                            <img src={url} className="w-full h-full object-cover" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2 mt-6">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className={`flex-1 py-3 rounded-xl font-black uppercase border-2 opacity-60 hover:opacity-100 ${darkMode ? "border-white bg-transparent" : "border-black bg-transparent"}`}
                                disabled={uploading}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateTrip}
                                className={`flex-1 py-3 rounded-xl font-black uppercase border-2 text-white ${darkMode ? "bg-blue-600 border-white" : "bg-black border-black"} disabled:opacity-50`}
                                disabled={uploading}
                            >
                                {uploading ? "Wait..." : "Create"}
                            </button>
                        </div>
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
                                <label className="text-[10px] font-bold uppercase opacity-60 block mb-1">Cover Image</label>

                                {/* Image Preview & Upload */}
                                <div className={`relative h-24 rounded-xl border-2 border-dashed mb-3 overflow-hidden flex items-center justify-center ${darkMode ? "border-white/20" : "border-black/10"}`}>
                                    {editCoverImage ? (
                                        <img src={editCoverImage} className="w-full h-full object-cover" />
                                    ) : (
                                        <p className="text-[10px] font-bold opacity-40 uppercase">No Image Selected</p>
                                    )}
                                    {uploading && (
                                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                            <p className="text-[10px] font-bold text-white uppercase animate-pulse">Uploading...</p>
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-2 mb-3">
                                    <label className={`cursor-pointer p-2 rounded-lg border-2 text-[10px] font-bold uppercase text-center transition-all active:scale-95 ${darkMode ? "border-white bg-white/5 hover:bg-white/10" : "border-black bg-gray-50 hover:bg-gray-100"}`}>
                                        Upload Media
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) => onFileChange(e, 'edit')}
                                            disabled={uploading}
                                        />
                                    </label>
                                    <button
                                        onClick={() => setEditCoverImage("")}
                                        className={`p-2 rounded-lg border-2 text-[10px] font-bold uppercase text-center transition-all active:scale-95 ${darkMode ? "border-red-500/50 text-red-500" : "border-red-500/50 text-red-600"}`}
                                    >
                                        Remove
                                    </button>
                                </div>

                                <div className="flex gap-2 overflow-x-auto pb-2 mb-2 no-scrollbar">
                                    {[
                                        "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=2021&auto=format&fit=crop",
                                        "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=2970&auto=format&fit=crop",
                                        "https://images.unsplash.com/photo-1502791451862-7bd8c1df43a7?q=80&w=2000&auto=format&fit=crop",
                                    ].map((url, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setEditCoverImage(url)}
                                            className={`flex-shrink-0 w-16 h-12 rounded-lg border-2 overflow-hidden transition-all ${editCoverImage === url ? "border-blue-500 scale-110" : "border-transparent opacity-60"}`}
                                        >
                                            <img src={url} className="w-full h-full object-cover" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2 mt-6">
                            <button
                                onClick={() => setShowEditModal(false)}
                                className={`flex-1 py-3 rounded-xl font-black uppercase border-2 opacity-60 hover:opacity-100 ${darkMode ? "border-white bg-transparent" : "border-black bg-transparent"}`}
                                disabled={uploading}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUpdateTrip}
                                className={`flex-1 py-3 rounded-xl font-black uppercase border-2 text-white ${darkMode ? "bg-blue-600 border-white" : "bg-black border-black"} disabled:opacity-50`}
                                disabled={uploading}
                            >
                                {uploading ? "Wait..." : "Update"}
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
                            <h3 className="font-black uppercase text-sm flex items-center gap-2"><Maximize size={16} /> Adjust Photo</h3>
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
                                    className={`flex-[1.5] py-3 rounded-xl font-black uppercase text-xs border-2 ${darkMode ? "bg-white text-black border-white" : "bg-black text-white border-black"}`}
                                >
                                    {uploading ? "Applying..." : "Set Photo"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} isDarkMode={darkMode} />
        </div>
    );
}
