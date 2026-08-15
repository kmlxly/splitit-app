import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <main className="min-h-screen bg-[#e7e8ec] p-6 text-black flex items-center justify-center">
      <div className="border-2 border-black bg-white rounded-2xl px-8 py-6 shadow-[6px_6px_0_0_#000] text-center">
        <Loader2 className="mx-auto mb-3 animate-spin" aria-hidden="true" />
        <p className="font-black uppercase tracking-widest text-sm">Sedang memuatkan</p>
      </div>
    </main>
  );
}
