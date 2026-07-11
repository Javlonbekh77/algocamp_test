import React, { useState } from "react";
import { loginAnonymously } from "../lib/firebase";
import { createChallengeSession, findActiveSessionByName } from "../lib/session";
import { playClickSound, playCorrectSound } from "../lib/sound";
import { Trophy, Play, Info, AlertCircle, Shield } from "lucide-react";

interface StartPageProps {
  onStartChallenge: (session: any) => void;
  onNavigate: (route: string) => void;
}

export default function StartPage({ onStartChallenge, onNavigate }: StartPageProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    playClickSound();

    if (!firstName.trim() || !lastName.trim()) {
      setError("Iltimos, ism va familiyangizni to'liq kiriting.");
      return;
    }

    setLoading(true);
    try {
      // 1. Authenticate anonymously
      const user = await loginAnonymously();
      
      // 2. Check if active session already exists with this name
      const existingSession = await findActiveSessionByName(firstName, lastName);
      if (existingSession) {
        localStorage.setItem("stc_algo_session_id", existingSession.id);
        playCorrectSound();
        onStartChallenge(existingSession);
        return;
      }
      
      // 3. Create challenge session in Firestore
      const session = await createChallengeSession(firstName, lastName, user.uid);
      
      // 4. Callback
      onStartChallenge(session);
    } catch (err: any) {
      console.error("Session creation failed:", err);
      const errMsg = err?.message || String(err);
      setError(`Firebase tizimiga ulanishda xatolik yuz berdi: ${errMsg}. Iltimos, qayta urinib ko'ring yoki tashkilotchiga xabar bering.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="start-page-container" className="max-w-xl mx-auto flex flex-col justify-center min-h-[80vh] px-4 py-8 animate-fadeIn">
      {/* Brand Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 mb-4 shadow-lg shadow-cyan-950/40">
          <Trophy className="w-8 h-8" />
        </div>
        <h1 id="app-title" className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-500 bg-clip-text text-transparent">
          STC Algo Challenge
        </h1>
        <p className="mt-3 text-slate-400 text-sm max-w-md mx-auto leading-relaxed">
          30 daqiqada algoritmik fikrlashingizni sinab ko'ring: xazina toping, eng arzon yo'lni aniqlang, tangalar bilan optimal summa yig'ing va reytingda o'rningizni ko'ring.
        </p>
      </div>

      {/* Card Form */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden backdrop-blur-md">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="first-name-input" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Ismingiz
            </label>
            <input
              id="first-name-input"
              type="text"
              required
              placeholder="Masalan: Elbek"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500 text-sm transition-colors"
            />
          </div>

          <div>
            <label htmlFor="last-name-input" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Familiyangiz
            </label>
            <input
              id="last-name-input"
              type="text"
              required
              placeholder="Masalan: Karimov"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500 text-sm transition-colors"
            />
          </div>

          {error && (
            <div id="start-error-box" className="p-3.5 rounded-xl bg-red-950/30 border border-red-500/30 text-red-400 text-xs flex gap-2 items-center animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            id="start-challenge-btn"
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-xl font-bold transition-all shadow-lg shadow-cyan-950/30 text-slate-950 bg-gradient-to-r from-cyan-400 via-cyan-500 to-blue-500 hover:opacity-95 text-sm flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.99]"
          >
            {loading ? "Tizimga kirilmoqda..." : "Challenge'ni boshlash"} <Play className="w-4 h-4 fill-slate-950" />
          </button>
        </form>
      </div>

      {/* Info Footers */}
      <div className="mt-6 flex flex-col gap-4 text-center">
        <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500">
          <Info className="w-3.5 h-3.5" />
          <span>Bu test bilimni jazolash uchun emas, qiziqish va fikrlash uslubingizni aniqlash uchun.</span>
        </div>
        
        <div className="flex justify-center gap-4 border-t border-slate-800/60 pt-4">
          <button
            id="view-leaderboard-btn"
            onClick={() => {
              playClickSound();
              onNavigate("leaderboard");
            }}
            className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors py-1 px-3 rounded-lg border border-cyan-500/10 hover:bg-cyan-500/5"
          >
            🏆 Peshqadamlar reytingi
          </button>
          <button
            id="view-admin-btn"
            onClick={() => {
              playClickSound();
              onNavigate("admin");
            }}
            className="text-xs font-semibold text-slate-500 hover:text-slate-400 transition-colors py-1 px-3 rounded-lg border border-slate-800/80 flex items-center gap-1"
          >
            <Shield className="w-3 h-3" /> Admin
          </button>
        </div>
      </div>
    </div>
  );
}
