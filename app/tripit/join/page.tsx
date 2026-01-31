"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import AuthModal from "@/components/Auth";
import { Plane, Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";

function JoinTripContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get("token");

    const [status, setStatus] = useState<"loading" | "error" | "success">("loading");
    const [message, setMessage] = useState("Checking invitation...");
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [tripId, setTripId] = useState<string | null>(null);

    useEffect(() => {
        if (!token) {
            setStatus("error");
            setMessage("Invitation link is invalid (missing token).");
            return;
        }
        processJoin();
    }, [token]);

    const processJoin = async () => {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            setStatus("error");
            setMessage("Sila log masuk terlebih dahulu untuk sertai trip ini.");
            setShowAuthModal(true);
            return;
        }

        try {
            // Call the SQL function we created earlier
            const { data, error } = await supabase.rpc('join_trip_by_token', {
                token_input: token
            });

            if (error) throw error;

            if (data.success) {
                setStatus("success");
                setMessage(data.message);
                setTripId(data.trip_id);
                // Redirect after 2 seconds
                setTimeout(() => {
                    router.push(`/tripit/${data.trip_id}`);
                }, 1500);
            } else {
                setStatus("error");
                setMessage(data.message || "Gagal sertai trip. Token mungkin tidak sah.");
            }
        } catch (e: any) {
            console.error(e);
            setStatus("error");
            setMessage("Error: " + e.message);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 font-sans">
            <div className="w-full max-w-sm p-8 rounded-3xl bg-white border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-center">

                <div className="mb-6 flex justify-center">
                    <div className="p-4 rounded-2xl bg-indigo-100 border-2 border-indigo-900 text-indigo-900">
                        <Plane size={40} className={status === "loading" ? "animate-bounce" : ""} />
                    </div>
                </div>

                <h1 className="text-2xl font-black uppercase mb-2">Joining Trip</h1>

                <div className="flex flex-col items-center gap-4">
                    {status === "loading" && (
                        <div className="flex items-center gap-2 text-indigo-600 font-bold">
                            <Loader2 size={18} className="animate-spin" />
                            <p className="text-sm uppercase tracking-wider">{message}</p>
                        </div>
                    )}

                    {status === "error" && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-red-600 font-bold justify-center">
                                <AlertCircle size={18} />
                                <p className="text-sm uppercase tracking-wider">{message}</p>
                            </div>
                            {!supabase.auth.getSession() && (
                                <button onClick={() => setShowAuthModal(true)} className="w-full py-3 bg-black text-white rounded-xl font-black uppercase border-2 border-black">
                                    Login to Continue
                                </button>
                            )}
                            <Link href="/tripit" className="flex items-center justify-center gap-2 text-xs font-bold opacity-50 uppercase hover:opacity-100">
                                <ArrowLeft size={14} /> Back to My Trips
                            </Link>
                        </div>
                    )}

                    {status === "success" && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-green-600 font-bold justify-center">
                                <p className="text-sm uppercase tracking-wider">Berjaya! Membawa anda ke dashboard...</p>
                            </div>
                            <Loader2 size={24} className="animate-spin text-green-600 mx-auto" />
                        </div>
                    )}
                </div>

                <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} isDarkMode={false} />
            </div>
        </div>
    );
}

export default function JoinTripPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Loader2 className="animate-spin" />
            </div>
        }>
            <JoinTripContent />
        </Suspense>
    );
}
