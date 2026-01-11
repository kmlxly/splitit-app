import React from "react";
import Link from "next/link";
import { ArrowLeft, Scale, AlertTriangle, CheckCircle, FileText } from "lucide-react";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-[#F0F0FF] text-black font-sans p-4 md:p-8 lg:p-12 selection:bg-indigo-300">
      <div className="max-w-4xl mx-auto w-full">
        
        <div className="mb-6 md:mb-8">
            <Link href="/" className="inline-flex items-center gap-2 px-4 py-2 md:px-6 md:py-3 bg-white border-2 border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all font-black uppercase text-[10px] md:text-xs tracking-widest">
                <ArrowLeft size={16} /> Back to App
            </Link>
        </div>

        <div className="bg-white border-4 border-black rounded-[2rem] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
            
            <div className="bg-indigo-500 border-b-4 border-black p-6 md:p-10 lg:p-14 text-white">
                <div className="flex items-center gap-4 mb-4 opacity-70">
                    <Scale size={40} className="md:w-12 md:h-12" />
                    <span className="font-mono font-bold text-xs bg-white text-black px-2 py-1 rounded">LEGAL</span>
                </div>
                <h1 className="text-4xl md:text-6xl lg:text-7xl font-black uppercase tracking-tighter leading-[0.9] mb-6">
                    Terms of<br/>Service.
                </h1>
                <p className="font-bold border-2 border-white inline-block px-4 py-1 rounded-full bg-black text-white text-[10px] md:text-xs uppercase tracking-widest">
                    Effective: {new Date().toLocaleDateString()}
                </p>
            </div>

            <div className="p-6 md:p-10 lg:p-14 space-y-12">
                
                <section>
                    <div className="flex items-center gap-4 mb-6">
                         <div className="w-10 h-10 md:w-12 md:h-12 border-2 border-black bg-indigo-100 rounded-full flex items-center justify-center font-black text-lg md:text-xl shadow-[2px_2px_0px_0px_black]">1</div>
                         <h2 className="text-2xl md:text-3xl font-black uppercase">Agreement</h2>
                    </div>
                    <p className="text-base md:text-xl font-bold leading-relaxed border-l-4 border-indigo-500 pl-4 md:pl-6">
                        Dengan guna <strong>SplitIt</strong>, anda setuju dengan syarat ni. Apps ni hanyalah alat bantuan (utility).
                    </p>
                </section>

                <section className="border-4 border-black border-dashed p-6 md:p-8 rounded-2xl bg-red-50 relative mt-10">
                    <div className="absolute -top-4 left-6 bg-red-500 text-white border-2 border-black px-4 py-1 font-black uppercase text-[10px] md:text-xs -rotate-1 shadow-[2px_2px_0px_0px_black]">
                        <AlertTriangle size={14} className="inline mr-2 mb-0.5"/> MUST READ
                    </div>
                    <h2 className="text-lg md:text-xl font-black uppercase mb-4 mt-2">Disclaimer & Liability</h2>
                    <ul className="space-y-4 font-bold text-xs md:text-sm">
                        <li className="flex items-start gap-3">
                            <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5 flex-shrink-0" />
                            <span>Kami tak bertanggungjawab atas sebarang pergaduhan atau salah faham duit antara pengguna.</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5 flex-shrink-0" />
                            <span>Kiraan AI Receipt Scanner perlu disemak semula secara manual sebelum pembayaran dibuat.</span>
                        </li>
                    </ul>
                </section>

                <section className="space-y-4">
                    <h2 className="text-xl md:text-2xl font-black uppercase mb-6 flex items-center gap-2"><CheckCircle size={24}/> User Rules</h2>
                    <div className="grid grid-cols-1 gap-3">
                        {["Jangan guna untuk scam member.", "Semak total sebelum bayar.", "Satu session, satu tanggungjawab."].map((rule, i) => (
                             <div key={i} className="flex items-center gap-4 p-4 border-2 border-black rounded-xl bg-white shadow-[3px_3px_0px_0px_black] font-bold text-xs md:text-sm">
                                <span className="text-indigo-500">#0{i+1}</span>
                                {rule}
                             </div>
                        ))}
                    </div>
                </section>
            </div>
            
            <div className="bg-black text-white p-6 border-t-4 border-black text-center">
                <p className="font-black text-[10px] uppercase tracking-widest opacity-40">SPLITIT &copy; {new Date().getFullYear()}</p>
            </div>
        </div>
      </div>
    </div>
  );
}
