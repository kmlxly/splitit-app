"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="min-h-screen bg-[#e7e8ec] p-6 text-black flex items-center justify-center">
      <section className="w-full max-w-md border-2 border-black bg-white rounded-3xl p-8 shadow-[8px_8px_0_0_#000] text-center">
        <div className="mx-auto mb-5 h-14 w-14 rounded-2xl border-2 border-black bg-red-400 flex items-center justify-center">
          <AlertTriangle aria-hidden="true" />
        </div>
        <h1 className="text-2xl uppercase">Ada masalah.</h1>
        <p className="mt-3 text-sm font-semibold opacity-70">
          Data anda tidak dipadam. Cuba muatkan semula bahagian ini.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 min-h-11 w-full rounded-xl border-2 border-black bg-black px-4 py-3 text-sm font-black uppercase text-white shadow-[4px_4px_0_0_#ef4444] active:translate-y-1 active:shadow-none"
        >
          <RefreshCw className="mr-2 inline" size={16} aria-hidden="true" />
          Cuba lagi
        </button>
      </section>
    </main>
  );
}
