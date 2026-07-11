import React, { useState, useEffect } from "react";
import { ChallengeSession } from "./types";
import { getChallengeSession } from "./lib/session";
import { playClickSound, playTransitionSound } from "./lib/sound";
import { Loader2, Trophy, ShieldCheck, Play } from "lucide-react";

// Pages
import StartPage from "./pages/StartPage";
import ChallengePage from "./pages/ChallengePage";
import ResultPage from "./pages/ResultPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import AdminPage from "./pages/AdminPage";

export default function App() {
  const [route, setRoute] = useState<"start" | "challenge" | "result" | "leaderboard" | "admin">("start");
  const [activeSession, setActiveSession] = useState<ChallengeSession | null>(null);
  const [initializing, setInitializing] = useState<boolean>(true);

  // Recovery of active sessions on refresh
  useEffect(() => {
    async function recoverSession() {
      const savedSessionId = localStorage.getItem("stc_algo_session_id");
      if (savedSessionId) {
        try {
          const session = await getChallengeSession(savedSessionId);
          if (session) {
            setActiveSession(session);
            if (session.status === "active") {
              setRoute("challenge");
            } else {
              setRoute("result");
            }
          }
        } catch (err) {
          console.error("Failed to recover session on load:", err);
        }
      }
      setInitializing(false);
    }
    recoverSession();
  }, []);

  const handleStartChallenge = (session: ChallengeSession) => {
    setActiveSession(session);
    setRoute("challenge");
    playTransitionSound();
  };

  const handleFinishChallenge = (finalSession: ChallengeSession) => {
    setActiveSession(finalSession);
    setRoute("result");
    playTransitionSound();
  };

  const handleNavigate = (targetRoute: string) => {
    playClickSound();
    playTransitionSound();
    if (targetRoute === "start") {
      // Only clear session if it is NOT active, preventing accidental loss of progress!
      if (!activeSession || activeSession.status !== "active") {
        localStorage.removeItem("stc_algo_session_id");
        setActiveSession(null);
      }
      setRoute("start");
    } else {
      setRoute(targetRoute as any);
    }
  };

  if (initializing) {
    return (
      <div id="app-loading-screen" className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100 gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-cyan-400" />
        <div className="text-sm font-semibold tracking-wide text-slate-400">Sessiya holati tiklanmoqda...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-100 selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Active Session Resume Banner */}
      {activeSession && activeSession.status === "active" && route !== "challenge" && (
        <div id="session-resume-banner" className="sticky top-0 z-50 bg-slate-900/90 border-b border-cyan-500/30 px-4 py-3 shadow-[0_4px_20px_rgba(6,182,212,0.15)] backdrop-blur-md flex flex-col sm:flex-row gap-3 items-center justify-between transition-all duration-300">
          <div className="flex items-center gap-3">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-xs sm:text-sm text-slate-200">
              Sizda davom etayotgan Algo Challenge bor: <strong className="text-cyan-400">{activeSession.fullName}</strong>
            </span>
          </div>
          <button
            id="banner-resume-btn"
            onClick={() => {
              playClickSound();
              setRoute("challenge");
            }}
            className="px-4 py-1.5 bg-gradient-to-r from-cyan-400 to-blue-500 hover:opacity-95 text-slate-950 font-black rounded-lg text-xs uppercase tracking-wider transition-all shadow-md shadow-cyan-950/40 hover:scale-[1.02] flex items-center gap-1.5"
          >
            Sessiyani Davom Ettirish <Play className="w-3 h-3 fill-slate-950" />
          </button>
        </div>
      )}

      {/* Background Ambience Accent grids */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(8,145,178,0.06),transparent_50%)] pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(99,102,241,0.04),transparent_50%)] pointer-events-none" />

      {/* Main Container padding */}
      <main className="relative z-10 container mx-auto px-4 py-6 md:py-10 max-w-6xl min-h-[90vh] flex flex-col justify-between">
        
        {/* Render Page dynamically based on state route */}
        <div className="flex-1">
          {route === "start" && (
            <StartPage onStartChallenge={handleStartChallenge} onNavigate={handleNavigate} />
          )}
          {route === "challenge" && activeSession && (
            <ChallengePage session={activeSession} onFinish={handleFinishChallenge} />
          )}
          {route === "result" && activeSession && (
            <ResultPage session={activeSession} onNavigate={handleNavigate} />
          )}
          {route === "leaderboard" && (
            <LeaderboardPage onNavigate={handleNavigate} />
          )}
          {route === "admin" && (
            <AdminPage onNavigate={handleNavigate} />
          )}
        </div>

        {/* Global Footer */}
        <footer className="border-t border-slate-900/60 mt-12 pt-6 pb-2 text-center text-[10px] text-slate-600 font-mono flex flex-col sm:flex-row justify-between items-center gap-3">
          <span>&copy; 2026 STC-2026 / AlgoCamp. Barcha huquqlar himoyalangan.</span>
          <div className="flex gap-4">
            <button onClick={() => handleNavigate("leaderboard")} className="hover:text-slate-400 transition-colors">🏆 Reyting</button>
            <button onClick={() => handleNavigate("admin")} className="hover:text-slate-400 transition-colors">🔒 Admin paneli</button>
          </div>
        </footer>
      </main>
    </div>
  );
}

