"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useUser } from "@/lib/auth/client";
import AuthModal from "@/components/Auth";
import { Plane, Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { joinTripByToken } from "@/app/actions/tripit";

function JoinTripContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get("token");
    const stackUser = useUser();

    const [status, setStatus] = useState<"loading" | "error" | "success">("loading");
    const [message, setMessage] = useState("Checking invitation...");
    const [showAuthModal, setShowAuthModal] = useState(false);
    useEffect(() => {
        let redirectTimer: ReturnType<typeof setTimeout> | undefined;
        let cancelled = false;

        if (!token) return undefined;
        // stackUser is undefined while loading; null when unauthenticated
        if (stackUser === undefined) return undefined;
        if (stackUser === null) return undefined;

        const processJoin = async () => {
            try {
                const data = await joinTripByToken(token);
                if (cancelled) return;

                if (data?.success) {
                    setStatus("success");
                    setMessage(data.message);
                    redirectTimer = setTimeout(() => {
                        router.push(`/tripit/${data.trip_id}`);
                    }, 1500);
                } else {
                    setStatus("error");
                    setMessage(data?.message || "Gagal sertai trip. Token mungkin tidak sah.");
                }
            } catch (error: unknown) {
                if (cancelled) return;
                console.error(error);
                setStatus("error");
                setMessage(error instanceof Error ? `Error: ${error.message}` : "Gagal sertai trip.");
            }
        };

        void processJoin();
        return () => {
            cancelled = true;
            if (redirectTimer) clearTimeout(redirectTimer);
        };
    }, [router, stackUser, token]);

    const displayStatus = !token || stackUser === null ? "error" : status;
    const displayMessage = !token
        ? "Invitation link is invalid (missing token)."
        : stackUser === null
            ? "Sila log masuk terlebih dahulu untuk sertai trip ini."
            : message;

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 font-sans">
            <div className="w-full max-w-sm p-8 rounded-3xl bg-white border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-center">

                <div className="mb-6 flex justify-center">
                    <div className="p-4 rounded-2xl bg-indigo-100 border-2 border-indigo-900 text-indigo-900">
                        <Plane size={40} className={displayStatus === "loading" ? "animate-bounce" : ""} />
                    </div>
                </div>

                <h1 className="text-2xl font-black uppercase mb-2">Joining Trip</h1>

                <div className="flex flex-col items-center gap-4">
                    {displayStatus === "loading" && (
                        <div className="flex items-center gap-2 text-indigo-600 font-bold">
                            <Loader2 size={18} className="animate-spin" />
                            <p className="text-sm uppercase tracking-wider">{displayMessage}</p>
                        </div>
                    )}

                    {displayStatus === "error" && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-red-600 font-bold justify-center">
                                <AlertCircle size={18} />
                                <p className="text-sm uppercase tracking-wider">{displayMessage}</p>
                            </div>
                            {!stackUser && (
                                <button onClick={() => setShowAuthModal(true)} className="w-full py-3 bg-black text-white rounded-xl font-black uppercase border-2 border-black">
                                    Login to Continue
                                </button>
                            )}
                            <Link href="/tripit" className="flex items-center justify-center gap-2 text-xs font-bold opacity-50 uppercase hover:opacity-100">
                                <ArrowLeft size={14} /> Back to My Trips
                            </Link>
                        </div>
                    )}

                    {displayStatus === "success" && (
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
