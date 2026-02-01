import React from "react";
import Link from "next/link";
import { ArrowLeft, Shield, Lock, Eye, Database, Trash2 } from "lucide-react";

export default function PrivacyPolicy() {
    return (
        <div className="min-h-screen bg-[#F4F4F0] text-black font-sans p-4 md:p-8 lg:p-12 selection:bg-yellow-300">
            {/* Container utama dengan max-width untuk Desktop/Tab */}
            <div className="max-w-4xl mx-auto w-full">

                <div className="mb-6 md:mb-8">
                    <Link href="/" className="inline-flex items-center gap-2 px-4 py-2 md:px-6 md:py-3 bg-white border-2 border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all font-black uppercase text-[10px] md:text-xs tracking-widest">
                        <ArrowLeft size={16} /> Back to App
                    </Link>
                </div>

                <div className="bg-white border-4 border-black rounded-[2rem] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden">

                    <div className="bg-yellow-300 border-b-4 border-black p-6 md:p-10 lg:p-14">
                        <div className="flex items-center gap-4 mb-4 opacity-50">
                            <Shield size={40} className="md:w-12 md:h-12" />
                            <span className="font-mono font-bold text-xs md:text-sm">VER 1.0</span>
                        </div>
                        <h1 className="text-4xl md:text-6xl lg:text-7xl font-black uppercase tracking-tighter leading-[0.9] mb-6">
                            Privacy<br />Policy.
                        </h1>
                        <p className="font-bold border-2 border-black inline-block px-4 py-1 rounded-full bg-white text-[10px] md:text-xs uppercase tracking-widest">
                            Updated: {new Date().toLocaleDateString()}
                        </p>
                    </div>

                    <div className="p-6 md:p-10 lg:p-14 space-y-10 md:space-y-16">

                        <section className="border-l-4 md:border-l-8 border-black pl-4 md:pl-8">
                            <h2 className="text-xl md:text-2xl font-black uppercase mb-4">1. Intro</h2>
                            <p className="text-base md:text-lg font-bold leading-relaxed opacity-80">
                                Welcome to <strong>Kmlxly Apps</strong> (SplitIt, TripIt, Sub.Tracker). Kami tak berminat nak jual data awak. Apps ini dibuat untuk membantu urusan harian, bukan untuk spy hidup orang.
                            </p>
                        </section>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                            <div className="p-6 border-2 border-black rounded-2xl bg-gray-50 hover:bg-yellow-50 transition-colors">
                                <div className="w-10 h-10 bg-black text-white rounded-lg flex items-center justify-center mb-4"><Database size={20} /></div>
                                <h3 className="text-lg md:text-xl font-black uppercase mb-2">Data Collected</h3>
                                <ul className="space-y-2 text-xs md:text-sm font-bold opacity-70">
                                    <li>• Name & Email (Google Login)</li>
                                    <li>• Financial Data (Budgets, Subscriptions)</li>
                                    <li>• Travel Details (Itineraries, Flights)</li>
                                    <li>• Location Data (For Weather Features)</li>
                                    <li>• Receipt Images (Uploaded by You)</li>
                                </ul>
                            </div>

                            <div className="p-6 border-2 border-black rounded-2xl bg-gray-50 hover:bg-yellow-50 transition-colors">
                                <div className="w-10 h-10 bg-black text-white rounded-lg flex items-center justify-center mb-4"><Eye size={20} /></div>
                                <h3 className="text-lg md:text-xl font-black uppercase mb-2">Usage</h3>
                                <ul className="space-y-2 text-xs md:text-sm font-bold opacity-70">
                                    <li>• Account authentication & Sync</li>
                                    <li>• Trip Planning & Weather Forecasting</li>
                                    <li>• Expense Tracking & Bill Splitting</li>
                                    <li>• AI Processing (Receipts & Suggestions)</li>
                                </ul>
                            </div>
                        </div>

                        <div className="p-6 border-2 border-black rounded-2xl bg-blue-50">
                            <h3 className="text-lg md:text-xl font-black uppercase mb-2">Third Party Services</h3>
                            <p className="text-xs md:text-sm font-bold opacity-70 mb-2">
                                We use trusted services to power our apps. We do not sell your data to them.
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {["Google Auth", "Supabase", "Open-Meteo", "Gemini AI"].map((service) => (
                                    <span key={service} className="px-3 py-1 bg-white border-2 border-black rounded-full text-[10px] font-black uppercase">
                                        {service}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <section className="bg-black text-white p-6 md:p-8 rounded-2xl md:rounded-[2rem]">
                            <h2 className="text-xl font-black uppercase mb-2 flex items-center gap-2"><Trash2 size={20} /> 4. Data Deletion</h2>
                            <p className="text-xs md:text-sm opacity-80 mb-4 leading-relaxed">
                                Data anda kekal selagi anda guna app. Kalau nak padam akaun secara total, sila hubungi developer atau guna fungsi reset dalam app.
                            </p>
                            <p className="text-[10px] md:text-xs font-mono bg-white/10 p-2 rounded inline-block">Contact: kmlxly4@gmail.com</p>
                        </section>
                    </div>

                    <div className="bg-gray-100 p-6 border-t-4 border-black text-center">
                        <p className="font-black text-[10px] uppercase tracking-[0.3em] opacity-30">&copy; {new Date().getFullYear()} SplitIt.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
