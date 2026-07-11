import React, { useState, useEffect } from "react";
import { fetchAllSessionsForAdmin, getCompetitionStatus, setCompetitionStatus, deleteSessionForAdmin } from "../lib/session";
import { playClickSound, playCorrectSound } from "../lib/sound";
import { Lock, ShieldAlert, FileSpreadsheet, RefreshCw, ChevronLeft, BarChart2, Radio, PlayCircle, StopCircle, Award, UserX } from "lucide-react";

interface AdminPageProps {
  onNavigate: (route: string) => void;
}

export default function AdminPage({ onNavigate }: AdminPageProps) {
  const [passcode, setPasscode] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState("");
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [compStatus, setCompStatus] = useState<"active" | "ended">("active");
  const [statusLoading, setStatusLoading] = useState(false);
  const [disqualifyingSession, setDisqualifyingSession] = useState<{ id: string; fullName: string } | null>(null);
  const [disqualifyLoading, setDisqualifyLoading] = useState(false);

  const handleDeleteSession = async () => {
    if (!disqualifyingSession) return;
    playClickSound();
    setDisqualifyLoading(true);
    try {
      await deleteSessionForAdmin(disqualifyingSession.id);
      setDisqualifyingSession(null);
      await loadSessions();
      playCorrectSound();
    } catch (err) {
      console.error("Failed to delete session:", err);
    } finally {
      setDisqualifyLoading(false);
    }
  };

  // Admin passcode is hardcoded for MVP
  const ADMIN_PASSCODE = "stc2026algo";

  useEffect(() => {
    if (isAuthenticated) {
      loadSessions();
      loadCompetitionStatus();
    }
  }, [isAuthenticated]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    playClickSound();
    if (passcode === ADMIN_PASSCODE) {
      setIsAuthenticated(true);
      setError("");
    } else {
      setError("Noto'g'ri maxfiy kod! Iltimos, qayta urinib ko'ring.");
    }
  };

  const loadCompetitionStatus = async () => {
    try {
      const status = await getCompetitionStatus();
      setCompStatus(status);
    } catch (err) {
      console.error("Error loading status:", err);
    }
  };

  const handleToggleCompetition = async () => {
    playClickSound();
    setStatusLoading(true);
    const nextStatus = compStatus === "active" ? "ended" : "active";
    try {
      await setCompetitionStatus(nextStatus);
      setCompStatus(nextStatus);
      if (nextStatus === "ended") {
        playCorrectSound();
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    } finally {
      setStatusLoading(false);
    }
  };

  const loadSessions = async () => {
    setLoading(true);
    try {
      const data = await fetchAllSessionsForAdmin();
      setSessions(data);
    } catch (err) {
      console.error("Admin session fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Stats Calculations
  const totalParticipants = sessions.length;
  
  const averageScore = totalParticipants > 0
    ? Math.round(sessions.reduce((sum, s) => sum + (s.totalScore || 0), 0) / totalParticipants)
    : 0;

  // Find hardest/easiest tasks based on average scores of completed records
  const taskScores: Record<string, { sum: number; count: number }> = {
    coin_change: { sum: 0, count: 0 },
    greedy_backpack: { sum: 0, count: 0 },
    binary_treasure: { sum: 0, count: 0 },
    shortest_path: { sum: 0, count: 0 },
    sliding_puzzle: { sum: 0, count: 0 },
    prime_detective: { sum: 0, count: 0 },
  };

  sessions.forEach(s => {
    if (s.taskResults) {
      Object.entries(s.taskResults).forEach(([taskId, result]: [string, any]) => {
        if (taskScores[taskId]) {
          taskScores[taskId].sum += (result.score || 0);
          taskScores[taskId].count += 1;
        }
      });
    }
  });

  const taskAverages = Object.entries(taskScores).map(([id, data]) => ({
    id,
    avg: data.count > 0 ? data.sum / data.count : 0,
    name: id === "coin_change" ? "Tanga Ustasi" : id === "greedy_backpack" ? "Ryukzak" : id === "binary_treasure" ? "Xazina" : id === "shortest_path" ? "Eng Arzon Yo'l" : id === "sliding_puzzle" ? "15 Puzzle" : "Tub Son Detektivi"
  })).filter(t => t.avg > 0);

  // Hardest (lowest avg score)
  const hardestTask = taskAverages.length > 0
    ? [...taskAverages].sort((a, b) => a.avg - b.avg)[0]
    : null;

  // Easiest (highest avg score)
  const easiestTask = taskAverages.length > 0
    ? [...taskAverages].sort((a, b) => b.avg - a.avg)[0]
    : null;

  // Export to CSV Function
  const handleExportCSV = () => {
    if (sessions.length === 0) return;

    const headers = [
      "fullName",
      "totalScore",
      "completedTasksCount",
      "elapsedSeconds",
      "tangaScore",
      "greedyScore",
      "binaryScore",
      "pathScore",
      "puzzleScore",
      "primeScore",
      "createdAt"
    ];

    const rows = sessions.map(s => {
      const results = s.taskResults || {};
      return [
        s.fullName || "",
        s.totalScore || 0,
        s.completedTasksCount || 0,
        s.elapsedSeconds || 0,
        results.coin_change?.score || 0,
        results.greedy_backpack?.score || 0,
        results.binary_treasure?.score || 0,
        results.shortest_path?.score || 0,
        results.sliding_puzzle?.score || 0,
        results.prime_detective?.score || 0,
        s.createdAt || ""
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map(r => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `STC_Algo_Challenge_Results_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isAuthenticated) {
    return (
      <div id="admin-auth-container" className="max-w-md mx-auto flex flex-col justify-center min-h-[75vh] px-4 animate-fadeIn">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 mb-4 shadow-lg shadow-red-950/40">
            <Lock className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-extrabold text-white">Admin tizimiga kirish</h1>
          <p className="mt-2 text-slate-500 text-xs">Ushbu panel faqat STC / AlgoCamp tashkilotchilari uchun mo'ljallangan.</p>
        </div>

        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 shadow-xl relative backdrop-blur-md">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="admin-passcode" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Maxfiy kirish kodi (Passcode)
              </label>
              <input
                id="admin-passcode"
                type="password"
                required
                placeholder="Parolni kiriting..."
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-red-500 text-sm font-mono"
              />
            </div>

            {error && (
              <p id="admin-auth-error" className="text-xs text-red-400 flex items-center gap-1 bg-red-950/20 p-2.5 rounded-lg border border-red-900/40 animate-shake">
                <ShieldAlert className="w-4 h-4" /> {error}
              </p>
            )}

            <button
              id="admin-login-submit"
              type="submit"
              className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-550 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2"
            >
              Kirish <ChevronLeft className="w-4 h-4 rotate-180" />
            </button>
          </form>
        </div>

        <button
          onClick={() => onNavigate("start")}
          className="text-xs text-slate-500 hover:text-slate-400 mt-4 text-center block transition-colors"
        >
          Bosh sahifaga qaytish
        </button>
      </div>
    );
  }

  return (
    <div id="admin-panel-container" className="max-w-5xl mx-auto flex flex-col gap-6 py-6 px-4 animate-fadeIn pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b border-slate-800 pb-4 gap-4">
        <div>
          <button
            onClick={() => onNavigate("start")}
            className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1.5 transition-colors mb-1"
          >
            <ChevronLeft className="w-4 h-4" /> Chiqish
          </button>
          <h2 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <Lock className="w-6 h-6 text-red-500" /> Admin Boshqaruv Paneli
          </h2>
        </div>

        <div className="flex gap-3">
          <button
            id="admin-csv-export"
            onClick={handleExportCSV}
            disabled={sessions.length === 0}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-550 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-md active:scale-95 disabled:scale-100"
          >
            <FileSpreadsheet className="w-4 h-4" /> CSV-ga Eksport qilish
          </button>
          <button
            id="admin-refresh-btn"
            onClick={loadSessions}
            disabled={loading}
            className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-850 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Competition Status Control Panel */}
      <div className="bg-slate-900/30 border border-slate-800/80 rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-4 backdrop-blur-md relative overflow-hidden">
        <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-cyan-500 to-indigo-500" />
        <div className="flex items-start gap-3">
          <div className="p-2 bg-slate-950 rounded-xl border border-slate-800 text-cyan-400 mt-0.5">
            <Radio className={`w-5 h-5 ${compStatus === "active" ? "animate-pulse" : ""}`} />
          </div>
          <div>
            <h3 className="font-bold text-slate-100 text-sm">Musobaqa Faollik Holati</h3>
            <p className="text-xs text-slate-500 max-w-lg mt-0.5">
              Musobaqani yakunlasangiz, barcha ishtirokchilarning ekranida Kahoot-style bayramona yakuniy reyting shousi va eng zo'r top 3 g'olib shohsupada namoyish etiladi!
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto shrink-0 justify-end">
          <div className="flex items-center gap-1.5 font-mono text-xs bg-slate-950 py-1 px-2.5 rounded-lg border border-slate-800">
            <span className={`h-2 w-2 rounded-full ${compStatus === "active" ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`} />
            <span className="font-bold capitalize">{compStatus === "active" ? "Aktiv" : "Tugallangan"}</span>
          </div>
          <button
            onClick={handleToggleCompetition}
            disabled={statusLoading}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-md active:scale-95 disabled:opacity-40 disabled:scale-100 ${
              compStatus === "active"
                ? "bg-red-600 hover:bg-red-550 text-white"
                : "bg-emerald-600 hover:bg-emerald-550 text-slate-950"
            }`}
          >
            {compStatus === "active" ? (
              <>
                <StopCircle className="w-4 h-4" /> Musobaqani Yakunlash
              </>
            ) : (
              <>
                <PlayCircle className="w-4 h-4" /> Qayta Boshlash
              </>
            )}
          </button>
        </div>
      </div>

      {/* Stats Board */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div id="stat-participants" className="bg-slate-900/30 border border-slate-800/80 rounded-2xl p-5 flex flex-col gap-1 backdrop-blur-md">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Jami ishtirokchilar</span>
          <h3 className="text-2xl font-mono font-black text-white">{totalParticipants} ta</h3>
        </div>
        <div id="stat-avg-score" className="bg-slate-900/30 border border-slate-800/80 rounded-2xl p-5 flex flex-col gap-1 backdrop-blur-md">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">O'rtacha ball</span>
          <h3 className="text-2xl font-mono font-black text-amber-400">{averageScore} / 600</h3>
        </div>
        <div id="stat-hardest" className="bg-slate-900/30 border border-slate-800/80 rounded-2xl p-5 flex flex-col gap-1 backdrop-blur-md">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold text-red-400">Eng qiyin masala</span>
          <h3 className="text-sm font-bold text-slate-200 truncate mt-1">
            {hardestTask ? `${hardestTask.name} (${Math.round(hardestTask.avg)} ball)` : "Aniqlanmoqda..."}
          </h3>
        </div>
        <div id="stat-easiest" className="bg-slate-900/30 border border-slate-800/80 rounded-2xl p-5 flex flex-col gap-1 backdrop-blur-md">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold text-emerald-400">Eng oson masala</span>
          <h3 className="text-sm font-bold text-slate-200 truncate mt-1">
            {easiestTask ? `${easiestTask.name} (${Math.round(easiestTask.avg)} ball)` : "Aniqlanmoqda..."}
          </h3>
        </div>
      </div>

      {/* Table of all sessions */}
      <div className="bg-slate-900/30 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-md shadow-xl mt-2">
        <div className="p-4 bg-slate-950/60 border-b border-slate-850 flex justify-between items-center">
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <BarChart2 className="w-4 h-4 text-cyan-400" /> Ishtirokchilar sessiyalari (Session logs)
          </span>
          <span className="text-[10px] text-slate-500 font-mono font-bold">Jami yozuvlar: {sessions.length}</span>
        </div>

        {loading ? (
          <div className="py-20 text-center text-slate-500 flex flex-col items-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-cyan-500" />
            <span className="text-xs">Ma'lumotlar yangilanmoqda...</span>
          </div>
        ) : sessions.length === 0 ? (
          <div className="py-20 text-center text-slate-500 italic text-xs">Hech qanday faol sessiya yozuvlari topilmadi.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-500 font-semibold uppercase tracking-wider text-[9px] border-b border-slate-800/60">
                <tr>
                  <th className="px-5 py-3">Foydalanuvchi</th>
                  <th className="px-5 py-3">Holati</th>
                  <th className="px-5 py-3">Jami ball</th>
                  <th className="px-5 py-3">Yechilgan</th>
                  <th className="px-5 py-3">Tanga</th>
                  <th className="px-5 py-3">Ryukzak</th>
                  <th className="px-5 py-3">Xazina</th>
                  <th className="px-5 py-3">Graf</th>
                  <th className="px-5 py-3">Puzzle</th>
                  <th className="px-5 py-3">Tub Son</th>
                  <th className="px-5 py-3 text-right">Yaratildi</th>
                  <th className="px-5 py-3 text-right">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {sessions.map((s) => {
                  const r = s.taskResults || {};
                  return (
                    <tr key={s.id} className="hover:bg-slate-850/20 transition-colors">
                      <td className="px-5 py-3 font-bold text-slate-200">
                        {s.fullName}
                        <span className="text-[9px] text-slate-500 font-normal font-mono block mt-0.5 truncate max-w-[120px]" title={s.id}>{s.id}</span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                          s.status === "finished"
                            ? "bg-emerald-950/30 border-emerald-800/40 text-emerald-400"
                            : s.status === "active"
                            ? "bg-cyan-950/30 border-cyan-800/40 text-cyan-400"
                            : "bg-slate-950 border-slate-850 text-slate-500"
                        }`}>
                          {s.status === "finished" ? "Tugallandi" : s.status === "active" ? "Aktiv" : s.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-mono font-black text-amber-400">{s.totalScore || 0}</td>
                      <td className="px-5 py-3 font-mono text-slate-400">{s.completedTasksCount || 0} / 6</td>
                      <td className="px-5 py-3 font-mono text-slate-400">{r.coin_change?.score ?? "-"}</td>
                      <td className="px-5 py-3 font-mono text-slate-400">{r.greedy_backpack?.score ?? "-"}</td>
                      <td className="px-5 py-3 font-mono text-slate-400">{r.binary_treasure?.score ?? "-"}</td>
                      <td className="px-5 py-3 font-mono text-slate-400">{r.shortest_path?.score ?? "-"}</td>
                      <td className="px-5 py-3 font-mono text-slate-400">{r.sliding_puzzle?.score ?? "-"}</td>
                      <td className="px-5 py-3 font-mono text-slate-400">{r.prime_detective?.score ?? "-"}</td>
                      <td className="px-5 py-3 text-right text-[10px] text-slate-500">
                        {s.createdAt ? new Date(s.createdAt).toLocaleDateString("uz-UZ", { month: "numeric", day: "numeric", hour: "numeric", minute: "numeric" }) : ""}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => {
                            playClickSound();
                            setDisqualifyingSession({ id: s.id, fullName: s.fullName });
                          }}
                          className="p-1.5 bg-red-950/25 hover:bg-red-900/40 text-red-400 hover:text-red-300 rounded border border-red-900/30 hover:border-red-500/40 transition-all cursor-pointer"
                          title="Ishtirokchini chetlatish"
                        >
                          <UserX className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {disqualifyingSession && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-slate-900 border border-red-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl shadow-red-950/10 flex flex-col gap-5">
            <div className="flex gap-3 items-start text-red-400">
              <UserX className="w-10 h-10 shrink-0 bg-red-950/40 p-2 rounded-xl border border-red-500/20" />
              <div>
                <h3 className="font-bold text-base text-slate-100 font-mono">[SESSİYANI CHETLATISH]</h3>
                <p className="text-xs text-slate-400 mt-1">Ushbu foydalanuvchini musobaqadan chetlatasizmi?</p>
              </div>
            </div>

            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-850 font-mono text-[11px] space-y-1 text-slate-300">
              <p>Ishtirokchi: <strong className="text-red-400">{disqualifyingSession.fullName}</strong></p>
              <p>Sessiya ID: <span className="text-slate-500">{disqualifyingSession.id}</span></p>
            </div>

            <p className="text-xs text-red-400 leading-relaxed font-sans">
              Diqqat! Chetlatish tugmasi bosilsa, ushbu ishtirokchining barcha natijalari va urinishlari butunlay o'chib ketadi. Foydalanuvchi joriy sahifasidan darhol chiqarib yuboriladi va bu amal ortga qaytarilmaydi!
            </p>

            <div className="flex gap-3 mt-2 font-mono text-xs font-bold">
              <button
                onClick={() => setDisqualifyingSession(null)}
                disabled={disqualifyLoading}
                className="flex-1 py-2.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 transition-all cursor-pointer disabled:opacity-50"
              >
                BEKOR QILISH
              </button>
              <button
                onClick={handleDeleteSession}
                disabled={disqualifyLoading}
                className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {disqualifyLoading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  "CHETLATISH"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
